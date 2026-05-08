# Backend API Reference

## Overview

The Python FastAPI backend provides ingestion, RAG pipeline, intelligence compilation, and digest endpoints for the Alleato platform. The frontend never calls Supabase directly for these workloads — it routes through this backend.

**What it does:**
- Runs the Fireflies transcript ingestion pipeline (parse → embed → extract)
- Syncs Outlook email, Teams channel messages, and OneDrive files via Microsoft Graph
- Receives Microsoft Graph webhook change notifications
- Compiles Teams DM conversations into structured project intelligence
- Serves a simple RAG chat endpoint for project knowledge queries
- Generates meeting and daily digests
- Exposes admin tooling for pipeline operations and health monitoring

**How the frontend calls it:** All Next.js API routes that need backend data use `fetchWithGuardrails` from `@/lib/fetch-with-guardrails`, pointed at `BACKEND_URL` (an env var set per environment). Raw `fetch()` to the backend is a lint error.

---

## Running locally

```bash
# From the repo root
npm run dev:backend       # starts FastAPI on port 8051

# Or directly with uvicorn
cd backend
uvicorn src.api.main:app --port 8051 --reload
```

**Health check:**
```bash
curl http://localhost:8051/health
```

Returns `{"status": "healthy", ...}` with flags for `openai_configured`, `ai_gateway_configured`, `supabase_service_configured`.

**Interactive API docs:** `http://localhost:8051/docs` (Swagger UI) or `/redoc`.

**CORS origins allowed in dev:** `localhost:3000`, `localhost:3001`, `localhost:8080`. Production Vercel URLs are added via environment.

**Concurrency limits:**
- `PIPELINE_MAX_CONCURRENCY` — max parallel RAG pipeline runs (default: 3)
- `INTELLIGENCE_COMPILER_MAX_CONCURRENCY` — max parallel intelligence compiler runs (default: 1)

---

## Authentication

Admin endpoints are protected by the `require_admin_api_key` dependency. Pass the key in either of these headers:

```
Authorization: Bearer <ADMIN_API_KEY>
x-admin-api-key: <ADMIN_API_KEY>
```

The key is set via the `ADMIN_API_KEY` environment variable on the backend. If the env var is not set, all protected endpoints return `503`. Wrong key returns `401`.

**No-auth endpoints:** `GET /health`, `GET /api/projects`, `GET /api/projects/{project_id}`, `POST /api/chat`, `POST /api/pipeline/process`, `GET /api/intelligence/teams-compiler/status`, `GET /api/digests/meeting/{metadata_id}`, `GET /api/digests/daily/{date}`, `POST /api/graph/webhooks/notifications`, `POST /api/graph/webhooks/lifecycle`.

---

## API Endpoints

### System

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/health` | None | Health check — returns status and AI/Supabase configuration flags |

### Projects

| Method | Path | Auth | Purpose | Key params |
|--------|------|------|---------|-----------|
| GET | `/api/projects` | None | List all projects | — |
| GET | `/api/projects/{project_id}` | None | Project detail with open tasks and recent insights | `project_id` (int) |

### RAG Chat

| Method | Path | Auth | Purpose | Body |
|--------|------|------|---------|------|
| POST | `/api/chat` | None | Keyword/semantic RAG chat against the knowledge base | `{message, project_id?, limit?}` |

The chat endpoint performs financial-structured retrieval first, then semantic vector search, then keyword fallback, then returns recent chunks. It does **not** call an LLM — it assembles a structured reply from retrieved chunks, tasks, and insights.

### Ingestion — Fireflies

| Method | Path | Auth | Purpose | Body |
|--------|------|------|---------|------|
| POST | `/api/ingest/fireflies` | Admin | Ingest a single Fireflies transcript from a local file path. Disabled by default — requires `ENABLE_LEGACY_FIREFLIES_FILE_INGEST=true`. | `{path, project_id?, dry_run}` |
| POST | `/api/ingest/fireflies/recent` | Admin | Fetch recent meetings from the Fireflies API and ingest them | `{limit?, project_id?, dry_run?, write_markdown_dir?}` |

### Ingestion — Microsoft Graph

| Method | Path | Auth | Purpose | Body / Params |
|--------|------|------|---------|--------------|
| POST | `/api/graph/sync` | Admin | Incremental sync of Outlook, Teams, and OneDrive (delta tokens). Requires `GRAPH_SYNC_ENABLED=true` and Microsoft credentials. | `{run_embedding?, run_teams_compiler?, embed_limit?, teams_compiler_batch_size?}` |
| POST | `/api/graph/embed` | Admin | Vectorize pending `document_metadata` rows without fetching new data | `?limit=1000` (query param) |
| POST | `/api/graph/webhooks/notifications` | None | Receive Microsoft Graph change notifications. Handles subscription validation (`?validationToken=`) automatically. | Graph notification JSON |
| POST | `/api/graph/webhooks/lifecycle` | None | Receive Graph subscription lifecycle events (reauthorization requests, expiry) | Graph lifecycle JSON |
| POST | `/api/graph/subscriptions/reconcile` | Admin | Create or renew Graph webhook subscriptions | `{renew_within_hours?, expiration_hours?}` |

### Ingestion — RAG Pipeline

| Method | Path | Auth | Purpose | Body |
|--------|------|------|---------|------|
| POST | `/api/pipeline/process` | None | Run the full RAG pipeline for a `document_metadata` row. Called automatically by a Supabase DB trigger via pg_net on INSERT. Can be called manually. Runs in background. | `{metadataId}` |

Pipeline stages (run in background):
1. **Parser** — parses Fireflies markdown or generic document (PDF/DOCX), LLM segmentation → `meeting_segments`
2. **Embedder** — chunks + embeds with OpenAI → `document_chunks`
3. **Extractor** — structured extraction → `decisions`, `risks`, `tasks`, `opportunities`

### Intelligence

| Method | Path | Auth | Purpose | Body |
|--------|------|------|---------|------|
| POST | `/api/intelligence/teams-compiler/run` | Admin | Compile a bounded batch of Teams DM conversations into structured intelligence. Synchronous (not backgrounded). | `{batch_size?, dry_run?}` — `batch_size` 1–50 |
| GET | `/api/intelligence/teams-compiler/status` | None | Teams compiler monitoring metrics from the `get_teams_compiler_status` RPC | — |
| POST | `/api/intelligence/compiler/run` | Admin | Drain queued source intelligence and packet refresh jobs. Supports `background: true` for async execution. | `{source_limit?, packet_limit?, dry_run?, background?, max_processing_time_ms?}` |
| GET | `/api/intelligence/compiler/status` | Admin | Queue depth, promotion counts, evidence, and packet health for the intelligence compiler | — |

### Health

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/health/source-sync` | Admin | Sync freshness, vectorization, task extraction, compiler, and packet health across all sources |
| POST | `/api/health/source-sync/recompute` | Admin | Recompute health snapshots and persist alert records from current source/vector/task/packet tables |

### Digests

| Method | Path | Auth | Purpose | Params |
|--------|------|------|---------|--------|
| GET | `/api/digests/meeting/{metadata_id}` | None | Post-meeting digest for a specific meeting | `metadata_id` (UUID) |
| POST | `/api/digests/daily/generate` | Admin | Trigger daily digest generation (background). Optional `date` (YYYY-MM-DD) and `days` query params. | `?date=&days=` |
| GET | `/api/digests/daily/{date}` | None | Daily recap for a specific date | `date` (YYYY-MM-DD) |

### Admin (`/api/admin/*`)

All `/api/admin` routes require `ADMIN_API_KEY`.

| Method | Path | Auth | Purpose | Body |
|--------|------|------|---------|------|
| POST | `/api/admin/documents/generate-embeddings` | Admin | Run pipeline stages (parse → embed → extract) for documents in a given `fireflies_ingestion_jobs` stage | `{stage?, limit?, skip_extraction?, skip_embedding?}` |
| GET | `/api/admin/documents/embedding-status/{task_id}` | Admin | Poll status of a background embedding task | `task_id` from generate-embeddings response |
| GET | `/api/admin/documents/pipeline-stats` | Admin | Stage-by-stage document counts from `fireflies_ingestion_jobs` plus 10 most recent records | — |
| POST | `/api/admin/documents/replay-stale-raw-ingested` | Admin | Requeue stale `raw_ingested` jobs by calling `/api/pipeline/process` for each. Supports `dry_run`. | `{stale_minutes?, limit?, dry_run?, include_error_jobs?, error_contains?}` |

---

## Key Services

### Fireflies Ingestion Pipeline

**File:** `backend/src/services/ingestion/fireflies_pipeline.py`

Fetches transcripts from the Fireflies API, converts them to structured markdown, and kicks off the RAG pipeline for each new meeting. Two modes:
- `sync_recent_transcripts` — polls the Fireflies API for the N most recent meetings, deduplicates via `fireflies_id`, writes markdown, and upserts into `document_metadata`
- `ingest_file` — legacy path for local markdown files (requires `ENABLE_LEGACY_FIREFLIES_FILE_INGEST=true`)

### Microsoft Graph Sync

**File:** `backend/src/services/integrations/microsoft_graph/sync.py`

Orchestrates incremental sync for three sources using Microsoft Graph delta tokens:
- **Outlook** (`outlook.py`) — emails for configured users → `outlook_email_intake` + `document_metadata`
- **Teams** (`teams.py`) — channel messages and DM chats → `document_metadata`
- **OneDrive** (`onedrive.py`) — SharePoint and personal drive files → `document_metadata`

Runs on Render cron `alleato-graph-sync` every 30 minutes. After sync, automatically embeds pending documents and runs the Teams compiler.

**Required env vars:** `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`, `GRAPH_SYNC_ENABLED=true`

### Document Parser (PDF/DOCX)

**File:** `backend/src/services/pipeline/document_parser.py`

Stage 1 alternative for non-meeting documents. Extracts raw text from PDF (via pypdf) and DOCX files, uses LLM-based segmentation with a sliding window, and writes to `meeting_segments` so stages 2 and 3 work unchanged.

**Configurable env vars:** `DOC_SEGMENT_WINDOW_LINES` (default 260), `DOC_SEGMENT_WINDOW_OVERLAP` (default 40), `DOC_SUMMARY_MAX_CHARS` (default 12000)

### Teams Intelligence Compiler

**File:** `backend/src/services/intelligence/teams_compiler.py`

Reads buffered Teams DM conversations from `document_metadata`, calls an LLM to extract tasks, decisions, risks, and project signals, then writes to `project_insights`, `tasks`, `insights`, and `source_signal_candidates`. Runs automatically at the end of every graph sync.

**Key constants:** `MAX_LLM_CONVERSATION_CHARS = 6000`, `AUTO_ASSIGN_CONFIDENCE = 0.85`, model defaults in `compiler.py`

### Intelligence Compiler (General)

**File:** `backend/src/services/intelligence/compiler.py`

Drains the source intelligence queue: promotes signal candidates, refreshes intelligence packets, and compiles cross-source summaries. Operates on queued jobs; controlled by `source_limit` and `packet_limit` parameters.

### RAG Health Check

**File:** `backend/src/services/health/rag_meeting_health.py`

Canary check for the AI meeting recall path. Fails loudly if:
- No embeddings exist
- Recent meetings (last 14 days) have < 50% summary embedding coverage
- Newest meeting is > 7 days newer than the newest embedding
- Recent meetings have < 50% chunk coverage
- Embedding endpoint probe fails
- Supabase RPCs return no results for a known-good probe vector
- More than 100 ingestion jobs are stuck at `raw_ingested`
- Any quota-error ingestion jobs exist

Posts a Slack alert on failure if `SLACK_WEBHOOK_URL` is set. Runs on Render cron `alleato-rag-health` daily at 12:15 UTC.

---

## How the Frontend Calls the Backend

All Next.js API routes use `fetchWithGuardrails` from `@/lib/fetch-with-guardrails`. Raw `fetch()` to the backend is a lint error (`require-api-client` ESLint rule).

```ts
import { fetchWithGuardrails } from "@/lib/fetch-with-guardrails";

const res = await fetchWithGuardrails(`${process.env.BACKEND_URL}/api/graph/sync`, {
  method: "POST",
  body: JSON.stringify({ run_embedding: true }),
  requestId,           // propagates x-request-id header
  where: "route/graph-sync",
  timeoutMs: 30_000,   // default 10_000; use 30_000 for AI/slow calls
  retries: 0,          // default 2; use 0 for non-idempotent writes
});
const data = await res.json();
```

**Pre-built policies:**

| Import | Timeout | Retries | Use for |
|--------|---------|---------|---------|
| `DEFAULT_POLICY` | 10s | 2 | GET / read calls |
| `AI_CALL_POLICY` | 30s | 1 | LLM / AI calls |
| `WRITE_POLICY` | 10s | 0 | Non-idempotent writes |
| `HEALTH_CHECK_POLICY` | 5s | 0 | Health probes |

`fetchWithGuardrails` automatically:
- Propagates `x-request-id` to the backend
- Sets `Content-Type: application/json` when a body is present
- Retries on 5xx and network errors with exponential backoff
- Throws a `GuardrailError` (code `UPSTREAM_FAILURE` or `UPSTREAM_TIMEOUT`) on failure — never a generic error

**BACKEND_URL** env var:
- Dev: `http://localhost:8051`
- Production: set in Vercel environment to the Render service URL
- Staging: set in Vercel Preview environment to the staging Render service URL

---

## Adding a New Endpoint

1. **Add the route to `main.py`** (or `admin_endpoints.py` for admin-only operations):

```python
from fastapi import Depends
from src.api.admin_endpoints import require_admin_api_key

@app.post("/api/my-feature/action", tags=["MyFeature"], summary="One-line description")
async def my_feature_action(
    payload: MyActionRequest,
    _: None = Depends(require_admin_api_key),  # omit if public
) -> Dict[str, Any]:
    """Docstring shown in Swagger UI."""
    # ... implementation
    return {"status": "ok"}
```

2. **For background work**, add to `BackgroundTasks` rather than blocking the request:

```python
async def my_action(background_tasks: BackgroundTasks, ...):
    background_tasks.add_task(my_long_running_fn, arg1, arg2)
    return {"status": "queued"}
```

3. **Call it from a Next.js API route** using `fetchWithGuardrails`:

```ts
const res = await fetchWithGuardrails(
  `${process.env.BACKEND_URL}/api/my-feature/action`,
  { method: "POST", body: JSON.stringify(payload), requestId, where: "api/my-feature" }
);
```

4. **Add it to the smoke test** in `scripts/api-smoke-test.sh` so regressions are caught automatically.

5. **Add the `ADMIN_API_KEY` header** in all admin-gated test calls:
```bash
curl -X POST http://localhost:8051/api/my-feature/action \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```
