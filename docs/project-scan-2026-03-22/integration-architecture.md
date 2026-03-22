# Integration Architecture — Alleato-PM

> Generated: 2026-03-22 | Multi-part monorepo integration map

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ALLEATO-PM SYSTEM                           │
├──────────────────────────┬──────────────────────────────────────────┤
│   Frontend (Vercel)      │          Backend (Render)                │
│                          │                                          │
│   Next.js 15 / React 19  │   Python FastAPI (port 8051)            │
│   ├── App Router         │   ├── RAG Pipeline                      │
│   ├── proxy.ts (auth)    │   ├── Daily Digest Generation           │
│   ├── API Routes (150+)  │   ├── Acumatica Sync Service           │
│   ├── AI SDK v6          │   ├── Multi-Agent Workflow              │
│   └── Liveblocks         │   └── APScheduler (cron)               │
│                          │                                          │
│   Rewrites:              │                                          │
│   /rag-chatkit/* ────────┼──► http://127.0.0.1:8051               │
│   /chatkit/* ────────────┼──► http://127.0.0.1:8051               │
├──────────────────────────┴──────────────────────────────────────────┤
│                    Supabase (Shared Database)                        │
│   PostgreSQL + RLS | Auth | Storage | pgvector                      │
│   55 migrations | Auto-generated TypeScript types                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Frontend ↔ Backend Integration

### Proxy Rewrite (Next.js → FastAPI)
`next.config.ts` rewrites `/rag-chatkit/*` and `/chatkit/*` to `http://127.0.0.1:8051`:

```typescript
rewrites: [
  { source: '/rag-chatkit/:path*', destination: 'http://127.0.0.1:8051/rag-chatkit/:path*' },
  { source: '/chatkit/:path*',     destination: 'http://127.0.0.1:8051/chatkit/:path*' }
]
```

This allows the frontend to call the backend as if it were on the same origin (no CORS). In production, Vercel proxies to the Render-hosted backend.

### Direct API Calls (Frontend → Backend)
The frontend also calls backend endpoints directly (bypassing Next.js API routes) for heavy AI operations like RAG ingestion and agent workflows.

---

## Frontend ↔ Supabase Integration

### Client Pattern
```typescript
// Browser client (singleton, reused across renders)
import { createClient } from "@/lib/supabase/client";

// Server component / API route (new instance per request)
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
```

### Authentication Flow
```
Browser Request
  → proxy.ts (Next.js middleware)
  → updateSession() [lib/supabase/proxy.ts]
  → Refreshes Supabase JWT in cookies
  → Request proceeds with valid session
  → Route Handler / Server Component
  → createClient() reads session from cookies
  → Supabase enforces RLS with user JWT
```

### Row Level Security
All 287 tables have RLS enabled. Policies:
- **User-owned data:** `auth.uid() = user_id`
- **Project-scoped data:** User must be a member of the project
- **Admin data:** `is_admin(auth.uid())`

Client code does not manually filter by user; the database enforces access.

---

## Backend ↔ Supabase Integration

The Python backend uses:
- `supabase-py` (v2) — async Supabase client with service role key
- `asyncpg` — direct PostgreSQL async connection for high-performance queries
- `psycopg2-binary` — synchronous PostgreSQL for scripts

The backend uses the **service role key** (bypasses RLS) for:
- Scheduled jobs (daily digest, memory decay)
- AI analysis pipelines
- Acumatica sync operations

---

## External Service Integrations

### Acumatica ERP (Bidirectional Sync)

```
Acumatica ERP ←──────────────────────────────→ Alleato-PM
                                                (Supabase)
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

**CRITICAL:** Never use OData `$filter` — causes HTTP 500. Use `$select`, `$top`, `$expand` only. Filter in-memory.

### Fireflies.ai (Meeting Transcripts)

```
Fireflies.ai ───────────────────────────→ Supabase
             Webhook / API                meetings table
                                          meeting_chunks
                                          meeting_embeddings
```

Meeting transcripts are ingested, chunked, and embedded for RAG search. Backend service handles sync and backfill via `mcp__fireflies-docs__search_fireflies` MCP.

### Liveblocks (Real-time Collaboration)

```
Browser ──────────────────────────────────→ Liveblocks
         @liveblocks/* v3.15.2               Rooms, Presence, Storage
         Lexical/Yjs for rich text           WebSocket (managed)
```

**Auth:** `POST /api/liveblocks-auth` — creates Liveblocks session token from Supabase identity.
**Features:** Collaborative cursors, presence indicators, shared rich text editing.

### OpenAI / AI Gateway (AI Inference)

```
Frontend/Backend ─────────────────────────→ AI Gateway
                  ai (Vercel AI SDK v6)       └─→ OpenAI (text-embedding-3-small/large)
                  model: 'openai/gpt-4o'       └─→ OpenAI (GPT-4o, etc.)
                  AI_GATEWAY_API_KEY           └─→ Anthropic (claude-sonnet-4-6)
                  (BYOK — billing stays
                   with OpenAI)
```

**RAG embeddings:** `text-embedding-3-small` (1536-dim) or `text-embedding-3-large`
**Chat:** `gpt-4o` or `claude-sonnet-4-6` via AI Gateway
**Key file:** `frontend/src/lib/ai/providers.ts`

### Vercel Blob (File Storage)

```
Browser ──────────────────────────────────→ Vercel Blob
         @vercel/blob v2.3.x                  S3-compatible object storage
         POST /api/documents/upload           (drawings, documents, attachments)
```

### Resend (Transactional Email)

```
Backend/Frontend ─────────────────────────→ Resend
                  resend v6.9.x               POST /api/notifications/trigger
                  RESEND_API_KEY              Email delivery
```

---

## Data Flow: AI Chat Request

```
1. User submits message in AI chat UI
   → useChat (Vercel AI SDK, @ai-sdk/react)
   → POST /api/ai-assistant/chat

2. Route handler (frontend/src/app/api/ai-assistant/chat/route.ts)
   → Authenticates Supabase session
   → Calls AI orchestrator (frontend/src/lib/ai/orchestrator.ts)

3. Orchestrator determines routing:
   → Financial data → match_meeting_chunks_with_project (pgvector)
   → Meeting context → full_text_search_meetings
   → General knowledge → match_crawled_pages
   → Company context → match_memories

4. Constructs prompt with retrieved context
   → streamText (Vercel AI SDK v6)
   → model: 'openai/gpt-4o' via AI Gateway

5. Streaming response → toUIMessageStreamResponse()
   → SSE back to browser
   → useChat processes UIMessage stream
   → Message.tsx / MessageResponse.tsx renders output
```

---

## Data Flow: RAG Ingestion

```
1. Document uploaded → POST /api/documents/upload
   → Stored in Vercel Blob
   → Record created in `documents` table

2. POST /api/documents/trigger-pipeline
   → backend/src/services/pipeline/

3. Python pipeline:
   → Extract text (pypdf, python-docx)
   → Chunk text into segments
   → Generate embeddings (OpenAI text-embedding-3-small)
   → Store in `document_chunks` + `document_embeddings` tables

4. pgvector enables semantic search:
   → match_documents() / match_chunks()
   → Used by AI orchestrator for RAG context
```

---

## Data Flow: Acumatica Sync

```
1. Cron / manual trigger → POST /api/sync/acumatica/{entity}

2. Route handler → acumatica_sync.py (backend)

3. Backend:
   → POST /entity/auth/login (cookie auth)
   → GET /entity/Default/24.200.001/{Entity}
     (params: $select, $top, $expand only — NO $filter)
   → Filter in-memory

4. Upsert to Supabase:
   → acumatica_{entity} table
   → Update acumatica_sync_state

5. Trigger frontend re-fetch via React Query invalidation
```

---

## Security Architecture

| Layer | Mechanism |
|-------|-----------|
| Request auth | `proxy.ts` → `updateSession()` — Supabase JWT refresh |
| Database | RLS on all 287 tables — enforced at Postgres level |
| API routes | `createClient()` from server — validates JWT per request |
| Backend | Service role key — only for scheduled/internal operations |
| Secrets | `.env` + Vercel/Render dashboard env vars — never committed |
| CORS | `next.config.ts` security headers + backend CORS config |
| File uploads | Supabase Storage RLS policies |
| Liveblocks | Token minted per-user via `/api/liveblocks-auth` |
