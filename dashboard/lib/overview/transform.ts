import type { InferenceDoc, BucketData, RunTrendPoint } from "./types";
import { extractOutputTpsPostTtft } from "./metrics";

export function normalizeModel(model: string | undefined): string {
  if (!model || typeof model !== "string") return "unknown";
  const trimmed = model.trim().toLowerCase();
  if (trimmed.includes("glm-5.2") || trimmed.includes("glm52")) return "glm-5.2";
  if (trimmed.includes("glm-5.1") || trimmed.includes("glm51")) return "glm-5.1";
  if (trimmed.includes("glm-5") || trimmed === "glm5") return "glm-5";
  return trimmed || "unknown";
}

export function initBucketData(): BucketData {
  return { output_sum: 0, output_count: 0, ttft_sum: 0, ttft_count: 0 };
}

export function buildRunTrendPoints(docs: InferenceDoc[]): RunTrendPoint[] {
  const runBuckets = new Map<string, { timestamp: Date; model: string; data: BucketData }>();

  for (const [index, doc] of docs.entries()) {
    const ts = doc.timestamp;
    if (!(ts instanceof Date) || isNaN(ts.getTime())) continue;

    const rawRunId = typeof doc.run_id === "string" ? doc.run_id.trim() : "";
    const model = normalizeModel(doc.model);
    const runKey = rawRunId.length > 0 ? `${rawRunId}|${model}` : `legacy:${index}|${model}`;
    const existing = runBuckets.get(runKey) || { timestamp: new Date(ts), model, data: initBucketData() };

    if (ts.getTime() > existing.timestamp.getTime()) {
      existing.timestamp = new Date(ts);
    }

    if (doc.ok) {
      const outputTps = extractOutputTpsPostTtft(doc);
      if (outputTps !== null) {
        existing.data.output_sum += outputTps;
        existing.data.output_count += 1;
      }

      const ttftRaw = doc.metrics?.ttft_ms;
      const ttft = ttftRaw == null ? null : Number(ttftRaw);
      if (ttft !== null && !isNaN(ttft)) {
        existing.data.ttft_sum += ttft;
        existing.data.ttft_count += 1;
      }
    }

    runBuckets.set(runKey, existing);
  }

  const runTrendPoints: RunTrendPoint[] = [];
  for (const { timestamp, model, data } of runBuckets.values()) {
    runTrendPoints.push({
      timestamp,
      model,
      output_tps: data.output_count > 0 ? data.output_sum / data.output_count : undefined,
      ttft_ms: data.ttft_count > 0 ? data.ttft_sum / data.ttft_count : undefined,
    });
  }

  runTrendPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return runTrendPoints;
}

export function groupDocsByModel(docs: InferenceDoc[]): Map<string, InferenceDoc[]> {
  const docsByModel = new Map<string, InferenceDoc[]>();
  for (const doc of docs) {
    const model = normalizeModel(doc.model);
    if (!docsByModel.has(model)) docsByModel.set(model, []);
    docsByModel.get(model)!.push(doc);
  }
  return docsByModel;
}

export function buildHourlyBuckets(
  runTrendPoints: RunTrendPoint[],
): Map<string, Map<string, BucketData>> {
  const bucketsByModel = new Map<string, Map<string, BucketData>>();

  for (const point of runTrendPoints) {
    const ts = point.timestamp;
    const model = point.model;

    const bucket = new Date(
      Date.UTC(ts.getUTCFullYear(), ts.getUTCMonth(), ts.getUTCDate(), ts.getUTCHours(), 0, 0, 0),
    );
    const bucketKey = bucket.toISOString();

    if (!bucketsByModel.has(model)) bucketsByModel.set(model, new Map());
    const modelBuckets = bucketsByModel.get(model)!;
    const existing = modelBuckets.get(bucketKey) || initBucketData();

    if (point.output_tps !== undefined && Number.isFinite(point.output_tps)) {
      existing.output_sum += point.output_tps;
      existing.output_count += 1;
    }
    if (point.ttft_ms !== undefined && Number.isFinite(point.ttft_ms)) {
      existing.ttft_sum += point.ttft_ms;
      existing.ttft_count += 1;
    }

    modelBuckets.set(bucketKey, existing);
  }

  return bucketsByModel;
}

export function buildFailureBuckets(
  docs: InferenceDoc[],
): Map<string, Set<string>> {
  const failureBucketsByModel = new Map<string, Set<string>>();

  for (const doc of docs) {
    if (doc.ok) continue;
    const ts = doc.timestamp;
    if (!(ts instanceof Date) || isNaN(ts.getTime())) continue;

    const model = normalizeModel(doc.model);
    const bucket = new Date(
      Date.UTC(ts.getUTCFullYear(), ts.getUTCMonth(), ts.getUTCDate(), ts.getUTCHours(), 0, 0, 0),
    );
    const bucketKey = bucket.toISOString();

    if (!failureBucketsByModel.has(model)) failureBucketsByModel.set(model, new Set());
    failureBucketsByModel.get(model)!.add(bucketKey);
  }

  return failureBucketsByModel;
}
