# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Mandatory Rules

**Rule 1:** Do not ship silent failures.
**Rule 2:** Do not return generic errors.
**Rule 3:** Do not fix a recurring bug without adding a guardrail.
**Rule 4:** Do not introduce one-off handling when a shared abstraction is warranted.
**Rule 5:** For every failure, explain cause, detection gap, and prevention step.
**Rule 6:** Before closing any task, ask: “How does this fail loudly?”
**Rule 7:** Before closing any bug, ask: “What makes this never happen again?”

> Do not give me another isolated fix. Standardize this at the system level. Add shared error handling, structured logging, actionable notifications, a regression test, and the appropriate pre-deploy or post-deploy guardrail. Also tell me what would have caught this before I did.

### Every issue falls into one of these buckets:

* **Should have been prevented** → add validation / constraints
* **Should have been caught pre-deploy** → add tests / CI
* **Should have been caught post-deploy** → add monitoring

## Must Reference

- Design.md - **Read this before building any page or component.**
- Patterns.md

## Project Overview

Alleato-Procore is a construction project management platform built as a Next.js 15 frontend with Supabase backend. It mirrors Procore's functionality with tools for budgets, contracts, change orders, directory management, scheduling, and more.

## Agentation Watch Mode

When I say "watch mode", call agentation_watch_annotations in a loop.
For each annotation: acknowledge it, make the fix, then resolve it with a summary.
Continue watching until I say stop or timeout is reached.

### Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **UI:** shadcn/ui, Radix UI primitives, Framer Motion
- **State:** React Query (TanStack Query), Zustand
- **Backend:** Supabase (PostgreSQL, Auth, RLS), Python FastAPI
- **Testing:** agent-browser (primary interactive E2E), Playwright (scripted/CI E2E), Jest (unit)
- **Forms:** React Hook Form + Zod validation

### Directory Structure

```
alleato-procore/
├── frontend/                 # Next.js 15 App Router application
│   ├── src/
│   │   ├── app/             # App Router pages and API routes
│   │   │   ├── (main)/      # Project-scoped pages (with sidebar)
│   │   │   ├── (tables)/    # Table view pages
│   │   │   ├── (admin)/     # Admin pages
│   │   │   ├── api/         # API route handlers
│   │   │   └── auth/        # Auth pages
│   │   ├── components/
│   │   │   ├── ui/          # shadcn/ui primitives (do not add custom components here)
│   │   │   ├── ds/          # Design system components + barrel re-exports
│   │   │   ├── domain/      # Domain-specific components (forms, detail views)
│   │   │   └── layout/      # Page structure (PageShell, PageContainer, etc.)
│   │   ├── hooks/           # React Query hooks (use-*.ts)
│   │   ├── lib/
│   │   │   ├── supabase/    # Supabase client setup
│   │   │   └── schemas/     # Zod validation schemas
│   │   ├── services/        # Business logic services
│   │   └── types/           # TypeScript types (database.types.ts)
│   ├── tests/               # Playwright E2E tests
│   └── config/playwright/   # Playwright config
├── backend/                  # Python FastAPI backend
├── supabase/migrations/      # SQL migrations
├── scripts/                  # Utility scripts
└── docs/                     # All documentation (single doc directory)
```

---

## Development Commands

```bash
# From repo root
npm run dev                    # frontend + backend concurrently
npm run dev:frontend           # Next.js only (port 3000)
npm run dev:backend            # Python FastAPI only
npm run build                  # production build
npm run quality                # typecheck + lint
npm run quality:fix            # typecheck + lint with auto-fix

# From frontend/ directory
npm run lint                   # ESLint
npm run typecheck              # TypeScript type checking
npm run db:types               # Generate Supabase types (REQUIRED before DB work)
npm run check:routes           # Verify no dynamic route conflicts

# Database (from frontend/)
npm run db:generate            # Generate Drizzle migrations
npm run db:migrate             # Run migrations
npm run db:push                # Push schema changes
npm run db:studio              # Open Drizzle Studio
npm run seed:db                # Seed database
npm run seed:financial         # Seed financial data
```

## Testing Commands

```bash
# From frontend/ directory
npm run test                   # Playwright E2E (headless)
npm run test:headed            # Playwright with browser visible
npm run test:ui                # Playwright UI mode (best for debugging)
npm run test:unit              # Jest unit tests
npm run test:unit:watch        # Jest watch mode

# Specific test
npx playwright test tests/e2e/budget-line-item-validation.spec.ts --headed
```

**Auth is pre-configured.** Playwright uses saved session at `tests/.auth/user.json`. Never add login code to individual tests. If session expires, run `npx playwright test tests/auth.setup.ts` once. Config: `frontend/config/playwright/playwright.config.ts`. Test port: 3002.

---

## MANDATORY GATES

These rules are non-negotiable. Violating them wastes significant time. Full rules in `.claude/rules/`.

### 1. Supabase Types Gate

**BEFORE writing ANY database code:**

```bash
npm run db:types  # Generate fresh types
```

Then READ `frontend/src/types/database.types.ts` to verify tables/columns exist. FK column type must match PK type (e.g., `projects.id` is INTEGER, not UUID).

### 2. Route Naming Gate

**ALWAYS** use specific parameter names. **NEVER** use generic `[id]` — causes Next.js routing conflicts that crash the dev server.

| Resource | Parameter |
|----------|-----------|
| Project | `[projectId]` |
| Contract | `[contractId]` |
| Company | `[companyId]` |
| User | `[userId]` |
| Record | `[recordId]` |

Run `npm run check:routes` after creating dynamic routes.

### 3. Next.js Cache Gate

**BEFORE debugging ANY 404 or routing issue** with new/modified files:

```bash
cd frontend && rm -rf .next && pkill -f "next dev" && npm run dev > /tmp/nextjs-dev.log 2>&1 &
sleep 10 && tail -20 /tmp/nextjs-dev.log  # verify "Ready"
```

Never debug code before clearing `.next` cache.

### 4. Root Cause Gate

Before modifying code to fix an issue:
1. Gather runtime evidence (actual errors, query results, console output)
2. State root cause as a fact with evidence
3. Only then make targeted fixes — never modify based on grep alone

### 5. Authentication Gate

**NEVER** ask user to log in manually. Credentials are in `.env`:
- **Procore:** `PROCORE_USER` / `PROCORE_PASSWORD` (for crawlers/scripts)
- **App tests:** `test1@mail.com` / `test12026!!!` (from `TEST_USER_1`/`TEST_PASSWORD_1`)
- **Playwright:** Uses saved session at `tests/.auth/user.json` — no login code needed

### 6. Page Layout Gate — Use PageShell

**ALL new pages MUST use `PageShell`:**

```tsx
import { PageShell } from "@/components/layout";

<PageShell variant="dashboard" title="...">   // home/overview + KPI cards
<PageShell variant="table"     title="...">   // data tables
<PageShell variant="form"      title="..." onBack={() => router.back()}>  // create/edit
<PageShell variant="detail"    title="...">   // record detail with tabs
<PageShell variant="content"   title="...">   // settings/docs/read-heavy
```

**NEVER** write `<PageContainer>` + manual `<h1>` on new pages — creates double header.
**NEVER** use `ProjectToolPage` (deprecated) or `PageLayout` (deprecated).

**Note:** Some older pages still use `ProjectPageHeader` + `PageContainer` directly — that pattern is acceptable for existing pages but new pages should use `PageShell`.

### 7. Design System Gate

**BEFORE building ANY UI:**

1. Read `docs/design/DESIGN.md` — single source of truth
2. Import from `@/components/ds` or `@/components/ui` (both valid)
3. Copy patterns from `frontend/src/components/ds/GOLDEN-EXAMPLES.tsx`

**The 4 rules that catch 80% of violations:**
1. Never `<button>` — always `<Button>` from `@/components/ui/button`
2. Never `bg-white` — use `bg-card` (surface) or `bg-background` (page)
3. Never card trap — `bg-card + border border-border + rounded` wrapping content
4. Never hand-roll status colors — use `<StatusBadge status="..." />`

**Color tokens only:** `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`. Zero hex codes. Zero `gray-*`/`blue-*` classes.

**ESLint enforces this:** 3 rules active as ERRORS — `no-hardcoded-colors`, `no-arbitrary-spacing`, `require-semantic-colors`. Violations block the build.

**Component architecture:**
- `@/components/ui/` = Pure shadcn primitives ONLY
- `@/components/ds/` = Design system components + barrel re-exports
- `@/components/layout/` = Page structure (PageShell, PageContainer)
- `@/components/domain/` = Domain-specific components

| Component | Purpose |
|-----------|---------|
| `StatusBadge` | Pass status string → correct colors automatically |
| `StatusDot` | Minimal inline dot + label for tables |
| `KpiBlock` / `KpiRow` | Metric display |
| `DataTable` | Premium table with correct styling |
| `SectionHeader` | Title + count + action link |
| `EmptyState` | Icon + title + description + action |

### 8. Browser Verification Gate

**NEVER claim UI work complete without verifying in `agent-browser`:**

1. `agent-browser open <url>`
2. `agent-browser screenshot /tmp/<name>.png`
3. Read and inspect the screenshot
4. Only then report completion

### 9. Review Your Own Output Gate

**NEVER hand output back without reviewing it first.** Read screenshots, reports, and generated files with the Read tool. Present a summary of findings — don't say "output is at X, go look at it."

### 10. File Organization Gate

| File Type | Location |
|-----------|----------|
| Scripts (.js/.ts/.py/.sh) | `scripts/` |
| Documentation (.md) | `docs/` |
| Claude rules | `.claude/rules/` |
| SQL migrations | `supabase/migrations/` |
| Frontend code | `frontend/src/` |

Never create .md/.js/.ts/.py/.sh at project root (except CLAUDE.md, AGENTS.md, README.md).

### 11. Form ↔ Database FK Validation Gate

**BEFORE building or editing ANY form with dropdown/select fields that reference database records:**

1. Check `database.types.ts` — find the FK relationship for each column the form writes to
2. Check each dropdown component — find what table/API it loads options from, and what `id` field it matches on
3. **If the FK target table ≠ the dropdown options source table → STOP. Add ID resolution mapping.**
4. Test: load existing record → click Edit → verify ALL dropdowns show correct pre-filled selections

Known mismatches: `budget_code_id` (FK→budget_lines, dropdown→project_cost_codes), `vendor_id` (FK→companies, dropdown→vendors). Full reference: `docs/patterns/form-id-mismatch-prevention.md`

### 12. Chat & UI Premium Feel Gate

No borders/cards around chat sections. Only the input field gets a border.
- No `<Alert>`/`<Card>` wrappers in chat — render text directly
- No `Bot` icon — use brand initial "A" or `BriefcaseIcon`
- User messages: `bg-primary text-primary-foreground`
- Assistant avatar: `bg-primary/10 text-primary` with "A"
- Loading: animated dots, not spinners

### 13. API Fetch Gate — Use apiFetch

**NEVER use raw `fetch()` for API calls in pages, components, or hooks.** Use `apiFetch` from `@/lib/api-client`:

```tsx
import { apiFetch, summarizeBulkResults } from "@/lib/api-client";

// Single operation — throws ApiError with real message on failure
await apiFetch(`/api/projects/${id}`, { method: "DELETE" });

// Bulk operation — extracts real error reasons
const results = await Promise.allSettled(ids.map(id => apiFetch(`/api/.../${id}`, { method: "DELETE" })));
const { succeeded, failed, firstError } = summarizeBulkResults(results);
```

**Why:** Raw `fetch` requires manual JSON error parsing that every developer does differently (or forgets). `apiFetch` guarantees the actual server error message reaches the user — never "Failed to X" with no details.

**ESLint enforces this:** `require-api-client` rule warns on raw `fetch("/api/...")` calls.

### 14. Bug Fix Completion Gate

**A bug fix is NOT complete without at least one of the following:**
- A test (unit, integration, or E2E) that would have caught the bug
- A validation rule that prevents the bad input
- A smoke test entry covering the broken endpoint
- A monitor or alert wired to the failure class
- An improvement to the shared wrapper that handles the error pattern

**After every fix, answer these three questions:**
1. What would have caught this before it reached production?
2. What guardrail am I adding now so this class of bug cannot recur?
3. Does this reveal a pattern that needs a system-level fix, not just a local patch?

If you cannot answer them, the fix is incomplete.

### 15. Regression Test Gate

**Any bug that escaped to production must leave a permanent scar in the codebase.**

Options in priority order:
1. Add an entry to `scripts/api-smoke-contracts.mjs` if it was an endpoint failure
2. Add a Playwright E2E test for the broken user flow
3. Add a unit test for the broken logic
4. Add a Zod validation that rejects the bad input

**The regression test must fail before the fix and pass after it.**
A fix with no regression test is a fix that will recur.

### 16. External Calls Gate — Use fetchWithGuardrails

**NEVER use raw `fetch()` in API routes for calls to external services** (Render backend, OpenAI, Supabase admin, webhooks). Use `fetchWithGuardrails` from `@/lib/fetch-with-guardrails`:

```ts
import { fetchWithGuardrails } from "@/lib/fetch-with-guardrails";

const data = await fetchWithGuardrails("https://backend.onrender.com/api/...", {
  method: "POST",
  body: JSON.stringify(payload),
  requestId,           // propagates x-request-id header
  timeoutMs: 10_000,   // default; 30_000 for AI calls
  retries: 2,          // default; 0 for non-idempotent writes
  where: "route/name", // for structured error logging
});
```

**Why:** Raw `fetch` to external services has no timeout (can hang forever), no retry, no structured error output, and loses the request ID chain. `fetchWithGuardrails` enforces all four.

---

## Behavioral Rules

### Proactive Issue Fixing

When you find a bug during any task — even unrelated to current work — fix it or spawn a sub-agent. Never write "improvement opportunities" lists without acting on them.

### Use Available Tools

Always use MCP, CLI, or Bash instead of telling the user to do things manually. Never dump SQL and say "run this in Supabase."

### Bash Execution

- Check `pwd` before relative paths
- Use absolute paths for file redirects
- Don't use `cd X && command` chains (fails in zsh)
- Use single quotes for `node -e` with special chars

### Scaffolding

Use `/create-feature <EntityName>` for new CRUD features instead of writing from scratch. It enforces FK type validation, route conflict checks, and TypeScript compilation.

---

## Supabase Client Usage

- **Browser/client:** `import { createClient } from "@/lib/supabase/client"` (singleton)
- **Server/API routes:** `import { createClient } from "@/lib/supabase/server"` (new per request)

**Never install** `@supabase/auth-helpers-nextjs` — conflicts with `@supabase/ssr`.

---

## Key Patterns

**Data fetching:** Custom hooks in `hooks/use-*.ts` wrap Supabase queries with React Query.

**API routes:** `frontend/src/app/api/projects/[projectId]/resource/route.ts`

**Dynamic routes:** `/[projectId]/budget`, `/[projectId]/commitments` — always specific param names.

---

## Web Crawlers

Location: `scripts/screenshot-capture/`. All crawlers use automatic auth from `.env` (`PROCORE_USER`/`PROCORE_PASSWORD`). Use `/feature-crawl <name> <url>` to create new crawlers.

---

## Design System Reference

Read in this order:
1. `frontend/src/components/ds/GOLDEN-EXAMPLES.tsx` — copy-paste patterns
2. `docs/design/DESIGN.md` — full reference (single source of truth)
3. `docs/design/tokens.md` — color/spacing token tables
4. `docs/design/UI_GUIDE.md` — exact Tailwind class combos

Additional references:
- `docs/design/tables/table-system.md` — UnifiedTablePage API
- `docs/design/forms/form-page-archetype.md` — form page templates
- `docs/design/forms/FORM-SYSTEM.md` — RHF + Zod system

### Design Violation Tracker

At session start, check `/api/dev/violations?status=open`. Fix open violations before new feature work. Mark fixed via `PATCH /api/dev/violations`.

---

## Error Prevention

Check `docs/PREVENTION-CHECKLIST.md` before starting tasks. Known error patterns are documented in `docs/patterns/`:
- `authentication-errors.md`
- `database-issues.md`
- `api-routing-errors.md`
- `integration-errors.md`

---

## Working Context Protocol

**START of every session:** Read `WORKING_CONTEXT.md` — use its findings instead of re-exploring.

**END of every session:** Update `WORKING_CONTEXT.md` with what you worked on, found, changed, and what's still broken.

---

## Browser Automation

Use `agent-browser` for web automation:
1. `agent-browser open <url>` — navigate
2. `agent-browser snapshot -i` — get interactive elements (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` — interact
4. Re-snapshot after page changes

---

## Documentation

All docs go in `docs/`. Save documentation in the `docs/` folder with appropriate subdirectory.
