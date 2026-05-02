#!/usr/bin/env python3
"""Backfill missing mailbox/source linkage on Outlook document_metadata rows."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Any

import httpx
from supabase import create_client


ROOT = Path(__file__).resolve().parents[1]
GRAPH_BASE = "https://graph.microsoft.com/v1.0"
TOKEN_URL = "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
DOCUMENT_BUCKET = "documents"


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


class GraphClient:
    def __init__(self) -> None:
        self.client_id = require_env("MICROSOFT_CLIENT_ID")
        self.client_secret = require_env("MICROSOFT_CLIENT_SECRET")
        self.tenant_id = require_env("MICROSOFT_TENANT_ID")
        self._token: str | None = None

    def token(self) -> str:
        if self._token:
            return self._token
        response = httpx.post(
            TOKEN_URL.format(tenant_id=self.tenant_id),
            data={
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "scope": "https://graph.microsoft.com/.default",
            },
            timeout=30,
        )
        response.raise_for_status()
        self._token = response.json()["access_token"]
        return self._token

    def get_message(self, mailbox: str, message_id: str) -> dict[str, Any] | None:
        response = httpx.get(
            f"{GRAPH_BASE}/users/{mailbox}/messages/{message_id}",
            headers={"Authorization": f"Bearer {self.token()}"},
            params={
                "$select": ",".join(
                    [
                        "id",
                        "conversationId",
                        "internetMessageId",
                        "webLink",
                        "hasAttachments",
                    ]
                )
            },
            timeout=30,
        )
        if response.status_code in {400, 403, 404}:
            return None
        response.raise_for_status()
        return response.json()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=500)
    parser.add_argument("--mailbox", type=str, default=None)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    load_env(ROOT / ".env")
    args = parse_args()

    supabase = create_client(require_env("SUPABASE_URL"), require_env("SUPABASE_SERVICE_ROLE_KEY"))
    graph = GraphClient()

    mailboxes = [
        mailbox.strip()
        for mailbox in require_env("MICROSOFT_SYNC_USERS").split(",")
        if mailbox.strip()
    ]
    if args.mailbox:
        mailboxes = [mailbox for mailbox in mailboxes if mailbox == args.mailbox]
    if not mailboxes:
        raise RuntimeError("No mailboxes available for backfill")

    query = (
        supabase.table("document_metadata")
        .select("id, title, source_item_id, source_path, file_path, storage_bucket, source_metadata")
        .eq("source", "microsoft_graph")
        .like("id", "outlook_%")
        .or_("source_item_id.is.null,source_path.is.null,file_path.is.null")
        .order("created_at", desc=False)
        .limit(args.limit)
    )
    rows = query.execute().data or []

    updated = 0
    missing = 0
    family_mailbox_cache: dict[str, str] = {}
    for row in rows:
        message_id = row.get("source_item_id") or str(row["id"]).removeprefix("outlook_")
        family_key = message_id[:96]
        located_mailbox = None
        message = None

        candidate_mailboxes = []
        cached_mailbox = family_mailbox_cache.get(family_key)
        if cached_mailbox:
            candidate_mailboxes.append(cached_mailbox)
        candidate_mailboxes.extend(mailbox for mailbox in mailboxes if mailbox != cached_mailbox)

        for mailbox in candidate_mailboxes:
            message = graph.get_message(mailbox, message_id)
            if message:
                located_mailbox = mailbox
                family_mailbox_cache[family_key] = mailbox
                break
        if not located_mailbox or not message:
            missing += 1
            continue

        source_path = f"outlook/{located_mailbox}/{message_id}.txt"
        source_metadata = {
            **(row.get("source_metadata") or {}),
            "outlook_message_id": message_id,
            "mailbox_user_id": located_mailbox,
            "conversation_id": message.get("conversationId"),
            "internet_message_id": message.get("internetMessageId"),
            "outlook_web_link": message.get("webLink"),
            "has_attachments": bool(message.get("hasAttachments")),
        }
        payload = {
            "source_system": "outlook_email",
            "source_item_id": message_id,
            "source_path": source_path,
            "file_path": row.get("file_path") or source_path,
            "storage_bucket": row.get("storage_bucket") or DOCUMENT_BUCKET,
            "source_web_url": message.get("webLink"),
            "source_metadata": source_metadata,
        }

        if not args.dry_run:
            supabase.table("document_metadata").update(payload).eq("id", row["id"]).execute()
        updated += 1

    print({"scanned": len(rows), "updated": updated, "missing": missing, "dry_run": args.dry_run})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
