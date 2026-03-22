# Source Tree Analysis — Alleato-PM

> Generated: 2026-03-22 | Scan level: deep

---

## Root Directory

```
alleato-pm/
├── frontend/              # Next.js 15 web application (primary codebase)
├── backend/               # Python FastAPI AI/agent backend
├── supabase/              # Database migrations + infra config
├── scripts/               # Build, seed, migration, and utility scripts
├── docs/                  # Project documentation (this directory)
├── docs-ai/               # AI-readable documentation (MDX for RAG)
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
│   ├── budget/            # Budget-specific components
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
│   ├── schemas/           # Zod validation schemas
│   ├── permissions/       # Permission evaluation logic
│   ├── liveblocks/        # Liveblocks config
│   ├── navigation-config.ts # App navigation structure
│   ├── sitemap-utils.ts   # Auto-generated sitemap
│   └── utils.ts           # General utilities
│
├── types/
│   └── database.types.ts  # Auto-generated Supabase types (20,790 lines)
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
│   │   └── rfi_agent/          # RFI-specific AI agent
│   │
│   ├── scripts/           # One-off backend scripts
│   ├── types/             # Pydantic type definitions
│   └── workers/           # Background task workers
│
├── tests/                 # pytest test suite
├── start.sh               # Local dev startup script
├── Dockerfile             # Container definition
├── docker-compose.yml     # Local container orchestration
└── requirements.txt       # Python dependencies
```

---

## Supabase (`supabase/`)

```
supabase/
├── migrations/            # 55 SQL migration files (sequential)
│   └── *.sql              # Named by timestamp + description
└── scripts/               # Helper SQL scripts
```

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

## Key Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| `next.config.ts` | `frontend/` | Turbopack, security headers, /rag-chatkit proxy rewrite |
| `vercel.json` | root | Vercel deploy config, 7GB NODE_OPTIONS |
| `render.yaml` | root | Backend (Docker) on Render |
| `tailwind.config.ts` | `frontend/` | Design tokens, content paths |
| `tsconfig.json` | `frontend/` | TypeScript strict config |
| `playwright.config.ts` | `frontend/config/playwright/` | E2E test config (port 3002, saved auth) |
| `.env` | root | Secrets (never committed) |
| `CLAUDE.md` | root | Claude Code mandatory rules |
