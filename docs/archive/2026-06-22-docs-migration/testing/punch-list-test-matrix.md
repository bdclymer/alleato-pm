# Punch List — Procore Feature Test Matrix

**Generated:** 2026-04-08

## Summary

| Category | # Tests | Priority |
|----------|---------|---------|
| Core Actions | 18 | HIGH |
| Views & Navigation | 10 | HIGH |
| Fields & Data | 12 | HIGH |
| Statuses & Workflows | 7 | HIGH |
| Attachments & Photos | 4 | MEDIUM |
| Permissions | 4 | MEDIUM |
| Integrations | 6 | MEDIUM |
| Reporting & Export | 4 | MEDIUM |
| Advanced Features | 13 | MEDIUM |
| **TOTAL** | **78** | |

---

## 1. Core Actions

> Source: Codebase — PunchItemFormDialog (create/edit), useCreatePunchItem, useDeletePunchItem, useRestorePunchItem, useUpdatePunchItem hooks; Procore Punch List tutorials

### 1.1 Create

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.1.1 | Create punch item with required fields only | 1. Navigate to /767/punch-list<br>2. Click "Create Punch Item"<br>3. Fill Title only: "Paint chip north wall"<br>4. Click "Create Punch Item" | Dialog closes; new item appears in list with status "Draft" and auto-assigned number; success toast shown | HIGH | 🔲 | |
| 1.1.2 | Create punch item with all optional fields | Fill all fields: Title, Description, Status=Work Required, Priority=High, Assignee Company, Ball in Court, Due Date, Location, Trade, Type, Reference | All field values persist; list row shows assignee, location, priority badge correctly | HIGH | 🔲 | |
| 1.1.3 | Create fails when Title is blank | Open form, leave Title empty, click "Create Punch Item" | Inline validation error on Title: "Title is required"; form stays open; no record created | HIGH | 🔲 | |
| 1.1.4 | Auto-number increments sequentially | Create two punch items in succession | First item gets next available number; second gets the one after; no duplicates | HIGH | 🔲 | |
| 1.1.5 | Default status is Draft on create | Open create form, do not change Status | Status field defaults to "Draft"; after save, badge shows "Draft" | HIGH | 🔲 | |
| 1.1.6 | Create with status set to Work Required | Open form, set Status = Work Required, fill Title, save | Item created with "Work Required" status badge | MEDIUM | 🔲 | |
| 1.1.7 | Cancel create discards data | Open form, type "Should Not Save" in Title, click Cancel | Dialog closes; no item named "Should Not Save" in list | HIGH | 🔲 | |

### 1.2 Edit

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.2.1 | Edit title and location | Hover row → action menu → Edit<br>2. Change Title and Location<br>3. Click "Save Changes" | Dialog closes; updated values show in list row; success toast appears | HIGH | 🔲 | |
| 1.2.2 | Edit form pre-fills all saved values | Create item with Location="Room 204", Trade="Electrical", Priority=High<br>2. Open Edit | Location, Trade, Priority, and all other saved fields are pre-filled; no blank dropdowns | HIGH | 🔲 | |
| 1.2.3 | Cancel edit discards changes | Open edit form, change Title to "This Should Not Save", click Cancel | Original title is still shown in list; "This Should Not Save" does not appear | HIGH | 🔲 | |
| 1.2.4 | Edit priority badge updates in list | Edit item, change Priority from Low to High, save | Priority badge in list row updates to "High" immediately | HIGH | 🔲 | |
| 1.2.5 | Edit status via form | Edit item, change Status to Closed, save | Status badge in list row updates to "Closed" | HIGH | 🔲 | |

### 1.3 Delete & Restore

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.3.1 | Soft delete moves item to Recycle Bin | Hover row → action menu → Delete | Item disappears from Items tab; appears in Recycle Bin tab; toast: "Punch item moved to recycle bin" | HIGH | 🔲 | |
| 1.3.2 | Recycle Bin shows only deleted items | Delete one item, click Recycle Bin tab | Only deleted item(s) shown; active items do not appear | HIGH | 🔲 | |
| 1.3.3 | Restore item from Recycle Bin | Recycle Bin tab → click "Restore" on an item | Item disappears from Recycle Bin; reappears in Items tab; toast: "Punch item restored" | HIGH | 🔲 | |
| 1.3.4 | Restored item retains original data | Restore item that had Trade="Plumbing", Priority=High | Restored item shows Trade="Plumbing" and Priority=High in Items list | MEDIUM | 🔲 | |
| 1.3.5 | Items tab does not show deleted items | Delete an item; stay on Items tab | Deleted item is immediately removed from Items list without page refresh | HIGH | 🔲 | |
| 1.3.6 | Recycle Bin shows "Restore" button instead of action menu | Click Recycle Bin tab; inspect row actions | Each row shows "Restore" button only — no Edit or Delete actions available in recycle bin | MEDIUM | 🔲 | |

---

## 2. Views & Navigation

> Source: Codebase — PunchListClient (table/card/list views, tabs, UnifiedTablePage)

### 2.1 List View & Tabs

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.1.1 | Page loads with correct columns | Navigate to /767/punch-list | Table renders with columns: #, Title, Status, Priority, Assignee, Location, Trade, Due Date | HIGH | 🔲 | |
| 2.1.2 | Items tab shows active items | Click Items tab | Active (non-deleted) punch items shown; count badge reflects visible items | HIGH | 🔲 | |
| 2.1.3 | Recycle Bin tab shows deleted items | Click Recycle Bin tab | Deleted items shown; Items tab items are hidden; Restore buttons visible | HIGH | 🔲 | |
| 2.1.4 | Tab count badges update after delete | Delete an item; observe Items tab badge | Items badge count decreases by 1; Recycle Bin tab shows the deleted item | HIGH | 🔲 | |
| 2.1.5 | Empty state shown when no items exist | Ensure no punch items exist; navigate to page | Empty state with title "No punch items found" and "Create your first punch item" button | MEDIUM | 🔲 | |
| 2.1.6 | Empty Recycle Bin shows empty state | Navigate to Recycle Bin with no deleted items | Empty state message: "Recycle Bin is empty" with description "Deleted punch items will appear here." | MEDIUM | 🔲 | |

### 2.2 View Modes

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.2.1 | Table view (default) renders correctly | Navigate to /767/punch-list | Items shown in standard data table with sortable columns and action menus | HIGH | 🔲 | |
| 2.2.2 | Card view renders correctly | Click Card view toggle in toolbar | Each item shown as card with: punch number, title, status badge, assignee, due date | MEDIUM | 🔲 | |
| 2.2.3 | List view renders correctly | Click List view toggle in toolbar | Each item shown as compact row with #, title on left, status badge on right | MEDIUM | 🔲 | |
| 2.2.4 | View persists in URL | Switch to Card view; copy URL; open in new tab | New tab opens in Card view (view= param in URL) | LOW | 🔲 | |

---

## 3. Fields & Data

> Source: Codebase — PunchItemFormDialog schema; database.types.ts punch_items table; Procore Punch List field reference

### 3.1 Form Fields

| # | Field | Type | Required | Test: Accepts Valid Input | Test: Rejects Invalid | Priority | Result |
|---|-------|------|---------|--------------------------|----------------------|---------|--------|
| 3.1.1 | Title | Text | Yes | Any non-empty string accepted | Empty string rejected with "Title is required" | HIGH | 🔲 |
| 3.1.2 | Description | Textarea | No | Multi-line text accepted and saved | — | MEDIUM | 🔲 |
| 3.1.3 | Status | Dropdown | Yes (defaults Draft) | Draft, Work Required, Initiated, Closed all selectable | — | HIGH | 🔲 |
| 3.1.4 | Priority | Dropdown | No | Low, Medium, High all selectable; blank allowed | — | HIGH | 🔲 |
| 3.1.5 | Assignee Company | Text | No | Free text company name accepted and saved | — | MEDIUM | 🔲 |
| 3.1.6 | Ball in Court | Text | No | Free text accepted (responsible party) | — | MEDIUM | 🔲 |
| 3.1.7 | Due Date | Date | No | Valid date accepted; displayed formatted in list | Invalid date string not allowed | HIGH | 🔲 |
| 3.1.8 | Location | Text | No | Free text location accepted and saved | — | MEDIUM | 🔲 |
| 3.1.9 | Trade | Text | No | Free text trade name accepted | — | MEDIUM | 🔲 |
| 3.1.10 | Type | Text | No | Free text type accepted | — | LOW | 🔲 |
| 3.1.11 | Reference | Text | No | Reference number or URL accepted | — | LOW | 🔲 |

### 3.2 Data Display

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 3.2.1 | Due date displays formatted in list | Create item with due date 2026-05-15 | List shows formatted date (e.g. "5/15/2026"); not raw ISO string | HIGH | 🔲 | |
| 3.2.2 | Missing optional fields show dash | Create item with only Title filled | Assignee, Location, Trade, Due Date columns show "–" not blank | MEDIUM | 🔲 | |

---

## 4. Statuses & Workflows

> Source: Codebase — punchFilters status options (draft, work_required, initiated, closed); PunchItemStatusBadge

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.1.1 | New item defaults to Draft status | Create item without changing Status | Status badge shows "Draft" (grey) | HIGH | 🔲 | |
| 4.1.2 | Set status to Work Required | Create/Edit item, set Status = Work Required, save | Status badge shows "Work Required" (orange) | HIGH | 🔲 | |
| 4.1.3 | Set status to Initiated | Edit item, set Status = Initiated, save | Status badge shows "Initiated" (primary blue) | HIGH | 🔲 | |
| 4.1.4 | Close a punch item | Edit item, set Status = Closed, save | Status badge shows "Closed" (green) | HIGH | 🔲 | |
| 4.1.5 | Status filter shows only matching items | Set Status filter = Work Required | Only "Work Required" items shown; Draft, Initiated, Closed hidden | HIGH | 🔲 | |
| 4.1.6 | Status badge colors match design | View list with all 4 statuses present | Draft=grey, Work Required=orange, Initiated=primary, Closed=green | MEDIUM | 🔲 | |
| 4.1.7 | Closed item can be re-opened | Edit a Closed item, change status to Work Required, save | Status badge updates to "Work Required"; item remains in Items list | MEDIUM | 🔲 | Notes: no lock-down behavior currently implemented |

---

## 5. Attachments & Photos

> Source: Procore Punch List — Add Photos/Attachments tutorial; current implementation (dialog does not yet have attachment UI)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.1.1 | Attachment UI present on form | Open Create Punch Item dialog | File upload / attachment section visible in form | MEDIUM | 🔲 | Gap: not yet implemented in current dialog |
| 5.1.2 | Attach a photo to a punch item | Create/edit punch item → upload a JPG photo | Photo thumbnail appears on the punch item; no error | MEDIUM | 🔲 | Gap: not yet implemented |
| 5.1.3 | Attach a PDF document to a punch item | Upload a PDF as an attachment | PDF listed as attachment with download link | MEDIUM | 🔲 | Gap: not yet implemented |
| 5.1.4 | Delete an attachment | Click delete on an existing attachment → confirm | Attachment removed; no longer visible | MEDIUM | 🔲 | Gap: not yet implemented |

---

## 6. Permissions

> Source: Procore Permissions Matrix — Punch List; Procore roles: Read Only, Standard, Admin

| # | Test | Role | Action | Expected | Priority | Result | Notes |
|---|------|------|--------|---------|---------|--------|-------|
| 6.1.1 | Standard user can view punch list | Standard user (test1@mail.com) | Navigate to /767/punch-list | List loads; items visible; no access denied | MEDIUM | 🔲 | |
| 6.1.2 | Standard user can create punch items | Standard user | Click "Create Punch Item", fill and submit | Item created successfully | MEDIUM | 🔲 | |
| 6.1.3 | Standard user can edit own punch items | Standard user | Edit a punch item they created | Edit form opens; changes saved | MEDIUM | 🔲 | |
| 6.1.4 | Standard user can delete punch items | Standard user | Delete a punch item via row action | Item moved to Recycle Bin | MEDIUM | 🔲 | |

---

## 7. Integrations & Cross-Tool Links

> Source: Procore — Link Punch Items to Drawings, Photos, Schedule, Inspections; current implementation (reference field used as drawing link placeholder)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 7.1.1 | Reference field links to drawing | Create punch item with Reference: "DWG-A101" | Reference value saved and displayed on item | MEDIUM | 🔲 | Current: free-text only; no linked drawing UI |
| 7.1.2 | Punch item linked to RFI | (Future) Create punch item, link to an RFI | Linked RFI number/title visible on punch item | LOW | 🔲 | Gap: not yet implemented |
| 7.1.3 | Punch item linked to inspection | (Future) Link punch item to an inspection item | Inspection reference shown on punch item | LOW | 🔲 | Gap: not yet implemented |
| 7.1.4 | Punch item linked to schedule task | (Future) Link to a schedule task | Schedule task reference visible | LOW | 🔲 | Gap: not yet implemented |
| 7.1.5 | Punch items visible in project overview | Navigate to project dashboard after creating items | Open punch item count shown in dashboard widget or summary | MEDIUM | 🔲 | |
| 7.1.6 | Ball in Court field tracks responsibility | Edit item, set Ball in Court = "Subcontractor", save | Ball in Court value persists; reflects responsible party | MEDIUM | 🔲 | |

---

## 8. Reporting & Export

> Source: Codebase — Export button (CSV/PDF dropdown) in PunchListClient header actions

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 8.1.1 | Export punch list as CSV | List page → click "Export" → select "CSV" | CSV file downloads; columns include #, Title, Status, Priority, Assignee, Location, Trade, Due Date | MEDIUM | 🔲 | |
| 8.1.2 | Export punch list as PDF | List page → click "Export" → select "PDF" | PDF downloads with punch list items in readable format; no error | MEDIUM | 🔲 | |
| 8.1.3 | Export respects active filters | Apply Status=Work Required filter, then export CSV | CSV contains only Work Required items | MEDIUM | 🔲 | |
| 8.1.4 | Export with no items shows empty file | Ensure no items exist; export CSV | CSV downloads with headers only; no error or crash | LOW | 🔲 | |

---

## 9. Advanced Features

> Source: Codebase — UnifiedTablePage search, filters, column visibility, sort; PunchListClient; Procore Punch List advanced features

### 9.1 Search

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.1.1 | Search by partial title | Type "cracked" in search box | List filters to items whose title contains "cracked" | HIGH | 🔲 | |
| 9.1.2 | Search by item number | Type the number of a known item (e.g. "3") | List filters to matching item(s) | HIGH | 🔲 | |
| 9.1.3 | Search by assignee company | Type a known company name in search | List filters to items with matching assignee | MEDIUM | 🔲 | |
| 9.1.4 | Search by location | Type part of a known location | List filters to matching items | MEDIUM | 🔲 | |
| 9.1.5 | Search by trade | Type a known trade name | List filters to items with matching trade | MEDIUM | 🔲 | |
| 9.1.6 | Clear search restores full list | Type in search, then clear the box | All items return to list | HIGH | 🔲 | |
| 9.1.7 | Search in Recycle Bin | Go to Recycle Bin tab, search for deleted item | Recycle Bin filters to matching deleted items | MEDIUM | 🔲 | Placeholder text changes to "Search deleted punch items..." |

### 9.2 Filters

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.2.1 | Filter by Status = Draft | Apply Status = Draft filter | Only Draft items visible | HIGH | 🔲 | |
| 9.2.2 | Filter by Priority = High | Apply Priority = High filter | Only High priority items visible | HIGH | 🔲 | |
| 9.2.3 | Combine Status + Priority filters | Apply Status = Work Required AND Priority = High | Only items matching both conditions shown | MEDIUM | 🔲 | |
| 9.2.4 | Clear filters restores full list | Apply any filter, then click clear | All items returned | HIGH | 🔲 | |

### 9.3 Sorting

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.3.1 | Sort by # ascending | Click # column header | Items sorted from lowest to highest number | MEDIUM | 🔲 | Default is descending |
| 9.3.2 | Sort by Title alphabetically | Click Title column header | Items sorted A→Z | MEDIUM | 🔲 | |
| 9.3.3 | Sort by Due Date | Click Due Date column header | Items sorted earliest to latest; null dates at end | MEDIUM | 🔲 | |

### 9.4 Column Visibility

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.4.1 | Hide Trade column | Open column selector → uncheck Trade | Trade column disappears; other columns unaffected | LOW | 🔲 | |
| 9.4.2 | # column cannot be hidden | Open column selector | # (number) column is not listed or is locked; cannot be hidden | LOW | 🔲 | alwaysVisible: true in code |

---

## Sources

| # | Title | URL | Category |
|---|-------|-----|---------|
| 1 | Procore Punch List — Overview | https://v2.support.procore.com/process-guides/about-punch-lists | Punch List |
| 2 | Create a Punch List Item | https://v2.support.procore.com/product-manuals/punch-list-project/tutorials/create-a-punch-list-item | Punch List |
| 3 | Edit a Punch List Item | https://v2.support.procore.com/product-manuals/punch-list-project/tutorials/edit-a-punch-list-item | Punch List |
| 4 | Delete a Punch List Item | https://v2.support.procore.com/product-manuals/punch-list-project/tutorials/delete-a-punch-list-item | Punch List |
| 5 | Close a Punch List Item | https://v2.support.procore.com/product-manuals/punch-list-project/tutorials/close-a-punch-list-item | Punch List |
| 6 | Add Attachments to a Punch List Item | https://v2.support.procore.com/product-manuals/punch-list-project/tutorials/add-attachments-to-a-punch-list-item | Punch List |
| 7 | Permissions Matrix — Punch List | https://v2.support.procore.com/process-guides/permissions-matrix/project-level-punch-list-permissions | Punch List |
| 8 | Procore Punch List Settings | https://v2.support.procore.com/product-manuals/punch-list-project/tutorials/configure-punch-list-settings | Punch List |
| 9 | Punch List Reference | https://v2.support.procore.com/reference-punch-list | Punch List |
| 10 | Codebase — PunchListClient | frontend/src/app/(main)/[projectId]/punch-list/punch-list-client.tsx | Implementation |
| 11 | Codebase — PunchItemFormDialog | frontend/src/components/domain/punch-items/punch-item-form-dialog.tsx | Implementation |
| 12 | Codebase — PunchItemStatusBadge | frontend/src/components/domain/punch-items/punch-item-status-badge.tsx | Implementation |
| 13 | Codebase — use-punch-items hooks | frontend/src/hooks/use-punch-items.ts | Implementation |
| 14 | Procore Manifest — Punch List | .claude/procore-manifests/punch-list/manifest.json | Reference |
| 15 | Punch List Scenarios | docs/testing/punch-list-scenarios.md | Reference |

---

## Known Gaps (Implementation vs. Procore)

| Gap | Description | Impact |
|-----|-------------|--------|
| No detail page | Punch items have no dedicated detail view — all edits happen via dialog | MEDIUM — no tab-based detail (comments, history, attachments) |
| No attachments/photos UI | Form dialog has no file upload; `enableExport` is wired but may not generate files | HIGH — core Procore feature |
| No bulk delete | `enableBulkDelete: false` in feature flags | MEDIUM |
| No row selection | `enableRowSelection: false` in feature flags | MEDIUM |
| No comment thread | No comments tab or inline notes on punch items | MEDIUM |
| No change history | No audit log for field changes | LOW |
| No drawing link | Reference field is free text; no linked drawing pin | MEDIUM |
| No user picker for assignee | `assignee_company` is free text, not a user/company selector | MEDIUM |
| No Punch Item Manager role | Procore has a distinct "Punch Item Manager" role; not modeled | LOW |
| No Final Approver | Procore has a Final Approver field; not in current form | LOW |
| No distribution list | Procore supports email distribution on punch items; not implemented | LOW |
| No overdue email alerts | Procore setting: enable overdue emails for assignees; not implemented | LOW |

---

## Testing Session Log

| Date | Tester | Environment | Pass | Fail | Skip | Notes |
|------|--------|-------------|------|------|------|-------|
| | | localhost:3000 | | | | |
