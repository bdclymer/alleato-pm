# Budget — Procore Feature Test Matrix

- **Generated:** 2026-04-07
- **Source:** Procore documentation (Supabase RAG — 52 docs retrieved)

## Summary

| Category | # Tests | Priority |
|----------|---------|---------|
| Core Actions | 21 | HIGH |
| Views & Navigation | 14 | HIGH |
| Fields & Data | 18 | HIGH |
| Statuses & Workflows | 10 | HIGH |
| Budget Changes | 14 | HIGH |
| Forecasting | 10 | MEDIUM |
| Snapshots | 8 | MEDIUM |
| Permissions | 9 | MEDIUM |
| Settings & Config | 6 | MEDIUM |
| Reporting & Export | 11 | MEDIUM |
| Advanced Features | 7 | LOW |
| **TOTAL** | **128** | |

---

## 1. Core Actions

1. Add a Budget Line Item
2. Edit a Budget
3. Delete a Budget Line Item
4. Import a Budget
5. Lock a Budget
6. Unlock a Budget

### 1.1 Create / Add Budget Line Items

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.1.1 | Add a budget line item manually | 1. Navigate to project Budget tool\n2. Click the Budget tab\n3. Click Create → Budget Line Item\n4. Enter Cost Code, Cost Type, Description, Original Budget amount\n5. Click Add | Line item appears in budget table with correct cost code, type, and amount | HIGH | 🔲 | |
| 1.1.2 | Add line item with all optional fields | 1. Click Create → Budget Line Item\n2. Fill in Cost Code, Cost Type, Description, Quantity, Unit of Measure, Unit Cost, Original Budget\n3. Click Add | All fields saved and displayed correctly in the table | MEDIUM | 🔲 | |
| 1.1.3 | Add line item with missing required fields | 1. Click Create → Budget Line Item\n2. Leave Cost Code blank\n3. Click Add | Validation error shown; form not submitted | HIGH | 🔲 | |
| 1.1.4 | Add a partial budget line item | 1. Click Create → Budget Line Item\n2. Enter a partial amount less than the full budget code value\n3. Click Add | Partial line item created; remaining amount tracked correctly | MEDIUM | 🔲 | |
| 1.1.5 | Add multiple line items in sequence | 1. Add first line item\n2. Repeat for 3+ additional line items without navigating away | All line items appear in the budget list in order | HIGH | 🔲 | |

### 1.2 Edit Budget

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.2.1 | Edit an unlocked budget line item | 1. Ensure budget is unlocked\n2. Navigate to Budget tab\n3. Click on a line item's Original Budget value\n4. Change amount\n5. Save | Amount updates and persists after page refresh | HIGH | 🔲 | |
| 1.2.2 | Edit is blocked when budget is locked | 1. Lock the budget\n2. Attempt to edit an Original Budget value | Edit is blocked; field is read-only when locked | HIGH | 🔲 | |
| 1.2.3 | Edit Description field on a line item | 1. Click edit on a line item\n2. Update the description\n3. Save | Description change persists | MEDIUM | 🔲 | |

### 1.3 Delete Budget Line Items

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.3.1 | Delete a line item with $0 original budget | 1. Ensure budget is unlocked\n2. Locate a $0 line item\n3. Click the Delete icon\n4. Confirm | Line item removed from list | HIGH | 🔲 | |
| 1.3.2 | Delete blocked when line item has original budget > $0 | 1. Try to delete a line item with an amount greater than $0 | Delete icon disabled or confirmation blocked with error message | HIGH | 🔲 | |
| 1.3.3 | Delete blocked when budget is locked | 1. Lock the budget\n2. Attempt to delete any line item | Delete action not available; user shown appropriate message | HIGH | 🔲 | |
| 1.3.4 | Delete blocked when line item has a budget change | 1. Create a budget change on a line item\n2. Attempt to delete that line item | Deletion blocked with explanation | HIGH | 🔲 | |

### 1.4 Import Budget

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.4.1 | Import budget via CSV | 1. Navigate to Budget tool\n2. Unlock the budget\n3. Click Import\n4. Download the CSV template\n5. Fill with valid line items\n6. Upload file | Budget line items imported and displayed in the table | HIGH | 🔲 | |
| 1.4.2 | Import overrides existing budget amounts | 1. Import a CSV with updated amounts for existing line items | Existing Budget Amount values overwritten with new values | HIGH | 🔲 | |
| 1.4.3 | Import adds new line items from CSV | 1. Import a CSV containing new cost codes not yet in budget | New line items are added alongside existing ones | HIGH | 🔲 | |
| 1.4.4 | Import with invalid data is rejected | 1. Upload a CSV with missing required columns or invalid values | Error message shown; import aborted | HIGH | 🔲 | |

### 1.5 Lock and Unlock Budget

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.5.1 | Lock a budget | 1. Navigate to Budget tool\n2. Click Lock Budget button | Budget is locked; Original Budget values become read-only; Lock Budget button changes to Unlock Budget | HIGH | 🔲 | |
| 1.5.2 | Unlock a budget (no modifications) | 1. Navigate to a locked budget with no modifications\n2. Click Unlock Budget button | Budget unlocked; Original Budget values become editable | HIGH | 🔲 | |
| 1.5.3 | Unlock blocked when budget modifications exist | 1. Create at least one budget modification on a locked budget\n2. Attempt to unlock | Unlock blocked with message indicating modifications must be deleted first | HIGH | 🔲 | |

---

## 2. Views & Navigation

> Source: Procore Budget documentation — About the Budget Detail Tab, About the Procore Standard Budget View, Apply View/Group/Filter options, Read a Budget

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.1 | Budget tab loads | Navigate to project Budget tool | Budget tab renders with line items in a table; no JS errors | HIGH | 🔲 | |
| 2.2 | Budget tab shows standard columns | 1. Navigate to Budget tool\n2. Apply Procore Standard Budget view | Columns visible: Original Budget, Revised Budget, Projected Budget, Projected Costs, Projected Over/Under, Forecast to Complete, Direct Costs | HIGH | 🔲 | |
| 2.3 | Budget Details tab loads | 1. Navigate to Budget tool\n2. Click Budget Details tab | Budget Detail tab renders with correct columns including Pending Budget Changes and Pending Cost Changes | HIGH | 🔲 | |
| 2.4 | Budget Changes tab loads | 1. Navigate to Budget tool\n2. Click Budget Changes tab | List of budget changes displayed with Change #, status, date | HIGH | 🔲 | |
| 2.5 | Change History tab loads | 1. Navigate to Budget tool\n2. Click Change History tab | Audit trail displayed: what changed, who changed it, when | HIGH | 🔲 | |
| 2.6 | Project Status Snapshots tab loads | 1. Navigate to Budget tool\n2. Click Project Status Snapshots tab | List of all project status snapshots displayed | HIGH | 🔲 | |
| 2.7 | Forecasting tab loads | 1. Navigate to Budget tool\n2. Click Forecasting tab | Forecasting view renders with Projected Cost to Complete and date columns | HIGH | 🔲 | |
| 2.8 | Apply View from View menu | 1. Navigate to Budget tab\n2. Click View menu\n3. Select a different budget view | Table columns update to match selected view | HIGH | 🔲 | |
| 2.9 | Group by Cost Code | 1. Navigate to Budget tab\n2. Click Group menu\n3. Select Cost Code | Line items grouped by cost code with subtotals | MEDIUM | 🔲 | |
| 2.10 | Group by Sub Job | 1. Click Group menu\n2. Select Sub Job | Line items grouped by sub job | MEDIUM | 🔲 | |
| 2.11 | Filter by Detail Type | 1. Click Filter menu\n2. Select Detail Type filter\n3. Choose a type (e.g., Budget Change Adjustment) | Only matching line items shown | MEDIUM | 🔲 | |
| 2.12 | Clear filters | 1. Apply one or more filters\n2. Click Clear Filters | All filters removed; full data set restored | MEDIUM | 🔲 | |
| 2.13 | Full screen mode | 1. Navigate to Budget tab\n2. Click Full Screen button | Budget table expands to fill screen | LOW | 🔲 | |
| 2.14 | Line items shown in RED when column value is negative | 1. Create a situation where Projected Over/Under is negative | Affected row renders in red text | MEDIUM | 🔲 | |

---

## 3. Fields & Data

> Source: Procore Budget documentation — Add a Budget Line Item, About the Procore Standard Budget View, About the Budget Detail Tab

### 3.1 Budget Line Item Form Fields

| # | Field | Type | Required | Test: Accepts Valid Input | Test: Rejects Invalid | Priority | Result |
|---|-------|------|---------|--------------------------|----------------------|---------|--------|
| 3.1.1 | Cost Code | Dropdown | Yes | Selects from project cost codes list | Blank → validation error | HIGH | 🔲 |
| 3.1.2 | Cost Type / Category | Dropdown | Yes | Selects from cost type list (Labor, Material, Equipment, Subcontractor, Other) | Blank → validation error | HIGH | 🔲 |
| 3.1.3 | Description | Text | No | Accepts free text | N/A (optional) | MEDIUM | 🔲 |
| 3.1.4 | Quantity | Number | No | Accepts positive decimal numbers | Non-numeric → validation error | MEDIUM | 🔲 |
| 3.1.5 | Unit of Measure | Dropdown/Text | No | Selects from UOM master list | N/A (optional) | MEDIUM | 🔲 |
| 3.1.6 | Unit Cost | Currency | No | Accepts positive monetary values (no commas/symbols) | Non-numeric → validation error | MEDIUM | 🔲 |
| 3.1.7 | Original Budget | Currency | Yes | Accepts positive monetary values (no commas/symbols) | Blank or negative → validation error | HIGH | 🔲 |

### 3.2 Standard Budget View Columns

| # | Column | Type | Test: Renders | Test: Calculated Correctly | Priority | Result |
|---|--------|------|--------------|---------------------------|---------|--------|
| 3.2.1 | Original Budget | Currency | Column visible | Matches sum of line item original amounts | HIGH | 🔲 |
| 3.2.2 | Revised Budget | Currency | Column visible | Reflects approved changes to original budget | HIGH | 🔲 |
| 3.2.3 | Projected Budget | Currency | Column visible | Sum of revised budget + pending changes | HIGH | 🔲 |
| 3.2.4 | Projected Costs | Currency | Column visible | Sum of commitments + direct costs | HIGH | 🔲 |
| 3.2.5 | Projected Over/Under | Currency | Column visible | Projected Budget minus Projected Costs | HIGH | 🔲 |
| 3.2.6 | Forecast to Complete | Currency | Column visible | Auto-calculated or manual entry per line item | HIGH | 🔲 |
| 3.2.7 | Direct Costs | Currency | Column visible | Pulls from Direct Costs tool entries | HIGH | 🔲 |
| 3.2.8 | Pending Budget Changes | Currency | Column visible (Budget Detail tab) | Shows budget changes in Pending status | MEDIUM | 🔲 |
| 3.2.9 | Pending Cost Changes | Currency | Column visible (Budget Detail tab) | Shows commitments in out-for-signature/processing status | MEDIUM | 🔲 |
| 3.2.10 | Cost Code | Text | Column visible | Displays correct cost code per row | HIGH | 🔲 |
| 3.2.11 | Sub Job | Text | Column visible if enabled | Groups line items by sub job if WBS sub jobs enabled | MEDIUM | 🔲 |

---

## 4. Statuses & Workflows

> Source: Procore Budget documentation — Approve Budget Changes, Void Budget Changes, About Budget Changes

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.1 | Budget change created in Pending status | 1. Create a new budget change | Budget change saved with status "Pending" | HIGH | 🔲 | |
| 4.2 | Approve a budget change | 1. Open a Pending budget change\n2. Click Edit in General Information section\n3. Change status to Approved\n4. Save | Status updates to "Approved"; budget line item values update accordingly | HIGH | 🔲 | |
| 4.3 | Void a budget change | 1. Open an Approved or Pending budget change\n2. Click Edit\n3. Change status to Void\n4. Save | Status updates to "Void"; change no longer affects budget totals | HIGH | 🔲 | |
| 4.4 | Voided budget change cannot be edited | 1. Open a Voided budget change\n2. Attempt to edit | Editing blocked; form is read-only | HIGH | 🔲 | |
| 4.5 | Custom workflow blocks manual status edit | 1. Apply a custom workflow template to the project\n2. Attempt to manually change a budget change status | Manual status edit blocked; only workflow actions available | MEDIUM | 🔲 | |
| 4.6 | Respond to custom workflow approval request | 1. A budget change triggers a workflow approval\n2. Navigate to workflow notification\n3. Approve or reject | Status updates per workflow response; audit trail recorded | MEDIUM | 🔲 | |
| 4.7 | Snapshot status can be changed | 1. Navigate to Project Status Snapshots tab\n2. Click a snapshot's current status\n3. Select a different status | Status updates in the list | MEDIUM | 🔲 | |
| 4.8 | Budget change with workflow cannot be manually voided | 1. Apply custom workflow to budget changes\n2. Attempt to manually void a budget change | Void action blocked; must go through workflow | MEDIUM | 🔲 | |
| 4.9 | Approved budget changes affect Revised Budget column | 1. Create and approve a budget change\n2. Return to Budget tab | Revised Budget column reflects the approved change | HIGH | 🔲 | |
| 4.10 | ERP-synced budget changes cannot be edited | 1. Sync a budget change with ERP\n2. Attempt to edit that budget change | Edit blocked; message shown that ERP-synced changes cannot be modified | MEDIUM | 🔲 | |

---

## 5. Budget Changes (CRUD)

> Source: Procore Budget documentation — Create Budget Changes, Edit Budget Changes, Delete Budget Changes, View Budget Changes, Void Budget Changes, Export Budget Changes

### 5.1 Create Budget Changes

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.1.1 | Create a budget change from Budget Changes tab | 1. Navigate to Budget Changes tab\n2. Click Create\n3. Fill in Title, Date\n4. Add an Adjustment (select budget code)\n5. Add a Line Item to the adjustment (target budget code + amount)\n6. Click Save | Budget change created with correct adjustments and line items | HIGH | 🔲 | |
| 5.1.2 | Create a budget change from Budget tab | 1. Navigate to Budget tab\n2. Click Create → Budget Changes\n3. Fill in required fields and adjustments\n4. Click Save | Budget change created and visible in Budget Changes tab | HIGH | 🔲 | |
| 5.1.3 | Create budget change with Amount-Based adjustment | 1. Add adjustment\n2. Enter amount-based line item (no quantity/unit fields) | Amount-based adjustment saved correctly | HIGH | 🔲 | |
| 5.1.4 | Create budget change with Unit/Qty-Based adjustment | 1. Add adjustment\n2. Enter Quantity, Unit, Unit Cost fields | Qty-based adjustment saved; Amount auto-calculated | MEDIUM | 🔲 | |
| 5.1.5 | Create budget change with Production Quantity Adjustment | 1. Scroll to Production Quantity Adjustment section\n2. Click Add Adjustment\n3. Enter line item data\n4. Click Save | Production adjustment saved and reflected in budget | MEDIUM | 🔲 | |
| 5.1.6 | Link budget change adjustment to a Change Event Line Item | 1. While creating a budget change adjustment, select a Change Event Line Item from dropdown | Budget change linked to change event; visible in both tools | MEDIUM | 🔲 | |
| 5.1.7 | Create budget change with Prime Contract field | 1. Select a prime contract from the Prime Contract dropdown when creating a budget change | Prime contract linked to budget change | MEDIUM | 🔲 | |

### 5.2 Edit Budget Changes

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.2.1 | Edit general information on a Pending budget change | 1. Open a Pending budget change\n2. Click Edit\n3. Change the title/date/description\n4. Save | Changes persist | HIGH | 🔲 | |
| 5.2.2 | Edit adjustments on a budget change | 1. Open a Pending budget change\n2. Add a new adjustment or modify existing one\n3. Save | Adjustments update correctly | HIGH | 🔲 | |
| 5.2.3 | Cannot edit Approved budget change | 1. Approve a budget change\n2. Attempt to edit | Editing restricted for Approved changes | HIGH | 🔲 | |

### 5.3 Delete / Void Budget Changes

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.3.1 | Delete a Pending budget change | 1. Open a Pending budget change\n2. Click Delete | Budget change removed from list | HIGH | 🔲 | |
| 5.3.2 | View a budget change | 1. Navigate to Budget Changes tab\n2. Click a Budget Change # link | Budget change detail page opens with all fields and adjustments | HIGH | 🔲 | |
| 5.3.3 | View budget change detail for a specific line item | 1. On Budget tab, find a line item with budget changes\n2. Click the budget change detail link on that row | Popup or detail view shows all changes affecting that line item | MEDIUM | 🔲 | |

---

## 6. Forecasting

> Source: Procore Budget documentation — Use the Forecast to Complete Feature, About the Procore Standard Forecast View, Apply Advanced Forecasting Curves, Import Advanced Forecasting

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 6.1 | Forecast to Complete — Automatic Calculation | 1. Navigate to Budget tab\n2. Find a line item's Forecast to Complete column\n3. Click the lightning bolt link\n4. Select Automatic Calculation | FTC auto-calculates as Projected Budget minus Projected Costs | HIGH | 🔲 | |
| 6.2 | Forecast to Complete — Manual Entry | 1. Click FTC lightning bolt link\n2. Select Manual Entry\n3. Enter a value | Manual value saved and displayed in FTC column | HIGH | 🔲 | |
| 6.3 | Forecast to Complete — Lump Sum Entry (Forecasting Tab) | 1. Navigate to Forecasting tab\n2. Enter a lump sum amount for a line item | Lump sum populates FTC on Budget tab | MEDIUM | 🔲 | |
| 6.4 | Forecast to Complete — Monitored Resources | 1. Click FTC lightning bolt link\n2. Select Monitored Resources\n3. Add a resource with utilization rate, unit cost, start/end dates | FTC auto-draws down as time passes based on resource data | MEDIUM | 🔲 | |
| 6.5 | Add forecasting note to a line item | 1. Click FTC link\n2. Enter text in the Notes field\n3. Save | Note saved and visible when reopening the FTC panel | MEDIUM | 🔲 | |
| 6.6 | Switch FTC method (Automatic to Manual) | 1. Set FTC to Automatic\n2. Return and switch to Manual Entry | Note is preserved when switching methods | MEDIUM | 🔲 | |
| 6.7 | Apply Front-Loaded forecasting curve | 1. Navigate to Forecasting tab\n2. Select lines\n3. Apply Front-Loaded curve with date range | Monthly projections show more spend early in timeline | LOW | 🔲 | |
| 6.8 | Apply Back-Loaded forecasting curve | 1. Apply Back-Loaded curve | Monthly projections show more spend late in timeline | LOW | 🔲 | |
| 6.9 | Apply Bell forecasting curve | 1. Apply Bell curve | Monthly projections peak in middle of timeline | LOW | 🔲 | |
| 6.10 | Import Advanced Forecasting CSV | 1. Navigate to Forecasting tab\n2. Click Import\n3. Upload a valid Advanced Forecasting CSV | Forecasting data imported and reflected in Forecasting tab | MEDIUM | 🔲 | |

---

## 7. Snapshots

> Source: Procore Budget documentation — Create a Budget Snapshot, View a Snapshot, Export a Snapshot, Analyze Variance Between Budget Snapshots, About the Project Status Snapshots Tab

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.1 | Create a snapshot from Budget tab | 1. Navigate to Budget tool\n2. Click Create Snapshot\n3. Enter a name and description\n4. Click Create | Snapshot created; "Snapshot Created" banner shown; snapshot appears in Project Status Snapshots tab | HIGH | 🔲 | |
| 7.2 | Create a snapshot from Forecasting tab | 1. Navigate to Forecasting tab\n2. Click Create Snapshot | Ad hoc snapshot created from forecasting data | MEDIUM | 🔲 | |
| 7.3 | View a snapshot | 1. Navigate to Project Status Snapshots tab\n2. Click a snapshot name | Snapshot detail opens showing budget state at time of capture | HIGH | 🔲 | |
| 7.4 | Export a snapshot (CSV) | 1. Open a snapshot\n2. Click Export → CSV | CSV file downloaded with snapshot data | MEDIUM | 🔲 | |
| 7.5 | Export a snapshot (PDF) | 1. Open a snapshot\n2. Click Export → PDF | PDF file generated with snapshot data | MEDIUM | 🔲 | |
| 7.6 | Export the snapshot list | 1. Navigate to Project Status Snapshots tab\n2. Click Export | CSV of all snapshots downloaded | LOW | 🔲 | |
| 7.7 | Analyze variance between two snapshots | 1. Navigate to Project Status Snapshots tab\n2. Open a snapshot\n3. Click Variance icon on a column\n4. Select comparison snapshot | Variance column shows difference between the two snapshots per line item | HIGH | 🔲 | |
| 7.8 | Analyze variance — Budget tab vs snapshot | 1. Navigate to Budget tab\n2. Click Analyze Variance\n3. Select a snapshot to compare | Variance columns added showing difference between current budget and snapshot | HIGH | 🔲 | |

---

## 8. Permissions

> Source: Procore Budget documentation — Permissions, Configure Settings: Budget, various tutorials

| # | Test | Role | Action | Expected | Priority | Result | Notes |
|---|------|------|--------|---------|---------|--------|-------|
| 8.1 | Read Only user can view budget | Read Only | Navigate to Budget tab | Budget visible; no edit controls shown | HIGH | 🔲 | |
| 8.2 | Read Only user cannot add line items | Read Only | Attempt to click Create → Budget Line Item | Create button not visible or action blocked | HIGH | 🔲 | |
| 8.3 | Standard user can add line items | Standard | Click Create → Budget Line Item and add | Line item added successfully | HIGH | 🔲 | |
| 8.4 | Standard user cannot delete line items (without granular permission) | Standard (no granular) | Attempt to delete a line item | Delete action not available | MEDIUM | 🔲 | |
| 8.5 | Standard user with 'Delete Budget Line Items' granular permission can delete | Standard + granular | Delete a $0 line item | Line item deleted | MEDIUM | 🔲 | |
| 8.6 | Admin user can lock/unlock budget | Admin | Click Lock Budget / Unlock Budget | Lock/unlock succeeds | HIGH | 🔲 | |
| 8.7 | Admin user can configure budget settings | Admin | Navigate to Configure Settings → Budget Settings | Settings page accessible and editable | MEDIUM | 🔲 | |
| 8.8 | Admin user can approve budget changes | Admin | Open a Pending budget change and change status to Approved | Approval succeeds | HIGH | 🔲 | |
| 8.9 | Standard user with granular permission can import budget | Standard + 'Import Budget From File' | Use Import budget function | Import succeeds | MEDIUM | 🔲 | |

---

## 9. Settings & Configuration

> Source: Procore Budget documentation — Configure Settings: Budget, Set up a Budget in a New Procore Project

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.1 | Access Budget Settings | 1. Navigate to Budget tool\n2. Click Configure Settings (gear icon)\n3. Click Budget Settings | Budget Settings page opens with available toggles | MEDIUM | 🔲 | |
| 9.2 | Enable Budget Changes feature | 1. In Budget Settings, toggle on Budget Changes | Budget Changes tab appears in the Budget tool | HIGH | 🔲 | |
| 9.3 | Enable Budget Modifications (legacy) | 1. In Budget Settings, toggle on Allow Budget Modifications Which Modify Grand Total | Budget Modifications feature available for use | MEDIUM | 🔲 | |
| 9.4 | Enable Advanced Forecasting | 1. In Budget Settings, toggle Advanced Forecasting ON | Forecasting tab appears with Procore Standard Forecast view | MEDIUM | 🔲 | |
| 9.5 | Disable Advanced Forecasting | 1. In Budget Settings, toggle Advanced Forecasting OFF | Forecasting tab hidden from Budget tool | LOW | 🔲 | |
| 9.6 | Set user permissions from Budget Settings page | 1. In Budget Settings, navigate to Set User Permissions section\n2. Set a user's permission level | Permission level saved; user's access changes accordingly | MEDIUM | 🔲 | |

---

## 10. Reporting & Export

> Source: Procore Budget documentation — Export a Budget, View Budget Reports, Create a Custom Budget Report, Export Budget Changes, Export a Snapshot

### 10.1 Export Budget

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.1.1 | Export budget as CSV | 1. Navigate to Budget tool\n2. Apply desired view/filter\n3. Click Export → CSV | CSV file downloaded with all rows and columns in current budget view | HIGH | 🔲 | |
| 10.1.2 | Export budget as PDF | 1. Navigate to Budget tool\n2. Apply grouping/filters\n3. Click Export → PDF | PDF generated with grouping/filter settings applied | HIGH | 🔲 | |
| 10.1.3 | Export a budget change as PDF | 1. Open a budget change detail\n2. Click Export → PDF | PDF of the budget change generated | MEDIUM | 🔲 | |

### 10.2 Budget Reports

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.2.1 | View Budget Modifications Report | 1. Navigate to Reports tool\n2. Under Financial Reports, click Budget Modifications Report | Report shows list of all modifications with user, date, and change details | MEDIUM | 🔲 | |
| 10.2.2 | View Buyout Summary Report | 1. Navigate to Reports tool\n2. Click Buyout Summary Report | Report shows every budget line item with associated approved commitment contracts per vendor | MEDIUM | 🔲 | |
| 10.2.3 | View Legacy Budget Detail Report | 1. Navigate to Reports tool\n2. Click Legacy Budget Detail Report | Report shows comprehensive breakdown: contract change orders, commitments, modifications | MEDIUM | 🔲 | |
| 10.2.4 | View Monitored Resources Report | 1. Navigate to Reports tool\n2. Click Monitored Resources Report | Report shows summarized list of project's monitored resources by budget line item | MEDIUM | 🔲 | |
| 10.2.5 | Create a Custom Budget Report | 1. Navigate to Budget tool\n2. Click Create Custom Report\n3. Configure columns and filters\n4. Save | Custom report created and accessible from Reports tool | LOW | 🔲 | |
| 10.2.6 | Export a Custom Budget Report as PDF | 1. Open a custom budget report\n2. Click Export → PDF | PDF version of report downloaded | LOW | 🔲 | |
| 10.2.7 | View Financials Budget Report (Analytics) | 1. Navigate to Analytics tool\n2. Open Financials Budget Report | Budget analytics report renders with current project data | LOW | 🔲 | |
| 10.2.8 | Budget Modifications Report link from Budget tool right pane | 1. Navigate to Budget tool\n2. Locate report link in right pane\n3. Click the link | Navigates directly to Budget Modifications Report | LOW | 🔲 | |

---

## 11. Advanced Features

> Source: Procore Budget documentation — Add Budgeted Production Quantities, Analyze Variance, Budget Insights, Change History tab

| # | Feature | Test | Steps | Expected | Priority | Result | Notes |
|---|---------|------|-------|----------|---------|--------|-------|
| 11.1 | Production Quantities | Add budgeted production quantities | 1. Navigate to Budget tool\n2. Click Create → Budgeted Production Quantities\n3. Enter budget code, quantity, unit, unit cost | Production quantity line item added to budget | LOW | 🔲 | |
| 11.2 | Production Quantities | Import installed production quantities | 1. Navigate to Budget tool\n2. Click Import → Installed Production Quantities\n3. Upload valid CSV | Installed quantities updated and Labor Productivity view reflects them | LOW | 🔲 | |
| 11.3 | Change History | View audit trail | 1. Navigate to Budget tool\n2. Click Change History tab | All budget changes shown with: what changed, who made the change, timestamp | MEDIUM | 🔲 | |
| 11.4 | Change History | Cannot delete change history items | 1. Navigate to Change History tab\n2. Attempt to delete any entry | No delete option available; entries are permanent | MEDIUM | 🔲 | |
| 11.5 | GST | Add GST line to budget | 1. Navigate to Budget tool\n2. Click Add → GST\n3. Enter tax rate | GST line item added and Goods & Services Tax calculated correctly | LOW | 🔲 | |
| 11.6 | Budget Insights | View Budget Insights report | 1. Navigate to Analytics tool\n2. Open Budget Insights | Budget Insights report page renders with visual charts | LOW | 🔲 | |
| 11.7 | ERP Export | Export budget to integrated ERP system | 1. Lock the budget\n2. Click Export to ERP\n3. Submit for accounting acceptance | Budget sent to ERP Integrations queue for accounting approver review | LOW | 🔲 | |

---

## Sources

The following Procore documentation pages were used to generate this test matrix:

| # | Title | URL | Category |
|---|-------|-----|---------|
| 1 | Overview | https://v2.support.procore.com/product-manuals/budget-project | Budget |
| 2 | Permissions | https://v2.support.procore.com/product-manuals/budget-project/permissions | Budget |
| 3 | About the Budget Detail Tab | https://v2.support.procore.com/product-manuals/budget-project/tutorials/about-the-budget-detail-tab | Budget |
| 4 | About the Procore Standard Budget View | https://v2.support.procore.com/product-manuals/budget-project/tutorials/about-the-procore-standard-budget-view | Budget |
| 5 | About the Procore Standard Forecast View | https://v2.support.procore.com/product-manuals/budget-project/tutorials/about-the-procore-standard-forecast-view | Budget |
| 6 | About the Project Status Snapshots Tab | https://v2.support.procore.com/product-manuals/budget-project/tutorials/about-the-project-status-snapshots-tab | Budget |
| 7 | Add a Budget Line Item | https://v2.support.procore.com/product-manuals/budget-project/tutorials/add-a-budget-line-item | Budget |
| 8 | Add a Partial Budget Line Item | https://v2.support.procore.com/product-manuals/budget-project/tutorials/add-a-partial-budget-line-item | Budget |
| 9 | Add a Goods & Services Tax (GST) to a Budget | https://v2.support.procore.com/product-manuals/budget-project/tutorials/add-a-gst-to-a-budget | Budget |
| 10 | Add Budgeted Production Quantities to a Project's Budget | https://v2.support.procore.com/product-manuals/budget-project/tutorials/add-budgeted-production-quantities-to-a-projects-budget | Budget |
| 11 | Analyze Variance Between Budget Snapshots | https://v2.support.procore.com/product-manuals/budget-project/tutorials/analyze-variances-between-budget-snapshots | Budget |
| 12 | Apply Advanced Forecasting Curves | https://v2.support.procore.com/product-manuals/budget-project/tutorials/apply-advanced-forecasting-curves | Budget |
| 13 | Apply the View, Group, and Filter Options on the Budget Detail Tab | https://v2.support.procore.com/product-manuals/budget-project/tutorials/apply-the-view-group-and-filter-options-on-the-budget-detail-tab | Budget |
| 14 | Apply the View, Snapshot, Group, and Filter Options on a Budget View | https://v2.support.procore.com/product-manuals/budget-project/tutorials/apply-the-view-snapshot-group-and-filter-options-on-a-budget-view | Budget |
| 15 | Approve Budget Changes | https://v2.support.procore.com/product-manuals/budget-project/tutorials/approve-budget-changes | Budget |
| 16 | Budget Insights | https://v2.support.procore.com/reference-budget-insights | Budget |
| 17 | Configure Settings: Budget | https://v2.support.procore.com/product-manuals/budget-project/tutorials/configure-settings-budget | Budget |
| 18 | Create a Budget Modification | https://v2.support.procore.com/product-manuals/budget-project/tutorials/create-a-budget-modification | Budget |
| 19 | Create a Budget Snapshot | https://v2.support.procore.com/product-manuals/budget-project/tutorials/create-a-budget-snapshot | Budget |
| 20 | Create a Custom Budget Report | https://v2.support.procore.com/product-manuals/budget-project/tutorials/create-a-custom-budget-report | Budget |
| 21 | Create Budget Changes | https://v2.support.procore.com/product-manuals/budget-project/tutorials/create-budget-changes | Budget |
| 22 | Delete a Budget Line Item | https://v2.support.procore.com/product-manuals/budget-project/tutorials/delete-a-budget-line-item | Budget |
| 23 | Delete Budget Changes | https://v2.support.procore.com/product-manuals/budget-project/tutorials/delete-budget-changes | Budget |
| 24 | Edit a Budget | https://v2.support.procore.com/product-manuals/budget-project/tutorials/edit-a-budget | Budget |
| 25 | Edit Budget Changes | https://v2.support.procore.com/product-manuals/budget-project/tutorials/edit-budget-changes | Budget |
| 26 | Export a Budget | https://v2.support.procore.com/product-manuals/budget-project/tutorials/export-a-budget | Budget |
| 27 | Export a Snapshot from the Budget Tool | https://v2.support.procore.com/product-manuals/budget-project/tutorials/export-a-snapshot-from-the-budget-tool | Budget |
| 28 | Export a Snapshot List from the Project Status Snapshots Tab | https://v2.support.procore.com/product-manuals/budget-project/tutorials/export-a-snapshot-list-from-the-project-status-snapshots-tab-in-the-budget-tool | Budget |
| 29 | Export Budget Changes | https://v2.support.procore.com/product-manuals/budget-project/tutorials/export-budget-changes | Budget |
| 30 | Import a Budget | https://v2.support.procore.com/product-manuals/budget-project/tutorials/import-a-budget | Budget |
| 31 | Import Advanced Forecasting for a Budget | https://v2.support.procore.com/product-manuals/budget-project/tutorials/import-advanced-forecasting-for-a-budget | Budget |
| 32 | Import Installed Production Quantities | https://v2.support.procore.com/product-manuals/budget-project/tutorials/import-installed-production-quantities-for-the-labor-productivity-cost-budget-view | Budget |
| 33 | Lock a Budget | https://v2.support.procore.com/product-manuals/budget-project/tutorials/lock-a-budget | Budget |
| 34 | Read a Budget | https://v2.support.procore.com/product-manuals/budget-project/tutorials/read-a-budget | Budget |
| 35 | Set up a Budget in a New Procore Project | https://v2.support.procore.com/product-manuals/budget-project/tutorials/set-up-a-budget-in-a-new-procore-project | Budget |
| 36 | Unlock a Budget | https://v2.support.procore.com/product-manuals/budget-project/tutorials/unlock-a-budget | Budget |
| 37 | Use the Forecast to Complete Feature | https://v2.support.procore.com/product-manuals/budget-project/tutorials/use-the-forecast-to-complete-feature | Budget |
| 38 | View a Snapshot from the Budget Tool | https://v2.support.procore.com/product-manuals/budget-project/tutorials/view-a-snapshot-from-the-budget-tool | Budget |
| 39 | View and Filter the Change History of the Budget | https://v2.support.procore.com/product-manuals/budget-project/tutorials/view-the-change-history-of-the-budget | Budget |
| 40 | View Budget Change Detail for a Budget Line Item | https://v2.support.procore.com/product-manuals/budget-project/tutorials/view-budget-change-detail-for-a-budget-line-item | Budget |
| 41 | View Budget Changes | https://v2.support.procore.com/product-manuals/budget-project/tutorials/view-budget-changes | Budget |
| 42 | View Budget Reports | https://v2.support.procore.com/product-manuals/budget-project/tutorials/view-budget-reports | Budget |
| 43 | Void Budget Changes | https://v2.support.procore.com/product-manuals/budget-project/tutorials/void-budget-changes | Budget |
| 44 | About Budget Changes - Overview | https://v2.support.procore.com/process-guides/about-budget-changes | General |
| 45 | About Budget Changes - Details | https://v2.support.procore.com/process-guides/about-budget-changes/details | General |
| 46 | About Budget Changes on Owner Invoices | https://v2.support.procore.com/product-manuals/budget-project/tutorials/About Budget Changes on Owner Invoices | Budget |
| 47 | (Beta) Create a Custom Workflow Template for Budget Changes | https://v2.support.procore.com/product-manuals/workflows-company/tutorials/create-a-custom-workflow-template-for-budget-changes | General |
| 48 | (Beta) Respond to a Custom Workflow (Budget Change) | https://v2.support.procore.com/product-manuals/workflows-company/tutorials/respond-to-a-custom-workflow-budget-change | General |
| 49 | Analytics 2.0 - Financials Budget Report | https://v2.support.procore.com/process-guides/analytics-2.0-report-pages/financials-budget-report | General |
| 50 | Analytics 2.0 - Financials Budget (Custom) Report | https://v2.support.procore.com/process-guides/analytics-2.0-report-pages/financials-budget-custom-report | General |
| 51 | Configure Columns for the Project Status Snapshots Tab | https://v2.support.procore.com/product-manuals/budget-project/tutorials/configure-columns-for-the-project-status-snapshots-tab-of-the-budget-tool | Budget |
| 52 | Migrating to Budget Changes from Budget Modifications | https://v2.support.procore.com/product-manuals/budget-project/tutorials/migrating-to-budget-changes-from-budget-modifications | Budget |

---

## Testing Session Log

| Date | Tester | Environment | Pass | Fail | Skip | Notes |
|------|--------|-------------|------|------|------|-------|
| | | localhost:3000 | | | | |
