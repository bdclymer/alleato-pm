"""Promote important Outlook intake attachments into project documents."""

from __future__ import annotations

import hashlib
import logging
import mimetypes
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import PurePosixPath
from typing import Any, Optional

from ...supabase_helpers import SupabaseRagStore
from .onedrive import SUPPORTED_EXTENSIONS, _extract_text
from .outlook import DOCUMENT_BUCKET
from .project_documents import upsert_project_document_by_source

logger = logging.getLogger(__name__)

DEFAULT_LIMIT = 25
MAX_ATTACHMENT_BYTES = int(os.environ.get("OUTLOOK_ATTACHMENT_PROMOTION_MAX_BYTES", str(50 * 1024 * 1024)))

PROMOTABLE_EXTENSIONS = {
    ".csv",
    ".doc",
    ".docx",
    ".dwg",
    ".dxf",
    ".mpp",
    ".pdf",
    ".ppt",
    ".pptx",
    ".rvt",
    ".txt",
    ".xls",
    ".xlsx",
    ".zip",
}

DOCUMENT_KEYWORDS = {
    "contract": "Contract",
    "agreement": "Contract",
    "subcontract": "Contract",
    "purchase order": "Contract",
    "po ": "Contract",
    "spec": "Specification",
    "specification": "Specification",
    "drawing": "Drawing",
    "drawings": "Drawing",
    "plan": "Drawing",
    "plans": "Drawing",
    "sheet": "Drawing",
    "submittal": "Submittal",
    "rfi": "RFI",
    "proposal": "Proposal",
    "quote": "Proposal",
    "change order": "Change Order",
    "change request": "Change Order",
    "invoice": "Invoice",
    "pay app": "Invoice",
    "payment application": "Invoice",
    "permit": "Permit",
    "schedule": "Schedule",
    "addendum": "Addendum",
    "closeout": "Closeout",
    "warranty": "Closeout",
}

LOW_VALUE_NAME_PATTERNS = (
    re.compile(r"^(image|logo|icon|signature|facebook|linkedin|twitter|instagram)\d*[\W_]*", re.IGNORECASE),
    re.compile(r"(unsubscribe|privacy|terms|confidentiality|email[-_ ]banner)", re.IGNORECASE),
)


@dataclass(frozen=True)
class AttachmentDecision:
    status: str
    category: Optional[str]
    reason: str


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _stable_graph_id(value: str, length: int = 24) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:length]


def _storage_safe_name(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", name or "attachment").strip("._")
    return cleaned[:180] or "attachment"


def _decode_bytea(value: Any) -> Optional[bytes]:
    if value is None:
        return None
    if isinstance(value, bytes):
        return value
    text = str(value)
    if text.startswith("\\x"):
        return bytes.fromhex(text[2:])
    return text.encode("utf-8")


def _storage_public_url(supabase_client, bucket: str, path: str) -> str:
    try:
        return supabase_client.storage.from_(bucket).get_public_url(path)
    except Exception:
        return path


def _attachment_doc_id(message_id: str, attachment_id: str) -> str:
    return f"outlook_attachment_{_stable_graph_id(message_id)}_{_stable_graph_id(attachment_id)}"


def classify_attachment_for_promotion(
    *,
    file_name: str,
    content_type: Optional[str],
    is_inline: bool,
    subject: str,
    body_text: str,
) -> AttachmentDecision:
    """Classify whether an attachment should become a project document."""
    normalized_name = (file_name or "").strip().lower()
    _, ext = os.path.splitext(normalized_name)
    ext = ext.lower()

    if not normalized_name:
        return AttachmentDecision("skipped", None, "missing_file_name")
    if is_inline and (content_type or "").startswith("image/"):
        return AttachmentDecision("skipped", None, "inline_image")
    if any(pattern.search(normalized_name) for pattern in LOW_VALUE_NAME_PATTERNS):
        return AttachmentDecision("skipped", None, "low_value_attachment_name")

    combined = f"{normalized_name} {subject or ''} {body_text or ''}".lower()
    for keyword, category in DOCUMENT_KEYWORDS.items():
        if keyword in combined:
            return AttachmentDecision("promoted", category, f"keyword:{keyword}")

    if ext in {".dwg", ".dxf", ".rvt"}:
        return AttachmentDecision("promoted", "Drawing", f"extension:{ext.lstrip('.')}")
    if ext in PROMOTABLE_EXTENSIONS and not (content_type or "").startswith("image/"):
        return AttachmentDecision("review_needed", None, f"promotable_extension_no_context:{ext.lstrip('.')}")

    return AttachmentDecision("skipped", None, f"unsupported_or_low_value_extension:{ext.lstrip('.') or 'none'}")


def _select_pending_attachments(supabase_client, limit: int) -> list[dict[str, Any]]:
    response = (
        supabase_client.from_("outlook_email_intake_attachments")
        .select(
            """
            id,
            intake_email_id,
            email_attachment_id,
            graph_attachment_id,
            file_name,
            file_url,
            file_size,
            content_type,
            checksum_sha256,
            content,
            extracted_text,
            is_inline,
            source_metadata,
            promotion_attempt_count,
            outlook_email_intake!inner(
              id,
              graph_message_id,
              mailbox_user_id,
              project_id,
              subject,
              body_text,
              from_email,
              received_at,
              web_link,
              assignment_method,
              assignment_confidence
            )
            """
        )
        .in_("promotion_status", ["pending", "failed"])
        .order("created_at", desc=False)
        .limit(limit)
        .execute()
    )
    return response.data or []


def _update_attachment_status(
    supabase_client,
    attachment_id: int,
    *,
    status: str,
    reason: str,
    extra: Optional[dict[str, Any]] = None,
) -> None:
    payload = {
        "promotion_status": status,
        "promotion_reason": reason[:500],
        "updated_at": _now_iso(),
    }
    if status == "promoted":
        payload["promoted_at"] = _now_iso()
    if extra:
        payload.update(extra)
    supabase_client.from_("outlook_email_intake_attachments").update(payload).eq("id", attachment_id).execute()


def _increment_attempt_count(supabase_client, row: dict[str, Any]) -> None:
    current = int(row.get("promotion_attempt_count") or 0)
    supabase_client.from_("outlook_email_intake_attachments").update(
        {"promotion_attempt_count": current + 1, "updated_at": _now_iso()}
    ).eq("id", row["id"]).execute()


def _project_document_id(supabase_client, *, project_id: int, source_item_id: str) -> Optional[int]:
    response = (
        supabase_client.from_("project_documents")
        .select("id")
        .eq("project_id", project_id)
        .eq("source_system", "outlook_attachment")
        .eq("source_item_id", source_item_id)
        .is_("deleted_at", "null")
        .limit(1)
        .execute()
    )
    rows = response.data or []
    return int(rows[0]["id"]) if rows else None


def _promote_attachment(supabase_client, row: dict[str, Any]) -> dict[str, Any]:
    intake = row.get("outlook_email_intake") or {}
    project_id = intake.get("project_id")
    decision = classify_attachment_for_promotion(
        file_name=row.get("file_name") or "",
        content_type=row.get("content_type"),
        is_inline=bool(row.get("is_inline")),
        subject=intake.get("subject") or "",
        body_text=intake.get("body_text") or "",
    )

    if not project_id:
        _update_attachment_status(
            supabase_client,
            row["id"],
            status="review_needed",
            reason="missing_project_assignment",
        )
        return {"status": "review_needed", "reason": "missing_project_assignment"}

    if decision.status != "promoted":
        _update_attachment_status(
            supabase_client,
            row["id"],
            status=decision.status,
            reason=decision.reason,
            extra={"project_id": project_id},
        )
        return {"status": decision.status, "reason": decision.reason}

    file_name = row.get("file_name") or "attachment"
    graph_attachment_id = row.get("graph_attachment_id") or str(row["id"])
    graph_message_id = intake.get("graph_message_id") or str(row.get("intake_email_id"))
    doc_id = _attachment_doc_id(graph_message_id, graph_attachment_id)
    raw_bytes = _decode_bytea(row.get("content"))
    if not raw_bytes:
        raise ValueError("attachment_content_missing")
    if len(raw_bytes) > MAX_ATTACHMENT_BYTES:
        raise ValueError(f"attachment_exceeds_max_bytes:{len(raw_bytes)}")

    _, ext = os.path.splitext(file_name)
    ext = ext.lower()
    storage_path = str(
        PurePosixPath("outlook-attachments")
        / _storage_safe_name(intake.get("mailbox_user_id") or "mailbox")
        / _stable_graph_id(graph_message_id)
        / f"{_stable_graph_id(graph_attachment_id, 12)}-{_storage_safe_name(file_name)}"
    )
    content_type = row.get("content_type") or mimetypes.guess_type(file_name)[0] or "application/octet-stream"
    supabase_client.storage.from_(DOCUMENT_BUCKET).upload(
        storage_path,
        raw_bytes,
        {"content-type": content_type, "upsert": "true"},
    )
    public_url = _storage_public_url(supabase_client, DOCUMENT_BUCKET, storage_path)

    extracted_text = row.get("extracted_text") or ""
    if not extracted_text and ext in SUPPORTED_EXTENSIONS:
        extracted_text = _extract_text(raw_bytes, ext).replace("\x00", "").strip()
        if extracted_text:
            supabase_client.from_("outlook_email_intake_attachments").update(
                {"extracted_text": extracted_text[:50000], "updated_at": _now_iso()}
            ).eq("id", row["id"]).execute()

    source_metadata = {
        **(row.get("source_metadata") or {}),
        "promotion_reason": decision.reason,
        "outlook_intake_attachment_id": row["id"],
        "outlook_intake_email_id": row.get("intake_email_id"),
        "outlook_message_id": graph_message_id,
        "outlook_web_link": intake.get("web_link"),
        "assignment_method": intake.get("assignment_method"),
        "assignment_confidence": intake.get("assignment_confidence"),
        "source_file_url": row.get("file_url"),
    }
    content = (
        extracted_text
        or "\n".join(
            [
                f"Email attachment: {file_name}",
                f"Email subject: {intake.get('subject') or ''}",
                f"Sender: {intake.get('from_email') or ''}",
                f"Attachment category: {decision.category}",
            ]
        )
    )[:50000]

    SupabaseRagStore(supabase_client).upsert_document_metadata(
        {
            "id": doc_id,
            "title": file_name,
            "description": f"Attachment from Outlook email: {intake.get('subject') or '(no subject)'}",
            "source": "microsoft_graph",
            "category": decision.category or "Email Attachment",
            "type": "email_attachment",
            "content": content,
            "raw_text": extracted_text[:50000] if extracted_text else None,
            "date": (intake.get("received_at") or "")[:10] or None,
            "url": public_url,
            "participants": intake.get("from_email") or "",
            "status": "raw_ingested" if extracted_text else "metadata_only",
            "tags": ",".join(["outlook_attachment", (decision.category or "document").lower().replace(" ", "_")]),
            "project_id": project_id,
            "source_system": "outlook_attachment",
            "source_item_id": doc_id,
            "source_path": f"outlook/{intake.get('mailbox_user_id')}/{graph_message_id}/{file_name}",
            "source_web_url": intake.get("web_link"),
            "source_size": row.get("file_size"),
            "storage_bucket": DOCUMENT_BUCKET,
            "file_path": storage_path,
            "content_hash": row.get("checksum_sha256") or hashlib.sha256(raw_bytes).hexdigest(),
            "source_metadata": source_metadata,
            "workflow_target": "document",
        }
    )

    upsert_project_document_by_source(
        supabase_client,
        {
            "project_id": project_id,
            "folder": "Email Attachments",
            "title": file_name,
            "description": f"Attachment from Outlook email: {intake.get('subject') or '(no subject)'}",
            "file_name": file_name,
            "file_url": public_url,
            "file_size": row.get("file_size"),
            "content_type": content_type,
            "status": "Published",
            "category": decision.category or "Email Attachment",
            "uploaded_by": intake.get("from_email") or intake.get("mailbox_user_id"),
            "created_by": "microsoft_graph",
            "source_system": "outlook_attachment",
            "source_item_id": doc_id,
            "source_path": f"outlook/{intake.get('mailbox_user_id')}/{graph_message_id}/{file_name}",
            "source_web_url": intake.get("web_link"),
            "source_size": row.get("file_size"),
            "sync_status": "synced",
            "last_synced_at": _now_iso(),
            "storage_bucket": DOCUMENT_BUCKET,
            "storage_path": storage_path,
            "content_hash": row.get("checksum_sha256") or hashlib.sha256(raw_bytes).hexdigest(),
            "workflow_target": "document",
            "source_metadata": source_metadata,
        },
    )

    project_document_id = _project_document_id(supabase_client, project_id=project_id, source_item_id=doc_id)
    _update_attachment_status(
        supabase_client,
        row["id"],
        status="promoted",
        reason=decision.reason,
        extra={
            "project_id": project_id,
            "document_metadata_id": doc_id,
            "project_document_id": project_document_id,
        },
    )
    return {
        "status": "promoted",
        "reason": decision.reason,
        "document_metadata_id": doc_id,
        "project_document_id": project_document_id,
    }


def promote_outlook_intake_attachments(supabase_client, *, limit: int = DEFAULT_LIMIT) -> dict[str, Any]:
    """Promote queued Outlook attachments into document surfaces."""
    limit = max(1, min(int(limit or DEFAULT_LIMIT), 100))
    rows = _select_pending_attachments(supabase_client, limit)
    result: dict[str, Any] = {
        "seen": len(rows),
        "promoted": 0,
        "skipped": 0,
        "review_needed": 0,
        "failed": 0,
        "failures": [],
    }
    for row in rows:
        try:
            _increment_attempt_count(supabase_client, row)
            outcome = _promote_attachment(supabase_client, row)
            status = outcome.get("status")
            if status in {"promoted", "skipped", "review_needed"}:
                result[status] += 1
            else:
                result["failed"] += 1
        except Exception as exc:
            logger.warning("[OutlookAttachmentPromotion] Failed attachment id=%s: %s", row.get("id"), exc, exc_info=True)
            result["failed"] += 1
            result["failures"].append({"id": row.get("id"), "error": str(exc)[:300]})
            _update_attachment_status(
                supabase_client,
                row["id"],
                status="failed",
                reason=str(exc),
            )
    return result
