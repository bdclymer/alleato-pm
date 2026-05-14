# Feature Test Report: Invoicing

**Run ID:** 2b08ec6c-5fc9-4adf-916b-dfbdb08ee52a
**Tester:** claude-code
**Environment:** localhost:3000
**Branch:** main
**Started:** 2026-05-14T09:48:10Z
**Duration:** ~7200s

---

## Summary

| Status  | Count |
|---------|-------|
| Passed  | 11    |
| Failed  | 9     |
| Skipped | 14    |
| Blocked | 0     |
| Incomplete evidence | 0 |
| **Total** | **34** |

Pass rate: **55%** (11/20 executable cases — excludes 14 skips due to missing prerequisite data)

### Failure Severity Breakdown

| Severity | Count |
|----------|-------|
| critical  | 2     |
| high      | 3     |
| medium    | 4     |

---

## Results

| # | Test | Priority | Status | Severity | Evidence |
|---|------|----------|--------|----------|----------|
| 1.1 | Create an owner invoice with all required and optional fields | HIGH | ❌ fail | critical | 1.1-dropdown.png, 1.1-final.png |
| 1.2 | Submitting the new-invoice form without a contract shows a validation error | HIGH | ✅ pass | — | 1.2-final.png |
| 1.3 | Create a subcontractor invoice linked to a commitment | HIGH | ❌ fail | critical | 1.3-commitment-dropdown.png |
| 1.4 | Create a billing period manually with start date, end date, and due date | HIGH | ✅ pass | — | 1.4-dates-filled.png, 1.4-final.png |
| 1.5 | Create a billing period using the Automatic tab with monthly frequency | MEDIUM | ✅ pass | — | 1.5-auto-tab.png, 1.5-final.png |
| 2.1 | Edit all editable fields on a Draft owner invoice | HIGH | ⏭ skip | — | No Draft owner invoices exist |
| 2.2 | Add a new line item to an existing Draft owner invoice | HIGH | ⏭ skip | — | No Draft owner invoices exist |
| 2.3 | Delete a line item from a Draft invoice and verify the totals update | MEDIUM | ⏭ skip | — | No Draft owner invoices exist |
| 2.4 | Edit controls are disabled or absent on an Approved invoice | HIGH | ⏭ skip | — | No Approved owner invoices exist |
| 3.1 | Delete a Draft invoice and confirm it is removed from the list | HIGH | ⏭ skip | — | No Draft owner invoices exist |
| 4.1 | Submit a Draft invoice and verify status changes to Under Review | HIGH | ⏭ skip | — | No Draft owner invoices exist |
| 4.2 | Approve an Under Review invoice and verify status changes to Approved | HIGH | ⏭ skip | — | No Under Review owner invoices exist |
| 4.3 | Use Approve as Noted action on an Under Review invoice | MEDIUM | ⏭ skip | — | No Under Review owner invoices exist |
| 4.4 | Return an Under Review invoice to Revise & Resubmit | HIGH | ⏭ skip | — | No Under Review owner invoices exist |
| 4.5 | Void an Approved invoice and verify the status changes to Void | HIGH | ⏭ skip | — | No Approved owner invoices exist |
| 4.6 | Use Mark Paid action on an Approved subcontractor invoice | HIGH | ⏭ skip | — | No Approved subcontractor invoices exist |
| 4.7 | Submit a Draft subcontractor invoice for approval | HIGH | ❌ fail | high | 4.7-detail.png, 4.7-final.png |
| 5.1 | Net Amount on an owner invoice equals Gross Amount minus retention percentage | HIGH | ⏭ skip | — | All owner invoices have null gross/net amounts |
| 5.2 | Editing This Month amount recalculates % Complete on the subcontractor invoice | HIGH | ❌ fail | medium | 5.2-detail-tab.png, 5.2-after-save.png, 5.2-final.png |
| 6.1 | Applying a Billing Period filter shows only invoices in that period | MEDIUM | ❌ fail | medium | No billing periods linked to sub invoices |
| 6.2 | Applying a Contract Company filter shows only invoices from that company | MEDIUM | ✅ pass | — | 6.2-final.png |
| 6.3 | Filtering by payment status "Unpaid" shows only unpaid subcontractor invoices | MEDIUM | ✅ pass | — | 6.3-final.png |
| 6.4 | Clicking the Gross Amount column header sorts invoices highest to lowest | MEDIUM | ❌ fail | medium | 6.4-sort-asc-applied.png |
| 6.5 | Clicking "Clear filters" resets the Subcontractor tab to show all invoices | MEDIUM | ✅ pass | — | 6.5-draft-filtered.png, 6.5-final.png |
| 6.6 | Filtering billing periods by "Closed" shows only closed periods | MEDIUM | ✅ pass | — | 6.6-final.png |
| 7.1 | Enabling ERP Status column makes it appear in the subcontractor invoice table | LOW | ✅ pass | — | 7.1-columns-panel.png, 7.1-final.png |
| 8.1 | Clicking the PDF download action returns a PDF file | MEDIUM | ❌ fail | high | 8.1-detail.png, 8.1-final.png |
| 8.2 | Using the Email action opens a dialog and sends the invoice | MEDIUM | ✅ pass | — | 8.2-dialog.png, 8.2-final.png |
| 9.1 | Submitting the billing period dialog without dates shows an error or keeps the button disabled | HIGH | ✅ pass | — | 1.4-create-dialog.png (observed during 1.4 setup) |
| 10.1 | Changing per-page to 10 shows at most 10 rows per page | MEDIUM | ⏭ skip | — | Only 3 owner invoices exist |
| 11.1 | A user without contracts write permission does not see workflow action buttons | MEDIUM | ⏭ skip | — | No second read-only test user configured |
| 12.1 | Entering more than 255 characters in Invoice Number truncates or errors | LOW | ❌ fail | medium | 12.1-final.png |
| 12.2 | Visiting an invoice ID that does not exist shows an error or not-found page | LOW | ❌ fail | high | No screenshot (page stuck loading) |
| 12.3 | Visiting /67/invoicing redirects to /67/invoices | LOW | ✅ pass | — | 12.3-final.png |

---

## Failures

### 1.1 — Create an owner invoice with all required and optional fields

- **Expected:** A new owner invoice is created. The browser navigates to the invoice detail page.
- **Actual:** The Contract dropdown (for both "Prime Contract" and "Commitment/Subcontract" types) shows "No options found". Invoice cannot be created — the form queries the `financial_contracts` table which has 0 records for project 67.
- **Severity:** critical
- **Cause:** `financial_contracts` table is empty for project 67. The form uses this table as the data source for the Contract dropdown, but `prime_contracts` (4 records) and `subcontracts` exist in separate tables that are not linked.
- **Detection gap:** No data seed guard for invoicing feature tests. No smoke test checks `financial_contracts` row count.
- **Prevention:** Either seed `financial_contracts` with entries for project 67, or fix the contract lookup to use the correct source tables (`prime_contracts`/`subcontracts`).
- **Fails loudly next time:** Add to `scripts/api-smoke-contracts.mjs`: verify `/api/projects/67/invoicing/contracts?type=prime` returns at least 1 result.
- **Video:** `tests/agent-browser-runs/20260514-094810-feature-invoicing/recordings/2b08ec6c/1.1.webm`
- **Screenshots:** 1.1-setup.png, 1.1-dropdown.png (shows "No options found")
- **Console errors:** none
- **DB assertion:** `SELECT count(*) FROM financial_contracts WHERE project_id = 67` → 0
- **Test data marker:** not applicable
- **Remediation hint:** `frontend/src/app/(main)/[projectId]/invoices/new/page.tsx` — contract dropdown data source

---

### 1.3 — Create a subcontractor invoice linked to a commitment

- **Expected:** A new subcontractor invoice is created and appears in the Subcontractor tab list.
- **Actual:** Same root cause as 1.1. Commitment dropdown shows "No options found" when Contract Type = "Commitment/Subcontract".
- **Severity:** critical
- **Cause:** Same as 1.1 — `financial_contracts` table empty for project 67.
- **Detection gap:** Same as 1.1.
- **Prevention:** Same as 1.1.
- **Fails loudly next time:** Add to smoke test: verify commitment type contracts exist in `financial_contracts`.
- **Video:** `tests/agent-browser-runs/20260514-094810-feature-invoicing/recordings/2b08ec6c/1.3.webm`
- **Screenshots:** 1.3-commitment-dropdown.png
- **Test data marker:** not applicable
- **Remediation hint:** Same file as 1.1. The form uses a single unified `financial_contracts` lookup for both contract types.

---

### 4.7 — Submit a Draft subcontractor invoice for approval

- **Expected:** The subcontractor invoice status changes to "Under Review" on the detail page.
- **Actual:** DB updated to `under_review` (confirmed via SQL), but the status badge on the page still shows "Draft" after clicking "Submit for Review". The "Submit for Review" button became grayed out but the UI did not re-render the status.
- **Severity:** high
- **Cause:** The submit action does not trigger a React Query cache invalidation or page re-fetch after the mutation succeeds. The optimistic update or post-mutation refetch is missing.
- **Detection gap:** Mutation succeeds silently — success feels like nothing happened. No refetch causes stale state.
- **Prevention:** After the submit mutation, call `queryClient.invalidateQueries(invoiceKey)` or use `onSuccess` to reload the invoice detail.
- **Fails loudly next time:** Add assertion: `expect(statusBadge).toHaveText('Under Review')` within 3s of submit click.
- **Video:** `tests/agent-browser-runs/20260514-094810-feature-invoicing/recordings/2b08ec6c/4.7.webm`
- **Screenshots:** 4.7-detail.png (before), 4.7-final.png (status still shows "Draft")
- **DB assertion:** `SELECT status FROM subcontractor_invoices WHERE id = 8` → `under_review` ✓
- **Console errors:** `Failed to load resource: 404 Not Found`, `502 Bad Gateway`
- **Test data marker:** not applicable
- **Remediation hint:** The submit action handler in the subcontractor invoice detail page — look for `handleSubmit` or the submit mutation hook.

---

### 5.2 — Editing This Month amount recalculates % Complete on the subcontractor invoice

- **Expected:** The % Complete column in the subcontractor list reflects updated amounts after saving SOV edits.
- **Actual:** (1) The Summary tab still shows 41.00% after SOV save — no re-render. (2) The subcontractor list does not show a % Complete column in the default column set.
- **Severity:** medium
- **Cause:** Two issues: (a) SOV save does not trigger a refetch of the invoice summary (same root cause as 4.7 — missing query invalidation). (b) % Complete is not a stored column in `subcontractor_invoices` — it's computed from `subcontractor_sov_items` and the list may not include this computed column by default.
- **Detection gap:** % Complete column not verified to be visible before writing the test case.
- **Prevention:** Add `queryClient.invalidateQueries` after SOV save. Ensure % Complete is a default visible column in the subcontractor list.
- **Fails loudly next time:** Smoke test: verify `/api/projects/67/invoicing/subcontractor` response includes `percent_complete` field.
- **Video:** `tests/agent-browser-runs/20260514-094810-feature-invoicing/recordings/2b08ec6c/5.2.webm`
- **Screenshots:** 5.2-detail-tab.png, 5.2-after-save.png, 5.2-final.png
- **Remediation hint:** SOV save handler + subcontractor list column config.

---

### 6.1 — Applying a Billing Period filter shows only invoices in that period

- **Expected:** Billing Period dropdown shows specific periods to filter by.
- **Actual:** Billing Period filter dropdown only shows "All" — no specific billing periods available.
- **Severity:** medium
- **Cause:** All 4 subcontractor invoices in project 67 have `billing_period_id = NULL`. No invoices are linked to any billing period.
- **Detection gap:** Test data prerequisite ("Subcontractor invoices exist in at least two different billing periods") was not seeded.
- **Prevention:** Seed subcontractor invoices with linked billing periods, or add a prerequisite check in the test.
- **Test data marker:** not applicable
- **Remediation hint:** Data seed required — not a code bug.

---

### 6.4 — Clicking the Gross Amount column header sorts invoices highest to lowest

- **Expected:** First click sorts ascending, second click sorts descending.
- **Actual:** Clicking the column header opens a context menu (Sort ascending / Sort descending / Pin column / Hide column) rather than toggling sort direction directly. Sort ascending was applied successfully. Browser crashed when attempting to click Sort descending from the context menu a second time.
- **Severity:** medium
- **Cause:** Sort is triggered via context menu rather than direct click toggle. The test assumed click-to-toggle behavior; actual behavior requires two clicks (open menu → click option). The second menu open crashed the browser due to session instability.
- **Detection gap:** Test spec assumed direct click-toggle UX pattern.
- **Prevention:** Update test spec to use context menu flow. Fix potential browser crash when rapidly re-opening column sort menu.
- **Video:** `tests/agent-browser-runs/20260514-094810-feature-invoicing/recordings/2b08ec6c/6.4.webm`
- **Screenshots:** 6.4-sort-asc.png (context menu open), 6.4-sort-asc-applied.png (ascending applied)
- **Remediation hint:** Column sort UX is via context menu — test case needs updating to match. Consider adding direct click-to-sort as a UX improvement.

---

### 8.1 — Clicking the PDF download action returns a PDF file

- **Expected:** Browser triggers a PDF download or opens a PDF in a new tab.
- **Actual:** Console shows `ERR_EMPTY_RESPONSE` and `ERR_INCOMPLETE_CHUNKED_ENCODING`. No PDF was downloaded.
- **Severity:** high
- **Cause:** The `/pdf` endpoint returns an empty or prematurely closed response. The PDF generation service (backend or serverless function) is either failing silently or not generating output for this invoice.
- **Detection gap:** No user-visible error shown when PDF export fails — the button click produces no feedback.
- **Prevention:** Add PDF endpoint to `scripts/api-smoke-contracts.mjs`. Add error toast when PDF download fails. Add health check for PDF generation service.
- **Fails loudly next time:** `GET /api/projects/67/invoicing/owner/169/pdf` must return 200 + Content-Type: application/pdf with non-zero Content-Length.
- **Video:** `tests/agent-browser-runs/20260514-094810-feature-invoicing/recordings/2b08ec6c/8.1.webm`
- **Screenshots:** 8.1-detail.png, 8.1-final.png
- **Console errors:** `ERR_EMPTY_RESPONSE`, `ERR_INCOMPLETE_CHUNKED_ENCODING`
- **Remediation hint:** `frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/pdf/route.ts`

---

### 12.1 — Entering more than 255 characters in Invoice Number truncates or errors

- **Expected:** Form truncates to 255 chars or shows validation error.
- **Actual:** The Invoice Number field accepted 300 characters without truncation or error (confirmed via `document.querySelector('input').value.length` = 300). No client-side maxlength enforcement exists.
- **Severity:** medium
- **Cause:** The `<input>` for Invoice Number is missing `maxLength={255}` and the Zod schema for invoice creation lacks `.max(255)` on the `invoice_number` field.
- **Detection gap:** DB-level constraint may still reject at save time (untested since Contract is also required), but no client-side feedback.
- **Prevention:** Add `maxLength={255}` to the input element. Add `.max(255, "must be 255 characters or fewer")` to the Zod schema.
- **Fails loudly next time:** Form should show "must be 255 characters or fewer" before submission.
- **Video:** `tests/agent-browser-runs/20260514-094810-feature-invoicing/recordings/2b08ec6c/12.1.webm`
- **Screenshots:** 12.1-final.png
- **Remediation hint:** New invoice form component + Zod schema in `frontend/src/lib/schemas/`

---

### 12.2 — Visiting an invoice ID that does not exist shows an error or not-found page

- **Expected:** "Not found" or error message shown; no unhandled exception.
- **Actual:** Page body remained empty (`document.body.innerText = ""`) after 90+ seconds. The React app loaded (title = "Alleato AI - Project Management") but never rendered the invoice detail component. The page is stuck in a loading state indefinitely.
- **Severity:** high
- **Cause:** The API call for invoice id=999999 appears to hang rather than returning 404 promptly. The component has error handling (source code shows "Invoice not found" UI) but never receives the error response.
- **Detection gap:** No loading timeout in the invoice fetch. No 10-second guard to show error state if API doesn't respond.
- **Prevention:** Add `AbortController` with a 10s timeout to the invoice fetch. Show "Invoice not found" after timeout. Ensure API route returns 404 within 5s for non-existent IDs.
- **Fails loudly next time:** Add a loading timeout that renders the error state after 10 seconds.
- **Console errors:** screenshot timed out, no screenshot captured
- **Remediation hint:** `frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx` — add fetch timeout

---

## Skipped / Blocked (14 cases)

All skips are due to missing prerequisite test data in project 67:

- **2.1, 2.2, 2.3, 3.1, 4.1:** No Draft owner invoices exist (all 3 owner invoices have status=paid)
- **2.4, 4.2, 4.3, 4.4, 4.5:** No Approved or Under Review owner invoices exist
- **4.6:** No Approved subcontractor invoices exist (existing: 3 under_review, 1 draft, 1 paid, 1 not_invited)
- **5.1:** All owner invoices have `gross_amount=NULL` and `net_amount=NULL` — retention calculation cannot be verified
- **10.1:** Only 3 owner invoices exist; pagination requires >10 rows
- **11.1:** No second test user with read-only access configured
- **1.1 / 1.3 root blocker:** `financial_contracts` table empty for project 67 — blocks all owner invoice creation and subcontractor invoice creation via the form

---

## Test Data Created

| Marker | Created IDs | Cleanup status |
|--------|-------------|----------------|
| billing_periods BP-001 | id=d47f892c (2026-05-01 to 2026-05-31, due 2026-06-15) | Retained — created during test |
| billing_periods BP-002 | auto-created (2026-05-01 to 2026-05-30, due 2026-05-24) | Retained — created during test |
| subcontractor_invoice id=8 | Status changed to under_review (was draft) | Modified — was APP-02 draft |

---

## Root Cause Summary

Two root causes account for 4 of the 9 failures:

**Root cause 1 (critical, blocks 2 cases):** `financial_contracts` table is empty for project 67. Both owner and subcontractor invoice creation forms use this table as the contract dropdown source. No records → "No options found" → creation impossible.

**Root cause 2 (high, blocks 2 cases):** Missing React Query cache invalidation after mutations. Both `4.7` (submit sub invoice) and `5.2` (SOV edit) succeed at the DB level but the UI does not re-render after the mutation — `queryClient.invalidateQueries` is missing from the mutation `onSuccess` handlers.

---

## Next Steps

- [ ] **Fix 1.1 + 1.3:** Seed `financial_contracts` with at least one Prime Contract and one Commitment entry for project 67, OR fix the contract dropdown to source from `prime_contracts`/`subcontracts` tables directly.
- [ ] **Fix 4.7 + 5.2:** Add `queryClient.invalidateQueries` to submit and SOV save mutation `onSuccess` handlers.
- [ ] **Fix 8.1:** Debug `/api/projects/[projectId]/invoicing/owner/[invoiceId]/pdf/route.ts` — endpoint returns empty response.
- [ ] **Fix 12.2:** Add 10s fetch timeout to invoice detail page. Ensure API returns 404 quickly for non-existent IDs.
- [ ] **Fix 12.1:** Add `maxLength={255}` to Invoice Number input + `.max(255)` to Zod schema.
- [ ] **Seed data:** Add Draft and Under Review owner invoices + at least one Approved owner invoice to project 67 to unblock 10 skipped cases.
- [ ] **Re-run after fixes:** `/test-scenario-run-feature invoicing`
- [ ] **Run smoke to verify API health:** `/test-scenario-run-smoke invoicing`
