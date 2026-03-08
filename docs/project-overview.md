# Alleato-Procore - Project Overview

**Date:** 2026-02-23
**Type:** Construction Project Management Platform
**Architecture:** Multi-part monorepo (Next.js frontend + Python FastAPI backend)

## Executive Summary

Alleato-Procore is a full-featured construction project management platform that mirrors Procore's functionality while adding AI-powered intelligence features. The frontend is a Next.js 15 application with 31 project-scoped tools covering budgets, contracts, change management, scheduling, drawings, specifications, directory management, and more. The backend provides AI-powered capabilities including RAG-based knowledge retrieval, multi-agent chat workflows, meeting intelligence, and document analysis. All data is stored in Supabase (PostgreSQL with Row Level Security), with 284 database tables supporting the complete construction management domain.

## Project Classification

- **Repository Type:** Multi-part monorepo
- **Project Type(s):** Web application (frontend) + Backend API (backend)
- **Primary Language(s):** TypeScript (frontend), Python (backend)
- **Architecture Pattern:** Client-server with shared database (Supabase)

## Multi-Part Structure

This project consists of 2 distinct parts:

### Frontend

- **Type:** Web application
- **Location:** `frontend/`
- **Purpose:** User-facing construction project management interface with 31 tools, comprehensive component library, and real-time collaboration features
- **Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, React Query, Zustand, Supabase SSR

### Backend

- **Type:** Backend API + AI services
- **Location:** `backend/`
- **Purpose:** AI-powered features including RAG chat, meeting intelligence, multi-agent workflows, document ingestion, and insight extraction
- **Tech Stack:** Python, FastAPI, OpenAI (GPT + Agents SDK), LangChain, Supabase Python, Claude Agent SDK

### How Parts Integrate

The frontend communicates with the backend via HTTP proxy rewrites configured in `next.config.ts`. Specifically:
- `/rag-chatkit/*` requests are proxied to the backend's RAG ChatKit endpoints (SSE streaming)
- `/chatkit/*` requests are proxied to the backend's Construction PM ChatKit endpoints

Both parts share the same Supabase database. The frontend handles all CRUD operations for project management data directly via Supabase client SDK, while the backend reads from and writes to the same database for AI/analytics features (document chunks, embeddings, insights).

## Technology Stack Summary

### Frontend Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js | 15.5.12 |
| UI Library | React | 19.2.4 |
| Language | TypeScript | 5.x (strict mode) |
| Styling | Tailwind CSS | 4.1.7 |
| UI Components | shadcn/ui + Radix UI | Latest |
| State (Server) | TanStack React Query | 5.90 |
| State (Client) | Zustand | 5.0 |
| Forms | React Hook Form + Zod | 7.71 / 4.3.6 |
| Database Client | Supabase SSR | 0.8.0 |
| Animation | Framer Motion | 12.15.0 |
| Testing (E2E) | Playwright | 1.58.1 |
| Testing (Unit) | Jest | 30.2.0 |

### Backend Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | FastAPI | 0.104+ |
| Runtime | Python | 3.11 |
| AI/LLM | OpenAI SDK | 1.0+ |
| Agents | OpenAI Agents SDK | 0.1+ |
| RAG | LangChain | 0.1+ |
| Database | Supabase Python | 2.0+ |
| Agent Platform | Claude Agent SDK | 0.1.18+ |
| Web Scraping | Crawl4AI | 0.1+ |
| Monitoring | Langfuse | 2.0+ |

### Shared Infrastructure

| Category | Technology |
|----------|-----------|
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Frontend Hosting | Vercel |
| Backend Hosting | Render (Docker) |
| CI/CD | GitHub Actions (10 workflows) |
| Monorepo | npm workspaces + concurrently |

## Key Features

### Project Management Tools (31 tools)
- **Financial**: Budget, Budget Views, Direct Costs, Prime Contracts, Commitments (Subcontracts + Purchase Orders), Invoicing, Schedule of Values
- **Change Management**: Change Events (with RFQs, approvals), Change Orders (Prime Contract + Commitment), Vertical Markup
- **Field Management**: Schedule (Gantt + hierarchy), Punch List, Daily Log, Meetings
- **Documents**: Drawings (with sets, areas, revisions), Specifications (with sections, revisions), Submittals, Photos, Transmittals
- **Communication**: RFIs, Emails, Directory (People + Companies + Groups)
- **Administration**: Project Setup Wizard, Permissions System, Reporting, Admin Panel

### AI & Intelligence Features
- **RAG Chat**: Multi-agent knowledge retrieval with classification-based routing (Project, Knowledge Base, Strategist agents)
- **Construction PM ChatKit**: Domain-specific chatbot with specialist agents (Budget, Change Order, RFI, Submittal)
- **Meeting Intelligence**: Fireflies transcript ingestion with insight extraction, action item detection, risk identification
- **Document Intelligence**: Document processing pipeline with chunking, embedding, and semantic search

### Platform Capabilities
- **Real-time Collaboration**: Supabase Realtime subscriptions, presence tracking, collaborative cursors
- **Role-Based Access**: Comprehensive permission system with templates, overrides, and project-scoped roles
- **Multi-View Tables**: Responsive data tables with filtering, sorting, grouping, bulk actions, and export
- **Design System**: shadcn/ui base with Procore brand colors, dark mode support, and custom animations

## Architecture Highlights

1. **Provider-First Architecture**: Root layout wraps children in QueryProvider → ThemeProvider → ProjectProvider → FavoritesProvider → HeaderProvider
2. **Hook-Driven Data Flow**: All data operations flow through 74+ React Query hooks that wrap Supabase queries
3. **Service Pattern**: Complex multi-step operations encapsulated in 15 service classes (DrawingService, SpecificationService, etc.)
4. **Multi-Agent AI**: Classification agent routes queries to specialist agents (Project, KB, Strategist) with RAG-powered retrieval
5. **Type Safety**: 17,629-line auto-generated Supabase types file ensures compile-time database safety
6. **Security Headers**: OWASP-compliant headers configured in Next.js (CSP, HSTS, X-Frame-Options)

## Development Overview

### Prerequisites

- Node.js 20+
- Python 3.11+
- npm 9+
- Supabase CLI (for type generation)
- Docker (for backend development)

### Getting Started

```bash
# Clone and install
git clone <repo-url>
npm install              # Root monorepo dependencies
cd frontend && npm install
cd ../backend && pip install -r requirements.txt
```

### Key Commands

#### Frontend

- **Install:** `cd frontend && npm install`
- **Dev:** `npm run dev:frontend` (or `npm run dev` for both)
- **Build:** `npm run build`
- **Test:** `cd frontend && npm run test`
- **Quality:** `npm run quality` (typecheck + lint)
- **Types:** `npm run db:types` (regenerate Supabase types)

#### Backend

- **Install:** `pip install -r backend/requirements.txt`
- **Dev:** `npm run dev:backend`
- **Docker:** `docker compose up backend`

## Repository Structure

The monorepo is organized with clear separation between frontend and backend, with shared configuration at the root level. The frontend follows Next.js App Router conventions with route groups for layout management. The backend is structured around services and agents. Supabase migrations live in their own directory, and scripts are organized by purpose (screenshot capture, seeding, build utilities). Claude Code configuration (.claude/) contains 14 mandatory rules and 100+ BMAD workflow commands.

## Documentation Map

For detailed information, see:

- [index.md](./index.md) - Master documentation index
- [architecture-frontend.md](./architecture-frontend.md) - Frontend technical architecture
- [architecture-backend.md](./architecture-backend.md) - Backend technical architecture
- [source-tree-analysis.md](./source-tree-analysis.md) - Directory structure
- [development-guide.md](./development-guide.md) - Development workflow
- [api-contracts.md](./api-contracts.md) - API endpoints and schemas
- [data-models.md](./data-models.md) - Database schema and models
- [component-inventory.md](./component-inventory.md) - UI component catalog
- [integration-architecture.md](./integration-architecture.md) - How frontend and backend communicate

---

_Generated using BMAD Method `document-project` workflow_
