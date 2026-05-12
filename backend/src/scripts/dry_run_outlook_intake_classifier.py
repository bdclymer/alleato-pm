#!/usr/bin/env python3
"""Bounded Outlook intake classifier scan.

This script reads recent Outlook messages without advancing delta tokens. By
default it prints classifier counts only. With --record-skips, it writes audit
rows for real Graph messages classified as hard skips, without importing them.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import quote


def _load_backend() -> None:
    backend_root = Path(__file__).resolve().parents[2]
    if str(backend_root) not in sys.path:
        sys.path.append(str(backend_root))

    from src.services.env_loader import load_env

    load_env()


def _select_fields() -> str:
    return ",".join(
        [
            "id",
            "subject",
            "from",
            "toRecipients",
            "ccRecipients",
            "receivedDateTime",
            "bodyPreview",
            "body",
            "categories",
            "importance",
            "hasAttachments",
            "webLink",
            "internetMessageId",
            "conversationId",
            "internetMessageHeaders",
        ],
    )


def _sync_users(value: str | None) -> list[str]:
    return [email.strip() for email in (value or "").split(",") if email.strip()]


def main() -> int:
    _load_backend()

    parser = argparse.ArgumentParser(
        description="Classify a bounded set of recent Outlook messages."
    )
    parser.add_argument("--users", default=os.environ.get("MICROSOFT_SYNC_USERS", ""))
    parser.add_argument("--limit", type=int, default=25)
    parser.add_argument(
        "--folders",
        default="Inbox,SentItems",
        help="Comma-separated Graph mail folder names.",
    )
    parser.add_argument(
        "--record-skips",
        action="store_true",
        help="Write audit rows for real messages classified as hard skip.",
    )
    args = parser.parse_args()

    users = _sync_users(args.users)
    if not users:
        raise SystemExit("No users supplied and MICROSOFT_SYNC_USERS is empty.")

    folders = [folder.strip() for folder in args.folders.split(",") if folder.strip()]
    limit = max(1, min(args.limit, 100))
    select = quote(_select_fields(), safe=",")

    from src.services.integrations.microsoft_graph.client import get_graph_client
    from src.services.integrations.microsoft_graph.email_classification import (
        EmailIntakeAction,
        classify_graph_email_for_intake,
    )
    from src.services.integrations.microsoft_graph.outlook import (
        _body_html,
        _extract_cid_refs,
        _extract_links,
        _format_email_as_text,
        _record_outlook_skip_audit,
    )
    from src.services.supabase_helpers import get_supabase_client

    graph = get_graph_client()
    if not graph.is_configured():
        raise SystemExit("Microsoft Graph is not configured.")

    supabase = get_supabase_client() if args.record_skips else None
    counts: Counter[str] = Counter()
    examples: list[dict] = []
    recorded = 0

    for user_email in users:
        for folder in folders:
            path = (
                f"/users/{user_email}/mailFolders/{folder}/messages"
                f"?$select={select}&$orderby=receivedDateTime desc&$top={limit}"
            )
            data = graph.get(path)
            for msg in data.get("value", []):
                body_text = _format_email_as_text(msg)
                classification = classify_graph_email_for_intake(msg, body_text)
                key = f"{classification.action.value}:{classification.category}"
                counts[key] += 1

                if len(examples) < 20 and classification.action != EmailIntakeAction.IMPORT:
                    examples.append(
                        {
                            "mailbox": user_email,
                            "folder": folder,
                            "subject": msg.get("subject"),
                            "receivedAt": msg.get("receivedDateTime"),
                            "action": classification.action.value,
                            "category": classification.category,
                            "reason": classification.reason,
                            "signals": classification.signals,
                        }
                    )

                if args.record_skips and classification.action == EmailIntakeAction.SKIP:
                    msg_id = msg.get("id")
                    if not msg_id:
                        continue
                    sender = msg.get("from", {}).get("emailAddress", {}) or {}
                    source_metadata = {
                        "outlook_message_id": msg_id,
                        "mailbox_user_id": user_email,
                        "internet_message_id": msg.get("internetMessageId"),
                        "conversation_id": msg.get("conversationId"),
                        "outlook_web_link": msg.get("webLink", ""),
                        "has_attachments": bool(msg.get("hasAttachments")),
                        "inline_content_ids": sorted(_extract_cid_refs(_body_html(msg))),
                        "links": _extract_links(msg),
                        "intake_classification": classification.as_metadata(),
                        "classifier_scan": {
                            "mode": "bounded_recent_scan",
                            "folder": folder,
                            "limit": limit,
                        },
                    }
                    _record_outlook_skip_audit(
                        supabase_client=supabase,
                        msg=msg,
                        user_email=user_email,
                        body_text=body_text,
                        sender_name=sender.get("name", user_email),
                        sender_addr=sender.get("address", ""),
                        source_metadata=source_metadata,
                    )
                    recorded += 1

    print(
        json.dumps(
            {
                "status": "complete",
                "users": users,
                "folders": folders,
                "limitPerFolder": limit,
                "recordSkips": args.record_skips,
                "recordedSkips": recorded,
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
