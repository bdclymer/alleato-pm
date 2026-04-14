# Invoicing — Retainage on Subcontractor Invoices: Task List

**Generated:** 2026-04-14  
**Based on:** Verification report `05-retainage-verification-report.md`  
**Overall completion:** ~66%

---

## HIGH Priority

### Bug Fixes (fix first — data integrity)

- [ ] **[S] Fix retainage calculation bug in PATCH line-items route**  
  **File:** `frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/line-items/route.ts` line 134  
  **Change:** `((previous + thisPeriod) * workRetainagePct) / 100` → `(thisPeriod * workRetainagePct) / 100`  
  **Why:** "Work Retainage This Period" applies only to work billed this period, not cumulative. Applying to cumulative double-counts prior retainage and corrupts net_amount_this_period on all subsequent invoices.

- [ ] **[S] Fix same bug in invoice POST route (line item creation)**  
  **File:** `frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/route.ts` line 419  
  **Change:** Same as above — `(thisPeriod * retainagePct) / 100`  
  **Why:** Same calculation bug applies on initial invoice creation with line_items array.

- [ ] **[S] Fix raw fetch() in DetailTab.tsx (Gate 13 violation)**  
  **File:** `frontend/src/components/invoicing/subcontractor-detail-tabs/DetailTab.tsx` line ~260  
  **Change:** Replace `fetch(...)` with `apiFetch(...)` from `@/lib/api-client`  
  **Why:** Raw fetch loses structured error messages; apiFetch is required by CLAUDE.md Gate 13.

### Retainage Release Editing (core feature gap)

- [ ] **[M] Add retainage release inputs to DetailTab SOV table**  
  **Files:**
  - `frontend/src/components/invoicing/subcontractor-detail-tabs/DetailTab.tsx` — add editable inputs for `work_retainage_released` and `materials_retainage_released` in the "Released This Period" columns when in Edit mode  
  - `frontend/src/components/invoicing/subcontractor-detail-tabs/shared.ts` — add `work_retainage_released` and `materials_retainage_released` to the `LineItemEdits` type  
  **Procore behavior:** The "Released This Period" columns (`Work $` and `Materials $`) become editable inputs when in edit mode. User enters the amount to release; system reduces the "Currently Retained" total.

- [ ] **[M] Add retainage release fields to PATCH line-items API**  
  **File:** `frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/line-items/route.ts`  
  **Change:** Accept `work_retainage_released` and `materials_retainage_released` in the updates array. Validate: cannot release more than `previous_work_retainage + retainage_amount`.  
  **Audit:** Add `retainage_released` to the audit log fields.

- [ ] **[S] Validate max release amount (cannot release more than withheld)**  
  **File:** Same PATCH route  
  **Logic:** `released ≤ previous_work_retainage + retainage_amount` for work; same for materials. Return 400 with clear error message if over-release attempted.

---

## MEDIUM Priority

### Default Retainage Auto-Population

- [ ] **[M] Auto-populate retainage % on new invoice line items from commitment settings**  
  **File:** `frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/route.ts` (POST handler)  
  **Logic:** When creating a new invoice, fetch the commitment's `advanced_settings.default_retainage_percent`. If set and retainage is enabled, apply that % to all newly-created line items.  
  **Procore behavior:** "The default retainage % you configured on the commitment is pre-filled on invoice creation."

- [ ] **[M] Pre-populate retainage % when populating SOV from commitment**  
  **File:** `frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/populate-sov/route.ts` (if it exists) or wherever SOV items are copied from commitment SOV  
  **Logic:** Fetch commitment's `default_retainage_percent` and write it to each line item's `retainage_pct`.

### Retainage Release Invoice UI (complete the flow)

- [ ] **[M] Wire the retainage release invoice to a line-item entry UI**  
  **Context:** `InvoicesTab.tsx` already calls `createRetainageReleaseInvoice()` which creates the invoice record. The created invoice needs a way to fill in retainage_released values per line.  
  **Change:** After creating the retainage release invoice, navigate to the invoice detail page. In DetailTab, when `is_retainage_release === true`: hide work_completed_period and materials_stored inputs; show only the retainage_released inputs. Label the page "Release of Retainage Invoice."

### Retainage Visibility in List View

- [ ] **[S] Add "Total Retainage" column to subcontractor invoice list view**  
  **File:** `frontend/src/components/commitments/tabs/InvoicesTab.tsx`  
  **Context:** The manifest shows Procore's invoice list includes "Total Retainage" and "Total Earned Less Retainage" columns. Our list has `total_retainage` in the `CommitmentInvoiceRow` type but verify it's included in the table column defs.  
  **Check:** Confirm the API GET returns `total_retainage` per invoice and it's rendered in the table.

### Conditional Retainage Column Display

- [ ] **[M] Only show retainage columns in SOV when retainage is enabled on commitment**  
  **File:** `frontend/src/components/invoicing/subcontractor-detail-tabs/DetailTab.tsx`  
  **Logic:** Accept `commitmentSettings` prop. If `enable_completed_work_retainage === false`, hide work retainage columns. If `enable_stored_materials_retainage === false`, hide materials retainage columns.  
  **Procore behavior:** "Retainage columns only appear if retainage has been enabled on the commitment."

### Bidirectional % ↔ $ Entry

- [ ] **[M] Support entering retainage in dollars (auto-compute %)**  
  **Context:** Procore allows entering either the $ amount or the % and auto-computes the other.  
  **Files:** `DetailTab.tsx` — add a second input column for work retainage $ (editable); when changed, back-compute the % from scheduled_value. This is a UX enhancement.

---

## LOW Priority

- [ ] **[S] Label retainage release invoices visually in the InvoicesTab list**  
  `InvoicesTab.tsx` line 186 already checks `is_retainage_release` — verify it shows a distinct badge.

- [ ] **[S] Add regression test: retainage calculation never applies to cumulative**  
  **File:** `frontend/src/app/api/commitments/[commitmentId]/invoices/__tests__/route.test.ts`  
  **Test:** On a second invoice where previous period had $1000 billed at 10% (retainage $100), billing $500 this period at 10% should produce `retainage_amount = 50`, NOT `150`.

- [ ] **[S] Smoke test entry for retainage release endpoint**  
  **File:** `scripts/api-smoke-contracts.mjs`  
  **Add:** PATCH to line-items with `work_retainage_released` field.

---

## Execution Order

1. **Fix calculation bugs** (PATCH route + POST route) — affects data integrity, must go first
2. **Fix raw fetch** in DetailTab — quick, Gate 13 compliance
3. **Add retainage release inputs** to DetailTab + PATCH API — core feature
4. **Add validation** for max release amount
5. **Auto-populate default retainage %** on invoice creation
6. **Wire retainage release invoice UI** (navigate to detail, hide billing inputs)
7. **Add Total Retainage column** to list view
8. **Conditional column display** based on commitment settings
9. **Regression test** for calculation bug
10. Bidirectional % ↔ $ entry (nice-to-have)

---

## What Would Have Caught These Bugs Earlier

| Bug | Prevention |
|-----|-----------|
| Retainage applied to cumulative | Integration test asserting retainage_amount = thisPeriod * pct only |
| Raw fetch in component | ESLint `require-api-client` rule (should have caught this — check if it's running on this file) |
| Released columns not editable | E2E test for the full retainage release workflow |
| No default retainage auto-fill | Feature spec listing all invoice creation behaviors |
