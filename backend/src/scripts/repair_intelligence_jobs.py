#!/usr/bin/env python3
"""Requeue stale/transient intelligence jobs and run a bounded compiler pass."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List


TRANSIENT_ERROR_MARKERS = (
    "server disconnected",
    "connectionterminated",
    "connection terminated",
    "timeout",
    "temporarily unavailable",
    "final projection writes are disabled",
    "projection row count",
)


def _load_backend() -> None:
    backend_root = Path(__file__).resolve().parents[2]
    if str(backend_root) not in sys.path:
        sys.path.append(str(backend_root))

    from src.services.env_loader import load_env

    load_env()


def _is_transient_error(value: Any) -> bool:
    message = str(value or "").lower()
    return any(marker in message for marker in TRANSIENT_ERROR_MARKERS)


def _rows(response: Any) -> List[Dict[str, Any]]:
    return list(getattr(response, "data", None) or [])


def _execute(query: Any, *, attempts: int = 3) -> Any:
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            return query.execute()
        except Exception as exc:  # noqa: BLE001 - ops script must surface final provider error
            last_error = exc
            if attempt == attempts:
                break
            time.sleep(2 * attempt)
    raise RuntimeError(f"Supabase query failed after {attempts} attempts: {last_error}") from last_error


def _is_duplicate_active_job_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return "duplicate key value violates unique constraint" in message and "active" in message


def _requeue_rows(
    supabase: Any,
    table_name: str,
    rows: List[Dict[str, Any]],
    *,
    dry_run: bool,
) -> Dict[str, Any]:
    if dry_run:
        return {"requeued": len(rows), "skipped_duplicate": 0, "skipped_ids": []}
    count = 0
    skipped_ids: List[str] = []
    for row in rows:
        try:
            _execute(
                supabase.table(table_name).update(
                    {
                        "status": "queued",
                        "started_at": None,
                        "finished_at": None,
                        "last_error": None,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                ).eq("id", row["id"])
            )
            count += 1
        except Exception as exc:  # noqa: BLE001 - ops script must continue past duplicate active rows
            if _is_duplicate_active_job_error(exc):
                skipped_ids.append(row["id"])
                continue
            raise
    return {"requeued": count, "skipped_duplicate": len(skipped_ids), "skipped_ids": skipped_ids}


def _find_stale_running(supabase: Any, table_name: str, cutoff_iso: str, limit: int) -> List[Dict[str, Any]]:
    return _rows(
        _execute(
            supabase.table(table_name)
            .select("id,status,last_error,started_at,updated_at,attempt_count")
            .eq("status", "running")
            .lte("updated_at", cutoff_iso)
            .limit(limit)
        )
    )


def _find_transient_failed(supabase: Any, table_name: str, limit: int) -> List[Dict[str, Any]]:
    rows = _rows(
        _execute(
            supabase.table(table_name)
            .select("id,status,last_error,started_at,updated_at,attempt_count")
            .eq("status", "failed")
            .limit(limit * 5)
        )
    )
    return [row for row in rows if _is_transient_error(row.get("last_error"))][:limit]


def main() -> int:
    _load_backend()

    parser = argparse.ArgumentParser(description="Repair stale/transient source intelligence and packet jobs")
    parser.add_argument("--stale-minutes", type=int, default=60)
    parser.add_argument("--limit", type=int, default=25)
    parser.add_argument("--source-limit", type=int, default=25)
    parser.add_argument("--packet-limit", type=int, default=25)
    parser.add_argument("--max-processing-time-ms", type=int, default=120000)
    parser.add_argument(
        "--use-operating-summary-compiler",
        action="store_true",
        help=(
            "Opt into the LLM-backed project operating summary compiler during repair. "
            "By default repairs use the deterministic packet compiler to avoid bulk credit burn."
        ),
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not args.use_operating_summary_compiler:
        os.environ["INTELLIGENCE_USE_OPERATING_SUMMARY_COMPILER"] = "false"

    from src.services.intelligence.compiler import run_intelligence_compiler_batch
    from src.services.supabase_helpers import get_rag_write_client, get_supabase_client

    supabase = get_supabase_client()
    rag = get_rag_write_client()
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=max(1, args.stale_minutes))
    cutoff_iso = cutoff.isoformat()
    limit = max(1, args.limit)

    source_rows = _find_stale_running(rag, "source_intelligence_jobs", cutoff_iso, limit)
    source_rows.extend(_find_transient_failed(rag, "source_intelligence_jobs", limit))
    packet_rows = [
        *_find_stale_running(rag, "packet_refresh_jobs", cutoff_iso, limit),
        *_find_transient_failed(rag, "packet_refresh_jobs", limit),
    ]

    source_by_id = {row["id"]: row for row in source_rows}
    packet_by_id = {row["id"]: row for row in packet_rows}
    source_requeue = _requeue_rows(rag, "source_intelligence_jobs", list(source_by_id.values()), dry_run=args.dry_run)
    packet_requeue = _requeue_rows(rag, "packet_refresh_jobs", list(packet_by_id.values()), dry_run=args.dry_run)

    compiler_result = None
    if not args.dry_run and (source_requeue["requeued"] or packet_requeue["requeued"]):
        compiler_result = run_intelligence_compiler_batch(
            supabase,
            source_limit=max(0, args.source_limit),
            packet_limit=max(0, args.packet_limit),
            max_processing_time_ms=max(1000, args.max_processing_time_ms),
        )

    print(
        json.dumps(
            {
                "dry_run": args.dry_run,
                "stale_cutoff": cutoff_iso,
                "source_jobs_requeued": source_requeue["requeued"],
                "source_jobs_skipped_duplicate": source_requeue["skipped_duplicate"],
                "packet_jobs_requeued": packet_requeue["requeued"],
                "packet_jobs_skipped_duplicate": packet_requeue["skipped_duplicate"],
                "source_job_ids": list(source_by_id.keys()),
                "source_job_skipped_ids": source_requeue["skipped_ids"],
                "packet_job_ids": list(packet_by_id.keys()),
                "packet_job_skipped_ids": packet_requeue["skipped_ids"],
                "compiler_result": compiler_result,
            },
            default=str,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
