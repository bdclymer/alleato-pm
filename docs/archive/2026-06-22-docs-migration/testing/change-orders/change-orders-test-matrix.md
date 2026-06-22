# Change Orders — Procore Feature Test Matrix

**Generated:** 2026-04-08

## Summary

| Category | # Tests | Priority |
|----------|---------|---------|
| Core Actions | 22 | HIGH |
| Views & Navigation | 11 | HIGH |
| Fields & Data | 19 | HIGH |
| Statuses & Workflows | 10 | HIGH |
| Collaboration | 2 | MEDIUM |
| Permissions | 2 | MEDIUM |
| Integrations & Cross-Tool Links | 8 | MEDIUM |
| Settings & Configuration | 1 | LOW |
| Reporting & Export | 4 | MEDIUM |
| Advanced Features | 11 | MEDIUM |
| **TOTAL** | **90** | |

---

## 1. Core Actions

> Source: Codebase — prime/new/page.tsx, commitment/new/page.tsx, prime/[primeCoId]/page.tsx, commitment/[commitmentCoId]/page.tsx, API routes

### 1.1 Create — Prime Contract Change Order

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.1.1 | Create a prime CO with required fields only | 1. Navigate to /767/change-orders<br>2. Click "New Prime Contract CO"<br>3. Fill PCCO Number and Title<br>4. Click Create | New PCCO appears in Prime Contract tab with status "Proposed" | HIGH | 🔲 | |
| 1.1.2 | Create a prime CO with all optional fields | Fill PCCO Number, Title, Status, Contract, Contract Company, Revision, Change Reason, Description, Amount, Schedule Impact, Location, Reference, Due Date, Executed, Field Change, Paid In Full, Private, Signed CO Received Date, Request Received From | All fields persisted; detail view shows every entered value | MEDIUM | 🔲 | |
| 1.1.3 | Create fails when PCCO Number is missing | Leave PCCO Number blank, fill Title, click Create | Validation error on PCCO Number field; form not submitted | HIGH | 🔲 | |
| 1.1.4 | Create fails when Title is missing | Leave Title blank, fill PCCO Number, click Create | Validation error on Title field; form not submitted | HIGH | 🔲 | |
| 1.1.5 | Cancel create returns to Prime tab | Fill partial form, click Cancel | Navigates to /767/change-orders?tab=prime; no record created | HIGH | 🔲 | |
| 1.1.6 | Create with Amount = 0 | Leave amount at default $0.00, submit | PCCO created; amount shows $0.00 on list and detail | MEDIUM | 🔲 | |

### 1.2 Create — Commitment Change Order

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.2.1 | Create a commitment CO with required fields | 1. Navigate to /767/change-orders?tab=commitment<br>2. Click "New Commitment CO"<br>3. Select Contract, fill CO Number and Description<br>4. Click Create | New commitment CO appears in Commitments tab; success toast shown | HIGH | 🔲 | |
| 1.2.2 | Create fails when Contract not selected | Leave Contract blank, fill other fields, click Create | Validation error on Contract field; form not submitted | HIGH | 🔲 | |
| 1.2.3 | Create fails when CO Number is missing | Leave CO Number blank, select Contract, fill Description | Validation error on CO Number; form not submitted | HIGH | 🔲 | |
| 1.2.4 | Create fails when Description is missing | Leave Description blank, fill other required fields | Validation error on Description field; form not submitted | HIGH | 🔲 | |
| 1.2.5 | Contract dropdown loads available contracts | Navigate to /767/change-orders/commitment/new | Contract dropdown lists project's prime contracts; each shows contract number and title | HIGH | 🔲 | |
| 1.2.6 | Cancel create returns to Commitment tab | Fill partial form, click Cancel | Navigates to /767/change-orders?tab=commitment; no record created | HIGH | 🔲 | |

### 1.3 Edit — Prime Contract CO

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.3.1 | Edit header fields via detail page Edit button | Open prime CO detail → click Edit → change Title and Contract Company → Save Changes | Changes persist after page refresh | HIGH | 🔲 | |
| 1.3.2 | Edit opens pre-filled with all saved values | Create a prime CO with known values → click Edit | All fields show previously saved values; no blank "Select..." placeholders | HIGH | 🔲 | |
| 1.3.3 | Edit via row action menu | Hover row → action menu → Edit | Opens edit mode for that prime CO (URL has ?edit=1) | MEDIUM | 🔲 | |
| 1.3.4 | Cancel edit discards changes | Click Edit → change Title → click Cancel | Original title shown; data unchanged | HIGH | 🔲 | |
| 1.3.5 | Edit all advanced fields (flags section) | Edit mode → check Private, Executed, Field Change, Paid In Full → Save | All four flags persisted; detail view reflects updated values | MEDIUM | 🔲 | |

### 1.4 Edit — Commitment CO

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.4.1 | Edit commitment CO fields | Open commitment CO detail → click Edit → change Description and Amount → Save | Changes persist on detail and list | HIGH | 🔲 | |
| 1.4.2 | Edit commitment CO status | Edit mode → change status to "approved" → Save | Status badge updates; approved_date populated | HIGH | 🔲 | |

### 1.5 Delete

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.5.1 | Delete a prime CO from detail action menu | Open prime CO detail → action menu → Delete → confirm | Record removed; redirected to /767/change-orders?tab=prime; success toast | HIGH | 🔲 | |
| 1.5.2 | Delete a prime CO from list row action | Row action menu → Delete | Confirmation dialog opens; on confirm record removed from list; success toast | HIGH | 🔲 | |
| 1.5.3 | Delete a commitment CO from list row action | Commitment tab → row action menu → Delete | Confirmation → record removed; success toast | HIGH | 🔲 | |
| 1.5.4 | Delete with missing contract_id shows error | Delete a commitment CO with no contract_id | Toast error: "Missing contract reference" | MEDIUM | 🔲 | |

---

## 2. Views & Navigation

> Source: change-orders-client.tsx, change-orders-table-config.tsx

### 2.1 List View & Tabs

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.1.1 | Prime Contract tab loads correct columns | Navigate to /767/change-orders | Table renders with columns: #, Title, Status, Amount, Contract Company, Created | HIGH | 🔲 | |
| 2.1.2 | Commitments tab loads correct columns | Click "Commitments" tab | Table renders with columns: #, Description, Status, Amount, Contract Type, Requested Date, Created | HIGH | 🔲 | |
| 2.1.3 | Tab counts show record counts | Navigate to /767/change-orders | Prime Contract tab shows count badge matching total prime COs; Commitments tab shows commitment CO count | HIGH | 🔲 | |
| 2.1.4 | Tab state persists in URL | Click Commitments tab | URL updates to ?tab=commitment; refreshing page stays on Commitments tab | HIGH | 🔲 | |

### 2.2 Detail View — Prime CO

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.2.1 | Detail view loads all tabs | Click any prime CO row | Tabs shown: General, Related Items (0), Emails (0), Change History | HIGH | 🔲 | |
| 2.2.2 | General tab shows all detail fields | Open prime CO detail → General tab | Shows: #, Title, Status, Contract Company, Contract (linked), Change Reason, Description, Amount, Schedule Impact, Location, Reference, Due Date, flag indicators | HIGH | 🔲 | |
| 2.2.3 | Contract link navigates to Prime Contracts | Open prime CO with linked contract → click contract link | Navigates to /767/prime-contracts/[contractId] | MEDIUM | 🔲 | |
| 2.2.4 | Line items section visible on General tab | Open prime CO detail with line items | Line items sub-table shows: description, qty, UOM, unit cost, amount, cost code | HIGH | 🔲 | |

### 2.3 View Modes

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.3.1 | Table view renders | Default load of /767/change-orders | Rows in table format with sortable columns | HIGH | 🔲 | |
| 2.3.2 | Card view renders | Switch to card view via toolbar | Each CO shown as a card: #, title, status badge, amount | MEDIUM | 🔲 | |
| 2.3.3 | List view renders | Switch to list view via toolbar | Each CO shown as compact row: #, title, amount, status badge | MEDIUM | 🔲 | |

---

## 3. Fields & Data

> Source: prime/new/page.tsx, prime/[primeCoId]/page.tsx, commitment/new/page.tsx, commitment/[commitmentCoId]/page.tsx, change-orders-table-config.tsx

### 3.1 Prime Contract CO — Create/Edit Form Fields

| # | Field | Type | Required | Test: Accepts Valid Input | Test: Rejects Invalid | Priority | Result |
|---|-------|------|---------|--------------------------|----------------------|---------|--------|
| 3.1.1 | PCCO Number | Text | Yes | Any alphanumeric string (e.g. "001776") | Blank → validation error | HIGH | 🔲 |
| 3.1.2 | Title | Text | Yes | Free text up to 255 chars | Blank → validation error | HIGH | 🔲 |
| 3.1.3 | Status | Dropdown | No | Draft, Proposed, Approved, Rejected, Executed, Void | — | HIGH | 🔲 |
| 3.1.4 | Contract | Dropdown | No | Lists project's prime contracts by number + title | — | MEDIUM | 🔲 |
| 3.1.5 | Contract Company | Text | No | Free text (e.g. "Vargo, LLC") | — | MEDIUM | 🔲 |
| 3.1.6 | Revision | Number | No | Integer (0, 1, 2…) | — | MEDIUM | 🔲 |
| 3.1.7 | Change Reason | Dropdown | No | Client Request, Design Error, Design Omission, Field Condition, Owner Request, Regulatory Requirement, Scope Change, Unforeseen Condition, Value Engineering, Other | — | MEDIUM | 🔲 |
| 3.1.8 | Description | Textarea | No | Multi-line free text | — | MEDIUM | 🔲 |
| 3.1.9 | Amount ($) | Number | No | Any decimal ≥ 0 (e.g. 12500.00) | — | HIGH | 🔲 |
| 3.1.10 | Schedule Impact (days) | Number | No | Positive or negative integer | — | LOW | 🔲 |
| 3.1.11 | Due Date | Date | No | Valid date (date picker) | — | MEDIUM | 🔲 |
| 3.1.12 | Signed CO Received Date | Date | No | Valid date | — | LOW | 🔲 |
| 3.1.13 | Request Received From | Text | No | Free text | — | LOW | 🔲 |
| 3.1.14 | Location | Text | No | Free text | — | LOW | 🔲 |
| 3.1.15 | Reference | Text | No | Free text (e.g. ref number) | — | LOW | 🔲 |
| 3.1.16 | Private (flag) | Checkbox | No | Checked/Unchecked — saved correctly | — | MEDIUM | 🔲 |
| 3.1.17 | Executed (flag) | Checkbox | No | Checked/Unchecked | — | MEDIUM | 🔲 |
| 3.1.18 | Field Change (flag) | Checkbox | No | Checked/Unchecked | — | LOW | 🔲 |
| 3.1.19 | Paid In Full (flag) | Checkbox | No | Checked/Unchecked | — | LOW | 🔲 |

### 3.2 Commitment CO — Create/Edit Form Fields

| # | Field | Type | Required | Test: Accepts Valid Input | Test: Rejects Invalid | Priority | Result |
|---|-------|------|---------|--------------------------|----------------------|---------|--------|
| 3.2.1 | Contract | Dropdown | Yes | Selects from project prime contracts | Blank → validation error | HIGH | 🔲 |
| 3.2.2 | CO Number | Text | Yes | Alphanumeric (e.g. "001816") | Blank → validation error | HIGH | 🔲 |
| 3.2.3 | Description | Textarea | Yes | Free text description | Blank → validation error | HIGH | 🔲 |
| 3.2.4 | Amount ($) | Number | No | Positive decimal (e.g. 5000.00) | — | HIGH | 🔲 |
| 3.2.5 | Status (edit only) | Dropdown | No | pending, approved, rejected | — | HIGH | 🔲 |

### 3.3 Prime CO Line Items

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.3.1 | Line items show on General tab | Open prime CO detail that has line items | Line items table shows: description, quantity, UOM, unit cost, line amount, cost code | HIGH | 🔲 | |
| 3.3.2 | Line items total shown separately from CO amount | Open prime CO detail with line items | Line Items Total and CO Amount shown; variance calculated as CO Amount − Line Items Total | MEDIUM | 🔲 | |
| 3.3.3 | Empty line items shows empty state | Open prime CO with no line items | Empty state message shown in line items section | MEDIUM | 🔲 | |

---

## 4. Statuses & Workflows

> Source: prime/[primeCoId]/page.tsx — handleApprove, handleReject; API routes /approve, /reject; commitment/[commitmentCoId]/page.tsx editSchema

### 4.1 Prime Contract CO Status Workflow

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.1.1 | Default status on create is "Proposed" | Navigate to /767/change-orders/prime/new → check Status dropdown | Default status pre-selected as "Proposed" | HIGH | 🔲 | |
| 4.1.2 | All status options available in dropdown | Edit a prime CO → open Status dropdown | Options: Draft, Proposed, Approved, Rejected, Executed, Void | HIGH | 🔲 | |
| 4.1.3 | Approve action (via action button) | Open prime CO detail → action menu → Approve | POST to /approve; status updates to "Approved"; approved_at populated; success toast | HIGH | 🔲 | |
| 4.1.4 | Reject action requires rejection reason | Open prime CO detail → action menu → Reject | Reject dialog appears; clicking Reject with empty reason shows error "Rejection reason is required" | HIGH | 🔲 | |
| 4.1.5 | Reject action with reason succeeds | Enter rejection reason → click Reject in dialog | POST to /reject with reason; status updates to "Rejected"; dialog closes; success toast | HIGH | 🔲 | |
| 4.1.6 | Status badge reflects correct color | View prime CO with each status | "Draft" → neutral; "Proposed" → warning/pending; "Approved" → success; "Rejected" → destructive; "Executed" → success; "Void" → muted | HIGH | 🔲 | |

### 4.2 Commitment CO Status Workflow

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.2.1 | Approve a commitment CO | Open commitment CO detail → action menu → Approve | POST to /approve; status updates to "Approved"; approved_by and approved_date populated | HIGH | 🔲 | |
| 4.2.2 | Reject a commitment CO | Open commitment CO detail → action menu → Reject → provide reason → confirm | Status updates to "Rejected"; rejection_reason saved | HIGH | 🔲 | |
| 4.2.3 | Commitment CO status options in edit | Edit commitment CO → Status dropdown | Options: pending, approved, rejected | HIGH | 🔲 | |
| 4.2.4 | "Submitted" status normalized to "Pending" in UI | Create a commitment CO with status "submitted" | UI displays "Pending" in StatusBadge (normalized via statusLabel helper) | MEDIUM | 🔲 | |

---

## 5. Collaboration Features

> Source: prime/[primeCoId]/page.tsx — Emails tab; detail tabs structure

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.1.1 | Emails tab loads on prime CO detail | Open prime CO detail → click Emails tab | Emails tab content renders; count shown in tab label | MEDIUM | 🔲 | |
| 5.2.1 | Related Items tab loads on prime CO detail | Open prime CO detail → click Related Items tab | Related Items tab renders; count shown in tab label (initially 0) | MEDIUM | 🔲 | |

---

## 6. Permissions

> Source: Procore Permissions Matrix — Change Orders

| # | Test | Role | Action | Expected | Priority | Result | Notes |
|---|------|------|--------|---------|---------|--------|-------|
| 6.1.1 | Read-only user can view list | Standard user | Navigate to /767/change-orders | List loads; no access denied message | MEDIUM | 🔲 | |
| 6.1.2 | Read-only user cannot see Create button | Standard user with view-only access | Navigate to /767/change-orders | "New Prime Contract CO" and "New Commitment CO" buttons are hidden | MEDIUM | 🔲 | |

---

## 7. Integrations & Cross-Tool Links

> Source: change-orders-client.tsx, prime/[primeCoId]/page.tsx, page.tsx (data loading), API routes

### 7.1 Prime Contracts Integration

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.1.1 | Prime CO linked to prime contract | Edit prime CO → select a prime contract → save; open detail | Contract field shows linked contract number and title as clickable link | HIGH | 🔲 | |
| 7.1.2 | Click contract link navigates to prime contract | Open prime CO detail with linked contract → click contract link | Navigates to /767/prime-contracts/[contractId] | HIGH | 🔲 | |
| 7.1.3 | Prime CO appears on prime contract detail | Create prime CO linked to a contract; navigate to that prime contract | Prime contract detail shows the linked change order in its list | MEDIUM | 🔲 | |

### 7.2 Commitments Integration

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.2.1 | Commitment CO linked to contract | Create commitment CO → select contract | CO is scoped to the selected contract; contract_id persisted | HIGH | 🔲 | |
| 7.2.2 | Commitment COs appear in Commitments tool | Create a commitment CO; navigate to /767/commitments | The commitment contract shows the change order in its detail | MEDIUM | 🔲 | |

### 7.3 Change Events Integration

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.3.1 | Change event converting to prime CO creates record | In Change Events, approve a CE and convert to Change Order | New prime CO record appears in /767/change-orders with linked data from CE | HIGH | 🔲 | |
| 7.3.2 | Change Orders list shows COs created from change events | Navigate to /767/change-orders after CE conversion | Newly created CO visible in Prime Contract tab | MEDIUM | 🔲 | |

### 7.4 Financial Summary

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.4.1 | Approved prime CO impacts prime contract value | Approve a prime CO with amount | Prime contract revised_contract_value reflects the added CO amount | MEDIUM | 🔲 | |

---

## 8. Settings & Configuration

> Source: Procore Change Orders settings documentation

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 8.1.1 | Change Orders settings page accessible | Navigate to project settings → Change Orders section | Settings panel loads; configuration options visible | LOW | 🔲 | |

---

## 9. Reporting & Export

> Source: page-actions.tsx (Export CSV button), prime/[primeCoId]/page.tsx (detail export), API routes /export

### 9.1 List Export

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.1.1 | Export prime contract COs as CSV | /767/change-orders → Prime Contract tab → click "Export CSV" | CSV downloads as "prime-contract-change-orders.csv"; contains all prime CO rows with relevant columns | MEDIUM | 🔲 | |
| 9.1.2 | Export commitment COs as CSV | /767/change-orders?tab=commitment → click "Export CSV" | CSV downloads as "commitment-change-orders.csv"; contains all commitment CO rows | MEDIUM | 🔲 | |

### 9.2 Detail Export

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.2.1 | Export single prime CO as CSV from detail | Open prime CO detail → action menu → Export CSV | CSV downloads with prime CO field/value pairs | MEDIUM | 🔲 | |
| 9.2.2 | Export button not visible on mobile | View /767/change-orders on mobile viewport (<768px) | Export CSV button hidden; only primary create button shown as icon | LOW | 🔲 | |

---

## 10. Advanced Features

> Source: change-orders-client.tsx (search, filters, column visibility, totals, selection), prime/[primeCoId]/page.tsx (change history, attachments)

### 10.1 Search

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.1.1 | Search prime COs by number | Type a PCCO number in search box | List filters to matching prime COs in real time | HIGH | 🔲 | |
| 10.1.2 | Search prime COs by title | Type part of a title | List filters to matching COs | HIGH | 🔲 | |
| 10.1.3 | Search commitment COs by CO number | Switch to Commitments tab → type CO number | List filters to matching commitment COs | HIGH | 🔲 | |
| 10.1.4 | Search commitment COs by description | Type part of description | List filters to matching COs | HIGH | 🔲 | |

### 10.2 Filters

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.2.1 | Filter prime COs by status = Approved | Apply Status = Approved filter | Only Approved prime COs shown | HIGH | 🔲 | |
| 10.2.2 | Filter prime COs by status = Proposed | Apply Status = Proposed filter | Only Proposed COs shown (includes "pending"/"submitted" normalized values) | HIGH | 🔲 | |
| 10.2.3 | Filter prime COs by Executed = Yes | Apply Executed = Executed filter | Only prime COs with executed=true shown | MEDIUM | 🔲 | |
| 10.2.4 | Filter commitment COs by status | Commitments tab → apply Status = Approved | Only approved commitment COs shown | HIGH | 🔲 | |
| 10.2.5 | Clear filters restores full list | Apply a filter → click Clear Filters | All records shown again; filter badge cleared | HIGH | 🔲 | |

### 10.3 Column Visibility

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.3.1 | Toggle column visibility — prime tab | Prime tab → column selector → hide "Contract Company" | Contract Company column disappears; other columns intact | LOW | 🔲 | |
| 10.3.2 | Show hidden column (Revision) | Prime tab → column selector → enable "Revision" | Revision column appears in table | LOW | 🔲 | |

### 10.4 Grand Totals

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.4.1 | Footer total on prime tab reflects filtered rows | Prime tab → apply status filter → check footer | Amount total reflects only filtered prime COs | HIGH | 🔲 | |
| 10.4.2 | Footer total on commitment tab reflects filtered rows | Commitment tab → apply filter → check footer | Amount total reflects only filtered commitment COs | HIGH | 🔲 | |

### 10.5 Attachments (Prime CO)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.5.1 | Upload attachment on prime CO detail | Open prime CO detail → General tab → upload file button | File uploads; attachment appears with name, size, and download link | MEDIUM | 🔲 | |
| 10.5.2 | Delete attachment from prime CO detail | Click delete on attachment | Confirmation shown; attachment removed from list | MEDIUM | 🔲 | |

### 10.6 Change History

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.6.1 | Change History tab loads on prime CO detail | Open prime CO detail → click Change History tab | Tab content renders; history entries shown (or empty state if no changes) | MEDIUM | 🔲 | |

### 10.7 Mobile Responsiveness

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.7.1 | List auto-switches to list view on mobile | Load /767/change-orders on mobile viewport (<768px) | View automatically switches from "table" to "list"; card/table toggle hidden | HIGH | 🔲 | |

### 10.8 Row Selection

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.8.1 | Select individual rows | Check checkboxes on 2–3 rows | Selected count shown in toolbar | MEDIUM | 🔲 | |
| 10.8.2 | Select all rows | Click select-all checkbox in header | All visible rows selected; count updates | MEDIUM | 🔲 | |
| 10.8.3 | Deselect all rows | With rows selected, click select-all again | All rows deselected; count resets to 0 | MEDIUM | 🔲 | |

---

## Sources

| # | Title | URL | Category |
|---|-------|-----|---------|
| 1 | About Change Orders — Overview | https://v2.support.procore.com/process-guides/about-change-orders | Change Orders |
| 2 | Create a Prime Contract Change Order | https://v2.support.procore.com/product-manuals/change-orders-project/tutorials/create-a-prime-contract-change-order | Change Orders |
| 3 | Edit a Prime Contract Change Order | https://v2.support.procore.com/product-manuals/change-orders-project/tutorials/edit-a-prime-contract-change-order | Change Orders |
| 4 | Delete a Prime Contract Change Order | https://v2.support.procore.com/product-manuals/change-orders-project/tutorials/delete-a-prime-contract-change-order | Change Orders |
| 5 | Approve a Prime Contract Change Order | https://v2.support.procore.com/product-manuals/change-orders-project/tutorials/approve-a-prime-contract-change-order | Change Orders |
| 6 | Reject a Prime Contract Change Order | https://v2.support.procore.com/product-manuals/change-orders-project/tutorials/reject-a-prime-contract-change-order | Change Orders |
| 7 | Create a Commitment Change Order | https://v2.support.procore.com/product-manuals/change-orders-project/tutorials/create-a-commitment-change-order | Change Orders |
| 8 | Edit a Commitment Change Order | https://v2.support.procore.com/product-manuals/change-orders-project/tutorials/edit-a-commitment-change-order | Change Orders |
| 9 | Delete a Commitment Change Order | https://v2.support.procore.com/product-manuals/change-orders-project/tutorials/delete-a-commitment-change-order | Change Orders |
| 10 | Approve a Commitment Change Order | https://v2.support.procore.com/product-manuals/change-orders-project/tutorials/approve-a-commitment-change-order | Change Orders |
| 11 | Reject a Commitment Change Order | https://v2.support.procore.com/product-manuals/change-orders-project/tutorials/reject-a-commitment-change-order | Change Orders |
| 12 | Create a Change Order from a Change Event | https://v2.support.procore.com/product-manuals/change-orders-project/tutorials/create-a-change-order-from-a-change-event | Change Orders |
| 13 | Permissions Matrix — Change Orders | https://v2.support.procore.com/process-guides/permissions-matrix/project-level-change-orders-permissions | Change Orders |
| 14 | Change Orders (Reference) | https://v2.support.procore.com/reference-change-orders | Change Orders |
| 15 | Codebase: change-orders-client.tsx | frontend/src/app/(main)/[projectId]/change-orders/change-orders-client.tsx | Implementation |
| 16 | Codebase: change-orders-table-config.tsx | frontend/src/features/change-orders/change-orders-table-config.tsx | Implementation |
| 17 | Codebase: prime/new/page.tsx | frontend/src/app/(main)/[projectId]/change-orders/prime/new/page.tsx | Implementation |
| 18 | Codebase: prime/[primeCoId]/page.tsx | frontend/src/app/(main)/[projectId]/change-orders/prime/[primeCoId]/page.tsx | Implementation |
| 19 | Codebase: commitment/new/page.tsx | frontend/src/app/(main)/[projectId]/change-orders/commitment/new/page.tsx | Implementation |
| 20 | Codebase: commitment/[commitmentCoId]/page.tsx | frontend/src/app/(main)/[projectId]/change-orders/commitment/[commitmentCoId]/page.tsx | Implementation |
| 21 | Codebase: page-actions.tsx | frontend/src/app/(main)/[projectId]/change-orders/page-actions.tsx | Implementation |
| 22 | API: /prime-contract-change-orders | frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/ | API |
| 23 | API: /prime-contract-change-orders/[primeCoId]/approve | frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/approve/ | API |
| 24 | API: /prime-contract-change-orders/[primeCoId]/reject | frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/reject/ | API |
| 25 | API: /prime-contract-change-orders/[primeCoId]/attachments | frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/[primeCoId]/attachments/ | API |
| 26 | API: /prime-contract-change-orders/export | frontend/src/app/api/projects/[projectId]/prime-contract-change-orders/export/ | API |
| 27 | API: /commitment-change-orders/export | frontend/src/app/api/projects/[projectId]/commitment-change-orders/export/ | API |
| 28 | API: /contracts/[contractId]/change-orders | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/ | API |
| 29 | API: /contracts/[contractId]/change-orders/[changeOrderId]/approve | frontend/src/app/api/projects/[projectId]/contracts/[contractId]/change-orders/[changeOrderId]/approve/ | API |

---

## Testing Session Log

| Date | Tester | Environment | Pass | Fail | Skip | Notes |
|------|--------|-------------|------|------|------|-------|
| | | localhost:3000 | | | | |
