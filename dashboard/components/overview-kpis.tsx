import type { ModelMetrics, TrendByModel } from "@/lib/overview-types";
import { PRIMARY_MODEL, SIDE_MODELS, MODEL_LABELS, type ModelKey } from "@/lib/constants";
import { isTpsDegraded, isTtftDegraded } from "@/lib/overview/degradation";

type KpiVariant = "primary" | "secondary";

type KpiCardProps = {
  label: string;
  delta?: string;
  tone: string;
  unit?: string;
  variant: KpiVariant;
  formatValue: (model: ModelKey) => string | null;
  formatDegraded?: (model: ModelKey) => boolean;
};

type ValueTextProps = {
  value: string | null;
  unit?: string;
  valueClassName: string;
  unitClassName: string;
  unitDetached?: boolean;
};

function ValueText({ value, unit, valueClassName, unitClassName, unitDetached = false }: ValueTextProps) {
  const hasValue = value != null;

  return (
    <p className={valueClassName}>
      {!hasValue ? (
        "—"
      ) : (
        <span className={unitDetached ? "relative inline-block whitespace-nowrap" : undefined}>
          <span>{value}</span>
          {unit && (
            <span
              className={
                unitDetached
                  ? `absolute top-1/2 left-full -translate-y-1/2 pl-1.5 ${unitClassName}`
                  : unitClassName
              }
            >
              {unit}
            </span>
          )}
        </span>
      )}
    </p>
  );
}

type KpiModelLayoutProps = {
  formatValue: (model: ModelKey) => string | null;
  formatDegraded?: (model: ModelKey) => boolean;
  unit?: string;
  variant: KpiVariant;
};

function KpiModelLayout({ formatValue, formatDegraded, unit, variant }: KpiModelLayoutProps) {
  const leadValue = formatValue(PRIMARY_MODEL);
  const leadDegraded = formatDegraded?.(PRIMARY_MODEL) ?? false;

  if (variant === "secondary") {
    return (
      <div className="space-y-2.5">
        <div className={`rounded-2xl border p-3.5 ${leadDegraded ? "border-[color:var(--destructive)] bg-[color:var(--destructive)]/10" : "border-[color:var(--border)] bg-[color:var(--paper)]/72"}`}>
          <div className="flex items-center justify-center gap-2">
            <p className="text-center font-display text-xs font-semibold tracking-wide text-[color:var(--card-foreground)]">
              {MODEL_LABELS[PRIMARY_MODEL]}
            </p>
            {leadDegraded && (
              <span className="inline-flex items-center rounded-full bg-[color:var(--destructive)]/20 px-2 py-0.5 text-[10px] font-medium text-[color:var(--destructive)]">
                critical
              </span>
            )}
          </div>
          <div className="mt-2">
            <ValueText
              value={leadValue}
              unit={unit}
              valueClassName={`text-center font-display text-2xl leading-none ${leadDegraded ? "text-[color:var(--destructive)]" : "text-[color:var(--card-foreground)]"}`}
              unitClassName="text-xs text-[color:var(--muted-foreground)]"
              unitDetached
            />
          </div>
        </div>

        {SIDE_MODELS.map((model) => {
          const value = formatValue(model);
          const critical = formatDegraded?.(model) ?? false;
          return (
            <div
              key={model}
              className={`rounded-xl border px-3 py-2.5 ${critical ? "border-[color:var(--destructive)] bg-[color:var(--destructive)]/10" : "border-[color:var(--border)] bg-[color:var(--paper)]/60"}`}
            >
              <div className="flex items-end justify-between gap-3">
                <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5">
                  <p
                    className="truncate font-display text-[11px] font-semibold tracking-wide text-[color:var(--muted-foreground)]"
                    title={MODEL_LABELS[model]}
                  >
                    {MODEL_LABELS[model]}
                  </p>
                  {critical && (
                    <span className="inline-flex items-center rounded-full bg-[color:var(--destructive)]/20 px-1.5 py-0.5 text-[9px] font-medium text-[color:var(--destructive)]">
                      critical
                    </span>
                  )}
                </div>
                <ValueText
                  value={value}
                  unit={unit}
                  valueClassName={`font-display text-lg leading-none ${critical ? "text-[color:var(--destructive)]" : "text-[color:var(--card-foreground)]"}`}
                  unitClassName="ml-1.5 text-[10px] text-[color:var(--muted-foreground)]"
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid items-start gap-2.5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className={`self-start rounded-2xl border p-4 sm:p-5 ${leadDegraded ? "border-[color:var(--destructive)] bg-[color:var(--destructive)]/10" : "border-[color:var(--border)] bg-[color:var(--paper)]/72"}`}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center gap-2">
            <p className="text-center font-display text-sm font-semibold tracking-wide text-[color:var(--card-foreground)]">
              {MODEL_LABELS[PRIMARY_MODEL]}
            </p>
            {leadDegraded && (
              <span className="inline-flex items-center rounded-full bg-[color:var(--destructive)]/20 px-2 py-0.5 text-xs font-medium text-[color:var(--destructive)]">
                critical
              </span>
            )}
          </div>
          <ValueText
            value={leadValue}
            unit={unit}
            valueClassName={`text-center font-display text-4xl leading-none sm:text-[2.7rem] ${leadDegraded ? "text-[color:var(--destructive)]" : "text-[color:var(--card-foreground)]"}`}
            unitClassName="text-base text-[color:var(--muted-foreground)]"
            unitDetached
          />
        </div>
      </div>

      <div className="grid gap-2.5">
        {SIDE_MODELS.map((model) => {
          const value = formatValue(model);
          const critical = formatDegraded?.(model) ?? false;
          return (
            <div
              key={model}
              className={`rounded-2xl border p-3 ${critical ? "border-[color:var(--destructive)] bg-[color:var(--destructive)]/10" : "border-[color:var(--border)] bg-[color:var(--paper)]/62"}`}
            >
              <div className="flex items-end justify-between gap-4">
                <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5">
                  <p
                    className="truncate font-display text-xs font-semibold tracking-wide text-[color:var(--muted-foreground)]"
                    title={MODEL_LABELS[model]}
                  >
                    {MODEL_LABELS[model]}
                  </p>
                  {critical && (
                    <span className="inline-flex items-center rounded-full bg-[color:var(--destructive)]/20 px-1.5 py-0.5 text-[9px] font-medium text-[color:var(--destructive)]">
                      critical
                    </span>
                  )}
                </div>
                <ValueText
                  value={value}
                  unit={unit}
                  valueClassName={`font-display text-xl leading-none ${critical ? "text-[color:var(--destructive)]" : "text-[color:var(--card-foreground)]"}`}
                  unitClassName="ml-1.5 text-xs text-[color:var(--muted-foreground)]"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KpiCard({ label, delta, tone, unit, variant, formatValue, formatDegraded }: KpiCardProps) {
  return (
    <article className="paper-panel paper-noise fade-up rounded-2xl p-5">
      <div className={`mb-4 inline-flex rounded-full px-3 py-1 text-xs font-medium ${tone}`}>
        {label}
      </div>

      <KpiModelLayout
        formatValue={formatValue}
        formatDegraded={formatDegraded}
        unit={unit}
        variant={variant}
      />

      {delta && (
        <p className="mt-3 font-mono text-xs text-[color:var(--muted-foreground)]">{delta}</p>
      )}
    </article>
  );
}

type OverviewKpisProps = {
  data: Record<string, ModelMetrics>;
};

type OverviewKpisPrimaryProps = {
  trendByModel: TrendByModel;
};

function msToSeconds(value: number | null | undefined): string | null {
  if (value == null) return null;
  return (value / 1000).toFixed(2);
}

function formatRate(value: number | null | undefined): string | null {
  if (value == null) return null;
  return value.toFixed(2);
}

function formatPercent(value: number | null | undefined): string | null {
  if (value == null) return null;
  return value.toFixed(1);
}

function getLatestTrendValue(
  trendByModel: TrendByModel,
  model: ModelKey,
  metric: "output_tps" | "ttft_ms",
): number | null {
  const modelTrend = trendByModel[model] ?? [];
  const latestPoint = modelTrend[modelTrend.length - 1];
  const value = latestPoint?.[metric];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function OverviewKpisPrimary({ trendByModel }: OverviewKpisPrimaryProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <KpiCard
        label="Tokens per Second Latest"
        delta=""
        tone="bg-[color:var(--accent-mint)]/60"
        unit="tps"
        variant="primary"
        formatValue={(model: ModelKey) => formatRate(getLatestTrendValue(trendByModel, model, "output_tps"))}
        formatDegraded={(model: ModelKey) => isTpsDegraded(trendByModel, model)}
      />
      <KpiCard
        label="Time to First Token Latest"
        delta=""
        tone="bg-[color:var(--accent-sky)]/55"
        unit="s"
        variant="primary"
        formatValue={(model: ModelKey) => msToSeconds(getLatestTrendValue(trendByModel, model, "ttft_ms"))}
        formatDegraded={(model: ModelKey) => isTtftDegraded(trendByModel, model)}
      />
    </section>
  );
}

export function OverviewKpisSecondary({ data }: OverviewKpisProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <KpiCard
        label="Success Rate"
        tone="bg-[color:var(--accent-gold)]/60"
        unit="%"
        variant="secondary"
        formatValue={(model: ModelKey) => formatPercent(data[model]?.success_rate_percent)}
      />
      <KpiCard
        label="p95 Time to First Token"
        tone="bg-[color:var(--accent-rose)]/58"
        unit="s"
        variant="secondary"
        formatValue={(model: ModelKey) => msToSeconds(data[model]?.p95_ttft_ms)}
      />
      <KpiCard
        label="End-to-End Throughput Avg"
        delta="completion tokens / total latency"
        tone="bg-[color:var(--accent-sky)]/45"
        unit="tps"
        variant="secondary"
        formatValue={(model: ModelKey) => formatRate(data[model]?.avg_provider_tps_end_to_end)}
      />
    </section>
  );
}
