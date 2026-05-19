"""RAG pipeline snapshot collector.

Writes one row to ``rag_pipeline_snapshots`` (PM APP DB). Run 3x/day by the
``alleato-rag-snapshot`` Render cron. Source of truth for the ``/rag``
dashboard — never back-fill rows by hand, just wait for the next firing or
run this module directly to capture an out-of-band snapshot.

Counts per source (OneDrive, Outlook, Meetings, Teams):
    synced   — rows in PM APP ``document_metadata`` matching the source filter.
    chunked  — distinct ``document_id`` in RAG ``document_chunks`` whose
               ``source_type`` falls in the bucket for that source.
    embedded — same, restricted to chunks where ``embedding IS NOT NULL``.

Counts per compiler / synthesis output (PM APP DB):
    teams_compiler_total     — ``insight_cards`` rows from the main
                               intelligence compiler
                               (``ai_intelligence_compiler_v0_1``).
    task_extraction_total    — ``tasks`` rows written by the scheduled
                               extractor (``scheduled_task_extraction``).
    insight_extraction_total — ``insight_cards`` rows from secondary
                               compilers (``domain_compiler_v0_1``,
                               ``project-operating-summary-v1``).
    project_intelligence_packets — total ``intelligence_packets``.
"""

from __future__ import annotations

import json
import sys
from typing import Any, Dict, Iterable, Sequence

from src.services.supabase_helpers import get_rag_read_client, get_supabase_client


SYNCED_BUCKETS: Dict[str, Dict[str, Iterable[str]]] = {
    "onedrive": {
        "source_systems": ("onedrive", "sharepoint"),
        "types": (),
        "fallback_types_when_microsoft_graph": ("document",),
    },
    "outlook": {
        "source_systems": ("outlook_email", "outlook_attachment"),
        "types": ("email", "email_attachment"),
    },
    "meetings": {
        "sources": ("fireflies", "zapier"),
        "types": ("meeting", "interview"),
    },
    "teams": {
        "types": ("teams_dm", "teams_dm_conversation", "teams_message"),
    },
}

CHUNK_BUCKETS: Dict[str, Sequence[str]] = {
    "onedrive": ("onedrive_document", "document", "microsoft_graph"),
    "outlook": ("email",),
    "meetings": (
        "meeting_transcript",
        "meeting_segment_summary",
        "meeting_summary",
        "meeting_summary_embed",
        "meeting_section",
        "meeting_notes",
        "zapier",
    ),
    "teams": ("teams_dm", "teams_channel"),
}


def _count_synced(supabase: Any) -> Dict[str, int]:
    """Use a single SQL pass via PostgREST-style filtering to count synced rows
    per bucket. We pull just the discriminator columns and bucket in Python."""

    counts = {key: 0 for key in SYNCED_BUCKETS}
    page_size = 1000
    offset = 0

    while True:
        response = (
            supabase.table("document_metadata")
            .select("source,source_system,type")
            .is_("deleted_at", "null")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        rows = response.data or []
        if not rows:
            break

        for row in rows:
            bucket = _classify_synced(row)
            if bucket:
                counts[bucket] += 1

        if len(rows) < page_size:
            break
        offset += page_size

    return counts


def _classify_synced(row: Dict[str, Any]) -> str | None:
    source = (row.get("source") or "").lower()
    source_system = (row.get("source_system") or "").lower()
    type_value = (row.get("type") or "").lower()

    if source_system in ("onedrive", "sharepoint"):
        return "onedrive"
    if source == "microsoft_graph" and type_value == "document" and not source_system:
        return "onedrive"

    if source_system in ("outlook_email", "outlook_attachment"):
        return "outlook"
    if type_value in ("email", "email_attachment"):
        return "outlook"

    if source in ("fireflies", "zapier") or type_value in ("meeting", "interview"):
        return "meetings"

    if type_value in ("teams_dm", "teams_dm_conversation", "teams_message"):
        return "teams"

    return None


def _count_chunks(rag_client: Any) -> Dict[str, Dict[str, int]]:
    """Aggregate chunk/embedded counts per bucket using ``source_type``."""

    counts = {key: {"chunked_doc_ids": set(), "embedded_doc_ids": set()} for key in CHUNK_BUCKETS}
    type_to_bucket: Dict[str, str] = {}
    for bucket, source_types in CHUNK_BUCKETS.items():
        for source_type in source_types:
            type_to_bucket[source_type] = bucket

    page_size = 1000
    offset = 0
    while True:
        response = (
            rag_client.table("document_chunks")
            .select("document_id,source_type,embedding")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        rows = response.data or []
        if not rows:
            break

        for row in rows:
            bucket = type_to_bucket.get(str(row.get("source_type") or "").lower())
            if not bucket:
                continue
            doc_id = str(row.get("document_id") or "")
            if not doc_id:
                continue
            counts[bucket]["chunked_doc_ids"].add(doc_id)
            if row.get("embedding") is not None:
                counts[bucket]["embedded_doc_ids"].add(doc_id)

        if len(rows) < page_size:
            break
        offset += page_size

    return {
        bucket: {
            "chunked": len(state["chunked_doc_ids"]),
            "embedded": len(state["embedded_doc_ids"]),
        }
        for bucket, state in counts.items()
    }


def _count_table(supabase: Any, table: str, *, filters: Iterable[tuple[str, str, Any]] = ()) -> int:
    query = supabase.table(table).select("id", count="exact").limit(1)
    for column, op, value in filters:
        if op == "eq":
            query = query.eq(column, value)
        elif op == "in":
            query = query.in_(column, value)
        else:
            raise ValueError(f"Unsupported filter op: {op}")
    response = query.execute()
    return int(getattr(response, "count", 0) or 0)


def collect_snapshot() -> Dict[str, Any]:
    supabase = get_supabase_client()
    rag_client = get_rag_read_client()

    synced = _count_synced(supabase)
    chunks = _count_chunks(rag_client)

    per_source: Dict[str, Dict[str, int]] = {}
    for key in ("onedrive", "outlook", "meetings", "teams"):
        per_source[key] = {
            "synced": synced.get(key, 0),
            "chunked": chunks.get(key, {}).get("chunked", 0),
            "embedded": chunks.get(key, {}).get("embedded", 0),
        }

    teams_compiler = _count_table(
        supabase,
        "insight_cards",
        filters=[("compiler_version", "eq", "ai_intelligence_compiler_v0_1")],
    )
    insight_extraction = _count_table(
        supabase,
        "insight_cards",
        filters=[("compiler_version", "in", ["domain_compiler_v0_1", "project-operating-summary-v1"])],
    )
    task_extraction = _count_table(
        supabase,
        "tasks",
        filters=[("extraction_source", "eq", "scheduled_task_extraction")],
    )
    pi_packets = _count_table(supabase, "intelligence_packets")

    return {
        "onedrive_synced": per_source["onedrive"]["synced"],
        "onedrive_chunked": per_source["onedrive"]["chunked"],
        "onedrive_embedded": per_source["onedrive"]["embedded"],
        "outlook_synced": per_source["outlook"]["synced"],
        "outlook_chunked": per_source["outlook"]["chunked"],
        "outlook_embedded": per_source["outlook"]["embedded"],
        "meetings_synced": per_source["meetings"]["synced"],
        "meetings_chunked": per_source["meetings"]["chunked"],
        "meetings_embedded": per_source["meetings"]["embedded"],
        "teams_synced": per_source["teams"]["synced"],
        "teams_chunked": per_source["teams"]["chunked"],
        "teams_embedded": per_source["teams"]["embedded"],
        "teams_compiler_total": teams_compiler,
        "task_extraction_total": task_extraction,
        "insight_extraction_total": insight_extraction,
        "project_intelligence_packets": pi_packets,
        "notes": {
            "source_breakdown": per_source,
            "compiler_breakdown": {
                "teams_compiler": teams_compiler,
                "task_extraction": task_extraction,
                "insight_extraction": insight_extraction,
                "project_intelligence_packets": pi_packets,
            },
            "filters_version": "v1",
        },
    }


def write_snapshot(row: Dict[str, Any]) -> Dict[str, Any]:
    supabase = get_supabase_client()
    response = supabase.table("rag_pipeline_snapshots").insert(row).execute()
    inserted = (response.data or [None])[0]
    return inserted or {}


def run_rag_snapshot() -> Dict[str, Any]:
    row = collect_snapshot()
    inserted = write_snapshot(row)
    return {
        "status": "ok",
        "inserted_id": inserted.get("id"),
        "captured_at": inserted.get("captured_at"),
        "row": row,
    }


def main() -> int:
    try:
        result = run_rag_snapshot()
    except Exception as exc:
        print(json.dumps({"status": "error", "error": str(exc)}, indent=2))
        return 1
    print(json.dumps(result, indent=2, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(main())
