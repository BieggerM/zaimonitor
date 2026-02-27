"use client";

import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceDot, XAxis, YAxis } from "recharts";
import type { FailureByModel, TrendByModel, TrendPoint } from "@/lib/overview-types";
import {
  ALL_MODELS,
  MODEL_COLORS,
  MODEL_LABELS,
  SEVEN_DAYS_MS,
  SEVEN_DAY_SMOOTHING_RADIUS,
  TREND_METRIC_OPTIONS,
  TREND_SERIES_BY_MODEL,
  TREND_SERIES_KEYS,
  TREND_WINDOW_OPTIONS,
  type ModelKey,
  type TrendMetricKey,
  type TrendSeriesKey,
} from "@/lib/constants";
import { parseIso, formatUtcTime, formatUtcDate } from "@/lib/overview-format";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type OverviewTrendProps = {
  trendByModel: TrendByModel;
  failureByModel: FailureByModel;
  windowStart: string | null;
  windowEnd: string | null;
  hours: string;
  onHoursChange: (value: string) => void;
};

type SeriesKey = TrendSeriesKey;

function formatMetricValue(metric: TrendMetricKey, value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "-";
  if (metric === "ttft_ms") return `${(value / 1000).toFixed(2)}s`;
  return `${value.toFixed(2)} tps`;
}

type ChartDataPoint = {
  timestamp: string;
} & Record<SeriesKey, number | null>;

function getSeriesKey(model: ModelKey): SeriesKey {
  return TREND_SERIES_BY_MODEL[model];
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 640px)").matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

function FailureX({ cx, cy, size = 8 }: { cx?: number; cy?: number; size?: number }) {
  if (typeof cx !== "number" || typeof cy !== "number") return null;
  const half = size / 2;
  return (
    <g pointerEvents="none">
      <line
        x1={cx - half}
        y1={cy - half}
        x2={cx + half}
        y2={cy + half}
        stroke="color-mix(in oklab, var(--destructive) 88%, #7a1c1c)"
        strokeWidth={2.3}
        strokeLinecap="round"
      />
      <line
        x1={cx - half}
        y1={cy + half}
        x2={cx + half}
        y2={cy - half}
        stroke="color-mix(in oklab, var(--destructive) 88%, #7a1c1c)"
        strokeWidth={2.3}
        strokeLinecap="round"
      />
    </g>
  );
}

function smoothSeries(data: ChartDataPoint[], radius: number): ChartDataPoint[] {
  if (radius <= 0 || data.length === 0) return data;

  return data.map((row, index) => {
    const smoothedRow: ChartDataPoint = { ...row };

    for (const seriesKey of TREND_SERIES_KEYS) {
      if (row[seriesKey] === null) {
        smoothedRow[seriesKey] = null;
        continue;
      }

      let sum = 0;
      let count = 0;
      const start = Math.max(0, index - radius);
      const end = Math.min(data.length - 1, index + radius);

      for (let cursor = start; cursor <= end; cursor += 1) {
        const value = data[cursor][seriesKey];
        if (typeof value === "number" && Number.isFinite(value)) {
          sum += value;
          count += 1;
        }
      }

      smoothedRow[seriesKey] = count > 0 ? sum / count : null;
    }

    return smoothedRow;
  });
}

export function OverviewTrend({
  trendByModel,
  failureByModel,
  windowStart,
  windowEnd,
  hours,
  onHoursChange,
}: OverviewTrendProps) {
  const [metric, setMetric] = useState<TrendMetricKey>(TREND_METRIC_OPTIONS[0].key);
  const [activeSeries, setActiveSeries] = useState<Set<SeriesKey>>(new Set(TREND_SERIES_KEYS));
  const isMobile = useIsMobile();

  const { chartData, chartConfig, hasData, seriesStats, failureMarkers, isSevenDayWindow, dayTickTimestamps } = useMemo(() => {
    const start = parseIso(windowStart);
    const end = parseIso(windowEnd);

    const emptyStats: Record<SeriesKey, { min: number | null; max: number | null; avg: number | null }> = {
      glm47: { min: null, max: null, avg: null },
      glm47flash: { min: null, max: null, avg: null },
      glm5: { min: null, max: null, avg: null },
    };
    if (!start || !end || end <= start) {
      return {
        chartData: [],
        chartConfig: {},
        hasData: false,
        seriesStats: emptyStats,
        failureMarkers: [] as Array<{ key: string; timestamp: string; model: ModelKey; value: number }>,
        isSevenDayWindow: false,
        dayTickTimestamps: [] as string[],
      };
    }
    const isSevenDayWindow = end.getTime() - start.getTime() >= SEVEN_DAYS_MS;

    const allTimestamps = new Set<string>();

    for (const model of ALL_MODELS) {
      const modelTrend = trendByModel[model] || [];
      modelTrend.forEach((p: TrendPoint) => allTimestamps.add(p.timestamp));
    }

    const sortedTimestamps = Array.from(allTimestamps).sort();

    const data: ChartDataPoint[] = sortedTimestamps.map((timestamp) => {
      const point: Partial<ChartDataPoint> = { timestamp };

      for (const model of ALL_MODELS) {
        const modelTrend = trendByModel[model] || [];
        const trendPoint = modelTrend.find((p: TrendPoint) => p.timestamp === timestamp);

        const seriesKey = getSeriesKey(model);
        const raw = trendPoint?.[metric];
        point[seriesKey] = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
      }

      return point as ChartDataPoint;
    });

    const lineData = isSevenDayWindow ? smoothSeries(data, SEVEN_DAY_SMOOTHING_RADIUS) : data;

    const config: ChartConfig = {};
    const stats: Record<SeriesKey, { min: number | null; max: number | null; avg: number | null }> = {
      glm47: { min: null, max: null, avg: null },
      glm47flash: { min: null, max: null, avg: null },
      glm5: { min: null, max: null, avg: null },
    };
    const rawRowsByTimestamp = new Map<string, ChartDataPoint>();
    for (const row of data) rawRowsByTimestamp.set(row.timestamp, row);
    const lineRowsByTimestamp = new Map<string, ChartDataPoint>();
    for (const row of lineData) lineRowsByTimestamp.set(row.timestamp, row);
    const markers: Array<{ key: string; timestamp: string; model: ModelKey; value: number }> = [];

    for (const model of ALL_MODELS) {
      const seriesKey = getSeriesKey(model);
      const color = MODEL_COLORS[model];

      config[seriesKey] = {
        label: MODEL_LABELS[model],
        color,
      };

      const values = data.map((d) => d[seriesKey]).filter((v): v is number => v !== null);
      stats[seriesKey] = {
        min: values.length > 0 ? Math.min(...values) : null,
        max: values.length > 0 ? Math.max(...values) : null,
        avg: values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
      };

      const failures = failureByModel[model] || [];
      for (const failure of failures) {
        const rawRow = rawRowsByTimestamp.get(failure.timestamp);
        if (!rawRow) continue;

        const rawValue = rawRow[seriesKey];
        if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) continue;

        const smoothedValue = lineRowsByTimestamp.get(failure.timestamp)?.[seriesKey];
        const markerValue =
          typeof smoothedValue === "number" && Number.isFinite(smoothedValue) ? smoothedValue : rawValue;

        markers.push({
          key: `${model}:${failure.timestamp}`,
          timestamp: failure.timestamp,
          model,
          value: markerValue,
        });
      }
    }

    const hasAnyMetricData = data.some((d) =>
      ALL_MODELS.some((model) => {
        const seriesKey = getSeriesKey(model);
        return d[seriesKey] !== null;
      }),
    );
    const hasAnyFailures = markers.length > 0;
    const hasAnyData = hasAnyMetricData || hasAnyFailures;
    const dayTickTimestamps = isSevenDayWindow
      ? lineData
          .map((row) => row.timestamp)
          .filter((timestamp) => {
            const date = new Date(timestamp);
            return date.getUTCHours() === 0 && date.getUTCMinutes() === 0;
          })
      : [];

    markers.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return {
      chartData: lineData,
      chartConfig: config,
      hasData: hasAnyData,
      seriesStats: stats,
      failureMarkers: markers,
      isSevenDayWindow,
      dayTickTimestamps,
    };
  }, [failureByModel, metric, trendByModel, windowEnd, windowStart]);
  const toggleSeries = (seriesKey: SeriesKey) => {
    setActiveSeries((prev) => {
      const next = new Set(prev);
      if (next.has(seriesKey)) {
        next.delete(seriesKey);
      } else {
        next.add(seriesKey);
      }
      return next;
    });
  };

  const activeMetric = TREND_METRIC_OPTIONS.find((o) => o.key === metric) ?? TREND_METRIC_OPTIONS[0];

  return (
    <article className="paper-panel paper-noise fade-up rounded-3xl p-5 md:p-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-[color:var(--card-foreground)]">Historical Trends</h2>
        <div className="inline-flex items-center rounded-xl border border-[color:var(--border)] bg-[color:var(--paper)]/72 p-1 shadow-[0_10px_16px_-14px_rgba(20,25,28,0.5)]">
          {TREND_WINDOW_OPTIONS.map((option) => {
            const selected = option.value === hours;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onHoursChange(option.value)}
                className={`inline-flex h-8 flex-1 items-center justify-center rounded-lg px-3 text-xs font-semibold transition ${
                  selected
                    ? "bg-[color:var(--accent-gold)]/78 text-[color:var(--card-foreground)]"
                    : "text-[color:var(--muted-foreground)] hover:bg-[color:var(--accent-sky)]/24"
                }`}
              >
                {option.label.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {TREND_METRIC_OPTIONS.map((option) => {
          const selected = option.key === metric;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setMetric(option.key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                selected
                  ? "border-[color:var(--card-foreground)] bg-[color:var(--accent-gold)]/55 text-[color:var(--card-foreground)]"
                  : "border-[color:var(--border)] bg-[color:var(--paper)] text-[color:var(--muted-foreground)] hover:bg-[color:var(--accent-sky)]/30"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--paper)]/50 p-2 md:p-5">
        {!hasData ? (
          <p className="py-16 text-center text-sm text-[color:var(--muted-foreground)]">
            No trend data in this window for {activeMetric.label}.
          </p>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="h-48 md:h-56 w-full">
              <LineChart
                accessibilityLayer
                data={chartData}
                margin={{ left: isMobile ? 4 : 12, right: isMobile ? 4 : 12, top: 4, bottom: 4 }}
              >
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                {failureMarkers
                  .filter((marker) => activeSeries.has(getSeriesKey(marker.model)))
                  .map((marker) => (
                    <ReferenceDot
                      key={marker.key}
                      x={marker.timestamp}
                      y={marker.value}
                      ifOverflow="visible"
                      isFront
                      shape={<FailureX size={9} />}
                    />
                  ))}
                <XAxis
                  dataKey="timestamp"
                  ticks={isSevenDayWindow ? dayTickTimestamps : undefined}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={isMobile ? 4 : 8}
                  minTickGap={isMobile ? 24 : 32}
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    if (isSevenDayWindow) {
                      return date.toLocaleDateString([], {
                        timeZone: "UTC",
                        month: "short",
                        day: "numeric",
                      });
                    }
                    return date.toLocaleTimeString([], {
                      timeZone: "UTC",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    });
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={isMobile ? 4 : 8}
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  width={isMobile ? 32 : 45}
                  tickFormatter={(value) => {
                    if (metric === "ttft_ms") return `${(value / 1000).toFixed(1)}s`;
                    return value.toFixed(1);
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      className="rounded-lg border-[color:var(--border)] bg-[color:var(--popover)] shadow-lg"
                      labelFormatter={(value) => {
                        const date = new Date(value as string);
                        return (
                          <span className="font-medium text-[color:var(--card-foreground)]">
                            {date.toLocaleString([], {
                              timeZone: "UTC",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}{" "}
                            UTC
                          </span>
                        );
                      }}
                      formatter={(value, name) => {
                        const configKey = name as SeriesKey;
                        const label = chartConfig[configKey]?.label || name;
                        return (
                          <div className="flex items-center justify-between gap-6">
                            <span className="text-[color:var(--muted-foreground)]">{label}</span>
                            <span className="font-mono font-medium text-[color:var(--card-foreground)]">
                              {formatMetricValue(metric, value as number | null)}
                            </span>
                          </div>
                        );
                      }}
                    />
                  }
                />
                {activeSeries.has("glm47") && (
                  <Line
                    dataKey="glm47"
                    type="monotone"
                    stroke="var(--color-glm47)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                )}
                {activeSeries.has("glm47flash") && (
                  <Line
                    dataKey="glm47flash"
                    type="monotone"
                    stroke="var(--color-glm47flash)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                )}
                {activeSeries.has("glm5") && (
                  <Line
                    dataKey="glm5"
                    type="monotone"
                    stroke="var(--color-glm5)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                )}
              </LineChart>
            </ChartContainer>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
              {ALL_MODELS.map((model) => {
                const seriesKey = getSeriesKey(model);
                return (
                  <button
                    key={model}
                    onClick={() => toggleSeries(seriesKey)}
                    className={`flex items-center gap-1.5 transition ${
                      activeSeries.has(seriesKey) ? "opacity-100" : "opacity-40"
                    }`}
                  >
                    <span className="h-2 w-3 rounded-full" style={{ backgroundColor: MODEL_COLORS[model] }} />
                    <span className="font-medium text-[color:var(--card-foreground)]">{MODEL_LABELS[model]}</span>
                  </button>
                );
              })}
              <span className="inline-flex items-center gap-1.5 opacity-85">
                <span className="w-3 text-center font-mono text-sm leading-none text-[color:var(--destructive)]">×</span>
                <span className="font-medium text-[color:var(--card-foreground)]">Failed attempt</span>
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-[color:var(--muted-foreground)]">
              <span className="font-mono">
                {formatUtcDate(windowStart)} {formatUtcTime(windowStart)} UTC
              </span>
              <span className="font-mono">
                {formatUtcDate(windowEnd)} {formatUtcTime(windowEnd)} UTC
              </span>
            </div>
          </>
        )}
      </div>

      {hasData && Object.keys(seriesStats).length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_MODELS.map((model) => {
            const seriesKey = getSeriesKey(model);
            const stats = seriesStats[seriesKey];
            if (!stats || !activeSeries.has(seriesKey)) return null;

            return (
              <div
                key={seriesKey}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--paper)]/55 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-3 rounded-full" style={{ backgroundColor: MODEL_COLORS[model] }} />
                  <span className="font-mono text-xs font-medium text-[color:var(--card-foreground)]">
                    {MODEL_LABELS[model]}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[color:var(--card-foreground)]">
                  Average: <span className="font-mono font-medium">{formatMetricValue(metric, stats.avg)}</span>
                </p>
                <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                  Range: {formatMetricValue(metric, stats.min)} - {formatMetricValue(metric, stats.max)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}
