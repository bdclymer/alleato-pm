# Budget Feature — Implementation Tasks

**Source:** `AUDIT.md` — 2026-04-19  
**PRP:** `docs/PRPs/budget/prp-budget.md`  
**Status:** 15 done / 15 tasks ✅

> **Audit correction:** Export, Import, and Budget Details were previously listed as gaps — they are fully implemented. This TASKS.md reflects the actual remaining gaps.

---

## Progress Summary

| Phase | Tasks | Done | Status |
|-------|-------|------|--------|
| 0 — DB Migrations | 3 | 3 | ✅ Complete |
| 1 — Route Fixes | 3 | 3 | ✅ Complete |
| 2 — Financial Views | 3 | 3 | ✅ Complete |
| 3 — Modification Form | 2 | 2 | ✅ Complete |
| 4 — Snapshots | 2 | 2 | ✅ Complete |
| 5 — Polish | 2 | 2 | ✅ Complete |

---

## Phase 0 — Database Migrations (ALWAYS FIRST)

These columns must exist in the DB before any related UI or API code is written. Run `npm run db:types` after each migration and verify the column appears in `database.types.ts`.

- [x] **Task 0.1** — Add `modification_type` to `budget_mod_lines`
  - File: `supabase/migrations/20260419_000000_budget_mod_lines_modification_type.sql`
  - SQL: `ALTER TABLE public.budget_mod_lines ADD COLUMN IF NOT EXISTS modification_type TEXT CHECK (modification_type IN ('addition', 'deduction'));`
  - Validate: `npm run db:types && grep "modification_type" frontend/src/types/database.types.ts`
  - **Gate:** Do NOT write any Zod schema or route changes until this column exists

- [x] **Task 0.2** — Add `change_event_id` to `budget_mod_lines`
  - File: `supabase/migrations/20260419_000001_budget_mod_lines_change_event_id.sql`
  - SQL: `ALTER TABLE public.budget_mod_lines ADD COLUMN IF NOT EXISTS change_event_id UUID REFERENCES public.change_events(id) ON DELETE SET NULL;`
  - Validate: `grep "change_event_id" frontend/src/types/database.types.ts`

- [x] **Task 0.3** — Add `voided_reason` to `budget_modification_lines`
  - File: `supabase/migrations/20260419_000002_budget_modification_lines_voided_reason.sql`
  - SQL: `ALTER TABLE public.budget_modification_lines ADD COLUMN IF NOT EXISTS voided_reason TEXT;`
  - Validate: `grep "voided_reason" frontend/src/types/database.types.ts`
  - **Note:** This is `budget_modification_lines` (the OLDER table with `budget_line_id`), NOT `budget_mod_lines`

---

## Phase 1 — Route Fixes

- [x] **Task 1.1** — Persist `modification_type` in the modifications route
  - File: `frontend/src/app/api/projects/[projectId]/budget/modifications/route.ts`
  - **Problem:** POST handler parses `modificationType` from payload but does NOT include it in the DB insert object (lines 337-349 only insert `project_id`, `number`, `title`, `reason`, `status`, `effective_date`, `created_by`)
  - **Fix:** Add `modification_type: parsed.modificationType ?? null` to the insert object (after Task 0.1 migration + `npm run db:types`)
  - Also update PATCH handler to allow updating `modification_type` on draft modifications
  - Validate: `curl -X POST /api/projects/67/budget/modifications -d '{"title":"T","modification_type":"addition","amount":100}' | jq .modification_type` → should be `"addition"` not `null`

- [x] **Task 1.2** — Add `change_event_id` to POST/PATCH modifications route
  - File: `frontend/src/app/api/projects/[projectId]/budget/modifications/route.ts`
  - **Fix:** After Task 0.2, add `change_event_id` to Zod schema in `frontend/src/lib/schemas/budget.ts` and include it in the DB insert/update
  - Validate: `curl -X POST .../modifications -d '{"change_event_id":"<uuid>"}' | jq .change_event_id`

- [x] **Task 1.3** — Add `voided_reason` to void PATCH handler
  - File: `frontend/src/app/api/projects/[projectId]/budget/modifications/route.ts`
  - **Problem:** PATCH handler handles `action: "void"` but `updateData` at lines 504-511 does not write `voided_reason` to `budget_modification_lines`
  - **Fix:** After Task 0.3, accept `voided_reason` in the void PATCH payload; write it to `budget_modification_lines` for all lines in the modification
  - Validate: void a modification with reason → verify `voided_reason` column in DB contains the text

---

## Phase 2 — Financial Views UI

- [x] **Task 2.1** — Connect Financial Views selector in page.tsx
  - File: `frontend/src/app/(main)/[projectId]/budget/page.tsx`
  - **Problem:** `handleConfigureBudgetViews` at lines 559-562 fires `toast.info(...)` and never opens the modal
  - **Fix:** Replace toast with `setIsViewsModalOpen(true)` (add state if missing) and render `<BudgetViewsModal open={isViewsModalOpen} onClose={...} />`
  - This is the highest-ROI fix — the backend is fully working, it just needs the UI connected
  - Validate: click Views button → `BudgetViewsModal` opens (not a toast)

- [x] **Task 2.2** — Fix `BudgetViewsModal` to use `apiFetch`
  - File: `frontend/src/components/budget/BudgetViewsModal.tsx`
  - **Problem:** `handleSubmit` at line 212 uses raw `fetch()` — bypasses error handling, violates `apiFetch` gate
  - **Fix:** Import `apiFetch` from `@/lib/api-client` and replace the raw `fetch` call
  - Validate: `npm run lint` passes (ESLint `require-api-client` rule)

- [x] **Task 2.3** — Verify PATCH/DELETE for `/views/[viewId]` and `is_system` guard
  - File: `frontend/src/app/api/projects/[projectId]/budget/views/[viewId]/route.ts`
  - Read the PATCH handler — confirm it updates `budget_view_columns` visibility/order
  - Read the DELETE handler — confirm it returns `403` when `is_system = true`
  - If DELETE guard is missing: add `if (view.is_system) return NextResponse.json({ error: "BUDGET_SYSTEM_VIEW_READONLY" }, { status: 403 })`
  - Validate: `curl -X DELETE .../views/<system-view-id>` → 403

---

## Phase 3 — Modification Form Fields

- [x] **Task 3.1** — Fix `modification_type` values in modification modal
  - File: `frontend/src/components/budget/budget-modification-modal.tsx`
  - **Problem:** Line 217-232 shows `change_order / budget_transfer / adjustment / revision` — wrong values. Procore spec requires `addition` / `deduction` radio
  - **Fix:** Replace the `<Select>` with a radio group: "Addition" (value: `"addition"`) / "Deduction" (value: `"deduction"`). Make it required.
  - Update the form submission to send `modification_type: formData.modificationType`
  - Depends on Task 1.1 (route must save the value)
  - Validate: create modification with Addition selected → PATCH /modifications returns modification_type = "addition" in response

- [x] **Task 3.2** — Add `change_event_id` field and `voided_reason` prompt
  - File: `frontend/src/components/budget/budget-modification-modal.tsx`
  - **Add `change_event_id`:** Optional combobox, loads from `/api/projects/[projectId]/change-events`. Label: "Link to Change Event". Empty by default.
  - **Add `voided_reason`:** A separate confirmation dialog (not inside the modification modal). When user clicks "Void" action, show a `<Dialog>` with a required textarea before proceeding. Block void API call if textarea is empty.
  - Depends on Tasks 1.2 and 1.3
  - Validate: void a modification without reason → button disabled or error shown; with reason → void succeeds and reason is in DB

---

## Phase 4 — Snapshot Tab

- [x] **Task 4.1** — Remove 5-snapshot display cap
  - File: `frontend/src/components/budget/snapshots-tab.tsx`
  - **Problem:** Line 213: `snapshots.slice(0, 5).map(...)` — only first 5 shown
  - **Fix:** Remove `.slice(0, 5)`. If there are many snapshots, add pagination (page size 10) or a "Show more" button
  - Validate: project with >5 snapshots shows all of them

- [x] **Task 4.2** — Add arbitrary snapshot comparison selector
  - File: `frontend/src/components/budget/snapshots-tab.tsx`
  - **Problem:** Comparison iterates `snapshots.map((s, i) => compare(s, snapshots[i-1]))` — always sequential
  - **Fix:** Add two `<Select>` dropdowns (Snapshot A / Snapshot B) populated with all snapshot names. When both are selected, show a comparison table with delta columns. Store selections in URL query params `?snapshotA=uuid&snapshotB=uuid` for shareability.
  - Validate: select snapshot from month 1 and month 6 → comparison shows those two (not month 5 vs 6)

---

## Phase 5 — Low Priority Polish

- [x] **Task 5.1** — Red-text row highlighting for over-budget lines
  - File: `frontend/src/components/budget/budget-table.tsx`
  - **Fix:** In the `<tr>` element, add:
    ```tsx
    className={cn(
      "hover:bg-muted/50 transition-colors",
      !row.getIsGrouped() && row.original.projectedCosts > row.original.revisedBudget
        ? "text-destructive"
        : ""
    )}
    ```
  - Only apply to leaf rows (check `!row.getIsGrouped()`)
  - Validate: screenshot shows red text on over-budget rows; group/summary rows are unaffected

- [x] **Task 5.2** — Update Zod schemas for new fields
  - File: `frontend/src/lib/schemas/budget.ts`
  - Add `modification_type: z.enum(["addition","deduction"]).optional()` to `BudgetModificationPayloadSchema`
  - Add `change_event_id: z.string().uuid().optional().nullable()` to `BudgetModificationPayloadSchema`
  - Add `voided_reason: z.string().min(1).max(1000).optional()` to `BudgetModificationActionSchema`
  - This must happen in parallel with or just after Task 0.1-0.3 (before route changes)
  - Validate: `npx tsc --noEmit`

---

## Validation Checklist

Run these after all tasks complete:

```bash
# TypeScript
cd frontend && npx tsc --noEmit

# Lint (catches raw fetch(), design violations)
npm run lint

# Verify Financial Views opens modal (not toast)
curl -s http://localhost:3000/[projectId]/budget | grep -i "views"

# Verify modification_type saves to DB
curl -X POST http://localhost:3000/api/projects/67/budget/modifications \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","modification_type":"addition","amount":1000}' | jq .modification_type

# Verify snapshots cap removed
curl http://localhost:3000/api/projects/67/budget/snapshots | jq '.snapshots | length'
# Should be total count, not 5
```

---

## Session Log

| Date | Agent | Tasks Completed | Notes |
|------|-------|----------------|-------|
| 2026-04-19 | prp-audit | — | AUDIT.md + TASKS.md created; PRP corrections noted |
