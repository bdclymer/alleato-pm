# Change Events Tool — Triage Report
**Date:** 2026-03-03
**Score:** 7/10

## File Inventory
- **Page:** `frontend/src/app/(main)/[projectId]/change-events/page.tsx` (514 lines) — REAL, uses UnifiedTablePage
- **Detail Page:** `frontend/src/app/(main)/[projectId]/change-events/[id]/page.tsx` (592 lines)
- **Edit Page:** `frontend/src/app/(main)/[projectId]/change-events/[id]/edit/page.tsx` (223 lines)
- **New Page:** `frontend/src/app/(main)/[projectId]/change-events/new/page.tsx` — EXISTS, uses ChangeEventForm
- **API Route:** `frontend/src/app/api/projects/[projectId]/change-events/route.ts` (409 lines)
  - Sub-routes: [changeEventId]/, rfqs/, validation.ts
- **Hook:** `frontend/src/hooks/use-change-events.ts` (201 lines)
- **Feature Config:** `frontend/src/features/change-events/change-events-table-config.tsx`

## What Works
- Page uses `UnifiedTablePage` + `useUnifiedTableState` — correct pattern
- Uses `ProjectPageHeader` + `PageContainer` — compliant with Gate #10
- Full CRUD: new page, [id] detail page, [id]/edit page
- API route has GET + POST (409 lines = substantial)
- Delete via fetch in page
- Hook `useProjectChangeEvents` exists

## Issues Found

### Issue 1: Route Naming Conflict — [id] vs [changeEventId] (HIGH PRIORITY)
- Page routes use `[id]` parameter: `/change-events/[id]/`
- API routes use `[changeEventId]` parameter: `/change-events/[changeEventId]/`
- CLAUDE.md Gate #2: "NEVER use generic [id]"
- However, `[id]` doesn't conflict here because it's in `(main)` not in `api`
- **Risk:** Could cause confusion; check if detail page correctly uses `params.id`

### Issue 2: API Route Header Comment says [id] (MEDIUM)
- change-events/route.ts comments say: `GET /api/projects/[id]/change-events/[changeEventId]`
- The actual route is under `[projectId]` not `[id]` — documentation mismatch

### Issue 3: Change Event [id] page param naming (LOW)
- Detail page at `[id]/page.tsx` uses `useParams()` which returns `params.id`
- But standard naming convention says use `[changeEventId]`
- Not a functional issue since (main) routes don't conflict with API routes

### Issue 4: Summary Card Info (LOW)
- The page has a large summary card section (line 323+) with `formatCurrency` inline
- Potential duplication of utility functions

## Top 3 Issues
1. **Route naming [id]** — violates CLAUDE.md Gate #2 (should be [changeEventId])
2. **API comment mismatch** — comments say [id] but route is [projectId]
3. **Function duplication** — formatCurrency defined inline vs imported

## Recommendation
**Medium priority.** Core CRUD works. Main issue is route naming convention violation. Create/Edit/Detail all exist. Consider renaming [id] to [changeEventId] as a cleanup task.
