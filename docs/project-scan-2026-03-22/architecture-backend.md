# Backend Architecture — Alleato-PM

> Generated: 2026-03-22 | Python FastAPI / OpenAI Agents / LangChain

---

## Overview

The backend is a Python FastAPI service running on port 8051. It handles:
- AI/agent pipelines requiring server-side orchestration
- Background job scheduling (daily digest, memory decay)
- Acumatica ERP bidirectional sync
- Document ingestion and RAG pipeline processing
- OpenAI ChatKit server-side endpoint

It is not the primary data API (Next.js handles most REST endpoints). The backend exists for heavy AI workloads and integrations that require Python's AI ecosystem.

---

## Service Architecture

```
backend/src/
├── api/
│   ├── main.py             # FastAPI app: creates app, registers routers, CORS config
│   ├── server.py           # Uvicorn server entrypoint
│   └── admin_endpoints.py  # Admin management endpoints
│
├── services/
│   ├── acumatica_sync.py       # Acumatica ERP sync (cookie auth)
│   ├── daily_digest.py         # AI daily briefing generation
│   ├── email_service.py        # Transactional email (Resend)
│   ├── memory_store.py         # AI memory CRUD + vector search
│   ├── scheduler.py            # APScheduler job definitions
│   ├── supabase_helpers.py     # Shared Supabase utility functions
│   │
│   ├── ingestion/              # Document + web ingestion pipeline
│   ├── insights/               # AI insights generation
│   ├── integrations/           # Third-party integrations
│   ├── pipeline/               # RAG pipeline orchestration
│   ├── alleato_agent_workflow/ # Multi-agent orchestration
│   └── rfi_agent/              # RFI-specific AI agent
│
├── scripts/                # One-off migration/fix scripts
├── types/                  # Pydantic type definitions
└── workers/                # Background task workers
```

---

## FastAPI Configuration

```python
# main.py pattern
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://alleato-procore.vercel.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Port:** 8051 (proxied from frontend at `/rag-chatkit/*`)
**Health check:** `GET /health`
**ASGI server:** Uvicorn

---

## AI Agent Architecture

### Multi-Agent Workflow (`alleato_agent_workflow/`)
Orchestrates multiple AI agents using OpenAI Agents SDK + Claude Agent SDK:
- **Project Intelligence Agent** — Analyzes project data, identifies risks
- **Financial Analysis Agent** — Processes budget and cost data
- **Meeting Intelligence Agent** — Extracts action items and summaries
- **RFI Agent** (`rfi_agent/`) — Specialized RFI drafting and analysis

### Agent Framework Stack
```
openai-agents (0.1+)          — OpenAI Agents SDK for multi-agent coordination
claude-agent-sdk (0.1.18+)    — Claude Agent SDK integration
langchain (0.1+)              — LLM pipeline chains
langchain-community (0.0.10+) — Extended connectors
```

---

## RAG Pipeline (`services/pipeline/`)

Full detail: [`rag-pipeline.md`](rag-pipeline.md)

The pipeline runs as 3 sequential stages triggered by `metadata_id` (UUID in `document_metadata`):

```
document_metadata (input)
  │
  ├── Stage 1: Parser — routes by document type
  │   ├── source="fireflies" / category="meeting" → Meeting Parser (Fireflies markdown)
  │   ├── .pdf / .docx / .doc                     → Generic Document Parser
  │   └── .csv/.xlsx + financial category          → Financial Parser
  │   └── Writes semantic segments → meeting_segments table
  │
  ├── Stage 2: Embedder
  │   ├── Chunks: 3000 chars target / 500 overlap, sentence boundaries
  │   ├── Chunk types: transcript, section (Summary, Action Items, Notes topics),
  │   │   segment summary, meeting summary
  │   ├── Batch-embeds: text-embedding-3-large (3072-dim, halfvec)
  │   └── Stores → documents table (upserted by content-hash)
  │
  └── Stage 3: Extractor
      ├── LLM (gpt-4o-mini) normalizes decisions/risks/tasks/opportunities
      ├── Stores → insights table (decisions, risks, opportunities)
      └── Stores → tasks table (assignee, email, due date, priority)
```

**Embedding model:** `text-embedding-3-large` at **3072 dimensions** (`halfvec(3072)`)
**LLM:** `gpt-4o-mini` — direct OpenAI API (not through AI Gateway)
**Job tracking:** `fireflies_ingestion_jobs` (stage: `chunked` → `embedded` → `done` / `error`)
**Retry:** Exponential backoff on transient DB timeouts (`PIPELINE_TRANSIENT_RETRIES` env var)

---

## Scheduled Jobs (APScheduler)

`services/scheduler.py` defines background jobs:

| Job | Schedule | Description |
|-----|----------|-------------|
| Daily Digest | Daily 6:00 AM | Generate AI briefings per project |
| Memory Decay | Weekly | Decay/expire old AI memories |
| Meeting Sync | On trigger | Re-sync Fireflies meeting data |
| Insights Refresh | Periodic | Regenerate AI insights |

---

## Supabase Integration

The backend uses the **service role key** (bypasses RLS) for all database access:

```python
from supabase import create_client, Client

supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]  # Bypasses RLS
)
```

High-performance queries use asyncpg directly:
```python
import asyncpg

conn = await asyncpg.connect(os.environ["DATABASE_URL"])
rows = await conn.fetch("SELECT * FROM meetings WHERE project_id = $1", project_id)
```

---

## Acumatica Sync

```python
# Cookie-based auth (NOT bearer token)
auth_response = await client.post(
    f"{base_url}/entity/auth/login",
    json={
        "name": os.environ["ACCOUNTING_USER"],
        "password": os.environ["ACCOUNTING_PASSWORD"],
        "company": "Alleato Group LLC"  # Exact casing required
    }
)
# 204 response + cookies

# Fetch data (safe OData params only)
data = await client.get(
    f"{base_url}/entity/Default/24.200.001/APBill",
    params={"$select": "ReferenceNbr,Status,Amount", "$top": 500}
    # NEVER use $filter — causes HTTP 500
)
```

---

## Deployment

- **Platform:** Render (Docker-based)
- **Config:** `render.yaml` + `Dockerfile`
- **Local:** `backend/start.sh` (starts Uvicorn with hot reload)
- **Tests:** pytest + pytest-asyncio

```bash
# Local development
cd backend
source .venv/bin/activate
./start.sh

# Tests
pytest
pytest tests/ -v --asyncio-mode=auto
```
