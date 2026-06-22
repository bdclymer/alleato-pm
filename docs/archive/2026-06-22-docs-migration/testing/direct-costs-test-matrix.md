# Direct Costs — Procore Feature Test Matrix

**Generated:** 2026-04-08

## Summary

| Category | # Tests | Priority |
|----------|---------|---------|
| Core Actions | 18 | HIGH |
| Views & Navigation | 10 | HIGH |
| Fields & Data | 18 | HIGH |
| Statuses & Workflows | 9 | HIGH |
| Calculations | 5 | HIGH |
| Permissions | 2 | MEDIUM |
| Integrations | 7 | MEDIUM |
| Reporting & Export | 5 | MEDIUM |
| Advanced Features | 15 | MEDIUM |
| **TOTAL** | **89** | |

---

## 1. Core Actions

> Source: Codebase — DirectCostForm.tsx, route.ts (POST/PUT/DELETE), direct-costs-client.tsx

### 1.1 Create

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.1.1 | Create with required fields only | 1. Navigate to `/767/direct-costs`<br>2. Click "Create Direct Cost"<br>3. Select Cost Type = "Expense"<br>4. Set Incurred Date<br>5. Add one line item (budget code, qty=1, unit cost=$100)<br>6. Click "Create Direct Cost" | New record appears in list; status defaults to "Draft"; amount matches line item | HIGH | 🔲 | Cost Type and Incurred Date are the only required header fields; budget_code_id, quantity, and unit_cost are required per line item |
| 1.1.2 | Create with all optional fields | Fill all fields: Cost Type, Status, Incurred Date, Payment Terms, Vendor, Employee, Description, Received Date, Paid Date; add line item with UOM | All fields persisted; detail view shows every entered value correctly | MEDIUM | 🔲 | |
| 1.1.3 | Create fails when Cost Type is missing | Clear Cost Type dropdown, fill all other required fields, click Submit | Validation error on Cost Type field; form not submitted | HIGH | 🔲 | |
| 1.1.4 | Create fails when line item Budget Code is missing | Leave budget_code_id blank on line item, fill all other fields, click Submit | Validation error: "Budget code is required"; form not submitted | HIGH | 🔲 | |
| 1.1.5 | Create fails when line item Quantity is zero or missing | Set quantity=0 or leave blank on line item | Validation error: "Must be a positive number"; form not submitted | HIGH | 🔲 | Zod schema requires positiveNumber |
| 1.1.6 | Create with Invoice type and invoice number | Select Cost Type = "Invoice", enter Invoice # = "INV-2026-001" | Record created; Invoice # shown in list and detail view | HIGH | 🔲 | |
| 1.1.7 | Create Subcontractor Invoice with vendor | Select Cost Type = "Subcontractor Invoice", select a vendor | Record created; vendor name shown in list row | HIGH | 🔲 | |
| 1.1.8 | Create with multiple line items | Add 3+ line items with different budget codes | All line items saved; total_amount = sum of all line totals | HIGH | 🔲 | |
| 1.1.9 | Dev auto-fill populates form | Click the "Auto-Fill" button (dev mode only) | All form fields populate with test data; one line item added with valid budget code | LOW | 🔲 | Only visible in development (NODE_ENV=development) |

### 1.2 Edit

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.2.1 | Edit from list row action menu — opens slide-over | Row action menu → Edit | Edit slide-over opens with all fields pre-filled; no blank "Select..." placeholders | HIGH | 🔲 | Known risk area per CLAUDE.md FK gate |
| 1.2.2 | Edit from detail page — opens slide-over | Navigate to detail page → click "Edit" button | Edit slide-over opens with pre-filled data | HIGH | 🔲 | |
| 1.2.3 | Edit saves changes correctly | Change Description, update unit cost on a line item, click "Update Direct Cost" | Changes persist; list and detail view reflect new values after save | HIGH | 🔲 | |
| 1.2.4 | Cancel edit discards changes | Open edit slide-over, change title, click Cancel | Original values shown; no changes persisted | HIGH | 🔲 | |
| 1.2.5 | Auto-save fires after 30 seconds of inactivity in edit mode | Open edit slide-over, make a change, wait 30 seconds without submitting | AutoSaveIndicator shows "saving" then "saved"; no manual submit needed | MEDIUM | 🔲 | AUTO_SAVE_DELAY = 30000ms |
| 1.2.6 | Inline status change from list | Click status dropdown in list row → select "Approved" | Status badge updates in list without page reload; toast confirms change | HIGH | 🔲 | Uses PUT /api/.../direct-costs/{costId} with {status} only |

### 1.3 Delete

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.3.1 | Delete from list row action menu | Row action menu → Delete → Confirm in dialog | Record removed from list; success toast shown; router.refresh() called | HIGH | 🔲 | Soft delete (is_deleted = true) |
| 1.3.2 | Delete from detail page | Detail page → click "Delete" → Confirm | Redirected to `/767/direct-costs`; record no longer in list | HIGH | 🔲 | |
| 1.3.3 | Cancel delete leaves record intact | Click Delete → click Cancel in AlertDialog | Dialog closes; record remains in list unchanged | HIGH | 🔲 | |

---

## 2. Views & Navigation

> Source: direct-costs-client.tsx, direct-costs-table-utils.ts, detail page

### 2.1 List View & Tabs

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.1.1 | Summary tab renders with correct columns | Navigate to `/767/direct-costs` | Table shows columns: Date, Vendor, Type, Status, Amount, ERP Status (default visible); page title shown | HIGH | 🔲 | Received and Paid Date are hidden by default |
| 2.1.2 | Summary by Cost Code tab renders | Click "Summary by Cost Code" tab | Table switches to cost-code view with columns: Date, Employee, Vendor, Type, Invoice #, Status, Description, Amount, Received | HIGH | 🔲 | URL gains `?summary_view=cost-code` |
| 2.1.3 | Tab navigation updates URL | Click between tabs | URL reflects `?summary_view=cost-code` or base URL without parameter; back/forward browser navigation works | MEDIUM | 🔲 | |
| 2.1.4 | Summary tab selected by default | Load `/767/direct-costs` fresh | "Summary" tab is active; no `summary_view` param in URL | HIGH | 🔲 | |

### 2.2 Detail View

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.2.1 | Detail page loads all sections | Navigate to `/767/direct-costs/{costId}` | Page shows: Cost Information (type, status badges, total, date, vendor, employee, invoice #, received/paid dates), Record Information (created, updated), Line Items table | HIGH | 🔲 | |
| 2.2.2 | Detail page shows Acumatica link when synced | Open a record that has `acumatica_ref_nbr` set | Acumatica row shows a clickable link to `alleatogroup.acumatica.com` with doc type + ref number | MEDIUM | 🔲 | |
| 2.2.3 | Detail page shows "missing" state for absent optional fields | Open record with no vendor, no employee, no invoice # | Fields display "missing" indicator, not a blank gap | HIGH | 🔲 | Uses `<LabelValueRow missing />` prop |
| 2.2.4 | Back button returns to list | Detail page → click back arrow | Returns to `/767/direct-costs` list | HIGH | 🔲 | |
| 2.2.5 | Line items table on detail page shows budget code, qty, UOM, unit cost, line total, and footer total | Open detail for record with multiple line items | Line items table renders all columns; footer row shows correct sum | HIGH | 🔲 | |

### 2.3 Mobile Responsiveness

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.3.1 | List auto-switches to list view on mobile | Resize viewport to ≤767px, navigate to `/767/direct-costs` | View mode automatically switches from "table" to "list"; layout stacks | HIGH | 🔲 | isMobileViewport detection via matchMedia |

---

## 3. Fields & Data

> Source: DirectCostForm.tsx, LineItemsManager.tsx, direct-costs.ts schema

### 3.1 Header Form Fields

| # | Field | Type | Required | Test: Accepts Valid Input | Test: Rejects Invalid | Priority | Result |
|---|-------|------|---------|--------------------------|----------------------|---------|--------|
| 3.1.1 | Cost Type | Dropdown (Select) | Yes | Expense, Invoice, Subcontractor Invoice | Blank → validation error | HIGH | 🔲 |
| 3.1.2 | Status | Dropdown (Select) | No | Draft, Pending, Revise and Resubmit, Approved | — | HIGH | 🔲 |
| 3.1.3 | Incurred Date | Date picker | Yes | Any valid date | Blank → validation error | HIGH | 🔲 |
| 3.1.4 | Payment Terms | Dropdown (Select) | No | Due on Receipt, Net 10, Net 15, Net 30, Net 60, Net 90 | — | MEDIUM | 🔲 |
| 3.1.5 | Vendor | Combobox (searchable) | No | Select any vendor from list; type to filter | — | HIGH | 🔲 |
| 3.1.6 | Employee | Combobox (searchable) | No | Select any employee from list; type to filter | — | MEDIUM | 🔲 |
| 3.1.7 | Description | Textarea | No | Up to 1000 characters | > 1000 chars → validation error | MEDIUM | 🔲 |
| 3.1.8 | Received Date | Date picker (nullable) | No | Any valid date or cleared | — | MEDIUM | 🔲 |
| 3.1.9 | Paid Date | Date picker (nullable) | No | Any valid date or cleared | — | MEDIUM | 🔲 |
| 3.1.10 | Invoice Number | Text input | No | Up to 255 characters | — | MEDIUM | 🔲 |

### 3.2 Line Item Fields

| # | Field | Type | Required | Test: Accepts Valid Input | Test: Rejects Invalid | Priority | Result |
|---|-------|------|---------|--------------------------|----------------------|---------|--------|
| 3.2.1 | Budget Code | BudgetCodeSelector (searchable) | Yes | Select existing budget code | Blank → "Budget code is required" | HIGH | 🔲 |
| 3.2.2 | Description | Text input | No | Any free-form text | — | LOW | 🔲 |
| 3.2.3 | Quantity | Number input | Yes | Any positive number > 0 | 0 or negative → "Must be a positive number" | HIGH | 🔲 |
| 3.2.4 | UOM | Dropdown (Select) | Yes | LOT, HOUR, DAY, SQFT, LF, EA, CY, SF, TON, LB | Blank → "UOM is required" | HIGH | 🔲 |
| 3.2.5 | Unit Cost | Money input | Yes | 0 or any positive amount | Negative → error | HIGH | 🔲 |
| 3.2.6 | Line Total | Computed (read-only) | — | Shows Qty × Unit Cost in real time | Cannot be edited directly | HIGH | 🔲 |
| 3.2.7 | High value indicator | Tooltip icon | — | Line total > $1,000 shows warning icon | No icon when ≤ $1,000 | LOW | 🔲 |
| 3.2.8 | Validation indicator | Icon | — | Green checkmark when line item is complete (budget code + qty + unit cost filled) | Red alert icon when errors present | MEDIUM | 🔲 |

---

## 4. Statuses & Workflows

> Source: CostStatuses constant, direct-costs-client.tsx, STATUS_OPTIONS

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.1.1 | Default status is Draft | Create a direct cost without selecting a status | Status badge shows "Draft" (outline variant) | HIGH | 🔲 | schema default = 'Draft' |
| 4.1.2 | Status badge color: Draft | View a Draft record | Status dot/badge shows muted-foreground color (gray) | HIGH | 🔲 | statusDotColor → 'bg-muted-foreground' |
| 4.1.3 | Status badge color: Pending | View a Pending record | Status badge/dot shows amber color | HIGH | 🔲 | statusDotColor → 'bg-amber-500' |
| 4.1.4 | Status badge color: Revise and Resubmit | View a Revise and Resubmit record | Status badge/dot shows rose/red color | HIGH | 🔲 | statusDotColor → 'bg-rose-500' |
| 4.1.5 | Status badge color: Approved | View an Approved record | Status badge/dot shows emerald/green color | HIGH | 🔲 | statusDotColor → 'bg-emerald-500' |
| 4.2.1 | Transition Draft → Pending via inline dropdown | List row → click status dropdown → select "Pending" | Status changes to Pending; toast confirms; page refreshes | HIGH | 🔲 | |
| 4.2.2 | Transition Pending → Approved via inline dropdown | List row → click status dropdown → select "Approved" | Status changes to Approved; toast confirms | HIGH | 🔲 | |
| 4.2.3 | Transition Pending → Revise and Resubmit via inline dropdown | List row → click status dropdown → select "Revise and Resubmit" | Status changes; toast confirms | HIGH | 🔲 | |
| 4.2.4 | Bulk approve multiple records | Select 2+ records → bulk action "Approve" | All selected transition to Approved; toast shows count; page refreshes | HIGH | 🔲 | Uses POST /bulk with operation=status-update, status=Approved |

---

## 5. Calculations

> Source: LineItemsManager.tsx — real-time qty × unit_cost computation and grand total

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.1.1 | Line Total = Qty × Unit Cost (real-time) | Enter Qty=3, Unit Cost=$50 on a line item | Line Total column instantly shows "$150.00" without submit | HIGH | 🔲 | Computed via useWatch in SortableLineItemRow |
| 5.1.2 | Grand total updates when line items change | Add two line items: $100 and $250 | Grand Total row at bottom of line items table shows "$350.00" | HIGH | 🔲 | Computed via grandTotal useMemo in LineItemsManager |
| 5.1.3 | Grand total updates when quantity changes | Edit qty on existing line item | Grand Total recalculates immediately | HIGH | 🔲 | |
| 5.1.4 | Grand total updates when unit cost changes | Edit unit cost on existing line item | Grand Total recalculates immediately | HIGH | 🔲 | |
| 5.1.5 | Detail page line items footer total matches record total_amount | Open detail view for a record | Table footer "Total" = sum of all line_total values; matches the Total Amount shown in Cost Information | HIGH | 🔲 | |

---

## 6. Permissions

> Source: API routes check `supabase.auth.getUser()`; route.ts responds 401 for unauthenticated

| # | Test | Role | Action | Expected | Priority | Result | Notes |
|---|------|------|--------|---------|---------|--------|-------|
| 6.1.1 | Unauthenticated request returns 401 | No session | Call GET /api/projects/767/direct-costs with no auth | API returns 401 "Unauthorized - please log in" | HIGH | 🔲 | |
| 6.1.2 | Authenticated user can view list | Standard user (test1@mail.com) | Navigate to `/767/direct-costs` | List loads; no access denied error | MEDIUM | 🔲 | |

---

## 7. Integrations

> Source: direct-costs-client.tsx (ERP sync), detail page (Acumatica link), Acumatica notes in MEMORY.md

### 7.1 Budget Impact

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.1.1 | Approved direct cost reflects in budget line | Approve a direct cost that references a specific budget code | Budget tool shows the amount as a direct cost against that cost code row | MEDIUM | 🔲 | Indirect — check via Budget tool |
| 7.1.2 | Line item budget code links to correct cost code | Create line item with a specific budget code; open Summary by Cost Code view | Cost code hierarchy view groups the line item under the correct division/code | HIGH | 🔲 | |

### 7.2 Acumatica ERP Sync

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.2.1 | ERP sync button triggers sync | List page → click "Sync ERP" button | Loading spinner shows; on completion toast shows "ERP sync complete: X created, Y updated" | HIGH | 🔲 | Calls POST /api/sync/acumatica/direct-costs |
| 7.2.2 | ERP Status column shows sync state | List page — look at ERP Status column | Column shows synced/unsynced state for each record | HIGH | 🔲 | `acumatica_sync_at` drives ERP status display |
| 7.2.3 | Synced record shows Acumatica link in detail | Open detail for a synced record (has acumatica_ref_nbr) | Acumatica row shows clickable link: `alleatogroup.acumatica.com/Main?ScreenId=PM304000&RefNbr=...` | HIGH | 🔲 | |
| 7.2.4 | ERP sync failure shows error toast | If Acumatica is unreachable | Toast shows error message from the API | MEDIUM | 🔲 | |
| 7.2.5 | Sync result reports partial failures | If some records fail during bulk sync | Toast includes "(X errors)" count; does not show generic failure for successful ones | MEDIUM | 🔲 | |

---

## 8. Reporting & Export

> Source: ExportDialog.tsx, /api/projects/[projectId]/direct-costs/export/route.ts, DirectCostExportSchema

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 8.1.1 | Open Export dialog | List page → click Export icon/button → Export dialog opens | Export dialog renders with format options and template options | MEDIUM | 🔲 | |
| 8.1.2 | Export to CSV (standard template) | Export dialog → Format = CSV, Template = standard → confirm | CSV file downloads; columns include Date, Vendor, Type, Invoice #, Status, ERP Status, Amount | MEDIUM | 🔲 | |
| 8.1.3 | Export with line items included | Export dialog → check "Include Line Items" → export | CSV/Excel includes line item rows: budget code, description, qty, UOM, unit cost, line total | MEDIUM | 🔲 | `include_line_items` defaults to true |
| 8.1.4 | Export to Excel | Export dialog → Format = Excel (xlsx) → export | `.xlsx` file downloads and opens correctly in spreadsheet software | LOW | 🔲 | Uses `xlsx` library |
| 8.1.5 | Export respects active filters | Apply Status = Approved filter, then export | Exported file contains only Approved records; totals match filtered view | MEDIUM | 🔲 | |

---

## 9. Advanced Features

> Source: direct-costs-client.tsx, direct-costs-table-utils.ts, LineItemsManager.tsx

### 9.1 Search

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.1.1 | Search by vendor name | Type a vendor name in the search box | List filters in real time to matching records | HIGH | 🔲 | Debounced search |
| 9.1.2 | Search by invoice number | Type an invoice number | List filters to matching records | HIGH | 🔲 | |
| 9.1.3 | Search by amount | Type an amount (e.g. "1500") | Records with matching amount string shown | MEDIUM | 🔲 | Searches `String(total_amount)` and formatted amount |
| 9.1.4 | Search by date | Type a date like "Mar" or "2026" | Records with matching date shown | MEDIUM | 🔲 | |
| 9.1.5 | Clear search restores full list | Clear the search box | All records in current filter set return | HIGH | 🔲 | |

### 9.2 Filters

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.2.1 | Filter by Status | Apply Status = "Approved" | Only Approved records shown; count badge updates | HIGH | 🔲 | |
| 9.2.2 | Filter by Cost Type | Apply Cost Type = "Invoice" | Only Invoice type records shown | HIGH | 🔲 | |
| 9.2.3 | Filter by Date From / Date To | Set date range (e.g. 2026-01-01 to 2026-03-31) | Only records with date within range shown | HIGH | 🔲 | |
| 9.2.4 | Filter by Min / Max Amount | Set Min Amount = $500, Max Amount = $5000 | Only records with total_amount between $500–$5000 shown | MEDIUM | 🔲 | |
| 9.2.5 | Combined filters | Apply Status = Pending AND Cost Type = Expense | List shows only records matching BOTH criteria | HIGH | 🔲 | |
| 9.2.6 | Filter state persists in URL | Apply a filter, copy URL, open in new tab | Filters are pre-applied from URL params on load | MEDIUM | 🔲 | Uses `searchParams` |

### 9.3 Column Visibility

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.3.1 | Toggle hidden column visible | Open column selector → enable "Received Date" | Received Date column appears in table | LOW | 🔲 | Received and Paid Date default to hidden |
| 9.3.2 | Toggle visible column hidden | Open column selector → hide "Vendor" | Vendor column disappears from table | LOW | 🔲 | |

### 9.4 Bulk Actions

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.4.1 | Select all records on page | Click header checkbox | All visible rows selected | HIGH | 🔲 | |
| 9.4.2 | Bulk Approve | Select 2+ records → bulk action "Approve" | All selected transition to Approved; toast shows success count | HIGH | 🔲 | POST /bulk operation=status-update status=Approved |
| 9.4.3 | Bulk Revise and Resubmit | Select 2+ records → bulk action "Revise and Resubmit" | All selected transition to Revise and Resubmit; toast confirms | HIGH | 🔲 | POST /bulk operation=status-update status=Revise and Resubmit |
| 9.4.4 | Bulk Delete | Select 2+ records → bulk action "Delete" → confirm | All selected records soft-deleted; removed from list; toast shows count | HIGH | 🔲 | POST /bulk operation=delete |
| 9.4.5 | Bulk action requires selection | Click bulk action button with 0 records selected | Nothing happens or button is disabled | HIGH | 🔲 | |

### 9.5 Line Item Drag-and-Drop Reordering

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.5.1 | Drag a line item to reorder | In create/edit form, drag the grip handle of line item #2 above line item #1 | Line items reorder visually; `line_order` values update in form state | MEDIUM | 🔲 | Uses @dnd-kit/core |

### 9.6 Line Item — Duplicate and Remove

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.6.1 | Duplicate a line item | Hover a line item row → click Copy icon | New line item added below with same budget code, qty, unit cost; description gets "(Copy)" suffix | MEDIUM | 🔲 | |
| 9.6.2 | Remove a line item (multiple items) | Hover a line item row → click Trash icon | Line item removed; grand total recalculates | HIGH | 🔲 | |
| 9.6.3 | Cannot remove the last line item | When only 1 line item remains, hover → Trash icon | Trash button is disabled; at least 1 line item required | HIGH | 🔲 | `disabled={itemCount === 1}` |

### 9.7 Create Budget Code Inline

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.7.1 | Create new budget code from line item | In line item budget code selector → click "Create New" | CreateBudgetCodeModal opens; user fills form; on success new budget code auto-selected on that line item | MEDIUM | 🔲 | |

---

## 10. Import

> Source: DirectCostsImportDialog.tsx (list toolbar)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.1.1 | Open Import dialog | List page → click "Import Direct Cost" | Import dialog opens with instructions | MEDIUM | 🔲 | Manifest confirms "Import Direct Cost" row action exists |
| 10.1.2 | Import records via dialog | Follow import dialog steps with a valid file | Records appear in list after import | MEDIUM | 🔲 | |

---

## Sources

| # | Title | URL / Location | Category |
|---|-------|---------------|---------|
| 1 | Direct Costs list page (server component) | `frontend/src/app/(main)/[projectId]/direct-costs/page.tsx` | List |
| 2 | Direct Costs client (table, filters, actions) | `frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-client.tsx` | List |
| 3 | Table utilities (columns, filters, formatters) | `frontend/src/app/(main)/[projectId]/direct-costs/direct-costs-table-utils.ts` | List |
| 4 | Direct Cost detail page | `frontend/src/app/(main)/[projectId]/direct-costs/[costId]/page.tsx` | Detail |
| 5 | DirectCostForm component | `frontend/src/components/direct-costs/DirectCostForm.tsx` | Form |
| 6 | LineItemsManager component | `frontend/src/components/direct-costs/LineItemsManager.tsx` | Form |
| 7 | Zod validation schemas | `frontend/src/lib/schemas/direct-costs.ts` | Validation |
| 8 | List/Create API route | `frontend/src/app/api/projects/[projectId]/direct-costs/route.ts` | API |
| 9 | Single record API route | `frontend/src/app/api/projects/[projectId]/direct-costs/[costId]/route.ts` | API |
| 10 | Bulk operations API route | `frontend/src/app/api/projects/[projectId]/direct-costs/bulk/route.ts` | API |
| 11 | Export API route | `frontend/src/app/api/projects/[projectId]/direct-costs/export/route.ts` | API |
| 12 | Procore manifest (list/create-form/detail states) | `.claude/procore-manifests/direct-costs/manifest.json` | Reference |
| 13 | Direct Costs investigation report | `.claude/investigations/direct-costs/investigation-report.md` | Reference |
| 14 | Acumatica integration notes | `MEMORY.md` — Acumatica Integration Notes section | Integration |
| 15 | Procore Direct Costs tool (list view) | https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/direct-costs/summary | Procore |

---

## Testing Session Log

| Date | Tester | Environment | Pass | Fail | Skip | Notes |
|------|--------|-------------|------|------|------|-------|
| | | localhost:3000 | | | | |
