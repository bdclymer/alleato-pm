"""
Outlook Email Ingestion
Fetches emails from Microsoft Graph API and ingests them into the RAG pipeline.

Filtering strategy:
- Only emails with at least one external recipient (non-company domain)
  OR emails that mention any active project name in subject/body preview
- Skips calendar invites, newsletters, and automated notifications
- Uses delta queries for incremental sync
"""
import os
import re
import logging
from datetime import datetime, timezone
from typing import Optional

from .client import get_graph_client

logger = logging.getLogger(__name__)

COMPANY_DOMAINS = [d.strip() for d in os.environ.get("COMPANY_EMAIL_DOMAINS", "alleatogroup.com").split(",")]
MIN_BODY_CHARS = 50  # Skip very short emails (auto-replies, etc.)


def _is_relevant_email(msg: dict, project_keywords: list[str]) -> bool:
    """Return True if this email is worth indexing."""
    subject = (msg.get("subject") or "").lower()
    preview = (msg.get("bodyPreview") or "").lower()

    # Skip calendar items
    if msg.get("categories") and any("calendar" in c.lower() for c in msg["categories"]):
        return False

    # Skip automated/noreply
    sender_addr = msg.get("from", {}).get("emailAddress", {}).get("address", "")
    if any(skip in sender_addr.lower() for skip in ["noreply", "no-reply", "donotreply", "notifications@", "alerts@"]):
        return False

    # Keep if any project keyword appears in subject or preview
    combined = subject + " " + preview
    if any(kw.lower() in combined for kw in project_keywords):
        return True

    # Keep if has external recipients (communications with owners/subs)
    recipients = msg.get("toRecipients", []) + msg.get("ccRecipients", [])
    for r in recipients:
        addr = r.get("emailAddress", {}).get("address", "")
        domain = addr.split("@")[-1].lower() if "@" in addr else ""
        if domain and domain not in COMPANY_DOMAINS:
            return True

    return False


def _format_email_as_text(msg: dict) -> str:
    """Convert a Graph API message object to plain text for embedding."""
    date_str = msg.get("receivedDateTime", "")
    subject = msg.get("subject", "(no subject)")
    sender = msg.get("from", {}).get("emailAddress", {})
    sender_str = f"{sender.get('name', '')} <{sender.get('address', '')}>"

    to_addrs = [
        f"{r['emailAddress'].get('name', '')} <{r['emailAddress'].get('address', '')}>"
        for r in msg.get("toRecipients", [])
        if r.get("emailAddress")
    ]

    body = msg.get("bodyPreview", "")
    # bodyPreview is 255 chars max — if we have full body, use it
    if msg.get("body", {}).get("content"):
        raw_html = msg["body"]["content"]
        body = re.sub(r'<[^>]+>', ' ', raw_html)
        body = re.sub(r'\s+', ' ', body).strip()
        body = body[:8000]  # Cap for embedding

    return f"""Subject: {subject}
Date: {date_str}
From: {sender_str}
To: {", ".join(to_addrs)}

{body}"""


def sync_outlook_emails(
    supabase_client,
    user_email: str,
    project_keywords: list[str],
    delta_token: Optional[str] = None,
    since_date: Optional[str] = None,
) -> tuple[int, str]:
    """
    Sync emails for a user. Returns (count_synced, new_delta_token).

    Args:
        supabase_client: Supabase service client
        user_email: The user's email address (e.g. "brandon@alleatogroup.com")
        project_keywords: List of project names/keywords to filter emails by
        delta_token: Previous delta token (None for initial full sync)
        since_date: ISO date string (e.g. "2024-01-01") — only applied on initial full sync
    """
    graph = get_graph_client()
    if not graph.is_configured():
        logger.warning("[Outlook] Microsoft Graph not configured — skipping")
        return 0, delta_token or ""

    user_id = user_email  # Graph accepts email as user identifier

    # Delta query for Inbox/SentItems messages
    # Note: /users/{id}/messages/delta is NOT supported in v1.0 — must use folder-specific delta
    select_fields = "id,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,body,categories,importance,hasAttachments"
    date_filter = f"&$filter=receivedDateTime ge {since_date}T00:00:00Z" if since_date else ""
    folders = [
        ("Inbox", f"/users/{user_id}/mailFolders/Inbox/messages/delta?$select={select_fields}&$top=50{date_filter}"),
        ("SentItems", f"/users/{user_id}/mailFolders/SentItems/messages/delta?$select={select_fields}&$top=50{date_filter}"),
    ]

    # Split delta_token by folder if stored as "inbox:<token>|sent:<token>"
    inbox_token: Optional[str] = None
    sent_token: Optional[str] = None
    if delta_token:
        if delta_token.startswith("inbox:") or "|sent:" in delta_token:
            for part in delta_token.split("|"):
                if part.startswith("inbox:"):
                    inbox_token = part[6:]
                elif part.startswith("sent:"):
                    sent_token = part[5:]
        else:
            # Legacy single token — treat as inbox
            inbox_token = delta_token

    items = []
    new_inbox_token = inbox_token or ""
    new_sent_token = sent_token or ""

    for folder_name, base_path in folders:
        folder_token = inbox_token if folder_name == "Inbox" else sent_token
        folder_base = base_path if not folder_token else folder_token
        try:
            folder_items, folder_delta = graph.get_delta(folder_base, None)
            items.extend(folder_items)
            if folder_name == "Inbox":
                new_inbox_token = folder_delta
            else:
                new_sent_token = folder_delta
            logger.info(f"[Outlook] {folder_name}: fetched {len(folder_items)} items for {user_email}")
        except Exception as e:
            logger.error(f"[Outlook] {folder_name} delta failed for {user_email}: {e}")

    new_delta_token = f"inbox:{new_inbox_token}|sent:{new_sent_token}" if (new_inbox_token or new_sent_token) else ""

    synced = 0
    for msg in items:
        # Skip deleted items (delta returns removed items with @removed)
        if "@removed" in msg:
            continue

        if not _is_relevant_email(msg, project_keywords):
            continue

        body_text = _format_email_as_text(msg)
        if len(body_text) < MIN_BODY_CHARS:
            continue

        # Build document_metadata row
        msg_id = msg.get("id", "")
        subject = msg.get("subject", "(no subject)")
        received = msg.get("receivedDateTime", datetime.now(timezone.utc).isoformat())
        sender_name = msg.get("from", {}).get("emailAddress", {}).get("name", user_email)

        doc_id = f"outlook_{msg_id}"

        # Check if already ingested
        existing = supabase_client.from_("document_metadata").select("id").eq("id", doc_id).execute()
        if existing.data:
            continue

        # Upload content to Supabase Storage
        storage_path = f"outlook/{user_email}/{msg_id}.txt"
        try:
            supabase_client.storage.from_("documents").upload(
                storage_path,
                body_text.encode("utf-8"),
                {"content-type": "text/plain", "upsert": "true"},
            )
        except Exception as e:
            logger.warning(f"[Outlook] Storage upload failed for {msg_id}: {e}")
            continue

        # Insert document_metadata — DB trigger fires the full pipeline
        try:
            supabase_client.from_("document_metadata").insert({
                "id": doc_id,
                "title": f"Email: {subject}",
                "source": "microsoft_graph",
                "category": "email",
                "type": "email",
                "content": body_text,
                "date": received[:10] if received else None,
                "participants": [sender_name],
                "status": "raw_ingested",
                "tags": ["email", "outlook"],
            }).execute()
            synced += 1
        except Exception as e:
            logger.warning(f"[Outlook] Failed to insert metadata for {msg_id}: {e}")

    logger.info(f"[Outlook] Synced {synced} emails for {user_email}")
    return synced, new_delta_token
