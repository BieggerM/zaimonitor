# Mongo Schema (`inference_runs`)

Defaults:
- DB: `zaimonitor` (`MONGO_DB` override)
- Collection: `inference_runs` (`MONGO_COLLECTION` override)

## Document Shape (v4)
```json
{
  "timestamp": "ISODate",
  "metrics_version": 4,
  "run_id": "UUID",
  "endpoint_family": "coding_plan",
  "endpoint_base": "https://api.z.ai/api/coding/paas/v4",
  "model": "glm-5.2 | glm-5.1 | glm-5",
  "ok": true,
  "metrics": {
    "first_answer_token_ms": 1200.5,
    "ttft_ms": 760.2,
    "total_latency_ms": 2100.9,
    "generation_window_ms": 900.4,
    "provider_output_tokens_per_second_end_to_end": 31.2,
    "output_tokens_per_second_post_ttft": 40.2
  },
  "tokens": {
    "completion_tokens": 150,
    "cached_prompt_tokens": 80
  },
  "error": {
    "type": null
  }
}
```

## Useful Queries
Latest docs:
```javascript
db.inference_runs.find().sort({ timestamp: -1 }).limit(20)
```

Recent success averages by model:
```javascript
db.inference_runs.aggregate([
  { $match: { ok: true, metrics_version: 4 } },
  { $group: {
    _id: "$model",
    avg_ttft_ms: { $avg: "$metrics.ttft_ms" },
    avg_output_tps_post_ttft: { $avg: "$metrics.output_tokens_per_second_post_ttft" },
    avg_provider_tps_e2e: { $avg: "$metrics.provider_output_tokens_per_second_end_to_end" },
    count: { $sum: 1 }
  }},
  { $sort: { count: -1 } }
])
```

Failure breakdown:
```javascript
db.inference_runs.aggregate([
  { $match: { ok: false } },
  { $group: { _id: "$error.type", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

## Indexes (auto-created by collector)
- `{ timestamp: 1 }`
- `{ model: 1, timestamp: 1 }`
- `{ endpoint_family: 1, timestamp: 1 }`
- `{ endpoint_family: 1, model: 1, timestamp: 1 }`
- `{ ok: 1, timestamp: 1 }`
- `{ run_id: 1, timestamp: 1 }`
- `{ metrics_version: 1, timestamp: 1 }`
