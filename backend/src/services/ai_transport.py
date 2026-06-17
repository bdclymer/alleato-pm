from __future__ import annotations

import logging
import os
import time
from typing import Callable, TypeVar

import httpx

T = TypeVar("T")

logger = logging.getLogger(__name__)

AI_GATEWAY_BASE_URL = os.getenv("AI_GATEWAY_BASE_URL", "https://ai-gateway.vercel.sh/v1")

_TRANSIENT_MESSAGE_SNIPPETS = (
    "streamidtoolowerror",
    "stream id too low",
    "server disconnected",
    "connectionterminated",
    "connection terminated",
    "remoteprotocolerror",
    "connection reset",
    "temporarily unavailable",
    "timed out",
    "timeout",
    "econnreset",
    "broken pipe",
    "503",
    "502",
    "429",
)


def is_transient_ai_error_message(message: str) -> bool:
    normalized = str(message or "").lower()
    return any(snippet in normalized for snippet in _TRANSIENT_MESSAGE_SNIPPETS)


def is_transient_ai_error(exc: Exception) -> bool:
    if isinstance(
        exc,
        (
            httpx.TimeoutException,
            httpx.NetworkError,
            httpx.ProtocolError,
            httpx.RemoteProtocolError,
        ),
    ):
        return True

    return is_transient_ai_error_message(str(exc))


def ai_gateway_required() -> bool:
    return (os.getenv("AI_GATEWAY_REQUIRED") or "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def get_ai_provider_path() -> str:
    if ai_gateway_required():
        return "vercel_gateway"

    explicit_path = (os.getenv("AI_PROVIDER_PATH") or "").strip().lower()
    if explicit_path in {"openai", "direct", "direct_openai"}:
        return "openai"
    if explicit_path in {"vercel_gateway", "ai_gateway", "gateway", "vercel"}:
        return "vercel_gateway"
    if explicit_path:
        raise RuntimeError(
            f"Unsupported AI_PROVIDER_PATH '{explicit_path}'. Use 'openai' or 'vercel_gateway'."
        )
    return "vercel_gateway" if os.getenv("AI_GATEWAY_API_KEY") else "openai"


def ai_gateway_configured() -> bool:
    return bool((os.getenv("AI_GATEWAY_API_KEY") or "").strip())


def openai_configured() -> bool:
    return bool((os.getenv("OPENAI_API_KEY") or "").strip())


def embedding_provider_configured() -> bool:
    provider_path = get_ai_provider_path()
    if provider_path == "vercel_gateway":
        return ai_gateway_configured()
    return openai_configured()


def get_openai_client():
    """Return an OpenAI-compatible client for the configured backend provider.

    Vercel AI Gateway is preferred when AI_GATEWAY_API_KEY is present. Direct
    OpenAI is only used when explicitly selected or no gateway key is available.
    """
    from openai import OpenAI

    provider_path = get_ai_provider_path()
    if provider_path == "vercel_gateway":
        api_key = (os.getenv("AI_GATEWAY_API_KEY") or "").strip()
        if not api_key:
            raise RuntimeError(
                "AI_GATEWAY_API_KEY is required when AI_PROVIDER_PATH=vercel_gateway."
            )
        return OpenAI(api_key=api_key, base_url=AI_GATEWAY_BASE_URL)

    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY is required when AI_PROVIDER_PATH=openai or AI_GATEWAY_API_KEY is unavailable."
        )
    return OpenAI(api_key=api_key)


def retry_ai_call(
    fn: Callable[[], T],
    *,
    provider_name: str,
    operation: str,
    max_retries: int = 2,
    base_delay_seconds: float = 1.0,
) -> T:
    attempt = 0
    while True:
        try:
            return fn()
        except Exception as exc:
            if attempt >= max_retries or not is_transient_ai_error(exc):
                raise

            delay = base_delay_seconds * (2**attempt)
            logger.warning(
                "[AITransport] %s transient failure via %s (attempt %d/%d): %s. Retrying in %.1fs",
                operation,
                provider_name,
                attempt + 1,
                max_retries + 1,
                exc,
                delay,
            )
            time.sleep(delay)
            attempt += 1
