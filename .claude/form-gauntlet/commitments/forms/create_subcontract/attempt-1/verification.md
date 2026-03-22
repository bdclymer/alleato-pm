---
## Verification Report: Create Subcontract
**Verdict: PASS**

### Criterion-by-Criterion

| Criterion | Result | Evidence |
|-----------|--------|----------|
| Record appears in list | MET | "SC-GAUNTLET-001" with title "Test Subcontract SC-GAUNTLET-001", type "subcontract", status "draft" clearly visible in the commitments list at /67/commitments. See evidence-1.png and evidence-6.png. |
| Detail page loads | MET | Navigating to /67/commitments/20ab813b-80bb-4c95-b679-c1e1ad30a7ee loads the detail page with correct title, status Draft, and description "Created by form gauntlet". See evidence-9.png. |
| No errors | MET | No error toast or error alert observed on list page or detail page. |

### What I Found

1. **List page** (`/67/commitments`): The commitments list shows 2 records. The second record is **SC-GAUNTLET-001**, with title "Test Subcontract SC-GAUNTLET-001", type badge "subcontract", and status "draft". This is exactly the record that was submitted via the form.

2. **Database record** (confirmed via Supabase SQL): The record exists in the `subcontracts` table with:
   - `id`: `20ab813b-80bb-4c95-b679-c1e1ad30a7ee`
   - `contract_number`: `SC-GAUNTLET-001`
   - `title`: `Test Subcontract SC-GAUNTLET-001`
   - `status`: `Draft`
   - `description`: `Created by form gauntlet`
   - `default_retainage_percent`: `10.00`
   - `project_id`: `67`
   - `created_at`: `2026-03-22 18:07:42`

3. **Detail page** (`/67/commitments/20ab813b-80bb-4c95-b679-c1e1ad30a7ee`): The page loads correctly showing the subcontract header "Test Subcontract SC-GAUNTLET-001", breadcrumb, KPI summary row ($0.00 across all financial fields — expected for a new contract with no line items), General tab with title, status "Draft", and description "Created by form gauntlet".

4. **Vendor field caveat**: The vendor "3 Quarterdeck LLC" does not appear in the `companies` or `subcontractors` tables — the stored `contract_company_id` (`a37e6a61-1456-4c34-8068-a76222191170`) resolves to no matching company record. The vendor field appears blank on the detail page. This is a data/UI issue (the vendor dropdown likely references a company table that does not contain "3 Quarterdeck LLC"), but it does NOT affect the PASS verdict since the form successfully saved and the record is present in the list. The vendor mismatch is a pre-existing data gap, not a form submission failure.

5. **Retainage**: Confirmed as `10.00%` in database — matches the test data input.

6. **No error toast/alert**: None observed at any point.

### Issues Found (non-blocking)

- **Vendor not persisted correctly**: The `contract_company_id` stored (`a37e6a61-1456-4c34-8068-a76222191170`) does not match any row in the `companies` or `subcontractors` tables, so the vendor displays as blank on the detail page. "3 Quarterdeck LLC" may have been selected from a dropdown backed by a different data source than the FK target, or it was deleted. This is a data integrity issue worth investigating but does not constitute a form submission failure.

### Evidence Screenshots

- `/tmp/verify-create_subcontract-evidence-1.png`: First view of commitments list (before auth), clearly shows SC-GAUNTLET-001 record with type "subcontract" and status "draft"
- `/tmp/verify-create_subcontract-evidence-6.png`: Authenticated view of commitments list — same record visible with all correct fields
- `/tmp/verify-create_subcontract-evidence-9.png`: Detail page for the subcontract, showing title "Test Subcontract SC-GAUNTLET-001", status Draft, description "Created by form gauntlet"
---
