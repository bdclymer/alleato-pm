# Deployment Guide — Alleato-PM

> Generated: 2026-03-22 | Source: vercel.json, render.yaml, .github/workflows/

---

## Infrastructure Overview

| Component | Platform | Config |
|-----------|----------|--------|
| Frontend | Vercel | `vercel.json` |
| Backend | Render | `render.yaml` |
| Database | Supabase | `supabase/` (project: `lgveqfnpkxvzbnnwuled`) |
| File storage | Vercel Blob | Managed via Vercel dashboard |
| Real-time | Liveblocks | Managed via Liveblocks dashboard |

---

## Frontend Deployment (Vercel)

### Automatic Deployment
Every push to `main` triggers automatic deployment via GitHub Actions (`deploy-frontend.yml`) and Vercel's GitHub integration.

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
Deployment failures must be fixed immediately — never leave a broken production deploy.

---

## Backend Deployment (Render)

### Automatic Deployment
Every push to `main` triggers backend deployment via GitHub Actions (`deploy-backend.yml`).

### Configuration (`render.yaml`)
- **Type:** Docker-based web service
- **Health check:** `GET /health`
- **Port:** 8051
- **CORS:** `alleato-procore.vercel.app` + localhost origins

### Docker
```bash
# Build image locally
cd backend
docker build -t alleato-backend .

# Run with docker-compose
docker-compose up
```

### Environment Variables on Render
Set these in the Render dashboard:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` / `AI_GATEWAY_API_KEY`
- `ACCOUNTING_USER`, `ACCOUNTING_PASSWORD`
- `LIVEBLOCKS_SECRET_KEY`

---

## Database Migrations (Supabase)

### Automatic
The `db-migrate.yml` workflow runs on push to main when `supabase/migrations/` files change.

### Manual
```bash
# Push migrations to production
supabase db push

# Then regenerate types
npm run db:types
```

### Creating a New Migration
```bash
# Create a new migration file
supabase migration new <description>
# Edit the generated file in supabase/migrations/
# Then push
supabase db push && npm run db:types
```

**Migration naming:** `{timestamp}_{description}.sql` (auto-generated timestamp by Supabase CLI)

---

## GitHub Actions Workflows

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

---

## Environment Configuration by Stage

### Local Development
- `.env` at project root (never committed)
- Frontend: `frontend/.env.local` (optional overrides)
- Backend reads from root `.env` via `env_loader.py`

### Preview (Vercel)
- Environment variables set in Vercel dashboard → Preview environment
- Preview deployments created for every PR

### Production (Vercel + Render)
- Environment variables set in Vercel + Render dashboards → Production environment
- Never hardcode secrets

---

## Rollback

### Frontend (Vercel)
```bash
# List recent deployments
vercel list

# Roll back to previous deployment
vercel rollback <deployment-url>
```

### Backend (Render)
Use Render dashboard → Service → Deploys → click previous deploy → "Redeploy"

### Database
Supabase does not support automatic rollback. Create a forward migration to revert schema changes.
