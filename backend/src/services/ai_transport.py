from __future__ import annotations

import logging
import time
from typing import Callable, TypeVar

import httpx

T = TypeVar("T")

logger = logging.getLogger(__name__)

_TRANSIENT_MESSAGE_SNIPPETS = (
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

    message = str(exc).lower()
    return any(snippet in message for snippet in _TRANSIENT_MESSAGE_SNIPPETS)


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
