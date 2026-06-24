"""
Vision analysis pipeline stage.

For each page of a PDF document, renders the page to an image and runs GPT-4o
vision to extract structured intelligence: sheet number, title, discipline,
detail references, implied submittals, key requirements, and a clean prose
summary that gets vectorized downstream.

Applies to all PDFs: construction drawings, submittals, and any other PDF
document type.
"""
from __future__ import annotations

import base64
import json
import logging
import re
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

VISION_MODEL = "gpt-4o"
MAX_PAGES_PER_DOC = 25
IMAGE_DPI_SCALE = 2.0  # ~144 DPI — good balance of quality vs token cost
JPEG_QUALITY = 85

VISION_PROMPT = """\
You are analyzing a page from a construction document (drawing, submittal, \
specification, or report). Extract structured information.

Return ONLY a valid JSON object — no markdown, no explanation — with these fields:
{
  "sheet_number": "S005" or null,
  "sheet_title": "Typical Details" or null,
  "discipline": one of ["Structural","Architectural","Mechanical","Electrical",\
"Plumbing","Civil","General","Fire Protection","Survey","Landscape"] or null,
  "scale": "3/4\" = 1'-0\"" or null,
  "detail_references": ["1/S005", "2/S005"],
  "implied_submittals": ["steel frame layout", "joist reinforcement materials"],
  "notes_and_requirements": ["field verify actual configuration", \
"remove live loads before reinforcement"],
  "ai_summary": "2-4 sentence prose summary of what this page contains, \
what it requires, and what trade or discipline would reference it"
}

For submittal documents (equipment data sheets, shop drawings, product submittals):
- sheet_number may be a submittal spec section (e.g. "15650")
- implied_submittals: what the contractor must provide or coordinate based on this doc
- notes_and_requirements: compliance items, installation requirements, coordination notes

Return ONLY the JSON object."""


def _render_page_to_jpeg(page: Any, max_pixels: int = 2048) -> bytes:
    """Render a PDF page to JPEG bytes using PyMuPDF."""
    rect = page.rect
    scale = min(
        max_pixels / (rect.width * IMAGE_DPI_SCALE),
        max_pixels / (rect.height * IMAGE_DPI_SCALE),
        1.0,
    )
    mat = page.bound().transform(
        __import__("fitz").Matrix(IMAGE_DPI_SCALE * scale, IMAGE_DPI_SCALE * scale)
    )
    pix = page.get_pixmap(
        matrix=__import__("fitz").Matrix(IMAGE_DPI_SCALE * scale, IMAGE_DPI_SCALE * scale)
    )
    return pix.tobytes("jpeg", jpg_quality=JPEG_QUALITY)


def _parse_vision_response(raw: str) -> Dict[str, Any]:
    """Extract JSON from GPT-4o response, tolerating markdown fences."""
    raw = raw.strip()
    # Strip markdown code fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Try extracting first {...} block
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
    logger.warning("[VisionAnalyzer] Could not parse JSON from response: %s", raw[:200])
    return {}


def run_vision_analyzer(metadata_id: str, pm_client: Any) -> Dict[str, Any]:
    """
    Analyze each page of a PDF document with GPT-4o vision.
    Upserts results into document_page_intelligence in the PM APP DB.

    Returns a result dict: {pages_analyzed, skipped_reason}
    """
    try:
        import fitz  # pymupdf — imported here so missing dep fails gracefully
    except ImportError:
        logger.warning("[VisionAnalyzer] pymupdf not installed — skipping vision analysis")
        return {"pages_analyzed": 0, "skipped_reason": "pymupdf not installed"}

    from ..ai_transport import get_openai_client

    # ── 1. Load document metadata ──────────────────────────────────────────
    resp = (
        pm_client.table("document_metadata")
        .select("id, title, file_path, file_name, storage_bucket, url, source_web_url")
        .eq("id", metadata_id)
        .maybe_single()
        .execute()
    )
    metadata = resp.data
    if not metadata:
        return {"pages_analyzed": 0, "skipped_reason": "document not found"}

    file_path = metadata.get("file_path") or ""
    file_name = metadata.get("file_name") or file_path

    # Only process PDFs
    if not (file_path.lower().endswith(".pdf") or file_name.lower().endswith(".pdf")):
        return {"pages_analyzed": 0, "skipped_reason": "not a PDF"}

    # ── 2. Download PDF from Supabase Storage ─────────────────────────────
    # Drawings store the PDF in project-files bucket with path embedded in `url`;
    # submittals/other docs use file_path + storage_bucket.
    pdf_bytes: Optional[bytes] = None

    if file_path:
        bucket = metadata.get("storage_bucket") or "documents"
        try:
            pdf_bytes = pm_client.storage.from_(bucket).download(file_path)
        except Exception as exc:
            logger.warning("[VisionAnalyzer] Storage download via file_path failed for %s: %s", file_path, exc)

    if not pdf_bytes:
        # Fallback: extract storage path from public URL
        # URL pattern: .../storage/v1/object/public/<bucket>/<path>
        public_url = metadata.get("url") or metadata.get("source_web_url") or ""
        import re as _re
        m = _re.search(r"/storage/v1/object/public/([^/]+)/(.+)$", public_url)
        if m:
            bucket, storage_path = m.group(1), m.group(2)
            try:
                pdf_bytes = pm_client.storage.from_(bucket).download(storage_path)
                logger.info("[VisionAnalyzer] Downloaded via URL-extracted path: %s / %s", bucket, storage_path)
            except Exception as exc:
                logger.error("[VisionAnalyzer] URL-path download failed for %s: %s", storage_path, exc)
                return {"pages_analyzed": 0, "skipped_reason": f"storage download failed: {exc}"}
        else:
            logger.error("[VisionAnalyzer] No downloadable path for %s (file_path=%r, url=%r)", metadata_id, file_path, public_url)
            return {"pages_analyzed": 0, "skipped_reason": "no storage path available"}

    if not pdf_bytes:
        return {"pages_analyzed": 0, "skipped_reason": "empty file"}

    # ── 3. Open with PyMuPDF ──────────────────────────────────────────────
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as exc:
        logger.error("[VisionAnalyzer] PDF open failed for %s: %s", metadata_id, exc)
        return {"pages_analyzed": 0, "skipped_reason": f"PDF open failed: {exc}"}

    # ── 4. Clear any existing page intelligence for this document ─────────
    pm_client.table("document_page_intelligence") \
        .delete() \
        .eq("document_metadata_id", metadata_id) \
        .execute()

    openai_client = get_openai_client()
    pages_analyzed = 0
    page_count = min(len(doc), MAX_PAGES_PER_DOC)

    logger.info(
        "[VisionAnalyzer] Analyzing %d pages for document %s (%s)",
        page_count, metadata_id, file_name,
    )

    # ── 5. Analyze each page ──────────────────────────────────────────────
    for page_idx in range(page_count):
        page = doc[page_idx]

        try:
            # Render page → JPEG → base64
            jpeg_bytes = _render_page_to_jpeg(page)
            b64 = base64.b64encode(jpeg_bytes).decode("utf-8")

            # Call GPT-4o vision
            response = openai_client.chat.completions.create(
                model=VISION_MODEL,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": VISION_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{b64}",
                                "detail": "high",
                            },
                        },
                    ],
                }],
                max_tokens=1500,
                temperature=0,
            )

            raw_text = response.choices[0].message.content or "{}"
            extraction = _parse_vision_response(raw_text)

            # Upsert into document_page_intelligence
            row = {
                "document_metadata_id": metadata_id,
                "page_number": page_idx + 1,
                "sheet_number": extraction.get("sheet_number"),
                "sheet_title": extraction.get("sheet_title"),
                "discipline": extraction.get("discipline"),
                "scale": extraction.get("scale"),
                "detail_references": extraction.get("detail_references") or [],
                "implied_submittals": extraction.get("implied_submittals") or [],
                "notes_and_requirements": extraction.get("notes_and_requirements") or [],
                "ai_summary": extraction.get("ai_summary"),
                "raw_extraction": extraction,
                "vision_model": VISION_MODEL,
            }
            pm_client.table("document_page_intelligence").upsert(row).execute()
            pages_analyzed += 1

            logger.debug(
                "[VisionAnalyzer] Page %d analyzed: sheet=%s title=%s",
                page_idx + 1,
                extraction.get("sheet_number"),
                extraction.get("sheet_title"),
            )

        except Exception as exc:
            logger.error(
                "[VisionAnalyzer] Page %d failed for %s: %s",
                page_idx + 1, metadata_id, exc,
            )
            # Continue processing remaining pages — don't fail the whole document

    doc.close()
    logger.info(
        "[VisionAnalyzer] Done: %d/%d pages analyzed for %s",
        pages_analyzed, page_count, metadata_id,
    )
    return {"pages_analyzed": pages_analyzed, "total_pages": page_count}
