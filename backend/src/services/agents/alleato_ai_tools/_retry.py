"""Retry wrapper for transient Postgres/Supabase connection failures.

Supabase's session pooler (`*.pooler.supabase.com`) intermittently returns
auth-timeout and checkout-timeout errors under bursty load (e.g., when
parallel sub-agents each open a connection within milliseconds of each
other). Most failures clear on retry within a few seconds.

This module exposes `with_db_retry`, a tiny decorator that retries on the
specific error classes we've seen in production eval runs. It's intentionally
narrow: don't retry on SQL errors, permission errors, or anything that
would just mask a real bug.
"""

from __future__ import annotations

import logging
import time
from collections.abc import Callable
from functools import wraps
from typing import TypeVar

from sqlalchemy.exc import OperationalError

logger = logging.getLogger(__name__)

T = TypeVar("T")

_TRANSIENT_MARKERS = (
    "ECHECKOUTTIMEOUT",
    "authentication did not complete",
    "could not translate host name",
    "connection terminated",
    "SSL connection has been closed",
    "server closed the connection unexpectedly",
)


def _is_transient(exc: BaseException) -> bool:
    msg = str(exc)
    return any(marker in msg for marker in _TRANSIENT_MARKERS)


def with_db_retry(
    fn: Callable[..., T],
    *,
    max_attempts: int = 3,
    base_delay: float = 1.0,
) -> Callable[..., T]:
    """Retry `fn` on transient Supabase pooler failures with exponential backoff.

    Only catches OperationalError whose message matches a known transient
    marker. Other exceptions propagate immediately.
    """

    @wraps(fn)
    def wrapper(*args: object, **kwargs: object) -> T:
        last_exc: BaseException | None = None
        for attempt in range(1, max_attempts + 1):
            try:
                return fn(*args, **kwargs)
            except OperationalError as exc:
                if not _is_transient(exc) or attempt == max_attempts:
                    raise
                last_exc = exc
                delay = base_delay * (2 ** (attempt - 1))
                logger.warning(
                    "transient DB error on %s (attempt %d/%d), retrying in %.1fs: %s",
                    fn.__name__,
                    attempt,
                    max_attempts,
                    delay,
                    str(exc).splitlines()[0][:200],
                )
                time.sleep(delay)
        # unreachable but keeps mypy happy
        raise last_exc  # type: ignore[misc]

    return wrapper
