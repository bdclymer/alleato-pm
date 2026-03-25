# Backend Architecture Documentation

## Alleato-Procore Backend Service

Comprehensive architecture reference for the Python FastAPI backend powering AI-driven construction project management features.

> The backend is a Python FastAPI service running on port **8051**. It handles AI/agent pipelines requiring server-side orchestration, background job scheduling (daily digest, memory decay), Acumatica ERP bidirectional sync, document ingestion, and RAG pipeline processing. It is not the primary data API (Next.js handles most REST endpoints). The backend exists for heavy AI workloads and integrations that require Python's AI ecosystem.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [API Endpoints](#api-endpoints)
3. [Service Architecture](#service-architecture)
4. [AI Agent Architecture](#ai-agent-architecture)
5. [RAG Pipeline](#rag-pipeline)
6. [Agent Workflow](#agent-workflow)
7. [Scheduled Jobs](#scheduled-jobs)
8. [Supabase Integration](#supabase-integration)
9. [Acumatica Sync](#acumatica-sync)
10. [Deployment](#deployment)
11. [Scripts](#scripts)
12. [Dependencies](#dependencies)

---

## Technology Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Language | Python | 3.11 |
| Web Framework | FastAPI | 0.104+ |
| ASGI Server | Uvicorn | latest |
| AI (OpenAI) | OpenAI SDK | 1.0+ |
| AI (OpenAI Agents) | OpenAI Agents SDK | 0.1+ |
| AI (Anthropic) | Claude Agent SDK | 0.1.18+ |
| AI (LangChain) | LangChain | 0.1+ |
| AI (LangChain Community) | LangChain Community | 0.0.10+ |
| Database Client | Supabase Python | 2.0+ |
| Database (async) | asyncpg | latest |
| Database (sync) | psycopg2-binary | latest |
| Scheduler | APScheduler | latest |
| Web Scraping | Crawl4AI | latest |
| Observability | Langfuse | latest |
| Deployment | Docker on Render | port 8051 |

**Entry point:** `entrypoint.py` starts Uvicorn which loads `src.api.main:app`.

---

## API Endpoints

### Health Check

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness probe for Render health checks |

### ChatKit (Construction PM Agents)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/chatkit` | Send a message to the construction PM agent system |
| GET | `/chatkit/state` | Retrieve current ChatKit thread state |
| GET | `/chatkit/bootstrap` | Initialize ChatKit session with default configuration |

**Agent routing flow:** Incoming messages pass through a triage layer that routes to one of four specialist agents:

- **Budget Agent** -- handles budget queries, cost tracking, financial forecasts
- **Change Order Agent** -- manages change order workflows, approval status, impact analysis
- **RFI Agent** -- processes requests for information, tracks response timelines
- **Submittal Agent** -- handles submittal tracking, review cycles, approval workflows

### RAG ChatKit (Retrieval-Augmented Generation)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/rag-chatkit` | Send a message with RAG context (SSE streaming response) |
| GET | `/rag-chatkit/state` | Retrieve current RAG ChatKit thread state |
| GET | `/rag-chatkit/bootstrap` | Initialize RAG ChatKit session |

**Agent routing flow:** Messages are classified and routed to one of three specialist agents:

- **Project Agent** -- answers project-specific queries using project document context
- **Knowledge Base Agent** -- answers company policy and procedural questions
- **Strategist Agent** -- performs cross-project analysis and strategic recommendations

### Simple Chat

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Keyword-based search chat (lightweight, no agent orchestration) |
| POST | `/api/rag-chat-simple` | Agent-powered RAG chat (single-turn, no thread state) |

### Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List all projects accessible to the authenticated user |
| GET | `/api/projects/{project_id}` | Retrieve details for a specific project |

### Ingestion

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ingest/fireflies` | Process a Fireflies meeting transcript through the ingestion pipeline |

### Admin

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/documents/generate-embeddings` | Trigger embedding generation for ingested documents |
| GET | `/api/admin/documents/embedding-status` | Check progress of embedding generation jobs |
| GET | `/api/admin/documents/pipeline-stats` | Retrieve overall ingestion pipeline statistics |

### YokeFlow

| Mount Point | Description |
|-------------|-------------|
| `/yokeflow` | Agent execution platform (mounted as a sub-application) |

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

### 1. alleato_agent_workflow/ -- RAG Agent System

The core multi-agent orchestration layer for retrieval-augmented generation.

```
alleato_agent_workflow/
  workflow.py                  # Main orchestration entry point
  guardrails.py                # Jailbreak prevention and safety checks
  agents/
    classification.py          # Routes queries to project/policy/strategic
    project.py                 # Project-specific query handling
    knowledge_base.py          # Company policy and knowledge queries
    strategist.py              # Cross-project strategic analysis
    unified.py                 # Single agent mode (USE_UNIFIED_AGENT=true)
  tools/
    vector_search.py           # Similarity search against vector stores
    retrieval.py               # Document chunk retrieval
    project_assignment.py      # Project context assignment
    mcp.py                     # Model Context Protocol integration
```

**Key design decisions:**

- Classification-first routing ensures queries reach the most capable specialist agent.
- The unified agent mode (`USE_UNIFIED_AGENT=true` environment variable) collapses all agents into a single agent for simpler deployments or debugging.
- Guardrails run before classification to block prompt injection and jailbreak attempts.

### 2. knowledge-base/ -- Full RAG Platform

End-to-end retrieval-augmented generation infrastructure including ingestion, retrieval, evaluation, and response synthesis.

```
knowledge-base/
  ingestion/
    chunkers/                  # Recursive, heading-aware, and hybrid chunking strategies
    loaders/                   # PDF, DOCX, HTML, Markdown, CSV document loaders
  retrieval/
    pipeline.py                # Orchestrates the full retrieval flow
    query_expansion.py         # Expands user queries for better recall
    reranker.py                # Re-ranks retrieved chunks by relevance
    citations.py               # Extracts and formats source citations
    filtering.py               # Metadata-based result filtering
  stores/
    qdrant.py                  # Qdrant vector store integration
    openai_file_search.py      # OpenAI file search store integration
  evals/
    harness.py                 # RAG evaluation harness
    datasets.py                # Evaluation dataset management
    graders.py                 # Automated grading of RAG responses
    metrics.py                 # Retrieval and generation quality metrics
    rubrics.py                 # Human-aligned evaluation rubrics
  models/
    response_synthesis.py      # Final response generation with retrieved context
```

**Chunking strategies:**

- **Recursive** -- splits on paragraph and sentence boundaries, respects token limits
- **Heading-aware** -- preserves document section structure during chunking
- **Hybrid** -- combines recursive splitting with heading awareness for best results

### 3. ingestion/ -- Fireflies Transcript Pipeline

Processes meeting transcripts from Fireflies into searchable, embeddable content.

**Pipeline stages:**

1. **Parse** -- extract raw transcript text and speaker labels
2. **Metadata extraction** -- identify meeting participants, date, topic, action items
3. **Chunking** -- split transcript into semantically coherent chunks
4. **Embedding generation** -- produce vector embeddings for each chunk
5. **Supabase storage** -- persist chunks and embeddings to the database

### 4. insights/ -- TypeScript Workers

TypeScript-based worker processes for background intelligence tasks.

- **Insight generation** -- analyzes project data to surface actionable insights
- **Project assignment** -- automatically assigns documents and data to relevant projects

### 5. supabase_helpers.py -- Centralized Database Client

Single module providing:

- Supabase client initialization and connection pooling
- RAG store operations (insert/query embeddings, manage documents)
- Shared across all services to prevent connection proliferation

### 6. memory_store.py -- In-Memory Thread Storage

Maintains ChatKit conversation thread state in memory.

- Thread creation and retrieval
- Message history management
- Session lifecycle management

**Note:** This is an in-memory store. Thread state does not persist across server restarts. Production deployments should consider backing this with Supabase or Redis for durability.

---

## AI Agent Architecture

### Multi-Agent Workflow (`alleato_agent_workflow/`)

Orchestrates multiple AI agents using OpenAI Agents SDK + Claude Agent SDK:

- **Project Intelligence Agent** -- analyzes project data, identifies risks
- **Financial Analysis Agent** -- processes budget and cost data
- **Meeting Intelligence Agent** -- extracts action items and summaries
- **RFI Agent** (`rfi_agent/`) -- specialized RFI drafting and analysis

### Agent Framework Stack

```
openai-agents (0.1+)          — OpenAI Agents SDK for multi-agent coordination
claude-agent-sdk (0.1.18+)    — Claude Agent SDK integration
langchain (0.1+)              — LLM pipeline chains
langchain-community (0.0.10+) — Extended connectors
```

---

## RAG Pipeline

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
**LLM:** `gpt-4o-mini` -- direct OpenAI API (not through AI Gateway)
**Job tracking:** `fireflies_ingestion_jobs` (stage: `chunked` -> `embedded` -> `done` / `error`)
**Retry:** Exponential backoff on transient DB timeouts (`PIPELINE_TRANSIENT_RETRIES` env var)

---

## Agent Workflow

The RAG ChatKit agent workflow follows a six-step pipeline:

```
User Query
    |
    v
[1] Guardrails Check
    |  - Jailbreak detection
    |  - Content safety validation
    |  - If blocked: return safety response
    |
    v
[2] Classification Agent
    |  - Analyzes query intent
    |  - Returns: "project", "policy", or "strategic"
    |
    v
[3] Route to Specialist Agent
    |  - project  --> Project Agent
    |  - policy   --> Knowledge Base Agent
    |  - strategic --> Strategist Agent
    |
    v
[4] RAG Tool Execution
    |  - Vector similarity search
    |  - Document chunk retrieval
    |  - Metadata filtering
    |  - Query expansion (if needed)
    |
    v
[5] Response Generation
    |  - Synthesize answer from retrieved context
    |  - Extract and format citations
    |  - Apply reranking for relevance
    |
    v
[6] SSE Streaming to Frontend
       - Tokens streamed as Server-Sent Events
       - Citations appended at end of stream
```

**Unified agent mode:** When `USE_UNIFIED_AGENT=true` is set, steps 2 and 3 are bypassed. A single agent handles all query types directly, which simplifies debugging and reduces latency at the cost of specialization.

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

Bidirectional sync with Acumatica ERP using cookie-based authentication (NOT bearer token):

```python
# Cookie-based auth
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
    # NEVER use $filter — causes HTTP 500 "Type conversions not supported"
)
```

**CRITICAL:** Never use OData `$filter` -- it causes HTTP 500. Use `$select`, `$top`, `$expand` only. Filter results in-memory.

---

## Deployment

### FastAPI Configuration

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

### Docker Configuration

- **Base image:** Python 3.11-slim
- **Health check:** HTTP GET to `/health` endpoint
- **Port:** 8051 (exposed and mapped)

### Render Configuration

- **Service type:** Docker
- **Port:** 8051
- **Environment variables:** Supabase URL, Supabase service role key, OpenAI API key, Accounting credentials, and other service credentials
- **PYTHONPATH:** `/app:/app/src:/app/src/services:/app/src/workers`

### CORS Configuration

| Environment | Allowed Origins |
|-------------|----------------|
| Development | `http://localhost:3000`, `http://localhost:3001` |
| Production | `https://alleato-procore.vercel.app` |

### Local Development

```bash
cd backend
source .venv/bin/activate
./start.sh    # Starts Uvicorn with hot reload

# Tests
pytest
pytest tests/ -v --asyncio-mode=auto
```

---

## Scripts

Utility scripts for data management, processing, and maintenance tasks.

| Script | Purpose |
|--------|---------|
| `import_budget_from_excel.py` | Import budget data from Excel spreadsheets into Supabase |
| `seed_cost_codes.py` | Seed the database with standard construction cost codes |
| `extract_meeting_insights.py` | Extract actionable insights from processed meeting transcripts |
| `extract_tasks_from_meetings.py` | Identify and extract tasks/action items from meeting data |
| `generate_project_summaries_batch.py` | Batch-generate AI summaries for all projects |
| `generate_daily_recap.py` | Generate daily activity recaps across projects |
| `process_all_unprocessed_meetings.py` | Run the full ingestion pipeline on all pending meetings |
| `validate_schema.py` | Validate database schema integrity and consistency |

---

## Dependencies

48 packages organized by function.

### AI and Machine Learning

| Package | Purpose |
|---------|---------|
| `openai` | OpenAI API client (GPT models, embeddings) |
| `openai-agents` | OpenAI Agents SDK (multi-agent orchestration) |
| `openai-chatkit` | OpenAI ChatKit (conversational UI backend) |
| `langchain` | LLM application framework (chains, prompts, memory) |
| `langchain-community` | Extended connectors for LangChain |
| `claude-agent-sdk` | Anthropic Claude Agent SDK |

### Web Framework

| Package | Purpose |
|---------|---------|
| `fastapi` | High-performance async web framework |
| `uvicorn` | ASGI server for FastAPI |
| `python-multipart` | Multipart form data parsing (file uploads) |

### Database

| Package | Purpose |
|---------|---------|
| `supabase` | Supabase Python client (auth, database, storage) |
| `psycopg2-binary` | PostgreSQL adapter (synchronous) |
| `asyncpg` | PostgreSQL adapter (asynchronous, high-performance) |

### Scheduling

| Package | Purpose |
|---------|---------|
| `apscheduler` | Background job scheduling (daily digest, memory decay, etc.) |

### Data Processing

| Package | Purpose |
|---------|---------|
| `pandas` | Data manipulation and analysis |
| `numpy` | Numerical computing |
| `pydantic` | Data validation and serialization |
| `pydantic-settings` | Settings management with environment variable loading |

### Web Scraping

| Package | Purpose |
|---------|---------|
| `crawl4ai` | AI-powered web crawling and scraping |
| `beautifulsoup4` | HTML/XML parsing |
| `httpx` | Async HTTP client |

### Security

| Package | Purpose |
|---------|---------|
| `python-jose` | JWT token encoding/decoding |
| `passlib` | Password hashing (bcrypt) |

### Monitoring

| Package | Purpose |
|---------|---------|
| `langfuse` | LLM observability, tracing, and evaluation |

### Agent Platform

| Package | Purpose |
|---------|---------|
| `websockets` | WebSocket client/server for real-time agent communication |
| `pyyaml` | YAML configuration parsing |
| `aiohttp` | Async HTTP client/server for agent networking |

---

_Generated using BMAD Method document-project workflow. Last merged: 2026-03-24._
