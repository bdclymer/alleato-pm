"""Shared helpers for Alleato-hosted Deep Agents runtimes."""

from __future__ import annotations

import os
from typing import Any


def extract_agent_text(result: Any) -> str:
    if isinstance(result, dict):
        messages = result.get("messages")
        if isinstance(messages, list) and messages:
            last = messages[-1]
            content = getattr(last, "content", None)
            if content is None and isinstance(last, dict):
                content = last.get("content")
            if isinstance(content, str):
                return content.strip()
        for key in ("output", "content", "text"):
            value = result.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    content = getattr(result, "content", None)
    if isinstance(content, str):
        return content.strip()
    return str(result or "").strip()


def _openai_model_name(model: str, *, gateway: bool) -> str:
    normalized = model.strip()
    if normalized.startswith("openai:"):
        normalized = normalized.split(":", 1)[1]
    if gateway:
        return normalized if normalized.startswith("openai/") else f"openai/{normalized}"
    return normalized.split("/", 1)[1] if normalized.startswith("openai/") else normalized


def resolve_deep_agents_model(model: Any) -> Any:
    if not isinstance(model, str):
        return model

    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model=_openai_model_name(model, gateway=False),
            api_key=openai_key,
            timeout=45,
            max_retries=1,
        )
    return model
