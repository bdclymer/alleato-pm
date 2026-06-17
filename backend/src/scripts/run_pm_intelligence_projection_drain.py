#!/usr/bin/env python3
"""Drain staged PM intelligence packet projections through the bounded guard."""

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
        "--limit",
        type=int,
        default=5,
        help="Maximum staged projection jobs to drain in this run (capped at 25).",
    )
    parser.add_argument(
        "--max-processing-time-ms",
        type=int,
        default=120000,
        help="Stop claiming more work once this processing budget is reached.",
    )
    args = parser.parse_args()

    _load_backend()

    from src.services.intelligence.compiler import run_pm_intelligence_projection_batch
    from src.services.ops.db_pressure_guard import enforce_app_db_pressure_guard
    from src.services.supabase_helpers import get_supabase_client

    started = time.time()
    enforce_app_db_pressure_guard("pm_intelligence_projection_drain")
    client = get_supabase_client()

    print(
        json.dumps(
            {
                "event": "pm_intelligence_projection_drain_start",
                "limit": args.limit,
                "max_processing_time_ms": args.max_processing_time_ms,
            }
        ),
        flush=True,
    )
    result = run_pm_intelligence_projection_batch(
        client,
        limit=args.limit,
        max_processing_time_ms=args.max_processing_time_ms,
    )
    result = {
        **result,
        "event": "pm_intelligence_projection_drain_complete",
        "elapsed_seconds": round(time.time() - started, 3),
    }
    print(json.dumps(result, default=str), flush=True)
    return 1 if result.get("projection_jobs_failed") else 0


if __name__ == "__main__":
    raise SystemExit(main())
