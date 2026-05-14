#!/usr/bin/env python3
"""Reclassify stored Outlook intake rows with the current intake classifier.

This updates the app database outlook_email_intake rows. It does not read from
or write to the isolated RAG database.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo


def _load_backend() -> None:
    backend_root = Path(__file__).resolve().parents[2]
    if str(backend_root) not in sys.path:
        sys.path.append(str(backend_root))

    from src.services.env_loader import load_env

    load_env()


def _start_of_day(days_back: int, time_zone: str) -> datetime:
    tz = ZoneInfo(time_zone)
    now = datetime.now(tz)
    local_start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days_back)
    return local_start.astimezone(timezone.utc)


def _source_metadata(row: dict[str, Any]) -> dict[str, Any]:
    value = row.get("source_metadata")
    return dict(value) if isinstance(value, dict) else {}


def _message_from_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("graph_message_id") or str(row.get("id") or ""),
        "subject": row.get("subject") or "",
        "bodyPreview": row.get("body_text") or row.get("body") or "",
        "hasAttachments": bool(row.get("has_attachments")),
        "webLink": row.get("web_link"),
        "internetMessageId": row.get("internet_message_id"),
        "conversationId": row.get("conversation_id"),
        "receivedDateTime": row.get("received_at"),
        "internetMessageHeaders": [],
        "from": {
            "emailAddress": {
                "name": row.get("from_name") or row.get("from_email") or "",
                "address": row.get("from_email") or "",
            }
        },
    }


def _update_payload(row: dict[str, Any], classification: Any, *, applied_by: str) -> dict[str, Any]:
    metadata = _source_metadata(row)
    metadata["intake_classification"] = classification.as_metadata()
    metadata["intake_reclassified"] = {
        "at": datetime.now(timezone.utc).isoformat(),
        "by": applied_by,
    }

    payload: dict[str, Any] = {"source_metadata": metadata}
    if classification.action.value == "skip":
        payload["match_status"] = "ignored"
        payload["assignment_method"] = "intake_classification_skip_backfill"
        payload["assignment_confidence"] = classification.confidence
    elif classification.action.value == "quarantine":
        payload["assignment_method"] = "intake_classification_quarantine_backfill"
        payload["assignment_confidence"] = classification.confidence
    return payload


def _fetch_page(client: Any, *, mailbox: str | None, since: datetime, limit: int, offset: int) -> list[dict[str, Any]]:
    query = (
        client.from_("outlook_email_intake")
        .select(
            "id,graph_message_id,mailbox_user_id,subject,body,body_text,from_name,from_email,"
            "match_status,assignment_method,assignment_confidence,received_at,has_attachments,"
            "web_link,internet_message_id,conversation_id,source_metadata"
        )
        .is_("deleted_at", "null")
        .gte("received_at", since.isoformat())
        .order("received_at", desc=True)
        .range(offset, offset + limit - 1)
    )
    if mailbox:
        query = query.eq("mailbox_user_id", mailbox)
    result = query.execute()
    return list(result.data or [])


def main() -> int:
    _load_backend()

    parser = argparse.ArgumentParser(description="Reclassify stored Outlook intake rows.")
    parser.add_argument("--mailbox", help="Limit to one mailbox_user_id/email.")
    parser.add_argument("--days-back", type=int, default=0, help="0 means today in the selected time zone.")
    parser.add_argument("--time-zone", default="America/New_York")
    parser.add_argument("--limit", type=int, default=500)
    parser.add_argument("--page-size", type=int, default=100)
    parser.add_argument("--apply", action="store_true", help="Persist classifier metadata/status updates.")
    args = parser.parse_args()

    from src.services.integrations.microsoft_graph.email_classification import (
        EmailIntakeAction,
        classify_graph_email_for_intake,
    )
    from src.services.supabase_helpers import get_supabase_client

    client = get_supabase_client()
    since = _start_of_day(max(args.days_back, 0), args.time_zone)
    page_size = max(1, min(args.page_size, 500))
    max_rows = max(1, args.limit)
    offset = 0
    scanned = 0
    updated = 0
    counts: Counter[str] = Counter()
    examples: list[dict[str, Any]] = []

    while scanned < max_rows:
        rows = _fetch_page(
            client,
            mailbox=args.mailbox,
            since=since,
            limit=min(page_size, max_rows - scanned),
            offset=offset,
        )
        if not rows:
            break

        for row in rows:
            msg = _message_from_row(row)
            body_text = str(row.get("body_text") or row.get("body") or "")
            classification = classify_graph_email_for_intake(msg, body_text)
            key = f"{classification.action.value}:{classification.category}"
            counts[key] += 1

            prior_metadata = _source_metadata(row).get("intake_classification")
            prior_action = prior_metadata.get("action") if isinstance(prior_metadata, dict) else None
            should_update = prior_action != classification.action.value or classification.action != EmailIntakeAction.IMPORT

            if len(examples) < 25 and classification.action != EmailIntakeAction.IMPORT:
                examples.append(
                    {
                        "id": row.get("id"),
                        "subject": row.get("subject"),
                        "from": row.get("from_email"),
                        "receivedAt": row.get("received_at"),
                        "action": classification.action.value,
                        "category": classification.category,
                        "reason": classification.reason,
                        "signals": list(classification.signals),
                    }
                )

            if args.apply and should_update:
                payload = _update_payload(
                    row,
                    classification,
                    applied_by="backend/src/scripts/reclassify_outlook_intake.py",
                )
                client.from_("outlook_email_intake").update(payload).eq("id", row["id"]).execute()
                updated += 1

            scanned += 1

        offset += len(rows)
        if len(rows) < page_size:
            break

    print(
        json.dumps(
            {
                "status": "complete",
                "mode": "apply" if args.apply else "dry_run",
                "database": "app",
                "table": "outlook_email_intake",
                "mailbox": args.mailbox,
                "since": since.isoformat(),
                "scanned": scanned,
                "updated": updated,
                "counts": dict(sorted(counts.items())),
                "examples": examples,
            },
            indent=2,
            default=str,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
