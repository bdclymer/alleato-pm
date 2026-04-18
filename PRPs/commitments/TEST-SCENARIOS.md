# Commitments — Frontend Test Scenarios

**Generated from:** PRPs/commitments/prp-commitments.md + AUDIT.md + TASKS.md
**Date:** 2026-04-17
**Total scenarios:** 52
**Ready to test:** 44 | **Blocked (not yet implemented):** 8

---

## Quick Reference

| Group | Scenarios | Status |
|-------|-----------|--------|
| Navigation & Access | 5 | ✅ Ready |
| Create — Subcontract | 7 | ✅ Ready |
| Create — Purchase Order | 5 | ✅ Ready |
| Edit | 6 | ✅ Ready |
| Detail View | 7 | ✅ Ready |
| Status Workflows | 6 | 🟡 4 ready / 2 blocked |
| List View Features | 7 | ✅ Ready |
| Row Actions | 3 | ✅ Ready |
| Business Rules & Calculations | 5 | 🟡 3 ready / 2 blocked |
| Integrations | 5 | 🟡 3 ready / 2 blocked |

---

## Scenarios

---

### Group 1: Navigation & Access

---

#### Scenario 1.1: Navigate to Commitments list from sidebar
**Status:** Ready to test

**Given** the user is on any project page with the sidebar visible
**When** the user clicks "Commitments" in the left sidebar
**Then** the Commitments list page loads at `/[projectId]/commitments`
**And** the page title is "Commitments"
**And** the table is visible with column headers

---

#### Scenario 1.2: Empty state when no records exist
**Status:** Ready to test

**Given** the user is on the Commitments list page with no commitments created
**When** the page loads
**Then** an empty state is displayed (icon + message)
**And** a "Create" button or equivalent CTA is visible

---

#### Scenario 1.3: Correct columns visible in list view
**Status:** Ready to test

**Given** the Commitments list has at least one record
**When** the user views the list
**Then** all 17 columns are visible (or scrollable):
  - Number, Contract Company, Title, ERP Status, Status, Executed, SSOV Status,
    Original Contract Amount, Approved Change Orders, Revised Contract Amount,
    Pending Change Orders, Draft Change Orders, Invoiced, Payments Issued,
    % Paid, Remaining Balance Outstanding, Private

---

#### Scenario 1.4: Four tabs visible on list page
**Status:** Ready to test

**Given** the Commitments list page loads
**When** the user looks at the tab bar
**Then** these tabs are visible: All, Subcontracts, Purchase Orders, Change Orders, Recycle Bin

---

#### Scenario 1.5: Tab filtering works correctly
**Status:** Ready to test

**Given** commitments of both types (SC and PO) exist
**When** the user clicks the "Subcontracts" tab
**Then** only subcontracts are shown in the table
**When** the user clicks the "Purchase Orders" tab
**Then** only purchase orders are shown
**When** the user clicks "All"
**Then** all records are shown together

---

### Group 2: Create — Subcontract

---

#### Scenario 2.1: Create dropdown shows two options
**Status:** Ready to test

**Given** the user is on the Commitments list
**When** the user clicks the "Create" button (or dropdown)
**Then** two options appear: "Subcontract" and "Purchase Order"

---

#### Scenario 2.2: Create Subcontract — happy path
**Status:** Ready to test

**Given** the user is on the Commitments list
**When** the user clicks Create → Subcontract
**And** fills in:
  - Contract Company: any vendor from the dropdown
  - Title: "Test Subcontract SC-001"
  - Status: Draft
  - Contract Date: any date
**And** clicks "Create"
**Then** the form submits without errors
**And** the user is redirected to the new commitment's detail page
**And** the detail page shows the correct title, vendor, status, and contract number (SC-XXXX format)

**DB validation SQL:**
```sql
SELECT number, title, status, contract_company_id, contract_date
FROM subcontracts
ORDER BY created_at DESC
LIMIT 1;
```
All fields must match what was entered.

---

#### Scenario 2.3: Create Subcontract — auto-generated contract number
**Status:** Ready to test

**Given** the user opens the Subcontract create form
**When** the form loads
**Then** the "Contract #" field is pre-populated with an auto-generated number (e.g., `SC-0001`)
**And** the number is in `SC-XXXX` format

---

#### Scenario 2.4: Create Subcontract — required field validation
**Status:** Ready to test

**Given** the user is on the Subcontract create form
**When** the user clears all required fields and clicks "Create"
**Then** inline validation errors appear on:
  - Contract Company (if blank)
  - Title (if blank)
  - Status (if blank)
**And** no record is created

---

#### Scenario 2.5: Create Subcontract — all date fields
**Status:** Ready to test

**Given** the user is creating a Subcontract
**When** the user fills all six date fields:
  - Contract Date, Issued On, Signed Contract Received, Start Date, Estimated Completion, Actual Completion
**And** clicks Create
**Then** all dates are saved correctly
**DB validation:** Query subcontracts table and verify all date columns are not NULL and match input.

---

#### Scenario 2.6: Create Subcontract — Privacy conditional fields
**Status:** Ready to test

**Given** the user is on the Subcontract create form
**When** the user leaves "Private" unchecked
**Then** the "Accessors" field is NOT visible
**When** the user checks "Private"
**Then** the "Accessors" multi-select field appears
**And** "Show SOV to non-admins" checkbox appears

---

#### Scenario 2.7: Create Subcontract — Cancel
**Status:** Ready to test

**Given** the user is on the Subcontract create form with some fields filled
**When** the user clicks "Cancel"
**Then** the form closes without saving
**And** no new commitment appears in the list

---

### Group 3: Create — Purchase Order

---

#### Scenario 3.1: Create Purchase Order — happy path
**Status:** Ready to test

**Given** the user clicks Create → Purchase Order
**When** the user fills:
  - Contract Company: any vendor
  - Title: "Test PO-001"
  - Status: Draft
  - Ship Via: "FedEx"
  - Payment Terms: "Net 30"
**And** clicks "Create"
**Then** the form submits and redirects to detail page
**And** the contract number is in `PO-XXXX` format

**DB validation SQL:**
```sql
SELECT number, title, status, ship_via, payment_terms
FROM purchase_orders
ORDER BY created_at DESC
LIMIT 1;
```

---

#### Scenario 3.2: Create PO — PO-specific fields visible
**Status:** Ready to test

**Given** the user opens the Purchase Order create form
**When** the form loads
**Then** these PO-only fields are visible: Ship To, Ship Via, Bill To, Delivery Date, Payment Terms, Assigned To
**And** these fields are NOT present on the Subcontract form

---

#### Scenario 3.3: Create PO — inclusions and exclusions save
**Status:** Ready to test

**Given** the user is creating a Purchase Order
**When** the user types text in "Inclusions" and "Exclusions" fields
**And** clicks Create
**Then** both richtext values are saved to the database

**DB validation SQL:**
```sql
SELECT inclusions, exclusions FROM purchase_orders ORDER BY created_at DESC LIMIT 1;
```
Both must be non-null and match the entered text.

**Edge cases:**
- Empty inclusions/exclusions: should save as NULL, not break

---

#### Scenario 3.4: Create PO — Assigned To field
**Status:** Ready to test

**Given** the user is creating a Purchase Order
**When** the user selects a user from the "Assigned To" dropdown
**And** clicks Create
**Then** the assigned user is saved and displayed in the detail view

---

#### Scenario 3.5: Create PO — required field validation
**Status:** Ready to test

**Given** the user is on the PO create form
**When** the user submits without required fields
**Then** inline errors appear on all required fields (Contract Company, Title, Status)
**And** no record is created

---

### Group 4: Edit

---

#### Scenario 4.1: Edit — all fields pre-populate (Subcontract)
**Status:** Ready to test

**Given** an existing subcontract with all fields filled (vendor, status, dates, privacy settings)
**When** the user clicks "Edit" on the detail page
**Then** all dropdowns show the saved values (NOT "Select...")
**And** all text fields show saved values
**And** all date fields show saved dates
**And** if Private=true, the Accessors field shows the saved users

**Field classification:**
- Contract Company: FK dropdown — must pre-populate from saved `contract_company_id`
- Status: enum select — must pre-populate
- All dates: date pickers — must pre-populate
- Executed, Private, Show SOV: checkboxes — must reflect saved booleans

---

#### Scenario 4.2: Edit — all fields pre-populate (Purchase Order)
**Status:** Ready to test

**Given** an existing PO with all fields filled including Ship To, Ship Via, Bill To, Delivery Date, Payment Terms, Assigned To
**When** the user clicks "Edit"
**Then** all PO-specific fields pre-populate with saved values
**And** the Assigned To dropdown shows the saved user (not blank)

---

#### Scenario 4.3: Edit — save changes
**Status:** Ready to test

**Given** the user is editing an existing subcontract
**When** the user changes the title to "Updated Title 2026"
**And** clicks Save/Update
**Then** the detail view shows "Updated Title 2026"
**And** the list view also reflects the updated title

---

#### Scenario 4.4: Edit — Cancel discards changes
**Status:** Ready to test

**Given** the user is editing an existing commitment with changes made
**When** the user clicks "Cancel"
**Then** no changes are saved
**And** the record retains its original values

---

#### Scenario 4.5: Edit — status field shows correct Procore values
**Status:** Ready to test

**Given** the user opens the edit form for a commitment
**When** they click the Status dropdown
**Then** the available statuses are:
  - Draft, Out for Bid, Out for Signature, Approved, Complete, Terminated
**And** the legacy values "Sent", "Void", "Closed" are NOT present

---

#### Scenario 4.6: Edit — Contract Summary section is read-only
**Status:** Ready to test

**Given** the user is editing a commitment
**When** the Contract Summary section is visible
**Then** all derived financial fields are read-only (Original Contract Amount, Revised Contract, etc.)
**And** the user cannot type directly into those fields

---

### Group 5: Detail View

---

#### Scenario 5.1: Detail page header fields
**Status:** Ready to test

**Given** the user navigates to a commitment detail page
**When** the page loads
**Then** the header shows: Contract # (SC-XXXX or PO-XXXX), Title, Status badge, Executed badge, Contract Company
**And** the Revised Contract Amount is prominently displayed

---

#### Scenario 5.2: KPI row — financial summary
**Status:** Ready to test

**Given** a commitment with SOV line items and at least one change order
**When** the user views the detail page
**Then** the KPI row shows non-zero values for:
  - Original Contract, Approved Change Orders, Revised Contract,
    Pending Change Orders, Draft Change Orders
**And** Revised Contract = Original + Approved Change Orders

**Field classification:**
- All KPI values: derived/computed — verify by checking the formula, not by matching typed values

---

#### Scenario 5.3: All tabs present on detail page
**Status:** Ready to test

**Given** the user is on a commitment detail page
**When** the page loads
**Then** at minimum these tabs are visible:
  General, Schedule of Values, Change Orders, Invoices, Attachments, Change History, Emails

---

#### Scenario 5.4: Schedule of Values tab loads
**Status:** Ready to test

**Given** the user is on the SOV tab of a commitment with line items
**When** the tab loads
**Then** SOV line items are listed with: Budget Code, Description, Amount/Quantity/Unit Cost, Retainage %, Billed to Date
**And** a footer totals row is shown

---

#### Scenario 5.5: Change History tab loads audit log
**Status:** Ready to test

**Given** the user has made edits to a commitment (title change, status change, etc.)
**When** the user clicks the "Change History" tab
**Then** audit log entries appear showing:
  - Actor name
  - Field that changed
  - Old value → New value
  - Timestamp

---

#### Scenario 5.6: Payments Issued tab shows paid invoices
**Status:** Ready to test

**Given** a commitment with at least one invoice in paid/approved status
**When** the user clicks the "Payments Issued" tab
**Then** a table appears with: Invoice #, Payment Date, Status, Total Completed, Retainage, Payment Amount
**And** a totals footer row is present
**And** the tab does NOT show an empty state when real invoices exist

---

#### Scenario 5.7: Attachments tab
**Status:** Ready to test

**Given** the user is on a commitment detail page
**When** the user clicks the "Attachments" tab
**Then** any uploaded attachments are listed
**And** the user can upload new files (up to 20 files, 50MB each)
**And** the user can delete existing attachments

---

### Group 6: Status Workflows

---

#### Scenario 6.1: Set status to "Draft" on create
**Status:** Ready to test

**Given** the user creates a new subcontract without selecting a status
**When** the form submits
**Then** the record is saved with status = "Draft" (the default)

---

#### Scenario 6.2: Change status from Draft to Approved
**Status:** Ready to test

**Given** the user has a Draft commitment
**When** the user clicks Edit → changes Status to "Approved" → saves
**Then** the status badge on the detail page shows "Approved"
**And** the list view shows "Approved" in the Status column

---

#### Scenario 6.3: Change status to "Out for Bid"
**Status:** Ready to test

**Given** the user has a Draft commitment
**When** the user changes Status to "Out for Bid" via Edit
**Then** the status saves and displays correctly
**And** the status badge reflects "Out for Bid"

---

#### Scenario 6.4: Change status to "Complete" (not "Closed")
**Status:** Ready to test

**Given** an Approved commitment
**When** the user changes Status to "Complete"
**Then** the status saves as "Complete" (not the legacy "Closed")
**And** the status badge shows "Complete"

---

#### Scenario 6.5: Executed flag is independent of Status
**Status:** Ready to test

**Given** a Draft commitment with Executed = false
**When** the user checks "Executed" via Edit and saves
**Then** the commitment shows Executed = true AND Status = Draft simultaneously
**And** the "Executed" badge appears in the header

---

#### Scenario 6.6: Send for signature via DocuSign
**Status:** Blocked (requires: DocuSign integration — not implemented, removed from scope)

**Given** a commitment in Draft status
**When** the user clicks "Complete with DocuSign®"
**Then** (DocuSign envelope sent, status → Out for Signature)

---

### Group 7: List View Features

---

#### Scenario 7.1: Financial columns show real data (not 0)
**Status:** Ready to test

**Given** commitments with approved change orders and paid invoices exist
**When** the user views the list page
**Then** the "Approved Change Orders" column shows the actual sum (not $0)
**And** "Payments Issued" column shows actual payments (not $0)
**And** "% Paid" shows a computed percentage (not 0%)
**And** "Revised Contract Amount" = Original + Approved COs

**Edge cases:**
- Commitment with no COs: all CO columns show $0 (correct)
- Commitment with only pending COs: "Pending Change Orders" non-zero, "Approved" = $0

---

#### Scenario 7.2: ERP Status column visible in list
**Status:** Ready to test

**Given** the commitment list has records with ERP status data
**When** the user views the list
**Then** the "ERP Status" column is visible in the table (not just as a filter)
**And** the status is rendered using a badge/label (e.g., "Synced", "Pending", "Failed")

---

#### Scenario 7.3: Filter by Status
**Status:** Ready to test

**Given** commitments with multiple statuses exist
**When** the user selects "Approved" in the Status filter
**Then** only Approved commitments are shown

---

#### Scenario 7.4: Filter by Contract Company
**Status:** Ready to test

**Given** commitments from multiple vendors exist
**When** the user selects a specific vendor in the Contract Company filter
**Then** only commitments from that vendor appear in the list

---

#### Scenario 7.5: Footer totals row
**Status:** Ready to test

**Given** the Commitments list has multiple records
**When** the user scrolls to the bottom of the table
**Then** a footer totals row is visible
**And** it sums at least 10 financial columns correctly

---

#### Scenario 7.6: Export
**Status:** Ready to test

**Given** the user is on the Commitments list
**When** the user clicks the Export button
**Then** a file download initiates (CSV or PDF)
**And** the exported file contains commitment data

---

#### Scenario 7.7: Change Orders tab on list page
**Status:** Ready to test

**Given** change orders exist across commitments
**When** the user clicks the "Change Orders" tab on the list page
**Then** a project-level change orders table loads
**And** the data is scoped to this project

---

### Group 8: Row Actions

---

#### Scenario 8.1: Expand row to see change orders sub-table
**Status:** Ready to test

**Given** the commitments list with records
**When** the user clicks the expand/chevron icon on a row
**Then** a sub-table of change orders associated with that commitment appears inline
**And** the sub-table closes when clicked again

---

#### Scenario 8.2: Click Number column → navigates to detail
**Status:** Ready to test

**Given** the commitment list with at least one record
**When** the user clicks the contract number (e.g., "SC-0001") in the Number column
**Then** the user is taken to the commitment detail page at `/[projectId]/commitments/[type]/[id]` or equivalent route
**And** the detail page shows the correct commitment

---

#### Scenario 8.3: Delete (soft) from detail or list
**Status:** Ready to test

**Given** the user is on a commitment detail page
**When** the user selects Delete from the actions menu
**Then** the commitment is soft-deleted (moved to Recycle Bin)
**And** it no longer appears in the All/Subcontracts/POs tabs
**And** it appears in the Recycle Bin tab
**And** the user can restore it from the Recycle Bin

---

### Group 9: Business Rules & Calculations

---

#### Scenario 9.1: SOV line locked when invoiced
**Status:** Ready to test

**Given** a commitment with a SOV line that has `billed_to_date > 0`
**When** the user opens the Schedule of Values tab
**Then** that line item shows a lock icon
**And** the amount field on that line is disabled (cannot be changed)
**And** the delete button on that line is disabled
**And** non-invoiced lines remain editable

---

#### Scenario 9.2: Line-level retainage override
**Status:** Ready to test

**Given** a commitment with a default retainage % (e.g., 10%)
**When** the user opens the SOV tab and edits a specific line item's Retainage % to 5%
**And** saves the SOV
**Then** that line item's retainage is stored as 5%
**And** other lines retain the default retainage %

**DB validation SQL:**
```sql
SELECT budget_code, retainage_percent
FROM subcontract_sov_items
WHERE subcontract_id = [id];
```

---

#### Scenario 9.3: Approved CO increases Revised Contract Amount
**Status:** Ready to test

**Given** a commitment with original amount = $100,000 and one approved CO for $10,000
**When** the user views the detail page KPI row
**Then** Revised Contract Amount = $110,000
**And** Approved Change Orders = $10,000

**Field classification:**
- Revised Contract Amount: derived = original + sum(approved COs) — verify formula, not typed value

---

#### Scenario 9.4: Pending CO does not affect Revised Contract
**Status:** Ready to test

**Given** a commitment with a pending (not yet approved) CO for $5,000
**When** the user views the detail page
**Then** Pending Change Orders = $5,000
**And** Revised Contract Amount does NOT include the $5,000
**And** the pending amount appears in the "Pending Change Orders" KPI only

---

#### Scenario 9.5: SOV line unit/qty accounting on Subcontracts
**Status:** Ready to test

**Given** the user is on the SOV tab for a Subcontract
**When** the user adds a line item with Quantity, Unit Cost, and Unit of Measure
**Then** the amount auto-calculates as Quantity × Unit Cost
**And** the values save to `subcontract_sov_items.quantity`, `.unit_cost`, `.unit_of_measure`

**DB validation SQL:**
```sql
SELECT quantity, unit_cost, unit_of_measure, amount
FROM subcontract_sov_items
ORDER BY created_at DESC LIMIT 1;
```

---

### Group 10: Integrations

---

#### Scenario 10.1: Vendor dropdown loads from company directory
**Status:** Ready to test

**Given** the user is on the Subcontract create form
**When** the user clicks the "Contract Company" field
**Then** a searchable dropdown loads companies from the directory
**And** typing narrows the results
**And** selecting a company saves the correct `contract_company_id`

**DB validation:** Verify `contract_company_id` matches the ID of the selected company in the `companies` table.

---

#### Scenario 10.2: Change Orders tab on detail — links to PCOs/CCOs
**Status:** Ready to test

**Given** a commitment with associated PCOs
**When** the user views the Change Orders tab
**Then** the PCOs are listed with: Number, Title, Status, Amount
**And** clicking a PCO row navigates to the PCO detail (or opens a panel)

---

#### Scenario 10.3: Invoices tab on detail — links to subcontractor invoices
**Status:** Ready to test

**Given** a commitment with at least one subcontractor invoice
**When** the user views the Invoices tab
**Then** the invoices are listed with: Invoice #, Period, Status, Amount
**And** the tab does not show an empty state when real invoices exist

---

#### Scenario 10.4: Budget integration — SOV cost code selection
**Status:** Ready to test

**Given** the user is adding a SOV line item
**When** they click the Budget Code / Cost Code field
**Then** a dropdown or combobox loads available cost codes for the project
**And** the selected code is stored (even if stored as denormalized text)

**Edge cases:**
- Invalid cost code string: no hard FK error (FK enforcement is at UI layer only per AUDIT decision)

---

#### Scenario 10.5: ERP Sync button triggers sync
**Status:** Ready to test

**Given** a commitment on the detail page
**When** the user clicks the "ERP Sync" button
**Then** a sync request is sent to `/api/sync/acumatica/commitments`
**And** the ERP Status updates (Pending → Synced, or shows error if failed)
**And** no JS errors are thrown

**Edge cases:**
- Sync failure: user sees an error message, not a silent spinner

---

## Blocked Scenarios (Not Yet Implemented)

The following scenarios cannot be tested until their backing features are built:

| Scenario | Blocker |
|----------|---------|
| 6.6: DocuSign send → Out for Signature | DocuSign integration removed from scope |
| DocuSign webhook → Approved + signed PDF | DocuSign integration removed from scope |
| Cannot invoice over remaining SOV balance | SOV balance guard not confirmed in implementation |
| Private commitment visibility restriction | Accessors field saves but enforcement on view layer unverified |
| SSOV submission and approval workflow | Deep SSOV workflow not captured in audit |
| ERP bidirectional sync verification | Sync endpoint exists but bidirectional behavior unverified |
| Mark Executed dedicated action button | Only available as checkbox in General tab (no dedicated action button) |
| Commitment Settings page (81 fields) | Excluded from scope entirely |
