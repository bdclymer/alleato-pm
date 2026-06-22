#!/usr/bin/env python3
"""Compatibility wrapper for Outlook intake RAG/project backfills.

The old implementation wrote app ``document_metadata`` rows directly and then
called the source compiler. Outlook email backfill is now owned by
``services.integrations.microsoft_graph.outlook`` so RAG document creation,
project assignment metadata, and vectorization status stay in one workflow.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

_backend_src = Path(__file__).resolve().parents[1]
_backend_root = Path(__file__).resolve().parents[2]
for p in (_backend_src, _backend_root):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

try:
    from services.env_loader import load_env

    load_env()
except Exception:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[3] / ".env")

from services.integrations.microsoft_graph.outlook import (
    backfill_outlook_intake_project_assignments,
    backfill_outlook_intake_rag_documents,
    refresh_outlook_intake_vectorization_statuses,
)
from services.supabase_helpers import get_supabase_client


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Backfill Outlook intake rows through the canonical RAG/intake workflow."
    )
    parser.add_argument("--mailbox", default=os.environ.get("MICROSOFT_GRAPH_USER_ID"))
    parser.add_argument("--limit", type=int, default=int(os.environ.get("BACKFILL_LIMIT", "500")))
    parser.add_argument(
        "--lookback-days",
        type=int,
        default=int(os.environ.get("BACKFILL_LOOKBACK_DAYS", "14")),
    )
    parser.add_argument("--since", default=os.environ.get("BACKFILL_SINCE"))
    return parser.parse_args()


def _cutoff(args: argparse.Namespace) -> str:
    if args.since:
        return args.since
    days = max(1, int(args.lookback_days or 14))
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


def backfill() -> dict[str, object]:
    args = _parse_args()
    since = _cutoff(args)
    supabase = get_supabase_client()

    rag_documents = backfill_outlook_intake_rag_documents(
        supabase,
        mailbox_user_id=args.mailbox,
        limit=args.limit,
        since=since,
    )
    project_assignments = backfill_outlook_intake_project_assignments(
        supabase,
        mailbox_user_id=args.mailbox,
        limit=args.limit,
        since=since,
    )
    vectorization_status = refresh_outlook_intake_vectorization_statuses(
        mailbox_user_id=args.mailbox,
        limit=args.limit,
        since=since,
    )
    return {
        "since": since,
        "mailbox": args.mailbox,
        "rag_documents": rag_documents,
        "project_assignments": project_assignments,
        "vectorization_status": vectorization_status,
    }


if __name__ == "__main__":
    print(json.dumps(backfill(), default=str, indent=2))
