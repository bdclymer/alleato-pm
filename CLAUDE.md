# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## MANDATORY GATES (READ FIRST)

These rules are NON-NEGOTIABLE. Violating them wastes significant time.

**Full rules in:** `.claude/rules/`

### 🧠 CLAUDE CODE LEARNING SYSTEM (MANDATORY)
**BEFORE ANY ACTION:** Check documented error patterns to prevent repeating mistakes.

**Required Steps:**
1. Read `.claude/MANDATORY-ERROR-PREVENTION.md`
2. Check relevant patterns in `docs-ai/contents/docs/patterns/`
3. Apply documented solutions for known issues
4. Follow pre-action validation checklist

**Pattern Categories:**
- `authentication-errors.md` - Permission and login issues
- `database-issues.md` - Schema and query problems
- `api-routing-errors.md` - Route and endpoint failures

**Use `/check-patterns [category] [keywords]` to search for relevant patterns.**

**This system is MANDATORY. No exceptions. Every repeated error wastes hours.**

### 1. Supabase Types Gate
**BEFORE** writing ANY code that touches the database:
```bash
npm run db:types  # Generate fresh types
```
Then READ `frontend/src/types/database.types.ts` to verify tables/columns exist.

**CRITICAL:** When creating FKs, verify the FK column type matches the PK type (e.g., `projects.id` is INTEGER, not UUID).

**NEVER**: Write SQL, API routes, or hooks without reading the generated types first.

### 2. Route Naming Gate
**ALWAYS** use specific parameter names: `[projectId]`, `[companyId]`, `[contractId]`
**NEVER** use generic `[id]` - causes Next.js routing conflicts that block dev server.

### 3. Playwright Gate
**BEFORE** diagnosing test failures: Run the test and observe actual DOM output.
**NEVER** guess what's happening without browser evidence.

### 4. Root Cause Gate (NEW)
**BEFORE** modifying code to fix an issue:
1. Gather runtime evidence (actual errors, query results, console output)
2. State the root cause as a FACT with evidence
3. Only THEN make targeted fixes

**NEVER**: Modify code based on grep searches or assumptions. See `.claude/rules/ROOT-CAUSE-GATE.md`

### 5. Use Available Tools Gate (NEW)
**ALWAYS** use available tools (MCP, CLI, Bash) instead of telling user to do things manually.
**NEVER**: Dump SQL and tell user "run this in Supabase" when MCP tools exist.

### 6. Bash Execution Rules (NEW)
- Check `pwd` before running commands with relative paths
- Use ABSOLUTE paths for file redirects
- Don't use `cd X && command` chains (fails in zsh)
- Use single quotes for `node -e` with special chars

### 7. Scaffolding Gate (NEW)
**BEFORE** writing new CRUD features from scratch:
1. Check if `.claude/scaffolds/` has a template for this pattern
2. Use `/scaffold <EntityName>` command to generate validated code
3. Customize the generated code for domain-specific needs

**NEVER**: Write hooks, services, or migrations from scratch when scaffolds exist.

---

## Scaffolding System

**Stop writing code from scratch. Use validated templates.**

| Need | Command/File |
|------|-------------|
| New CRUD feature | `/scaffold <EntityName>` |
| Pattern reference | `.claude/PATTERNS.md` |
| Hook template | `.claude/scaffolds/crud-resource/hook.ts` |
| Service template | `.claude/scaffolds/crud-resource/service.ts` |
| Migration template | `.claude/scaffolds/crud-resource/migration.sql` |

**Why this exists:** Every new feature written from scratch makes the same mistakes (wrong FK types, missing RLS, inconsistent patterns). Scaffolds eliminate this by providing copy-paste starting points that already work.

---

## Project Overview

Alleato-Procore is a construction project management platform built as a Next.js 15 frontend with Supabase backend. It mirrors Procore's functionality with tools for budgets, contracts, change orders, directory management, scheduling, and more.

## Development Commands

```bash
# Start development (frontend + backend)
npm run dev                    # Runs both frontend and backend concurrently
npm run dev:frontend           # Frontend only (Next.js on localhost:3000)
npm run dev:backend            # Backend only (Python/FastAPI)

# Build and quality
npm run build                  # Build frontend for production
npm run quality                # Run typecheck + lint
npm run quality:fix            # Run typecheck + lint with auto-fix

# In frontend directory (cd frontend)
npm run lint                   # ESLint
npm run typecheck              # TypeScript type checking
```

## Testing Commands

```bash
# From frontend directory
npm run test                   # Run Playwright tests
npm run test:headed            # Run tests with browser visible
npm run test:ui                # Open Playwright UI mode
npm run test:report            # View test report

# Run specific test file
npx playwright test tests/e2e/schedule-page.spec.ts --config=config/playwright/playwright.config.ts

# Unit tests (Jest)
npm run test:unit
npm run test:unit:watch
npm run test:unit:coverage
```

Playwright config is at `frontend/config/playwright/playwright.config.ts`. Tests use port 3002 by default. Auth state is saved in `tests/.auth/user.json`.

## Database Commands

```bash
# Generate Supabase types (REQUIRED before any database work)
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts

# Or use the script
npm run db:types               # From frontend directory

# Drizzle ORM commands (from frontend)
npm run db:generate            # Generate migrations
npm run db:migrate             # Run migrations
npm run db:push                # Push schema changes
npm run db:studio              # Open Drizzle Studio

# Seeding
npm run seed:db                # Seed database
npm run seed:db:dry            # Dry run seeding
npm run seed:financial         # Seed financial data
```

## Architecture

### Directory Structure
```
alleato-procore/
├── frontend/                 # Next.js 15 application
│   ├── src/
│   │   ├── app/             # App Router pages and API routes
│   │   │   ├── (main)/      # Main app routes with sidebar
│   │   │   ├── (tables)/    # Table view pages
│   │   │   ├── (other)/     # Misc pages
│   │   │   ├── api/         # API route handlers
│   │   │   └── auth/        # Auth pages
│   │   ├── components/      # React components
│   │   │   ├── ui/          # shadcn/ui primitives
│   │   │   ├── domain/      # Domain-specific components
│   │   │   └── layout/      # Layout components
│   │   ├── hooks/           # React Query hooks (use-*.ts)
│   │   ├── lib/
│   │   │   ├── supabase/    # Supabase client setup
│   │   │   └── schemas/     # Zod validation schemas
│   │   ├── services/        # Business logic services
│   │   └── types/           # TypeScript types
│   ├── tests/               # Playwright E2E tests
│   └── config/playwright/   # Playwright configuration
├── backend/                  # Python FastAPI backend
├── supabase/
│   └── migrations/          # SQL migrations
└── scripts/                 # Build and utility scripts
```

### Key Patterns

**Supabase Client Usage:**
- Browser: `import { createClient } from "@/lib/supabase/client"` (singleton)
- Server Components/API Routes: `import { createClient } from "@/lib/supabase/server"` (creates new instance per request)

**Data Fetching:**
- Custom hooks in `frontend/src/hooks/use-*.ts` wrap Supabase queries
- React Query for caching and state management
- Types from `@/types/database.types` for type safety

**API Routes:**
- Located at `frontend/src/app/api/`
- Use `[projectId]` parameter naming (NOT generic `[id]`)
- Pattern: `api/projects/[projectId]/resource/route.ts`

**Dynamic Routes:**
- Project routes: `/[projectId]/...` (e.g., `/[projectId]/budget`, `/[projectId]/commitments`)
- Use specific parameter names: `[projectId]`, `[companyId]`, `[contractId]`, `[userId]`
- NEVER use generic `[id]` - this causes Next.js routing conflicts

### Tech Stack
- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **UI:** shadcn/ui components, Radix UI primitives, Framer Motion
- **State:** React Query (TanStack Query), Zustand
- **Backend:** Supabase (PostgreSQL, Auth, RLS), Python FastAPI
- **Testing:** Playwright (E2E), Jest (unit)
- **Forms:** React Hook Form + Zod validation

## Critical Rules

### Route Naming (MANDATORY)
Next.js will fail to start if dynamic route parameters conflict. Always use specific names:

| Resource | Parameter Name |
|----------|---------------|
| Project | `[projectId]` |
| Company | `[companyId]` |
| Contract | `[contractId]` |
| User | `[userId]` |
| Record | `[recordId]` |

Check for conflicts: `npm run check:routes`

### Supabase Types Gate
Before ANY Supabase/database work:
1. Generate types: `npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts`
2. Read the generated types
3. Verify table names and columns exist
4. Only then write code

### Playwright Testing
Before claiming tests pass:
1. Actually run Playwright
2. Observe the browser DOM/output
3. Only then diagnose or fix issues


### Save all documentation in the docs-ai folder.

- file-path: /Users/meganharrison/Documents/github/alleato-pm/docs-ai/contents/docs
