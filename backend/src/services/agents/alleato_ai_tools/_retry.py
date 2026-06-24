"""Retry wrapper for transient Postgres/Supabase connection failures.

Supabase's session pooler (`*.pooler.supabase.com`) intermittently returns
auth-timeout and checkout-timeout errors under bursty load (e.g., when
parallel sub-agents each open a connection within milliseconds of each
other). Most failures clear on retry within a few seconds.

The PostgREST RPC path (`client.rpc(...).execute()`) has the same problem on a
different layer: when several vector searches fire concurrently (the Microsoft
Executive Assistant runs email + Teams + files searches at once), the
`search_document_chunks` halfvec query can exceed the per-statement timeout and
PostgREST returns HTTP 500 / "canceling statement due to statement timeout". The
2026-06-24 resignation-search incident was exactly this: an intermittent RPC 500
that was swallowed into a confident "no matching passages." These are
load-induced (identical concurrent calls returned 200), so they clear on retry.

This module exposes `with_db_retry`, a tiny decorator that retries on the
specific error classes we've seen in production. It's intentionally narrow:
retry ONLY on known-transient markers; never on SQL errors, permission errors,
or anything that would just mask a real bug.
"""

from __future__ import annotations

import logging
import time
from collections.abc import Callable
from functools import wraps
from typing import TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")

_TRANSIENT_MARKERS = (
    # Connection / pooler failures (SQLAlchemy path).
    "ECHECKOUTTIMEOUT",
    "authentication did not complete",
    "could not translate host name",
    "connection terminated",
    "SSL connection has been closed",
    "server closed the connection unexpectedly",
    # PostgREST RPC path: load-induced statement timeout / gateway blips. A vector
    # search that times out under concurrency must retry, not be reported as a
    # clean "no results". (2026-06-24 degraded-search incident.)
    "canceling statement due to statement timeout",
    "statement timeout",
    "57014",  # SQLSTATE query_canceled
    "Internal Server Error",
    "502 Bad Gateway",
    "503 Service",
    "504 Gateway",
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
    """Retry `fn` on transient Supabase failures with exponential backoff.

    Catches any exception whose message matches a known transient marker
    (connection-pooler blips AND PostgREST RPC statement-timeout / 5xx). Anything
    else propagates immediately so real bugs are never masked.
    """

    @wraps(fn)
    def wrapper(*args: object, **kwargs: object) -> T:
        last_exc: BaseException | None = None
        for attempt in range(1, max_attempts + 1):
            try:
                return fn(*args, **kwargs)
            except Exception as exc:  # noqa: BLE001 — re-raised unless known-transient
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
