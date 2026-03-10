# Alleato-Procore - Deployment Guide

**Date:** 2026-02-23

## Overview

Alleato-Procore uses a split deployment architecture:
- **Frontend**: Vercel (automatic from GitHub)
- **Backend**: Render (Docker container)
- **Database**: Supabase (hosted PostgreSQL)
- **CI/CD**: GitHub Actions (10 workflows)

## Infrastructure

### Frontend (Vercel)

**Deployment:** Automatic via GitHub integration
- **Preview deployments**: Created on every PR
- **Production deployments**: Triggered on merge to `main`
- **Framework**: Next.js 15 (auto-detected by Vercel)
- **Build command**: `npm run build`
- **Output directory**: `.next`
- **Root directory**: `frontend/`

**Environment Variables (Vercel Dashboard):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-only)

### Backend (Render)

**Deployment:** Docker container via `render.yaml`

**Configuration** (`render.yaml`):
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
        value: 8000
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

**Docker** (`backend/Dockerfile`):
- Base: `python:3.11-slim`
- System deps: gcc, g++, curl
- Python deps: from `requirements.txt`
- Port: 8000 (configurable via `PORT` env)
- Health check: `curl -f http://localhost:${PORT:-8000}/health`
- Entrypoint: `python3 entrypoint.py` → uvicorn

### Database (Supabase)

**Project ID:** `lgveqfnpkxvzbnnwuled`
- 284 tables across all domains
- Row Level Security (RLS) enabled
- Auth, Storage, and Realtime enabled
- Types auto-generated to `frontend/src/types/database.types.ts`

**Type Generation:**
```bash
npx supabase gen types typescript \
  --project-id "lgveqfnpkxvzbnnwuled" \
  --schema public \
  > frontend/src/types/database.types.ts
```

## CI/CD Pipelines

### 1. Quality & Build (`ci.yml`)

**Triggers:** PRs and pushes to `main`

```
Quality (lint + typecheck)
    │
    ▼
Unit Tests (Jest)
    │
    ▼
Build Verification
```

### 2. Frontend Deploy (`deploy-frontend.yml`)

**Triggers:** PRs (preview) and pushes to `main` (production)

```
PR opened/updated → Vercel preview deployment
Merge to main → Vercel production deployment
```

### 3. Backend Deploy (`deploy-backend.yml`)

**Triggers:** Pushes to `main`

```
Backend tests (pytest)
    │
    ▼
Render Docker deployment
```

### 4. E2E Tests (`e2e.yml`)

**Triggers:** PRs (smoke), main pushes + nightly (full suite)

```
PR → Smoke tests (fast subset)
Main/Nightly → Full Playwright E2E suite
```

### Additional Workflows

- Claude Code integration workflow
- Additional CI/CD workflows (10 total)

## CORS Configuration

The backend allows requests from these origins:
- `http://localhost:3000` (frontend dev)
- `http://localhost:3001` (frontend dev alt)
- `http://localhost:8080` (backend dev)
- `https://alleato-procore.vercel.app` (production)
- `https://www.alleato-procore.vercel.app` (production www)
- `https://alleato-pm-1.onrender.com` (backend self)

## Environment Variables Reference

### Frontend (.env.local)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (server-side only) |

### Backend (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI features |
| `PORT` | No | Server port (default: 8000) |
| `USE_UNIFIED_AGENT` | No | Agent routing mode (default: true) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `DATABASE_URL` | No | PostgreSQL connection string (YokeFlow) |

### Root (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `PROCORE_USER` | Testing | Procore login email for crawlers/tests |
| `PROCORE_PASSWORD` | Testing | Procore login password for crawlers/tests |

## Monitoring

### Health Checks

- **Backend**: `GET /health` - Verifies backend status, OpenAI config, RAG availability
- **Render**: Automated health checks via `healthCheckPath: /health`
- **Vercel**: Built-in monitoring for Next.js apps

### Logging

- **Frontend**: Next.js server logs via Vercel dashboard
- **Backend**: stdout/stderr via Render dashboard, `PYTHONUNBUFFERED=1` for real-time logs
- **Optional**: Langfuse for LLM call monitoring

## Database Migrations

### Adding New Migrations

1. Create migration file: `supabase/migrations/<timestamp>_<description>.sql`
2. Apply to Supabase (via dashboard or CLI)
3. Regenerate types: `npm run db:types`
4. Update frontend code to use new schema

### Key Migration Files

| Migration | Description |
|-----------|-------------|
| `20260131_000001_schema.sql` | Main schema (664KB) |
| `20260131115801_add_budget_snapshots_and_forecasts.sql` | Budget forecasting |
| `20260131142854_add_drawings_system.sql` | Drawings with revisions |
| `20260201000001_add_specifications_system.sql` | Specifications system |
| `20260201100000_change_orders_enhance.sql` | Change order enhancements |

## Rollback Procedures

### Frontend
- Vercel supports instant rollback to any previous deployment via dashboard
- Or revert the git commit and push to `main`

### Backend
- Render supports rolling back to previous Docker image
- Or revert the git commit and push to `main`

### Database
- Supabase supports point-in-time recovery
- Write reverse migration SQL for schema changes
- Always test migrations in development first

---

_Generated using BMAD Method `document-project` workflow_
