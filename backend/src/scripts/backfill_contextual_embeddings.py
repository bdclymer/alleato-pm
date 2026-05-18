"""Backfill embedding_contextual on document_chunks using Contextual Retrieval.

Targets the AI Database (Supabase project fqcvmfqldlewvbsuxdvz). The migration
20260524000000 must be applied first — it adds the chunk_context,
embedding_contextual, and contextualized_at columns plus the
search_document_chunks_contextual RPC.

Two flavors of context are supported and can be combined:
  --template-only         template header from existing chunk metadata (free,
                          ~$3.50 for the whole dated corpus)
  --with-llm              add a gpt-4.1-nano-generated context paragraph for
                          source types in LLM_CONTEXT_SOURCE_TYPES; processes
                          chunks document-by-document so OpenAI's automatic
                          prompt cache stays warm. Costs ~$0.0005/chunk avg.

Idempotent: only processes rows where embedding_contextual IS NULL. Safe to
rerun. Use --reset-window to wipe and re-do a slice (e.g. after iterating on
the prompt).

Window selection (operates on `metadata->>'file_date'` OR `metadata->>'date'`,
not created_at — we want the file's real date):
  --window-days N         only chunks from the last N days
  --since YYYY-MM-DD      only chunks on/after this date
  --source-types ...      restrict to specific source types
  --project-id N          restrict to a single project
  --limit N               cap the total number of chunks processed

Usage:
  cd backend
  .venv/bin/python src/scripts/backfill_contextual_embeddings.py --dry-run --window-days 30
  .venv/bin/python src/scripts/backfill_contextual_embeddings.py --template-only --window-days 30
  .venv/bin/python src/scripts/backfill_contextual_embeddings.py --template-only --with-llm --window-days 30

Required env: RAG_DATABASE_URL (Postgres connection string for the AI Database;
Supabase dashboard → Project Settings → Database → Connection string → URI).
Optional env: OPENAI_API_KEY (only needed with --with-llm).
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from contextlib import contextmanager
from typing import Iterable

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
try:
    from src.services.env_loader import load_env

    load_env()
except Exception:  # noqa: BLE001
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))

import psycopg2  # noqa: E402
import psycopg2.extras  # noqa: E402

from src.services.pipeline.contextualize import (  # noqa: E402
    LLM_CONTEXT_SOURCE_TYPES,
    build_contextualized_text,
    build_template_header,
    generate_llm_context,
)
from src.services.pipeline.llm import batch_embed  # noqa: E402

EMBED_BATCH_SIZE = 128  # OpenAI accepts up to 2048; 128 keeps batch latency reasonable
UPDATE_BATCH_SIZE = 128
MAX_DOC_CHARS_FOR_LLM = 120_000  # cap document text passed to gpt-4.1-nano


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------


@contextmanager
def _connect():
    dsn = os.getenv("RAG_DATABASE_URL")
    if not dsn:
        raise RuntimeError(
            "RAG_DATABASE_URL is required. Get the connection string from the "
            "Supabase dashboard: Project Settings → Database → Connection string → URI."
        )
    conn = psycopg2.connect(dsn, sslmode="require")
    try:
        yield conn
    finally:
        conn.close()


def _candidate_query(
    *,
    window_days: int | None,
    since: str | None,
    source_types: list[str] | None,
    project_id: int | None,
    limit: int | None,
) -> tuple[str, list]:
    where = [
        "dc.embedding_contextual IS NULL",
        "dc.text IS NOT NULL",
        "LENGTH(dc.text) > 0",
    ]
    params: list = []

    date_expr = (
        "COALESCE(dc.metadata->>'file_date', dc.metadata->>'date')"
    )
    if window_days is not None:
        where.append(f"({date_expr})::timestamptz >= NOW() - INTERVAL %s")
        params.append(f"{window_days} days")
    if since:
        where.append(f"({date_expr})::timestamptz >= %s::timestamptz")
        params.append(since)
    # Require *some* date so post-pilot we don't accidentally process undated
    # chunks the same way. If neither window flag is set, we still skip undated.
    where.append(f"{date_expr} IS NOT NULL")

    if source_types:
        where.append("dc.source_type = ANY(%s)")
        params.append(source_types)
    if project_id is not None:
        where.append("NULLIF(dc.metadata->>'project_id','')::bigint = %s")
        params.append(project_id)

    sql = (
        "SELECT dc.chunk_id, dc.document_id, dc.chunk_index, dc.text, "
        "       dc.source_type, dc.metadata "
        "FROM public.document_chunks dc "
        "WHERE " + " AND ".join(where) + " "
        "ORDER BY dc.document_id, dc.chunk_index"
    )
    if limit:
        sql += " LIMIT %s"
        params.append(limit)
    return sql, params


def _reset_window(
    conn,
    *,
    window_days: int | None,
    since: str | None,
    source_types: list[str] | None,
    project_id: int | None,
) -> int:
    where = ["dc.embedding_contextual IS NOT NULL"]
    params: list = []
    date_expr = "COALESCE(dc.metadata->>'file_date', dc.metadata->>'date')"
    if window_days is not None:
        where.append(f"({date_expr})::timestamptz >= NOW() - INTERVAL %s")
        params.append(f"{window_days} days")
    if since:
        where.append(f"({date_expr})::timestamptz >= %s::timestamptz")
        params.append(since)
    if source_types:
        where.append("dc.source_type = ANY(%s)")
        params.append(source_types)
    if project_id is not None:
        where.append("NULLIF(dc.metadata->>'project_id','')::bigint = %s")
        params.append(project_id)

    sql = (
        "UPDATE public.document_chunks dc SET chunk_context=NULL, "
        "embedding_contextual=NULL, contextualized_at=NULL WHERE "
        + " AND ".join(where)
    )
    with conn.cursor() as cur:
        cur.execute(sql, params)
        rowcount = cur.rowcount
    conn.commit()
    return rowcount


def _fetch_document_text(conn, document_id: str, fallback_chunks: list[str]) -> str:
    """Return the best available source text for prompt-caching purposes.

    Prefer rag_document_metadata.content, then raw_text. If both are absent
    (which happens for some sources), fall back to concatenating the chunks
    themselves in order — better than nothing for LLM context.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT content, raw_text FROM public.rag_document_metadata WHERE id = %s",
            (document_id,),
        )
        row = cur.fetchone()
    if row and row[0]:
        return row[0]
    if row and row[1]:
        return row[1]
    return "\n\n".join(fallback_chunks)


# ---------------------------------------------------------------------------
# Per-chunk transform
# ---------------------------------------------------------------------------


def _template_header_for_chunk(chunk: dict) -> str:
    md = chunk.get("metadata") or {}
    participants = md.get("participants")
    if isinstance(participants, str):
        participants = [participants]
    return build_template_header(
        title=md.get("title"),
        file_date=md.get("file_date") or md.get("date"),
        project_id=md.get("project_id"),
        source_type=chunk.get("source_type"),
        participants=participants,
    )


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------


def _group_by_document(rows: list[dict]) -> list[list[dict]]:
    groups: dict[str, list[dict]] = {}
    for row in rows:
        groups.setdefault(row["document_id"], []).append(row)
    return list(groups.values())


def _backfill_template_only(conn, rows: list[dict], stats: dict) -> None:
    """Fast path for template-only mode: batch chunks across documents.

    The per-document loop in `backfill()` exists so OpenAI prompt caching can
    work for `--with-llm`. Without LLM there's no benefit to per-doc grouping
    and a lot of overhead — most docs have 1-3 chunks, so per-doc means one
    API round trip per few chunks. This batches up to EMBED_BATCH_SIZE chunks
    across documents per embedding call, which is 30-100× faster.
    """
    total = len(rows)
    for batch_start in range(0, total, EMBED_BATCH_SIZE):
        batch_rows = rows[batch_start : batch_start + EMBED_BATCH_SIZE]
        update_rows: list[tuple[str, list[float], str]] = []
        texts: list[str] = []
        for chunk in batch_rows:
            template_header = _template_header_for_chunk(chunk)
            contextualized_text = build_contextualized_text(
                chunk_text=chunk["text"] or "",
                template_header=template_header,
                llm_context=None,
            )
            texts.append(contextualized_text)
            # update tuple is filled in after we get the embeddings
            update_rows.append((template_header, None, chunk["chunk_id"]))  # type: ignore[arg-type]

        try:
            embeddings = batch_embed(texts)
        except Exception as exc:  # noqa: BLE001
            logger.error("Embedding batch failed: %s", exc)
            stats["errors"] += len(batch_rows)
            continue

        # Replace the None placeholders with actual embeddings.
        update_rows = [
            (header, emb, chunk_id)
            for (header, _placeholder, chunk_id), emb in zip(
                update_rows, embeddings, strict=True
            )
        ]

        with conn.cursor() as cur:
            psycopg2.extras.execute_batch(
                cur,
                "UPDATE public.document_chunks SET "
                "chunk_context=%s, embedding_contextual=%s::halfvec, "
                "contextualized_at=NOW() WHERE chunk_id=%s",
                update_rows,
                page_size=UPDATE_BATCH_SIZE,
            )
        conn.commit()

        stats["processed"] += len(batch_rows)
        stats["updated"] += len(update_rows)

        if batch_start // EMBED_BATCH_SIZE % 10 == 0:
            pct = 100.0 * stats["processed"] / total
            logger.info(
                "Progress: %d / %d (%.1f%%) errors=%d",
                stats["processed"], total, pct, stats["errors"],
            )


def backfill(args) -> dict:
    stats = {
        "candidates": 0,
        "processed": 0,
        "updated": 0,
        "llm_calls": 0,
        "llm_prompt_tokens": 0,
        "llm_cached_tokens": 0,
        "llm_completion_tokens": 0,
        "errors": 0,
    }

    with _connect() as conn:
        if args.reset_window:
            n = _reset_window(
                conn,
                window_days=args.window_days,
                since=args.since,
                source_types=args.source_types,
                project_id=args.project_id,
            )
            logger.info("Reset embedding_contextual on %d existing rows in window", n)

        sql, params = _candidate_query(
            window_days=args.window_days,
            since=args.since,
            source_types=args.source_types,
            project_id=args.project_id,
            limit=args.limit,
        )
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            rows = [dict(r) for r in cur.fetchall()]

        stats["candidates"] = len(rows)
        logger.info("Fetched %d candidate chunks", len(rows))
        if not rows:
            return stats

        if args.dry_run:
            logger.info("DRY RUN — would process %d chunks across %d documents",
                        len(rows), len({r['document_id'] for r in rows}))
            return stats

        # Fast path: template-only with no LLM. Batch chunks across documents
        # so we don't pay an API round trip for every small doc.
        if not args.with_llm:
            _backfill_template_only(conn, rows, stats)
            return stats

        # LLM path: process document-by-document so OpenAI's automatic prompt
        # cache stays warm across all chunks of a single document.
        for doc_chunks in _group_by_document(rows):
            doc_id = doc_chunks[0]["document_id"]
            use_llm = args.with_llm and any(
                c.get("source_type") in LLM_CONTEXT_SOURCE_TYPES for c in doc_chunks
            )
            document_text = (
                _fetch_document_text(
                    conn, doc_id, [c["text"] or "" for c in doc_chunks]
                )[:MAX_DOC_CHARS_FOR_LLM]
                if use_llm
                else ""
            )

            # Build contextualized texts.
            contextualized: list[tuple[dict, str, str]] = []  # (chunk, chunk_context, contextualized_text)
            for chunk in doc_chunks:
                template_header = _template_header_for_chunk(chunk) if args.template_only or args.with_llm else ""
                llm_ctx: str | None = None
                if (
                    args.with_llm
                    and chunk.get("source_type") in LLM_CONTEXT_SOURCE_TYPES
                    and document_text
                ):
                    try:
                        llm_ctx, usage = generate_llm_context(
                            document_text=document_text,
                            chunk_text=chunk["text"] or "",
                        )
                        stats["llm_calls"] += 1
                        stats["llm_prompt_tokens"] += usage["prompt_tokens"]
                        stats["llm_cached_tokens"] += usage["cached_tokens"]
                        stats["llm_completion_tokens"] += usage["completion_tokens"]
                    except Exception as exc:  # noqa: BLE001
                        logger.warning("LLM context failed for chunk %s: %s", chunk["chunk_id"], exc)
                        stats["errors"] += 1

                chunk_context_text = template_header
                if llm_ctx:
                    chunk_context_text = (
                        f"{template_header}\n\nContext: {llm_ctx}" if template_header
                        else f"Context: {llm_ctx}"
                    )
                contextualized_text = build_contextualized_text(
                    chunk_text=chunk["text"] or "",
                    template_header=template_header,
                    llm_context=llm_ctx,
                )
                contextualized.append((chunk, chunk_context_text, contextualized_text))

            # Batch-embed the contextualized texts.
            for batch_start in range(0, len(contextualized), EMBED_BATCH_SIZE):
                batch = contextualized[batch_start : batch_start + EMBED_BATCH_SIZE]
                texts = [t for _, _, t in batch]
                try:
                    embeddings = batch_embed(texts)
                except Exception as exc:  # noqa: BLE001
                    logger.error("Embedding batch failed: %s", exc)
                    stats["errors"] += len(batch)
                    continue

                # Write back.
                update_rows = []
                for (chunk, chunk_context_text, _), emb in zip(batch, embeddings, strict=True):
                    update_rows.append(
                        (chunk_context_text, emb, chunk["chunk_id"])
                    )

                with conn.cursor() as cur:
                    psycopg2.extras.execute_batch(
                        cur,
                        "UPDATE public.document_chunks SET "
                        "chunk_context=%s, embedding_contextual=%s::halfvec, "
                        "contextualized_at=NOW() WHERE chunk_id=%s",
                        update_rows,
                        page_size=UPDATE_BATCH_SIZE,
                    )
                conn.commit()
                stats["updated"] += len(update_rows)
                stats["processed"] += len(batch)

            if stats["processed"] % 200 < EMBED_BATCH_SIZE:
                logger.info(
                    "Progress: processed=%d updated=%d llm_calls=%d cached_tokens=%d errors=%d",
                    stats["processed"], stats["updated"], stats["llm_calls"],
                    stats["llm_cached_tokens"], stats["errors"],
                )

    return stats


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--template-only", action="store_true",
                        help="Prepend deterministic template header before embedding")
    parser.add_argument("--with-llm", action="store_true",
                        help="Also call gpt-4.1-nano for LLM-generated context")
    parser.add_argument("--window-days", type=int, default=None)
    parser.add_argument("--since", type=str, default=None,
                        help="ISO date — only chunks on/after this")
    parser.add_argument("--source-types", nargs="+", default=None)
    parser.add_argument("--project-id", type=int, default=None)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--reset-window", action="store_true",
                        help="Wipe embedding_contextual in the selected window first")
    args = parser.parse_args()

    if not args.template_only and not args.with_llm:
        parser.error("specify --template-only and/or --with-llm")

    started = time.time()
    stats = backfill(args)
    elapsed = time.time() - started

    logger.info("=" * 60)
    logger.info("DONE in %.1fs", elapsed)
    logger.info("Stats: %s", json.dumps(stats, indent=2))
    if stats["llm_calls"]:
        # gpt-4.1-nano: $0.10/1M input, $0.025/1M cached, $0.40/1M output
        uncached = stats["llm_prompt_tokens"] - stats["llm_cached_tokens"]
        cost = (
            uncached / 1_000_000 * 0.10
            + stats["llm_cached_tokens"] / 1_000_000 * 0.025
            + stats["llm_completion_tokens"] / 1_000_000 * 0.40
        )
        cache_rate = (
            stats["llm_cached_tokens"] / stats["llm_prompt_tokens"]
            if stats["llm_prompt_tokens"]
            else 0.0
        )
        logger.info("LLM cost: $%.4f  cache hit rate: %.1f%%", cost, cache_rate * 100)
    return 0 if stats["errors"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
