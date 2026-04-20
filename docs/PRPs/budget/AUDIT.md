# Budget Audit Report

**Date:** 2026-04-19  
**PRP:** `docs/PRPs/budget/prp-budget.md`  
**Auditor:** prp-audit (codebase analysis pass)

---

## Summary

| Category | Count |
|----------|-------|
| ✅ Fully implemented | 31 items |
| 🟡 Partially implemented | 7 items |
| 🔴 Not implemented | 4 items |
| ⚠️ Schema gaps | 3 columns |
| 📋 PRP corrections | 4 items (PRP was wrong — these ARE done) |

**Overall:** ~88% complete (higher than the 80% the PRP estimated)

---

## PRP Corrections — Items Marked as Gaps That Are Actually Done

> The PRP was written from the gap-analysis-report.md (March 2025) and missed implementations added since then. These are NOT gaps.

| PRP Listed As Gap | Actual Status | Evidence |
|-------------------|---------------|---------|
| Export (Excel/CSV) | ✅ DONE | `export/route.ts` uses `xlsx` library, real 2-sheet workbook; `page.tsx` calls `apiFetchBlob` with download trigger |
| Import from Excel | ✅ DONE | `import/route.ts` parses xlsx/csv, validates, auto-creates cost codes, partial-success reporting |
| Budget Details tab | ✅ DONE | Tab exists in `budget-tabs.tsx`, `details/route.ts` assembles 9 data sources, `page.tsx:463` calls `fetchBudgetDetails()` |
| Forecasting tab 10-item cap | ✅ NOT A CAP | `forecasting-tab.tsx` renders `items.map(...)` with no `.slice()` — all cost codes shown |

---

## Database Schema

### Tables Present

| Table | Status | Notes |
|-------|--------|-------|
| `budget_lines` | ✅ | All core columns present |
| `budget_modifications` | ✅ | All core columns present |
| `budget_mod_lines` | ⚠️ | Missing `modification_type`, `change_event_id` |
| `budget_modification_lines` | ⚠️ | Missing `voided_reason` |
| `budget_views` | ✅ | Complete |
| `budget_view_columns` | ✅ | Complete |
| `budget_line_forecasts` | ✅ | Complete |
| `forecasting_curves` | ✅ | Complete |

### Schema Gaps (require migrations before any related UI work)

| Missing Column | Table | Type | Required By |
|----------------|-------|------|-------------|
| `modification_type` | `budget_mod_lines` | `TEXT CHECK IN ('addition','deduction')` | Modification form, Procore parity |
| `change_event_id` | `budget_mod_lines` | `UUID FK → change_events.id` | Modification form, audit trail |
| `voided_reason` | `budget_modification_lines` | `TEXT` | Void workflow |

**Note:** `vendor_id` and `wbs_attributes` are LOW priority and intentionally deferred per PRP.

### FK Type Verification (confirmed correct)

| Column | Type | Correct? |
|--------|------|----------|
| `budget_lines.project_id` | `number` (INTEGER) | ✅ |
| `budget_lines.id` | `string` (UUID) | ✅ |
| `budget_modifications.id` | `string` (UUID) | ✅ |
| `budget_mod_lines.budget_modification_id` | `string` (UUID FK) | ✅ |
| `budget_views.project_id` | `number` (INTEGER) | ✅ |

---

## List View — Main Budget Table

| Requirement | Status | Notes |
|-------------|--------|-------|
| Column: Original Budget | ✅ | `originalBudgetAmount` |
| Column: Budget Modifications | ✅ | `budgetModifications` |
| Column: Approved Change Orders | ✅ | `approvedCOs` |
| Column: Revised Budget | ✅ | `revisedBudget` (calculated) |
| Column: Job to Date Cost | ✅ | `jobToDateCostDetail` |
| Column: Direct Costs | ✅ | `directCosts` |
| Column: Pending Budget Changes | ✅ | `pendingChanges` |
| Column: Projected Budget | ✅ | `projectedBudget` |
| Column: Committed Costs | ✅ | `committedCosts` |
| Column: Pending Cost Changes | ✅ | `pendingCostChanges` |
| Column: Projected Costs | ✅ | `projectedCosts` |
| Column: Forecast to Complete | ✅ | `forecastToComplete` |
| Column: EAC | ✅ | `estimatedCostAtCompletion` |
| Column: Projected Over/Under | ✅ | `projectedOverUnder` |
| Row: Grand Totals footer | ✅ | Sticky footer table |
| Row: Hierarchical grouping | ✅ | TanStack `getExpandedRowModel()` |
| Row: Over-budget red-text | 🔴 | No row-level className comparing projectedCosts > revisedBudget |
| Tab: Budget (main) | ✅ | Default tab |
| Tab: Budget Details | ✅ | `?tab=budget-details` wired and functional |
| Tab: Cost Codes | ✅ | Project cost code management |
| Tab: Forecasting | ✅ | All cost codes shown, no cap |
| Tab: Snapshots | 🟡 | Works but capped at 5; only sequential comparison |
| Tab: Change History | ✅ | Audit trail implemented |
| Tab: Settings | ✅ | Budget settings panel |

---

## Toolbar Actions

| Action | Status | Notes |
|--------|--------|-------|
| Create line item | ✅ | Via `BudgetLineItemCreatorModal` |
| Lock budget | ✅ | `lock/route.ts` POST |
| Unlock budget | ✅ | `lock/route.ts` DELETE, blocked when non-void mods exist |
| Export to Excel (.xlsx) | ✅ | Real `xlsx` generation, 2-sheet workbook |
| Export to CSV | ✅ | Real CSV via same export route |
| Import from Excel/CSV | ✅ | Real multipart parse, auto cost code creation |
| Financial Views selector | 🟡 | API + DB work; page.tsx fires toast instead of opening modal |
| ERP integration | 🔴 | Intentional stub — `toast.info("ERP integration coming soon")` |
| Variance analysis | 🔴 | Stub — `toast.info("Variance analysis coming soon")` |
| Snapshot export | 🔴 | `toast.info("Export functionality coming soon")` on snapshot cards |

---

## Budget Line Item Form Fields

| Field | Status | Notes |
|-------|--------|-------|
| Cost Code (combobox) | ✅ | `BudgetCodeSelector` component |
| Quantity | ✅ | Number input |
| Unit of Measure | ✅ | `UomSelect` component |
| Unit Cost | ✅ | Currency input |
| Original Amount | ✅ | Calculated or direct input |
| Description | ✅ | Textarea |
| Sub-job picker | 🟡 | `sub_job_id` column in DB; no confirmed UI picker on form |
| Vendor | 🔴 | No `vendor_id` column in DB; form field missing |
| WBS Attributes | 🔴 | No `wbs_attributes` column in DB; intentionally deferred |

---

## Budget Modification Form

| Field | Status | Notes |
|-------|--------|-------|
| Title | ✅ | Text input |
| Status | ✅ | Dropdown (draft/pending/approved/void) |
| Effective Date | ✅ | Date picker |
| Cost Code Lines (repeating) | ✅ | `budget_mod_lines` rows |
| Modification Type | 🟡 | Field EXISTS but wrong values: `change_order/budget_transfer/adjustment/revision` instead of Procore's `addition/deduction` radio |
| Change Event link | 🔴 | No field; no DB column |
| Void Reason | 🔴 | No field; no DB column in `budget_modification_lines` |

---

## Budget Modifications Table

| Requirement | Status | Notes |
|-------------|--------|-------|
| # (Number) | ✅ | `number` column |
| Status (badge) | ✅ | `StatusBadge` component |
| Title | ✅ | `title` column |
| Cost Codes | ✅ | Summary of cost codes |
| Amount | ✅ | Total amount |
| Created | ✅ | `created_at` |
| Effective Date | ✅ | `effective_date` |
| Modification Type | 🟡 | DB column missing; UI has wrong values |
| Change Event # | 🔴 | Missing entirely |

---

## Snapshot Tab

| Requirement | Status | Notes |
|-------------|--------|-------|
| Create snapshot | ✅ | `snapshots/route.ts` POST |
| List snapshots | ✅ | `snapshots/route.ts` GET |
| Display all snapshots | 🟡 | Capped at 5: `snapshots.slice(0, 5)` in `snapshots-tab.tsx:213` |
| Sequential comparison | ✅ | Compares each snapshot to previous |
| Arbitrary comparison selector | 🔴 | Not implemented; no two-snapshot selector UI |
| Snapshot export | 🔴 | Toast stub on each snapshot card |

---

## Forecasting Tab

| Requirement | Status | Notes |
|-------------|--------|-------|
| 4 FTC methods (manual/automatic/lump_sum/monitored_resources) | ✅ | All implemented |
| All cost codes displayed | ✅ | No display cap |
| Forecast curve support | ✅ | `forecasting_curves` table + `budget_line_forecasts` |
| S-curve visualization chart | 🔴 | `curve_id` in DB; no chart rendered |
| Forecasting tab export | 🔴 | Toast stub |

---

## Workflows & Business Rules

| Requirement | Status | Notes |
|-------------|--------|-------|
| Status: draft | ✅ | |
| Status: pending | ✅ | |
| Status: approved | ✅ | |
| Status: void | ✅ | |
| Transition: draft → pending (submit) | ✅ | |
| Transition: pending → approved | ✅ | Calls `refresh_budget_rollup` RPC |
| Transition: pending → draft (reject) | ✅ | |
| Transition: approved/pending → void | 🟡 | Works but no `voided_reason` captured or stored |
| Rule: delete blocked when original_amount > 0 | ✅ | Enforced at API |
| Rule: delete blocked when budget locked | ✅ | Enforced at API |
| Rule: delete blocked when mods reference line | ✅ | Enforced at API |
| Rule: unlock blocked when non-void mods exist | ✅ | Enforced at API |
| Rule: approved modification cannot be edited | ✅ | Enforced at API |
| Rule: billing completion ≤ 100% | ⚠️ | Outside budget scope (invoicing domain) |
| Budget lock/unlock | ✅ | |
| refresh_budget_rollup RPC on approve | ✅ | Called in PATCH modifications route |

---

## Financial Views

| Requirement | Status | Notes |
|-------------|--------|-------|
| `budget_views` table | ✅ | Exists with correct schema |
| `budget_view_columns` table | ✅ | Exists with correct schema |
| GET /budget/views | ✅ | Returns views + columns |
| POST /budget/views | ✅ | Creates view + columns |
| PATCH /budget/views/[viewId] | 🟡 | Route file exists; not verified end-to-end |
| DELETE /budget/views/[viewId] | 🟡 | Route file exists; `is_system=true` guard not confirmed |
| BudgetViewsModal save/load | 🟡 | Real API calls but uses raw `fetch()` instead of `apiFetch` |
| Financial Views selector in page.tsx | 🔴 | `handleConfigureBudgetViews` fires `toast.info()` — never opens the modal |

---

## Code Quality Issues (not functional gaps but must fix)

| Issue | File | Severity |
|-------|------|----------|
| `BudgetViewsModal` uses raw `fetch()` | `BudgetViewsModal.tsx:212` | Medium — bypasses `apiFetch` error handling |
| Financial Views selector is a toast stub | `page.tsx:559-562` | High — feature is unreachable from UI |
| Snapshot export buttons are toast stubs | `snapshots-tab.tsx:187,251` | Medium |
| Forecasting tab export button is toast stub | `forecasting-tab.tsx:231` | Medium |
| `modification_type` values don't match Procore spec | `budget-modification-modal.tsx:217-232` | High — wrong enum values sent to DB |
| `modification_type` parsed but NOT saved to DB | `modifications/route.ts` | High — data loss bug |

---

## Known Guardrails (from Incident Log)

These apply to all remaining implementation work:

1. **RLS policy pattern:** New columns don't need new policies, but any new table must follow `budget_lines` RLS (project membership check, not just `auth.uid()`).
2. **DB types gate:** Run `npm run db:types` after every migration. Grep for new column names before writing code.
3. **Status casing:** `budget_modifications.status` must be lowercase. The CHECK constraint silently rejects uppercase.
4. **apiFetch gate:** `BudgetViewsModal` currently uses raw `fetch()` — when modifying this file, fix the API calls to use `apiFetch`.
5. **Route param naming:** New routes must use `[viewId]`, `[snapshotId]`, `[modificationId]` — never `[id]`.
6. **refresh_budget_rollup:** Must be called on any modification approval. Already present but verify it's not removed during edits.
7. **Test suite:** Budget Playwright tests were disabled with `test.skip(true)` in a past incident. Verify before any claim of completion.

---

## Implementation Priority (ordered by impact)

### 🔴 Critical — Functional Gaps

1. **Connect Financial Views selector to modal** — `page.tsx:559-562` fires toast; should open `BudgetViewsModal`. One-line fix with high UX impact. Zero backend work needed.
2. **Fix modification_type values** — UI has `change_order/budget_transfer/adjustment/revision`; Procore spec requires `addition/deduction`. Misaligns with the DB column we'll add.
3. **DB migration: `budget_mod_lines.modification_type`** — Required before saving modification type from any form.
4. **DB migration: `budget_mod_lines.change_event_id`** — Required for change event linkage.
5. **DB migration: `budget_modification_lines.voided_reason`** — Required for void workflow.
6. **Persist modification_type in PATCH/POST route** — `modifications/route.ts` parses it but doesn't include it in the DB insert.
7. **Add change_event_id to modification form and route** — Currently missing from both.
8. **Add voided_reason to void workflow** — Form must prompt; route must save to DB.

### 🟡 Medium — Partial Gaps

9. **Snapshot display cap** — Remove `snapshots.slice(0, 5)` in `snapshots-tab.tsx:213`.
10. **Snapshot arbitrary comparison** — Add two-snapshot selectors instead of sequential-only.
11. **Fix BudgetViewsModal to use apiFetch** — `BudgetViewsModal.tsx:212` uses raw `fetch`.
12. **Verify PATCH/DELETE /views/[viewId]** — Confirm end-to-end flow works.
13. **Confirm `is_system=true` guard in DELETE /views/[viewId]** — Prevent system view deletion.

### 🔴 Low / Future

14. **Red-text over-budget row highlighting** — `budget-table.tsx` needs row className logic.
15. **Snapshot export** — Real export for individual snapshots.
16. **Forecasting tab export** — Real export for forecasting data.
17. **S-curve visualization chart** — `curve_id` DB data exists; no chart component.
18. **Sub-job picker on line item form** — `sub_job_id` column exists; no UI picker.
19. **Vendor field on line items** — Deferred; needs DB migration first.
