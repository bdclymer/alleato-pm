"""
Outlook Email Ingestion
Fetches emails from Microsoft Graph API and ingests them into the RAG pipeline.

Filtering strategy:
- Only emails with at least one external recipient (non-company domain)
  OR emails that mention any active project name in subject/body preview
- Skips calendar invites, newsletters, and automated notifications
- Uses delta queries for incremental sync
"""
import base64
import hashlib
import html
import mimetypes
import os
import re
import logging
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse

from .client import get_graph_client
from .onedrive import SUPPORTED_EXTENSIONS, _extract_text
from .project_inference import infer_project_id

logger = logging.getLogger(__name__)

COMPANY_DOMAINS = [d.strip() for d in os.environ.get("COMPANY_EMAIL_DOMAINS", "alleatogroup.com").split(",")]
MIN_BODY_CHARS = 50  # Skip very short emails (auto-replies, etc.)
EMAIL_BODY_MAX_CHARS = 8000
MAX_ATTACHMENT_BYTES = int(os.environ.get("OUTLOOK_ATTACHMENT_MAX_BYTES", str(50 * 1024 * 1024)))
MAX_ATTACHMENTS_PER_EMAIL = int(os.environ.get("OUTLOOK_MAX_ATTACHMENTS_PER_EMAIL", "25"))
MAX_LINKS_PER_EMAIL = int(os.environ.get("OUTLOOK_MAX_LINKS_PER_EMAIL", "25"))
DOCUMENT_BUCKET = os.environ.get("SUPABASE_DOCUMENTS_BUCKET", "documents")

URL_RE = re.compile(r"https?://[^\s<>\"]+", re.IGNORECASE)
HREF_RE = re.compile(r"(?is)<a\b[^>]*\bhref=[\"']([^\"']+)[\"'][^>]*>(.*?)</a>")
CID_RE = re.compile(r"(?i)\bcid:([^\"'>\s)]+)")


def _strip_email_html(raw_html: str) -> str:
    text = re.sub(r"(?is)<blockquote.*?</blockquote>", " ", raw_html)
    text = re.sub(r"(?is)<style.*?</style>|<script.*?</script>", " ", text)
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(r"(?i)</p\s*>", "\n", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def _stable_graph_id(value: str, length: int = 24) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:length]


def _storage_safe_name(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", name or "attachment").strip("._")
    return cleaned[:180] or "attachment"


def _storage_public_url(supabase_client, bucket: str, path: str) -> str:
    try:
        return supabase_client.storage.from_(bucket).get_public_url(path)
    except Exception:
        return path


def _body_html(msg: dict) -> str:
    body = msg.get("body") or {}
    return str(body.get("content") or "")


def _extract_cid_refs(raw_html: str) -> set[str]:
    return {match.strip("<>").lower() for match in CID_RE.findall(raw_html or "") if match}


def _clean_url(raw_url: str) -> str:
    url = html.unescape((raw_url or "").strip())
    return url.rstrip(").,;]")


def _is_useful_link(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme.lower() not in ("http", "https"):
        return False
    host = parsed.netloc.lower()
    if not host or host.endswith("aka.ms"):
        return False
    return True


def _extract_links(msg: dict) -> list[dict]:
    raw_html = _body_html(msg)
    links: list[dict] = []
    seen: set[str] = set()

    for href, label_html in HREF_RE.findall(raw_html):
        url = _clean_url(href)
        if not _is_useful_link(url) or url in seen:
            continue
        label = _strip_email_html(label_html)[:200] if label_html else ""
        links.append({"url": url, "label": label or urlparse(url).netloc})
        seen.add(url)

    text_sources = [raw_html, str(msg.get("bodyPreview") or "")]
    for source in text_sources:
        for match in URL_RE.findall(source or ""):
            url = _clean_url(match)
            if not _is_useful_link(url) or url in seen:
                continue
            links.append({"url": url, "label": urlparse(url).netloc})
            seen.add(url)

    return links[:MAX_LINKS_PER_EMAIL]


def _strip_quoted_email_history(text: str) -> str:
    quote_markers = [
        r"(?im)^On .+ wrote:\s*$",
        r"(?im)^From:\s+.+$",
        r"(?im)^Sent:\s+.+$",
        r"(?im)^-----Original Message-----\s*$",
        r"(?im)^_{5,}\s*$",
    ]
    cutoff = len(text)
    for pattern in quote_markers:
        match = re.search(pattern, text)
        if match:
            cutoff = min(cutoff, match.start())

    text = text[:cutoff]
    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip() and not line.lstrip().startswith(">")
    ]
    return re.sub(r"\s+", " ", " ".join(lines)).strip()


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
        body = _strip_quoted_email_history(_strip_email_html(raw_html))
        body = body[:EMAIL_BODY_MAX_CHARS]  # Cap for embedding

    return f"""Subject: {subject}
Date: {date_str}
From: {sender_str}
To: {", ".join(to_addrs)}

{body}"""


def _message_participants(msg: dict, sender_name: str, sender_addr: str) -> list[str]:
    participants = [f"{sender_name} <{sender_addr}>"] if sender_addr else [sender_name]
    for recipient in msg.get("toRecipients", []) + msg.get("ccRecipients", []):
        email_address = recipient.get("emailAddress", {}) or {}
        name = email_address.get("name", "")
        address = email_address.get("address", "")
        if address:
            participants.append(f"{name} <{address}>".strip())
    return participants


def _attachment_doc_id(message_id: str, attachment_id: str) -> str:
    return f"outlook_attachment_{_stable_graph_id(message_id)}_{_stable_graph_id(attachment_id)}"


def _link_doc_id(message_id: str, url: str) -> str:
    return f"outlook_link_{_stable_graph_id(message_id)}_{_stable_graph_id(url)}"


def _list_message_attachments(graph, user_id: str, msg: dict, cid_refs: set[str]) -> list[dict]:
    if not msg.get("hasAttachments") and not cid_refs:
        return []

    msg_id = msg.get("id", "")
    if not msg_id:
        return []

    try:
        attachments = graph.get_all_pages(
            f"/users/{user_id}/messages/{msg_id}/attachments",
            params={"$top": str(MAX_ATTACHMENTS_PER_EMAIL)},
        )
        return attachments[:MAX_ATTACHMENTS_PER_EMAIL]
    except Exception as exc:
        logger.warning("[Outlook] Failed to list attachments for %s: %s", msg_id, exc)
        raise


def _extract_attachment_bytes(attachment: dict) -> Optional[bytes]:
    content_bytes = attachment.get("contentBytes")
    if not content_bytes:
        return None
    try:
        return base64.b64decode(content_bytes)
    except Exception as exc:
        raise ValueError(f"Attachment contentBytes could not be decoded: {exc}") from exc


def _attachment_metadata_text(
    *,
    subject: str,
    sender_name: str,
    sender_addr: str,
    attachment_name: str,
    attachment: dict,
    email_doc_id: str,
    email_web_link: str,
) -> str:
    lines = [
        f"Email attachment: {attachment_name}",
        f"Email subject: {subject}",
        f"From: {sender_name} <{sender_addr}>",
        f"Source email document: {email_doc_id}",
    ]
    if email_web_link:
        lines.append(f"Outlook link: {email_web_link}")
    lines.extend(
        [
            f"Content type: {attachment.get('contentType') or 'unknown'}",
            f"Attachment id: {attachment.get('id') or ''}",
        ]
    )
    return "\n".join(lines)


def _sync_email_attachment(
    *,
    supabase_client,
    attachment: dict,
    user_email: str,
    msg_id: str,
    email_doc_id: str,
    subject: str,
    received: str,
    sender_name: str,
    sender_addr: str,
    participants: list[str],
    project_id: Optional[int],
    assignment_method: str,
    email_web_link: str,
) -> bool:
    attachment_type = str(attachment.get("@odata.type") or attachment.get("odata.type") or "")
    attachment_id = str(attachment.get("id") or "")
    attachment_name = str(attachment.get("name") or "attachment")
    content_type = str(attachment.get("contentType") or mimetypes.guess_type(attachment_name)[0] or "application/octet-stream")
    is_inline = bool(attachment.get("isInline"))
    size = int(attachment.get("size") or 0)

    if not attachment_id:
        logger.warning("[Outlook] Attachment without id on %s was skipped", msg_id)
        return False
    if size > MAX_ATTACHMENT_BYTES:
        raise ValueError(f"Attachment {attachment_name} exceeds OUTLOOK_ATTACHMENT_MAX_BYTES ({size} bytes)")

    doc_id = _attachment_doc_id(msg_id, attachment_id)
    existing = (
        supabase_client.from_("document_metadata")
        .select("id, url, storage_bucket, storage_path, content_hash, source_size, source_metadata")
        .eq("id", doc_id)
        .limit(1)
        .execute()
    )
    existing_rows = existing.data or []
    if existing_rows:
        existing_doc = existing_rows[0]
        if project_id and existing_doc.get("url"):
            _upsert_project_document_by_source(supabase_client, {
                "project_id": project_id,
                "folder": "Email Attachments",
                "title": attachment_name,
                "description": f"Attachment from Outlook email: {subject}",
                "file_name": attachment_name,
                "file_url": existing_doc["url"],
                "file_size": existing_doc.get("source_size") or size,
                "content_type": content_type,
                "status": "Published",
                "category": "Email Attachment",
                "uploaded_by": sender_addr or user_email,
                "created_by": "microsoft_graph",
                "source_system": "outlook_attachment",
                "source_item_id": doc_id,
                "source_path": f"outlook/{user_email}/{msg_id}/{attachment_name}",
                "source_web_url": email_web_link,
                "source_size": existing_doc.get("source_size") or size,
                "sync_status": "synced",
                "last_synced_at": datetime.now(timezone.utc).isoformat(),
                "storage_bucket": existing_doc.get("storage_bucket"),
                "storage_path": existing_doc.get("storage_path"),
                "content_hash": existing_doc.get("content_hash"),
                "source_metadata": existing_doc.get("source_metadata") or {},
            })
        return False

    raw_bytes = None
    storage_path = None
    public_url = email_web_link
    content_hash = None
    extracted_text = ""
    _, ext = os.path.splitext(attachment_name)
    ext = ext.lower()

    if "fileAttachment" in attachment_type:
        raw_bytes = _extract_attachment_bytes(attachment)
        if raw_bytes is None:
            raise ValueError(f"Attachment {attachment_name} did not include contentBytes")
        content_hash = hashlib.sha256(raw_bytes).hexdigest()
        storage_path = (
            f"outlook/{_storage_safe_name(user_email)}/{_stable_graph_id(msg_id)}/"
            f"{_stable_graph_id(attachment_id, 12)}-{_storage_safe_name(attachment_name)}"
        )
        supabase_client.storage.from_(DOCUMENT_BUCKET).upload(
            storage_path,
            raw_bytes,
            {"content-type": content_type, "upsert": "true"},
        )
        public_url = _storage_public_url(supabase_client, DOCUMENT_BUCKET, storage_path)
        if ext in SUPPORTED_EXTENSIONS:
            extracted_text = _extract_text(raw_bytes, ext).replace("\x00", "").strip()

    source_metadata = {
        "email_document_metadata_id": email_doc_id,
        "outlook_message_id": msg_id,
        "outlook_attachment_id": attachment_id,
        "outlook_attachment_type": attachment_type,
        "outlook_is_inline": is_inline,
        "outlook_web_link": email_web_link,
        "sender_email": sender_addr,
    }
    metadata_text = _attachment_metadata_text(
        subject=subject,
        sender_name=sender_name,
        sender_addr=sender_addr,
        attachment_name=attachment_name,
        attachment=attachment,
        email_doc_id=email_doc_id,
        email_web_link=email_web_link,
    )
    content = (extracted_text or metadata_text)[:50000]
    category = "image" if content_type.startswith("image/") else "document"
    tags = [
        "outlook_attachment",
        "inline" if is_inline else "attached_file",
        ext.lstrip(".") if ext else "no_extension",
        f"project_auto:{assignment_method}" if project_id else "unassigned",
    ]

    supabase_client.from_("document_metadata").insert({
        "id": doc_id,
        "title": attachment_name,
        "source": "microsoft_graph",
        "category": category,
        "type": "email_attachment",
        "content": content,
        "raw_text": extracted_text[:50000] if extracted_text else None,
        "date": received[:10] if received else None,
        "url": public_url,
        "participants": ", ".join(participants[:50]),
        "status": "raw_ingested" if extracted_text else "metadata_only",
        "tags": ",".join(tags),
        "project_id": project_id,
        "source_system": "outlook_attachment",
        "source_item_id": doc_id,
        "source_path": f"outlook/{user_email}/{msg_id}/{attachment_name}",
        "source_web_url": email_web_link,
        "source_size": size,
        "storage_bucket": DOCUMENT_BUCKET if storage_path else None,
        "storage_path": storage_path,
        "content_hash": content_hash,
        "source_metadata": source_metadata,
    }).execute()

    if project_id and public_url:
        _upsert_project_document_by_source(supabase_client, {
            "project_id": project_id,
            "folder": "Email Attachments",
            "title": attachment_name,
            "description": f"Attachment from Outlook email: {subject}",
            "file_name": attachment_name,
            "file_url": public_url,
            "file_size": size,
            "content_type": content_type,
            "status": "Published",
            "category": "Email Attachment",
            "uploaded_by": sender_addr or user_email,
            "created_by": "microsoft_graph",
            "source_system": "outlook_attachment",
            "source_item_id": doc_id,
            "source_path": f"outlook/{user_email}/{msg_id}/{attachment_name}",
            "source_web_url": email_web_link,
            "source_size": size,
            "sync_status": "synced",
            "last_synced_at": datetime.now(timezone.utc).isoformat(),
            "storage_bucket": DOCUMENT_BUCKET if storage_path else None,
            "storage_path": storage_path,
            "content_hash": content_hash,
            "source_metadata": source_metadata,
        })

    return True


def _upsert_project_document_by_source(supabase_client, payload: dict) -> None:
    """Upsert project_documents without relying on the partial source-item index."""
    project_id = payload.get("project_id")
    source_system = payload.get("source_system")
    source_item_id = payload.get("source_item_id")
    if not project_id or not source_system or not source_item_id:
        raise ValueError("project_id, source_system, and source_item_id are required for source-backed documents")

    existing = (
        supabase_client.from_("project_documents")
        .select("id")
        .eq("project_id", project_id)
        .eq("source_system", source_system)
        .eq("source_item_id", source_item_id)
        .is_("deleted_at", "null")
        .limit(1)
        .execute()
    )
    rows = existing.data or []
    if rows:
        supabase_client.from_("project_documents").update(payload).eq("id", rows[0]["id"]).execute()
    else:
        supabase_client.from_("project_documents").insert(payload).execute()


def _sync_email_link(
    *,
    supabase_client,
    link: dict,
    msg_id: str,
    email_doc_id: str,
    subject: str,
    received: str,
    participants: list[str],
    project_id: Optional[int],
    assignment_method: str,
    sender_addr: str,
    user_email: str,
) -> bool:
    url = link.get("url", "")
    if not url:
        return False

    doc_id = _link_doc_id(msg_id, url)
    label = link.get("label") or urlparse(url).netloc or url
    source_item_id = _stable_graph_id(f"{msg_id}:{url}")
    existing = (
        supabase_client.from_("document_metadata")
        .select("id, source_metadata")
        .eq("id", doc_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        if project_id:
            _upsert_project_document_by_source(supabase_client, {
                "project_id": project_id,
                "folder": "Email Links",
                "title": label[:250],
                "description": f"Link from Outlook email: {subject}",
                "file_name": label[:180] or "email-link",
                "file_url": url,
                "file_size": 0,
                "content_type": "text/uri-list",
                "status": "Published",
                "category": "Email Link",
                "uploaded_by": sender_addr or user_email,
                "created_by": "microsoft_graph",
                "source_system": "outlook_link",
                "source_item_id": source_item_id,
                "source_path": f"outlook/{msg_id}/links",
                "source_web_url": url,
                "sync_status": "synced",
                "last_synced_at": datetime.now(timezone.utc).isoformat(),
                "source_metadata": (existing.data[0] or {}).get("source_metadata") or {},
            })
        return False

    source_metadata = {
        "email_document_metadata_id": email_doc_id,
        "outlook_message_id": msg_id,
        "link_url": url,
        "link_label": label,
    }
    content = "\n".join([
        f"Email link: {label}",
        f"URL: {url}",
        f"Email subject: {subject}",
        f"Source email document: {email_doc_id}",
    ])

    supabase_client.from_("document_metadata").insert({
        "id": doc_id,
        "title": label[:250],
        "source": "microsoft_graph",
        "category": "link",
        "type": "email_link",
        "content": content,
        "date": received[:10] if received else None,
        "url": url,
        "participants": ", ".join(participants[:50]),
        "status": "metadata_only",
        "tags": ",".join(["outlook_link", f"project_auto:{assignment_method}" if project_id else "unassigned"]),
        "project_id": project_id,
        "source_system": "outlook_link",
        "source_item_id": source_item_id,
        "source_path": f"outlook/{msg_id}/links",
        "source_web_url": url,
        "source_metadata": source_metadata,
    }).execute()

    if project_id:
        _upsert_project_document_by_source(supabase_client, {
            "project_id": project_id,
            "folder": "Email Links",
            "title": label[:250],
            "description": f"Link from Outlook email: {subject}",
            "file_name": label[:180] or "email-link",
            "file_url": url,
            "file_size": 0,
            "content_type": "text/uri-list",
            "status": "Published",
            "category": "Email Link",
            "uploaded_by": sender_addr or user_email,
            "created_by": "microsoft_graph",
            "source_system": "outlook_link",
            "source_item_id": source_item_id,
            "source_path": f"outlook/{msg_id}/links",
            "source_web_url": url,
            "sync_status": "synced",
            "last_synced_at": datetime.now(timezone.utc).isoformat(),
            "source_metadata": source_metadata,
        })

    return True


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
    select_fields = ",".join([
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
    ])
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
        sender = msg.get("from", {}).get("emailAddress", {}) or {}
        sender_name = sender.get("name", user_email)
        sender_addr = sender.get("address", "")
        email_web_link = msg.get("webLink", "")
        raw_html = _body_html(msg)
        cid_refs = _extract_cid_refs(raw_html)
        extracted_links = _extract_links(msg)

        doc_id = f"outlook_{msg_id}"

        participants = _message_participants(msg, sender_name, sender_addr)

        # Upload content to Supabase Storage
        storage_path = f"outlook/{user_email}/{msg_id}.txt"
        existing = (
            supabase_client.from_("document_metadata")
            .select("id, project_id, source_metadata, tags")
            .eq("id", doc_id)
            .limit(1)
            .execute()
        )
        existing_rows = existing.data or []
        existing_doc = existing_rows[0] if existing_rows else None

        if not existing_doc:
            try:
                supabase_client.storage.from_(DOCUMENT_BUCKET).upload(
                    storage_path,
                    body_text.encode("utf-8"),
                    {"content-type": "text/plain", "upsert": "true"},
                )
            except Exception as e:
                logger.warning(f"[Outlook] Storage upload failed for {msg_id}: {e}")
                continue

        # Insert document_metadata — DB trigger fires the full pipeline
        try:
            if existing_doc:
                existing_project_id = existing_doc.get("project_id")
                if existing_project_id:
                    project_id = existing_project_id
                    assignment_method = "existing_document"
                    assignment_confidence = 1.0
                else:
                    project_id, assignment_method, assignment_confidence = infer_project_id(
                        supabase_client,
                        title=f"Email: {subject}",
                        content=body_text,
                        participants=participants,
                    )
            else:
                project_id, assignment_method, assignment_confidence = infer_project_id(
                    supabase_client,
                    title=f"Email: {subject}",
                    content=body_text,
                    participants=participants,
                )

            tags = ["email", "outlook"]
            if project_id:
                tags.append(f"project_auto:{assignment_method}")

            source_metadata = {
                "outlook_message_id": msg_id,
                "internet_message_id": msg.get("internetMessageId"),
                "conversation_id": msg.get("conversationId"),
                "outlook_web_link": email_web_link,
                "has_attachments": bool(msg.get("hasAttachments")),
                "inline_content_ids": sorted(cid_refs),
                "links": extracted_links,
            }
            effective_source_metadata = source_metadata

            if existing_doc:
                effective_source_metadata = {
                    **(existing_doc.get("source_metadata") or {}),
                    **source_metadata,
                }
                supabase_client.from_("document_metadata").update({
                    "url": email_web_link,
                    "source_system": "outlook_email",
                    "source_item_id": msg_id,
                    "source_path": f"outlook/{user_email}/{msg_id}.txt",
                    "source_web_url": email_web_link,
                    "project_id": project_id,
                    "source_metadata": effective_source_metadata,
                }).eq("id", doc_id).execute()
            else:
                supabase_client.from_("document_metadata").insert({
                    "id": doc_id,
                    "title": f"Email: {subject}",
                    "source": "microsoft_graph",
                    "category": "email",
                    "type": "email",
                    "content": body_text,
                    "date": received[:10] if received else None,
                    "participants": ", ".join(participants[:50]),
                    "status": "raw_ingested",
                    "tags": ",".join(tags),
                    "project_id": project_id,
                    "url": email_web_link,
                    "source_system": "outlook_email",
                    "source_item_id": msg_id,
                    "source_path": f"outlook/{user_email}/{msg_id}.txt",
                    "source_web_url": email_web_link,
                    "storage_bucket": DOCUMENT_BUCKET,
                    "storage_path": storage_path,
                    "source_metadata": source_metadata,
                }).execute()

            attachment_count = 0
            link_count = 0
            attachment_errors: list[str] = []
            try:
                attachments = _list_message_attachments(graph, user_id, msg, cid_refs)
            except Exception as exc:
                attachments = []
                attachment_errors.append(f"list_failed: {exc}")

            for attachment in attachments:
                try:
                    if _sync_email_attachment(
                        supabase_client=supabase_client,
                        attachment=attachment,
                        user_email=user_email,
                        msg_id=msg_id,
                        email_doc_id=doc_id,
                        subject=subject,
                        received=received,
                        sender_name=sender_name,
                        sender_addr=sender_addr,
                        participants=participants,
                        project_id=project_id,
                        assignment_method=assignment_method,
                        email_web_link=email_web_link,
                    ):
                        attachment_count += 1
                except Exception as exc:
                    message = f"{attachment.get('name') or attachment.get('id')}: {exc}"
                    attachment_errors.append(message[:500])
                    logger.warning("[Outlook] Attachment sync failed for %s: %s", msg_id, message)

            for link in extracted_links:
                try:
                    if _sync_email_link(
                        supabase_client=supabase_client,
                        link=link,
                        msg_id=msg_id,
                        email_doc_id=doc_id,
                        subject=subject,
                        received=received,
                        participants=participants,
                        project_id=project_id,
                        assignment_method=assignment_method,
                        sender_addr=sender_addr,
                        user_email=user_email,
                    ):
                        link_count += 1
                except Exception as exc:
                    logger.warning("[Outlook] Link sync failed for %s: %s", msg_id, exc)

            if attachment_count or link_count or attachment_errors:
                update_payload = {
                    "source_metadata": {
                        **effective_source_metadata,
                        "attachment_count_synced": attachment_count,
                        "link_count_synced": link_count,
                        "attachment_errors": attachment_errors,
                    }
                }
                if attachment_errors:
                    update_payload["tags"] = ",".join(tags + ["attachment_sync_error"])
                supabase_client.from_("document_metadata").update(update_payload).eq("id", doc_id).execute()

            if not existing_doc:
                synced += 1
            if project_id:
                logger.info(
                    "[Outlook] Auto-assigned project_id=%s for %s via %s (%.2f); attachments=%d links=%d errors=%d",
                    project_id,
                    msg_id,
                    assignment_method,
                    assignment_confidence,
                    attachment_count,
                    link_count,
                    len(attachment_errors),
                )
        except Exception as e:
            logger.warning(f"[Outlook] Failed to insert metadata for {msg_id}: {e}")

    logger.info(f"[Outlook] Synced {synced} emails for {user_email}")
    return synced, new_delta_token
