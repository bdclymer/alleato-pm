# Direct Costs Tool — Triage Report
**Date:** 2026-03-03
**Score:** 6/10

## File Inventory
- **Page (list):** `frontend/src/app/(main)/[projectId]/direct-costs/page.tsx` (121 lines) — Server Component
- **Client:** `frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx` — uses UnifiedTablePage
- **New Page:** `frontend/src/app/(main)/[projectId]/direct-costs/new/page.tsx` (25 lines) — uses CreateDirectCostForm
- **Detail Page:** `frontend/src/app/(main)/[projectId]/direct-costs/[costId]/page.tsx`
- **Form:** `frontend/src/components/direct-costs/DirectCostForm.tsx` (841 lines) — the problematic file
- **Create Wrapper:** `frontend/src/components/direct-costs/CreateDirectCostForm.tsx`
- **API Route:** `frontend/src/app/api/projects/[projectId]/direct-costs/route.ts` (166 lines)
  - Sub-routes: [costId]/, bulk/, export/
- **Hook:** `frontend/src/hooks/use-direct-costs.ts` (386 lines)

## Form Hang Bug Analysis
The new page uses `CreateDirectCostForm` → `DirectCostForm` (mode="create").

`DirectCostForm.tsx` has 3 useEffects:

**useEffect #1 (lines 231-244):** Subscribes to form.watch() via callback — SAFE
- Sets `isDirty` and recomputes `grandTotal` when line_items change
- Properly unsubscribes: `return () => subscription.unsubscribe()`

**useEffect #2 (lines 247-279):** Loads dropdown options (vendors, employees, budgetCodes)
- Fetches from: `/api/projects/${projectId}/vendors`, `/api/projects/${projectId}/employees`, `/api/projects/${projectId}/budget-codes`
- **POTENTIAL HANG SOURCE:** If any of these API endpoints don't exist or return errors, `isLoadingOptions` stays `true`
- Starts with `setIsLoadingOptions(true)`, only clears in `finally` block — OK if APIs respond

**useEffect #3 (lines 285-294):** Auto-save (edit mode only)
- Only runs when `isDirty && mode === 'edit'` — safe for create mode

**Actual Hang Issue:**
The page.tsx.bak (backup) used `FormContainer` which doesn't exist in current `@/components/layout`.
The current page.tsx uses `PageContainer` which does exist. That specific issue is fixed.

**Root cause of potential hang:** The `budget-codes` API at `/api/projects/${projectId}/budget-codes/` was found to have `route.ts`. Need to verify it returns correctly. If it returns 404 or throws, the form still renders (try/catch exists) but might show loading spinner indefinitely if logic error.

## What Works
- List page with UnifiedTablePage — correct pattern
- Detail page ([costId]) with edit via Slideover using DirectCostForm
- Create flow: new/ → CreateDirectCostForm → DirectCostForm
- API route has GET, POST, [costId]/ sub-routes
- Delete with AlertDialog

## Issues Found

### Issue 1: Dependency APIs May Not Exist (HIGH)
- DirectCostForm fetches `/api/projects/${projectId}/vendors` — need to verify existence
- DirectCostForm fetches `/api/projects/${projectId}/employees` — need to verify existence
- DirectCostForm fetches `/api/projects/${projectId}/budget-codes` — exists (route.ts found)
- If vendors or employees API is missing, form loads but dropdowns are empty

### Issue 2: .bak file confusion (LOW)
- `new/page.tsx.bak` uses `FormContainer` from `@/components/layout` (deprecated/missing)
- Current `new/page.tsx` uses `PageContainer` — this is fixed
- The .bak is a leftover that can cause confusion

### Issue 3: DirectCostForm isLoadingOptions may hang (MEDIUM)
- If budget-codes/vendors/employees returns unexpected format, state may not clear properly

## Top 3 Issues
1. **Vendor/Employee API existence** — if missing, form dropdowns are broken (but form should still render)
2. **isLoadingOptions behavior** — needs verification that loading state clears properly
3. **.bak file** — cleanup needed

## Recommendation
**Medium priority.** The critical "form hang" bug appears to have been previously addressed (the .bak shows the old state). Current code looks structurally sound but needs live testing to confirm dropdowns load correctly.
