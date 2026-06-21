import json
import os
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

import requests

import monitor_zai_inference as monitor


class FakeResponse:
    def __init__(self, status_code: int, lines: list[str]):
        self.status_code = status_code
        self._lines = lines

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def iter_lines(self, decode_unicode: bool = True):
        for line in self._lines:
            yield line


class MonitorMetricTests(unittest.TestCase):
    def setUp(self):
        self.cfg = monitor.Config(
            zai_api_key="test-key",
            zai_base_url="https://example.test/v4",
            zai_model="glm-5.2",
            mongodb_uri="mongodb://example.test",
            request_retries=1,
            request_retry_backoff_seconds=0.01,
        )

    def test_retry_success_uses_per_attempt_timing(self):
        payload = {
            "usage": {"prompt_tokens": 5, "completion_tokens": 4, "total_tokens": 9},
            "choices": [{"delta": {"content": "abcd"}, "finish_reason": None}],
        }
        response = FakeResponse(
            status_code=200,
            lines=[f"data: {json.dumps(payload)}", "data: [DONE]"],
        )

        with (
            patch.object(
                monitor.requests,
                "post",
                side_effect=[requests.RequestException("first attempt timeout"), response],
            ),
            patch.object(monitor.time, "sleep", return_value=None),
            patch.object(monitor.time, "monotonic", side_effect=[0.0, 1.0, 10.0, 11.0, 12.0, 14.0]),
            patch.object(
                monitor,
                "now_utc",
                side_effect=[
                    datetime(2026, 2, 21, 0, 0, tzinfo=timezone.utc),
                    datetime(2026, 2, 21, 0, 1, tzinfo=timezone.utc),
                    datetime(2026, 2, 21, 0, 2, tzinfo=timezone.utc),
                    datetime(2026, 2, 21, 0, 3, tzinfo=timezone.utc),
                    datetime(2026, 2, 21, 0, 4, tzinfo=timezone.utc),
                    datetime(2026, 2, 21, 0, 5, tzinfo=timezone.utc),
                    datetime(2026, 2, 21, 0, 6, tzinfo=timezone.utc),
                ],
            ),
        ):
            result = monitor.stream_chat_completion(self.cfg, "hello", "req-1")

        self.assertTrue(result["ok"])
        self.assertEqual(result["attempt"], 2)
        self.assertAlmostEqual(result["header_latency_ms"], 1000.0)
        self.assertAlmostEqual(result["first_answer_token_ms"], 2000.0)
        self.assertAlmostEqual(result["ttft_ms"], 2000.0)
        self.assertAlmostEqual(result["total_latency_ms"], 4000.0)
        self.assertAlmostEqual(result["generation_window_ms"], 2000.0)
        self.assertAlmostEqual(result["output_tokens_per_second_end_to_end"], 1.0)
        self.assertAlmostEqual(result["output_tokens_per_second_post_ttft"], 1.5)

    def test_generation_window_waits_for_stream_end_not_finish_reason(self):
        first_event = {
            "choices": [{"delta": {"content": "token"}, "finish_reason": None}],
        }
        finish_reason_event = {
            "usage": {"prompt_tokens": 8, "completion_tokens": 8, "total_tokens": 16},
            "choices": [{"delta": {}, "finish_reason": "stop"}],
        }
        response = FakeResponse(
            status_code=200,
            lines=[
                f"data: {json.dumps(first_event)}",
                f"data: {json.dumps(finish_reason_event)}",
                "data: [DONE]",
            ],
        )

        with (
            patch.object(monitor.requests, "post", return_value=response),
            patch.object(monitor.time, "monotonic", side_effect=[19.0, 20.0, 21.0, 22.0, 26.0]),
            patch.object(
                monitor,
                "now_utc",
                side_effect=[
                    datetime(2026, 2, 21, 0, 0, tzinfo=timezone.utc),
                    datetime(2026, 2, 21, 0, 1, tzinfo=timezone.utc),
                    datetime(2026, 2, 21, 0, 2, tzinfo=timezone.utc),
                    datetime(2026, 2, 21, 0, 3, tzinfo=timezone.utc),
                    datetime(2026, 2, 21, 0, 4, tzinfo=timezone.utc),
                ],
            ),
        ):
            result = monitor.stream_chat_completion(self.cfg, "hello", "req-2")

        self.assertTrue(result["ok"])
        self.assertAlmostEqual(result["first_answer_token_ms"], 2000.0)
        self.assertAlmostEqual(result["ttft_ms"], 2000.0)
        self.assertAlmostEqual(result["total_latency_ms"], 6000.0)
        self.assertAlmostEqual(result["generation_window_ms"], 4000.0)
        self.assertAlmostEqual(result["output_tokens_per_second_end_to_end"], 1.3333333333)
        self.assertAlmostEqual(result["output_tokens_per_second_post_ttft"], 1.75)

    def test_reasoning_before_answer_sets_ttft_to_first_reasoning(self):
        first_event = {
            "choices": [{"delta": {"reasoning_content": "thinking..."}, "finish_reason": None}],
        }
        second_event = {
            "usage": {"prompt_tokens": 8, "completion_tokens": 10, "total_tokens": 18},
            "choices": [{"delta": {"content": "final answer"}, "finish_reason": "stop"}],
        }
        response = FakeResponse(
            status_code=200,
            lines=[
                f"data: {json.dumps(first_event)}",
                f"data: {json.dumps(second_event)}",
                "data: [DONE]",
            ],
        )

        with (
            patch.object(monitor.requests, "post", return_value=response),
            patch.object(monitor.time, "monotonic", side_effect=[29.0, 30.0, 31.0, 33.0, 34.0, 38.0]),
            patch.object(
                monitor,
                "now_utc",
                side_effect=[
                    datetime(2026, 2, 21, 0, 0, tzinfo=timezone.utc),
                    datetime(2026, 2, 21, 0, 1, tzinfo=timezone.utc),
                    datetime(2026, 2, 21, 0, 2, tzinfo=timezone.utc),
                    datetime(2026, 2, 21, 0, 3, tzinfo=timezone.utc),
                    datetime(2026, 2, 21, 0, 4, tzinfo=timezone.utc),
                ],
            ),
        ):
            result = monitor.stream_chat_completion(self.cfg, "hello", "req-3")

        self.assertTrue(result["ok"])
        self.assertAlmostEqual(result["first_answer_token_ms"], 4000.0)
        self.assertAlmostEqual(result["ttft_ms"], 3000.0)
        self.assertAlmostEqual(result["total_latency_ms"], 8000.0)
        self.assertAlmostEqual(result["generation_window_ms"], 4000.0)
        self.assertAlmostEqual(result["output_tokens_per_second_post_ttft"], 1.8)

    def test_load_config_infers_coding_plan_endpoint_family(self):
        env = {
            "ZAI_API_KEY": "test-key",
            "ZAI_BASE_URL": "https://api.z.ai/api/coding/paas/v4",
            "ZAI_MODEL": "glm-5.1",
            "MONGODB_URI": "mongodb://example.test",
        }
        with patch.dict(os.environ, env, clear=True):
            cfg = monitor.load_config()
        self.assertEqual(cfg.zai_endpoint_family, monitor.ENDPOINT_FAMILY_CODING_PLAN)

    def test_build_document_uses_lean_schema_and_captures_cached_tokens(self):
        cfg = monitor.Config(
            zai_api_key="test-key",
            zai_base_url="https://api.z.ai/api/coding/paas/v4",
            zai_model="glm-5.1",
            mongodb_uri="mongodb://example.test",
            zai_endpoint_family=monitor.ENDPOINT_FAMILY_CODING_PLAN,
            zai_provider="z.ai",
        )
        result = {
            "ok": True,
            "http_status": 200,
            "attempt": 1,
            "header_latency_ms": 100.0,
            "first_sse_event_ms": 150.0,
            "first_reasoning_token_ms": None,
            "first_answer_token_ms": 200.0,
            "ttft_ms": 200.0,
            "thinking_window_ms": None,
            "time_to_completed_answer_ms": 900.0,
            "total_latency_ms": 900.0,
            "generation_window_ms": 700.0,
            "output_tokens_per_second": 5.0,
            "output_tokens_per_second_end_to_end": 3.5,
            "sse_event_count": 2,
            "reasoning_chunk_count": 0,
            "content_chunk_count": 2,
            "response_text": "hello world",
            "response_chars": 11,
            "usage": {
                "prompt_tokens": 3,
                "completion_tokens": 5,
                "total_tokens": 8,
                "cached_prompt_tokens": 2,
            },
            "error": None,
            "error_payload": None,
            "started_at": datetime(2026, 2, 21, 0, 0, tzinfo=timezone.utc),
            "finished_at": datetime(2026, 2, 21, 0, 1, tzinfo=timezone.utc),
            "request_id": "req-4",
        }

        doc = monitor.build_document(cfg, "run-123", result)
        self.assertEqual(doc["endpoint_family"], monitor.ENDPOINT_FAMILY_CODING_PLAN)
        self.assertEqual(doc["endpoint_base"], "https://api.z.ai/api/coding/paas/v4")
        self.assertEqual(doc["run_id"], "run-123")
        self.assertEqual(doc["tokens"]["completion_tokens"], 5)
        self.assertEqual(doc["tokens"]["cached_prompt_tokens"], 2)
        self.assertNotIn("request_id", doc)
        self.assertNotIn("provider", doc)
        self.assertNotIn("response_preview", doc)

    def test_extract_usage_reads_cached_tokens_from_prompt_token_details(self):
        payload = {
            "usage": {
                "prompt_tokens": 1200,
                "completion_tokens": 300,
                "total_tokens": 1500,
                "prompt_tokens_details": {"cached_tokens": 800},
            }
        }
        usage = monitor._extract_usage(payload)
        self.assertEqual(usage["prompt_tokens"], 1200)
        self.assertEqual(usage["completion_tokens"], 300)
        self.assertEqual(usage["total_tokens"], 1500)
        self.assertEqual(usage["cached_prompt_tokens"], 800)


if __name__ == "__main__":
    unittest.main()
