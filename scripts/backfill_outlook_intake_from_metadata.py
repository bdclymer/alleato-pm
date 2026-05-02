#!/usr/bin/env python3
"""Backfill Outlook intake tables from existing document_metadata email rows.

This promotes already-synced Microsoft Graph email metadata into project_emails
and stores Graph attachment bytes in email_attachments so the intake UI can
preview/download them.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import html
import mimetypes
import os
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx
import psycopg2
import psycopg2.extras


ROOT = Path(__file__).resolve().parents[1]
GRAPH_BASE = "https://graph.microsoft.com/v1.0"
TOKEN_URL = "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024
MAX_ATTACHMENTS_PER_EMAIL = 25


HEADER_RE = re.compile(r"^(Subject|Date|From|To|Cc):\s*(.*)$", re.IGNORECASE | re.MULTILINE)
EMAIL_RE = re.compile(r"(?P<name>.*?)\s*<(?P<email>[^>]+)>")


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def strip_email_html(raw_html: str) -> str:
    text = re.sub(r"(?is)<style.*?</style>|<script.*?</script>", " ", raw_html or "")
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(r"(?i)</p\s*>", "\n", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def parse_headers(content: str) -> dict[str, str]:
    headers: dict[str, str] = {}
    for key, value in HEADER_RE.findall(content or ""):
        headers[key.lower()] = html.unescape(value).strip()
    return headers


def parse_person(value: str) -> tuple[str | None, str | None]:
    match = EMAIL_RE.search(value or "")
    if match:
        name = html.unescape(match.group("name")).strip().strip('"') or None
        email = match.group("email").strip() or None
        return name, email
    if "@" in (value or ""):
        return None, value.strip()
    return value.strip() or None, None


def parse_recipient_emails(value: str | None) -> list[str] | None:
    if not value:
        return None
    emails = re.findall(r"<([^>]+@[^>]+)>", value)
    if not emails and "@" in value:
        emails = [part.strip() for part in value.split(",") if "@" in part]
    cleaned = [email.strip() for email in emails if email.strip()]
    return cleaned or None


def parse_received_at(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value.strip().replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        try:
            return datetime.fromisoformat(f"{normalized}T00:00:00+00:00")
        except ValueError:
            return None


def body_without_headers(content: str) -> str:
    text = content or ""
    split = re.split(r"\n\s*\n", text, maxsplit=1)
    if len(split) == 2 and "Subject:" in split[0]:
        return split[1].strip()
    return text.strip()


def graph_message_id(document_id: str, source_item_id: str | None) -> str:
    if source_item_id:
        return source_item_id
    if document_id.startswith("outlook_"):
        return document_id.removeprefix("outlook_")
    return document_id


def is_decorative_inline_attachment(name: str, content_type: str, is_inline: bool) -> bool:
    if not is_inline or not content_type.startswith("image/"):
        return False
    normalized = (name or "").strip().lower()
    return bool(
        re.match(r"image\d+\.(png|jpe?g|gif)$", normalized)
        or normalized.startswith("outlook-")
        or normalized.startswith("inky-injection-inliner-")
    )


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

    def get(self, path: str, params: dict[str, str] | None = None) -> dict[str, Any]:
        url = path if path.startswith("https://") else f"{GRAPH_BASE}{path}"
        response = httpx.get(
            url,
            headers={"Authorization": f"Bearer {self.token()}"},
            params=params,
            timeout=90,
        )
        response.raise_for_status()
        return response.json()

    def get_all_pages(self, path: str, params: dict[str, str] | None = None) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        url: str | None = path if path.startswith("https://") else f"{GRAPH_BASE}{path}"
        first = True
        while url:
            page = self.get(url, params if first else None)
            rows.extend(page.get("value", []))
            url = page.get("@odata.nextLink")
            first = False
        return rows


@dataclass
class LocatedMessage:
    mailbox: str
    message: dict[str, Any]


def locate_message(graph: GraphClient, mailboxes: list[str], message_id: str) -> LocatedMessage | None:
    select_fields = ",".join(
        [
            "id",
            "subject",
            "from",
            "toRecipients",
            "ccRecipients",
            "receivedDateTime",
            "bodyPreview",
            "body",
            "hasAttachments",
            "webLink",
            "conversationId",
        ]
    )
    for mailbox in mailboxes:
        try:
            message = graph.get(
                f"/users/{mailbox}/messages/{message_id}",
                params={"$select": select_fields},
            )
            return LocatedMessage(mailbox=mailbox, message=message)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code in {400, 403, 404}:
                continue
            raise
    return None


def graph_recipients(message: dict[str, Any], key: str) -> list[str] | None:
    recipients = []
    for row in message.get(key, []) or []:
        address = (row.get("emailAddress") or {}).get("address")
        if address:
            recipients.append(address)
    return recipients or None


def graph_body_text(message: dict[str, Any], fallback: str) -> str:
    body = message.get("body") or {}
    content = str(body.get("content") or "")
    if content:
        return strip_email_html(content)
    return fallback


def upsert_project_email(
    cursor: psycopg2.extensions.cursor,
    *,
    project_id: int,
    doc: dict[str, Any],
    message_id: str,
    mailbox: str | None,
    message: dict[str, Any] | None,
) -> int:
    content = doc.get("content") or ""
    headers = parse_headers(content)
    fallback_subject = (doc.get("title") or "").removeprefix("Email: ").strip() or "(no subject)"
    fallback_from_name, fallback_from_email = parse_person(headers.get("from", ""))

    if message:
        sender = ((message.get("from") or {}).get("emailAddress") or {})
        subject = message.get("subject") or fallback_subject
        body_text = graph_body_text(message, body_without_headers(content))
        from_name = sender.get("name") or fallback_from_name
        from_email = sender.get("address") or fallback_from_email
        to_list = graph_recipients(message, "toRecipients") or parse_recipient_emails(headers.get("to"))
        cc_list = graph_recipients(message, "ccRecipients") or parse_recipient_emails(headers.get("cc"))
        received_at = parse_received_at(message.get("receivedDateTime")) or parse_received_at(headers.get("date"))
        conversation_id = message.get("conversationId")
        has_attachments = bool(message.get("hasAttachments"))
    else:
        subject = headers.get("subject") or fallback_subject
        body_text = body_without_headers(content)
        from_name = fallback_from_name
        from_email = fallback_from_email
        to_list = parse_recipient_emails(headers.get("to"))
        cc_list = parse_recipient_emails(headers.get("cc"))
        received_at = parse_received_at(headers.get("date")) or doc.get("date")
        conversation_id = None
        has_attachments = False

    created_at = doc.get("created_at") or datetime.now(timezone.utc)
    received_at = received_at or doc.get("date") or created_at

    cursor.execute(
        """
        insert into project_emails (
          project_id,
          subject,
          body,
          body_text,
          from_name,
          from_email,
          to_list,
          cc_list,
          status,
          received_at,
          has_attachments,
          graph_message_id,
          mailbox_user_id,
          conversation_id,
          created_at,
          updated_at
        )
        values (
          %(project_id)s,
          %(subject)s,
          %(body)s,
          %(body)s,
          %(from_name)s,
          %(from_email)s,
          %(to_list)s,
          %(cc_list)s,
          'Received',
          %(received_at)s,
          %(has_attachments)s,
          %(graph_message_id)s,
          %(mailbox_user_id)s,
          %(conversation_id)s,
          %(created_at)s,
          now()
        )
        on conflict (graph_message_id) where graph_message_id is not null
        do update set
          project_id = excluded.project_id,
          subject = excluded.subject,
          body = excluded.body,
          body_text = excluded.body_text,
          from_name = excluded.from_name,
          from_email = excluded.from_email,
          to_list = excluded.to_list,
          cc_list = excluded.cc_list,
          status = excluded.status,
          received_at = excluded.received_at,
          has_attachments = project_emails.has_attachments or excluded.has_attachments,
          mailbox_user_id = coalesce(excluded.mailbox_user_id, project_emails.mailbox_user_id),
          conversation_id = coalesce(excluded.conversation_id, project_emails.conversation_id),
          deleted_at = null,
          updated_at = now()
        returning id
        """,
        {
            "project_id": project_id,
            "subject": subject[:500],
            "body": body_text[:8000],
            "from_name": from_name,
            "from_email": from_email,
            "to_list": to_list,
            "cc_list": cc_list,
            "received_at": received_at,
            "has_attachments": has_attachments,
            "graph_message_id": message_id,
            "mailbox_user_id": mailbox,
            "conversation_id": conversation_id,
            "created_at": created_at,
        },
    )
    return int(cursor.fetchone()["id"])


def fetch_attachment_detail(graph: GraphClient, mailbox: str, message_id: str, attachment_id: str) -> dict[str, Any]:
    return graph.get(
        f"/users/{mailbox}/messages/{message_id}/attachments/{attachment_id}/microsoft.graph.fileAttachment",
        params={"$select": "id,name,contentType,size,isInline,contentBytes"},
    )


def attachment_bytes(graph: GraphClient, mailbox: str, message_id: str, attachment: dict[str, Any]) -> bytes | None:
    content_bytes = attachment.get("contentBytes")
    if not content_bytes and attachment.get("id"):
        detail = fetch_attachment_detail(graph, mailbox, message_id, str(attachment["id"]))
        attachment.update(detail)
        content_bytes = attachment.get("contentBytes")
    if not content_bytes:
        return None
    return base64.b64decode(content_bytes)


def upsert_attachment(
    cursor: psycopg2.extensions.cursor,
    *,
    graph: GraphClient,
    mailbox: str,
    message_id: str,
    email_id: int,
    project_sync_id: str | None,
    attachment: dict[str, Any],
) -> bool:
    attachment_id = str(attachment.get("id") or "")
    if not attachment_id:
        return False

    file_name = str(attachment.get("name") or "attachment")
    content_type = str(attachment.get("contentType") or mimetypes.guess_type(file_name)[0] or "application/octet-stream")
    is_inline = bool(attachment.get("isInline"))
    if is_decorative_inline_attachment(file_name, content_type, is_inline):
        return False

    size = int(attachment.get("size") or 0)
    if size > MAX_ATTACHMENT_BYTES:
        raise RuntimeError(f"{file_name} exceeds {MAX_ATTACHMENT_BYTES} bytes")

    raw_bytes = attachment_bytes(graph, mailbox, message_id, attachment)
    if not raw_bytes:
        return False

    checksum = hashlib.sha256(raw_bytes).hexdigest()
    cursor.execute(
        """
        insert into email_attachments (
          email_id,
          file_name,
          file_url,
          file_size,
          content_type,
          graph_attachment_id,
          checksum_sha256,
          content,
          project_sync_id,
          created_at
        )
        values (
          %(email_id)s,
          %(file_name)s,
          %(file_url)s,
          %(file_size)s,
          %(content_type)s,
          %(graph_attachment_id)s,
          %(checksum_sha256)s,
          %(content)s,
          %(project_sync_id)s,
          now()
        )
        on conflict (email_id, graph_attachment_id) where graph_attachment_id is not null
        do update set
          file_name = excluded.file_name,
          file_url = excluded.file_url,
          file_size = excluded.file_size,
          content_type = excluded.content_type,
          checksum_sha256 = excluded.checksum_sha256,
          content = excluded.content,
          project_sync_id = coalesce(excluded.project_sync_id, email_attachments.project_sync_id)
        """,
        {
            "email_id": email_id,
            "file_name": file_name,
            "file_url": f"graph://messages/{message_id}/attachments/{attachment_id}",
            "file_size": len(raw_bytes),
            "content_type": content_type,
            "graph_attachment_id": attachment_id,
            "checksum_sha256": checksum,
            "content": psycopg2.Binary(raw_bytes),
            "project_sync_id": project_sync_id,
        },
    )
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-id", type=int, required=True)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--no-attachments", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    load_env(ROOT / ".env")
    args = parse_args()
    mailboxes = [
        mailbox.strip()
        for mailbox in os.environ.get("MICROSOFT_SYNC_USERS", "").split(",")
        if mailbox.strip()
    ]
    if not mailboxes:
        raise RuntimeError("MICROSOFT_SYNC_USERS must include at least one mailbox")

    graph = GraphClient()
    database_url = require_env("DATABASE_URL")
    conn = psycopg2.connect(database_url)
    conn.autocommit = False

    promoted = 0
    located = 0
    attachments_written = 0
    attachment_errors: list[str] = []
    missing_messages: list[str] = []

    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            cursor.execute(
                """
                select
                  id,
                  title,
                  content,
                  date,
                  created_at,
                  source_item_id
                from document_metadata
                where project_id = %s
                  and source = 'microsoft_graph'
                  and type = 'email'
                order by date desc nulls last, created_at desc nulls last
                limit %s
                """,
                (args.project_id, args.limit),
            )
            docs = list(cursor.fetchall())

            for doc in docs:
                message_id = graph_message_id(str(doc["id"]), doc.get("source_item_id"))
                located_message = locate_message(graph, mailboxes, message_id)
                if located_message:
                    located += 1
                    mailbox = located_message.mailbox
                    message = located_message.message
                else:
                    mailbox = None
                    message = None
                    missing_messages.append(message_id)

                email_id = upsert_project_email(
                    cursor,
                    project_id=args.project_id,
                    doc=doc,
                    message_id=message_id,
                    mailbox=mailbox,
                    message=message,
                )
                promoted += 1

                if args.no_attachments or not located_message:
                    continue

                if not message or not message.get("hasAttachments"):
                    continue

                try:
                    attachments = graph.get_all_pages(
                        f"/users/{mailbox}/messages/{message_id}/attachments",
                        params={"$top": str(MAX_ATTACHMENTS_PER_EMAIL)},
                    )[:MAX_ATTACHMENTS_PER_EMAIL]
                    for attachment in attachments:
                        if upsert_attachment(
                            cursor,
                            graph=graph,
                            mailbox=mailbox,
                            message_id=message_id,
                            email_id=email_id,
                            project_sync_id=None,
                            attachment=attachment,
                        ):
                            attachments_written += 1
                except Exception as exc:
                    attachment_errors.append(f"{message_id}: {exc}")

        if args.dry_run:
            conn.rollback()
        else:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    print(
        {
            "project_id": args.project_id,
            "metadata_rows_seen": promoted,
            "graph_messages_located": located,
            "attachments_written": attachments_written,
            "missing_messages": len(missing_messages),
            "attachment_errors": attachment_errors[:10],
            "dry_run": args.dry_run,
        }
    )
    if missing_messages:
        print("missing_message_ids_sample=", missing_messages[:10], file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
