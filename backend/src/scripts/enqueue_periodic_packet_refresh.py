#!/usr/bin/env python3
"""Enqueue scheduled packet-refresh jobs for every active intelligence target.

Construction moves fast — packets older than ~8 hours are not trustworthy for
owner-level decisions. The compiler refreshes packets on-demand when a new
source signal is promoted to an insight card, but a target with no new comms
will not be refreshed without this script. This cron guarantees a baseline
refresh cadence across the whole portfolio.

Schedule via Render: 4×/day. Sized so the morning owner briefing (07:00 ET)
always reads packets generated within the last few hours.

The job is idempotent — enqueue_packet_refresh dedupes against existing
queued/running jobs, so running this twice within the same window is harmless.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path


def _load_backend() -> None:
    backend_root = Path(__file__).resolve().parents[2]
    if str(backend_root) not in sys.path:
        sys.path.append(str(backend_root))

    from src.services.env_loader import load_env

    load_env()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--reason",
        default="scheduled_periodic_refresh",
        help="Reason string written to packet_refresh_jobs.reason",
    )
    parser.add_argument(
        "--priority",
        type=int,
        default=20,
        help="Job priority (lower = higher priority; default 20 sits below event-driven jobs at 10)",
    )
    parser.add_argument(
        "--target-types",
        default="client_project",
        help="Comma-separated target_types to refresh (default: client_project)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List targets that would be enqueued without writing rows",
    )
    args = parser.parse_args()

    _load_backend()

    from src.services.intelligence.compiler import (
        COMPILER_VERSION,
        enqueue_packet_refresh,
    )
    from src.services.ops.db_pressure_guard import enforce_app_db_pressure_guard
    from src.services.supabase_helpers import (
        get_rag_write_client,
        get_supabase_client,
    )

    enforce_app_db_pressure_guard("periodic_packet_refresh")

    # Targets live in MAIN; refresh jobs go to RAG (compiler convention).
    main_client = get_supabase_client()
    rag_client = get_rag_write_client()

    target_types = [t.strip() for t in args.target_types.split(",") if t.strip()]
    response = (
        main_client.table("intelligence_targets")
        .select("id,name,target_type,status,project_id")
        .eq("status", "active")
        .in_("target_type", target_types)
        .execute()
    )
    targets = response.data or []

    started = time.time()
    enqueued = 0
    skipped = 0
    failed = 0
    errors: list[dict] = []

    print(
        json.dumps(
            {
                "event": "periodic_packet_refresh_start",
                "target_count": len(targets),
                "target_types": target_types,
                "reason": args.reason,
                "priority": args.priority,
                "compiler_version": COMPILER_VERSION,
                "dry_run": args.dry_run,
            }
        ),
        flush=True,
    )

    for t in targets:
        target_id = t["id"]
        name = t.get("name", "?")
        if args.dry_run:
            print(
                json.dumps(
                    {"event": "would_enqueue", "target_id": target_id, "name": name}
                ),
                flush=True,
            )
            enqueued += 1
            continue
        try:
            job = enqueue_packet_refresh(
                rag_client,
                target_id,
                reason=args.reason,
                priority=args.priority,
                compiler_version=COMPILER_VERSION,
            )
            status = (job or {}).get("status") if isinstance(job, dict) else None
            if status in {"queued", "running"}:
                # enqueue_packet_refresh returns the existing job when dedup hits
                if (job or {}).get("reason") == args.reason and (job or {}).get("queued_at"):
                    enqueued += 1
                else:
                    skipped += 1
            else:
                enqueued += 1
        except Exception as exc:  # noqa: BLE001 — log and continue
            failed += 1
            errors.append({"target_id": target_id, "name": name, "error": str(exc)})

    duration_ms = int((time.time() - started) * 1000)
    print(
        json.dumps(
            {
                "event": "periodic_packet_refresh_complete",
                "target_count": len(targets),
                "enqueued": enqueued,
                "skipped_dedup": skipped,
                "failed": failed,
                "duration_ms": duration_ms,
                "errors": errors[:10],
            }
        ),
        flush=True,
    )

    return 1 if failed and failed == len(targets) else 0


if __name__ == "__main__":
    raise SystemExit(main())
