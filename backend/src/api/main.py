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
import time
import base64
import hashlib
import hmac
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Load environment variables from root .env file
from src.services.env_loader import load_env
load_env()

from src.services.sentry_monitoring import init_sentry
from src.services.posthog_monitoring import init_posthog

init_sentry()
init_posthog()

from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
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
from src.services.agents.deep_project_intelligence import (
    build_executive_briefing_contract_spike,
    build_project_status_contract_spike,
    deep_agents_runtime_inventory,
)
from src.services.agents.deep_project_intelligence_contracts import (
    DeepExecutiveIntelligenceRequest,
    DeepProjectIntelligenceRequest,
)
from src.services.agents.content_builder import ContentBuilderRequest, run_content_builder_agent
from src.services.agents.docs_research_agent import DocsResearchRequest, run_docs_research_agent
from src.services.agents.llm_wiki import WikiRequest, list_llm_wiki_archive, run_llm_wiki_agent
from src.services.agents.microsoft_executive_assistant import (
    MicrosoftExecutiveAssistantRequest,
    run_microsoft_executive_assistant,
)
from src.services.agents.research_agent import ResearchRequest, run_research_agent
from src.services.agents.app_expert import AppExpertRequest, run_app_expert_agent
from src.services.mcp.alleato_system import (
    alleato_system_mcp_enabled,
    alleato_system_mcp_status,
    create_alleato_system_mcp_app,
    create_alleato_system_mcp_lifespan,
)
from src.services.microsoft_project_parser import (
    MicrosoftProjectParseError,
    parse_microsoft_project_file,
)
from src.services.integrations.microsoft_graph.ingestion_control import (
    graph_ingestion_disabled_reason,
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
    if "error code 522" in lowered or "code': 522" in lowered:
        return f"{prefix}: Supabase timed out (Cloudflare 522 Connection timed out)."
    if "cloudflare" in lowered or "error code 521" in lowered or "code': 521" in lowered:
        return f"{prefix}: Supabase is unavailable (Cloudflare 521 Web server is down)."
    compact = re.sub(r"<[^>]+>", " ", message)
    compact = re.sub(r"\s+", " ", compact).strip()
    return f"{prefix}: {compact[:500]}"


def _graph_ingestion_blocked_reason(mode: str = "manual") -> Optional[str]:
    """Return a public reason when Graph write-heavy API work must fail closed."""
    return graph_ingestion_disabled_reason(mode=mode)


def _require_graph_ingestion_enabled() -> None:
    reason = _graph_ingestion_blocked_reason()
    if reason:
        raise HTTPException(status_code=503, detail=reason)


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


def _configured_cors_origins() -> List[str]:
    defaults = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://projects.alleatogroup.com",
    ]
    configured = os.getenv("FRONTEND_CORS_ORIGINS", "")
    extra = [
        origin.strip().rstrip("/")
        for origin in configured.split(",")
        if origin.strip()
    ]
    return sorted(set(defaults + extra))


# CORS configuration (adjust as needed for deployment)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_configured_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "sentry-trace", "baggage"],
)

if alleato_system_mcp_enabled():
    app.mount("/mcp", create_alleato_system_mcp_app())


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
    run_outlook: bool = True
    run_teams: bool = True
    run_onedrive: bool = True
    run_embedding: bool = True
    embed_limit: int = 25
    outlook_users: Optional[List[str]] = None
    verify_outlook_persisted_count: bool = True


class GraphSubscriptionReconcileRequest(BaseModel):
    renew_within_hours: int = 6
    expiration_hours: int = 48


class OutlookMailboxSyncRequest(BaseModel):
    user_email: str
    verify_persisted_count: bool = False


class OutlookLiveInboxRequest(BaseModel):
    mailbox_user_id: str
    since_iso: Optional[str] = None
    limit: int = 50


class OutlookMailboxSubscriptionRequest(BaseModel):
    user_email: str
    renew_within_hours: int = 6
    expiration_hours: int = 48


class OutlookIntakeReclassificationRequest(BaseModel):
    mailbox: Optional[str] = None
    intake_ids: Optional[List[int]] = None
    days_back: int = 0
    time_zone: str = "America/New_York"
    limit: int = 500
    page_size: int = 100
    apply: bool = False


class MicrosoftProjectConvertResponse(BaseModel):
    tasks: List[Dict[str, Any]]
    source_format: str
    task_count: int


class MicrosoftProjectConvertTokenResponse(BaseModel):
    convert_url: str
    expires_in_seconds: int


class SchedulePdfExtractResponse(BaseModel):
    text: str
    page_count: int
    character_count: int


def _base64url(value: bytes | str) -> str:
    source = value.encode("utf-8") if isinstance(value, str) else value
    return base64.urlsafe_b64encode(source).decode("ascii").rstrip("=")


def _sign_schedule_convert_token(project_id: int, expires_in_seconds: int = 300) -> str:
    expected_secret = os.getenv("ADMIN_API_KEY")
    if not expected_secret:
        raise HTTPException(status_code=503, detail="ADMIN_API_KEY is not configured on the backend")

    payload = _base64url(json.dumps({
        "project_id": project_id,
        "exp": int(datetime.now(timezone.utc).timestamp()) + expires_in_seconds,
    }, separators=(",", ":")))
    signature = hmac.new(
        expected_secret.encode("utf-8"),
        payload.encode("ascii"),
        hashlib.sha256,
    ).digest()

    return f"{payload}.{_base64url(signature)}"


def _base64url_decode_json(value: str) -> Dict[str, Any]:
    padding = "=" * (-len(value) % 4)
    try:
        decoded = base64.urlsafe_b64decode(f"{value}{padding}".encode("ascii"))
        payload = json.loads(decoded.decode("utf-8"))
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid schedule conversion token.") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=401, detail="Invalid schedule conversion token.")

    return payload


def _verify_schedule_convert_token(token: Optional[str], project_id: int) -> None:
    expected_secret = os.getenv("ADMIN_API_KEY")
    if not expected_secret:
        raise HTTPException(status_code=503, detail="ADMIN_API_KEY is not configured on the backend")
    if not token:
        raise HTTPException(status_code=401, detail="Missing schedule conversion token.")

    parts = token.split(".")
    if len(parts) != 2:
        raise HTTPException(status_code=401, detail="Invalid schedule conversion token.")

    encoded_payload, supplied_signature = parts
    expected_signature = hmac.new(
        expected_secret.encode("utf-8"),
        encoded_payload.encode("ascii"),
        hashlib.sha256,
    ).digest()
    expected_signature_text = base64.urlsafe_b64encode(expected_signature).decode("ascii").rstrip("=")

    if not hmac.compare_digest(supplied_signature, expected_signature_text):
        raise HTTPException(status_code=401, detail="Invalid schedule conversion token.")

    payload = _base64url_decode_json(encoded_payload)
    if payload.get("project_id") != project_id:
        raise HTTPException(status_code=401, detail="Schedule conversion token does not match this project.")

    expires_at = payload.get("exp")
    if not isinstance(expires_at, int):
        raise HTTPException(status_code=401, detail="Invalid schedule conversion token.")
    if expires_at < int(datetime.now(timezone.utc).timestamp()):
        raise HTTPException(status_code=401, detail="Schedule conversion token expired.")


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
    from src.services.ai_transport import (
        ai_gateway_configured,
        ai_gateway_required,
        embedding_provider_configured,
        get_ai_provider_path,
        openai_configured,
    )

    supabase_service_configured = bool(
        os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")
    )

    try:
        from src.services.agents.llm_wiki.agent import storage_durability_status

        deep_agent_storage = storage_durability_status()
    except Exception:  # pragma: no cover - never let a probe break /health
        deep_agent_storage = {"durable": None, "roots": {}}

    return {
        "status": "healthy",
        "ai_provider_path": get_ai_provider_path(),
        "ai_gateway_configured": ai_gateway_configured(),
        "ai_gateway_required": ai_gateway_required(),
        "openai_configured": openai_configured(),
        "embedding_provider_configured": embedding_provider_configured(),
        "supabase_service_configured": supabase_service_configured,
        "deep_agent_storage": deep_agent_storage,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/mcp/status", tags=["System"], summary="Hosted MCP status")
async def hosted_mcp_status() -> Dict[str, Any]:
    return alleato_system_mcp_status()


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


@app.post(
    "/api/scheduling/microsoft-project/convert-token",
    tags=["Scheduling"],
    summary="Create a short-lived Microsoft Project conversion upload URL",
    response_model=MicrosoftProjectConvertTokenResponse,
)
def create_microsoft_project_convert_token(
    request: Request,
    project_id: int = Query(..., ge=1),
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    token = _sign_schedule_convert_token(project_id)
    # Render sets RENDER_EXTERNAL_URL to the public service URL.
    # request.base_url is unreliable behind proxies (resolves to http://0.0.0.0:PORT).
    render_external = os.getenv("RENDER_EXTERNAL_URL", "").rstrip("/")
    base_url = render_external or str(request.base_url).rstrip("/")
    return {
        "convert_url": f"{base_url}/api/scheduling/microsoft-project/convert?project_id={project_id}&token={token}",
        "expires_in_seconds": 300,
    }


@app.post(
    "/api/scheduling/microsoft-project/convert",
    tags=["Scheduling"],
    summary="Convert Microsoft Project schedule file to importable tasks",
    response_model=MicrosoftProjectConvertResponse,
)
async def convert_microsoft_project_schedule(
    request: Request,
    project_id: int = Query(..., ge=1),
    file: UploadFile = File(...),
    token: Optional[str] = Query(default=None),
) -> Dict[str, Any]:
    if token:
        _verify_schedule_convert_token(token, project_id)
    else:
        require_admin_api_key(
            authorization=request.headers.get("authorization"),
            x_admin_api_key=request.headers.get("x-admin-api-key"),
        )

    file_name = file.filename or "schedule"
    suffix = Path(file_name).suffix.lower()
    if suffix not in {".mpp", ".mpt", ".xml"}:
        raise HTTPException(
            status_code=400,
            detail="Upload a Microsoft Project .mpp, .mpt, or XML file.",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded schedule file is empty.")
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Schedule file is larger than the 50 MB import limit.")

    try:
        tasks = parse_microsoft_project_file(file_name, content)
    except MicrosoftProjectParseError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return {
        "tasks": tasks,
        "source_format": suffix.lstrip("."),
        "task_count": len(tasks),
    }


@app.post(
    "/api/scheduling/schedule-pdf/extract",
    tags=["Scheduling"],
    summary="Extract readable text from a printed schedule PDF",
    response_model=SchedulePdfExtractResponse,
)
async def extract_schedule_pdf_text(
    project_id: int = Query(..., ge=1),
    file: UploadFile = File(...),
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    file_name = file.filename or "schedule.pdf"
    if Path(file_name).suffix.lower() != ".pdf" and file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Upload a schedule PDF file.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded PDF is empty.")
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Schedule PDF is larger than the 50 MB import limit.")
    if content[:5] != b"%PDF-":
        raise HTTPException(status_code=400, detail="Uploaded file is not a readable PDF.")

    try:
        import io
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(content))
        pages: List[str] = []
        for index, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            if text.strip():
                pages.append(f"--- Page {index} ---\n{text.strip()}")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Unable to extract text from schedule PDF: {str(exc)[:300]}") from exc

    extracted_text = "\n\n".join(pages).strip()
    if len(extracted_text) < 50:
        raise HTTPException(
            status_code=422,
            detail="This PDF did not contain enough selectable text to import. Upload MPP, XML, Excel, or CSV, or OCR the PDF first.",
        )

    return {
        "text": extracted_text,
        "page_count": len(reader.pages),
        "character_count": len(extracted_text),
    }


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
    _require_graph_ingestion_enabled()
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
    _require_graph_ingestion_enabled()
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
    embed_limit = max(1, min(int(options.embed_limit or 25), 25))

    def _run():
        return run_graph_sync(
            client,
            run_outlook=options.run_outlook,
            run_teams=options.run_teams,
            run_onedrive=options.run_onedrive,
            run_embedding=options.run_embedding,
            embed_limit=embed_limit,
            outlook_users=options.outlook_users,
            verify_outlook_persisted_count=options.verify_outlook_persisted_count,
        )

    import asyncio
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _run)
    return result


@app.post(
    "/api/graph/outlook/sync-mailbox",
    tags=["Ingestion"],
    summary="Trigger Microsoft Graph Outlook sync for one mailbox",
)
async def graph_outlook_mailbox_sync_endpoint(
    payload: OutlookMailboxSyncRequest,
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Manually sync one Outlook mailbox without touching other configured users."""
    _require_graph_ingestion_enabled()
    user_email = payload.user_email.strip().lower()
    if not user_email or "@" not in user_email:
        raise HTTPException(status_code=400, detail="user_email must be a valid mailbox address")

    from src.services.integrations.microsoft_graph.client import get_graph_client
    from src.services.integrations.microsoft_graph.sync import sync_outlook_mailbox_delta
    from src.services.supabase_helpers import get_supabase_client

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

    def _run():
        return sync_outlook_mailbox_delta(
            client,
            user_email,
            reason="admin_targeted_mailbox_sync",
            verify_persisted_count=payload.verify_persisted_count,
        )

    import asyncio
    return await asyncio.get_event_loop().run_in_executor(None, _run)


@app.post(
    "/api/graph/outlook/live-inbox",
    tags=["Ingestion"],
    summary="Read one Outlook inbox live through Microsoft Graph",
)
async def graph_outlook_live_inbox_endpoint(
    payload: OutlookLiveInboxRequest,
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Read live Outlook inbox messages without using synced cache/RAG tables."""
    mailbox = payload.mailbox_user_id.strip().lower()
    if not mailbox or "@" not in mailbox:
        raise HTTPException(status_code=400, detail="mailbox_user_id must be a valid mailbox address")
    if payload.limit < 1 or payload.limit > 100:
        raise HTTPException(status_code=422, detail="limit must be between 1 and 100")

    from src.services.integrations.microsoft_graph.live_mail import list_live_outlook_inbox

    import asyncio
    loop = asyncio.get_event_loop()
    try:
        return await loop.run_in_executor(
            None,
            lambda: list_live_outlook_inbox(
                mailbox_user_id=mailbox,
                since_iso=payload.since_iso,
                limit=payload.limit,
            ),
        )
    except Exception as exc:
        logger.warning("[Graph Outlook] Live inbox read failed for %s: %s", mailbox, exc, exc_info=True)
        raise HTTPException(status_code=502, detail=f"Microsoft Graph live inbox read failed: {exc}") from exc


@app.post(
    "/api/graph/outlook/reclassify-intake",
    tags=["Ingestion"],
    summary="Reclassify stored Outlook intake rows with the current intake classifier",
)
async def graph_outlook_intake_reclassify_endpoint(
    payload: OutlookIntakeReclassificationRequest,
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Apply current Outlook intake classification rules to already stored rows."""
    _require_graph_ingestion_enabled()
    if payload.days_back < 0:
        raise HTTPException(status_code=422, detail="days_back must be zero or greater")
    if payload.limit < 1 or payload.limit > 5000:
        raise HTTPException(status_code=422, detail="limit must be between 1 and 5000")
    if payload.page_size < 1 or payload.page_size > 500:
        raise HTTPException(status_code=422, detail="page_size must be between 1 and 500")
    intake_ids = payload.intake_ids or None
    if intake_ids and any(value <= 0 for value in intake_ids):
        raise HTTPException(status_code=422, detail="intake_ids must contain positive IDs")

    from src.services.integrations.microsoft_graph.intake_reclassification import (
        run_outlook_intake_reclassification,
    )
    from src.services.supabase_helpers import get_supabase_client

    client = get_supabase_client()

    def _run():
        return run_outlook_intake_reclassification(
            client,
            mailbox=payload.mailbox.strip().lower() if payload.mailbox else None,
            intake_ids=intake_ids,
            days_back=payload.days_back,
            time_zone=payload.time_zone,
            limit=payload.limit,
            page_size=payload.page_size,
            apply=payload.apply,
            applied_by="/api/graph/outlook/reclassify-intake",
        )

    import asyncio
    return await asyncio.get_event_loop().run_in_executor(None, _run)


@app.post(
    "/api/graph/outlook/subscribe-mailbox",
    tags=["Ingestion"],
    summary="Create or renew Microsoft Graph Outlook subscription for one mailbox",
)
async def graph_outlook_mailbox_subscribe_endpoint(
    payload: OutlookMailboxSubscriptionRequest,
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Create or renew one Outlook mailbox webhook subscription without touching other users."""
    _require_graph_ingestion_enabled()
    user_email = payload.user_email.strip().lower()
    if not user_email or "@" not in user_email:
        raise HTTPException(status_code=400, detail="user_email must be a valid mailbox address")

    from src.services.integrations.microsoft_graph.client import get_graph_client
    from src.services.integrations.microsoft_graph.subscriptions import (
        GraphSubscriptionTarget,
        ensure_subscriptions,
    )
    from src.services.supabase_helpers import get_supabase_client

    graph = get_graph_client()
    if not graph.is_configured():
        raise HTTPException(
            status_code=503,
            detail=(
                "Microsoft Graph credentials not configured. "
                "Set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID."
            ),
        )

    target = GraphSubscriptionTarget(
        source="outlook_email",
        resource_id=user_email,
        resource_name=f"Outlook: {user_email}",
        resource=f"users/{user_email}/messages",
        change_type="created,updated",
        max_expiration_hours=48,
    )
    client = get_supabase_client()
    renew_within_hours = max(1, min(int(payload.renew_within_hours or 6), 24))
    expiration_hours = max(1, min(int(payload.expiration_hours or 48), 48))

    def _run():
        return ensure_subscriptions(
            client,
            targets=[target],
            renew_within_hours=renew_within_hours,
            expiration_hours=expiration_hours,
        )

    import asyncio
    return await asyncio.get_event_loop().run_in_executor(None, _run)


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
    blocked_reason = _graph_ingestion_blocked_reason(mode="webhook")
    if blocked_reason:
        logger.warning("[GraphWebhook] notification accepted without DB writes: %s", blocked_reason)
        return {"status": "disabled", "recorded": 0, "reason": blocked_reason}

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
    blocked_reason = _graph_ingestion_blocked_reason(mode="webhook")
    if blocked_reason:
        logger.warning("[GraphWebhook] lifecycle notification accepted without DB writes: %s", blocked_reason)
        return {"status": "disabled", "recorded": 0, "reason": blocked_reason}

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
    _require_graph_ingestion_enabled()
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


class IntelligenceCompilerRunRequest(BaseModel):
    source_limit: int = 10
    packet_limit: int = 10
    dry_run: bool = False
    background: bool = False
    max_processing_time_ms: Optional[int] = None


class ProjectSynthesizeRequest(BaseModel):
    project_id: int
    since: Optional[str] = None
    max_docs: int = 40
    max_extractions: Optional[int] = None
    skip_synthesized: bool = True
    dry_run: bool = False


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
    try:
        from src.services.supabase_helpers import get_rag_read_client

        get_rag_read_client().table("rag_document_metadata").select("id").limit(1).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=_public_backend_error("RAG pipeline is unavailable", exc),
        ) from exc

    background_tasks.add_task(_run_pipeline_limited, payload.metadataId)
    return {"status": "queued", "metadataId": payload.metadataId}


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
    "/api/intelligence/project-synthesize",
    tags=["Intelligence"],
    summary="Synthesize project communications intelligence (emails + Teams)",
)
async def project_synthesize(
    request: ProjectSynthesizeRequest,
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Run deep, evidence-backed intelligence extraction over a project's recent
    emails and Teams conversations (meetings are handled by the meeting extractor)."""
    try:
        from src.services.intelligence.project_synthesizer import (
            synthesize_project_intelligence,
        )

        return synthesize_project_intelligence(
            request.project_id,
            since=request.since,
            max_docs=request.max_docs,
            max_extractions=request.max_extractions,
            skip_synthesized=request.skip_synthesized,
            dry_run=request.dry_run,
        )
    except Exception as exc:
        logger.error(
            "[ProjectSynthesizeAPI] run failed project_id=%s: %s",
            request.project_id,
            exc,
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Project synthesize failed for project {request.project_id}: {exc}",
        ) from exc


class ProjectIntelligenceRefreshRequest(BaseModel):
    project_id: int
    force_full: bool = False
    dry_run: bool = False
    model: Optional[str] = None


@app.post(
    "/api/intelligence/project-intelligence/refresh",
    tags=["Intelligence"],
    summary="L2 rolling-state synthesis: one coherent intelligence packet for a project",
)
async def refresh_project_intelligence_endpoint(
    request: ProjectIntelligenceRefreshRequest,
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Read prior synthesized state + raw comms since + hard numbers -> ONE
    synthesis pass -> a coherent ``intelligence_packets`` row the project page
    renders. Use ``dry_run`` to inspect the synthesized output before writing.

    Surfaces LLM failure as a 500 (never writes a silent empty packet)."""
    if request.project_id < 1:
        raise HTTPException(status_code=422, detail="project_id must be positive")
    try:
        from src.services.intelligence.project_intelligence import (
            refresh_project_intelligence,
        )

        return refresh_project_intelligence(
            request.project_id,
            force_full=request.force_full,
            dry_run=request.dry_run,
            model=request.model,
        )
    except Exception as exc:
        logger.error(
            "[ProjectIntelligenceAPI] refresh failed project_id=%s: %s",
            request.project_id,
            exc,
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Project intelligence synthesis failed for project {request.project_id}: {exc}",
        ) from exc


class ReconcileFlagsRequest(BaseModel):
    project_id: int


@app.post(
    "/api/intelligence/reconcile-flags",
    tags=["Intelligence"],
    summary="Flag->outcome calibration: resolve open predictive flags against later events",
)
async def reconcile_flags(
    request: ReconcileFlagsRequest,
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """For each open predictive flag on the project, decide whether it has since
    materialized / did-not-materialize based on subsequent events, and link the
    realizing event."""
    try:
        from src.services.intelligence.project_synthesizer import reconcile_project_flags

        return reconcile_project_flags(request.project_id)
    except Exception as exc:
        logger.error("[ReconcileFlagsAPI] failed project_id=%s: %s", request.project_id, exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Flag reconcile failed for project {request.project_id}: {exc}",
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
        model=os.getenv("DEEP_AGENTS_PROJECT_INTELLIGENCE_MODEL", "openai:gpt-5.5"),
    )
    if (
        response.tool_trace
        and response.tool_trace[0].status == "failed"
        and response.tool_trace[0].detail == "Project lookup returned no row."
    ):
        raise HTTPException(status_code=404, detail=response.answer)
    return response.model_dump(by_alias=True)


@app.get(
    "/api/intelligence/deep-agent/tool-inventory",
    tags=["Intelligence"],
    summary="Show the active Render Deep Agents tool inventory",
)
async def get_deep_agent_tool_inventory(
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Return the effective Deep Agents runtime surface for deployment checks."""
    return deep_agents_runtime_inventory()


@app.post(
    "/api/intelligence/deep-agent/executive-briefing",
    tags=["Intelligence"],
    summary="Run Deep Agents business-wide executive briefing",
)
async def run_deep_agent_executive_briefing(
    request: DeepExecutiveIntelligenceRequest,
    _: None = Depends(require_admin_api_key),
    store: SupabaseRagStore = Depends(get_rag_store),
) -> Dict[str, Any]:
    """Return a typed Deep Agents packet for business-wide assistant prompts."""
    if not _env_flag_enabled("DEEP_AGENTS_PROJECT_INTELLIGENCE_ENABLED"):
        raise HTTPException(
            status_code=503,
            detail=(
                "Deep Agents executive intelligence is disabled. Set "
                "DEEP_AGENTS_PROJECT_INTELLIGENCE_ENABLED=true to run the "
                "business-wide backend packet."
            ),
        )

    response = build_executive_briefing_contract_spike(
        request,
        store,
        runtime=os.getenv("DEEP_AGENTS_PROJECT_INTELLIGENCE_RUNTIME", "contract_spike"),
        model=os.getenv("DEEP_AGENTS_PROJECT_INTELLIGENCE_MODEL", "openai:gpt-5.5"),
    )
    return response.model_dump(by_alias=True)


@app.post(
    "/api/intelligence/content-builder",
    tags=["Intelligence"],
    summary="Run Alleato Deep Agents content builder",
)
async def run_deep_agent_content_builder(
    request: ContentBuilderRequest,
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Run the standalone content builder with packaged memory, skills, and subagents."""
    if not _env_flag_enabled("DEEP_AGENTS_CONTENT_BUILDER_ENABLED"):
        raise HTTPException(
            status_code=503,
            detail=(
                "Deep Agents content builder is disabled. Set "
                "DEEP_AGENTS_CONTENT_BUILDER_ENABLED=true to run the content builder."
            ),
        )

    response = run_content_builder_agent(
        request,
        model=os.getenv("DEEP_AGENTS_CONTENT_BUILDER_MODEL", "openai:gpt-5.4-mini"),
    )
    if response.mode == "unavailable":
        raise HTTPException(status_code=502, detail=response.model_dump(by_alias=True))
    return response.model_dump(by_alias=True)


@app.post(
    "/api/intelligence/deep-agent/docs-research",
    tags=["Intelligence"],
    summary="Run LangChain docs MCP Deep Agents research",
)
async def run_deep_agent_docs_research(
    request: DocsResearchRequest,
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Run the docs-first Deep Agent with the LangChain docs MCP server."""
    if not _env_flag_enabled("DEEP_AGENTS_DOCS_RESEARCH_ENABLED"):
        raise HTTPException(
            status_code=503,
            detail=(
                "Deep Agents docs research is disabled. Set "
                "DEEP_AGENTS_DOCS_RESEARCH_ENABLED=true to run the docs MCP research agent."
            ),
        )

    response = run_docs_research_agent(
        request,
        model=os.getenv("DEEP_AGENTS_DOCS_RESEARCH_MODEL", "openai:gpt-5.4-mini"),
    )
    if response.mode == "unavailable":
        raise HTTPException(status_code=502, detail=response.model_dump(by_alias=True))
    return response.model_dump(by_alias=True)


@app.post(
    "/api/intelligence/deep-agent/llm-wiki",
    tags=["Intelligence"],
    summary="Run Deep Agents LLM wiki workflow",
)
async def run_deep_agent_llm_wiki(
    request: WikiRequest,
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Run the packaged LLM wiki workflow with local filesystem isolation."""
    if not _env_flag_enabled("DEEP_AGENTS_LLM_WIKI_ENABLED"):
        raise HTTPException(
            status_code=503,
            detail=(
                "Deep Agents LLM wiki is disabled. Set "
                "DEEP_AGENTS_LLM_WIKI_ENABLED=true to run the LLM wiki agent."
            ),
        )

    response = run_llm_wiki_agent(
        request,
        model=os.getenv("DEEP_AGENTS_LLM_WIKI_MODEL", "openai:gpt-5.4-mini"),
    )
    if response.mode == "unavailable":
        raise HTTPException(status_code=502, detail=response.model_dump(by_alias=True))
    return response.model_dump(by_alias=True)


@app.get(
    "/api/intelligence/deep-agent/llm-wiki/archive",
    tags=["Intelligence"],
    summary="List persisted Deep Agents LLM wiki research projects",
)
async def get_deep_agent_llm_wiki_archive(
    user_id: Optional[str] = Query(default=None, alias="userId"),
    topic_slug: Optional[str] = Query(default=None, alias="topicSlug"),
    session_id: Optional[str] = Query(default=None, alias="sessionId"),
    limit: int = Query(default=50, ge=1, le=200),
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Expose completed LLM wiki workspaces so the frontend can browse prior research."""
    response = list_llm_wiki_archive(
        user_id=user_id,
        topic_slug=topic_slug,
        session_id=session_id,
        limit=limit,
    )
    return response.model_dump(by_alias=True)


@app.post(
    "/api/intelligence/app-expert",
    tags=["Intelligence"],
    summary="Run the Alleato App Expert specialist agent",
)
async def run_deep_agent_app_expert(
    request: AppExpertRequest,
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Run the read-only App Expert for questions about the Alleato PM web app."""
    if not _env_flag_enabled("DEEP_AGENTS_APP_EXPERT_ENABLED"):
        raise HTTPException(
            status_code=503,
            detail=(
                "Deep Agents App Expert is disabled. Set "
                "DEEP_AGENTS_APP_EXPERT_ENABLED=true to run the specialist."
            ),
        )

    response = run_app_expert_agent(
        request,
        model=os.getenv("DEEP_AGENTS_APP_EXPERT_MODEL", "openai:gpt-5.4-mini"),
    )
    if response.mode == "unavailable":
        raise HTTPException(status_code=502, detail=response.model_dump(by_alias=True))
    return response.model_dump(by_alias=True)


@app.post(
    "/api/intelligence/research",
    tags=["Intelligence"],
    summary="Run Alleato Deep Agents research",
)
async def run_deep_agent_research(
    request: ResearchRequest,
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Run the standalone research agent with web and Alleato read-only tools."""
    if not _env_flag_enabled("DEEP_AGENTS_RESEARCH_ENABLED"):
        raise HTTPException(
            status_code=503,
            detail=(
                "Deep Agents research is disabled. Set "
                "DEEP_AGENTS_RESEARCH_ENABLED=true to run the research agent."
            ),
        )

    response = run_research_agent(
        request,
        model=os.getenv("DEEP_AGENTS_RESEARCH_MODEL", "openai:gpt-5.4-mini"),
    )
    if response.mode == "unavailable":
        raise HTTPException(status_code=502, detail=response.model_dump(by_alias=True))
    return response.model_dump(by_alias=True)


@app.post(
    "/api/intelligence/microsoft-executive-assistant",
    tags=["Intelligence"],
    summary="Run the Microsoft Executive Assistant specialist agent",
)
async def run_deep_agent_microsoft_executive_assistant(
    request: MicrosoftExecutiveAssistantRequest,
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Run the Microsoft specialist instead of making the Strategist operate Microsoft directly."""
    if not _env_flag_enabled("DEEP_AGENTS_MICROSOFT_EXECUTIVE_ASSISTANT_ENABLED"):
        raise HTTPException(
            status_code=503,
            detail=(
                "Deep Agents Microsoft Executive Assistant is disabled. Set "
                "DEEP_AGENTS_MICROSOFT_EXECUTIVE_ASSISTANT_ENABLED=true to run the specialist."
            ),
        )

    response = run_microsoft_executive_assistant(
        request,
        model=os.getenv(
            "DEEP_AGENTS_MICROSOFT_EXECUTIVE_ASSISTANT_MODEL",
            "openai:gpt-5.4-mini",
        ),
    )
    if response.mode == "unavailable":
        raise HTTPException(status_code=502, detail=response.model_dump(by_alias=True))
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


# In-process cache for the source-sync health endpoint.
# The handler performs 10+ Supabase queries across two projects (MAIN + RAG)
# and can take 20-30 s on busy instances — far exceeding the Next.js 25 s timeout
# when retried. Caching for 60 s keeps the UI responsive without stale risk for
# a status-monitoring endpoint whose meaningful resolution is minutes, not seconds.
_SOURCE_SYNC_HEALTH_CACHE: Tuple[float, Dict[str, Any]] | None = None
_SOURCE_SYNC_HEALTH_CACHE_TTL_S = 60.0
_SOURCE_SYNC_HEALTH_CACHE_LOCK = threading.Lock()


@app.get("/api/health/source-sync", tags=["Health"], summary="Source sync and intelligence health")
async def get_source_sync_health_status(
    _: None = Depends(require_admin_api_key),
) -> Dict[str, Any]:
    """Return sync freshness, vectorization, task extraction, compiler, and packet health.

    Results are cached in-process for up to 60 seconds to avoid repeated full-table
    scans across both Supabase projects on every poll interval. The ``cachedAt``
    field in the response shows the age of the cached result.
    """
    global _SOURCE_SYNC_HEALTH_CACHE  # noqa: PLW0603

    # Fast path: return cached result if still fresh (lock-free read is safe here
    # because Python GIL guarantees atomic reference reads on CPython).
    cached = _SOURCE_SYNC_HEALTH_CACHE
    if cached is not None:
        cached_at, cached_payload = cached
        age = time.monotonic() - cached_at
        if age < _SOURCE_SYNC_HEALTH_CACHE_TTL_S:
            return {**cached_payload, "cachedAt": cached_payload.get("generatedAt"), "cacheAgeSeconds": round(age, 1)}

    with _SOURCE_SYNC_HEALTH_CACHE_LOCK:
        # Re-check under lock — another thread may have refreshed while we waited.
        cached = _SOURCE_SYNC_HEALTH_CACHE
        if cached is not None:
            cached_at, cached_payload = cached
            age = time.monotonic() - cached_at
            if age < _SOURCE_SYNC_HEALTH_CACHE_TTL_S:
                return {**cached_payload, "cachedAt": cached_payload.get("generatedAt"), "cacheAgeSeconds": round(age, 1)}

        try:
            from src.services.health.source_sync_health import get_source_sync_health
            from src.services.supabase_helpers import get_supabase_client

            client = get_supabase_client()
            payload = get_source_sync_health(client)
            _SOURCE_SYNC_HEALTH_CACHE = (time.monotonic(), payload)
            return payload
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

    if alleato_system_mcp_enabled():
        app.state.alleato_system_mcp_lifespan = create_alleato_system_mcp_lifespan()
        await app.state.alleato_system_mcp_lifespan.__aenter__()


@app.on_event("startup")
async def emit_langsmith_tracing_probe() -> None:
    # If tracing breaks again, this run is the first thing missing from the
    # LangSmith project — we see the regression on deploy instead of finding out
    # a day later. Failure here is logged, never crashes the app.
    import os

    project = os.getenv("LANGSMITH_PROJECT") or os.getenv("LANGCHAIN_PROJECT")
    tracing_on = (
        os.getenv("LANGSMITH_TRACING") == "true"
        or os.getenv("LANGCHAIN_TRACING_V2") == "true"
    )
    has_key = bool(os.getenv("LANGSMITH_API_KEY") or os.getenv("LANGCHAIN_API_KEY"))
    if not (project and tracing_on and has_key):
        logger.warning(
            "[tracing-probe] LangSmith not fully configured (project=%s tracing=%s api_key=%s) — skipping probe",
            bool(project), tracing_on, has_key,
        )
        return

    try:
        from langsmith import traceable

        @traceable(name="alleato-backend.startup_probe", project_name=project)
        def _probe() -> dict:
            return {
                "service": os.getenv("LANGSMITH_DEPLOYMENT_NAME", "alleato-backend"),
                "commit": os.getenv("RENDER_GIT_COMMIT", "unknown"),
                "ok": True,
            }

        result = _probe()
        logger.info("[tracing-probe] emitted startup trace to project=%s result=%s", project, result)
    except Exception as exc:
        logger.warning("[tracing-probe] failed to emit startup trace: %s", exc, exc_info=True)


@app.on_event("shutdown")
async def stop_scheduler():
    """Gracefully shut down the scheduler."""
    try:
        from src.services.scheduler import shutdown_scheduler
        shutdown_scheduler()
    except Exception:
        pass

    mcp_lifespan = getattr(app.state, "alleato_system_mcp_lifespan", None)
    if mcp_lifespan is not None:
        await mcp_lifespan.__aexit__(None, None, None)


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
    if os.getenv("LEGACY_DAILY_DIGEST_ENABLED", "false").lower() != "true":
        logger.warning(
            "[DailyDigest] Legacy daily digest API blocked. Executive Daily Brief must run through the AI Ops gateway ledger."
        )
        raise HTTPException(
            status_code=409,
            detail={
                "code": "LEGACY_DAILY_DIGEST_DISABLED",
                "message": "Legacy daily digest is disabled. Executive Daily Brief generation must run through the AI Ops gateway ledger.",
                "canonical_runner": "frontend/scripts/run-executive-daily-brief.ts",
            },
        )

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
