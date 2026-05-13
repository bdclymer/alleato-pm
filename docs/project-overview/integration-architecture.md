# Integration Architecture -- Alleato-PM

> Last updated: 2026-03-24

---

## System Overview

```
+---------------------------------------------------------------------+
|                         ALLEATO-PM SYSTEM                           |
+---------------------------+-----------------------------------------+
|   Frontend (Vercel)       |          Backend (Render)               |
|                           |                                         |
|   Next.js 15 / React 19  |   Python FastAPI (port 8051)            |
|   +-- App Router          |   +-- RAG Pipeline                     |
|   +-- proxy.ts (auth)     |   +-- Daily Digest Generation          |
|   +-- API Routes (196+)   |   +-- Acumatica Sync Service           |
|   +-- AI SDK v6           |   +-- Multi-Agent Workflow              |
|   +-- Liveblocks          |   +-- APScheduler (cron)               |
|                           |                                         |
|   Rewrites:               |                                         |
|   /rag-chatkit/* ---------+---> http://127.0.0.1:8051              |
|   /chatkit/* -------------+---> http://127.0.0.1:8051              |
+---------------------------+-----------------------------------------+
|                    Supabase (Shared Database)                       |
|   PostgreSQL + RLS | Auth | Storage | pgvector                     |
|   55 migrations | Auto-generated TypeScript types                  |
+---------------------------------------------------------------------+
```

---

## Integration Points

### 1. Frontend -> Supabase (Direct)

**Pattern:** Supabase JS SDK with browser and server clients

**Client Types:**
- **Browser Client** (`createBrowserClient`): Singleton, used in client components and hooks
- **Server Client** (`createServerClient`): Per-request, used in API routes and server components
- **Service Client**: Bypasses RLS for admin operations

**Data Flow:**
```
User action -> Hook (use-*.ts) -> Supabase query -> PostgreSQL -> Response -> React Query cache -> UI update
```

**Key Files:**
- `frontend/src/lib/supabase/client.ts` - Browser client singleton
- `frontend/src/lib/supabase/server.ts` - Server client factory
- `frontend/src/hooks/use-*.ts` - 74+ data hooks

**Authentication:**
- Supabase Auth handles user sessions
- Server components use `cookies()` for session extraction
- RLS policies enforce per-user data access
- Auth state saved for Playwright tests at `tests/.auth/user.json`

### 2. Frontend -> Backend (HTTP Proxy)

**Pattern:** Next.js rewrite rules proxy specific paths to the backend

**Configuration** (`frontend/next.config.ts`):
```typescript
rewrites: async () => ({
  beforeFiles: [
    { source: '/rag-chatkit/:path*', destination: 'http://127.0.0.1:8051/rag-chatkit/:path*' },
    { source: '/chatkit/:path*', destination: 'http://127.0.0.1:8051/chatkit/:path*' },
  ],
})
```

This allows the frontend to call the backend as if it were on the same origin (no CORS). In production, Vercel proxies to the Render-hosted backend.

**Endpoints Proxied:**

| Frontend Path | Backend Path | Purpose |
|---------------|-------------|---------|
| `/rag-chatkit` | `/rag-chatkit` | RAG ChatKit (SSE streaming) |
| `/rag-chatkit/state` | `/rag-chatkit/state` | RAG conversation state |
| `/rag-chatkit/bootstrap` | `/rag-chatkit/bootstrap` | RAG session initialization |
| `/chatkit` | `/chatkit` | Construction PM ChatKit |
| `/chatkit/state` | `/chatkit/state` | PM chat state |
| `/chatkit/bootstrap` | `/chatkit/bootstrap` | PM chat initialization |

**Streaming Pattern:**
The RAG ChatKit uses Server-Sent Events (SSE) for real-time AI response streaming:
```
Frontend -> POST /rag-chatkit -> Backend -> Classification Agent -> Specialist Agent -> SSE Stream -> Frontend UI
```

### 3. Backend -> Supabase (Direct)

**Pattern:** Supabase Python SDK + asyncpg for RAG storage and retrieval

The Python backend uses:
- `supabase-py` (v2) -- async Supabase client with service role key (bypasses RLS)
- `asyncpg` -- direct PostgreSQL async connection for high-performance queries
- `psycopg2-binary` -- synchronous PostgreSQL for scripts

**Key File:** `backend/src/services/supabase_helpers.py`

**Operations:**
- Document metadata CRUD (`document_metadata` table)
- Chunk storage and retrieval (`document_chunks` table with embeddings)
- Project data retrieval (`projects`, `schedule_tasks`, etc.)
- Insight storage (`ai_insights`, `ai_tasks` tables)
- Task management for AI workflows

The backend uses the **service role key** (bypasses RLS) for:
- Scheduled jobs (daily digest, memory decay)
- AI analysis pipelines
- Acumatica sync operations

### 4. Backend -> OpenAI

**Pattern:** OpenAI SDK for LLM operations, Agents SDK for multi-agent workflows

**Operations:**
- **Embedding Generation**: OpenAI embeddings for document chunks (vector search)
- **Agent Classification**: GPT-powered query routing to specialist agents
- **Response Synthesis**: LLM-generated responses with RAG context
- **Tool Calling**: Agents call tools for data retrieval, calculations, etc.

### 5. Frontend <-> Supabase Realtime

**Pattern:** Supabase Realtime subscriptions for live updates

**Features:**
- Real-time data changes (INSERT/UPDATE/DELETE broadcasts)
- Presence tracking (who's online in a project)
- Collaborative cursors (real-time user position tracking)

**Key Hooks:**
- `use-realtime-cursors.ts` - Collaborative cursor positions
- `use-realtime-presence-room.ts` - Online presence
- `useDirectoryRealtime.ts` - Real-time directory updates

---

## External Service Integrations

### Acumatica ERP (Bidirectional Sync)

```
Acumatica ERP <----------------------------> Alleato-PM (Supabase)
                Cookie auth (POST /entity/auth/login)
                Company: "Alleato Group LLC"
                API version: 24.200.001
```

**Sync routes (frontend):**
- `POST /api/sync/acumatica/ar-invoices`
- `POST /api/sync/acumatica/ar-payments`
- `POST /api/sync/acumatica/commitments`
- `POST /api/sync/acumatica/direct-costs`
- `POST /api/sync/acumatica/vendors`

**Backend service:** `backend/src/services/acumatica_sync.py`

**CRITICAL:** Never use OData `$filter` -- causes HTTP 500. Use `$select`, `$top`, `$expand` only. Filter in-memory.

### Fireflies.ai (Meeting Transcripts)

```
Fireflies.ai --------------------------------> Supabase
             Webhook / API                      meetings table
                                                meeting_chunks
                                                meeting_embeddings
```

Meeting transcripts are ingested, chunked, and embedded for RAG search. Backend service handles sync and backfill via `mcp__fireflies-docs__search_fireflies` MCP.

### Liveblocks (Real-time Collaboration)

```
Browser --------------------------------------> Liveblocks
         @liveblocks/* v3.15.2                   Rooms, Presence, Storage
         Lexical/Yjs for rich text               WebSocket (managed)
```

**Auth:** `POST /api/liveblocks-auth` -- creates Liveblocks session token from Supabase identity.
**Features:** Collaborative cursors, presence indicators, shared rich text editing.

### OpenAI / AI Gateway (AI Inference)

```
Frontend/Backend -----------------------------> AI Gateway
                  ai (Vercel AI SDK v6)           +-- OpenAI (text-embedding-3-small/large)
                  model: 'openai/gpt-4o'          +-- OpenAI (GPT-4o, etc.)
                  AI_GATEWAY_API_KEY              +-- Anthropic (claude-sonnet-4-6)
                  (BYOK - billing stays
                   with OpenAI)
```

**RAG embeddings:** `text-embedding-3-small` (1536-dim) or `text-embedding-3-large` (3072-dim)
**Chat:** `gpt-4o` or `claude-sonnet-4-6` via AI Gateway
**Key file:** `frontend/src/lib/ai/providers.ts`

### Vercel Blob (File Storage)

```
Browser --------------------------------------> Vercel Blob
         @vercel/blob v2.3.x                    S3-compatible object storage
         POST /api/documents/upload             (drawings, documents, attachments)
```

### Resend (Transactional Email)

```
Backend/Frontend -----------------------------> Resend
                  resend v6.9.x                  POST /api/notifications/trigger
                  RESEND_API_KEY                Email delivery
```

---

## Shared Resources

### Database (Supabase)

Both frontend and backend read/write to the same Supabase PostgreSQL database:

| Domain | Frontend Access | Backend Access |
|--------|----------------|----------------|
| Projects, Budgets, Contracts | Full CRUD | Read-only (for context) |
| Change Events/Orders | Full CRUD | Read-only |
| Directory, People, Companies | Full CRUD | Read-only |
| Documents, Drawings, Specs | Full CRUD | Read + Write (AI processing) |
| AI Insights, Tasks | Read | Write (from analysis) |
| Document Chunks, Embeddings | Read (search) | Write (ingestion pipeline) |
| Chat Sessions, Threads | Read + Write | Read + Write |

### Environment Variables

**Shared:**
- `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY` (backend only, bypasses RLS)

**Frontend-only:**
- Standard Next.js env vars
- Vercel deployment vars

**Backend-only:**
- `OPENAI_API_KEY`
- `USE_UNIFIED_AGENT` (agent routing mode)
- `PORT` (default: 8051)
- `CORS_ORIGINS` (allowed frontend URLs)
- `DATABASE_URL` (for YokeFlow)
- `ACCOUNTING_USER` / `ACCOUNTING_PASSWORD` (Acumatica)

---

## Data Flow Diagrams

### AI Chat Request

```
1. User submits message in AI chat UI
   -> useChat (Vercel AI SDK, @ai-sdk/react)
   -> POST /api/ai-assistant/chat

2. Route handler (frontend/src/app/api/ai-assistant/chat/route.ts)
   -> Authenticates Supabase session
   -> Calls AI orchestrator (frontend/src/lib/ai/orchestrator.ts)

3. Orchestrator determines routing:
   -> Financial data -> match_meeting_chunks_with_project (pgvector)
   -> Meeting context -> full_text_search_meetings
   -> General knowledge -> match_crawled_pages
   -> Company context -> match_memories

4. Constructs prompt with retrieved context
   -> streamText (Vercel AI SDK v6)
   -> model: 'openai/gpt-4o' via AI Gateway

5. Streaming response -> toUIMessageStreamResponse()
   -> SSE back to browser
   -> useChat processes UIMessage stream
   -> Message.tsx / MessageResponse.tsx renders output
```

### RAG Ingestion

```
1. Document uploaded -> POST /api/documents/upload
   -> Stored in Vercel Blob
   -> Record created in documents table

2. POST /api/documents/trigger-pipeline
   -> backend/src/services/pipeline/

3. Python pipeline:
   -> Extract text (pypdf, python-docx)
   -> Chunk text into segments
   -> Generate embeddings (OpenAI text-embedding-3-small)
   -> Store in document_chunks + document_embeddings tables

4. pgvector enables semantic search:
   -> match_documents() / match_chunks()
   -> Used by AI orchestrator for RAG context
```

### Acumatica Sync

```
1. Cron / manual trigger -> POST /api/sync/acumatica/{entity}

2. Route handler -> acumatica_sync.py (backend)

3. Backend:
   -> POST /entity/auth/login (cookie auth)
   -> GET /entity/Default/24.200.001/{Entity}
     (params: $select, $top, $expand only - NO $filter)
   -> Filter in-memory

4. Upsert to Supabase:
   -> acumatica_{entity} table
   -> Update acumatica_sync_state

5. Trigger frontend re-fetch via React Query invalidation
```

---

## Data Consistency Patterns

### Type Generation Pipeline

```
Supabase Schema -> supabase gen types -> database.types.ts -> TypeScript compilation -> Runtime safety
```

The `npm run db:types` command regenerates the types file, ensuring frontend code matches the actual database schema.

### Migration Flow

```
Developer writes SQL -> supabase/migrations/ -> Applied to Supabase -> Types regenerated -> Frontend updated
```

### Financial Data Consistency

Budget calculations flow through multiple tables:
```
budget_lines (original amounts)
  + change_orders (approved changes)
  + direct_costs (actual costs)
  + contract_line_items (committed costs)
  = Budget summary (calculated in API routes)
```

---

## Deployment Architecture (CI/CD)

```
GitHub (main branch)
    |
    +---> GitHub Actions (ci.yml)
    |       +-- Quality check (lint + typecheck)
    |       +-- Unit tests (Jest)
    |       +-- Build verification
    |
    +---> GitHub Actions (deploy-frontend.yml)
    |       +-- Vercel deployment (preview on PR, production on main)
    |
    +---> GitHub Actions (deploy-backend.yml)
    |       +-- Backend tests (pytest)
    |       +-- Render deployment (Docker)
    |
    +---> GitHub Actions (e2e.yml)
            +-- Smoke tests (on PR)
            +-- Full E2E suite (on main + nightly)
```

---

## Security Architecture

| Layer | Mechanism |
|-------|-----------|
| Request auth | `proxy.ts` -> `updateSession()` -- Supabase JWT refresh |
| Database | RLS on all 287 tables -- enforced at Postgres level |
| API routes | `createClient()` from server -- validates JWT per request |
| Backend | Service role key -- only for scheduled/internal operations |
| Secrets | `.env` + Vercel/Render dashboard env vars -- never committed |
| CORS | `next.config.ts` security headers + backend CORS config |
| File uploads | Supabase Storage RLS policies |
| Liveblocks | Token minted per-user via `/api/liveblocks-auth` |

### CORS Configuration

Backend allows requests from:
- `http://localhost:3000` (frontend dev)
- `http://localhost:3001` (frontend dev alt)
- `https://alleato-procore.vercel.app` (production)
- `https://www.alleato-procore.vercel.app` (production www)
- `https://alleato-backend-rbnj.onrender.com` (backend self-reference)

---

_Generated using BMAD Method document-project workflow. Last merged: 2026-03-24._
