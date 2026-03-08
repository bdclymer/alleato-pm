"""
Stage 1 (Financial) - Parse tabular financial and spreadsheet documents.

Supports CSV/TSV/XLS/XLSX files and writes:
- normalized rows to `document_rows` (dataset_id = document_metadata.id)
- textual section summaries to `meeting_segments` for downstream embedding
- document summary/status updates in `document_metadata`

This keeps Stage 2 (embedder) and Stage 3 (extractor) compatible while adding
structured tabular storage for numeric-first retrieval.
"""
from __future__ import annotations

import io
import logging
import os
from typing import Any, Dict, List, Tuple

import pandas as pd

from ..supabase_helpers import get_supabase_client
from .models import MeetingSegment

logger = logging.getLogger(__name__)

MAX_ROWS_PER_SHEET = int(os.getenv("FINANCIAL_PARSER_MAX_ROWS", "5000"))
MAX_CONTENT_CHARS = int(os.getenv("FINANCIAL_PARSER_MAX_CONTENT_CHARS", "300000"))
ROW_INSERT_BATCH_SIZE = int(os.getenv("FINANCIAL_PARSER_ROW_BATCH", "500"))


def _safe_value(value: Any) -> Any:
    if value is None:
        return None
    # pandas NA/NaN handling
    try:
        if pd.isna(value):
            return None
    except Exception:
        pass

    if isinstance(value, (int, float, bool)):
        return value

    text = str(value).strip()
    return text if text else None


def _dataframe_to_rows(df: pd.DataFrame, sheet: str) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    columns = [str(c).strip() or f"col_{idx+1}" for idx, c in enumerate(df.columns)]

    trimmed = df.head(MAX_ROWS_PER_SHEET)
    for idx, (_, row) in enumerate(trimmed.iterrows()):
        row_values: Dict[str, Any] = {}
        for col_name, raw in zip(columns, row.tolist()):
            row_values[col_name] = _safe_value(raw)
        rows.append(
            {
                "sheet": sheet,
                "row_index": idx + 1,
                "columns": row_values,
            }
        )
    return rows


def _sheet_summary(df: pd.DataFrame, sheet: str) -> str:
    col_names = [str(c).strip() for c in df.columns if str(c).strip()]
    row_count = int(len(df.index))
    col_count = int(len(df.columns))

    numeric_stats: List[str] = []
    for col in df.columns:
        numeric = pd.to_numeric(df[col], errors="coerce").dropna()
        if numeric.empty:
            continue
        total = float(numeric.sum())
        if abs(total) < 0.00001:
            continue
        numeric_stats.append(f"{col} total={total:,.2f}")

    numeric_preview = "; ".join(numeric_stats[:5]) if numeric_stats else "No numeric totals detected"
    col_preview = ", ".join(col_names[:10]) if col_names else "No columns"

    return (
        f"Sheet '{sheet}' has {row_count} rows and {col_count} columns. "
        f"Columns: {col_preview}. Numeric preview: {numeric_preview}."
    )


def _sheet_to_text(df: pd.DataFrame, sheet: str) -> str:
    lines: List[str] = [f"## Sheet: {sheet}"]
    columns = [str(c).strip() or f"col_{idx+1}" for idx, c in enumerate(df.columns)]

    trimmed = df.head(MAX_ROWS_PER_SHEET)
    for idx, (_, row) in enumerate(trimmed.iterrows()):
        parts: List[str] = []
        for col_name, raw in zip(columns, row.tolist()):
            val = _safe_value(raw)
            if val is None:
                continue
            parts.append(f"{col_name}: {val}")
        if parts:
            lines.append(f"Row {idx + 1} | " + " | ".join(parts))

    text = "\n".join(lines)
    return text[:MAX_CONTENT_CHARS]


def _extract_tables(file_bytes: bytes, file_name: str) -> List[Tuple[str, pd.DataFrame]]:
    ext = (file_name or "").lower().rsplit(".", 1)[-1]

    if ext in {"csv", "tsv"}:
        sep = "\t" if ext == "tsv" else ","
        df = pd.read_csv(io.BytesIO(file_bytes), sep=sep, dtype=str)
        return [("Sheet1", df)]

    if ext in {"xls", "xlsx"}:
        workbook = pd.ExcelFile(io.BytesIO(file_bytes))
        tables: List[Tuple[str, pd.DataFrame]] = []
        for sheet in workbook.sheet_names:
            df = workbook.parse(sheet_name=sheet, dtype=str)
            tables.append((sheet, df))
        return tables

    raise ValueError(f"Unsupported financial document extension: .{ext}")


def _insert_document_rows(client, metadata_id: str, rows: List[Dict[str, Any]]) -> None:
    if not rows:
        return

    payload = [{"dataset_id": metadata_id, "row_data": row} for row in rows]
    for start in range(0, len(payload), ROW_INSERT_BATCH_SIZE):
        batch = payload[start : start + ROW_INSERT_BATCH_SIZE]
        client.table("document_rows").insert(batch).execute()


def run_financial_parser(metadata_id: str) -> Dict[str, Any]:
    """Parse financial/tabular document and stage it for embedding."""
    client = get_supabase_client()

    resp = (
        client.table("document_metadata")
        .select("*")
        .eq("id", metadata_id)
        .single()
        .execute()
    )
    metadata = resp.data
    if not metadata:
        raise ValueError(f"document_metadata not found: {metadata_id}")

    file_path = metadata.get("file_path")
    file_name = metadata.get("file_name") or metadata.get("title") or "document"
    bucket_name = metadata.get("storage_bucket") or "documents"

    if not file_path:
        raise ValueError("Financial parser requires document_metadata.file_path")

    logger.info("[FinancialParser] Processing %s (%s)", file_name, metadata_id)

    file_bytes = client.storage.from_(bucket_name).download(file_path)
    if not file_bytes:
        raise ValueError(f"Failed to download file from storage: {file_path}")

    tables = _extract_tables(file_bytes, file_name)
    if not tables:
        raise ValueError("No tables detected in financial document")

    all_structured_rows: List[Dict[str, Any]] = []
    segments: List[MeetingSegment] = []
    content_blocks: List[str] = []
    line_cursor = 0

    for segment_index, (sheet_name, df) in enumerate(tables):
        # Skip empty sheets
        if df.empty or len(df.columns) == 0:
            continue

        sheet_rows = _dataframe_to_rows(df, sheet_name)
        all_structured_rows.extend(sheet_rows)

        sheet_summary = _sheet_summary(df, sheet_name)
        sheet_text = _sheet_to_text(df, sheet_name)

        line_count = max(1, len(sheet_text.split("\n")))
        segments.append(
            MeetingSegment(
                segment_index=segment_index,
                title=f"Financial Sheet: {sheet_name}",
                start_index=line_cursor,
                end_index=line_cursor + line_count - 1,
                summary=sheet_summary,
                decisions=[],
                risks=[],
                tasks=[],
            )
        )
        line_cursor += line_count
        content_blocks.append(sheet_text)

    if not segments:
        raise ValueError("No non-empty sheets found in financial document")

    # Reset prior parser outputs for idempotent re-runs
    client.table("meeting_segments").delete().eq("metadata_id", metadata_id).execute()
    client.table("document_rows").delete().eq("dataset_id", metadata_id).execute()

    for seg in segments:
        client.table("meeting_segments").upsert(
            {
                "metadata_id": metadata_id,
                "segment_index": seg.segment_index,
                "title": seg.title,
                "start_index": seg.start_index,
                "end_index": seg.end_index,
                "summary": seg.summary,
                "decisions": seg.decisions,
                "risks": seg.risks,
                "tasks": seg.tasks,
            },
            on_conflict="metadata_id,segment_index",
        ).execute()

    _insert_document_rows(client, metadata_id, all_structured_rows)

    combined_content = "\n\n".join(content_blocks)[:MAX_CONTENT_CHARS]
    overview = (
        f"Financial dataset with {len(segments)} sheets and "
        f"{len(all_structured_rows)} stored rows. "
        f"Primary sheets: {', '.join(seg.title.replace('Financial Sheet: ', '') for seg in segments[:8])}."
    )

    client.table("document_metadata").update(
        {
            "overview": overview,
            "status": "segmented",
            "content": combined_content,
            "raw_text": combined_content,
        }
    ).eq("id", metadata_id).execute()

    client.table("fireflies_ingestion_jobs").update(
        {"stage": "segmented", "error_message": None}
    ).eq("metadata_id", metadata_id).execute()

    return {
        "metadataId": metadata_id,
        "sheetCount": len(segments),
        "rowCount": len(all_structured_rows),
        "contentChars": len(combined_content),
    }
