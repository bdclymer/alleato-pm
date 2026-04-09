# Prime Contracts — Procore Feature Test Matrix

**Generated:** 2026-04-08

## Summary

| Category | # Tests | Priority |
|----------|---------|---------|
| Core Actions | 17 | HIGH |
| Views & Navigation | 11 | HIGH |
| Fields & Data | 17 | HIGH |
| Statuses & Workflows | 8 | HIGH |
| Schedule of Values | 9 | HIGH |
| Permissions | 3 | MEDIUM |
| Integrations | 8 | MEDIUM |
| Reporting & Export | 4 | MEDIUM |
| Advanced Features | 13 | MEDIUM |
| **TOTAL** | **90** | |

---

## 1. Core Actions

> Source: Codebase — `POST /api/projects/[projectId]/contracts`, `PUT /api/projects/[projectId]/contracts/[contractId]`, `DELETE /api/projects/[projectId]/contracts/[contractId]`

### 1.1 Create

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.1.1 | Create a contract with required fields only | 1. Navigate to /767/prime-contracts<br>2. Click "Create"<br>3. Fill Contract Number and Title<br>4. Submit | New contract appears in list with the entered number and title; status defaults to "Draft" | HIGH | 🔲 | |
| 1.1.2 | Create a contract with all optional fields | Fill all fields: contract number, title, status, owner/client, contractor, architect/engineer, description, original amount, start date, end date, substantial completion date, actual completion date, signed contract received date, retention %, payment terms, billing schedule, inclusions, exclusions, is private | All fields persisted; detail General tab shows every entered value | MEDIUM | 🔲 | |
| 1.1.3 | Create fails when title is missing | Leave Title blank, fill Contract Number, click Save | Validation error shown on Title field; contract not created | HIGH | 🔲 | |
| 1.1.4 | Create fails when contract number is missing | Leave Contract Number blank, fill Title, click Save | Validation error shown on Contract Number field; contract not created | HIGH | 🔲 | |
| 1.1.5 | Duplicate contract number within project is rejected | Create a contract with number "PC-001"; try to create another with number "PC-001" in the same project | Error: "Contract number already exists for this project"; second contract not created | HIGH | 🔲 | |
| 1.1.6 | Original contract value defaults to $0 | Create a contract without specifying original amount | Contract created with original_contract_value = $0.00 | MEDIUM | 🔲 | |
| 1.1.7 | Create with SOV line items | Add 2 SOV lines during create (description, budget code, amount); submit | Contract created; SOV tab shows both line items; total matches sum of amounts | HIGH | 🔲 | |

### 1.2 Edit

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.2.1 | Edit header fields | Open detail, click Edit (pencil icon), change Title and Status, Save | Changes persist after page refresh | HIGH | 🔲 | |
| 1.2.2 | Cancel edit discards changes | Click Edit, change Title, click "Cancel Edit" | Original title shown; no data changed | HIGH | 🔲 | |
| 1.2.3 | Edit from list row action menu | Hover row → action menu → Edit | Opens edit mode for that contract | MEDIUM | 🔲 | |
| 1.2.4 | Edit via ?edit=1 query parameter | Navigate to /767/prime-contracts/[contractId]?edit=1 | Page opens directly in edit mode | MEDIUM | 🔲 | |
| 1.2.5 | Edit opens pre-filled with saved values | Create a contract with known values, click Edit | All dropdowns show previously saved values; no blank "Select..." placeholders for owner, contractor, status | HIGH | 🔲 | |
| 1.2.6 | Edit updates financial fields | Edit original contract value from $100,000 to $200,000, save | Revised contract amount recalculates on detail header; list page shows updated value | HIGH | 🔲 | |

### 1.3 Delete

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.3.1 | Delete a single contract from list | Row action menu → Delete → Confirm | Contract disappears from list; toast "deleted successfully" | HIGH | 🔲 | |
| 1.3.2 | Cancel delete leaves contract intact | Click Delete → Cancel in dialog | Contract remains in list unchanged | HIGH | 🔲 | |
| 1.3.3 | Bulk delete multiple contracts | Select 2+ contracts via checkboxes, click bulk delete icon, confirm | All selected contracts removed; toast shows count deleted | HIGH | 🔲 | |
| 1.3.4 | Delete dialog shows contract number and title | Row action menu → Delete | Dialog text includes contract number and title before confirming | MEDIUM | 🔲 | |

---

## 2. Views & Navigation

> Source: Codebase — list page (`/[projectId]/prime-contracts`), detail page (`/[projectId]/prime-contracts/[contractId]`), configure page

### 2.1 List View

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.1.1 | List view loads with correct columns | Navigate to /767/prime-contracts | Table renders with: Expand toggle, Contract #, Owner/Client, Title, Status, Executed, Original Contract Amount, Revised Contract Amount, Invoiced Amount, Payments Received, Remaining Balance | HIGH | 🔲 | |
| 2.1.2 | Card view renders | Click card view toggle | Each contract displayed as a card with key fields visible | MEDIUM | 🔲 | |
| 2.1.3 | List view renders | Click list view toggle | Each contract displayed as a compact row | MEDIUM | 🔲 | |
| 2.1.4 | Mobile: table auto-switches to list view | Resize viewport to < 768px and navigate to list | View automatically switches from table to list mode | MEDIUM | 🔲 | |

### 2.2 Expanded Row

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.2.1 | Expand row reveals Prime Contract Change Orders | Click expand chevron on a contract row | Sub-table shows PCCOs with columns: Number, Title, Status, Amount | HIGH | 🔲 | |
| 2.2.2 | Expand row shows "No change orders" when none exist | Click expand on a contract with no PCCOs | Message: "No change orders" | MEDIUM | 🔲 | |
| 2.2.3 | PCCO row in expanded view is clickable | Click a PCCO row in expanded view | Navigates to /767/change-orders/prime/[id] | HIGH | 🔲 | |
| 2.2.4 | Loading state shown while fetching PCCOs | Click expand for the first time | "Loading change orders..." shown while fetching | LOW | 🔲 | |

### 2.3 Detail View Tabs

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.3.1 | Detail view loads all tabs | Click any contract row | Tabs shown: General, Change Orders, Invoices, Payments Received, Emails, Change History, Financial Markup, Advanced Settings | HIGH | 🔲 | |
| 2.3.2 | Tab count badges update dynamically | Open a contract with 3 change orders and 2 invoices | Change Orders tab shows "(3)" badge; Invoices tab shows "(2)" badge | MEDIUM | 🔲 | |
| 2.3.3 | Configure button navigates to settings page | Click Settings (gear) icon on list page | Navigates to /767/prime-contracts/configure | LOW | 🔲 | |

---

## 3. Fields & Data

> Source: Validation schema (`/api/projects/[projectId]/contracts/validation.ts`), `Contract` type interface

### 3.1 Contract Header Fields

| # | Field | Type | Required | Valid Values / Constraints | Priority | Result |
|---|-------|------|---------|---------------------------|---------|--------|
| 3.1.1 | Contract Number | Text | Yes | 1–100 chars; unique within project | HIGH | 🔲 |
| 3.1.2 | Title | Text | Yes | 1–500 chars | HIGH | 🔲 |
| 3.1.3 | Status | Dropdown | No (defaults to Draft) | Draft, Out for Bid, Out for Signature, Approved, Complete, Terminated | HIGH | 🔲 |
| 3.1.4 | Executed | Boolean toggle | No (defaults to false) | true / false | MEDIUM | 🔲 |
| 3.1.5 | Original Contract Value | Currency | No (defaults to $0) | Min $0; numeric | HIGH | 🔲 |
| 3.1.6 | Retention % | Percentage | No (defaults to 0) | 0–100 | HIGH | 🔲 |
| 3.1.7 | Owner / Client | Company dropdown | No | Loaded from companies table | HIGH | 🔲 |
| 3.1.8 | Contractor | Company dropdown | No | Loaded from companies table | MEDIUM | 🔲 |
| 3.1.9 | Architect / Engineer | Company dropdown | No | Loaded from companies table | MEDIUM | 🔲 |

### 3.2 Date Fields

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.2.1 | Start Date can be set and saved | Edit contract → set Start Date → save | Start Date persists on General tab | HIGH | 🔲 | |
| 3.2.2 | End Date (Estimated Completion) can be set | Edit contract → set End Date → save | End Date persists | HIGH | 🔲 | |
| 3.2.3 | Substantial Completion Date saves | Edit → set Substantial Completion Date → save | Persists on General tab | MEDIUM | 🔲 | |
| 3.2.4 | Actual Completion Date saves | Edit → set Actual Completion Date → save | Persists on General tab | MEDIUM | 🔲 | |
| 3.2.5 | Signed Contract Received Date saves | Edit → set this date → save | Persists on General tab | MEDIUM | 🔲 | |
| 3.2.6 | Contract Termination Date saves | Edit → set Contract Termination Date → save | Persists on General tab | LOW | 🔲 | |
| 3.2.7 | Executed At date populates when Executed = true | Toggle Executed to true → save | Executed At shows the timestamp of execution | MEDIUM | 🔲 | |
| 3.2.8 | Date fields can be cleared | Set a date, save, edit again, clear the field | Field shows "Not set" after save | LOW | 🔲 | |

---

## 4. Statuses & Workflows

> Source: Validation schema — `contractStatusSchema`; detail page — action dropdown

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.1.1 | Default status is Draft | Create a new contract without specifying status | Status badge shows "Draft" on list and detail | HIGH | 🔲 | |
| 4.1.2 | Change status to Out for Bid | Edit contract → Status = Out for Bid → save | Status badge shows "Out for Bid" | HIGH | 🔲 | |
| 4.1.3 | Change status to Out for Signature | Edit contract → Status = Out for Signature → save | Status badge shows "Out for Signature" | HIGH | 🔲 | |
| 4.1.4 | Change status to Approved | Edit contract → Status = Approved → save | Status badge shows "Approved" | HIGH | 🔲 | |
| 4.1.5 | Change status to Complete | Edit contract → Status = Complete → save | Status badge shows "Complete" | MEDIUM | 🔲 | |
| 4.1.6 | Change status to Terminated | Edit contract → Status = Terminated → save | Status badge shows "Terminated"; Contract Termination Date field enabled | MEDIUM | 🔲 | |
| 4.2.1 | Mark contract as Executed | Edit → toggle Executed = true → save | "Executed" badge or indicator shown on list and detail | HIGH | 🔲 | |
| 4.2.2 | Unmark Executed | Edit → toggle Executed = false → save | Executed indicator removed | MEDIUM | 🔲 | |

---

## 5. Schedule of Values (SOV)

> Source: `GET/POST /api/projects/[projectId]/contracts/[contractId]/line-items`; SOV editing hook in detail page

### 5.1 Viewing SOV

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.1.1 | SOV table renders on General tab | Open contract detail → General tab | SOV section visible below contract details; columns: #, Budget Code, Description, Qty, Unit Cost, Unit of Measure, Total | HIGH | 🔲 | |
| 5.1.2 | SOV total displayed below table | Open General tab with SOV items | Footer row shows total of all line item amounts | HIGH | 🔲 | |
| 5.1.3 | Empty SOV shows placeholder | Open contract with no SOV lines | Empty-state message in SOV section; "Add Line" button visible | MEDIUM | 🔲 | |

### 5.2 Add / Edit / Delete SOV Lines

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.2.1 | Add SOV line item via dialog | General tab → Add Line Item → fill Line #, Description, Budget Code, Qty, Unit Cost → save | Line item appears in SOV table; total recalculates | HIGH | 🔲 | |
| 5.2.2 | Add SOV line item via inline SOV edit | Click "Edit SOV" → "Add Line" → fill inline row → save | Line item persists after save | HIGH | 🔲 | |
| 5.2.3 | Add SOV group header | SOV edit mode → Add Group → fill group name | Group header row appears above line items | MEDIUM | 🔲 | |
| 5.2.4 | Edit existing SOV line cost | SOV edit mode → change Unit Cost on a line → save | Total cost updates; new value persists after refresh | HIGH | 🔲 | |
| 5.2.5 | Delete SOV line item | SOV edit mode → remove a line → save | Line item removed; total decreases | HIGH | 🔲 | |
| 5.2.6 | Duplicate line number rejected | Add two SOV lines with the same Line # | Error: "Line number X already exists for this contract"; second line not saved | HIGH | 🔲 | |

---

## 6. Permissions

> Source: Detail page action menu visibility; API auth checks

| # | Test | Role | Action | Expected | Priority | Result | Notes |
|---|------|------|--------|---------|---------|--------|-------|
| 6.1.1 | Standard user can view list | Standard user | Navigate to /767/prime-contracts | List loads; no access denied | MEDIUM | 🔲 | |
| 6.1.2 | Standard user can view detail | Standard user | Click any contract row | Detail page loads with all tabs visible | MEDIUM | 🔲 | |
| 6.1.3 | Private contract hidden from non-admin | Create contract with Is Private = true; log in as different user | Private contract not visible to non-admin users | MEDIUM | 🔲 | |

---

## 7. Integrations & Cross-Tool Links

> Source: Detail page — Create dropdown; change orders tab; invoices tab; payments tab; ERP sync buttons

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.1.1 | Create Change Event from contract detail | Detail → Create dropdown → Change Event | Navigates to /767/change-events/new?contractId=[id] | HIGH | 🔲 | |
| 7.1.2 | Create Change Order from contract detail | Detail → Create dropdown → Change Order | Navigates to /767/change-orders/prime/new?contractId=[id] | HIGH | 🔲 | |
| 7.1.3 | Create Purchase Order from contract detail | Detail → Create dropdown → Purchase Order | Navigates to /767/commitments/new?type=purchase_order&contractId=[id] | MEDIUM | 🔲 | |
| 7.1.4 | Create Subcontract from contract detail | Detail → Create dropdown → Subcontract | Navigates to /767/commitments/new?type=subcontract&contractId=[id] | MEDIUM | 🔲 | |
| 7.2.1 | Change Orders tab reflects approved CO amounts | Approve a change order on the Change Orders tab | Revised Contract Value on General tab increases by the approved CO amount | HIGH | 🔲 | |
| 7.3.1 | ERP sync imports invoices from Acumatica | Click ERP sync (refresh icon) on detail page | Toast shows count of invoices created/updated; Invoices tab updates | MEDIUM | 🔲 | |
| 7.3.2 | ERP export sends invoices to Acumatica | Click Export (upload icon) on detail page | Toast confirms export; no errors | MEDIUM | 🔲 | |
| 7.4.1 | Budget: Revised Contract Value impacts budget columns | View Budget tool after contract changes | Budget reflects revised contract value from approved COs | MEDIUM | 🔲 | |

---

## 8. Reporting & Export

> Source: List page — CSV export; detail page — Document delivery dialog (email / download)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 8.1.1 | Export contract list as CSV | List page → click Export icon in toolbar | CSV downloads with visible columns: Contract #, Owner/Client, Title, Status, Executed, Original Amount, Revised Amount, Invoiced, Payments Received, Remaining Balance | MEDIUM | 🔲 | |
| 8.1.2 | CSV reflects active filters | Apply Status = "Draft" filter → export | CSV contains only Draft contracts | MEDIUM | 🔲 | |
| 8.2.1 | Download contract document | Detail → Download icon → Document delivery dialog → Download tab | PDF or document downloads for the selected contract | MEDIUM | 🔲 | |
| 8.2.2 | Email contract document | Detail → Email icon → Document delivery dialog → Email tab → fill recipient → send | Email sent confirmation; no error | MEDIUM | 🔲 | |

---

## 9. Advanced Features

> Source: List page — search, filters, column visibility, pagination, bulk select; detail page — financial markup, advanced settings, attachments

### 9.1 Search

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.1.1 | Search by contract number | Type a contract number in the search box | List filters to matching contracts in real time | HIGH | 🔲 | |
| 9.1.2 | Search by title keyword | Type part of a contract title | List filters to matching contracts | HIGH | 🔲 | |
| 9.1.3 | Search by owner/client name | Type a company name | List filters to contracts with matching client | MEDIUM | 🔲 | |

### 9.2 Filters

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.2.1 | Filter by status | Apply Status = "Approved" filter | Only Approved contracts shown | HIGH | 🔲 | |
| 9.2.2 | Filter by executed status | Apply Executed = "Yes" filter | Only executed contracts shown | MEDIUM | 🔲 | |
| 9.2.3 | Filter by owner/client | Apply Owner/Client filter (populated from data) | Only contracts with matching client shown | MEDIUM | 🔲 | |
| 9.2.4 | Clear all filters | Click "Clear filters" | All contracts shown again; filter badges removed | HIGH | 🔲 | |

### 9.3 Column Visibility

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.3.1 | Toggle column visibility | Hide "Invoiced Amount" via column selector | Invoiced Amount column disappears; other columns intact | LOW | 🔲 | |
| 9.3.2 | Pinned columns stay visible | Scroll right with many columns | Contract # and expand toggle remain pinned on left | MEDIUM | 🔲 | |

### 9.4 Financial Markup Tab

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.4.1 | Financial Markup tab loads vertical markup rows | Detail → Financial Markup tab | Markup rows shown with markup type, %, calculation order, compound flag | MEDIUM | 🔲 | |
| 9.4.2 | Markup calculations display correctly | Open Financial Markup tab with configured markups | Base amount, markup amounts, and final totals calculated and shown | MEDIUM | 🔲 | |

### 9.5 Advanced Settings Tab

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.5.1 | Advanced Settings tab loads | Detail → Advanced Settings tab | Settings panel shows: CO tier count, allow standard users create PCCO, allow standard users create PCO, SOV always editable, show markup on CO PDF, show markup on invoice PDF, default distributions | MEDIUM | 🔲 | |
| 9.5.2 | Save advanced settings | Edit inclusions/exclusions/payment terms → save | Values persist on refresh | MEDIUM | 🔲 | |

### 9.6 Attachments

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.6.1 | Upload attachment on General tab | General tab → Upload file | Attachment appears in list with file name and download link | MEDIUM | 🔲 | |
| 9.6.2 | Delete attachment | Click delete on an attachment → confirm | Attachment removed from list | MEDIUM | 🔲 | |

---

## Sources

| # | Title | URL | Category |
|---|-------|-----|---------|
| 1 | About Prime Contracts | https://v2.support.procore.com/process-guides/about-prime-contracts | Prime Contracts |
| 2 | Create a Prime Contract | https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/create-a-prime-contract | Prime Contracts |
| 3 | Edit a Prime Contract | https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/edit-a-prime-contract | Prime Contracts |
| 4 | Delete a Prime Contract | https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/delete-a-prime-contract | Prime Contracts |
| 5 | Add Line Items to the Schedule of Values | https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/add-line-items-to-the-schedule-of-values | Prime Contracts |
| 6 | Edit the Schedule of Values | https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/edit-the-schedule-of-values | Prime Contracts |
| 7 | Delete a Line Item from the Schedule of Values | https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/delete-a-line-item-from-the-schedule-of-values | Prime Contracts |
| 8 | Create a Prime Contract Change Order | https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/create-a-prime-contract-change-order | Prime Contracts |
| 9 | Approve a Prime Contract Change Order | https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/approve-a-prime-contract-change-order | Prime Contracts |
| 10 | Reject a Prime Contract Change Order | https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/reject-a-prime-contract-change-order | Prime Contracts |
| 11 | Create a Payment Application | https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/create-a-payment-application | Prime Contracts |
| 12 | Delete a Payment Application | https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/delete-a-payment-application | Prime Contracts |
| 13 | Record a Payment Received | https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/record-a-payment-received | Prime Contracts |
| 14 | Configure Advanced Settings: Prime Contracts | https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/configure-advanced-settings-prime-contracts | Prime Contracts |
| 15 | Permissions Matrix — Prime Contracts | https://v2.support.procore.com/process-guides/permissions-matrix/project-level-prime-contracts-permissions | Prime Contracts |
| 16 | Add an Attachment to a Prime Contract | https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/add-an-attachment-to-a-prime-contract | Prime Contracts |
| 17 | Email a Prime Contract | https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/email-a-prime-contract | Prime Contracts |
| 18 | Export a Prime Contract as PDF | https://v2.support.procore.com/product-manuals/prime-contracts-project/tutorials/export-a-prime-contract-as-a-pdf | Prime Contracts |
| 19 | Codebase — API routes | `/frontend/src/app/api/projects/[projectId]/contracts/` | Implementation |
| 20 | Codebase — List page | `/frontend/src/app/(main)/[projectId]/prime-contracts/page.tsx` | Implementation |
| 21 | Codebase — Detail page | `/frontend/src/app/(main)/[projectId]/prime-contracts/[contractId]/page.tsx` | Implementation |
| 22 | Codebase — Validation schema | `/frontend/src/app/api/projects/[projectId]/contracts/validation.ts` | Implementation |

---

## Testing Session Log

| Date | Tester | Environment | Pass | Fail | Skip | Notes |
|------|--------|-------------|------|------|------|-------|
| | | localhost:3000 | | | | |
