# Alleato-PM — Documentation Index

> Last updated: 2026-03-24 | Full deep scan | Multi-part monorepo

Alleato-PM (alleato-procore) is a construction project management platform built as a Next.js 15 frontend with a Python FastAPI AI/agent backend and Supabase PostgreSQL database. It mirrors Procore's functionality with tools for budgets, contracts, change orders, drawings, scheduling, and more — augmented by an AI assistant with RAG capabilities.

---

## Quick Reference

| Need | Document |
|------|----------|
| What tech is used? | [Technology Stack](technology-stack.md) |
| How do I run the app? | [Development Guide](development-guide.md) |
| How is it deployed? | [Deployment Guide](deployment-guide.md) |
| What API routes exist? | [API Contracts](api-contracts.md) |
| What's in the database? | [Data Models](data-models.md) |
| What components exist? | [Component Inventory](component-inventory.md) |
| How do the parts connect? | [Integration Architecture](integration-architecture.md) |
| Frontend architecture? | [Frontend Architecture](architecture-frontend.md) |
| Backend architecture? | [Backend Architecture](architecture-backend.md) |
| RAG pipeline & AI tools? | [RAG & AI Tools](rag-and-ai-tools.md) |
| Where are files? | [Source Tree Analysis](source-tree-analysis.md) |

---

## Core Documentation

### Architecture

| Document | Description |
|----------|-------------|
| [Technology Stack](technology-stack.md) | Full stack inventory: Next.js 15, Python FastAPI, Supabase, Vercel AI SDK v6, Liveblocks, Drizzle ORM |
| [Frontend Architecture](architecture-frontend.md) | App Router layers, data access patterns, AI integration, design system, security |
| [Backend Architecture](architecture-backend.md) | FastAPI services, multi-agent AI, RAG pipeline, Acumatica sync, APScheduler |
| [RAG & AI Tools](rag-and-ai-tools.md) | Complete RAG pipeline (3 stages, all tables), AI chat architecture, 49 tools across 6 categories, memory system |
| [Integration Architecture](integration-architecture.md) | How frontend, backend, Supabase, and external services connect |
| [Source Tree Analysis](source-tree-analysis.md) | Full directory structure with annotations |

### API & Data

| Document | Description |
|----------|-------------|
| [API Contracts](api-contracts.md) | ~150+ Next.js route handlers across 30+ domains |
| [Data Models](data-models.md) | 287 Supabase tables/views/functions, 17 enums, 30+ pgvector search functions, full column details |

### Components & Development

| Document | Description |
|----------|-------------|
| [Component Inventory](component-inventory.md) | 100+ component dirs, 55+ UI primitives, design system components, ~80 hooks, 14 services |
| [Development Guide](development-guide.md) | Setup, dev commands, testing, mandatory gates, design system rules |
| [Deployment Guide](deployment-guide.md) | Vercel (frontend), Render (backend), Supabase migrations, GitHub Actions |

### AI Agent Configuration

| Document | Description |
|----------|-------------|
| [Project Context](project-context.md) | AI-optimized project context: 85 development rules, critical anti-patterns, mandatory gates, and architectural decisions for AI agents |
| [Agent Systems Analysis](agent-systems-analysis.md) | BMAD methodology overview: 5 installed modules, 22-agent roster, workflow engine mechanics, integration patterns |
| [SOLUTIONS](SOLUTIONS.md) | Known solutions and fix patterns |
| [Project Overview](project-overview.md) | Executive summary, tech stack, key features, and architecture highlights |

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
3. [API Contracts](api-contracts.md) — Available endpoints
4. [Data Models](data-models.md) — Database schema

### Backend / AI Developer
1. [Backend Architecture](architecture-backend.md) — FastAPI + AI services
2. [RAG & AI Tools](rag-and-ai-tools.md) — RAG pipeline and tool inventory
3. [Integration Architecture](integration-architecture.md) — Service connections
4. [Data Models](data-models.md) — pgvector + table structure

### DevOps / Deployment
1. [Deployment Guide](deployment-guide.md) — Vercel + Render + Supabase
2. [Integration Architecture](integration-architecture.md) — Service topology

---

## For AI-Assisted Development

This documentation is intended to help both humans and AI agents understand and extend the codebase. Prefer these curated files over generated indexes that include vendored or transient content.

### When Planning New Features:

**UI-only features:**
> Reference: `architecture-frontend.md`, `component-inventory.md`

**API/Backend features:**
> Reference: `architecture-backend.md`, `api-contracts.md`, `data-models.md`

**Full-stack features:**
> Reference: All architecture docs + `integration-architecture.md`

**Database changes:**
> Reference: `data-models.md` - Check FK types, RLS policies, and naming conventions

**AI/RAG features:**
> Reference: `rag-and-ai-tools.md`, `architecture-backend.md`, `data-models.md`

**Deployment changes:**
> Reference: `deployment-guide.md`

### Mandatory Gates (from CLAUDE.md):

Before writing code, always check these gates:

1. **Supabase Types Gate** - Run `npm run db:types` before any database work
2. **Route Naming Gate** - Use `[projectId]` not `[id]` for dynamic routes
3. **Next.js Cache Gate** - Clear `.next` before debugging new or changed routes
4. **Root Cause Gate** - Gather evidence before modifying code
5. **Design System Gate** - Use `PageShell`, import from `@/components/ds` or `@/components/ui`

---

## All Files in This Directory

| File | Description |
|------|-------------|
| `index.md` | This file |
| `project-overview.md` | Executive summary and architecture highlights |
| `architecture-frontend.md` | Frontend architecture deep dive |
| `architecture-backend.md` | Backend architecture deep dive |
| `api-contracts.md` | API route documentation |
| `data-models.md` | Full database schema reference (detailed columns + enums + pgvector functions) |
| `component-inventory.md` | Component, hook, and service inventory |
| `deployment-guide.md` | Deployment and infrastructure guide |
| `development-guide.md` | Local development setup and workflow |
| `integration-architecture.md` | Cross-service integration patterns |
| `source-tree-analysis.md` | Annotated directory structure |
| `rag-and-ai-tools.md` | RAG pipeline, AI tools, chat architecture |
| `technology-stack.md` | Full technology stack inventory |
| `SOLUTIONS.md` | Known solutions and fix patterns |
| `agent-systems-analysis.md` | BMAD agent methodology and roster |
| `project-context.md` | AI-optimized development rules and context |

---

_Consolidated from BMAD-generated and deep-scan documentation._
