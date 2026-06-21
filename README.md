# ZAI Monitor

Lightweight benchmark collector + dashboard for Z.AI coding-plan inference performance.

## Repo Layout
- `script/`: runs streaming benchmark prompts and writes results to MongoDB.
- `dashboard/`: Next.js UI for current KPIs and historical trends.
- `script/MONGO.md`: Mongo schema and query cheatsheet.

## Quick Start
1. Run collector
```bash
cd script
cp .env.example .env
pip install -r requirements.txt
python3 monitor_zai_inference.py
```

Required env vars:
- `ZAI_API_KEY`
- `ZAI_BASE_URL` (default workflow uses `https://api.z.ai/api/coding/paas/v4`)
- `ZAI_MODEL`
- `MONGODB_URI`

2. Run dashboard
```bash
cd dashboard
npm install
npm run dev
```

Dashboard env:
- `MONGODB_URI`
- optional: `MONGO_DB` (`zaimonitor`)
- optional: `MONGO_COLLECTION` (`inference_runs`)

## Monitored Models
The manual GitHub Actions workflow (`.github/workflows/zaimonitor.yml`) collects:
- `glm-5.2`
- `glm-5.1`
- `glm-5`

Recurring collection is disabled while the updated model identifiers are being validated.

## Metric Notes
Primary metrics:
- `ttft_ms`
- `output_tokens_per_second_post_ttft`
- `provider_output_tokens_per_second_end_to_end`
- `tokens.completion_tokens`

See `script/MONGO.md` for full field details and queries.
