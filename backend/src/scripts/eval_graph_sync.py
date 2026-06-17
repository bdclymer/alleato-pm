#!/usr/bin/env python3
"""
Microsoft Graph Sync Evaluation Script

Tests whether Microsoft Graph sync (Outlook email, Teams messages, Teams DMs,
and OneDrive files) is working correctly by checking:

  1. Sync infrastructure   — graph_sync_state table has entries for all four sources
  2. Recency               — last_sync_at within the last 2 hours
  3. Sync status           — sync_status is "success", not "error"
  4. Items synced          — items_synced > 0 for at least some sources
  5. Chunks exist          — document_chunks has rows for each source type
  6. Embeddings exist      — chunks have non-null embeddings
  7. RAG retrieval per source — vector search hits email/teams/onedrive chunks
  8. Sync API endpoint     — POST /api/graph/sync returns success

Usage:
  cd backend && .venv/bin/python src/scripts/eval_graph_sync.py
  cd backend && .venv/bin/python src/scripts/eval_graph_sync.py --verbose
  cd backend && .venv/bin/python src/scripts/eval_graph_sync.py --output /tmp/graph-sync-eval.json
  cd backend && .venv/bin/python src/scripts/eval_graph_sync.py --skip-api-call
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

import requests
from dotenv import load_dotenv

# Load env from project root — same pattern as rag_e2e_eval.py
load_dotenv(os.path.join(os.path.dirname(__file__), "../../../.env"))

from openai import OpenAI
from supabase import create_client, ClientOptions

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

GRAPH_SYNC_API_URL = "https://alleato-backend-rbnj.onrender.com/api/graph/sync"

# Source types in graph_sync_state table (the `source` column)
SYNC_STATE_SOURCE_TYPES = [
    "outlook_email",
    "teams_message",
    "teams_chat",
    "onedrive_file",
]

# Mapping from graph_sync_state source -> document_chunks source_type
# These differ because the ingestion pipeline normalizes names differently
SYNC_TO_CHUNK_SOURCE = {
    "outlook_email": "email",          # Emails stored as "email" in document_chunks
    "teams_message": "teams_message",   # Matches 1:1
    "teams_chat": "teams_message",      # DMs also stored as teams_message
    "onedrive_file": "onedrive_document",  # OneDrive stored as "onedrive_document"
}

# Unique chunk source types to check (deduplicated from the mapping above)
CHUNK_SOURCE_TYPES = list(set(SYNC_TO_CHUNK_SOURCE.values()))

# Maximum age (in hours) for a sync to be considered "recent"
MAX_SYNC_AGE_HOURS = 2

# Minimum similarity threshold for RAG retrieval checks
RAG_SIMILARITY_THRESHOLD = 0.15

# RAG eval questions: one per source type, using actual document_chunks source_type values
RAG_EVAL_QUESTIONS: List[Dict[str, Any]] = [
    {
        "id": 1,
        "question": "What emails has Brandon sent about budget concerns or cost overruns on projects?",
        "expected_source_type": "email",
        "description": "Should hit email chunks from Outlook sync",
    },
    {
        "id": 2,
        "question": "What was discussed in the Alleato Group Teams channel?",
        "expected_source_type": "teams_message",
        "description": "Should hit teams_message chunks",
    },
    {
        "id": 3,
        "question": "What scope of work documents or clarification templates do we have from OneDrive?",
        "expected_source_type": "onedrive_document",
        "description": "Should hit onedrive_document chunks",
    },
    {
        "id": 4,
        "question": "What construction submittal documents or PDF specifications are stored in our files?",
        "expected_source_type": "onedrive_document",
        "description": "Should hit onedrive_document chunks (SOWs, submittals, specs)",
    },
]


# ---------------------------------------------------------------------------
# Data classes for structured results
# ---------------------------------------------------------------------------


@dataclass
class CheckResult:
    name: str
    passed: bool
    detail: str
    warning: bool = False  # True = non-fatal issue worth noting


@dataclass
class SyncStateRow:
    source_type: str
    last_sync_at: Optional[str]
    sync_status: Optional[str]
    items_synced: Optional[int]
    error_message: Optional[str]


@dataclass
class RagCheckResult:
    question_id: int
    question: str
    expected_source_type: str
    chunks_returned: int
    top_similarity: float
    top_source_types: List[str]
    expected_source_hit: bool
    latency_ms: float
    error: Optional[str] = None


@dataclass
class EvalReport:
    timestamp: str
    checks: List[CheckResult] = field(default_factory=list)
    rag_results: List[RagCheckResult] = field(default_factory=list)
    passed: int = 0
    failed: int = 0
    warnings: int = 0
    total_duration_ms: float = 0.0


# ---------------------------------------------------------------------------
# Client initialization
# ---------------------------------------------------------------------------


def get_clients() -> Tuple[Any, Any, OpenAI]:
    """Initialize PM APP, AI DB, and OpenAI clients from environment variables."""
    supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")
    rag_supabase_url = os.environ.get("RAG_SUPABASE_URL") or supabase_url
    rag_supabase_key = (
        os.environ.get("RAG_SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("RAG_SUPABASE_SERVICE_KEY")
        or supabase_key
    )
    openai_key = os.environ.get("OPENAI_API_KEY")

    if not supabase_url:
        logger.error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL in .env")
        sys.exit(1)
    if not supabase_key:
        logger.error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY in .env")
        sys.exit(1)
    if not rag_supabase_url:
        logger.error("Missing RAG_SUPABASE_URL (or SUPABASE_URL fallback) in .env")
        sys.exit(1)
    if not rag_supabase_key:
        logger.error("Missing RAG_SUPABASE_SERVICE_ROLE_KEY or RAG_SUPABASE_SERVICE_KEY in .env")
        sys.exit(1)
    if not openai_key:
        logger.error("Missing OPENAI_API_KEY in .env")
        sys.exit(1)

    options = ClientOptions(postgrest_client_timeout=60)
    supabase_client = create_client(supabase_url, supabase_key, options)
    rag_supabase_client = create_client(rag_supabase_url, rag_supabase_key, options)
    openai_client = OpenAI(api_key=openai_key)
    return supabase_client, rag_supabase_client, openai_client


# ---------------------------------------------------------------------------
# Check 1 & 2 & 3 & 4: graph_sync_state inspection
# ---------------------------------------------------------------------------


def fetch_sync_state(rag_supabase) -> List[SyncStateRow]:
    """Fetch all rows from graph_sync_state table."""
    try:
        result = rag_supabase.table("graph_sync_state").select(
            "source, last_sync_at, sync_status, items_synced, error_message"
        ).execute()
        rows = []
        for row in (result.data or []):
            rows.append(SyncStateRow(
                source_type=row.get("source", ""),
                last_sync_at=row.get("last_sync_at"),
                sync_status=row.get("sync_status"),
                items_synced=row.get("items_synced"),
                error_message=row.get("error_message"),
            ))
        return rows
    except Exception as exc:
        logger.warning(f"Could not query graph_sync_state: {exc}")
        return []


def check_sync_infrastructure(sync_rows: List[SyncStateRow]) -> List[CheckResult]:
    """
    Check 1: All four expected source types have entries in graph_sync_state.
    """
    found_source_types = {row.source_type for row in sync_rows}
    missing_source_types = [st for st in SYNC_STATE_SOURCE_TYPES if st not in found_source_types]

    if missing_source_types:
        return [CheckResult(
            name="sync_infrastructure",
            passed=False,
            detail=(
                f"Missing sync state entries for: {', '.join(missing_source_types)}. "
                f"Found: {', '.join(sorted(found_source_types)) or '(none)'}. "
                "The graph_sync_state table must have a row for each source type."
            ),
        )]

    return [CheckResult(
        name="sync_infrastructure",
        passed=True,
        detail=f"All {len(SYNC_STATE_SOURCE_TYPES)} expected source types present in graph_sync_state.",
    )]


def check_sync_recency(sync_rows: List[SyncStateRow]) -> List[CheckResult]:
    """
    Check 2: last_sync_at is within the last MAX_SYNC_AGE_HOURS hours for each source.
    """
    results = []
    now_utc = datetime.now(timezone.utc)
    cutoff = now_utc - timedelta(hours=MAX_SYNC_AGE_HOURS)

    for source_type in SYNC_STATE_SOURCE_TYPES:
        matching_rows = [r for r in sync_rows if r.source_type == source_type]
        if not matching_rows:
            results.append(CheckResult(
                name=f"recency_{source_type}",
                passed=False,
                detail=f"No sync state row found for {source_type} — cannot check recency.",
            ))
            continue

        row = matching_rows[0]
        if not row.last_sync_at:
            results.append(CheckResult(
                name=f"recency_{source_type}",
                passed=False,
                detail=f"{source_type}: last_sync_at is NULL — sync has never completed.",
            ))
            continue

        # Parse ISO timestamp (Supabase returns UTC strings)
        try:
            last_sync_str = row.last_sync_at
            # Handle both "Z" and "+00:00" suffixes
            if last_sync_str.endswith("Z"):
                last_sync_str = last_sync_str[:-1] + "+00:00"
            last_sync_dt = datetime.fromisoformat(last_sync_str)
            if last_sync_dt.tzinfo is None:
                last_sync_dt = last_sync_dt.replace(tzinfo=timezone.utc)
        except (ValueError, AttributeError) as exc:
            results.append(CheckResult(
                name=f"recency_{source_type}",
                passed=False,
                detail=f"{source_type}: Could not parse last_sync_at='{row.last_sync_at}': {exc}",
            ))
            continue

        age_hours = (now_utc - last_sync_dt).total_seconds() / 3600
        if last_sync_dt < cutoff:
            results.append(CheckResult(
                name=f"recency_{source_type}",
                passed=False,
                detail=(
                    f"{source_type}: Last sync was {age_hours:.1f}h ago "
                    f"(at {row.last_sync_at}). Expected within {MAX_SYNC_AGE_HOURS}h."
                ),
            ))
        else:
            results.append(CheckResult(
                name=f"recency_{source_type}",
                passed=True,
                detail=(
                    f"{source_type}: Last sync {age_hours:.1f}h ago "
                    f"(at {row.last_sync_at}). Within {MAX_SYNC_AGE_HOURS}h threshold."
                ),
            ))

    return results


def check_sync_statuses(sync_rows: List[SyncStateRow]) -> List[CheckResult]:
    """
    Check 3: sync_status is "success" for all sources (not "error").
    """
    results = []
    for source_type in SYNC_STATE_SOURCE_TYPES:
        matching_rows = [r for r in sync_rows if r.source_type == source_type]
        if not matching_rows:
            results.append(CheckResult(
                name=f"sync_status_{source_type}",
                passed=False,
                detail=f"No sync state row found for {source_type}.",
            ))
            continue

        row = matching_rows[0]
        status = row.sync_status or "(null)"
        if status == "success":
            results.append(CheckResult(
                name=f"sync_status_{source_type}",
                passed=True,
                detail=f"{source_type}: sync_status = 'success'.",
            ))
        elif status == "running":
            results.append(CheckResult(
                name=f"sync_status_{source_type}",
                passed=True,
                detail=f"{source_type}: sync_status = 'running' (sync in progress).",
                warning=True,
            ))
        else:
            error_msg = row.error_message or "(no error message)"
            results.append(CheckResult(
                name=f"sync_status_{source_type}",
                passed=False,
                detail=(
                    f"{source_type}: sync_status = '{status}'. "
                    f"Error: {error_msg[:200]}"
                ),
            ))

    return results


def check_items_synced(sync_rows: List[SyncStateRow]) -> List[CheckResult]:
    """
    Check 4: items_synced > 0 for at least some sources.
    Returns individual per-source results plus an aggregate check.
    """
    results = []
    sources_with_items = []

    for source_type in SYNC_STATE_SOURCE_TYPES:
        matching_rows = [r for r in sync_rows if r.source_type == source_type]
        if not matching_rows:
            results.append(CheckResult(
                name=f"items_synced_{source_type}",
                passed=False,
                detail=f"No sync state row found for {source_type}.",
            ))
            continue

        row = matching_rows[0]
        count = row.items_synced or 0
        if count > 0:
            sources_with_items.append(source_type)
            results.append(CheckResult(
                name=f"items_synced_{source_type}",
                passed=True,
                detail=f"{source_type}: {count:,} items synced.",
            ))
        else:
            results.append(CheckResult(
                name=f"items_synced_{source_type}",
                passed=False,
                detail=f"{source_type}: items_synced = {count}. No content has been synced yet.",
                warning=True,  # Warning rather than hard failure — might be first sync
            ))

    # Aggregate: at least one source must have items
    results.append(CheckResult(
        name="items_synced_aggregate",
        passed=len(sources_with_items) > 0,
        detail=(
            f"{len(sources_with_items)}/{len(SYNC_STATE_SOURCE_TYPES)} sources have items_synced > 0: "
            f"{', '.join(sources_with_items) or '(none)'}."
        ),
    ))

    return results


# ---------------------------------------------------------------------------
# Check 5 & 6: document_chunks inspection
# ---------------------------------------------------------------------------


def check_chunks_exist(rag_supabase, verbose: bool = False) -> List[CheckResult]:
    """
    Check 5: document_chunks has rows for each Graph source type.
    Check 6: Chunks have non-null embeddings.
    """
    results = []

    # Use the actual chunk source type names (which differ from sync state names)
    chunk_source_types = CHUNK_SOURCE_TYPES

    for source_type in chunk_source_types:
        try:
            # Count total chunks for this source type
            count_result = (
                rag_supabase.table("document_chunks")
                .select("chunk_id", count="exact")
                .eq("source_type", source_type)
                .execute()
            )
            total_chunks = count_result.count if count_result.count is not None else len(count_result.data or [])

            if total_chunks == 0:
                results.append(CheckResult(
                    name=f"chunks_exist_{source_type}",
                    passed=False,
                    detail=(
                        f"{source_type}: 0 chunks in document_chunks. "
                        "Content has not been ingested and chunked."
                    ),
                ))
                # Can't check embeddings if no chunks
                results.append(CheckResult(
                    name=f"embeddings_exist_{source_type}",
                    passed=False,
                    detail=f"{source_type}: No chunks to check for embeddings.",
                ))
                continue

            results.append(CheckResult(
                name=f"chunks_exist_{source_type}",
                passed=True,
                detail=f"{source_type}: {total_chunks:,} chunks found in document_chunks.",
            ))

            if verbose:
                logger.info(f"    {source_type}: {total_chunks:,} total chunks")

            # Check embeddings: count chunks where embedding IS NOT NULL
            embedded_result = (
                rag_supabase.table("document_chunks")
                .select("chunk_id", count="exact")
                .eq("source_type", source_type)
                .not_.is_("embedding", "null")
                .execute()
            )
            embedded_count = embedded_result.count if embedded_result.count is not None else len(embedded_result.data or [])

            if embedded_count == 0:
                results.append(CheckResult(
                    name=f"embeddings_exist_{source_type}",
                    passed=False,
                    detail=(
                        f"{source_type}: {total_chunks:,} chunks exist but 0 have embeddings. "
                        "Embedding generation has not run or failed."
                    ),
                ))
            else:
                pct_embedded = (embedded_count / total_chunks * 100) if total_chunks > 0 else 0
                embedding_ok = pct_embedded >= 80  # Warn if < 80% embedded
                results.append(CheckResult(
                    name=f"embeddings_exist_{source_type}",
                    passed=True,
                    detail=(
                        f"{source_type}: {embedded_count:,}/{total_chunks:,} chunks have embeddings "
                        f"({pct_embedded:.0f}%)."
                    ),
                    warning=not embedding_ok,
                ))

        except Exception as exc:
            results.append(CheckResult(
                name=f"chunks_exist_{source_type}",
                passed=False,
                detail=f"{source_type}: Query failed — {exc}",
            ))
            results.append(CheckResult(
                name=f"embeddings_exist_{source_type}",
                passed=False,
                detail=f"{source_type}: Skipped due to chunk query failure.",
            ))

    return results


# ---------------------------------------------------------------------------
# Check 7: RAG retrieval per source
# ---------------------------------------------------------------------------


def embed_query(openai_client: OpenAI, query_text: str) -> List[float]:
    """Generate an embedding for a query string using text-embedding-3-large."""
    response = openai_client.embeddings.create(
        model="text-embedding-3-large",
        dimensions=3072,
        input=query_text[:8000],
    )
    return response.data[0].embedding


def search_document_chunks(
    rag_supabase,
    embedding: List[float],
    match_count: int = 10,
    match_threshold: float = RAG_SIMILARITY_THRESHOLD,
    filter_source_types: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Run the search_document_chunks RPC. Falls back to a direct table query
    with Python-side cosine similarity if the RPC is unavailable.
    """
    emb_str = json.dumps(embedding)
    try:
        result = rag_supabase.rpc(
            "search_document_chunks",
            {
                "query_embedding": emb_str,
                "filter_source_types": filter_source_types,
                "filter_project_id": None,
                "match_count": match_count,
                "match_threshold": match_threshold,
            },
        ).execute()
        return result.data or []
    except Exception as rpc_exc:
        logger.warning(f"search_document_chunks RPC failed ({rpc_exc}), falling back to direct query")
        return _fallback_vector_search(rag_supabase, embedding, match_count, match_threshold)


def _fallback_vector_search(
    rag_supabase,
    embedding: List[float],
    match_count: int,
    match_threshold: float,
) -> List[Dict[str, Any]]:
    """Client-side cosine similarity fallback when the RPC is unavailable."""
    try:
        import numpy as np
    except ImportError:
        logger.error("numpy not available for fallback vector search")
        return []

    result = (
        rag_supabase.table("document_chunks")
        .select("chunk_id, source_type, chunk_text, embedding, metadata")
        .not_.is_("embedding", "null")
        .order("created_at", desc=True)
        .limit(500)
        .execute()
    )
    if not result.data:
        return []

    query_vec = np.array(embedding)
    scored_chunks = []
    for row in result.data:
        raw_embedding = row.get("embedding")
        if not raw_embedding:
            continue
        if isinstance(raw_embedding, str):
            row_vec = np.array(json.loads(raw_embedding))
        elif isinstance(raw_embedding, list):
            row_vec = np.array(raw_embedding)
        else:
            continue

        norm_product = np.linalg.norm(query_vec) * np.linalg.norm(row_vec)
        if norm_product == 0:
            continue
        similarity = float(np.dot(query_vec, row_vec) / norm_product)
        if similarity >= match_threshold:
            scored_chunks.append({
                "chunk_id": row.get("chunk_id"),
                "source_type": row.get("source_type", "unknown"),
                "chunk_text": row.get("chunk_text", ""),
                "similarity": round(similarity, 4),
                "doc_metadata": row.get("metadata"),
            })

    scored_chunks.sort(key=lambda c: c["similarity"], reverse=True)
    return scored_chunks[:match_count]


def run_rag_retrieval_checks(
    rag_supabase,
    openai_client: OpenAI,
    verbose: bool = False,
) -> Tuple[List[CheckResult], List[RagCheckResult]]:
    """
    Check 7: Run vector search for each source-specific question and verify
    that the top results include chunks from the expected source type.
    """
    check_results = []
    rag_details = []

    for question_spec in RAG_EVAL_QUESTIONS:
        question_text = question_spec["question"]
        expected_source = question_spec["expected_source_type"]
        question_id = question_spec["id"]

        if verbose:
            logger.info(f"    RAG Q{question_id}: {question_text[:65]}")

        t0 = time.time()
        try:
            embedding = embed_query(openai_client, question_text)
            chunks = search_document_chunks(rag_supabase, embedding, match_count=10)
            latency_ms = (time.time() - t0) * 1000

            similarities = [c.get("similarity", 0.0) for c in chunks]
            top_similarity = similarities[0] if similarities else 0.0
            top_source_types = [c.get("source_type", "unknown") for c in chunks[:5]]
            expected_source_hit = expected_source in top_source_types

            rag_result = RagCheckResult(
                question_id=question_id,
                question=question_text,
                expected_source_type=expected_source,
                chunks_returned=len(chunks),
                top_similarity=round(top_similarity, 4),
                top_source_types=top_source_types,
                expected_source_hit=expected_source_hit,
                latency_ms=round(latency_ms, 1),
            )
            rag_details.append(rag_result)

            if len(chunks) == 0:
                # No chunks returned — likely no data for this source type yet
                check_results.append(CheckResult(
                    name=f"rag_retrieval_{expected_source}",
                    passed=False,
                    detail=(
                        f"RAG Q{question_id} ({expected_source}): 0 chunks returned. "
                        f"Query: '{question_text[:60]}'. "
                        "Either no content has been ingested or similarity threshold is too high."
                    ),
                    warning=True,
                ))
            elif not expected_source_hit:
                check_results.append(CheckResult(
                    name=f"rag_retrieval_{expected_source}",
                    passed=False,
                    detail=(
                        f"RAG Q{question_id} ({expected_source}): {len(chunks)} chunks returned "
                        f"(top sim={top_similarity:.3f}) but none from '{expected_source}'. "
                        f"Top source types: {top_source_types}. "
                        "Content may not be ingested or not semantically close enough."
                    ),
                    warning=True,
                ))
            else:
                check_results.append(CheckResult(
                    name=f"rag_retrieval_{expected_source}",
                    passed=True,
                    detail=(
                        f"RAG Q{question_id} ({expected_source}): {len(chunks)} chunks returned, "
                        f"top sim={top_similarity:.3f}, '{expected_source}' present in top results. "
                        f"({latency_ms:.0f}ms)"
                    ),
                ))

            if verbose:
                status_label = "PASS" if expected_source_hit else "FAIL"
                logger.info(
                    f"      [{status_label}] chunks={len(chunks)} top_sim={top_similarity:.3f} "
                    f"sources={top_source_types[:3]}"
                )

        except Exception as exc:
            latency_ms = (time.time() - t0) * 1000
            rag_details.append(RagCheckResult(
                question_id=question_id,
                question=question_text,
                expected_source_type=expected_source,
                chunks_returned=0,
                top_similarity=0.0,
                top_source_types=[],
                expected_source_hit=False,
                latency_ms=round(latency_ms, 1),
                error=str(exc),
            ))
            check_results.append(CheckResult(
                name=f"rag_retrieval_{expected_source}",
                passed=False,
                detail=f"RAG Q{question_id} ({expected_source}): Exception — {exc}",
            ))

    return check_results, rag_details


# ---------------------------------------------------------------------------
# Check 8: Sync API endpoint
# ---------------------------------------------------------------------------


def check_sync_api_endpoint(verbose: bool = False) -> CheckResult:
    """
    Check 8: POST to the Graph sync API endpoint and verify it returns success.
    """
    if verbose:
        logger.info(f"    Calling POST {GRAPH_SYNC_API_URL}")

    t0 = time.time()
    try:
        response = requests.post(
            GRAPH_SYNC_API_URL,
            timeout=90,
            headers={"Content-Type": "application/json"},
        )
        latency_ms = (time.time() - t0) * 1000

        if response.status_code in (200, 201, 202):
            try:
                body = response.json()
            except ValueError:
                body = {}

            # Check for success indicator — accept any 2xx with a non-error body
            has_error_body = (
                isinstance(body, dict)
                and (body.get("error") or body.get("status") == "error")
            )

            if has_error_body:
                return CheckResult(
                    name="sync_api_endpoint",
                    passed=False,
                    detail=(
                        f"POST {GRAPH_SYNC_API_URL} returned HTTP {response.status_code} "
                        f"but body indicates error: {str(body)[:200]} ({latency_ms:.0f}ms)"
                    ),
                )

            return CheckResult(
                name="sync_api_endpoint",
                passed=True,
                detail=(
                    f"POST {GRAPH_SYNC_API_URL} returned HTTP {response.status_code} "
                    f"in {latency_ms:.0f}ms. Body: {str(body)[:120]}"
                ),
            )

        elif response.status_code == 401:
            return CheckResult(
                name="sync_api_endpoint",
                passed=False,
                detail=(
                    f"POST {GRAPH_SYNC_API_URL} returned HTTP 401 Unauthorized. "
                    "Check API credentials or authentication headers."
                ),
            )
        elif response.status_code == 404:
            return CheckResult(
                name="sync_api_endpoint",
                passed=False,
                detail=(
                    f"POST {GRAPH_SYNC_API_URL} returned HTTP 404. "
                    "The /api/graph/sync endpoint does not exist on this backend."
                ),
            )
        else:
            return CheckResult(
                name="sync_api_endpoint",
                passed=False,
                detail=(
                    f"POST {GRAPH_SYNC_API_URL} returned HTTP {response.status_code} "
                    f"in {latency_ms:.0f}ms. Body: {response.text[:200]}"
                ),
            )

    except requests.exceptions.ConnectionError as exc:
        return CheckResult(
            name="sync_api_endpoint",
            passed=False,
            detail=f"Could not connect to {GRAPH_SYNC_API_URL}: {exc}",
        )
    except requests.exceptions.Timeout:
        return CheckResult(
            name="sync_api_endpoint",
            passed=False,
            detail=f"POST {GRAPH_SYNC_API_URL} timed out after 90s.",
        )
    except Exception as exc:
        return CheckResult(
            name="sync_api_endpoint",
            passed=False,
            detail=f"Unexpected error calling {GRAPH_SYNC_API_URL}: {exc}",
        )


# ---------------------------------------------------------------------------
# Report card printing
# ---------------------------------------------------------------------------


def print_report_card(report: EvalReport) -> None:
    """Print a human-readable pass/fail report card to the console."""
    logger.info("")
    logger.info("=" * 70)
    logger.info("MICROSOFT GRAPH SYNC EVALUATION REPORT")
    logger.info(f"  Timestamp : {report.timestamp}")
    logger.info(f"  Duration  : {report.total_duration_ms:.0f}ms")
    logger.info("=" * 70)

    # Group checks by category prefix
    check_groups: Dict[str, List[CheckResult]] = {}
    for check in report.checks:
        # Derive category from check name prefix (e.g., "sync_infrastructure" -> "Infrastructure")
        if check.name.startswith("sync_infrastructure"):
            group = "1. Sync Infrastructure"
        elif check.name.startswith("recency_"):
            group = "2. Sync Recency (< 2h)"
        elif check.name.startswith("sync_status_"):
            group = "3. Sync Status"
        elif check.name.startswith("items_synced_"):
            group = "4. Items Synced"
        elif check.name.startswith("chunks_exist_"):
            group = "5. Document Chunks"
        elif check.name.startswith("embeddings_exist_"):
            group = "6. Embeddings"
        elif check.name.startswith("rag_retrieval_"):
            group = "7. RAG Retrieval"
        elif check.name.startswith("sync_api_"):
            group = "8. Sync API Endpoint"
        else:
            group = "Other"
        check_groups.setdefault(group, []).append(check)

    for group_name in sorted(check_groups.keys()):
        group_checks = check_groups[group_name]
        group_passed = sum(1 for c in group_checks if c.passed and not c.warning)
        group_warned = sum(1 for c in group_checks if c.warning)
        group_failed = sum(1 for c in group_checks if not c.passed and not c.warning)
        logger.info(f"\n  {group_name}")
        logger.info(f"  {'─' * 50}")
        for check in group_checks:
            if check.passed and not check.warning:
                icon = "PASS"
            elif check.warning:
                icon = "WARN"
            else:
                icon = "FAIL"
            logger.info(f"  [{icon}] {check.detail}")

    # RAG retrieval details
    if report.rag_results:
        logger.info("")
        logger.info("  RAG Retrieval Details:")
        logger.info(f"  {'─' * 50}")
        for rag in report.rag_results:
            hit_label = "HIT " if rag.expected_source_hit else "MISS"
            error_suffix = f" ERROR: {rag.error}" if rag.error else ""
            logger.info(
                f"  [{hit_label}] Q{rag.question_id} ({rag.expected_source_type}): "
                f"chunks={rag.chunks_returned} top_sim={rag.top_similarity:.3f} "
                f"latency={rag.latency_ms:.0f}ms{error_suffix}"
            )
            if rag.top_source_types:
                logger.info(f"         top sources: {rag.top_source_types}")

    # Summary
    logger.info("")
    logger.info("=" * 70)
    overall_pass = report.failed == 0
    status_label = "ALL CHECKS PASSED" if overall_pass else "SOME CHECKS FAILED"
    logger.info(f"  RESULT : {status_label}")
    logger.info(f"  Passed : {report.passed}")
    logger.info(f"  Warnings: {report.warnings}")
    logger.info(f"  Failed : {report.failed}")
    logger.info("=" * 70)
    logger.info("")


# ---------------------------------------------------------------------------
# JSON output
# ---------------------------------------------------------------------------


def save_report(report: EvalReport, output_path: str) -> None:
    """Serialize the report to a JSON file."""
    output = {
        "timestamp": report.timestamp,
        "total_duration_ms": report.total_duration_ms,
        "summary": {
            "passed": report.passed,
            "warnings": report.warnings,
            "failed": report.failed,
            "overall_pass": report.failed == 0,
        },
        "checks": [
            {
                "name": c.name,
                "passed": c.passed,
                "warning": c.warning,
                "detail": c.detail,
            }
            for c in report.checks
        ],
        "rag_retrieval": [
            {
                "question_id": r.question_id,
                "question": r.question,
                "expected_source_type": r.expected_source_type,
                "chunks_returned": r.chunks_returned,
                "top_similarity": r.top_similarity,
                "top_source_types": r.top_source_types,
                "expected_source_hit": r.expected_source_hit,
                "latency_ms": r.latency_ms,
                "error": r.error,
            }
            for r in report.rag_results
        ],
    }

    with open(output_path, "w", encoding="utf-8") as file_handle:
        json.dump(output, file_handle, indent=2, ensure_ascii=False)

    logger.info(f"Full results saved to {output_path}")


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Microsoft Graph Sync Evaluation — checks sync health, chunks, embeddings, and RAG retrieval"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show detailed progress during each check",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="/tmp/graph-sync-eval.json",
        help="Path to write JSON results (default: /tmp/graph-sync-eval.json)",
    )
    parser.add_argument(
        "--skip-api-call",
        action="store_true",
        help="Skip the POST /api/graph/sync endpoint check (useful in CI without backend access)",
    )
    args = parser.parse_args()

    eval_start = time.time()
    report = EvalReport(timestamp=datetime.now(timezone.utc).isoformat())

    logger.info("=" * 70)
    logger.info("MICROSOFT GRAPH SYNC EVALUATION")
    logger.info(f"  Output: {args.output}")
    logger.info("=" * 70)

    # Initialize clients
    _supabase_client, rag_supabase_client, openai_client = get_clients()

    # ── Phase 1: graph_sync_state checks ──────────────────────────────────
    logger.info("\n[Phase 1/4] Checking graph_sync_state table...")
    sync_rows = fetch_sync_state(rag_supabase_client)

    if args.verbose:
        for row in sync_rows:
            logger.info(
                f"  source={row.source_type} status={row.sync_status} "
                f"items={row.items_synced} last_sync={row.last_sync_at}"
            )

    infra_checks = check_sync_infrastructure(sync_rows)
    recency_checks = check_sync_recency(sync_rows)
    status_checks = check_sync_statuses(sync_rows)
    items_checks = check_items_synced(sync_rows)

    report.checks.extend(infra_checks)
    report.checks.extend(recency_checks)
    report.checks.extend(status_checks)
    report.checks.extend(items_checks)

    # ── Phase 2: document_chunks checks ────────────────────────────
    logger.info("\n[Phase 2/4] Checking document_chunks...")
    chunk_checks = check_chunks_exist(rag_supabase_client, verbose=args.verbose)
    report.checks.extend(chunk_checks)

    # ── Phase 3: RAG retrieval checks ─────────────────────────────────────
    logger.info("\n[Phase 3/4] Running RAG retrieval checks...")
    rag_checks, rag_details = run_rag_retrieval_checks(
        rag_supabase_client, openai_client, verbose=args.verbose
    )
    report.checks.extend(rag_checks)
    report.rag_results = rag_details

    # ── Phase 4: Sync API endpoint ─────────────────────────────────────────
    if args.skip_api_call:
        logger.info("\n[Phase 4/4] Skipping sync API endpoint check (--skip-api-call).")
    else:
        logger.info(f"\n[Phase 4/4] Calling POST {GRAPH_SYNC_API_URL}...")
        api_check = check_sync_api_endpoint(verbose=args.verbose)
        report.checks.append(api_check)

    # ── Tally results ───────────────────────────────────────────────────────
    for check in report.checks:
        if check.passed and not check.warning:
            report.passed += 1
        elif check.warning:
            report.warnings += 1
        else:
            report.failed += 1

    report.total_duration_ms = round((time.time() - eval_start) * 1000, 1)

    # ── Print and save ──────────────────────────────────────────────────────
    print_report_card(report)
    save_report(report, args.output)

    # Exit with non-zero code if any hard failures exist
    if report.failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
