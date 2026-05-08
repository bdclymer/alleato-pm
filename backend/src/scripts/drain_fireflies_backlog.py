#!/usr/bin/env python3
"""Drain Fireflies backlog through the scheduler-safe pipeline path."""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any, Dict, List


def _load_backend() -> None:
    backend_root = Path(__file__).resolve().parents[2]
    if str(backend_root) not in sys.path:
        sys.path.append(str(backend_root))

    from src.services.env_loader import load_env

    load_env()


def main() -> int:
    _load_backend()

    parser = argparse.ArgumentParser(description="Drain stale Fireflies pipeline backlog safely")
    parser.add_argument("--batch-size", type=int, default=10)
    parser.add_argument("--batches", type=int, default=1)
    parser.add_argument("--stale-minutes", type=int, default=120)
    parser.add_argument("--max-runtime-seconds", type=int, default=600)
    parser.add_argument("--stop-on-failure", action="store_true")
    args = parser.parse_args()

    from src.services.scheduler import _run_fireflies_pipeline_backlog

    started = time.monotonic()
    results: List[Dict[str, Any]] = []
    for batch_index in range(max(1, args.batches)):
        if time.monotonic() - started >= args.max_runtime_seconds:
            break
        result = _run_fireflies_pipeline_backlog(
            limit=max(1, args.batch_size),
            stale_minutes=max(0, args.stale_minutes),
        )
        result["batch_index"] = batch_index + 1
        results.append(result)
        if result.get("matched", 0) == 0:
            break
        if args.stop_on_failure and result.get("failed", 0):
            break

    summary = {
        "batches_run": len(results),
        "matched": sum(int(row.get("matched") or 0) for row in results),
        "processed": sum(int(row.get("processed") or 0) for row in results),
        "skipped": sum(int(row.get("skipped") or 0) for row in results),
        "failed": sum(int(row.get("failed") or 0) for row in results),
        "elapsed_seconds": round(time.monotonic() - started, 2),
        "results": results,
    }
    print(json.dumps(summary, default=str, indent=2))
    return 1 if summary["failed"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
