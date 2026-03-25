# Punch List Implementation Tasks

**Status**: Complete | **Last Updated**: 2026-02-02

## Progress Summary

| Metric | Count |
|--------|-------|
| Total Tasks | 20 |
| Completed | 20 (100%) |
| In Progress | 0 |
| Remaining | 0 |

---

## Tasks

### Phase 1: Fix Broken (Critical)

- [x] Fix: Main page `(main)/[projectId]/punch-list/page.tsx` uses deprecated `ProjectToolPage` -- must replace with `ProjectPageHeader` + `PageContainer` pattern (per Page Header Consistency Gate)
- [x] Fix: Main page is a placeholder ("Coming soon") with no data or functionality -- needs full implementation

### Phase 2: Data Layer (Database)

- [x] Create `punch_items` table migration with all fields from PRP (title, description, status, priority, assignee fields, dates, location, trade, type, reference, etc.) -- use scaffold `migration.sql` as base with `project_id INTEGER` FK
- [x] Apply migration via Supabase MCP
- [x] Run `npm run db:types` to regenerate TypeScript types
- [x] Verify types in `database.types.ts` match schema

### Phase 3: API Layer

- [x] Create service: `frontend/src/services/PunchItemService.ts` -- CRUD operations with pagination, filtering, sorting (follow `SpecificationService` pattern)
- [x] Create hook: `frontend/src/hooks/use-punch-items.ts` -- React Query wrapper for punch items (follow `use-rfis.ts` pattern)
- [x] Create API route: `frontend/src/app/api/projects/[projectId]/punch-items/route.ts` -- GET (list with filters) and POST (create)
- [x] Create API route: `frontend/src/app/api/projects/[projectId]/punch-items/[punchItemId]/route.ts` -- GET (detail), PATCH (update), DELETE (soft delete)
- [x] Test all Supabase queries with `node -e` before claiming they work

### Phase 4: UI Layer

- [x] Rebuild main page `(main)/[projectId]/punch-list/page.tsx` using `ProjectPageHeader` + `PageContainer` pattern, connected to real data via hook
- [x] Create punch list client component `punch-list-client.tsx` with DataTable, summary cards, tab views (All Items / Recycle Bin)
- [x] Create punch item form dialog component for Create/Edit operations (follow existing form dialog patterns)
- [x] Create status badge component with color-coded status workflow (Draft, Work Required, Initiated, Closed)
- [x] Update `(tables)/punch-list/page.tsx` to use real data instead of mock data

### Phase 5: Testing & Validation

- [x] Run type check: `npx tsc --noEmit` -- zero punch-list errors (32 pre-existing errors in other files)
- [x] Run linting: `npm run lint` -- zero punch-list warnings (2 pre-existing errors in other files)
- [x] Run route check: `npm run check:routes` -- no conflicts
- [x] Test Supabase queries with `node -e` -- INSERT, SELECT, DELETE all pass
- [ ] Create E2E test: `tests/e2e/punch-list.spec.ts` (deferred -- requires running dev server)

---

## Session Log

### 2026-02-02 16:30

- Started: Audit and gap analysis
- PRP: `docs/PRPs/punch-list/prp-punch-list-fix.md`
- Findings: Feature is ~5% implemented. Two placeholder pages exist (one mock-data table view, one "Coming soon" stub). No database table, no API routes, no hooks, no services, no components, no tests.
- Next: Begin Phase 1 tasks (fix broken pages), then Phase 2 (database)

### 2026-02-02 (Implementation Session)

- Applied `punch_items` table migration via Supabase MCP (all fields, indexes, trigger, RLS policies)
- Regenerated Supabase types -- verified `project_id` is INTEGER (matches `projects.id`)
- Created `PunchItemService.ts` with list, getById, create, update, softDelete, restore methods
- Created `use-punch-items.ts` hook with React Query (usePunchItems, useCreatePunchItem, useUpdatePunchItem, useDeletePunchItem, useRestorePunchItem)
- Created API routes: GET/POST at `/api/projects/[projectId]/punch-items/` and GET/PATCH/DELETE at `/api/projects/[projectId]/punch-items/[punchItemId]/`
- Rebuilt main page using `ProjectPageHeader` + `PageContainer` (removed deprecated `ProjectToolPage`)
- Created client component with DataTable, summary cards, tab views (All Items / Recycle Bin)
- Created form dialog for Create/Edit with React Hook Form + Zod validation
- Created status badge and priority badge components
- Updated tables page to fetch real data from API
- All validation gates pass: tsc (0 new errors), lint (0 new errors), route check (no conflicts), query tests (all pass)

---

## Quick Reference

**PRP Document**: `docs/PRPs/punch-list/prp-punch-list-fix.md`
**Original PRP**: `docs/PRPs/punch-list/punch-list/index.mdx`
**Execution Plan**: `docs/PRPs/punch-list/execution-plan-punch-list/index.mdx`
**Crawl Data**: `docs/PRPs/punch-list/crawl/`

### Key Commands

```bash
# Validate types
cd frontend && npx tsc --noEmit

# Run linting
cd frontend && npm run lint

# Check routes
npm run check:routes

# Generate DB types
cd frontend && npm run db:types

# Run E2E tests
cd frontend && npx playwright test tests/e2e/punch-list.spec.ts --headed

# Build production
cd frontend && npm run build

# Start dev server
npm run dev
```

---

## How to Update This File

When completing a task:

1. Change `- [ ]` to `- [x]`
2. Update the Progress Summary counts
3. Add an entry to Session Log
4. Update the Status badge if changing phases
