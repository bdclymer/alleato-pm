# Source Tree Analysis — Alleato-PM

> Generated: 2026-03-22 (merged with earlier analysis) | Scan level: deep

---

## Overview

Alleato-PM is a multi-part monorepo containing a Next.js 15 frontend application and a Python FastAPI backend. The frontend handles all user-facing construction project management tools, while the backend provides AI-powered features including RAG chat, meeting intelligence, and agent workflows.

## Root Directory

```
alleato-pm/
├── frontend/              # Next.js 15 web application (primary codebase)
├── backend/               # Python FastAPI AI/agent backend
├── supabase/              # Database migrations + infra config
├── scripts/               # Build, seed, migration, and utility scripts
├── docs/                  # Project documentation
├── docs/                  # All project documentation (merged from docs + docs-ai)
├── _bmad/                 # BMAD workflow engine + configs
├── _bmad-output/          # BMAD workflow outputs
├── .claude/               # Claude Code rules, prevention checklists
├── .github/workflows/     # 9 GitHub Actions CI/CD workflows
├── vercel.json            # Vercel deployment config (frontend)
├── render.yaml            # Render deployment config (backend)
├── package.json           # Root monorepo scripts + devDependencies
├── pnpm-lock.yaml         # Root pnpm lockfile
└── CLAUDE.md              # Claude Code mandatory rules (read first)
```

---

## Frontend (`frontend/src/`)

```
frontend/src/
├── app/                   # Next.js App Router
│   ├── (admin)/           # Admin-only pages (route group, no layout URL segment)
│   │   ├── api-docs/      # Auto-generated API documentation viewer
│   │   ├── components/    # Component playground
│   │   ├── crawled-pages/ # Procore crawled page browser
│   │   ├── design-system/ # Design system documentation page
│   │   ├── dev/           # Dev tools (table generator)
│   │   ├── procore-support-sitemap/ # Procore sitemap browser
│   │   ├── procore-tools/ # Procore feature tools
│   │   ├── procore-tracker/ # Procore feature parity tracker
│   │   ├── qa-audit/      # QA audit dashboard
│   │   ├── redoc/         # OpenAPI ReDoc viewer
│   │   ├── site-map/      # App sitemap viewer
│   │   ├── style-guide/   # Design tokens style guide
│   │   └── tables/[table]/ # Database table browser
│   │
│   ├── (auth)/            # Authentication pages (login, signup)
│   │
│   ├── (chat)/            # Chat/AI feature pages
│   │   ├── ai-assistant/  # AI assistant chat
│   │   ├── chat-admin-view/ # Admin chat overview
│   │   ├── chat-demo/     # Chat demo/testing
│   │   ├── chat-rag/      # RAG-enhanced chat
│   │   ├── rag/           # RAG search interface
│   │   └── simple-chat/   # Minimal chat UI
│   │
│   ├── (main)/            # Main app (project-scoped + global)
│   │   ├── [projectId]/   # Project-scoped tool pages
│   │   │   ├── home/      # Project dashboard
│   │   │   ├── budget/    # Budget management
│   │   │   ├── change-events/  # Change events
│   │   │   ├── change-orders/  # Change orders
│   │   │   ├── commitments/    # Subcontracts & POs
│   │   │   ├── daily-log/      # Daily log entries
│   │   │   ├── direct-costs/   # Direct cost records
│   │   │   ├── directory/      # Project directory
│   │   │   ├── documents/      # Document management
│   │   │   ├── drawings/       # Drawing management
│   │   │   ├── estimates/      # Estimates
│   │   │   ├── invoicing/      # Owner invoicing (SOV)
│   │   │   ├── meetings/       # Meeting records
│   │   │   ├── photos/         # Photo management
│   │   │   ├── prime-contracts/ # Prime contracts
│   │   │   ├── punch-list/     # Punch items
│   │   │   ├── reporting/      # 360 reporting
│   │   │   ├── rfis/           # RFIs
│   │   │   ├── schedule/       # Schedule tasks
│   │   │   ├── setup/          # Project setup
│   │   │   ├── specifications/ # Specifications
│   │   │   └── submittals/     # Submittals
│   │   │
│   │   ├── admin/         # Global admin (company knowledge)
│   │   ├── billing-periods/ # Billing period management
│   │   ├── create-project/ # New project wizard
│   │   ├── directory/     # Global directory (companies, contacts, employees, vendors)
│   │   └── page.tsx       # Project selector (home page after login)
│   │
│   ├── (other)/           # Misc pages (access-denied, etc.)
│   ├── (tables)/          # Table demo/testing pages
│   ├── api/               # Route Handlers (150+ route files)
│   └── auth/              # Auth callback handlers
│
├── artifacts/             # AI artifact types (code, image, sheet, text)
│
├── components/            # React component library
│   ├── ui/                # shadcn/ui base primitives (55+)
│   ├── ds/                # Custom design system components (8)
│   ├── layout/            # Page layout components
│   ├── tables/            # Data table infrastructure
│   ├── domain/            # Domain components (generic)
│   ├── ai-assistant/      # AI chat UI
│   ├── ai-elements/       # AI Elements (Message, MessageResponse, etc.)
│   ├── chat/              # Chat containers
│   ├── rag/               # RAG chat UI
│   ├── budget/            # Budget-specific components (51 files)
│   ├── commitments/       # Commitment-specific components
│   ├── change-events/     # Change event components
│   ├── direct-costs/      # Direct cost components
│   ├── drawings/          # Drawing viewer
│   ├── invoicing/         # Invoice management
│   ├── meetings/          # Meeting components
│   ├── scheduling/        # Schedule task components
│   ├── specifications/    # Spec section components
│   ├── rfis/              # RFI components
│   ├── directory/         # Directory components
│   ├── project/           # Project-level components
│   ├── financial-insights/ # AI financial alerts
│   ├── guards/            # Auth + permission guards
│   ├── auth/              # Auth form components
│   ├── liveblock/         # Liveblocks wrappers
│   ├── live-cursors/      # Multi-user cursor presence
│   ├── notifications/     # Notification center
│   ├── monitoring/        # Dev/ops monitoring
│   ├── providers/         # React context providers
│   └── nav/               # Navigation components
│
├── hooks/                 # React Query hooks (~80)
│   ├── data/              # Supabase data hooks
│   └── use-*.ts           # Feature hooks
│
├── services/              # Business logic services (14 files)
│
├── lib/                   # Shared libraries and utilities
│   ├── supabase/          # Supabase client (client.ts, server.ts, proxy.ts)
│   ├── ai/                # AI orchestration, tools, prompts
│   │   ├── orchestrator.ts   # AI routing and orchestration
│   │   ├── tools/            # AI tool definitions
│   │   └── rag-assistant-prompt.ts  # System prompt
│   ├── stores/            # Zustand state stores
│   ├── schemas/           # Zod validation schemas (18 files)
│   ├── permissions/       # Permission evaluation logic
│   ├── liveblocks/        # Liveblocks config
│   ├── navigation-config.ts # App navigation structure
│   ├── sitemap-utils.ts   # Auto-generated sitemap
│   └── utils.ts           # General utilities
│
├── types/
│   └── database.types.ts  # Auto-generated Supabase types (20,790 lines)
│
├── contexts/              # 3 React contexts
├── features/              # 6 feature table configs
├── providers/             # 1 provider (Directory)
├── design-system/         # Design tokens (spacing)
│
└── proxy.ts               # Next.js middleware (Supabase session)
```

---

## Backend (`backend/src/`)

```
backend/
├── src/
│   ├── api/
│   │   ├── main.py        # FastAPI app entry
│   │   ├── server.py      # Server config
│   │   └── admin_endpoints.py  # Admin API endpoints
│   │
│   ├── services/
│   │   ├── acumatica_sync.py   # Acumatica ERP sync
│   │   ├── daily_digest.py     # Daily AI briefing generation
│   │   ├── email_service.py    # Transactional email
│   │   ├── memory_store.py     # AI memory persistence
│   │   ├── scheduler.py        # APScheduler job scheduler
│   │   ├── supabase_helpers.py # Supabase utility functions
│   │   ├── ingestion/          # Document/web ingestion pipeline
│   │   ├── insights/           # AI insights generation
│   │   ├── integrations/       # Third-party integrations
│   │   ├── pipeline/           # RAG pipeline orchestration
│   │   ├── alleato_agent_workflow/ # Multi-agent workflow
│   │   │   ├── agents/      # Classification, Project, KB, Strategist
│   │   │   ├── tools/       # Vector search, retrieval, MCP
│   │   │   ├── workflow.py  # Main orchestration
│   │   │   └── guardrails.py # Input validation
│   │   └── rfi_agent/          # RFI-specific AI agent
│   │
│   ├── scripts/           # One-off backend scripts
│   ├── types/             # Pydantic type definitions
│   └── workers/           # Background task workers
│
├── tests/                 # pytest test suite
├── start.sh               # Local dev startup script
├── Dockerfile             # Container definition (Python 3.11-slim)
├── docker-compose.yml     # Local container orchestration
└── requirements.txt       # Python dependencies (48 packages)
```

---

## Supabase (`supabase/`)

```
supabase/
├── migrations/            # 55 SQL migration files (sequential)
│   └── *.sql              # Named by timestamp + description
└── scripts/               # Helper SQL scripts
```

284 tables covering projects, budgets, contracts, change management, directory, documents, drawings, specifications, schedules, AI/analytics. Types auto-generated to `frontend/src/types/database.types.ts`.

---

## Scripts (`scripts/`)

```
scripts/
├── agent-browser/         # Browser automation scripts
├── audit/                 # Code audit scripts
├── change-events-crawl/   # Procore change event crawlers
├── cli/                   # CLI tools
├── data/                  # Data manipulation scripts
├── database/              # Database introspection scripts
├── docs/                  # Documentation generation
├── examples/              # Example/demo scripts
├── feature-tracker/       # Feature tracking scripts
├── ingestion/             # Document ingestion scripts
├── misc/                  # Miscellaneous utilities
├── screenshot-capture/    # Playwright screenshot crawlers
├── seed-db/               # Database seeding
└── verify/                # RAG verification scripts
```

---

## GitHub Actions (`.github/workflows/`)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push/PR to main | Lint, typecheck, build |
| `claude.yml` | PR comments | Claude code review |
| `db-migrate.yml` | Push migration files | Run Supabase migrations |
| `deploy-backend.yml` | Push to main | Deploy backend to Render |
| `deploy-frontend.yml` | Push to main | Deploy frontend to Vercel |
| `e2e.yml` | PR/push | Playwright E2E tests |
| `release.yml` | Tags | Create GitHub releases |
| `security.yml` | Scheduled | Security scanning |
| `sync-api-docs.yml` | Push to main | Sync API documentation |

---

## Critical Directories

### `frontend/src/app/`

Next.js App Router containing all pages and API routes. Uses route group conventions: `(main)` for primary app routes with sidebar, `(admin)` for admin pages, `(auth)` for auth pages, `(chat)` for AI chat pages, `(tables)` for table views, `(other)` for miscellaneous pages.

**Purpose:** Page routing and API endpoint definitions
**Contains:** 31 project-scoped tool pages, 150+ API route files with 326+ endpoint handlers
**Entry Points:** `layout.tsx` (root layout with provider stack), `page.tsx` (root page)
**Integration:** API routes proxy to backend via `/rag-chatkit` and `/chatkit` rewrites

### `frontend/src/components/`

Comprehensive React component library organized by concern. Contains 470+ component files across 100+ directories.

**Purpose:** Reusable UI components from primitives to full-page compositions
**Contains:** 55+ UI primitives (shadcn/ui), 40 domain components, 51 budget components, 33 table components, 29 chat components, 30 AI element components, 8 design system components
**Integration:** All components import from `@/` path alias, use React Query hooks for data

### `frontend/src/hooks/`

~80 custom React hooks wrapping Supabase queries and UI state management. Every data-fetching operation goes through a hook.

**Purpose:** Data fetching, mutations, and client-side state management
**Contains:** CRUD hooks for all entities (budgets, contracts, change orders, directory, etc.), utility hooks (mobile detection, currency formatting, realtime)
**Integration:** All hooks use React Query (TanStack Query) for caching and state

### `frontend/src/services/`

14 service classes encapsulating complex business logic for domain entities like drawings, specifications, permissions, and directory management.

**Purpose:** Complex multi-step operations that go beyond simple CRUD
**Contains:** DrawingService, SpecificationService, PunchItemService, directoryService, permissionService, companyService, inviteService, NotificationService, etc.

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

55 SQL migration files defining the complete database schema.

**Purpose:** Database schema version control
**Contains:** 284 tables covering projects, budgets, contracts, change management, directory, documents, drawings, specifications, schedules, AI/analytics
**Integration:** Types auto-generated to `frontend/src/types/database.types.ts`

---

## Integration Points

### Frontend -> Backend

- **Location:** `frontend/next.config.ts` (proxy rewrites)
- **Type:** HTTP proxy (API rewrite rules)
- **Details:** `/rag-chatkit/*` and `/chatkit/*` routes are proxied from Next.js to backend port 8051. SSE streaming for real-time AI responses.

### Frontend -> Supabase

- **Location:** `frontend/src/lib/supabase/`
- **Type:** Direct database client (Supabase JS SDK)
- **Details:** Browser client (singleton) and server client (per-request) patterns. All 326+ API routes and ~80 hooks use Supabase for data access. RLS policies enforce authorization.

### Backend -> Supabase

- **Location:** `backend/src/services/supabase_helpers.py`
- **Type:** Direct database client (Supabase Python SDK)
- **Details:** Backend uses Supabase for RAG storage (document chunks, embeddings), project data retrieval, and insight storage.

### Backend -> OpenAI

- **Location:** `backend/src/services/alleato_agent_workflow/`
- **Type:** API client (OpenAI SDK + Agents SDK)
- **Details:** Agent routing, embedding generation, LLM-powered classification and synthesis.

---

## Entry Points

### Frontend

- **Entry Point:** `frontend/src/app/layout.tsx`
- **Bootstrap:** Root layout mounts provider stack: QueryProvider -> ThemeProvider -> ProjectProvider -> FavoritesProvider -> HeaderProvider, plus global Toaster and AIChatWidget

### Backend

- **Entry Point:** `backend/entrypoint.py` -> `backend/src/api/main.py`
- **Bootstrap:** Uvicorn starts FastAPI app on port 8000 (configurable). CORS, middleware, and all route mounts configured in main.py

---

## File Organization Patterns

The project follows consistent naming and organization patterns:

1. **Pages**: `frontend/src/app/(main)/[projectId]/<tool>/page.tsx` -- One page.tsx per tool
2. **API Routes**: `frontend/src/app/api/projects/[projectId]/<resource>/route.ts` -- RESTful routes
3. **Hooks**: `frontend/src/hooks/use-<entity>.ts` -- One hook file per entity
4. **Services**: `frontend/src/services/<Entity>Service.ts` -- PascalCase service classes
5. **Components**: `frontend/src/components/<domain>/<ComponentName>.tsx` -- Grouped by domain
6. **Schemas**: `frontend/src/lib/schemas/<entity>-schema.ts` or `<entity>.ts` -- Zod validation
7. **Migrations**: `supabase/migrations/<timestamp>_<description>.sql` -- Timestamped SQL

---

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

---

## Key Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| `next.config.ts` | `frontend/` | Turbopack, security headers, /rag-chatkit proxy rewrite |
| `vercel.json` | root | Vercel deploy config, 7GB NODE_OPTIONS |
| `render.yaml` | root | Backend (Docker) on Render |
| `tailwind.config.ts` | `frontend/` | Design tokens, content paths, Procore brand colors |
| `tsconfig.json` | `frontend/` | TypeScript strict config with `@/*` path alias |
| `playwright.config.ts` | `frontend/config/playwright/` | E2E test config (port 3002, saved auth) |
| `package.json` (root) | root | Monorepo scripts (dev, build, test, seed, quality) |
| `package.json` (frontend) | `frontend/` | 144 dependencies, Next.js/React/Supabase/Playwright |
| `requirements.txt` | `backend/` | 48 Python dependencies (FastAPI, OpenAI, LangChain, Supabase) |
| `Dockerfile` | `backend/` | Python 3.11-slim with health check |
| `.env` | root | Secrets (never committed) |
| `CLAUDE.md` | root | Claude Code mandatory rules |

---

## Notes for Development

- **Dynamic Routes**: Always use specific parameter names (`[projectId]`, `[contractId]`, etc.) -- never generic `[id]`
- **Supabase Types**: Run `npm run db:types` before any database work to regenerate `database.types.ts`
- **Cache**: Clear `.next` cache when creating/modifying routes: `rm -rf frontend/.next`
- **Authentication**: Playwright tests use pre-saved auth state in `tests/.auth/user.json` -- never ask for manual login
- **Scaffolding**: Use `/create-feature <EntityName>` for new CRUD features instead of writing from scratch
- **FK Types**: `projects.id` is INTEGER (not UUID) -- all project FK columns must be INTEGER
- **Provider Stack**: Root layout uses QueryProvider -> ThemeProvider -> ProjectProvider -> FavoritesProvider -> HeaderProvider
