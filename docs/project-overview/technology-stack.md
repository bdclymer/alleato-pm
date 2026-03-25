# Technology Stack — Alleato-PM

> Generated: 2026-03-22 | Scan level: deep | Source: package.json, next.config.ts, requirements.txt

---

## Repository Overview

| Attribute | Value |
|-----------|-------|
| Repository type | Multi-part monorepo |
| Parts | frontend (web), backend (Python API), supabase (infra) |
| Package manager | pnpm 10.13.1 (dual lockfiles: root + frontend/) |
| Node version | 18+ required |
| Python version | 3.11+ required |

---

## Part 1: Frontend (Next.js Web Application)

### Core Framework

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| Framework | Next.js | 15.5.12 | App Router, Turbopack bundler |
| Runtime | React | 19.2.4 | Server + Client Components |
| Language | TypeScript | ~5.9.x | Strict via pre-commit hook; build skips for perf |
| Bundler | Turbopack | (Next.js built-in) | `next dev --turbopack`, `next build --turbopack` |
| Deployment | Vercel | — | `vercel.json` present |

### Styling & UI

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| CSS Framework | Tailwind CSS | 3.4.x | Utility-first, design token system |
| CSS Utilities | tailwind-merge + clsx | 3.4.x / 2.1.x | Conditional class merging |
| Animation | tailwindcss-animate | 1.0.7 | Keyframe animations |
| Component Library | shadcn/ui (custom) | — | Source-copied Radix UI components in `components/ui/` |
| Primitives | Radix UI | Various 1.x | Accessible headless components |
| Icons | lucide-react | 0.511.0 | Primary icon set |
| Icons (alt) | @tabler/icons-react | 3.36.x | Secondary icons |
| Icons (extended) | react-icons | 5.5.0 | Extended icon sets |
| Animation | Framer Motion / motion | 12.31.0 | Page transitions, micro-interactions |
| Design system | Once UI (@once-ui-system/core) | 1.6.0 | Additional design tokens |

### State Management & Data

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| Server state | TanStack React Query | 5.90.x | Caching, async queries, mutations |
| Client state | Zustand | 5.0.11 | Lightweight global store |
| Tables | TanStack Table | 8.21.x | Headless table logic |
| Virtual scrolling | TanStack Virtual | 3.13.x | Large list performance |
| SWR | swr | 2.4.1 | Alternative data fetching for some features |

### Forms & Validation

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| Forms | React Hook Form | 7.71.x | Performance-first form library |
| Schema validation | Zod | 4.3.6 | Runtime type validation |
| Form resolvers | @hookform/resolvers | 5.2.x | Connects Zod ↔ RHF |

### Database & Auth

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| Database client | @supabase/supabase-js | 2.99.x | Primary DB + Auth client |
| SSR auth | @supabase/ssr | 0.9.0 | Server-side Supabase session handling |
| ORM | Drizzle ORM | 0.45.x | Schema-first TypeScript ORM (supplemental) |
| Auth framework | next-auth | 5.0.0-beta.25 | NextAuth v5 beta |
| Direct SQL | postgres | 3.4.x | Low-level SQL access for scripts |

### AI & Streaming

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| AI SDK | ai (Vercel AI SDK) | 6.0.105 | Streaming, tool calling, useChat |
| OpenAI provider | @ai-sdk/openai | 3.0.25 | Routes via AI Gateway |
| React hooks | @ai-sdk/react | 3.0.71 | useChat, useCompletion |
| AI DevTools | @ai-sdk/devtools | 0.0.15 | Debug AI interactions |
| ChatKit | @openai/chatkit + @openai/chatkit-react | 1.5.x / 1.4.x | OpenAI Chat UI components |
| Markdown streaming | streamdown | 2.3.x | Streaming markdown renderer |
| Streamdown plugins | @streamdown/code, cjk, math, mermaid | 1.0.x | Code, CJK, math, diagram plugins |
| Web search | @tavily/core | 0.7.2 | Tavily web search for AI tools |
| Agent framework | agentation | 2.2.1 | Agent coordination |

### Collaboration & Real-time

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| Real-time collab | @liveblocks/* | 3.15.2 | Collaborative editing infrastructure |
| Rich text | lexical + @lexical/* | 0.35.x | Collaborative rich text editor |
| OT support | @lexical/yjs | 0.35.x | Yjs operational transform |
| Flowcharts | @xyflow/react | 12.10.0 | Node-based diagrams/flows |

### Rich Text & Documents

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| Editor (alt) | ProseMirror | Various | Secondary rich text editor |
| PDF viewing | react-pdf | 10.3.x | In-browser PDF rendering |
| Code editor | CodeMirror | 6.x | Inline code editing |
| Markdown render | react-markdown | 10.1.x | Static markdown display |
| Syntax highlight | shiki | 3.22.x | Code syntax highlighting |
| Data export | xlsx | 0.18.x | Excel export |
| CSV parsing | papaparse | 5.5.x | CSV import/parsing |

### Other Notable Libraries

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| Charts | Recharts | 2.15.4 | SVG-based charting |
| Drag & drop | @dnd-kit/* | Various | Accessible DnD |
| Dates | date-fns | 4.1.0 | Date manipulation |
| Fuzzy search | fuse.js | 7.1.x | Client-side fuzzy search |
| Toast | sonner | 2.0.7 | Toast notifications |
| Drawer | vaul | 1.1.x | Bottom drawer component |
| Command palette | cmdk | 1.1.x | Command menu component |
| File upload | react-dropzone | 14.4.x | Drag-and-drop file upload |
| Email | resend | 6.9.x | Transactional email |
| Blob storage | @vercel/blob | 2.3.x | File storage |
| Hotkeys | react-hotkeys-hook | 5.2.x | Keyboard shortcuts |
| Animation (gesture) | @use-gesture/react | 10.3.x | Touch/gesture handling |
| Rive animations | @rive-app/react-webgl2 | 4.27.x | Interactive animations |
| API spec | redoc + swagger-ui-dist | 2.5.x / 5.31.x | API documentation viewer |
| Sanitization | DOMPurify + sanitize-html | 3.x / 2.x | XSS prevention |
| Immutable state | immer | 11.1.3 | Immutable state updates |

### Testing (Frontend)

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| E2E | Playwright | 1.58.x | Primary E2E framework |
| E2E reports | allure-playwright | 3.4.x | Rich test reports |
| Accessibility | @axe-core/playwright | 4.11.x | A11y testing |
| Unit | Jest | 30.2.x | Unit test runner |
| Unit DOM | jest-environment-jsdom | 30.2.x | JSDOM environment |
| Component | @testing-library/react | 16.3.x | React component testing |
| Performance | lighthouse | 12.8.x | Performance auditing |
| Linting | ESLint 9 + @typescript-eslint | 9.39.x / 8.54.x | Code quality |
| Formatting | lint-staged + husky | 16.x / 9.x | Pre-commit hooks |

### Architecture Pattern (Frontend)
- **App Router** with Server Components (default) + Client Components (`'use client'`)
- **Proxy routing** (`proxy.ts`) for auth and session middleware
- **Layered**: `app/` (pages) → `hooks/` (React Query) → `services/` (business logic) → `lib/supabase/` (data access)
- **API routes**: `app/api/[domain]/route.ts` pattern, 30+ API domains
- Security headers via `next.config.ts` (HSTS, CSP-equivalent, X-Frame-Options)
- Rewrites proxy backend chatkit traffic to `localhost:8051`

---

## Part 2: Backend (Python FastAPI)

### Core Framework

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| Framework | FastAPI | 0.104+ | Async REST API |
| ASGI Server | Uvicorn | 0.24+ | Production-grade ASGI |
| Data validation | Pydantic | 2.0+ | Request/response models |
| Settings | pydantic-settings | 2.0+ | Environment config |
| Deployment | Docker + Nginx | — | `docker-compose.yml`, `Dockerfile` |
| Cloud | Render | — | `render.yaml` |

### AI & Agent Systems

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| LLM SDK | openai | 1.0+ | OpenAI API client |
| Agents | openai-agents | 0.1+ | OpenAI Agents SDK |
| ChatKit backend | openai-chatkit | 0.1+ | ChatKit server-side |
| Agent SDK | claude-agent-sdk | 0.1.18+ | Claude agent framework |
| LLM chains | langchain | 0.1+ | LLM pipeline orchestration |
| LLM community | langchain-community | 0.0.10+ | Extended LangChain connectors |

### Database & Storage

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| Primary DB | Supabase (PostgreSQL) | 2.0+ | Shared with frontend |
| Sync driver | psycopg2-binary | 2.9+ | Synchronous PostgreSQL |
| Async driver | asyncpg | 0.31+ | High-performance async PostgreSQL |

### Data Processing

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| Tabular data | pandas + numpy | 2.0+ / 1.24+ | Data analysis |
| Excel | openpyxl + xlrd | 3.1+ / 2.0+ | Excel read/write |
| PDF | pypdf | 4.0+ | PDF text extraction |
| Word docs | python-docx | 1.1+ | DOCX processing |

### Web & Crawling

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| Web crawling | crawl4ai | 0.1+ | Intelligent web scraping |
| HTML parsing | beautifulsoup4 | 4.12+ | HTML/XML parsing |
| HTTP client | httpx | 0.25+ | Async HTTP client |

### Auth & Security

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| JWT | python-jose[cryptography] | 3.3+ | JWT token generation/validation |
| Password hashing | passlib[bcrypt] | 1.7+ | Bcrypt password hashing |

### Scheduling & Utilities

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| Scheduling | APScheduler | 3.10+ | Background task scheduling |
| CLI | click | 8.1+ | CLI command building |
| Terminal UI | rich | 13.0+ | Pretty terminal output |
| YAML | pyyaml | 6.0+ | YAML config parsing |
| WebSockets | websockets | 12.0+ | WebSocket support |

### Testing (Backend)

| Category | Technology | Version | Notes |
|----------|-----------|---------|-------|
| Test framework | pytest | 7.4+ | Python test runner |
| Async tests | pytest-asyncio | 0.21+ | Async test support |
| Coverage | pytest-cov | 4.1+ | Code coverage |

### Architecture Pattern (Backend)
- **Service-oriented**: FastAPI routers group endpoints by domain
- **Multi-agent AI pipeline**: Multiple AI agents orchestrated via OpenAI Agents SDK + Claude Agent SDK
- **RAG pipeline**: Document ingestion, vector embeddings, semantic search via Supabase pgvector
- **Port**: `8051` (proxied from frontend via Next.js rewrites)
- **Container**: Docker + Nginx for production; `start.sh` for local dev

---

## Part 3: Supabase (Infrastructure)

| Category | Technology | Notes |
|----------|-----------|-------|
| Database | PostgreSQL | Row Level Security (RLS) enabled |
| Auth | Supabase Auth | Session-based, JWT tokens |
| Storage | Supabase Storage | File/media storage |
| Migrations | SQL migrations | 55 migrations in `supabase/migrations/` |
| Types | TypeScript types | Auto-generated via `npm run db:types` |
| Project ID | `lgveqfnpkxvzbnnwuled` | Production Supabase project |

---

## Shared Infrastructure

| Category | Technology | Notes |
|----------|-----------|-------|
| CI/CD | GitHub Actions | `.github/workflows/` |
| Frontend deploy | Vercel | `vercel.json` |
| Backend deploy | Render | `render.yaml` |
| Secrets | `.env` files | Never committed (`.gitignore`) |
| Pre-commit | Husky + lint-staged | TypeScript check + ESLint |
| Monorepo scripts | Root `package.json` | Concurrently runs frontend + backend |

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    ALLEATO-PM ARCHITECTURE                   │
├──────────────────────────┬──────────────────────────────────┤
│    Frontend (Vercel)     │      Backend (Render)           │
│                          │                                  │
│  Next.js 15 / Turbopack  │   Python FastAPI (port 8051)    │
│  React 19 / TypeScript   │   Multi-agent AI pipeline        │
│  Zustand + React Query   │   RAG: crawl4ai + LangChain     │
│  Vercel AI SDK v6        │   OpenAI Agents + Claude SDK    │
│  Liveblocks (collab)     │   APScheduler (cron jobs)       │
│                          │                                  │
│    proxy.ts rewrites ────┼──► /rag-chatkit → :8051         │
│    REST API calls ───────┼──► /api/* Next.js routes        │
├──────────────────────────┴──────────────────────────────────┤
│                  Supabase (Shared DB)                        │
│  PostgreSQL + RLS | Auth | Storage | pgvector               │
│  55 migrations | Auto-generated TypeScript types            │
└─────────────────────────────────────────────────────────────┘
```
