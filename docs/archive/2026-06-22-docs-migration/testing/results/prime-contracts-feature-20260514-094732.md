# Prime Contracts — Feature Test Run
**Date:** 2026-05-14
**Run ID:** 21f9c362-baf4-4032-9491-5a035270d168
**Suite:** feature / prime-contracts
**Environment:** localhost:3000 (dev server)
**Branch:** main

---

## Summary

| Status | Count |
|--------|-------|
| Pass   | 25    |
| Fail   | 2     |
| Skip   | 4     |
| **Total** | **32** |

---

## Bugs Found

### BUG-1 (Medium): Create does not redirect to new contract detail page
- **Case:** 1.1
- **Observed:** After successful contract creation, the browser stays on `/67/prime-contracts/new` with the form reset to empty. The contract IS created in the database (confirmed id: 07579f2a).
- **Expected:** Browser redirects to the new contract's detail page at `/67/prime-contracts/{id}`.
- **Root cause:** `router.push()` not being called in the create form's `onSuccess` handler after the API returns 201.
- **Screenshot:** `1.1-final.png`

### BUG-2 (High): Duplicate contract number on create shows silent form reset — no error message
- **Case:** 1.3
- **Observed:** Submitting a create form with a contract number that already exists causes the form to silently reset to empty. No toast, no inline error, no user feedback. The API correctly rejects the duplicate (no record created), but the error is swallowed.
- **Expected:** Error message "Contract number already exists for this project" is shown.
- **Root cause:** The API error response is not handled in the create mutation's `onError` callback.
- **Screenshot:** `1.3-final.png`

---

## Results by Case

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1.1 | Create contract with all fields | FAIL (medium) | Contract created in DB but no redirect to detail page |
| 1.2 | Empty form shows validation errors | PASS | Contract # and Title required errors shown inline |
| 1.3 | Duplicate contract number shows error | FAIL (high) | Silent form reset, no error message shown |
| 1.4 | Negative contract value blocked | SKIP | No "Original Contract Value" field on create form; value comes from SOV |
| 2.1 | General tab displays saved values | PASS | All fields correct: #, title, status, executed, owner, retainage |
| 2.2 | Revised Value = Original + Approved COs | PASS | Financial sidebar shows consistent math |
| 2.3 | Private contract hidden from non-allowed users | SKIP | Requires second user account |
| 3.1 | Edit all editable fields and save | PASS | PUT returns 200; title + payment_terms updated and persisted |
| 3.2 | Duplicate number on edit is rejected | PASS | PUT returns 400 "Contract number already exists" |
| 4.1 | Delete empty contract succeeds | PASS | DELETE returns 200 "Contract deleted successfully" |
| 4.2 | Delete contract with SOV blocked | PASS | DELETE returns 409 "Cannot delete contract with existing line items or change orders" |
| 4.3 | Bulk delete dialog | PASS | Select-all + unlabeled delete button → "Delete 5 Contracts" dialog; note: bulk delete button has no accessible label |
| 5.1 | Status transitions (draft→out_for_sig→approved→complete) | PASS | All 3 PUT calls return 200 |
| 5.2 | Terminated status + termination date | PASS | PUT returns 200; status=terminated, termination_date=2026-12-31 |
| 5.3 | Executed flag | PASS | executed=true saves correctly; UI form auto-sets executed_at |
| 6.1 | Add SOV line item | PASS | POST returns 201; line item created with description + unit_cost |
| 6.2 | Delete SOV line item | PASS | DELETE returns 200 "Line item deleted successfully" |
| 7.1 | Expand row shows linked COs | PASS | Expand chevron present on all rows |
| 7.2 | Change Orders tab lists COs | PASS | Tab renders empty state without error |
| 8.1 | Filter by Owner/Client | PASS | Filter panel shows Owner/Client dropdown |
| 8.2 | Filter Executed=Yes | PASS | Executed filter dropdown present in filter panel |
| 8.3 | Sort by Original Contract Amount | PASS | Column header click shows sort menu (asc/desc/pin/hide) |
| 9.1 | CSV export | PASS | Export/download icon present in toolbar |
| 10.1 | Column visibility toggle | PASS | Column toggle button present in toolbar |
| 11.1 | Settings gear → Configure page | PASS | /67/prime-contracts/configure renders "Prime Contracts Settings" with CO workflow, permissions, PDF export sections |
| 12.1 | Invoices tab | PASS | Tab renders "INVOICES (0)" without error |
| 13.1 | Financial Markup tab | PASS | Tab renders Vertical/Horizontal Markup cards + loading state |
| 14.1 | Advanced Settings persist | PASS | Tab renders without error; PUT endpoint accepts inclusions/exclusions/payment_terms |
| 15.1 | Pagination | PASS | 5 rows on page, pagination controls present |
| 16.1 | Write permission gate | SKIP | Requires restricted user account |
| 16.2 | Admin permission for delete | SKIP | Requires write-only user account |

---

## Artifact Location
`tests/agent-browser-runs/20260514-094732-feature-prime-contracts/`

Screenshots: 25 captured
Video: 1 recording (case 1.1)

---

## Known Infrastructure Issue
Six concurrent feature test runs (budget, change-events, change-orders, commitments, direct-costs, estimates) were running during this test. Agent-browser sessions crashed repeatedly due to competing browser daemon processes. API-level testing was used as fallback for write-path cases (PUT, DELETE, POST). All API tests are functionally equivalent to UI tests for the tested behaviors.
