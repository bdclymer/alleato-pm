# Alleato-Procore - Integration Architecture

**Date:** 2026-02-23

## Overview

Alleato-Procore is a multi-part system where the frontend (Next.js) and backend (FastAPI) integrate through shared infrastructure (Supabase) and HTTP proxies. This document details how the parts communicate.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   Vercel (Frontend)                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Next.js 15 App Router                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │   │
│  │  │  Pages (31    │  │  API Routes  │  │ Middleware │  │   │
│  │  │  project     │  │  (326+ HTTP  │  │ (auth,     │  │   │
│  │  │  tools)      │  │  handlers)   │  │  headers)  │  │   │
│  │  └──────┬───────┘  └──────┬───────┘  └───────────┘  │   │
│  │         │                  │                           │   │
│  │  ┌──────▼──────────────────▼──────────────────────┐  │   │
│  │  │         Supabase Client (SSR + Browser)         │  │   │
│  │  └──────────────────┬─────────────────────────────┘  │   │
│  └─────────────────────┼────────────────────────────────┘   │
│                        │                                     │
│  Proxy rewrites:       │                                     │
│  /rag-chatkit/* ──────►│──► Backend :8051                    │
│  /chatkit/* ──────────►│──► Backend :8051                    │
└────────────────────────┼─────────────────────────────────────┘
                         │
         ┌───────────────▼───────────────┐
         │                               │
┌────────▼────────┐            ┌─────────▼─────────┐
│    Supabase     │            │   Render (Backend)  │
│  ┌───────────┐  │            │  ┌───────────────┐  │
│  │ PostgreSQL │  │            │  │   FastAPI      │  │
│  │ (284 tbls) │  │◄───────────│  │   + Uvicorn   │  │
│  ├───────────┤  │            │  ├───────────────┤  │
│  │    Auth    │  │            │  │ Agent Workflow │  │
│  ├───────────┤  │            │  │ RAG Pipeline   │  │
│  │  Storage   │  │            │  │ Ingestion      │  │
│  ├───────────┤  │            │  │ ChatKit Server │  │
│  │  Realtime  │  │            │  │ YokeFlow       │  │
│  └───────────┘  │            │  └───────────────┘  │
└─────────────────┘            └─────────────────────┘
                                        │
                               ┌────────▼────────┐
                               │    OpenAI API    │
                               │  (GPT, Agents,   │
                               │   Embeddings)    │
                               └─────────────────┘
```

## Integration Points

### 1. Frontend → Supabase (Direct)

**Pattern:** Supabase JS SDK with browser and server clients

**Client Types:**
- **Browser Client** (`createBrowserClient`): Singleton, used in client components and hooks
- **Server Client** (`createServerClient`): Per-request, used in API routes and server components
- **Service Client**: Bypasses RLS for admin operations

**Data Flow:**
```
User action → Hook (use-*.ts) → Supabase query → PostgreSQL → Response → React Query cache → UI update
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

### 2. Frontend → Backend (HTTP Proxy)

**Pattern:** Next.js rewrite rules proxy specific paths to the backend

**Configuration** (`frontend/next.config.ts`):
```typescript
rewrites: async () => ({
  beforeFiles: [
    { source: '/rag-chatkit/:path*', destination: 'http://localhost:8051/rag-chatkit/:path*' },
    { source: '/chatkit/:path*', destination: 'http://localhost:8051/chatkit/:path*' },
  ],
})
```

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
Frontend → POST /rag-chatkit → Backend → Classification Agent → Specialist Agent → SSE Stream → Frontend UI
```

### 3. Backend → Supabase (Direct)

**Pattern:** Supabase Python SDK for RAG storage and retrieval

**Key File:** `backend/src/services/supabase_helpers.py`

**Operations:**
- Document metadata CRUD (`document_metadata` table)
- Chunk storage and retrieval (`document_chunks` table with embeddings)
- Project data retrieval (`projects`, `schedule_tasks`, etc.)
- Insight storage (`ai_insights`, `ai_tasks` tables)
- Task management for AI workflows

### 4. Backend → OpenAI

**Pattern:** OpenAI SDK for LLM operations, Agents SDK for multi-agent workflows

**Operations:**
- **Embedding Generation**: OpenAI embeddings for document chunks (vector search)
- **Agent Classification**: GPT-powered query routing to specialist agents
- **Response Synthesis**: LLM-generated responses with RAG context
- **Tool Calling**: Agents call tools for data retrieval, calculations, etc.

### 5. Frontend ↔ Supabase Realtime

**Pattern:** Supabase Realtime subscriptions for live updates

**Features:**
- Real-time data changes (INSERT/UPDATE/DELETE broadcasts)
- Presence tracking (who's online in a project)
- Collaborative cursors (real-time user position tracking)

**Key Hooks:**
- `use-realtime-cursors.ts` - Collaborative cursor positions
- `use-realtime-presence-room.ts` - Online presence
- `useDirectoryRealtime.ts` - Real-time directory updates

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
- `PORT` (default: 8000)
- `CORS_ORIGINS` (allowed frontend URLs)
- `DATABASE_URL` (for YokeFlow)

## Deployment Architecture

### Production

```
GitHub (main branch)
    │
    ├──► GitHub Actions (ci.yml)
    │       ├── Quality check (lint + typecheck)
    │       ├── Unit tests (Jest)
    │       └── Build verification
    │
    ├──► GitHub Actions (deploy-frontend.yml)
    │       └── Vercel deployment (preview on PR, production on main)
    │
    ├──► GitHub Actions (deploy-backend.yml)
    │       ├── Backend tests (pytest)
    │       └── Render deployment (Docker)
    │
    └──► GitHub Actions (e2e.yml)
            ├── Smoke tests (on PR)
            └── Full E2E suite (on main + nightly)
```

### CORS Configuration

Backend allows requests from:
- `http://localhost:3000` (frontend dev)
- `http://localhost:3001` (frontend dev alt)
- `https://alleato-procore.vercel.app` (production)
- `https://www.alleato-procore.vercel.app` (production www)
- `https://alleato-pm-1.onrender.com` (backend self-reference)

## Data Consistency Patterns

### Type Generation Pipeline

```
Supabase Schema → supabase gen types → database.types.ts → TypeScript compilation → Runtime safety
```

The `npm run db:types` command regenerates the 17,629-line types file, ensuring frontend code matches the actual database schema.

### Migration Flow

```
Developer writes SQL → supabase/migrations/ → Applied to Supabase → Types regenerated → Frontend updated
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

_Generated using BMAD Method `document-project` workflow_
