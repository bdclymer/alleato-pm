# Change Events — Procore Feature Test Matrix

**Generated:** 2026-04-07
**Source:** Procore documentation (Supabase RAG — 40 docs retrieved)
**Tool:** change-events
**Purpose:** Comprehensive testing checklist to verify all Procore features are
             implemented and working in Alleato PM.

---

## How to Use This Document

- Work through each section systematically
- Mark each test: ✅ Pass | ❌ Fail | ⏭️ Skip (not applicable) | 🔲 Not tested
- For failures, note the issue in the "Notes" column
- Priority: HIGH items block release; MEDIUM reduce quality; LOW are polish

---

## Summary

| Category | # Tests | Priority |
|----------|---------|---------|
| Core Actions | 16 | HIGH |
| Views & Navigation | 9 | HIGH |
| Fields & Data | 13 | HIGH |
| Statuses & Workflows | 8 | HIGH |
| Collaboration | 2 | MEDIUM |
| Permissions | 1 | MEDIUM |
| Integrations | 7 | MEDIUM |
| Settings & Config | 1 | LOW |
| Reporting & Export | 3 | MEDIUM |
| Advanced Features | 10 | MEDIUM |
| **TOTAL** | **70** | |

---

## 1. Core Actions

> Source: Procore Change Events documentation (Create Change Events, Edit a Change Event, Delete a Change Event, Delete Change Events, Clone Change Events)

### 1.1 Create

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.1.1 | Create a change event with required fields only | 1. Navigate to /67/change-events<br>2. Click "Create"<br>3. Fill Title, Type, Scope<br>4. Submit | New change event appears in list with auto-generated number (e.g. "001") and status "Open" | HIGH | 🔲 | |
| 1.1.2 | Create a change event with all optional fields | Fill all fields: Title, Type, Status, Scope, Origin, Change Reason, Expecting Revenue, Line Item Revenue Source, Prime Contract, Description | All fields persisted; detail view shows every entered value | MEDIUM | 🔲 | |
| 1.1.3 | Create fails when title is missing | Leave Title blank, fill Type and Scope, click Save | Validation error on Title field; form not submitted | HIGH | 🔲 | |
| 1.1.4 | Auto-number increments sequentially | Create two change events in succession | First gets "001", second gets "002"; no duplicates | HIGH | 🔲 | |
| 1.1.5 | Create with Expecting Revenue = false | Uncheck "Expecting Revenue" during create | Saved with expecting_revenue=false; Revenue ROM shows $0 | MEDIUM | 🔲 | |
| 1.1.6 | Create with line items | Add a line item (budget code, description, cost ROM) during create | Change event created; line item appears in expanded row and detail view | HIGH | 🔲 | |
| 1.1.7 | Create with attachments | Attach a file during create | Attachment visible in General tab after creation | MEDIUM | 🔲 | |

### 1.2 Edit

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.2.1 | Edit header fields | Open detail, click Edit, change Title and Scope, Save | Changes persist after page refresh | HIGH | 🔲 | |
| 1.2.2 | Cancel edit discards changes | Click Edit, change Title, click Cancel Edit | Original title shown; no data changed | HIGH | 🔲 | |
| 1.2.3 | Edit from list row action menu | Hover row → action menu → Edit | Opens edit mode for that change event | MEDIUM | 🔲 | |
| 1.2.4 | Edit opens pre-filled with saved values | Create a record with known values, click Edit | All dropdowns show previously saved values; no blank "Select..." placeholders | HIGH | 🔲 | |

### 1.3 Delete

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.3.1 | Delete (soft) a single change event | Row action menu → Delete → Confirm | Disappears from active list; appears in Recycle Bin tab | HIGH | 🔲 | |
| 1.3.2 | Delete from detail page | Detail action menu → Delete → Confirm | Redirected to list; record not in active tabs | HIGH | 🔲 | |
| 1.3.3 | Cancel delete leaves record intact | Click Delete → Cancel in dialog | Record remains in list unchanged | HIGH | 🔲 | |
| 1.3.4 | Bulk delete multiple change events | Select 2+ records, click bulk delete, confirm | All selected moved to Recycle Bin; toast shows count | HIGH | 🔲 | |

### 1.4 Clone

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.4.1 | Clone a change event | Open change event → action menu → Clone | New change event created with "(Copy)" title and incremented number; all fields match original | MEDIUM | 🔲 | |

---

## 2. Views & Navigation

> Source: Change Events list page, tabs, and detail view

### 2.1 List View & Tabs

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.1.1 | List view loads with correct columns | Navigate to /67/change-events | Table renders with columns: #, Title, Status, Scope, Type, Change Reason, Origin, Revenue (Prime PCO), Cost ROM, Commitment, Created At | HIGH | 🔲 | |
| 2.1.2 | Line Items tab filters correctly | Click "Line Items" tab | Only change events with ≥1 line item shown; tab shows count badge | HIGH | 🔲 | |
| 2.1.3 | No Line Items tab filters correctly | Click "No Line Items" tab | Only change events with 0 line items shown | HIGH | 🔲 | |
| 2.1.4 | RFQs tab shows events with an RFQ | Click "RFQs" tab | Only change events with an associated RFQ shown | MEDIUM | 🔲 | |
| 2.1.5 | Recycle Bin tab shows soft-deleted events | Delete a record, click "Recycle Bin" tab | Deleted event appears here; active events do not | HIGH | 🔲 | |

### 2.2 Detail View

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.2.1 | Detail view loads all tabs | Click any change event row | Tabs shown: General, Prime Contract Change Orders, Related Items, Comments, Emails, Change History | HIGH | 🔲 | |
| 2.2.2 | Card view renders | Switch to card view | Each event displayed as a card with key fields | MEDIUM | 🔲 | |
| 2.2.3 | List view renders | Switch to list view | Each event displayed as a compact row | MEDIUM | 🔲 | |

### 2.3 Expanded Row

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.3.1 | Expand row to see line items | Click expand toggle on a row with line items | Sub-table shows: budget code, description, cost ROM, revenue ROM, vendor, commitment | HIGH | 🔲 | |

---

## 3. Fields & Data

> Source: Procore Change Events schema and Create/Edit tutorials

### 3.1 Create / Edit Form Fields

| # | Field | Type | Required | Test: Accepts Valid Input | Test: Rejects Invalid | Priority | Result |
|---|-------|------|---------|--------------------------|----------------------|---------|--------|
| 3.1.1 | Status | Dropdown | No | Open, Pending, Closed, Void all selectable | — | HIGH | 🔲 |
| 3.1.2 | Type | Dropdown | Yes | Owner Change, Design Change, Allowance, Contingency, Scope Gap, TBD, Transfer, Unforeseen Condition, Value Engineering, Owner Requested, Constructability Issue | — | HIGH | 🔲 |
| 3.1.3 | Scope | Dropdown | Yes | TBD, In Scope, Out of Scope, Allowance | — | HIGH | 🔲 |
| 3.1.4 | Origin | Dropdown | No | Internal, RFI, Field, Emails, Meetings, RFI's | — | MEDIUM | 🔲 |
| 3.1.5 | Change Reason | Dropdown | No | Allowance, Back Charge, Client Request, Design Development, Existing Condition | — | MEDIUM | 🔲 |
| 3.1.6 | Line Item Revenue Source | Dropdown | No | Match Revenue to Latest Cost, Enter manually, Quantity x Unit Cost | — | MEDIUM | 🔲 |

### 3.2 Line Items

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.2.1 | Add a line item | Click "Add Line Item", fill description + cost ROM, save | Line item persists; cost reflected in totals | HIGH | 🔲 | |
| 3.2.2 | Edit a line item cost | Edit mode → change cost → save | Updated cost saved; totals recalculate | HIGH | 🔲 | |
| 3.2.3 | Delete a line item | Edit mode → remove line item → save | Line item removed; totals decrease | HIGH | 🔲 | |
| 3.2.4 | Line item links to vendor | Select vendor on line item, save | Vendor name persists after save | MEDIUM | 🔲 | |
| 3.2.5 | Line item links to commitment | Select commitment (subcontract or PO), save | Commitment number/title shown on line item | MEDIUM | 🔲 | |

### 3.3 Markup Calculations

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.3.1 | Markup applied to cost ROM | Ensure vertical markup configured; create CE with line item cost | List total reflects markup on base cost | HIGH | 🔲 | |
| 3.3.2 | Markup not applied when Expecting Revenue = false | Create CE with Expecting Revenue off, add line item | Revenue ROM stays $0.00 | MEDIUM | 🔲 | |

---

## 4. Statuses & Workflows

> Source: Procore Change Events status workflow documentation

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.1.1 | Default status is Open | Create a change event | Status badge shows "Open" | HIGH | 🔲 | |
| 4.1.2 | Submit for Approval (Open → Pending) | Open CE with status Open → action menu → Submit for Approval | Status changes to "Pending"; Approve/Reject options appear | HIGH | 🔲 | |
| 4.1.3 | Approve (Pending → Approved) | Open CE with status Pending → Approve | Status shows "Approved"; Convert to Change Order becomes available | HIGH | 🔲 | |
| 4.1.4 | Reject (Pending → Closed) | Open CE with status Pending → Reject | Status changes to "Closed" | HIGH | 🔲 | |
| 4.1.5 | Close a change event | Open non-closed CE → Close | Status updates to "Closed"; Close option disappears from menu | HIGH | 🔲 | |
| 4.1.6 | Void status via edit | Edit CE → set status "Void" → save | Status shows "Void" on list and detail | MEDIUM | 🔲 | |
| 4.2.1 | Convert approved CE to change order | Approve a CE → Convert to Change Order → complete dialog | Conversion succeeds; Prime Contract Change Orders tab shows linked CO | HIGH | 🔲 | |
| 4.2.2 | Convert option only shown when Approved | Open CE with status Open or Pending → check action menu | "Convert to Change Order" NOT visible | HIGH | 🔲 | |

---

## 5. Collaboration Features

> Source: Add a comment to a Change Event tutorial

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.1.1 | Add a comment | Open CE detail → Comments tab → type comment → submit | Comment appears with author name and timestamp | MEDIUM | 🔲 | |
| 5.2.1 | Email a change event | Detail action menu → Email Change Event → fill recipient → send | Email dialog opens; success shown; no error | MEDIUM | 🔲 | |

---

## 6. Permissions

> Source: Permissions Matrix — Change Events

| # | Test | Role | Action | Expected | Priority | Result | Notes |
|---|------|------|--------|---------|---------|--------|-------|
| 6.1.1 | Read permission: user can view list | Standard user | Navigate to /67/change-events | List loads; no access denied | MEDIUM | 🔲 | |

---

## 7. Integrations & Cross-Tool Links

> Source: Create RFQs from a Change Event, Add a Related Item, Add a Change Event Line Item to Unapproved Commitment, Create a Prime PCO from a Change Event

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.1.1 | Create an RFQ from a change event | Select a CE on list → Send RFQ → fill form → submit | RFQ created; CE appears in RFQs tab with RFQ title | HIGH | 🔲 | |
| 7.1.2 | RFQ requires CE selected | Click Send RFQ without selecting a CE | Error: "Select a change event before sending an RFQ." | HIGH | 🔲 | |
| 7.2.1 | Link a related item to a CE | Detail → Related Items tab → Add → select item | Item appears in Related Items tab | MEDIUM | 🔲 | |
| 7.2.2 | Unlink a related item | Related Items tab → click unlink | Item removed from list | MEDIUM | 🔲 | |
| 7.3.1 | Prime Contract COs tab shows linked COs | Convert CE → open detail → Prime Contract COs tab | Linked CO visible with number and title | HIGH | 🔲 | |
| 7.4.1 | Add CE line items to unapproved PCO | Open CE with line items → add-to-PCO action | Line items linked to PCO; confirmation shown | MEDIUM | 🔲 | |
| 7.5.1 | Change event columns in Budget view | Navigate to Budget tool | Budget view includes Revenue ROM, Cost ROM, Budget Impact columns from change events | MEDIUM | 🔲 | |

---

## 8. Settings & Configuration

> Source: Configure Advanced Settings for a Change Event, Configure Settings: Change Events

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 8.1.1 | Configure change event settings | Navigate to project settings → Change Events | Settings page loads; configuration options available | LOW | 🔲 | |

---

## 9. Reporting & Export

> Source: Codebase — CSV export on list page, CSV/PDF export on detail page

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.1.1 | Export change event list as CSV | List page → click export icon | CSV downloads with columns: #, Title, Status, Scope, Type, Change Reason, Origin, Prime PCO, Cost ROM, Commitment, Created | MEDIUM | 🔲 | |
| 9.1.2 | Export single CE as PDF | Detail → action menu → Export as PDF | PDF downloads with CE details | MEDIUM | 🔲 | |
| 9.1.3 | Export single CE as CSV | Detail → action menu → Export as CSV | CSV downloads with field/value pairs | LOW | 🔲 | |

---

## 10. Advanced Features

> Source: Codebase — search, filter, column visibility, footer totals, change history, attachments

### 10.1 Search

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.1.1 | Search by number | Type a CE number in search box | List filters to matching events | HIGH | 🔲 | |
| 10.1.2 | Search by title | Type part of a title | List filters to matching events in real time | HIGH | 🔲 | |

### 10.2 Filters

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.2.1 | Filter by status | Apply Status = Open filter | Only Open events shown | HIGH | 🔲 | |
| 10.2.2 | Filter by scope | Apply Scope = Out of Scope | Only out-of-scope events shown | MEDIUM | 🔲 | |

### 10.3 Column Visibility

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.3.1 | Toggle column visibility | Hide "Scope" via column selector | Scope column disappears; other columns intact | LOW | 🔲 | |

### 10.4 Grand Totals

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.4.1 | Footer totals update with filters | Apply a filter → check footer | Revenue (Prime PCO), Cost ROM, and Commitment totals reflect only filtered rows | HIGH | 🔲 | |

### 10.5 Change History

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.5.1 | History records status changes | Change CE status → Change History tab | Entry shows: field, old value, new value, who, when | HIGH | 🔲 | |
| 10.5.2 | History records creation | Create CE → Change History tab | "CREATE" entry in history | MEDIUM | 🔲 | |

### 10.6 Attachments

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.6.1 | Upload attachment on detail page | Detail → General tab → upload file | Attachment appears in list with download link | MEDIUM | 🔲 | |
| 10.6.2 | Delete attachment from detail page | Click delete on attachment → confirm | Attachment removed | MEDIUM | 🔲 | |

---

## Sources

| # | Title | URL | Category |
|---|-------|-----|---------|
| 1 | About Change Events - Overview | https://v2.support.procore.com/process-guides/about-change-events | Change Events |
| 2 | About Change Events - Details | https://v2.support.procore.com/process-guides/about-change-events/details | Change Events |
| 3 | About Change Events - Considerations | https://v2.support.procore.com/process-guides/about-change-events/considerations | Change Events |
| 4 | About Change Events - Common Questions | https://v2.support.procore.com/process-guides/about-change-events/common-questions | Change Events |
| 5 | Create Change Events | https://v2.support.procore.com/product-manuals/change-events-project/tutorials/create-change-events | Change Events |
| 6 | Edit a Change Event | https://v2.support.procore.com/product-manuals/change-events-project/tutorials/edit-a-change-event | Change Events |
| 7 | Delete a Change Event | https://v2.support.procore.com/product-manuals/change-events-project/tutorials/delete-a-change-event | Change Events |
| 8 | Delete Change Events | https://v2.support.procore.com/product-manuals/change-events-project/tutorials/delete-change-events | Change Events |
| 9 | Clone Change Events | https://v2.support.procore.com/product-manuals/change-events-project/tutorials/clone-change-events | Change Events |
| 10 | Add Change Event Line Items | https://v2.support.procore.com/product-manuals/change-events-project/tutorials/add-line-items-to-a-change-event | Change Events |
| 11 | Create RFQs from a Change Event | https://v2.support.procore.com/product-manuals/change-events-project/tutorials/create-rfqs-from-a-change-event | Change Events |
| 12 | Add a Related Item to a Change Event | https://v2.support.procore.com/product-manuals/change-events-project/tutorials/add-a-related-item-to-a-change-event | Change Events |
| 13 | Add a comment to a Change Event | https://v2.support.procore.com/product-manuals/change-events-project/tutorials/Add_a_comment_to_a_Change_Event | Change Events |
| 14 | Create a Prime PCO from a Change Event | https://v2.support.procore.com/product-manuals/change-events-project/tutorials/create-a-prime-potential-change-order-from-a-change-event | Change Events |
| 15 | Create a Prime Contract Change Order from a Change Event | https://v2.support.procore.com/product-manuals/change-events-project/tutorials/create-a-prime-contract-change-order-from-a-change-event | Change Events |
| 16 | Create a Commitment Change Order from a Change Event | https://v2.support.procore.com/product-manuals/change-events-project/tutorials/create-a-commitment-change-order-from-a-change-event | Change Events |
| 17 | Create a Commitment Potential Change Order from a Change Event | https://v2.support.procore.com/product-manuals/change-events-project/tutorials/create-a-commitment-potential-change-order-from-a-change-event | Change Events |
| 18 | Add a Change Event Line Item to an Unapproved Commitment | https://v2.support.procore.com/product-manuals/change-events-project/tutorials/add-a-change-event-line-item-to-an-unapproved-commitment | Change Events |
| 19 | Add a Change Event Line Item to an Unapproved Commitment CO | https://v2.support.procore.com/product-manuals/change-events-project/tutorials/add-a-change-event-line-item-to-an-unapproved-commitment-co | Change Events |
| 20 | Add a Change Event Line Item to an Unapproved Prime PCO | https://v2.support.procore.com/product-manuals/change-events-project/tutorials/add-a-change-event-line-item-to-an-unapproved-prime-pco | Change Events |
| 21 | Configure Advanced Settings for a Change Event | https://v2.support.procore.com/product-manuals/change-events-project/tutorials/Configure_Advanced_Settings_for_a_Change_Event | Change Events |
| 22 | Configure Settings: Change Events | https://v2.support.procore.com/product-manuals/change-events-project/tutorials/configure-advanced-settings-change-events | Change Events |
| 23 | Create a Budget Modification from a Change Event | https://v2.support.procore.com/product-manuals/change-events-project/tutorials/create-a-budget-modification-from-a-change-event | Change Events |
| 24 | Add the Change Events Columns to a Budget View | https://v2.support.procore.com/product-manuals/change-events-project/tutorials/add-the-change-events-columns-to-a-budget-view-including-revenue-rom | Change Events |
| 25 | Permissions Matrix - Change Events | https://v2.support.procore.com/process-guides/permissions-matrix/project-level-change-events-permissions | Change Events |
| 26 | Change Events (Reference) | https://v2.support.procore.com/reference-change-events | Change Events |
| 27 | Commitment Change Events Report | https://v2.support.procore.com/reference-commitment-change-events | Change Events |
| 28 | Create a Change Order from a Change Event | https://v2.support.procore.com/product-manuals/change-orders-project/tutorials/create-a-change-order-from-a-change-event | Change Orders |
| 29 | Bulk Create Commitment Change Orders from a Change Event | https://v2.support.procore.com/product-manuals/change-events-project/tutorials/bulk-create-commitment-change-orders-from-a-change-event | Change Orders |
| 30 | Create a Change Event from an RFI | https://v2.support.procore.com/product-manuals/rfi-project/tutorials/create-a-change-event-from-an-rfi | RFI |

---

## Testing Session Log

| Date | Tester | Environment | Pass | Fail | Skip | Notes |
|------|--------|-------------|------|------|------|-------|
| | | localhost:3000 | | | | |
