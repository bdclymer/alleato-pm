"""
═══════════════════════════════════════════════════════════════════════════
RAG API SERVER - Main FastAPI Application
═══════════════════════════════════════════════════════════════════════════

ROLE: Primary HTTP server for backend project APIs and ingestion endpoints

CONTROLS:
- CORS configuration for frontend access
- Server initialization and middleware setup

DEPENDENCIES:
- src.services.pipeline ingestion pipeline

USED BY: Frontend at http://localhost:8051

═══════════════════════════════════════════════════════════════════════════
"""
from __future__ import annotations

import logging
import os
import re
import threading
from datetime import datetime
from typing import Any, Dict, List, Optional

# Load environment variables from root .env file
from src.services.env_loader import load_env
load_env()

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

from src.services.supabase_helpers import SupabaseRagStore
from src.services.ingestion.fireflies_pipeline import FirefliesIngestionPipeline
from src.services.pipeline import run_full_pipeline
from src.api.admin_endpoints import require_admin_api_key
from src.services.agents.deep_project_intelligence import build_project_status_contract_spike
from src.services.agents.deep_project_intelligence_contracts import (
    DeepProjectIntelligenceRequest,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_openai_client = OpenAI() if (OpenAI and os.getenv("OPENAI_API_KEY")) else None
_PIPELINE_MAX_CONCURRENCY = max(1, int(os.getenv("PIPELINE_MAX_CONCURRENCY", "3")))
_pipeline_semaphore = threading.BoundedSemaphore(_PIPELINE_MAX_CONCURRENCY)
_INTELLIGENCE_COMPILER_MAX_CONCURRENCY = max(
    1,
    int(os.getenv("INTELLIGENCE_COMPILER_MAX_CONCURRENCY", "1")),
)
_intelligence_compiler_semaphore = threading.BoundedSemaphore(
    _INTELLIGENCE_COMPILER_MAX_CONCURRENCY,
)


def _public_backend_error(prefix: str, exc: Exception) -> str:
    message = str(exc)
    lowered = message.lower()
    if "cloudflare" in lowered or "error code 521" in lowered or "code': 521" in lowered:
        return f"{prefix}: Supabase is unavailable (Cloudflare 521 Web server is down)."
    if "error code 522" in lowered or "code': 522" in lowered:
        return f"{prefix}: Supabase timed out (Cloudflare 522 Connection timed out)."
    compact = re.sub(r"<[^>]+>", " ", message)
    compact = re.sub(r"\s+", " ", compact).strip()
    return f"{prefix}: {compact[:500]}"


def _run_pipeline_limited(metadata_id: str) -> None:
    """Run pipeline with bounded in-process concurrency to prevent DB overload."""
    logger.info(
        "[Pipeline] waiting for slot (%s max) metadata_id=%s",
        _PIPELINE_MAX_CONCURRENCY,
        metadata_id,
    )
    with _pipeline_semaphore:
        logger.info("[Pipeline] acquired slot metadata_id=%s", metadata_id)
        run_full_pipeline(metadata_id)
        logger.info("[Pipeline] released slot metadata_id=%s", metadata_id)


def _run_intelligence_compiler_limited(
    job_id: str,
    source_limit: int,
    packet_limit: int,
    max_processing_time_ms: Optional[int],
) -> None:
    """Run queued compiler work with bounded concurrency for admin-triggered batches."""
    from src.services.intelligence.compiler import run_intelligence_compiler_batch
    from src.services.supabase_helpers import get_supabase_client

    logger.info(
        "[IntelligenceCompilerAPI] waiting for slot (%s max) job_id=%s source_limit=%s packet_limit=%s",
        _INTELLIGENCE_COMPILER_MAX_CONCURRENCY,
        job_id,
        source_limit,
        packet_limit,
    )
    with _intelligence_compiler_semaphore:
        logger.info("[IntelligenceCompilerAPI] acquired slot job_id=%s", job_id)
        try:
            client = get_supabase_client()
            result = run_intelligence_compiler_batch(
                client,
                source_limit=source_limit,
                packet_limit=packet_limit,
                max_processing_time_ms=max_processing_time_ms,
            )
            logger.info("[IntelligenceCompilerAPI] completed job_id=%s result=%s", job_id, result)
        except Exception as exc:
            logger.error(
                "[IntelligenceCompilerAPI] background run failed job_id=%s: %s",
                job_id,
                exc,
                exc_info=True,
            )
        finally:
            logger.info("[IntelligenceCompilerAPI] released slot job_id=%s", job_id)

app = FastAPI(
    title="Alleato Procore Backend API",
    description="Backend API for RAG-based chat functionality and agent workflows",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS configuration (adjust as needed for deployment)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    project_id: Optional[int] = None
    limit: int = 5


class IngestRequest(BaseModel):
    path: str
    project_id: Optional[int] = None
    dry_run: bool = True


class FirefliesRecentSyncRequest(BaseModel):
    limit: int = 5
    project_id: Optional[int] = None
    dry_run: bool = False
    write_markdown_dir: Optional[str] = None


class GraphSyncRequest(BaseModel):
    run_embedding: bool = True
    run_teams_compiler: bool = True
    embed_limit: int = 1000
    teams_compiler_batch_size: int = 25


class GraphSubscriptionReconcileRequest(BaseModel):
    renew_within_hours: int = 6
    expiration_hours: int = 48


def get_rag_store() -> SupabaseRagStore:
    return SupabaseRagStore()


def get_ingestion_pipeline(
    store: SupabaseRagStore = Depends(get_rag_store),
) -> FirefliesIngestionPipeline:
    return FirefliesIngestionPipeline(store)


@app.get("/health", tags=["System"], summary="Health check")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint that verifies backend status and AI configuration.
    
    Returns:
        Dict containing health status and AI provider configuration status.
    """
    openai_key = os.getenv("OPENAI_API_KEY")
    gateway_key = os.getenv("AI_GATEWAY_API_KEY")
    openai_configured = bool(openai_key and len(openai_key) > 0)
    ai_gateway_configured = bool(gateway_key and len(gateway_key) > 0)
    supabase_service_configured = bool(
        os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")
    )
    
    return {
        "status": "healthy",
        "openai_configured": openai_configured,
        "ai_gateway_configured": ai_gateway_configured,
        "embedding_provider_configured": ai_gateway_configured or openai_configured,
        "supabase_service_configured": supabase_service_configured,
        "timestamp": datetime.now().isoformat()
    }


def _select_keyword(message: str) -> Optional[str]:
    words = re.findall(r"[A-Za-z]+", message.lower())
    stop_words = {
        "tell",
        "about",
        "what",
        "when",
        "where",
        "which",
        "there",
        "their",
        "would",
        "could",
        "should",
        "project",
        "status",
        "concerns",
        "issues",
        "any",
        "with",
        "from",
        "that",
        "this",
        "have",
        "been",
        "were",
        "please",
    }
    candidates = [w for w in words if len(w) >= 4 and w not in stop_words]
    if candidates:
        # Favor the longest candidate (often project/client names).
        return sorted(candidates, key=len, reverse=True)[0]
    return None


def _get_query_embedding(message: str) -> Optional[List[float]]:
    if _openai_client is None:
        return None
    try:
        response = _openai_client.embeddings.create(
            model="text-embedding-3-large",
            input=[message],
            dimensions=3072,
        )
        return response.data[0].embedding
    except Exception:
        return None


def _is_financial_query(message: str) -> bool:
    text = (message or "").lower()
    financial_terms = (
        "budget",
        "estimate",
        "invoice",
        "cost",
        "profit",
        "loss",
        "balance sheet",
        "p&l",
        "variance",
        "revenue",
        "expense",
        "change order value",
        "schedule of values",
        "sov",
        "q1",
        "q2",
        "q3",
        "q4",
    )
    return any(term in text for term in financial_terms)


def _row_data_preview(row_data: Dict[str, Any], max_items: int = 8) -> str:
    parts: List[str] = []
    columns = row_data.get("columns") if isinstance(row_data, dict) else None
    if not isinstance(columns, dict):
        return ""
    for key, value in columns.items():
        if value in (None, ""):
            continue
        parts.append(f"{key}={value}")
        if len(parts) >= max_items:
            break
    return "; ".join(parts)


def _build_chat_reply(
    message: str,
    store: SupabaseRagStore,
    project_id: Optional[int],
    limit: int = 5,
) -> Dict[str, Any]:
    keyword = _select_keyword(message)
    retrieval_mode = "keyword"
    chunks: List[Dict[str, Any]] = []
    financial_rows: List[Dict[str, Any]] = []

    if _is_financial_query(message):
        financial_rows = store.search_financial_rows(
            query=message,
            project_id=project_id,
            limit=limit,
        )
        if financial_rows:
            retrieval_mode = "financial_structured"

    if not financial_rows:
        query_embedding = _get_query_embedding(message)
        if query_embedding:
            chunks = store.vector_search_documents(
                query_embedding=query_embedding,
                limit=limit,
                project_id=project_id,
            )
            if chunks:
                retrieval_mode = "semantic"

        if not chunks:
            chunks = store.search_chunks_by_keyword(keyword, project_id=project_id, limit=limit)
        if not chunks:
            chunks = store.fetch_recent_chunks(project_id=project_id, limit=limit)
            retrieval_mode = "recent"

    tasks = store.list_tasks(project_id=project_id, status="open", limit=limit)
    insights = store.list_insights(project_id=project_id, limit=limit)
    project = store.get_project(project_id) if project_id is not None else None

    sources: List[Dict[str, Any]] = []
    if financial_rows:
        for row in financial_rows:
            doc = row.get("document") or {}
            preview = _row_data_preview(row.get("row_data") or {})
            sources.append(
                {
                    "document_id": row.get("dataset_id"),
                    "chunk_index": None,
                    "snippet": preview[:280],
                    "metadata": {
                        "retrieval_mode": "financial_structured",
                        "title": doc.get("title"),
                        "project_id": doc.get("project_id"),
                        "category": doc.get("category"),
                        "match_score": row.get("match_score"),
                    },
                    "row_data": row.get("row_data"),
                }
            )
    else:
        sources = [
            {
                "document_id": chunk.get("document_id"),
                "chunk_index": chunk.get("chunk_index") or (chunk.get("metadata") or {}).get("chunk_index"),
                "snippet": (chunk.get("text") or "")[:280],
                "metadata": chunk.get("metadata") or {},
            }
            for chunk in chunks
        ]

    reply_lines: List[str] = []
    if project:
        reply_lines.append(
            f"Project {project.get('name', project_id)} has {project.get('meeting_count', 0)} documented meetings and {project.get('open_tasks', 0)} open AI tasks."
        )
    if tasks:
        reply_lines.append(
            "Top open tasks: " + "; ".join(task.get("title", "Task") for task in tasks[:3])
        )
    if insights:
        reply_lines.append(
            "Recent insights: " + "; ".join(insight.get("summary", "")[:80] for insight in insights[:3])
        )
    if sources:
        if retrieval_mode == "financial_structured":
            reply_lines.append(
                f"Retrieved {len(sources)} structured financial rows from normalized tables."
            )
            reply_lines.append("Top matching financial evidence:")
            for source in sources[:3]:
                title = (source.get("metadata") or {}).get("title") or "Financial document"
                snippet = (source.get("snippet") or "").strip()
                reply_lines.append(f"- [{title}] {snippet[:180]}")
        elif retrieval_mode == "semantic":
            reply_lines.append(f"Retrieved {len(sources)} transcript snippets via semantic vector search.")
        elif retrieval_mode == "keyword":
            reply_lines.append(
                f"Retrieved {len(sources)} transcript snippets based on the keyword '{keyword or 'recent'}'."
            )
        else:
            reply_lines.append(f"Retrieved {len(sources)} recent transcript snippets.")
        reply_lines.append("Top relevant transcript evidence:")
        for source in sources[:3]:
            snippet = (source.get("snippet") or "").replace("\n", " ").strip()
            if snippet:
                reply_lines.append(f"- {snippet[:180]}")

        concern_terms = ("risk", "delay", "blocked", "issue", "concern", "over budget", "late")
        concern_hits = sum(
            1
            for source in sources
            if any(term in (source.get("snippet") or "").lower() for term in concern_terms)
        )
        if concern_hits > 0:
            reply_lines.append(
                f"Potential concerns detected in {concern_hits} of the retrieved snippets. Review those items for schedule/cost risk."
            )
        else:
            reply_lines.append(
                "No explicit risk language was detected in the retrieved snippets."
            )
    if not reply_lines:
        reply_lines.append(
            "No relevant transcripts or tasks were found yet. Try ingesting more Fireflies meetings or widening your query."
        )

    return {
        "reply": "\n".join(reply_lines),
        "sources": sources,
        "tasks": tasks,
        "insights": insights,
    }


# === Alleato REST API ===


@app.get("/api/projects", tags=["Projects"], summary="List all projects")
def list_projects_api(store: SupabaseRagStore = Depends(get_rag_store)) -> Dict[str, Any]:
    """Retrieve a list of all projects from the RAG store.
    
    Returns:
        Dict with 'projects' key containing list of project objects.
    """
    return {"projects": store.list_projects()}


@app.get("/api/projects/{project_id}", tags=["Projects"], summary="Get project details")
def project_detail_api(project_id: int, store: SupabaseRagStore = Depends(get_rag_store)) -> Dict[str, Any]:
    """Get detailed information about a specific project including tasks and insights."""
    project = store.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    tasks = store.list_tasks(project_id=project_id, status="open", limit=50)
    insights = store.list_insights(project_id=project_id, limit=20)
    return {"project": project, "tasks": tasks, "insights": insights}


@app.post("/api/chat", tags=["RAG Chat"], summary="Simple chat endpoint")
def rag_chat_api(payload: ChatRequest, store: SupabaseRagStore = Depends(get_rag_store)) -> Dict[str, Any]:
    """Process a chat message and return relevant information from the knowledge base.
    
    Performs keyword-based search against ingested transcript chunks and returns
    matching sources along with related tasks and insights.
    """
    if not payload.message.strip():
        raise HTTPException(status_code=422, detail="Message cannot be empty")
    return _build_chat_reply(payload.message, store=store, project_id=payload.project_id, limit=payload.limit)


@app.post("/api/ingest/fireflies", tags=["Ingestion"], summary="Ingest Fireflies transcript")
def ingest_fireflies_endpoint(
    payload: IngestRequest,
    pipeline: FirefliesIngestionPipeline = Depends(get_ingestion_pipeline),
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Ingest a Fireflies meeting transcript into the knowledge base.

    This endpoint processes Fireflies meeting transcripts and extracts:
    - Meeting metadata
    - Transcript chunks for semantic search
    - Action items and tasks
    - Key insights and decisions

    Args:
        payload: IngestRequest with path to transcript file, optional project_id, and dry_run flag.

    Returns:
        Dict with ingestion result details.
    """
    allow_file_ingest = os.getenv("ENABLE_LEGACY_FIREFLIES_FILE_INGEST", "false").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    if not allow_file_ingest:
        raise HTTPException(
            status_code=410,
            detail=(
                "Legacy file-based Fireflies ingest is disabled. "
                "Use POST /api/ingest/fireflies/recent (or enable "
                "ENABLE_LEGACY_FIREFLIES_FILE_INGEST=true for explicit legacy use)."
            ),
        )

    result = pipeline.ingest_file(payload.path, project_id=payload.project_id, dry_run=payload.dry_run)
    return {"result": result.__dict__}


@app.post("/api/ingest/fireflies/recent", tags=["Ingestion"], summary="Sync recent Fireflies transcripts")
def ingest_recent_fireflies_endpoint(
    payload: FirefliesRecentSyncRequest,
    pipeline: FirefliesIngestionPipeline = Depends(get_ingestion_pipeline),
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Fetch recent meetings from Fireflies, generate markdown, and ingest.

    This path is fully native to the backend (no Cloudflare worker dependency).
    """
    return pipeline.sync_recent_transcripts(
        limit=payload.limit,
        project_id=payload.project_id,
        dry_run=payload.dry_run,
        write_markdown_dir=payload.write_markdown_dir,
    )


@app.post("/api/graph/embed", tags=["Ingestion"], summary="Embed all pending Microsoft Graph documents (no sync)")
async def graph_embed_endpoint(
    _: None = Depends(require_admin_api_key),
    limit: int = 1000,
) -> Dict[str, Any]:
    """Vectorize pending document_metadata rows (status raw_ingested/segmented/compiled).
    Does not fetch new data from Graph — use /api/graph/sync for that.
    Safe to call frequently. Idempotent."""
    from src.services.supabase_helpers import get_supabase_client
    from src.services.integrations.microsoft_graph.embed import embed_pending_graph_documents
    import asyncio
    client = get_supabase_client()
    result = await asyncio.get_event_loop().run_in_executor(
        None, lambda: embed_pending_graph_documents(client, limit=limit)
    )
    return result


@app.post("/api/graph/sync", tags=["Ingestion"], summary="Trigger Microsoft Graph sync (Outlook / Teams / OneDrive)")
async def graph_sync_endpoint(
    payload: Optional[GraphSyncRequest] = None,
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Manually trigger a Microsoft Graph incremental sync.

    Syncs Outlook emails, Teams channel messages, and OneDrive files for all
    configured users. Uses delta tokens for incremental sync — only new/changed
    items since the last run are fetched.

    Requires GRAPH_SYNC_ENABLED=true and MICROSOFT_CLIENT_ID/SECRET/TENANT_ID
    environment variables to be set.

    Returns:
        Dict with status and counts per source.
    """
    from src.services.supabase_helpers import get_supabase_client
    from src.services.integrations.microsoft_graph.sync import run_graph_sync
    from src.services.integrations.microsoft_graph.client import get_graph_client

    graph = get_graph_client()
    if not graph.is_configured():
        raise HTTPException(
            status_code=503,
            detail=(
                "Microsoft Graph credentials not configured. "
                "Set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID."
            ),
        )

    client = get_supabase_client()
    options = payload or GraphSyncRequest()
    embed_limit = max(1, min(int(options.embed_limit or 1000), 1000))
    teams_compiler_batch_size = max(1, min(int(options.teams_compiler_batch_size or 25), 100))

    def _run():
        return run_graph_sync(
            client,
            run_embedding=options.run_embedding,
            run_teams_compiler=options.run_teams_compiler,
            embed_limit=embed_limit,
            teams_compiler_batch_size=teams_compiler_batch_size,
        )

    import asyncio
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _run)
    return result


@app.post(
    "/api/graph/webhooks/notifications",
    tags=["Ingestion"],
    summary="Receive Microsoft Graph change notifications",
)
async def graph_webhook_notifications_endpoint(
    request: Request,
    validationToken: Optional[str] = Query(default=None),
) -> Any:
    """Accept Microsoft Graph webhook validation and change notifications.

    Graph validation requires a 200 response with the raw validation token as
    text/plain. Real notifications are accepted quickly and recorded into the
    source sync run ledger for follow-on delta work.
    """
    if validationToken is not None:
        return PlainTextResponse(validationToken, status_code=200)

    try:
        payload = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Malformed Graph webhook JSON payload") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Graph webhook payload must be a JSON object")

    try:
        from src.services.integrations.microsoft_graph.webhooks import (
            GraphWebhookAuthError,
            handle_graph_notifications,
        )
        from src.services.supabase_helpers import get_supabase_client

        client = get_supabase_client()
        result = handle_graph_notifications(client, payload)
        return result
    except GraphWebhookAuthError as exc:
        logger.warning("[GraphWebhook] rejected notification: %s", exc)
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("[GraphWebhook] notification handling failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Graph webhook handling failed: {exc}") from exc


@app.post(
    "/api/graph/webhooks/lifecycle",
    tags=["Ingestion"],
    summary="Receive Microsoft Graph subscription lifecycle notifications",
)
async def graph_webhook_lifecycle_endpoint(
    request: Request,
    validationToken: Optional[str] = Query(default=None),
) -> Any:
    """Accept Graph lifecycle validation and mark subscription action-required states."""
    if validationToken is not None:
        return PlainTextResponse(validationToken, status_code=200)

    try:
        payload = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Malformed Graph lifecycle JSON payload") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Graph lifecycle payload must be a JSON object")

    try:
        from src.services.integrations.microsoft_graph.webhooks import (
            GraphWebhookAuthError,
            handle_graph_lifecycle_notifications,
        )
        from src.services.supabase_helpers import get_supabase_client

        client = get_supabase_client()
        return handle_graph_lifecycle_notifications(client, payload)
    except GraphWebhookAuthError as exc:
        logger.warning("[GraphWebhook] rejected lifecycle notification: %s", exc)
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("[GraphWebhook] lifecycle handling failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Graph lifecycle handling failed: {exc}") from exc


@app.post(
    "/api/graph/subscriptions/reconcile",
    tags=["Ingestion"],
    summary="Create or renew Microsoft Graph subscriptions",
)
async def graph_subscriptions_reconcile_endpoint(
    payload: Optional[GraphSubscriptionReconcileRequest] = None,
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Ensure configured Microsoft Graph subscriptions exist and are fresh."""
    try:
        from src.services.integrations.microsoft_graph.subscriptions import ensure_subscriptions
        from src.services.supabase_helpers import get_supabase_client

        options = payload or GraphSubscriptionReconcileRequest()
        client = get_supabase_client()
        return ensure_subscriptions(
            client,
            renew_within_hours=max(1, min(int(options.renew_within_hours or 6), 24)),
            expiration_hours=max(1, min(int(options.expiration_hours or 48), 48)),
        )
    except Exception as exc:
        logger.error("[GraphSubscriptions] reconcile failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Graph subscription reconcile failed: {exc}") from exc


class PipelineProcessRequest(BaseModel):
    metadataId: str


class TeamsCompilerRunRequest(BaseModel):
    batch_size: int = 25
    dry_run: bool = False


class IntelligenceCompilerRunRequest(BaseModel):
    source_limit: int = 10
    packet_limit: int = 10
    dry_run: bool = False
    background: bool = False
    max_processing_time_ms: Optional[int] = None


class OperatingSummaryRefreshRequest(BaseModel):
    project_id: int
    model: Optional[str] = None


def _env_flag_enabled(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).lower() in ("1", "true", "yes")


@app.post("/api/pipeline/process", tags=["Ingestion"], summary="Run full RAG pipeline for a document")
async def pipeline_process_endpoint(
    payload: PipelineProcessRequest,
    background_tasks: BackgroundTasks,
) -> Dict[str, Any]:
    """Trigger the full RAG pipeline for a document_metadata row.

    Called by the Supabase DB trigger (via pg_net) on every INSERT into
    document_metadata. Can also be called manually.

    Stages run in background:
      1. Parser   — parse Fireflies markdown, LLM segmentation → meeting_segments
      2. Embedder — chunk + embed with OpenAI → documents
      3. Extractor — structured extraction → decisions/risks/tasks/opportunities

    Args:
        payload: PipelineProcessRequest with metadataId (UUID string).

    Returns:
        Dict with status "queued" and the metadataId.
    """
    background_tasks.add_task(_run_pipeline_limited, payload.metadataId)
    return {"status": "queued", "metadataId": payload.metadataId}


@app.post("/api/intelligence/teams-compiler/run", tags=["Intelligence"], summary="Run Teams conversation compiler")
async def run_teams_compiler(
    request: TeamsCompilerRunRequest,
    background_tasks: BackgroundTasks,
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Compile a bounded batch of Teams DM conversations into structured intelligence."""
    import uuid

    job_id = str(uuid.uuid4())
    if request.batch_size < 1 or request.batch_size > 50:
        raise HTTPException(status_code=422, detail="batch_size must be between 1 and 50")
    if request.dry_run:
        return {"job_id": job_id, "status": "dry_run", "results": {"batch_size": request.batch_size}}

    try:
        from src.services.intelligence.teams_compiler import run_compiler_batch
        from src.services.supabase_helpers import get_supabase_client

        client = get_supabase_client()
        results = run_compiler_batch(client, batch_size=request.batch_size)
        return {"job_id": job_id, "status": "completed", "results": results}
    except Exception as exc:
        logger.error("[TeamsCompilerAPI] run failed job_id=%s: %s", job_id, exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Teams compiler run failed for job {job_id}: {exc}",
        ) from exc


@app.get("/api/intelligence/teams-compiler/status", tags=["Intelligence"], summary="Teams compiler status")
async def get_teams_compiler_status() -> Dict[str, Any]:
    """Return Teams compiler monitoring metrics from Supabase."""
    try:
        from src.services.supabase_helpers import get_supabase_client

        client = get_supabase_client()
        result = client.rpc("get_teams_compiler_status").execute()
        return result.data or {}
    except Exception as exc:
        logger.error("[TeamsCompilerAPI] status failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Teams compiler status query failed: {exc}",
        ) from exc


@app.post("/api/intelligence/compiler/run", tags=["Intelligence"], summary="Run AI intelligence compiler queue")
async def run_intelligence_compiler(
    request: IntelligenceCompilerRunRequest,
    background_tasks: BackgroundTasks,
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Drain queued source intelligence and packet refresh jobs."""
    import uuid

    job_id = str(uuid.uuid4())
    if request.source_limit < 0 or request.source_limit > 100:
        raise HTTPException(status_code=422, detail="source_limit must be between 0 and 100")
    if request.packet_limit < 0 or request.packet_limit > 100:
        raise HTTPException(status_code=422, detail="packet_limit must be between 0 and 100")
    if request.max_processing_time_ms is not None and (
        request.max_processing_time_ms < 1000 or request.max_processing_time_ms > 600000
    ):
        raise HTTPException(status_code=422, detail="max_processing_time_ms must be between 1000 and 600000")
    if request.dry_run:
        return {
            "job_id": job_id,
            "status": "dry_run",
            "results": {
                "source_limit": request.source_limit,
                "packet_limit": request.packet_limit,
                "background": request.background,
                "max_processing_time_ms": request.max_processing_time_ms,
            },
        }

    if request.background:
        background_tasks.add_task(
            _run_intelligence_compiler_limited,
            job_id,
            request.source_limit,
            request.packet_limit,
            request.max_processing_time_ms,
        )
        return {
            "job_id": job_id,
            "status": "queued",
            "results": {
                "source_limit": request.source_limit,
                "packet_limit": request.packet_limit,
                "background": True,
                "max_processing_time_ms": request.max_processing_time_ms,
            },
        }

    try:
        from src.services.intelligence.compiler import run_intelligence_compiler_batch
        from src.services.supabase_helpers import get_supabase_client

        client = get_supabase_client()
        results = run_intelligence_compiler_batch(
            client,
            source_limit=request.source_limit,
            packet_limit=request.packet_limit,
            max_processing_time_ms=request.max_processing_time_ms,
        )
        return {"job_id": job_id, "status": "completed", "results": results}
    except Exception as exc:
        logger.error("[IntelligenceCompilerAPI] run failed job_id=%s: %s", job_id, exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Intelligence compiler run failed for job {job_id}: {exc}",
        ) from exc


@app.post(
    "/api/intelligence/projects/operating-summary/refresh",
    tags=["Intelligence"],
    summary="Refresh a project operating-summary packet",
)
async def refresh_project_operating_summary(
    request: OperatingSummaryRefreshRequest,
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Compile all available project operating sources into the current packet.

    This is the Render-owned production refresh path for packet-first project
    intelligence. The frontend should read the synced packet from Supabase and
    use this endpoint to refresh, not run long AI generation in page render.
    """
    if request.project_id < 1:
        raise HTTPException(status_code=422, detail="project_id must be positive")

    try:
        from src.services.intelligence.operating_summary import refresh_project_operating_packet
        from src.services.supabase_helpers import get_supabase_client

        client = get_supabase_client()
        return refresh_project_operating_packet(
            client,
            request.project_id,
            model=request.model,
        )
    except Exception as exc:
        logger.error(
            "[OperatingSummaryAPI] refresh failed project_id=%s: %s",
            request.project_id,
            exc,
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Operating summary refresh failed for project {request.project_id}: {exc}",
        ) from exc


@app.post(
    "/api/intelligence/deep-agent/project-status",
    tags=["Intelligence"],
    summary="Run Deep Agents project-status contract spike",
)
async def run_deep_agent_project_status(
    request: DeepProjectIntelligenceRequest,
    _: None = Depends(require_admin_api_key),
    store: SupabaseRagStore = Depends(get_rag_store),
) -> Dict[str, Any]:
    """Return a typed Deep Agents-ready project intelligence packet.

    This endpoint is gated while Slice 1 proves the backend contract. It does
    not change production chat behavior or run long agent workflows.
    """
    if not _env_flag_enabled("DEEP_AGENTS_PROJECT_INTELLIGENCE_ENABLED"):
        raise HTTPException(
            status_code=503,
            detail=(
                "Deep Agents project intelligence is disabled. Set "
                "DEEP_AGENTS_PROJECT_INTELLIGENCE_ENABLED=true to run the "
                "backend contract spike."
            ),
        )

    response = build_project_status_contract_spike(
        request,
        store,
        runtime=os.getenv("DEEP_AGENTS_PROJECT_INTELLIGENCE_RUNTIME", "contract_spike"),
        model=os.getenv("DEEP_AGENTS_PROJECT_INTELLIGENCE_MODEL", "openai:gpt-5.4-mini"),
    )
    if response.tool_trace and response.tool_trace[0].status == "failed":
        raise HTTPException(status_code=404, detail=response.answer)
    return response.model_dump(by_alias=True)


@app.get("/api/intelligence/compiler/status", tags=["Intelligence"], summary="AI intelligence compiler status")
async def get_intelligence_compiler_health(
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Return queue, promotion, evidence, and packet health for the intelligence compiler."""
    try:
        from src.services.intelligence.compiler import get_intelligence_compiler_status
        from src.services.supabase_helpers import get_supabase_client

        client = get_supabase_client()
        return get_intelligence_compiler_status(client)
    except Exception as exc:
        logger.error("[IntelligenceCompilerAPI] status failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Intelligence compiler status query failed: {exc}",
        ) from exc


@app.get("/api/health/source-sync", tags=["Health"], summary="Source sync and intelligence health")
async def get_source_sync_health_status(
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Return sync freshness, vectorization, task extraction, compiler, and packet health."""
    try:
        from src.services.health.source_sync_health import get_source_sync_health
        from src.services.supabase_helpers import get_supabase_client

        client = get_supabase_client()
        return get_source_sync_health(client)
    except Exception as exc:
        logger.error("[SourceSyncHealthAPI] status failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=_public_backend_error("Source sync health query failed", exc),
        ) from exc


@app.post("/api/health/source-sync/recompute", tags=["Health"], summary="Recompute source sync health")
async def recompute_source_sync_health_status(
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Recompute source sync health from current source, vector, task, and packet tables."""
    try:
        from src.services.health.source_sync_health import (
            MAX_RECOMPUTE_ALERT_WRITES,
            MAX_RECOMPUTE_SNAPSHOT_WRITES,
            get_source_sync_health,
            persist_source_sync_alerts,
            update_source_health_snapshot,
        )
        from src.services.supabase_helpers import get_supabase_client

        client = get_supabase_client()
        health = get_source_sync_health(client)
        updated = 0
        for source in health.get("sources", [])[:MAX_RECOMPUTE_SNAPSHOT_WRITES]:
            update_source_health_snapshot(client, source)
            updated += 1
        routed_alerts = persist_source_sync_alerts(
            client,
            health.get("alerts", [])[:MAX_RECOMPUTE_ALERT_WRITES],
            resolve_missing=False,
        )
        return {
            "status": "completed",
            "updatedSnapshots": updated,
            "routedAlerts": routed_alerts,
            "writeCaps": {
                "snapshots": MAX_RECOMPUTE_SNAPSHOT_WRITES,
                "alerts": MAX_RECOMPUTE_ALERT_WRITES,
                "resolveMissing": False,
            },
            "health": health,
        }
    except Exception as exc:
        logger.error("[SourceSyncHealthAPI] recompute failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=_public_backend_error("Source sync health recompute failed", exc),
        ) from exc


# === Scheduled Analysis Engine ===

@app.on_event("startup")
async def start_scheduler():
    """Initialize the scheduled analysis engine on server startup."""
    try:
        from src.services.scheduler import init_scheduler
        init_scheduler()
    except Exception as e:
        logger.warning("Scheduler init failed (non-critical): %s", e)


@app.on_event("shutdown")
async def stop_scheduler():
    """Gracefully shut down the scheduler."""
    try:
        from src.services.scheduler import shutdown_scheduler
        shutdown_scheduler()
    except Exception:
        pass


# === Digest Endpoints ===

@app.get("/api/digests/meeting/{metadata_id}", tags=["Digests"])
async def get_meeting_digest(metadata_id: str) -> Dict[str, Any]:
    """Get the post-meeting digest for a specific meeting."""
    from src.services.supabase_helpers import get_supabase_client
    client = get_supabase_client()
    resp = (
        client.table("meeting_digests")
        .select("*")
        .eq("metadata_id", metadata_id)
        .maybe_single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Digest not found")
    return resp.data


@app.post("/api/digests/daily/generate", tags=["Digests"])
async def trigger_daily_digest(
    background_tasks: BackgroundTasks,
    date: Optional[str] = Query(None, description="YYYY-MM-DD, default today"),
    days: int = Query(1, description="Number of days to include"),
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Manually trigger daily digest generation."""
    from src.services.daily_digest import run_daily_digest
    background_tasks.add_task(run_daily_digest, date, days)
    return {"status": "queued", "date": date, "days": days}


@app.get("/api/digests/daily/{date}", tags=["Digests"])
async def get_daily_digest(date: str) -> Dict[str, Any]:
    """Get the daily recap for a specific date (YYYY-MM-DD)."""
    from src.services.supabase_helpers import get_supabase_client
    client = get_supabase_client()
    resp = (
        client.table("daily_recaps")
        .select("*")
        .eq("recap_date", date)
        .maybe_single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Daily recap not found")
    return resp.data


# === Admin Endpoints ===
# Import and include admin routes
try:
    from src.api.admin_endpoints import router as admin_router
    app.include_router(admin_router)
    logger.info("Admin endpoints loaded successfully")
except ImportError as e:
    logger.warning(f"Admin endpoints not available: {e}")

# === YokeFlow Agent Platform ===
# Mount YokeFlow API as a sub-application at /yokeflow
try:
    from src.yokeflow.api.router import initialize_yokeflow
    yokeflow_app = initialize_yokeflow()
    app.mount("/yokeflow", yokeflow_app)
    logger.info("YokeFlow agent platform mounted at /yokeflow")
except ImportError as e:
    logger.warning(f"YokeFlow agent platform not available: {e}")
except Exception as e:
    logger.warning(f"Failed to initialize YokeFlow: {e}")
