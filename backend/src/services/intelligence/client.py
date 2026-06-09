"""LLM client helpers for Teams conversation intelligence compilation."""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List

from openai import OpenAI

logger = logging.getLogger(__name__)

COMPILER_MODEL = "gpt-5.5"
COMPILER_MODEL_DEFAULT = COMPILER_MODEL
COMPILER_MODEL_LARGE = COMPILER_MODEL
COMPILER_REQUEST_TIMEOUT_SECONDS = int(os.getenv("TEAMS_COMPILER_REQUEST_TIMEOUT_SECONDS", "60"))


def _client() -> OpenAI:
    from ..ai_transport import get_openai_client
    return get_openai_client()


def _failed_extraction(errors: List[str]) -> Dict[str, Any]:
    return {
        "overview": "",
        "conversation_topic": "",
        "confidence": 0,
        "insights": [],
        "tasks": [],
        "risks": [],
        "decisions": [],
        "sentiment": None,
        "initiative_signals": [],
        "_extraction_failed": True,
        "_errors": errors,
    }


def extract_with_retry(
    messages: List[Dict[str, Any]],
    model: str = COMPILER_MODEL_DEFAULT,
    max_retries: int = 2,
) -> Dict[str, Any]:
    """
    Call LLM with JSON mode across configured providers.

    AI Gateway does not support response_format=json_object, so JSON is enforced
    through the prompt on that provider. This function never raises; callers get a
    valid dict with _extraction_failed=True after provider exhaustion.
    """
    for attempt in range(max_retries + 1):
        try:
            kwargs: Dict[str, Any] = {
                "model": model,
                "messages": messages,
                "temperature": 0.2,
                "timeout": COMPILER_REQUEST_TIMEOUT_SECONDS,
                "response_format": {"type": "json_object"},
            }
            response = _client().chat.completions.create(**kwargs)
            raw = response.choices[0].message.content or ""
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            parsed = json.loads(raw)
            if not isinstance(parsed, dict):
                raise json.JSONDecodeError("top-level JSON value is not an object", raw, 0)
            parsed.setdefault("_extraction_failed", False)
            return parsed
        except json.JSONDecodeError as exc:
            logger.warning("[TeamsCompiler] JSON parse failure (attempt=%d): %s", attempt, exc)
            if attempt == max_retries:
                return _failed_extraction([f"JSON parse failed after {max_retries + 1} attempts"])
        except Exception as exc:
            logger.error("[TeamsCompiler] OpenAI call failed: %s", exc)
            return _failed_extraction([str(exc)])

    return _failed_extraction(["max retries exceeded"])
