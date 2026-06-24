#!/usr/bin/env python3
"""Create app document_metadata rows for assigned Outlook RAG-only emails.

The intelligence compiler is intentionally app-catalog first: it reads
``document_metadata`` and then joins RAG content by the same id. Outlook sync can
leave valid, embedded ``rag_document_metadata`` rows without the matching app
catalog row. This bounded bridge makes those rows compiler-eligible without
guessing project assignments.
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable

import psycopg2
from psycopg2.extras import Json
from dotenv import load_dotenv

from src.services.ops.db_pressure_guard import enforce_app_db_pressure_guard
from src.services.supabase_helpers import (
    get_outlook_intake_write_client,
    get_rag_read_client,
    get_supabase_client,
)


APP_DOCUMENT_FIELDS = {
    "id",
    "title",
    "source",
    "source_system",
    "source_item_id",
    "project_id",
    "date",
    "category",
    "type",
    "document_type",
    "url",
    "source_web_url",
    "storage_bucket",
    "file_path",
    "file_name",
    "status",
    "source_metadata",
    "created_at",
}

APP_DOCUMENT_COLUMNS = [
    "id",
    "title",
    "source",
    "source_system",
    "source_item_id",
    "project_id",
    "date",
    "category",
    "type",
    "document_type",
    "url",
    "source_web_url",
    "storage_bucket",
    "file_path",
    "file_name",
    "status",
    "source_metadata",
    "created_at",
]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _cutoff(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=max(1, days))).isoformat()


def _chunks(values: list[str], size: int) -> Iterable[list[str]]:
    for index in range(0, len(values), size):
        yield values[index : index + size]


def _coerce_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _source_metadata(row: dict[str, Any]) -> dict[str, Any]:
    metadata = row.get("source_metadata")
    if not isinstance(metadata, dict):
        metadata = {}
    bridge = dict(metadata.get("app_document_bridge") or {})
    bridge.update(
        {
            "status": "created_from_rag_metadata",
            "script": "backfill_outlook_rag_metadata_to_app_documents.py",
            "updated_at": _utc_now(),
        }
    )
    return {**metadata, "app_document_bridge": bridge}


def _app_payload(row: dict[str, Any]) -> dict[str, Any]:
    document_id = str(row.get("id") or row.get("app_document_id") or "")
    project_id = _coerce_int(row.get("project_id"))
    storage_path = row.get("storage_path") or row.get("source_path")
    status = row.get("parsing_status") or "raw_ingested"
    payload = {
        "id": document_id,
        "title": row.get("title") or "Outlook email",
        "source": row.get("source") or "microsoft_graph",
        "source_system": row.get("source_system") or "outlook_email",
        "source_item_id": row.get("source_item_id"),
        "project_id": project_id,
        "date": row.get("created_at"),
        "category": row.get("category") or "email",
        "type": row.get("type") or "email",
        "document_type": row.get("document_type"),
        "url": row.get("url") or row.get("source_web_url"),
        "source_web_url": row.get("source_web_url") or row.get("url"),
        "storage_bucket": row.get("storage_bucket"),
        "file_path": storage_path,
        "file_name": row.get("file_name"),
        "status": status,
        "source_metadata": _source_metadata(row),
        "created_at": row.get("created_at") or _utc_now(),
    }
    return {key: value for key, value in payload.items() if key in APP_DOCUMENT_FIELDS and value is not None}


def _fetch_candidate_rows(*, days: int, limit: int, require_project: bool) -> list[dict[str, Any]]:
    rag = get_rag_read_client()
    query = (
        rag.table("rag_document_metadata")
        .select(
            "id,app_document_id,title,type,category,document_type,source,source_system,"
            "source_item_id,project_id,created_at,updated_at,source_web_url,url,"
            "storage_bucket,storage_path,file_name,parsing_status,embedding_status,source_metadata"
        )
        .eq("source", "microsoft_graph")
        .or_("id.like.outlook_%,type.eq.email,category.eq.email,source_system.eq.outlook_email")
        .gte("updated_at", _cutoff(days))
        .order("updated_at", desc=True)
        .limit(max(1, min(limit, 2000)))
    )
    if require_project:
        query = query.not_.is_("project_id", "null")
    return query.execute().data or []


def _existing_app_ids(ids: list[str]) -> set[str]:
    app = get_supabase_client()
    found: set[str] = set()
    for batch in _chunks(ids, 100):
        rows = app.table("document_metadata").select("id").in_("id", batch).execute().data or []
        found.update(str(row.get("id")) for row in rows if row.get("id"))
    return found


def _app_database_url() -> str:
    database_url = os.getenv("APP_DATABASE_URL") or os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
    if not database_url:
        raise RuntimeError("APP_DATABASE_URL, DATABASE_URL, or SUPABASE_DB_URL is required for app metadata bridge writes")
    return database_url


def _sql_value(payload: dict[str, Any], column: str) -> Any:
    value = payload.get(column)
    if column == "source_metadata":
        return Json(value or {})
    return value


def _upsert_app_documents_sql(payloads: list[dict[str, Any]]) -> list[str]:
    if not payloads:
        return []
    enforce_app_db_pressure_guard("outlook_rag_app_metadata_bridge")
    placeholders = ", ".join(["%s"] * len(APP_DOCUMENT_COLUMNS))
    columns_sql = ", ".join(APP_DOCUMENT_COLUMNS)
    updates_sql = ", ".join(
        f"{column} = excluded.{column}"
        for column in APP_DOCUMENT_COLUMNS
        if column not in {"id", "created_at"}
    )
    sql = f"""
        insert into public.document_metadata ({columns_sql})
        values ({placeholders})
        on conflict (id) do update set
          {updates_sql},
          created_at = coalesce(public.document_metadata.created_at, excluded.created_at)
        returning id
    """
    inserted: list[str] = []
    connection = None
    try:
        connection = psycopg2.connect(_app_database_url(), connect_timeout=5, sslmode="require")
        connection.autocommit = False
        with connection.cursor() as cursor:
            cursor.execute("set statement_timeout = %s", (15000,))
            cursor.execute("set local app.allow_outlook_ingestion_write = 'true'")
            for payload in payloads:
                cursor.execute(sql, tuple(_sql_value(payload, column) for column in APP_DOCUMENT_COLUMNS))
                row = cursor.fetchone()
                if row and row[0]:
                    inserted.append(str(row[0]))
        connection.commit()
    except Exception:
        if connection is not None:
            connection.rollback()
        raise
    finally:
        if connection is not None:
            connection.close()
    return inserted


def _update_intake_links(rows: list[dict[str, Any]]) -> dict[str, Any]:
    intake = get_outlook_intake_write_client()
    stats: dict[str, Any] = {"attempted": 0, "updated": 0, "failed": 0, "errors": []}
    for row in rows:
        source_item_id = row.get("source_item_id")
        document_id = row.get("id")
        if not source_item_id or not document_id:
            continue
        stats["attempted"] += 1
        try:
            response = (
                intake.table("outlook_email_intake")
                .update(
                    {
                        "document_metadata_id": document_id,
                        "vectorization_status": "embedded"
                        if row.get("embedding_status") == "embedded"
                        else "pending",
                        "vectorization_checked_at": _utc_now(),
                        "vectorization_error": None,
                    }
                )
                .eq("graph_message_id", source_item_id)
                .is_("document_metadata_id", "null")
                .execute()
            )
            stats["updated"] += len(response.data or [])
        except Exception as exc:
            stats["failed"] += 1
            if len(stats["errors"]) < 5:
                stats["errors"].append({"id": document_id, "error": str(exc)[:500]})
    return stats


def run(*, days: int, limit: int, apply: bool, require_project: bool) -> dict[str, Any]:
    rows = _fetch_candidate_rows(days=days, limit=limit, require_project=require_project)
    ids = [str(row.get("id")) for row in rows if row.get("id")]
    existing = _existing_app_ids(ids)
    missing = [row for row in rows if row.get("id") and str(row.get("id")) not in existing]
    payloads = [_app_payload(row) for row in missing]
    payloads = [payload for payload in payloads if payload.get("id") and payload.get("project_id")]

    linkable_rows = [row for row in rows if row.get("id") and str(row.get("id")) in existing]
    result: dict[str, Any] = {
        "status": "dry_run",
        "days": days,
        "candidate_rows": len(rows),
        "existing_app_rows": len(existing),
        "missing_app_rows": len(missing),
        "eligible_payloads": len(payloads),
        "created": 0,
        "intake_links": {"attempted": 0, "updated": 0, "failed": 0, "errors": []},
        "sample_ids": [payload["id"] for payload in payloads[:10]],
        "errors": [],
    }
    if not apply:
        return result

    created_rows: list[dict[str, Any]] = []
    for batch in _chunks(payloads, 100):
        if not batch:
            continue
        try:
            created_ids = set(_upsert_app_documents_sql(batch))
            created_rows.extend(payload for payload in batch if str(payload.get("id")) in created_ids)
        except Exception as exc:  # noqa: BLE001 - backfill must report exact batch failure
            result["errors"].append({"batch_first_id": batch[0].get("id"), "error": str(exc)[:1000]})

    result["status"] = "applied"
    result["created"] = len(created_rows)
    created_by_id = {str(row.get("id")): row for row in created_rows if row.get("id")}
    linked_source_rows = linkable_rows + [row for row in missing if str(row.get("id")) in created_by_id]
    result["intake_links"] = _update_intake_links(linked_source_rows)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--days", type=int, default=1, help="RAG updated_at lookback window.")
    parser.add_argument("--limit", type=int, default=250, help="Maximum RAG rows to inspect.")
    parser.add_argument("--apply", choices=["true", "false"], default="false")
    parser.add_argument(
        "--allow-unassigned",
        action="store_true",
        help="Also bridge unassigned rows. Off by default to avoid compiler noise.",
    )
    args = parser.parse_args()

    load_dotenv(".env")
    result = run(
        days=args.days,
        limit=args.limit,
        apply=args.apply == "true",
        require_project=not args.allow_unassigned,
    )
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
