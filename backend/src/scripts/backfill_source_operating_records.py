"""Backfill Project Intelligence operating-record rows for source documents.

This script is intentionally bounded and source-id friendly. It runs the same
Stage 4 compiler entrypoint used by ingestion so backfill and production stay
on one path.

Examples:
  PYTHONPATH=backend python3 backend/src/scripts/backfill_source_operating_records.py --id <document_metadata_id>
  PYTHONPATH=backend python3 backend/src/scripts/backfill_source_operating_records.py --limit 5
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv
import psycopg2
import psycopg2.extras

from src.services.intelligence.compiler import process_source_document_to_packet
from src.services.supabase_helpers import get_supabase_client


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _load_env() -> None:
    load_dotenv(_repo_root() / ".env")


def _single_row(response: Any) -> Dict[str, Any]:
    data = getattr(response, "data", None) or []
    return data[0] if data else {}


def _app_database_url() -> str:
    import os

    value = os.getenv("APP_DATABASE_URL") or os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
    if not value:
        raise RuntimeError("APP_DATABASE_URL, DATABASE_URL, or SUPABASE_DB_URL is required for recent source selection.")
    return value


def _recent_source_ids(*, limit: int, recent_days: int) -> List[str]:
    query = """
        select id
        from public.document_metadata
        where project_id is not null
          and coalesce(date, created_at) >= now() - (%s::text || ' days')::interval
          and coalesce(status, '') not in ('deleted', 'deleted_no_transcript', 'archived')
          and lower(coalesce(title, '')) not like '%%upload-test%%'
        order by coalesce(date, created_at) desc nulls last, created_at desc nulls last
        limit %s
    """
    with psycopg2.connect(_app_database_url(), sslmode="require") as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            cursor.execute(query, (recent_days, limit))
            rows = cursor.fetchall()
    return [str(row["id"]) for row in rows if row.get("id")]


def main() -> int:
    parser = argparse.ArgumentParser(description="Backfill source operating-record rows.")
    parser.add_argument("--id", dest="source_ids", action="append", help="Specific document_metadata id to process. May be repeated.")
    parser.add_argument("--ids-json", help="JSON array of document_metadata ids to process.")
    parser.add_argument("--limit", type=int, default=1, help="Recent source count when --id is omitted.")
    parser.add_argument("--recent-days", type=int, default=3, help="Recent source window when ids are omitted.")
    parser.add_argument("--force", action="store_true", help="Force compiler reprocessing.")
    args = parser.parse_args()

    _load_env()
    client = get_supabase_client()
    source_ids = list(args.source_ids or [])
    if args.ids_json:
        parsed_ids = json.loads(args.ids_json)
        if not isinstance(parsed_ids, list) or not all(isinstance(item, str) for item in parsed_ids):
            raise ValueError("--ids-json must be a JSON array of strings.")
        source_ids.extend(parsed_ids)
    if not source_ids:
        source_ids = _recent_source_ids(
            limit=max(1, min(args.limit, 100)),
            recent_days=max(1, min(args.recent_days, 30)),
        )
    source_ids = list(dict.fromkeys(source_ids))
    results = []
    for source_id in source_ids:
        try:
            results.append(
                process_source_document_to_packet(
                    client,
                    source_id,
                    force=args.force,
                    compile_packet=False,
                )
            )
        except Exception as exc:  # noqa: BLE001 - CLI must report every source result.
            results.append(
                {
                    "status": "failed",
                    "source_document_id": source_id,
                    "error": str(exc),
                }
            )

    print(json.dumps({"processed": len(results), "results": results}, indent=2, default=str))
    return 1 if any(row.get("status") == "failed" for row in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
