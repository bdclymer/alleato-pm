"""
OCR Worker — fallback text extraction for scanned PDFs.

Queries document_metadata rows with status='no_text', downloads the raw PDF
bytes via Microsoft Graph, runs Azure Document Intelligence OCR, and updates
the record with extracted text.

Status after processing:
  - 'raw_ingested'  → full text extracted (all pages within the cap were processed
                       and the doc fits within the page cap)
  - 'ocr_partial'   → OCR ran but the document exceeded the page cap; text is
                       partial and the record is flagged so staff know it may be
                       incomplete for RAG search.

Both statuses make the record eligible for the embedding pipeline on the next
sync run — ocr_partial files ARE embedded, but the Files table shows them
distinctly so operators can spot PDFs that weren't fully read.
"""
import logging
import os
from datetime import datetime, timezone
from typing import Optional

from supabase import Client

from .client import get_graph_client
from ..azure.document_intelligence import extract_text_from_bytes, is_configured as azure_is_configured

logger = logging.getLogger(__name__)

_DEFAULT_BATCH = 20
_DEFAULT_PAGE_CAP = 20


def _get_page_cap() -> int:
    try:
        return max(1, min(int(os.environ.get("AZURE_OCR_PAGE_CAP", str(_DEFAULT_PAGE_CAP))), 100))
    except ValueError:
        return _DEFAULT_PAGE_CAP


def _get_batch_size() -> int:
    try:
        return max(1, min(int(os.environ.get("AZURE_OCR_BATCH_SIZE", str(_DEFAULT_BATCH))), 100))
    except ValueError:
        return _DEFAULT_BATCH


def _fetch_no_text_records(supabase: Client, limit: int) -> list[dict]:
    """Fetch document_metadata rows with status='no_text' that are PDFs."""
    result = (
        supabase.from_("document_metadata")
        .select("id, title, source_web_url, source_path, type")
        .eq("status", "no_text")
        .or_("type.ilike.%.pdf%,type.ilike.%pdf%,type.is.null")
        .limit(limit)
        .execute()
    )
    return result.data or []


def _resolve_download_url(record: dict) -> Optional[str]:
    """
    Get a download URL for a document_metadata record.

    For OneDrive/SharePoint files the source_web_url is the browser URL,
    not a download URL. We need to query the Graph API to get a fresh
    @microsoft.graph.downloadUrl. We derive the drive item ID from
    source_path or source_web_url.

    For now we use the source_web_url as a Graph item lookup via the
    /v1.0/shares endpoint which accepts encoded sharing URLs.
    """
    web_url = record.get("source_web_url") or ""
    if not web_url:
        return None

    try:
        import base64
        graph = get_graph_client()
        # Encode the sharing URL as a Graph sharing token.
        token = base64.urlsafe_b64encode(web_url.encode()).rstrip(b"=").decode()
        share_token = f"u!{token}"
        data = graph.get(f"/shares/{share_token}/driveItem")
        return data.get("@microsoft.graph.downloadUrl") or data.get("downloadUrl")
    except Exception as exc:
        logger.warning("[OCRWorker] Could not resolve download URL for %s: %s", record.get("id"), exc)
        return None


def _update_record_after_ocr(
    supabase: Client,
    doc_id: str,
    text: str,
    capped: bool,
    pages_processed: int,
) -> None:
    """Update document_metadata with OCR results."""
    status = "ocr_partial" if capped else "raw_ingested"
    update_payload: dict = {
        "status": status,
        "text_content": text[:100000],  # hard cap to avoid oversized rows
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    supabase.from_("document_metadata").update(update_payload).eq("id", doc_id).execute()
    logger.info(
        "[OCRWorker] Updated %s → status=%s pages=%d text_chars=%d",
        doc_id,
        status,
        pages_processed,
        len(text),
    )


def _mark_ocr_failed(supabase: Client, doc_id: str, reason: str) -> None:
    """Mark a record as ocr_failed so it's skipped on the next pass."""
    supabase.from_("document_metadata").update({
        "status": "ocr_failed",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", doc_id).execute()
    logger.warning("[OCRWorker] Marked %s as ocr_failed: %s", doc_id, reason)


def run_ocr_pass(
    supabase: Client,
    *,
    limit: Optional[int] = None,
    page_cap: Optional[int] = None,
) -> dict:
    """
    Process a batch of no_text documents through Azure Document Intelligence OCR.

    Returns a summary dict with counts: seen, ocr_full, ocr_partial, failed, skipped.
    """
    if not azure_is_configured():
        logger.info("[OCRWorker] Azure Document Intelligence not configured — skipping OCR pass.")
        return {"status": "skipped", "reason": "azure_not_configured"}

    batch = limit or _get_batch_size()
    cap = page_cap or _get_page_cap()
    graph = get_graph_client()

    records = _fetch_no_text_records(supabase, batch)
    if not records:
        logger.info("[OCRWorker] No no_text documents to process.")
        return {"status": "ok", "seen": 0, "ocr_full": 0, "ocr_partial": 0, "failed": 0, "skipped": 0}

    logger.info("[OCRWorker] Processing %d no_text documents (page_cap=%d)", len(records), cap)

    counts = {"seen": len(records), "ocr_full": 0, "ocr_partial": 0, "failed": 0, "skipped": 0}

    for record in records:
        doc_id = record["id"]
        title = record.get("title") or doc_id

        download_url = _resolve_download_url(record)
        if not download_url:
            logger.warning("[OCRWorker] No download URL for %s (%s) — skipping", doc_id, title)
            counts["skipped"] += 1
            continue

        try:
            pdf_bytes = graph.download_bytes(download_url)
        except Exception as exc:
            logger.warning("[OCRWorker] Failed to download %s: %s", title, exc)
            _mark_ocr_failed(supabase, doc_id, f"download failed: {exc}")
            counts["failed"] += 1
            continue

        if len(pdf_bytes) == 0:
            logger.warning("[OCRWorker] Empty file for %s — skipping", title)
            counts["skipped"] += 1
            continue

        try:
            ocr_result = extract_text_from_bytes(pdf_bytes, max_pages=cap)
        except Exception as exc:
            logger.warning("[OCRWorker] OCR failed for %s: %s", title, exc)
            _mark_ocr_failed(supabase, doc_id, f"ocr error: {exc}")
            counts["failed"] += 1
            continue

        if len(ocr_result.text.strip()) < 50:
            # OCR ran but found no readable text (blank pages, image-only with no text).
            # Leave as no_text — don't embed, don't mark raw_ingested.
            logger.info("[OCRWorker] OCR returned no usable text for %s — leaving as no_text", title)
            counts["skipped"] += 1
            continue

        _update_record_after_ocr(
            supabase,
            doc_id,
            ocr_result.text,
            capped=ocr_result.capped,
            pages_processed=ocr_result.pages_processed,
        )

        if ocr_result.capped:
            logger.warning(
                "[OCRWorker] Page cap hit for '%s' (id=%s) — processed %d pages, "
                "document may have more. Status set to ocr_partial.",
                title,
                doc_id,
                ocr_result.pages_processed,
            )
            counts["ocr_partial"] += 1
        else:
            counts["ocr_full"] += 1

    logger.info("[OCRWorker] Pass complete: %s", counts)
    return {"status": "ok", **counts}
