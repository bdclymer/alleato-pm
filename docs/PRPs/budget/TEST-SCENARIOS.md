# Budget Feature — Test Scenarios

**Date:** 2026-04-20
**Source:** AUDIT.md + PRP + implementation review
**Status:** Generated for prp-validate

---

## Coverage Summary

| Category | Scenarios | Ready to Test | Blocked |
|----------|-----------|---------------|---------|
| Technical gates | 4 | 4 | 0 |
| Budget list view | 3 | 3 | 0 |
| Budget modifications | 5 | 5 | 0 |
| Financial views | 2 | 2 | 0 |
| Snapshots | 2 | 2 | 0 |
| Polish / UI | 1 | 1 | 0 |
| **Total** | **17** | **17** | **0** |

---

## S1 — Budget Page Loads (Ready to test)

**Precondition:** Project 67 has budget line items
**Action:** Navigate to `/67/budget`
**Expected:** Page loads with budget table, correct column headers, grand totals footer
**Pass criteria:** No JS errors, table visible, columns include Original Budget Amount / Revised Budget / Projected Costs

---

## S2 — Budget Table Columns Match Procore (Ready to test)

**Precondition:** Budget page loaded
**Action:** Inspect column headers in the table
**Expected:** Columns: Description, Original Budget Amount, Budget Modifications, Approved COs, Revised Budget, Projected Budget, Committed Costs, Direct Costs, Projected Costs, Forecast to Complete, EAC, Projected Over/Under
**Pass criteria:** All core Procore columns present

---

## S3 — Create Budget Modification (addition) — Saves modification_type (Ready to test)

**Precondition:** Budget page loaded, at least one line item exists
**Action:** Click "Add Modification" → fill Title, select "Addition", enter amount, fill Reason → submit
**Expected:** Modification created as draft, toast shows modification number
**DB validation SQL:**
```sql
SELECT id, title, status FROM public.budget_modifications
WHERE project_id = 67 ORDER BY created_at DESC LIMIT 1;

SELECT modification_type, change_event_id, amount FROM public.budget_mod_lines
WHERE budget_modification_id = '<mod_id_from_above>';
```
**Field classification:**
- title: input
- modification_type: input (must be "addition" or "deduction")
- amount: input
- reason: input
- status: server-generated (always "draft" on create)
- number: server-generated (BM-XXXX)
**Pass criteria:** `modification_type = 'addition'` in DB (not null)

---

## S4 — Create Budget Modification (deduction) (Ready to test)

**Precondition:** Budget page loaded
**Action:** Open modification form → select "Deduction" → fill required fields → submit
**Expected:** Modification created, `modification_type = 'deduction'` in DB
**Pass criteria:** modification_type persists correctly as "deduction"

---

## S5 — Modification Workflow: draft → pending → approved (Ready to test)

**Precondition:** A draft modification exists
**Action:** In BudgetModificationsModal, click Submit → Approve
**Expected:** Status transitions draft → pending → approved; budget totals update after approval
**Pass criteria:** Status badge updates at each step; `refresh_budget_rollup` fires on approve

---

## S6 — Void Modification with Reason Required (Ready to test)

**Precondition:** An approved modification exists
**Action:** Click Void → dialog appears → attempt submit without reason (button disabled) → enter reason → confirm void
**Expected:** Void button disabled when reason empty; void succeeds with reason; reason saved to DB
**DB validation SQL:**
```sql
SELECT voided_reason FROM public.budget_modification_lines
WHERE budget_modification_id = '<mod_id>';
```
**Pass criteria:** `voided_reason` is not null/empty in DB after void

---

## S7 — Void Requires Reason (negative path) (Ready to test)

**Precondition:** Approved modification exists
**Action:** Click Void → leave reason textarea empty
**Expected:** "Void Modification" button is disabled (not just showing an error after click)
**Pass criteria:** Button `disabled` attribute is present when textarea empty

---

## S8 — Financial Views Modal Opens (not toast) (Ready to test)

**Precondition:** Budget page loaded
**Action:** Find "Financial Views" / "Configure Views" button and click it
**Expected:** `BudgetViewsModal` opens as a sidebar/overlay — NOT a toast notification
**Pass criteria:** Modal visible, no toast fires

---

## S9 — Financial Views Modal Creates View (Ready to test)

**Precondition:** BudgetViewsModal open
**Action:** Fill view name, toggle column visibility, click Save
**Expected:** View saved, success toast, modal closes
**DB validation SQL:**
```sql
SELECT id, name FROM public.budget_views WHERE project_id = 67 ORDER BY created_at DESC LIMIT 1;
```
**Pass criteria:** View record exists in DB

---

## S10 — Snapshots Display All (no 5-cap) (Ready to test)

**Precondition:** Project has > 5 snapshots (or test with whatever exists)
**Action:** Navigate to Snapshots tab
**Expected:** All snapshots displayed (not capped at 5)
**Pass criteria:** Count of visible snapshot cards matches total count from API

---

## S11 — Snapshot Arbitrary Comparison (Ready to test)

**Precondition:** At least 2 snapshots exist
**Action:** Navigate to Snapshots tab → select Snapshot A and Snapshot B from dropdowns
**Expected:** Comparison table shows delta rows for Budget, Costs, Variance
**Pass criteria:** Selecting non-sequential snapshots shows comparison (not just sequential)

---

## S12 — Over-Budget Row Red Text (Ready to test)

**Precondition:** At least one budget line where projectedCosts > revisedBudget
**Action:** View budget table
**Expected:** That row's text is red (`text-destructive`)
**Pass criteria:** Row className includes `text-destructive`; group/summary rows are unaffected

---

## S13 — Budget Page Tabs Load (Ready to test)

**Precondition:** Budget page loaded
**Action:** Click each tab: Budget, Budget Details, Cost Codes, Forecasting, Snapshots, Change History
**Expected:** Each tab loads without error
**Pass criteria:** No JS errors, content renders for each tab

---

## S14 — TypeScript Clean (Ready to test)

**Action:** `npx tsc --noEmit`
**Expected:** Zero budget-related TypeScript errors
**Pass criteria:** No errors in budget/* files

---

## S15 — No Raw fetch() in Budget Components (Ready to test)

**Action:** `grep -r "await fetch(" src/components/budget/ src/app/\(main\)/\[projectId\]/budget/`
**Expected:** No raw `fetch()` calls in budget UI code (API routes are exempt)
**Pass criteria:** Zero matches

---

## S16 — Zod Schema Enforces modification_type Enum (Ready to test)

**Action:** POST `/api/projects/67/budget/modifications` with `modification_type: "change_order"`
**Expected:** 400 validation error (not accepted)
**Pass criteria:** API rejects values outside `["addition","deduction"]`

---

## S17 — Budget Lock/Unlock (Ready to test)

**Precondition:** Budget is unlocked
**Action:** Lock budget → verify locked state → unlock
**Expected:** Lock/unlock toggle works; locked budget prevents line item edits
**Pass criteria:** Lock state persists and enforced

---

## Blocked Scenarios

None — all 17 scenarios are ready to test.
