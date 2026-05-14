#!/usr/bin/env python3
"""Reclassify stored Outlook intake rows with the current intake classifier.

This updates the app database outlook_email_intake rows. It does not read from
or write to the isolated RAG database.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def _load_backend() -> None:
    backend_root = Path(__file__).resolve().parents[2]
    if str(backend_root) not in sys.path:
        sys.path.append(str(backend_root))

    from src.services.env_loader import load_env

    load_env()


def main() -> int:
    _load_backend()

    parser = argparse.ArgumentParser(description="Reclassify stored Outlook intake rows.")
    parser.add_argument("--mailbox", help="Limit to one mailbox_user_id/email.")
    parser.add_argument(
        "--intake-ids",
        help="Comma-separated outlook_email_intake IDs. When supplied, days/mailbox filters are ignored.",
    )
    parser.add_argument("--days-back", type=int, default=0, help="0 means today in the selected time zone.")
    parser.add_argument("--time-zone", default="America/New_York")
    parser.add_argument("--limit", type=int, default=500)
    parser.add_argument("--page-size", type=int, default=100)
    parser.add_argument("--apply", action="store_true", help="Persist classifier metadata/status updates.")
    args = parser.parse_args()

    from src.services.integrations.microsoft_graph.intake_reclassification import (
        run_outlook_intake_reclassification,
    )
    from src.services.supabase_helpers import get_supabase_client

    intake_ids = [
        int(value.strip())
        for value in (args.intake_ids or "").split(",")
        if value.strip()
    ] or None
    result = run_outlook_intake_reclassification(
        get_supabase_client(),
        mailbox=args.mailbox,
        intake_ids=intake_ids,
        days_back=args.days_back,
        time_zone=args.time_zone,
        limit=args.limit,
        page_size=args.page_size,
        apply=args.apply,
        applied_by="backend/src/scripts/reclassify_outlook_intake.py",
    )

    print(json.dumps(result, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
