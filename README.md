# Alleato-PM

Alleato-PM is a construction project management platform modeled on Procore workflows. The repository combines a Next.js 15 frontend, a Python/FastAPI backend, Supabase schema management, and a large set of automation and verification utilities.

## Quick Start

### Prerequisites

- Node.js 18+
- npm
- Python 3.11+
- Supabase access for the configured project

### Setup

```bash
npm install
cd frontend && npm install
cp frontend/.env.example frontend/.env.local
cp backend/.env.template backend/.env
```

Fill in the copied environment files with the required Supabase and API credentials.

### Run Locally

```bash
# repo root
npm run dev

# frontend only
npm run dev:frontend

# backend only
npm run dev:backend
```

## High-Signal Commands

```bash
# repo root
npm run db:types
npm run check:routes
npm run verify:browser
npm run test

# frontend/
npm run quality
npm run test
npm run test:unit
```

## Repository Layout

- `frontend/` - Next.js app, UI components, App Router routes, frontend tests
- `backend/` - FastAPI services, backend scripts, pytest coverage
- `supabase/` - migrations and DB helper scripts
- `scripts/` - repo-level automation, validation, and crawl utilities
- `docs/` - maintained project documentation
- `docs/` - AI-generated reports and PRP outputs
- `_bmad/` - BMAD method agents and workflows

## Documentation

Start here:

- `docs/project-overview/index.md`
- `docs/project-overview/project-context.md`
- `docs/development/developer-manual.md`
- `docs/design/AI-UI-BASELINE.md`
- `AGENTS.md`

## Notes

- Supabase types are generated into `frontend/src/types/database.types.ts` via `npm run db:types`.
- Route conflicts are guarded by `npm run check:routes`.
- Browser-style verification artifacts are written under `tests/agent-browser-runs/` and should not be committed as active work products unless intentionally documenting a result.
