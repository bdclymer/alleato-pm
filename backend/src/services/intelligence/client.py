"""LLM client helpers for Teams conversation intelligence compilation."""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List

from openai import OpenAI

logger = logging.getLogger(__name__)

AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1"
COMPILER_MODEL_DEFAULT = "gpt-4.1-mini"
COMPILER_MODEL_LARGE = "gpt-4.1"
COMPILER_REQUEST_TIMEOUT_SECONDS = int(os.getenv("TEAMS_COMPILER_REQUEST_TIMEOUT_SECONDS", "30"))


def _provider_configs() -> List[Dict[str, str]]:
    providers: List[Dict[str, str]] = []
    gateway_key = os.getenv("AI_GATEWAY_API_KEY")
    if gateway_key:
        providers.append(
            {
                "name": "AI Gateway",
                "api_key": gateway_key,
                "base_url": AI_GATEWAY_BASE_URL,
                "model_prefix": "openai/",
            }
        )

    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        providers.append(
            {
                "name": "OpenAI direct",
                "api_key": openai_key,
                "base_url": "",
                "model_prefix": "",
            }
        )

    if not providers:
        raise RuntimeError("AI_GATEWAY_API_KEY or OPENAI_API_KEY is required for Teams compiler")
    return providers


def _client(provider: Dict[str, str]) -> OpenAI:
    kwargs: Dict[str, str] = {"api_key": provider["api_key"]}
    if provider.get("base_url"):
        kwargs["base_url"] = provider["base_url"]
    return OpenAI(**kwargs)


def _model_for_provider(model: str, provider: Dict[str, str]) -> str:
    prefix = provider.get("model_prefix", "")
    if prefix and not model.startswith(prefix):
        return f"{prefix}{model}"
    return model


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
    errors: List[str] = []
    try:
        providers = _provider_configs()
    except Exception as exc:
        logger.error("[TeamsCompiler] Provider configuration failed: %s", exc)
        return _failed_extraction([str(exc)])

    for provider in providers:
        for attempt in range(max_retries + 1):
            try:
                kwargs: Dict[str, Any] = {
                    "model": _model_for_provider(model, provider),
                    "messages": messages,
                    "temperature": 0.2,
                    "timeout": COMPILER_REQUEST_TIMEOUT_SECONDS,
                }
                if provider["name"] != "AI Gateway":
                    kwargs["response_format"] = {"type": "json_object"}

                response = _client(provider).chat.completions.create(**kwargs)
                raw = response.choices[0].message.content or ""
                parsed = json.loads(raw)
                if not isinstance(parsed, dict):
                    raise json.JSONDecodeError("top-level JSON value is not an object", raw, 0)
                parsed.setdefault("_extraction_failed", False)
                return parsed
            except json.JSONDecodeError as exc:
                logger.warning(
                    "[TeamsCompiler] JSON parse failure (provider=%s attempt=%d): %s",
                    provider["name"],
                    attempt,
                    exc,
                )
                if attempt == max_retries:
                    errors.append(
                        f"{provider['name']}: JSON parse failed after {max_retries + 1} attempts"
                    )
            except Exception as exc:
                logger.error("[TeamsCompiler] Provider %s failed: %s", provider["name"], exc)
                errors.append(f"{provider['name']}: {exc}")
                break

    logger.error("[TeamsCompiler] All providers failed: %s", " | ".join(errors))
    return _failed_extraction(errors)
