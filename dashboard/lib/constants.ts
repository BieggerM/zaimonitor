export const ALL_MODELS = ["glm-5.2", "glm-5.1", "glm-5"] as const;

export type ModelKey = (typeof ALL_MODELS)[number];

export const PRIMARY_MODEL: ModelKey = "glm-5.2";

export const SIDE_MODELS: readonly ModelKey[] = ["glm-5.1", "glm-5"] as const;

export const MODEL_LABELS: Record<ModelKey, string> = {
  "glm-5.2": "GLM-5.2",
  "glm-5.1": "GLM-5.1",
  "glm-5": "GLM-5",
};

export const MODEL_COLORS: Record<ModelKey, string> = {
  "glm-5.2": "var(--chart-2)",
  "glm-5.1": "var(--chart-1)",
  "glm-5": "var(--chart-3)",
};

export type TrendMetricKey = "output_tps" | "ttft_ms";

export const TREND_METRIC_OPTIONS: ReadonlyArray<{ key: TrendMetricKey; label: string }> = [
  { key: "output_tps", label: "Tokens/sec" },
  { key: "ttft_ms", label: "Time to First Token" },
];

export const TREND_WINDOW_OPTIONS = [
  { value: "24", label: "24h" },
  { value: "168", label: "7d" },
] as const;

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
export const SEVEN_DAY_SMOOTHING_RADIUS = 2;

export type TrendSeriesKey = "glm52" | "glm51" | "glm5";

export const TREND_SERIES_KEYS: readonly TrendSeriesKey[] = ["glm52", "glm51", "glm5"] as const;

export const TREND_SERIES_BY_MODEL: Record<ModelKey, TrendSeriesKey> = {
  "glm-5.2": "glm52",
  "glm-5.1": "glm51",
  "glm-5": "glm5",
};

// Performance degradation thresholds
export const DEGRADATION_THRESHOLDS = {
  tps: {
    min: 45,
    unit: "tps",
  },
  ttft: {
    max: 10000,
    unit: "ms",
  },
} as const;
