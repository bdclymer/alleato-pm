from __future__ import annotations

import logging
import os
import time
from typing import Callable, TypeVar

import httpx

T = TypeVar("T")

logger = logging.getLogger(__name__)

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


def get_openai_client():
    """Return an OpenAI client using OPENAI_API_KEY directly.

    All AI calls go to OpenAI — the Vercel AI Gateway is not used.
    """
    from openai import OpenAI
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required")
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
