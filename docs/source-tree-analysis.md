# Alleato-Procore - Source Tree Analysis

**Date:** 2026-02-23

## Overview

Alleato-Procore is a multi-part monorepo containing a Next.js 15 frontend application and a Python FastAPI backend. The frontend handles all user-facing construction project management tools, while the backend provides AI-powered features including RAG chat, meeting intelligence, and agent workflows.

## Multi-Part Structure

This project is organized into 2 distinct parts:

- **Frontend** (`frontend/`): Next.js 15 web application with 31 project management tools, Supabase integration, and comprehensive UI component library
- **Backend** (`backend/`): Python FastAPI AI/ML service providing RAG chat, multi-agent workflows, document ingestion, and meeting intelligence

## Complete Directory Structure

```
alleato-procore/
├── frontend/                    # Next.js 15 application (primary)
│   ├── src/
│   │   ├── app/                 # Next.js App Router (pages + API routes)
│   │   │   ├── (main)/          # Main app routes with sidebar layout
│   │   │   │   └── [projectId]/ # 31 project-scoped tool pages
│   │   │   ├── (tables)/        # Table view pages
│   │   │   ├── (other)/         # Miscellaneous pages
│   │   │   ├── api/             # 196 API route files (326+ endpoints)
│   │   │   └── auth/            # Authentication pages
│   │   ├── components/          # 470+ React components across 78 dirs
│   │   │   ├── ui/              # 95 shadcn/ui primitives
│   │   │   ├── domain/          # 40 domain-specific components
│   │   │   ├── budget/          # 51 budget management components
│   │   │   ├── chat/            # 29 AI chat components
│   │   │   ├── tables/          # 33 data table components
│   │   │   ├── forms/           # 18 form field components
│   │   │   ├── layout/          # 14 layout components
│   │   │   ├── ai-elements/     # 30 AI UI elements
│   │   │   ├── directory/       # 13 directory components
│   │   │   ├── direct-costs/    # 10 direct cost components
│   │   │   ├── admin-panel/     # 11 admin panel components
│   │   │   ├── project-home/    # 20 project home components
│   │   │   ├── nav/             # 11 navigation components
│   │   │   ├── header/          # 10 header components
│   │   │   ├── layouts/         # 9 layout templates
│   │   │   ├── project-setup-wizard/ # 9 setup wizard steps
│   │   │   ├── scheduling/      # 7 scheduling components
│   │   │   ├── portfolio/       # 7 portfolio view components
│   │   │   ├── specifications/  # 5 specification components
│   │   │   ├── drawings/        # 5 drawing components
│   │   │   ├── tutorial/        # 5 tutorial components
│   │   │   ├── commitments/     # 4 commitment components
│   │   │   ├── misc/            # 58 miscellaneous utilities
│   │   │   ├── motion/          # 17 animation components
│   │   │   ├── prompt-kit/      # 8 prompt management
│   │   │   └── ...              # Additional component directories
│   │   ├── hooks/               # 74+ React Query & custom hooks
│   │   ├── services/            # 15 business logic service classes
│   │   ├── contexts/            # 3 React contexts
│   │   ├── features/            # 6 feature table configs
│   │   ├── providers/           # 1 provider (Directory)
│   │   ├── lib/                 # Utilities, configs, stores
│   │   │   ├── supabase/        # Supabase client setup
│   │   │   ├── schemas/         # 18 Zod validation schemas
│   │   │   ├── stores/          # 1 Zustand store (financial)
│   │   │   ├── services/        # 2 lib-level services
│   │   │   ├── auth/            # Auth utilities
│   │   │   ├── permissions/     # Permission system
│   │   │   └── ...              # 28 utility files
│   │   ├── types/               # TypeScript types
│   │   │   └── database.types.ts # 17,629-line Supabase types
│   │   └── design-system/       # Design tokens (spacing)
│   ├── tests/                   # Playwright E2E tests
│   │   ├── e2e/                 # E2E test specs
│   │   ├── .auth/               # Saved auth state
│   │   └── auth.setup.ts        # Auth setup script
│   ├── config/
│   │   └── playwright/          # Playwright configuration
│   ├── public/                  # Static assets
│   ├── next.config.ts           # Next.js config (security headers, proxies)
│   ├── tailwind.config.ts       # Tailwind + design system
│   ├── tsconfig.json            # TypeScript strict config
│   └── package.json             # 144 dependencies
├── backend/                     # Python FastAPI backend
│   ├── src/
│   │   ├── api/
│   │   │   └── main.py          # FastAPI app with all endpoint mounts
│   │   ├── services/
│   │   │   ├── alleato_agent_workflow/ # RAG agent system
│   │   │   │   ├── agents/      # Classification, Project, KB, Strategist
│   │   │   │   ├── tools/       # Vector search, retrieval, MCP
│   │   │   │   ├── workflow.py  # Main orchestration
│   │   │   │   └── guardrails.py # Input validation
│   │   │   ├── ingestion/       # Fireflies transcript pipeline
│   │   │   ├── knowledge-base/  # Full RAG platform
│   │   │   │   ├── ingestion/   # Chunkers, loaders, preprocessors
│   │   │   │   ├── retrieval/   # Pipeline, reranker, citations
│   │   │   │   ├── stores/      # Qdrant, OpenAI file search
│   │   │   │   ├── evals/       # RAG evaluation framework
│   │   │   │   └── models/      # Synthesis models
│   │   │   ├── insights/        # TypeScript insight services
│   │   │   ├── rfi_agent/       # RFI specialist agent
│   │   │   └── supabase_helpers.py # Supabase client + RAG store
│   │   ├── workers/             # Background processing workers
│   │   └── yokeflow/            # Agent execution platform
│   ├── scripts/                 # Python utility scripts
│   ├── deploy/                  # Multi-platform deploy configs
│   ├── Dockerfile               # Python 3.11-slim container
│   ├── docker-compose.yml       # Dev Docker setup
│   ├── entrypoint.py            # Uvicorn server startup
│   └── requirements.txt         # 48 Python dependencies
├── supabase/
│   └── migrations/              # 22 SQL migration files
├── scripts/                     # Build & utility scripts
│   ├── screenshot-capture/      # Procore feature crawlers
│   ├── seed/                    # Database seeding scripts
│   └── ...                      # Route checks, cache management
├── .github/
│   └── workflows/               # 10 GitHub Actions workflows
│       ├── ci.yml               # Lint + typecheck + unit tests + build
│       ├── deploy-frontend.yml  # Vercel deployment
│       ├── deploy-backend.yml   # Render deployment
│       └── e2e.yml              # Playwright E2E tests
├── .claude/                     # Claude Code configuration
│   ├── rules/                   # 14 mandatory rules
│   ├── commands/                # 100+ BMAD commands
│   └── scaffolds/               # CRUD resource templates
├── _bmad/                       # BMAD workflow engine
├── docs-ai/                     # Documentation hub
│   └── contents/docs/PRPs/      # 33 PRPs across 8 domains
├── CLAUDE.md                    # Claude Code instructions
├── render.yaml                  # Render deployment config
└── package.json                 # Root monorepo package
```

## Critical Directories

### `frontend/src/app/`

Next.js App Router containing all pages and API routes. Uses route group conventions: `(main)` for primary app routes with sidebar, `(tables)` for table views, `(other)` for miscellaneous pages.

**Purpose:** Page routing and API endpoint definitions
**Contains:** 31 project-scoped tool pages, 196 API route files with 326+ endpoint handlers
**Entry Points:** `layout.tsx` (root layout with provider stack), `page.tsx` (root page)
**Integration:** API routes proxy to backend via `/rag-chatkit` and `/chatkit` rewrites

### `frontend/src/components/`

Comprehensive React component library organized by concern. Contains 470+ component files across 78 directories.

**Purpose:** Reusable UI components from primitives to full-page compositions
**Contains:** 95 UI primitives (shadcn/ui), 40 domain components, 51 budget components, 33 table components, 29 chat components, 30 AI element components
**Integration:** All components import from `@/` path alias, use React Query hooks for data

### `frontend/src/hooks/`

74+ custom React hooks wrapping Supabase queries and UI state management. Every data-fetching operation goes through a hook.

**Purpose:** Data fetching, mutations, and client-side state management
**Contains:** CRUD hooks for all entities (budgets, contracts, change orders, directory, etc.), utility hooks (mobile detection, currency formatting, realtime)
**Integration:** All hooks use React Query (TanStack Query) for caching and state

### `frontend/src/services/`

15 service classes encapsulating complex business logic for domain entities like drawings, specifications, permissions, and directory management.

**Purpose:** Complex multi-step operations that go beyond simple CRUD
**Contains:** DrawingService, SpecificationService, PunchItemService, directoryService, permissionService, companyService, inviteService, etc.

### `backend/src/services/alleato_agent_workflow/`

RAG-powered multi-agent system with classification-based routing.

**Purpose:** AI-powered knowledge retrieval and conversational interface
**Contains:** Classification agent, Project agent, Knowledge Base agent, Strategist agent, vector search tools, guardrails
**Integration:** Receives queries from frontend via `/rag-chatkit` proxy, streams responses via SSE

### `backend/src/services/knowledge-base/`

Comprehensive knowledge base platform with ingestion, retrieval, and evaluation.

**Purpose:** Document processing pipeline from raw files to searchable knowledge
**Contains:** Chunkers (recursive, heading-aware, hybrid), loaders (PDF, DOCX, HTML, MD), retrieval pipeline with reranking and citations, evaluation framework
**Integration:** Stores embeddings in Supabase, serves RAG agents

### `supabase/migrations/`

22 SQL migration files defining the complete database schema.

**Purpose:** Database schema version control
**Contains:** 284 tables covering projects, budgets, contracts, change management, directory, documents, drawings, specifications, schedules, AI/analytics
**Integration:** Types auto-generated to `frontend/src/types/database.types.ts`

## Part-Specific Trees

### Frontend Structure

```
frontend/src/
├── app/                      # Pages & API routes
│   ├── (main)/[projectId]/   # 31 project tools
│   ├── api/                  # 196 route files
│   └── auth/                 # Auth pages
├── components/               # 470+ components
├── hooks/                    # 74+ hooks
├── services/                 # 15 service classes
├── contexts/                 # 3 React contexts
├── features/                 # 6 feature configs
├── lib/                      # Utilities & stores
│   ├── schemas/              # 18 Zod schemas
│   ├── stores/               # Zustand stores
│   └── supabase/             # Client setup
└── types/                    # TypeScript types
```

**Key Directories:**
- **`app/(main)/[projectId]/`**: 31 project-scoped tool pages (budget, change-events, change-orders, commitments, daily-log, direct-costs, directory, drawings, emails, home, invoicing, meetings, photos, prime-contracts, punch-list, reporting, rfis, schedule, setup, sov, specifications, submittals, tasks, transmittals, etc.)
- **`app/api/projects/[projectId]/`**: Project-scoped API routes matching the tool pages
- **`components/ui/`**: 95 shadcn/ui primitives forming the design system base
- **`components/domain/`**: Business-logic components organized by entity (change-events, change-orders, contracts, users, etc.)
- **`lib/schemas/`**: 18 Zod validation schemas (auth, budget, contracts, direct-costs, drawings, rfis, specifications, etc.)

### Backend Structure

```
backend/src/
├── api/
│   └── main.py               # FastAPI application
├── services/
│   ├── alleato_agent_workflow/ # RAG agent system
│   ├── ingestion/             # Transcript pipeline
│   ├── knowledge-base/        # Full RAG platform
│   ├── insights/              # TypeScript workers
│   ├── rfi_agent/             # RFI specialist
│   └── supabase_helpers.py    # Database client
├── workers/                   # Background processors
└── yokeflow/                  # Agent platform
```

**Key Directories:**
- **`services/alleato_agent_workflow/`**: Multi-agent system with classification → specialist routing
- **`services/knowledge-base/`**: Document ingestion, chunking, retrieval, and evaluation
- **`services/ingestion/`**: Fireflies meeting transcript processing pipeline
- **`services/insights/`**: TypeScript-based insight extraction from meetings

## Integration Points

### Frontend → Backend

- **Location:** `frontend/next.config.ts` (proxy rewrites)
- **Type:** HTTP proxy (API rewrite rules)
- **Details:** `/rag-chatkit/*` and `/chatkit/*` routes are proxied from Next.js to backend port 8051. SSE streaming for real-time AI responses.

### Frontend → Supabase

- **Location:** `frontend/src/lib/supabase/`
- **Type:** Direct database client (Supabase JS SDK)
- **Details:** Browser client (singleton) and server client (per-request) patterns. All 326+ API routes and 74+ hooks use Supabase for data access. RLS policies enforce authorization.

### Backend → Supabase

- **Location:** `backend/src/services/supabase_helpers.py`
- **Type:** Direct database client (Supabase Python SDK)
- **Details:** Backend uses Supabase for RAG storage (document chunks, embeddings), project data retrieval, and insight storage.

### Backend → OpenAI

- **Location:** `backend/src/services/alleato_agent_workflow/`
- **Type:** API client (OpenAI SDK + Agents SDK)
- **Details:** Agent routing, embedding generation, LLM-powered classification and synthesis.

## Entry Points

### Frontend

- **Entry Point:** `frontend/src/app/layout.tsx`
- **Bootstrap:** Root layout mounts provider stack: QueryProvider → ThemeProvider → ProjectProvider → FavoritesProvider → HeaderProvider, plus global Toaster and AIChatWidget

### Backend

- **Entry Point:** `backend/entrypoint.py` → `backend/src/api/main.py`
- **Bootstrap:** Uvicorn starts FastAPI app on port 8000 (configurable). CORS, middleware, and all route mounts configured in main.py

## File Organization Patterns

The project follows consistent naming and organization patterns:

1. **Pages**: `frontend/src/app/(main)/[projectId]/<tool>/page.tsx` - One page.tsx per tool
2. **API Routes**: `frontend/src/app/api/projects/[projectId]/<resource>/route.ts` - RESTful routes
3. **Hooks**: `frontend/src/hooks/use-<entity>.ts` - One hook file per entity
4. **Services**: `frontend/src/services/<Entity>Service.ts` - PascalCase service classes
5. **Components**: `frontend/src/components/<domain>/<ComponentName>.tsx` - Grouped by domain
6. **Schemas**: `frontend/src/lib/schemas/<entity>-schema.ts` or `<entity>.ts` - Zod validation
7. **Migrations**: `supabase/migrations/<timestamp>_<description>.sql` - Timestamped SQL

## Key File Types

### React Components (`.tsx`)

- **Pattern:** `PascalCase.tsx`
- **Purpose:** UI rendering and user interaction
- **Examples:** `BudgetLineItemTable.tsx`, `ChangeEventFormDialog.tsx`, `ProjectPageHeader.tsx`

### React Hooks (`.ts`)

- **Pattern:** `use-<entity-name>.ts`
- **Purpose:** Data fetching, mutations, and state management
- **Examples:** `use-budget-data.ts`, `use-change-events.ts`, `use-directory-permissions.ts`

### API Routes (`.ts`)

- **Pattern:** `route.ts` in directory matching REST resource
- **Purpose:** HTTP endpoint handlers (GET, POST, PUT, DELETE)
- **Examples:** `api/projects/[projectId]/budget/route.ts`, `api/projects/[projectId]/change-events/[changeEventId]/route.ts`

### Zod Schemas (`.ts`)

- **Pattern:** `<entity>-schema.ts` or `validation.ts`
- **Purpose:** Request/response validation
- **Examples:** `budget.ts`, `direct-costs.ts`, `drawing-schemas.ts`

### SQL Migrations (`.sql`)

- **Pattern:** `<timestamp>_<description>.sql`
- **Purpose:** Database schema evolution
- **Examples:** `20260131_000001_schema.sql` (main schema), `20260131142854_add_drawings_system.sql`

### Python Services (`.py`)

- **Pattern:** `snake_case.py`
- **Purpose:** Backend business logic and AI workflows
- **Examples:** `workflow.py`, `fireflies_pipeline.py`, `supabase_helpers.py`

## Configuration Files

- **`package.json`** (root): Monorepo scripts (dev, build, test, seed, quality)
- **`frontend/package.json`**: 144 dependencies, Next.js/React/Supabase/Playwright
- **`frontend/next.config.ts`**: Security headers, Supabase image patterns, backend proxy rewrites
- **`frontend/tailwind.config.ts`**: Design system with Procore brand colors, CSS variable theming
- **`frontend/tsconfig.json`**: Strict TypeScript with `@/*` path alias
- **`backend/requirements.txt`**: 48 Python dependencies (FastAPI, OpenAI, LangChain, Supabase)
- **`backend/Dockerfile`**: Python 3.11-slim with health check
- **`render.yaml`**: Backend deployment on Render (Docker, port 8000)
- **`.github/workflows/ci.yml`**: Quality → Unit Tests → Build pipeline
- **`.github/workflows/deploy-frontend.yml`**: Vercel deployment
- **`.github/workflows/deploy-backend.yml`**: Render deployment
- **`.github/workflows/e2e.yml`**: Playwright E2E test execution
- **`CLAUDE.md`**: Claude Code agent instructions with 11 mandatory gates

## Notes for Development

- **Dynamic Routes**: Always use specific parameter names (`[projectId]`, `[contractId]`, etc.) - never generic `[id]`
- **Supabase Types**: Run `npm run db:types` before any database work to regenerate `database.types.ts`
- **Cache**: Clear `.next` cache when creating/modifying routes: `rm -rf frontend/.next`
- **Authentication**: Playwright tests use pre-saved auth state in `tests/.auth/user.json` - never ask for manual login
- **Scaffolding**: Use `/create-feature <EntityName>` for new CRUD features instead of writing from scratch
- **FK Types**: `projects.id` is INTEGER (not UUID) - all project FK columns must be INTEGER
- **Provider Stack**: Root layout uses QueryProvider → ThemeProvider → ProjectProvider → FavoritesProvider → HeaderProvider

---

_Generated using BMAD Method `document-project` workflow_
