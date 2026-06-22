# Feature Test Report: Change Orders

**Run ID:** ef8f3955-665f-42b8-a930-3b07b4dd9f86
**Tester:** claude-code
**Environment:** localhost:3000
**Branch:** main
**Started:** 2026-05-14T13:48:10Z
**Duration:** ~90 min

## Summary

| Status  | Count |
|---------|-------|
| Passed  | 16    |
| Failed  | 4     |
| Skipped | 17    |
| **Total** | **37** |

Pass rate: **80%** (of executed cases: 16/20 = **80%**)

**Note on skipped cases:** 17 cases were skipped due to persistent browser contention from 7 parallel feature test agents (budget, invoicing, commitments, prime-contracts, estimates, direct-costs, change-events) all sharing the same Chromium browser instance. Each attempt to maintain page control was interrupted within 2–10 seconds by another agent. This is a test infrastructure constraint, not a product failure. Re-running serially will cover these cases.

---

## Results

| # | Test | Priority | Status | Severity | Notes |
|---|------|----------|--------|----------|-------|
| 1.1 | Create Prime CO with required fields | HIGH | ✅ pass | — | Toast appeared, redirected to /prime/2340. PCCO auto-numbered "004" (system ignores manual input). |
| 1.2 | Prime CO required field validation | HIGH | ✅ pass | — | "PCCO number is required" and "Title is required" errors shown. No navigation. |
| 1.3 | Create Commitment CO | HIGH | ✅ pass | — | CCO created, redirected to /commitment/bb57a904. CO#001, DkGr LLC company. |
| 1.4 | CCO required field validation | HIGH | ✅ pass | — | "CO number is required", "Commitment is required", "Title is required" errors shown. |
| 1.5 | Optional PCCO fields persist | MEDIUM | ✅ pass | — | description, schedule_impact=5, executed=Yes, change_reason all persisted. DB confirmed. |
| 2.1 | Edit Prime CO — all fields | HIGH | ❌ fail | high | Edit form cannot be saved: Status field is both required AND disabled in edit mode. "Status is required" error blocks save. |
| 2.2 | Status disabled in edit form | HIGH | ✅ pass | — | Status shows "Select status" (disabled), helper text "Use Approve / Reject actions to change status." visible. |
| 2.3 | Cancel edit discards changes | MEDIUM | ✅ pass | — | Cancel returned to original title, no toast. |
| 3.1 | Delete Prime CO from detail | HIGH | ❌ fail | medium | Toast "Change order deleted" appeared. DB record removed. BUT URL stayed on /prime/2342 — redirect to list page missing. |
| 3.2 | Delete from row actions | HIGH | ❌ fail | medium | Row actions Delete for "proposed" CO blocked: "Cannot delete a change order with status 'proposed'. Only draft, pending, or rejected can be deleted." Test precondition needed a delete-eligible CO. |
| 4.1 | Approve Prime CO | HIGH | ✅ pass | — | Status badge changed to "approved", approved_at populated, Approved Amount=$15,000. |
| 4.2 | Reject Prime CO with reason | HIGH | ✅ pass | — | Status changed to "rejected", Rejection Reason block appeared. |
| 4.3 | Reject button disabled without reason | HIGH | ✅ pass | — | Reject button [disabled] when textarea empty, enabled after typing. |
| 4.4 | CCO status filter options | MEDIUM | ⏭ skip | — | Browser contention. |
| 5.1 | Add line item to Prime CO | HIGH | ✅ pass | — | Toast "Line item added", row shows Framing labor/10/HR/$125/$1,250, Total=$1,343.75. |
| 5.2 | Edit line item inline | HIGH | ❌ fail | high | Checkmark button click did not save changes. Tab+Enter cancelled edit instead of committing. Qty reverted to 10. No "Line item updated" toast. |
| 5.3 | Delete line item | HIGH | ✅ pass | — | Trash icon deleted row. Empty state "No line items" with Add Line Item button appeared. |
| 5.4 | Empty line items shows Add button | MEDIUM | ✅ pass | — | Empty state "No line items" with "+ Add Line Item" button rendered. Clicking opens inline add row. |
| 6.1 | Financial summary totals | HIGH | ✅ pass | — | Approved CO: Amount=$15,000, Approved Amount=$15,000, Pending=$0. All correct. |
| 6.2 | Footer totals filter-aware | HIGH | ⏭ skip | — | Browser contention. |
| 7.1 | Upload file attachment | MEDIUM | ⏭ skip | — | Browser contention. |
| 7.2 | Delete attachment | MEDIUM | ⏭ skip | — | Browser contention. |
| 8.1 | Email PDF dialog opens | MEDIUM | ⏭ skip | — | Browser contention. |
| 8.2 | Emails tab shows history | MEDIUM | ⏭ skip | — | Browser contention. |
| 9.1 | Related Items tab loads | MEDIUM | ⏭ skip | — | Browser contention. |
| 10.1 | Executed filter | MEDIUM | ⏭ skip | — | Browser contention. |
| 10.2 | Column visibility toggle | MEDIUM | ⏭ skip | — | Browser contention. |
| 10.3 | Sort by Amount column | MEDIUM | ⏭ skip | — | Browser contention. |
| 11.1 | Card view renders | MEDIUM | ✅ pass | — | Grid tab clicked. Cards render with PCCO number, title, status badge. |
| 11.2 | List view renders | MEDIUM | ⏭ skip | — | Browser contention (page navigated away before test). |
| 12.1 | Export CSV | MEDIUM | ⏭ skip | — | Browser contention. |
| 12.2 | Export PDF from detail | MEDIUM | ⏭ skip | — | Browser contention. |
| 13.1 | Change History tab | MEDIUM | ⏭ skip | — | Browser contention. |
| 14.1 | /new redirects to prime create | LOW | ⏭ skip | — | Browser contention. |
| 14.2 | /new?tab=commitment redirects to CCO | LOW | ⏭ skip | — | Browser contention. |
| 14.3 | Row click navigates to detail | HIGH | ✅ pass | — | Clicking row navigated to /67/change-orders/prime/2342. URL correct. |
| 14.4 | CCO auto-number on contract select | MEDIUM | ⏭ skip | — | Browser contention. |

---

## Failures

### 2.1 — Edit a Prime CO and verify all changes persist after save

- **Expected:** Toast "Change order updated", edit mode closes, changes visible on detail page.
- **Actual:** "Status is required" validation error on Save Changes click. Save never completes. Edit form is stuck.
- **Severity:** high
- **Cause:** Status field has a required validator but is also disabled in edit mode (the form renders it as read-only with helper text "Use Approve / Reject actions to change status."). The required validator fires on save attempt because no value is selected in the disabled field.
- **Detection gap:** No automated test for edit-mode form validation. The conflict between `disabled` and `required` on the same field is invisible during create (where Status has a default "Proposed").
- **Prevention:** Remove the `required` validator from the Status field in edit mode, or pre-populate it from the current record value before disabling it.
- **Fails loudly next time:** Add a smoke test: PUT /api/projects/67/prime-contract-change-orders/\<id\> with a title change — if it 422s, the edit flow is broken.
- **Screenshots:** `screenshots/ef8f3955.../2.1-final.png` (shows "Status is required" error)
- **Console errors:** none observed
- **DB assertion:** Status field not saved, change_reason not updated.
- **Remediation hint:** `frontend/src/app/(main)/[projectId]/change-orders/prime/[id]/` — edit form component, Status field definition.

### 3.1 — Deleting a Prime CO does not redirect back to list

- **Expected:** URL redirects to /67/change-orders?tab=prime after deletion.
- **Actual:** Toast "Change order deleted" appeared, DB record removed (confirmed empty SELECT). URL remained at /67/change-orders/prime/2342.
- **Severity:** medium
- **Cause:** The `onSuccess` handler after delete does not call `router.push()` to navigate back to the list.
- **Detection gap:** No E2E test asserting post-delete redirect.
- **Prevention:** Add `router.push('/67/change-orders?tab=prime')` in the delete success handler.
- **Fails loudly next time:** Add to smoke test: after DELETE, verify 302/redirect to list.
- **Screenshots:** `screenshots/ef8f3955.../3.1-final.png` (shows toast + still on detail page)
- **Remediation hint:** `frontend/src/app/(main)/[projectId]/change-orders/prime/[id]/` — delete action handler.

### 3.2 — Row actions Delete blocked for "proposed" status

- **Expected:** Delete from row actions works for any CO.
- **Actual:** Error "Cannot delete a change order with status 'proposed'. Only draft, pending, or rejected change orders can be deleted."
- **Severity:** medium
- **Cause:** The test precondition ("no blocking constraints") was not specific enough — the app restricts deletion by status. This is correct business logic but the test needs a CO in draft/pending/rejected status.
- **Detection gap:** Test case did not specify required CO status for delete.
- **Prevention:** Update test precondition to specify "a CO with status=draft or pending exists."
- **Fails loudly next time:** Test data marker — create a draft CO specifically for delete tests.
- **Screenshots:** `screenshots/ef8f3955.../3.2-final.png` (shows error toast)
- **Remediation hint:** Not a product bug — update test case 3.2 precondition in `test_cases` table.

### 5.2 — Inline line item edit does not save

- **Expected:** Toast "Line item updated", row reflects Quantity 20 and updated Amount.
- **Actual:** Checkmark (✓) button click did not trigger save. Tab+Enter pressed on the qty field cancelled the edit, reverting qty back to 10. No toast appeared.
- **Severity:** high
- **Cause:** The save button (e70) click is not correctly bound to the save action for inline edit. The button may require a specific focus state or the click target is misidentified. Pressing Enter cancelled instead of saving.
- **Detection gap:** No unit test for inline edit row component save flow.
- **Prevention:** Ensure the checkmark button's onClick handler calls save. Add keyboard shortcut: Enter within the edit row should save.
- **Fails loudly next time:** Add unit test: `fireEvent.click(saveButton)` should call onSave with new values.
- **Screenshots:** `screenshots/ef8f3955.../5.2-final.png` (shows qty reverted to 10, no toast)
- **Remediation hint:** `frontend/src/app/(main)/[projectId]/change-orders/prime/[id]/` — line item inline edit component, save button handler.

---

## Skipped / Not Tested

17 cases skipped due to browser contention from 7 parallel feature test agents sharing the same Chromium process. All skipped cases are MEDIUM or LOW priority (except 6.2 which is HIGH).

Cases requiring re-run: 4.4, 6.2, 7.1, 7.2, 8.1, 8.2, 9.1, 10.1, 10.2, 10.3, 11.2, 12.1, 12.2, 13.1, 14.1, 14.2, 14.4.

---

## Test Data

| Marker | Created IDs | Cleanup status |
|--------|-------------|----------------|
| E2E-ef8f3955-1.1 | prime CO id=2340 (approved) | retained |
| E2E-ef8f3955-1.3 | commitment CO id=bb57a904 | retained |
| E2E-ef8f3955-1.5 | prime CO id=2341 (proposed) | retained |
| E2E-ef8f3955-3.1 | prime CO id=2342 | deleted (confirmed) |
| (unnamed) | prime CO id=2340 line item | deleted |

---

## Next Steps

- [ ] **Fix 2.1** — Remove required validator from Status in edit mode. File: prime CO edit form component.
- [ ] **Fix 3.1** — Add `router.push('/67/change-orders?tab=prime')` in delete success handler.
- [ ] **Fix 5.2** — Fix inline line item edit save button handler. Ensure Enter key saves (not cancels).
- [ ] **Update 3.2 test** — Change precondition to require draft/pending/rejected CO for delete test.
- [ ] **Re-run skipped cases** — `/test-scenario-run-feature change-orders` after serializing parallel runs.
- [ ] **Run smoke** — `/test-scenario-run-smoke change-orders` to verify API endpoints still healthy.
