"""Supabase helpers for the Alleato backend.

This module centralizes creation of the Supabase client and provides a thin
wrapper for common RAG operations (documents, chunks, and storage objects).
The implementation intentionally avoids hard-coding secrets—set the following
environment variables before importing this module:

* ``SUPABASE_URL`` – project URL, e.g. https://xyzcompany.supabase.co
* ``SUPABASE_SERVICE_ROLE_KEY`` – preferred for server-side use. Falls back to
  ``SUPABASE_ANON_KEY`` if the service key is not provided.

The official ``supabase`` Python package must be installed (add it to
``python-backend/requirements.txt``).
"""

from __future__ import annotations

import os
import re
import json
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from typing import Any, Dict, List, Optional

from supabase import Client, create_client

_QUERY_STOPWORDS = {
    "the",
    "a",
    "an",
    "and",
    "or",
    "for",
    "to",
    "of",
    "in",
    "on",
    "at",
    "with",
    "by",
    "from",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "what",
    "which",
    "who",
    "when",
    "where",
    "why",
    "how",
    "need",
    "show",
    "tell",
    "details",
    "detail",
    "about",
}


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Environment variable '{name}' is required for Supabase access")
    return value


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """Return a cached Supabase client instance."""

    url = _require_env("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or _require_env("SUPABASE_ANON_KEY")
    return create_client(url, key)


@dataclass
class DocumentChunk:
    document_id: str
    chunk_index: int
    chunk_id: str
    text: str
    metadata: Dict[str, Any]
    embedding: Optional[List[float]] = None
    content_hash: Optional[str] = None


class SupabaseRagStore:
    """High-level helper for RAG-related Supabase tables."""

    def __init__(self, client: Optional[Client] = None) -> None:
        self._client = client or get_supabase_client()

    # document_metadata -------------------------------------------------
    def upsert_document_metadata(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        response = self._client.table("document_metadata").upsert(metadata).execute()
        return response.data[0] if response.data else metadata

    def upload_public_text(
        self,
        bucket: str,
        path: str,
        content: str,
        content_type: str = "text/markdown; charset=utf-8",
        upsert: bool = True,
    ) -> str:
        data = content.encode("utf-8")
        storage = self._client.storage.from_(bucket)
        if upsert:
            try:
                storage.update(path, data, {"content-type": content_type})
            except Exception:
                storage.upload(path, data, {"content-type": content_type})
        else:
            storage.upload(path, data, {"content-type": content_type})

        return storage.get_public_url(path)

    def fetch_document_metadata(self, document_id: str) -> Optional[Dict[str, Any]]:
        response = (
            self._client.table("document_metadata")
            .select("*")
            .eq("id", document_id)
            .single()
            .execute()
        )
        return response.data

    def find_document_by_hash(self, content_hash: str) -> Optional[Dict[str, Any]]:
        response = (
            self._client.table("document_metadata")
            .select("id", "project_id", "fireflies_id")
            .eq("content_hash", content_hash)
            .limit(1)
            .execute()
        )
        data = response.data or []
        return data[0] if data else None

    def find_document_by_fireflies_id(self, fireflies_id: Optional[str]) -> Optional[Dict[str, Any]]:
        if not fireflies_id:
            return None
        response = (
            self._client.table("document_metadata")
            .select("id", "project_id", "fireflies_id")
            .eq("fireflies_id", fireflies_id)
            .limit(1)
            .execute()
        )
        data = response.data or []
        return data[0] if data else None

    # projects / views --------------------------------------------------
    def list_projects(self) -> List[Dict[str, Any]]:
        response = (
            self._client.table("project_activity_view")
            .select("*")
            .order("project_id")
            .execute()
        )
        return response.data or []

    def get_project(self, project_id: int) -> Optional[Dict[str, Any]]:
        response = (
            self._client.table("project_activity_view")
            .select("*")
            .eq("project_id", project_id)
            .limit(1)
            .execute()
        )
        data = response.data or []
        return data[0] if data else None

    # tasks / insights --------------------------------------------------
    def list_tasks(self, project_id: Optional[int] = None, status: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """List tasks from the unified `tasks` table."""
        query = self._client.table("tasks").select("*").limit(limit)
        if project_id is not None:
            query = query.filter("project_ids", "cs", f"{{{project_id}}}")
        if status:
            query = query.eq("status", status)
        query = query.order("due_date", desc=False)
        response = query.execute()
        return response.data or []

    def upsert_task(self, task: Dict[str, Any]) -> None:
        """Upsert a single task into the unified `tasks` table."""
        if task:
            self._client.table("tasks").upsert(
                task, on_conflict="metadata_id,description"
            ).execute()

    def list_insights(self, project_id: Optional[int] = None, limit: int = 20) -> List[Dict[str, Any]]:
        query = self._client.table("project_insights").select("*").order("captured_at", desc=True).limit(limit)
        if project_id is not None:
            query = query.eq("project_id", project_id)
        response = query.execute()
        return response.data or []

    def insert_insight(self, insight: Dict[str, Any]) -> None:
        self._client.table("project_insights").insert(insight).execute()

    # document chunks ---------------------------------------------------
    def delete_chunks_for_document(self, document_id: str) -> None:
        self._client.table("document_chunks").delete().eq("document_id", document_id).execute()

    def upsert_chunks(self, chunks: List[DocumentChunk]) -> None:
        if not chunks:
            return
        rows: List[Dict[str, Any]] = []
        for chunk in chunks:
            rows.append(
                {
                    "document_id": chunk.document_id,
                    "chunk_index": chunk.chunk_index,
                    "chunk_id": chunk.chunk_id,
                    "text": chunk.text,
                    "metadata": chunk.metadata,
                    "content_hash": chunk.content_hash,
                    **({"embedding": chunk.embedding} if chunk.embedding is not None else {}),
                }
            )
        self._client.table("document_chunks").upsert(rows).execute()

    def query_chunks(self, filters: Dict[str, Any], limit: int = 20) -> List[Dict[str, Any]]:
        query = self._client.table("document_chunks").select("*").limit(limit)
        for column, value in filters.items():
            if column == "project_id":
                query = query.eq("metadata->>project_id", str(value))
            else:
                query = query.eq(column, value)
        response = query.order("created_at", desc=True).execute()
        return response.data or []

    def search_chunks_by_keyword(
        self,
        keyword: Optional[str],
        project_id: Optional[int] = None,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        # Query the documents table which is populated by the backfill pipeline
        query = self._client.table("documents").select("file_id", "content", "metadata", "project_ids", "created_at")

        # Use project_ids array if available, fallback to metadata for backward compatibility
        if project_id is not None and project_id > 0:
            # Use PostgreSQL array contains operator via PostgREST filter syntax
            query = query.filter("project_ids", "cs", f"{{{project_id}}}")

        if keyword:
            query = query.ilike("content", f"%{keyword}%")
        response = query.order("created_at", desc=True).limit(limit).execute()

        # Transform to match expected format
        results = []
        for doc in (response.data or []):
            results.append({
                'document_id': doc.get('file_id'),
                'text': doc.get('content', ''),
                'metadata': doc.get('metadata', {})
            })
        return results

    def fetch_recent_chunks(self, project_id: Optional[int] = None, limit: int = 5) -> List[Dict[str, Any]]:
        # Query the documents table which is populated by the backfill pipeline
        # Get unique meetings by grouping chunks by file_id
        query = self._client.table("documents").select("file_id", "title", "content", "file_date", "project_id", "project_ids").order("created_at", desc=True).limit(limit * 5)
        # Only filter by project_id if it's a positive integer (not 0 or None)
        # project_id=0 means "show all meetings" including those with null project_id
        if project_id is not None and project_id > 0:
            # Use project_ids array contains operator via PostgREST filter syntax
            query = query.filter("project_ids", "cs", f"{{{project_id}}}")
        response = query.execute()

        # Group by file_id to get unique meetings
        meetings_map = {}
        for doc in (response.data or []):
            file_id = doc.get('file_id')
            if file_id not in meetings_map:
                # Get metadata for this meeting
                metadata_response = self._client.table("document_metadata").select("title", "date", "participants_array", "project_id").eq("id", file_id).limit(1).execute()
                metadata_info = metadata_response.data[0] if metadata_response.data else {}

                meetings_map[file_id] = {
                    'document_id': file_id,
                    'text': doc.get('content', ''),
                    'metadata': {
                        'title': metadata_info.get('title', doc.get('title', 'Untitled')),
                        'date': metadata_info.get('date'),
                        'participants': metadata_info.get('participants_array', []),
                        'project_id': metadata_info.get('project_id')
                    }
                }

        # Return up to limit meetings
        return list(meetings_map.values())[:limit]

    def vector_search(self, query_embedding: List[float], limit: int = 5) -> List[Dict[str, Any]]:
        try:
            response = (
                self._client.rpc(
                    "match_document_chunks",
                    {
                        "query_embedding": query_embedding,
                        "match_count": limit,
                        "match_threshold": 0.5,
                    },
                )
                .execute()
            )
            data = response.data or []
            if data:
                return data
        except Exception:
            pass
        return self.fetch_recent_chunks(limit=limit)

    def vector_search_documents(
        self,
        query_embedding: List[float],
        limit: int = 5,
        project_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Vector search against the documents table embeddings."""
        try:
            filter_payload: Dict[str, Any] = {}
            if project_id is not None:
                filter_payload["project_id"] = project_id

            response = (
                self._client.rpc(
                    "match_documents",
                    {
                        "query_embedding": query_embedding,
                        "match_count": limit,
                        "filter": filter_payload,
                    },
                )
                .execute()
            )
            data = response.data or []
            if data:
                return [
                    {
                        "document_id": row.get("id"),
                        "text": row.get("content", ""),
                        "metadata": row.get("metadata", {}),
                        "similarity": row.get("similarity"),
                    }
                    for row in data
                ]
        except Exception:
            pass
        return []

    def search_financial_rows(
        self,
        query: str,
        project_id: Optional[int] = None,
        limit: int = 10,
        scan_limit: int = 400,
    ) -> List[Dict[str, Any]]:
        """Search normalized financial rows from document_rows.

        This is a structured-first retrieval path intended for finance/tabular
        questions before semantic chunk retrieval.
        """
        raw_tokens = [t.lower() for t in re.findall(r"[A-Za-z0-9$%./-]+", query)]
        tokens: List[str] = []
        seen: set[str] = set()
        for token in raw_tokens:
            cleaned = token.strip()
            if not cleaned:
                continue
            if cleaned.startswith("$"):
                cleaned = cleaned[1:]
            if not cleaned:
                continue
            if cleaned in _QUERY_STOPWORDS:
                continue
            # Keep 2-char quarter markers like q1..q4; otherwise require >=3 chars.
            if len(cleaned) < 3 and not re.match(r"^q[1-4]$", cleaned):
                continue
            if cleaned not in seen:
                seen.add(cleaned)
                tokens.append(cleaned)

        if not tokens:
            return []

        # 1) Get candidate financial datasets from document_metadata.
        meta_query = (
            self._client.table("document_metadata")
            .select("id,title,project_id,category,file_name,captured_at")
            .order("captured_at", desc=True)
            .limit(100)
        )
        if project_id is not None:
            meta_query = meta_query.eq("project_id", project_id)
        meta_rows = meta_query.execute().data or []

        dataset_meta: Dict[str, Dict[str, Any]] = {}
        candidate_ids: List[str] = []
        for row in meta_rows:
            category = (row.get("category") or "").lower()
            file_name = (row.get("file_name") or "").lower()
            if (
                "financial" in category
                or file_name.endswith((".csv", ".tsv", ".xls", ".xlsx"))
                or any(k in file_name for k in ("budget", "estimate", "invoice", "p&l", "balance"))
            ):
                doc_id = row.get("id")
                if doc_id:
                    candidate_ids.append(doc_id)
                    dataset_meta[doc_id] = row

        if not candidate_ids:
            return []

        # 2) Pull normalized rows for candidate datasets.
        row_query = (
            self._client.table("document_rows")
            .select("id,dataset_id,row_data")
            .in_("dataset_id", candidate_ids)
            .order("id", desc=True)
            .limit(scan_limit)
        )
        row_rows = row_query.execute().data or []

        scored: List[Dict[str, Any]] = []
        query_lc = query.lower().strip()
        for row in row_rows:
            dataset_id = row.get("dataset_id")
            row_data = row.get("row_data") or {}
            if not isinstance(row_data, dict):
                continue

            haystack = json.dumps(row_data, default=str).lower()
            token_hits = sum(1 for t in tokens if t in haystack)
            if token_hits == 0:
                continue

            phrase_bonus = 4 if query_lc and query_lc in haystack else 0

            scored.append(
                {
                    "dataset_id": dataset_id,
                    "document": dataset_meta.get(dataset_id, {}),
                    "row_data": row_data,
                    "match_score": token_hits + phrase_bonus,
                }
            )

        scored.sort(key=lambda r: r.get("match_score", 0), reverse=True)
        return scored[:limit]

    # ingestion jobs ----------------------------------------------------
    def start_ingestion_job(self, fireflies_id: Optional[str], content_hash: str) -> Optional[str]:
        payload = {
            "fireflies_id": fireflies_id,
            "content_hash": content_hash,
            "status": "running",
        }
        response = self._client.table("ingestion_jobs").insert(payload).execute()
        data = response.data or []
        return data[0]["id"] if data else None

    def complete_ingestion_job(self, job_id: Optional[str], status: str, error: Optional[str] = None) -> None:
        if not job_id:
            return
        payload = {"status": status, "finished_at": datetime.utcnow().isoformat()}
        if error:
            payload["error"] = error
        self._client.table("ingestion_jobs").update(payload).eq("id", job_id).execute()


__all__ = [
    "DocumentChunk",
    "SupabaseRagStore",
    "get_supabase_client",
]
