#!/usr/bin/env python3
"""
Replay Fireflies ingestion jobs directly from the worker process.

This is the no-HTTP fallback for local/ops backfills when ADMIN_API_KEY is not
available. It uses the same run_full_pipeline path as /api/pipeline/process.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


def _load_backend() -> None:
    backend_root = Path(__file__).resolve().parents[2]
    if str(backend_root) not in sys.path:
        sys.path.append(str(backend_root))

    from src.services.env_loader import load_env

    load_env()


def _find_jobs(
    supabase,
    *,
    stage: str,
    stale_minutes: int,
    limit: int,
    include_errors: bool,
    error_contains: Optional[str],
) -> List[Dict[str, Any]]:
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=stale_minutes)).isoformat()
    stages = [stage]
    if include_errors and "error" not in stages:
        stages.append("error")

    response = (
        supabase.table("fireflies_ingestion_jobs")
        .select("fireflies_id, metadata_id, stage, error_message, updated_at")
        .in_("stage", stages)
        .lte("updated_at", cutoff)
        .order("updated_at", desc=False)
        .limit(limit * 5)
        .execute()
    )

    jobs: List[Dict[str, Any]] = []
    for row in response.data or []:
        if not row.get("metadata_id"):
            continue
        if row.get("stage") == "error" and error_contains:
            message = (row.get("error_message") or "").lower()
            if error_contains.lower() not in message:
                continue
        jobs.append(row)
        if len(jobs) >= limit:
            break
    return jobs


def main() -> int:
    _load_backend()

    parser = argparse.ArgumentParser(description="Replay Fireflies pipeline jobs directly")
    parser.add_argument("--stage", default="raw_ingested")
    parser.add_argument("--stale-minutes", type=int, default=120)
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--include-errors", action="store_true")
    parser.add_argument("--error-contains", default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    from src.services.supabase_helpers import get_supabase_client
    from src.services.pipeline import run_full_pipeline

    if not os.getenv("AI_GATEWAY_API_KEY") and not os.getenv("OPENAI_API_KEY"):
        print("ERROR: AI_GATEWAY_API_KEY or OPENAI_API_KEY is required")
        return 2

    supabase = get_supabase_client()
    jobs = _find_jobs(
        supabase,
        stage=args.stage,
        stale_minutes=args.stale_minutes,
        limit=args.limit,
        include_errors=args.include_errors,
        error_contains=args.error_contains,
    )

    results = []
    for job in jobs:
        metadata_id = job["metadata_id"]
        if args.dry_run:
            results.append({**job, "status": "would_process"})
            continue
        try:
            result = run_full_pipeline(metadata_id)
            results.append({**job, "status": "processed", "result": result})
        except Exception as exc:
            results.append({**job, "status": "failed", "error": str(exc)})

    print(json.dumps({"matched": len(jobs), "dry_run": args.dry_run, "results": results}, default=str, indent=2))
    return 1 if any(row["status"] == "failed" for row in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
