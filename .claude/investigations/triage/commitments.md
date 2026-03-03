# Commitments Tool — Triage Report
**Date:** 2026-03-03
**Score:** 8/10

## File Inventory
- **Page:** `frontend/src/app/(main)/[projectId]/commitments/page.tsx` (452 lines) — REAL, substantial
- **API Route:** `frontend/src/app/api/projects/[projectId]/commitments/` — directory exists but NO route.ts!
  - Has: [commitmentId]/, export/
  - The actual commitments CRUD routes live at: `frontend/src/app/api/commitments/route.ts`
- **Hook:** `frontend/src/hooks/use-commitments.ts` (272 lines)
  - Uses Supabase client directly (reads from `commitments_unified` view)
- **Feature Dir:** `frontend/src/features/commitments/commitments-table-config.tsx`

## What Works
- Page uses `UnifiedTablePage` + `useUnifiedTableState` — correct pattern
- Hook fetches from `commitments_unified` Supabase view directly (client-side)
- Delete functionality with AlertDialog
- Export dialog
- Financial totals displayed

## Issues Found

### Issue 1: No Route.ts at Project-Scoped Commitments API (MEDIUM)
- `api/projects/[projectId]/commitments/route.ts` does NOT exist
- Commitments API lives at `api/commitments/[id]/route.ts` (not project-scoped)
- Hook queries Supabase directly using client — works but bypasses API layer

### Issue 2: No ProjectPageHeader (MEDIUM)
- No ProjectPageHeader or PageContainer found in commitments page grep
- UnifiedTablePage provides its own header internals, but standard pattern requires explicit ProjectPageHeader

### Issue 3: hook uses Supabase client directly (LOW)
- `use-commitments.ts` imports `createClient` from `@/lib/supabase/client` and queries directly
- This is client-side Supabase (not API route pattern)
- Works but inconsistent with hooks that use fetch to API routes

### Issue 4: Missing Create Dialog (MEDIUM)
- No create form/dialog found in commitments page grep
- "Create commitment" action may navigate to a detail page or be missing
- ExportDialog exists but no create form visible

## Top 3 Issues
1. **Missing create form** — commitments may not have a working create flow
2. **No project-scoped route.ts** — API structure is non-standard
3. **Direct Supabase access** — bypasses auth middleware in API routes

## Recommendation
**Reference implementation but not perfect.** The data read path works. Need to verify create works. The direct Supabase access pattern is functional but inconsistent.
