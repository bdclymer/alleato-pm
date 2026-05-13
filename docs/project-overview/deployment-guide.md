# Deployment Guide -- Alleato-PM

> Last updated: 2026-03-24

---

## Infrastructure Overview

| Component | Platform | Config |
|-----------|----------|--------|
| Frontend | Vercel | `vercel.json` |
| Backend | Render | `render.yaml` + `Dockerfile` |
| Database | Supabase | `supabase/` (project: `lgveqfnpkxvzbnnwuled`) |
| File storage | Vercel Blob | Managed via Vercel dashboard |
| Real-time | Liveblocks | Managed via Liveblocks dashboard |

---

## Frontend Deployment (Vercel)

### Automatic Deployment

Every push to `main` triggers automatic deployment via GitHub Actions (`deploy-frontend.yml`) and Vercel's GitHub integration.

- **Preview deployments**: Created on every PR
- **Production deployments**: Triggered on merge to `main`
- **Framework**: Next.js 15 (auto-detected by Vercel)
- **Build command**: `npm run build`
- **Output directory**: `.next`
- **Root directory**: `frontend/`

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Link project (one-time)
vercel link

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Configuration (`vercel.json`)

```json
{
  "framework": "nextjs",
  "installCommand": "pnpm install",
  "buildCommand": "...",
  "NODE_OPTIONS": "--max-old-space-size=7168"
}
```

**Key settings:**
- `NODE_OPTIONS`: 7GB heap for TypeScript compilation of the 20,790-line types file
- `pnpm` with **two lockfiles** (root `pnpm-lock.yaml` + `frontend/pnpm-lock.yaml`). Both must stay in sync.

### Vercel Project Details

- **Project:** `alleato-hub` (`prj_eWVjvq6iYieADQy8xvjm3hmwRSnj`)
- **Team:** `team_lZighRY9Xpkb6qZBqDApczKZ`

### Post-Deployment Verification

After every push, verify deployment status:
```bash
vercel list
vercel inspect <deployment-url>
```
Deployment failures must be fixed immediately -- never leave a broken production deploy.

### Frontend Environment Variables (Vercel Dashboard)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (server-side only) |

---

## Backend Deployment (Render)

### Automatic Deployment

Every push to `main` triggers backend deployment via GitHub Actions (`deploy-backend.yml`).

### Configuration (`render.yaml`)

```yaml
services:
  - type: web
    name: alleato-backend
    runtime: docker
    dockerfilePath: ./backend/Dockerfile
    dockerContext: ./backend
    healthCheckPath: /health
    envVars:
      - key: PORT
        value: 8051
      - key: PYTHONPATH
        value: /app:/app/src:/app/src/services:/app/src/workers
      - key: PYTHONUNBUFFERED
        value: 1
      - key: OPENAI_API_KEY
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false
      - key: SUPABASE_ANON_KEY
        sync: false
      - key: USE_UNIFIED_AGENT
        value: true
      - key: CORS_ORIGINS
        value: https://alleato-procore.vercel.app,...
```

### Docker (`backend/Dockerfile`)

- **Base:** `python:3.11-slim`
- **System deps:** gcc, g++, curl
- **Python deps:** from `requirements.txt`
- **Port:** 8051 (configurable via `PORT` env)
- **Health check:** `curl -f http://localhost:${PORT:-8051}/health`
- **Entrypoint:** `python3 entrypoint.py` -> uvicorn

```bash
# Build image locally
cd backend
docker build -t alleato-backend .

# Run with docker-compose
docker-compose up
```

### Backend Environment Variables (Render Dashboard)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI features |
| `AI_GATEWAY_API_KEY` | No | AI Gateway key (BYOK mode) |
| `ACCOUNTING_USER` | No | Acumatica ERP username |
| `ACCOUNTING_PASSWORD` | No | Acumatica ERP password |
| `LIVEBLOCKS_SECRET_KEY` | No | Liveblocks real-time collaboration |
| `PORT` | No | Server port (default: 8051) |
| `USE_UNIFIED_AGENT` | No | Agent routing mode (default: true) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `DATABASE_URL` | No | PostgreSQL connection string (YokeFlow) |

---

## Database (Supabase)

**Project ID:** `lgveqfnpkxvzbnnwuled`
- 284+ tables across all domains
- Row Level Security (RLS) enabled
- Auth, Storage, and Realtime enabled
- Types auto-generated to `frontend/src/types/database.types.ts`

### Type Generation

```bash
npx supabase gen types typescript \
  --project-id "lgveqfnpkxvzbnnwuled" \
  --schema public \
  > frontend/src/types/database.types.ts
```

Or use the shorthand: `npm run db:types`

### Database Migrations

#### Automatic

The `db-migrate.yml` workflow runs on push to main when `supabase/migrations/` files change.

#### Manual

```bash
# Create a new migration file
supabase migration new <description>
# Edit the generated file in supabase/migrations/

# Push migrations to production
supabase db push

# Then regenerate types
npm run db:types
```

**Migration naming:** `{timestamp}_{description}.sql` (auto-generated timestamp by Supabase CLI)

#### Key Migration Files

| Migration | Description |
|-----------|-------------|
| `20260131_000001_schema.sql` | Main schema (664KB) |
| `20260131115801_add_budget_snapshots_and_forecasts.sql` | Budget forecasting |
| `20260131142854_add_drawings_system.sql` | Drawings with revisions |
| `20260201000001_add_specifications_system.sql` | Specifications system |
| `20260201100000_change_orders_enhance.sql` | Change order enhancements |

---

## CI/CD Pipelines (GitHub Actions)

| Workflow | File | Trigger | Description |
|----------|------|---------|-------------|
| CI | `ci.yml` | Push / PR to main | Lint + typecheck + build |
| Claude Review | `claude.yml` | PR comment `@claude` | AI code review |
| DB Migrate | `db-migrate.yml` | Push migration files | Auto-run Supabase migrations |
| Deploy Backend | `deploy-backend.yml` | Push to main | Trigger Render deploy |
| Deploy Frontend | `deploy-frontend.yml` | Push to main | Trigger Vercel deploy |
| E2E Tests | `e2e.yml` | PR / push | Run Playwright tests |
| Release | `release.yml` | Version tags | Create GitHub releases |
| Security | `security.yml` | Scheduled | Dependency + security scan |
| Sync API Docs | `sync-api-docs.yml` | Push to main | Update API documentation |

### CI Pipeline Detail (`ci.yml`)

```
Quality (lint + typecheck)
    |
    v
Unit Tests (Jest)
    |
    v
Build Verification
```

### E2E Pipeline Detail (`e2e.yml`)

```
PR -> Smoke tests (fast subset)
Main/Nightly -> Full Playwright E2E suite
```

---

## CORS Configuration

The backend allows requests from these origins:

| Origin | Environment |
|--------|-------------|
| `http://localhost:3000` | Frontend dev |
| `http://localhost:3001` | Frontend dev alt |
| `http://localhost:8080` | Backend dev |
| `https://alleato-procore.vercel.app` | Production |
| `https://www.alleato-procore.vercel.app` | Production www |
| `https://alleato-backend-rbnj.onrender.com` | Backend self |

---

## Environment Configuration by Stage

### Local Development

- `.env` at project root (never committed)
- Frontend: `frontend/.env.local` (optional overrides)
- Backend reads from root `.env` via `env_loader.py`

### Preview (Vercel)

- Environment variables set in Vercel dashboard -> Preview environment
- Preview deployments created for every PR

### Production (Vercel + Render)

- Environment variables set in Vercel + Render dashboards -> Production environment
- Never hardcode secrets

### Root (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `PROCORE_USER` | Testing | Procore login email for crawlers/tests |
| `PROCORE_PASSWORD` | Testing | Procore login password for crawlers/tests |

---

## Monitoring

### Health Checks

- **Backend**: `GET /health` -- Verifies backend status, OpenAI config, RAG availability
- **Render**: Automated health checks via `healthCheckPath: /health`
- **Vercel**: Built-in monitoring for Next.js apps

### Logging

- **Frontend**: Next.js server logs via Vercel dashboard
- **Backend**: stdout/stderr via Render dashboard, `PYTHONUNBUFFERED=1` for real-time logs
- **Optional**: Langfuse for LLM call monitoring

---

## Rollback Procedures

### Frontend (Vercel)

Vercel supports instant rollback to any previous deployment via dashboard.

```bash
# List recent deployments
vercel list

# Roll back to previous deployment
vercel rollback <deployment-url>
```

Or revert the git commit and push to `main`.

### Backend (Render)

Use Render dashboard -> Service -> Deploys -> click previous deploy -> "Redeploy".

Or revert the git commit and push to `main`.

### Database (Supabase)

- Supabase supports point-in-time recovery
- Write reverse migration SQL for schema changes
- Always test migrations in development first
- Supabase does not support automatic rollback -- create a forward migration to revert schema changes

---

_Generated using BMAD Method document-project workflow. Last merged: 2026-03-24._
