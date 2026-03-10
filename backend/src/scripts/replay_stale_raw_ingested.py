#!/usr/bin/env python3
"""
Replay stale raw_ingested jobs via protected admin endpoint.

Usage:
  python src/scripts/replay_stale_raw_ingested.py --stale-minutes 180 --limit 50 --dry-run
  python src/scripts/replay_stale_raw_ingested.py --stale-minutes 180 --limit 50
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import requests


def _load_env() -> None:
    """Load project env using existing backend loader."""
    repo_root = Path(__file__).resolve().parents[2]
    if str(repo_root) not in sys.path:
        sys.path.append(str(repo_root))

    from src.services.env_loader import load_env

    load_env()


def main() -> int:
    _load_env()

    parser = argparse.ArgumentParser(description="Replay stale raw_ingested jobs")
    parser.add_argument("--stale-minutes", type=int, default=120)
    parser.add_argument("--limit", type=int, default=25)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--backend-url",
        default=(os.getenv("PYTHON_BACKEND_URL") or "http://127.0.0.1:8000"),
        help="FastAPI backend base URL",
    )
    args = parser.parse_args()

    admin_api_key = os.getenv("ADMIN_API_KEY")
    if not admin_api_key:
        print("ERROR: ADMIN_API_KEY is not set")
        return 2

    backend_url = args.backend_url.rstrip("/")
    endpoint = f"{backend_url}/api/admin/documents/replay-stale-raw-ingested"

    payload = {
        "stale_minutes": args.stale_minutes,
        "limit": args.limit,
        "dry_run": args.dry_run,
    }
    headers = {
        "Content-Type": "application/json",
        "X-Admin-Api-Key": admin_api_key,
    }

    try:
        response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
    except Exception as exc:
        print(f"ERROR: request failed: {exc}")
        return 1

    try:
        body = response.json()
    except Exception:
        body = {"raw": response.text[:500]}

    print(json.dumps({"status_code": response.status_code, "response": body}, indent=2))
    return 0 if response.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())

