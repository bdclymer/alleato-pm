# Alleato-Procore Documentation Index

**Type:** Multi-part monorepo with 2 parts
**Primary Language:** TypeScript (frontend), Python (backend)
**Architecture:** Client-server with shared database (Supabase)
**Last Updated:** 2026-02-23

## Project Overview

Alleato-Procore is a full-featured construction project management platform that mirrors Procore's functionality while adding AI-powered intelligence features. The frontend is a Next.js 15 application with 31 project-scoped tools covering budgets, contracts, change management, scheduling, drawings, specifications, directory management, and more. The backend provides AI-powered capabilities including RAG-based knowledge retrieval, multi-agent chat workflows, meeting intelligence, and document analysis. All data is stored in Supabase (PostgreSQL with Row Level Security), with 284 database tables supporting the complete construction management domain.

## Project Structure

This project consists of 2 parts:

### Frontend (frontend)

- **Type:** Web application
- **Location:** `frontend/`
- **Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, React Query, Zustand
- **Entry Point:** `frontend/src/app/layout.tsx`

### Backend (backend)

- **Type:** Backend API + AI services
- **Location:** `backend/`
- **Tech Stack:** Python, FastAPI, OpenAI (GPT + Agents SDK), LangChain, Supabase Python, Claude Agent SDK
- **Entry Point:** `backend/entrypoint.py`

## Cross-Part Integration

The frontend communicates with the backend via HTTP proxy rewrites configured in `next.config.ts`. `/rag-chatkit/*` and `/chatkit/*` requests are proxied to the backend's AI endpoints (SSE streaming). Both parts share the same Supabase database - the frontend handles all CRUD operations directly via Supabase client SDK, while the backend reads/writes AI-related data (embeddings, chunks, insights).

## Quick Reference

### Frontend Quick Ref

- **Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, React Query 5, Zustand 5
- **Entry:** `frontend/src/app/layout.tsx` (root layout with provider stack)
- **Pattern:** App Router with route groups `(main)`, `(tables)`, `(other)`
- **Database:** Supabase (direct client SDK queries, 74+ React Query hooks)
- **Deployment:** Vercel (auto-deploy from GitHub)

### Backend Quick Ref

- **Stack:** Python 3.11, FastAPI, OpenAI SDK, LangChain, Claude Agent SDK
- **Entry:** `backend/entrypoint.py` (uvicorn startup)
- **Pattern:** Service-oriented with multi-agent AI pipeline
- **Database:** Supabase Python client (read/write AI data)
- **Deployment:** Render (Docker container)

## Generated Documentation

### Core Documentation

- [Project Overview](./project-overview.md) - Executive summary, tech stack, key features, and architecture highlights
- [Source Tree Analysis](./source-tree-analysis.md) - Annotated directory structure with file organization patterns

### Part-Specific Documentation

#### Frontend (frontend)

- [Frontend Architecture](./architecture-frontend.md) - App Router, provider stack, data flow, state management, component patterns, API routes, auth, design system
- [Component Inventory](./component-inventory.md) - 470+ components: 95 UI primitives, 40 domain components, 74+ hooks, 15 services, 18 Zod schemas
- [API Contracts](./api-contracts.md) - 326+ HTTP handlers across 19 domains with request/response schemas
- [Data Models](./data-models.md) - 284 tables: core domain, financial, field management, documents, directory, AI/analytics

#### Backend (backend)

- [Backend Architecture](./architecture-backend.md) - FastAPI endpoints, 6 service classes, multi-agent AI pipeline, RAG system, deployment config

### Cross-Cutting Documentation

- [Integration Architecture](./integration-architecture.md) - How frontend and backend communicate, shared resources, data consistency patterns
- [Development Guide](./development-guide.md) - Prerequisites, setup, commands, mandatory gates, scaffolding system, testing, CI/CD
- [Deployment Guide](./deployment-guide.md) - Vercel/Render/Supabase infrastructure, CI/CD pipelines, environment variables, monitoring, rollback procedures

### AI Agent Configuration

- [Project Context](./project-context.md) - AI-optimized project context: 85 development rules, critical anti-patterns, mandatory gates, and architectural decisions for AI agents
- [Agent Systems Analysis](./agent-systems-analysis.md) - BMAD methodology overview: 5 installed modules, 22-agent roster, workflow engine mechanics, non-BMAD agents, integration patterns, and recommendations

## Getting Started

### Frontend Setup

**Prerequisites:** Node.js 20+, npm 9+, Supabase CLI

**Install & Run:**

```bash
cd frontend
npm install
npm run dev          # Development server on localhost:3000
```

**Key Commands:**

```bash
npm run build        # Production build
npm run quality      # TypeScript + ESLint checks
npm run test         # Playwright E2E tests (auto-auth)
npm run test:unit    # Jest unit tests
npm run db:types     # Regenerate Supabase types
```

### Backend Setup

**Prerequisites:** Python 3.11+, pip, Docker (optional)

**Install & Run:**

```bash
cd backend
pip install -r requirements.txt
python entrypoint.py    # FastAPI on localhost:8000
```

**Or with Docker:**

```bash
docker compose up backend
```

### Full Stack (Both Parts)

```bash
npm install          # Root monorepo dependencies
npm run dev          # Runs frontend + backend concurrently
```

## For AI-Assisted Development

This documentation was generated specifically to enable AI agents to understand and extend this codebase.

### When Planning New Features:

**UI-only features:**
> Reference: `architecture-frontend.md`, `component-inventory.md`

**API/Backend features:**
> Reference: `architecture-backend.md`, `api-contracts.md`, `data-models.md`

**Full-stack features:**
> Reference: All architecture docs + `integration-architecture.md`

**Database changes:**
> Reference: `data-models.md` - Check FK types, RLS policies, and naming conventions

**Deployment changes:**
> Reference: `deployment-guide.md`

### Mandatory Gates (from CLAUDE.md):

Before writing code, always check these gates:

1. **Supabase Types Gate** - Run `npm run db:types` before any database work
2. **Route Naming Gate** - Use `[projectId]` not `[id]` for dynamic routes
3. **Playwright Gate** - Run tests before diagnosing failures
4. **Root Cause Gate** - Gather evidence before modifying code
5. **Scaffolding Gate** - Use `/create-feature` for new CRUD features

### Documentation File Quick Reference:

| Need to understand... | Read this file |
|----------------------|----------------|
| Overall project | `project-overview.md` |
| Directory structure | `source-tree-analysis.md` |
| Frontend architecture | `architecture-frontend.md` |
| Backend architecture | `architecture-backend.md` |
| UI components & hooks | `component-inventory.md` |
| API endpoints | `api-contracts.md` |
| Database schema | `data-models.md` |
| Frontend ↔ Backend | `integration-architecture.md` |
| Dev setup & workflow | `development-guide.md` |
| Deployment & CI/CD | `deployment-guide.md` |
| Dev rules & anti-patterns | `project-context.md` |
| BMAD agents & workflows | `agent-systems-analysis.md` |

---

_Documentation generated by BMAD Method `document-project` workflow_
