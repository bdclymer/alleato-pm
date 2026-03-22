# Alleato-PM — Documentation Index

> Generated: 2026-03-22 | Full deep scan | Multi-part monorepo

Alleato-PM (alleato-procore) is a construction project management platform built as a Next.js 15 frontend with a Python FastAPI AI/agent backend and Supabase PostgreSQL database. It mirrors Procore's functionality with tools for budgets, contracts, change orders, drawings, scheduling, and more — augmented by an AI assistant with RAG capabilities.

---

## Quick Reference

| Need | Document |
|------|----------|
| What tech is used? | [Technology Stack](technology-stack.md) |
| How do I run the app? | [Development Guide](development-guide.md) |
| How is it deployed? | [Deployment Guide](deployment-guide.md) |
| What API routes exist? | [API Contracts — Frontend](api-contracts-frontend.md) |
| What's in the database? | [Data Models Summary](data-models-summary.md) |
| What components exist? | [Component Inventory](component-inventory.md) |
| How do the parts connect? | [Integration Architecture](integration-architecture.md) |
| Frontend architecture? | [Frontend Architecture](architecture-frontend.md) |
| Backend architecture? | [Backend Architecture](architecture-backend.md) |
| RAG pipeline & AI tools? | [RAG Pipeline & AI Tools](rag-and-ai-tools.md) |
| Where are files? | [Source Tree Analysis](source-tree-analysis.md) |

---

## Core Documentation

### Architecture

| Document | Description |
|----------|-------------|
| [Technology Stack](technology-stack.md) | Full stack inventory: Next.js 15, Python FastAPI, Supabase, Vercel AI SDK v6, Liveblocks, Drizzle ORM |
| [Frontend Architecture](architecture-frontend.md) | App Router layers, data access patterns, AI integration, design system, security |
| [Backend Architecture](architecture-backend.md) | FastAPI services, multi-agent AI, RAG pipeline, Acumatica sync, APScheduler |
| [RAG Pipeline & AI Tools](rag-and-ai-tools.md) | Complete RAG pipeline (3 stages, all tables), AI chat architecture, 49 tools across 6 categories, memory system |
| [Integration Architecture](integration-architecture.md) | How frontend, backend, Supabase, and external services connect |
| [Source Tree Analysis](source-tree-analysis.md) | Full directory structure with annotations |

### API & Data

| Document | Description |
|----------|-------------|
| [API Contracts — Frontend](api-contracts-frontend.md) | ~150+ Next.js route handlers across 30+ domains |
| [Data Models Summary](data-models-summary.md) | 287 Supabase tables/views/functions, 17 enums, 30+ pgvector search functions |

### Components & Development

| Document | Description |
|----------|-------------|
| [Component Inventory](component-inventory.md) | 100+ component dirs, 55+ UI primitives, design system components, ~80 hooks, 14 services |
| [Development Guide](development-guide.md) | Setup, dev commands, testing, mandatory gates, design system rules |
| [Deployment Guide](deployment-guide.md) | Vercel (frontend), Render (backend), Supabase migrations, GitHub Actions |

---

## Project Stats

| Metric | Value |
|--------|-------|
| Repository type | Multi-part monorepo |
| Frontend framework | Next.js 15.5.12 (App Router, Turbopack) |
| Backend framework | Python FastAPI |
| Database | Supabase PostgreSQL |
| Supabase migrations | 55 |
| Database tables/views/functions | 287 |
| TypeScript types file | 20,790 lines |
| API route files | ~150+ |
| API domains | 30+ |
| React Query hooks | ~80 |
| Service files | 14 |
| Component directories | 100+ |
| UI primitives (shadcn) | 55+ |
| GitHub Actions workflows | 9 |
| Deployment platforms | Vercel + Render |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Mandatory rules for Claude Code (read before all work) |
| `frontend/src/types/database.types.ts` | Auto-generated Supabase types (source of truth) |
| `frontend/src/proxy.ts` | Auth middleware — Supabase session refresh |
| `frontend/src/lib/ai/orchestrator.ts` | AI routing and RAG context assembly |
| `frontend/src/lib/ai/rag-assistant-prompt.ts` | AI assistant system prompt |
| `frontend/src/lib/navigation-config.ts` | App navigation structure |
| `frontend/src/design-system/CLAUDE_CODE_UI_GUIDE.md` | UI patterns and Tailwind classes |
| `supabase/migrations/` | 55 SQL migration files |
| `backend/src/services/` | Python AI and integration services |
| `.github/workflows/` | 9 CI/CD workflows |

---

## Navigation by Role

### New Developer
1. [Technology Stack](technology-stack.md) — Understand the stack
2. [Development Guide](development-guide.md) — Get running locally
3. [Source Tree Analysis](source-tree-analysis.md) — Navigate the codebase
4. [Component Inventory](component-inventory.md) — Find existing components

### Frontend Developer
1. [Frontend Architecture](architecture-frontend.md) — Patterns and layers
2. [Component Inventory](component-inventory.md) — Components, hooks, services
3. [API Contracts — Frontend](api-contracts-frontend.md) — Available endpoints
4. [Data Models Summary](data-models-summary.md) — Database schema

### Backend / AI Developer
1. [Backend Architecture](architecture-backend.md) — FastAPI + AI services
2. [Integration Architecture](integration-architecture.md) — Service connections
3. [Data Models Summary](data-models-summary.md) — pgvector + table structure

### DevOps / Deployment
1. [Deployment Guide](deployment-guide.md) — Vercel + Render + Supabase
2. [Integration Architecture](integration-architecture.md) — Service topology

---

## Existing Documentation

Additional documentation exists in `docs/` subdirectories from prior scans:

| Directory | Contents |
|-----------|----------|
| `docs/project-overview/` | High-level project documentation |
| `docs/database/` | Database-specific documentation |
| `docs/api/` | API reference documents |
| `docs/design/` | Design system documentation |
| `docs/testing/` | Testing guides |
| `docs/patterns/` | Incident log, error patterns, integration patterns |
| `docs/ai-plan/` | AI strategy and architecture plans |
| `docs/zBMAD/` | BMAD task files |
| `docs/.archive/` | Archived scan state files |
