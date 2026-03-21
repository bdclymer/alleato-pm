# Procore Change Events - Comprehensive Crawl Report

**Crawled:** 2026-03-21
**Project:** Alleato Group - 26-999 - MH (Project ID: 562949955214671)
**Company ID:** 562949953443325
**Authenticated as:** bclymer@alleatogroup.com

---

## Pages Crawled

| Page | URL |
|------|-----|
| List (Line Items) | `/tools/change-events/events` |
| Detail View (CE #004) | `/tools/change-events/events/562949957178970` |
| Edit Page (CE #004) | `/tools/change-events/events/562949957178970/edit` |
| Create New | `/tools/change-events/events/new` |
| Send RFQs | `/project/change_events/request_for_quotes/prepare_rfqs` |

---

## 1. LIST PAGE

### URL
`https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949955214671/tools/change-events/events`

### Page Title
"Change Events"

### Top Navigation Tabs
- **Line Items** (active tab)
- **No Line Items**
- **RFQs**
- **Recycle Bin**

### Top-Right Action Buttons
- **Export** (dropdown button)
- **+ Create** (primary CTA, links to `/events/new`)

### Toolbar Row (below tabs)
- **Search** input (text search)
- **Filters** button (opens filter panel)
- **View** dropdown: currently "Classic Summary"
- **Group by** dropdown: "Select a column to group"
- **Configure** button (column visibility/configuration)

### Bulk Action Toolbar (activated when rows are selected)
- **Add to** (dropdown - see section below)
- **Send Requests for Quote** (navigates to RFQ prep page)
- Count: "N items selected"

### Table Columns (Classic Summary view)
| Column | Group |
|--------|-------|
| CE Number - Title | — |
| Status | Change Event |
| Scope | Change Event |
| Type | Change Event |
| Change Reason | Change Event |
| Origin | Change Event |
| Prime PCO | Revenue |
| Prime PCO Title | Revenue |
| Cost ROM | Cost |
| RFQ Title | Cost |
| Commitment | Cost |
| Commitment Title | Cost |

### Change Events in Project
| # | Title | Status | Scope | Type | Change Reason |
|---|-------|--------|-------|------|---------------|
| 004 | New opening | OPEN | Out of Scope | Owner Change | Client Request |
| 003 | test | OPEN | Out of Scope | Owner Change | Client Request |
| 002 | mkh test | PENDING | Out of Scope | Owner Change | Client Request |
| 001 | Test Event | PENDING | Out of Scope | Owner Change | Client Request |

### Grand Totals Row
Shown at bottom with aggregate values for revenue and cost columns.

---

## 2. "ADD TO" DROPDOWN (list page bulk action)

Activated by: selecting one or more row checkboxes, then clicking "Add to"

**Dropdown options:**
1. **Commitment** (grayed out / disabled with ❓ help icon)
2. **Commitment CO** (grayed out / disabled with ❓ help icon)
3. **Prime Contract PCO** (grayed out / disabled with ❓ help icon)

**Dropdown includes a search box** at the top.

**Tooltip shown** (when hovering ? icon on Commitment CO):
> "1 selected line item has already been associated as a cost (Commitment CO). There are no Commitments with a status of unapproved."

**Key insight:** Options are disabled/enabled based on the state of the selected CE line items and whether valid contracts exist.

---

## 3. SEND REQUESTS FOR QUOTE (RFQ) WORKFLOW

### Trigger
Select CE row(s) → click "Send Requests for Quote" button

### Destination URL
`/project/change_events/request_for_quotes/prepare_rfqs`

### Page Title
"Send RFQs"

### Breadcrumb
Change Events > Send RFQs

### Form: GENERAL INFORMATION Section

| Field | Type | Notes |
|-------|------|-------|
| Title | Text input | Auto-populated: "CE #004 - New opening" |
| Due Date | Date picker | Default: 7 days from today (e.g., 03/28/2026) |
| Request Details | Rich text editor (WYSIWYG) | Auto-populated with CE title + description |
| Distribution | Dropdown (searchable) | "Select A Person..." placeholder |
| Attachments | File upload | Drag & Drop or click "Attach File(s)" |

**Rich text editor toolbar:** Bold, Italic, Underline, Strikethrough, Align Left/Center/Right, Bullets, Numbered list, Indent/Outdent, Cut, Copy, Paste, Font Size, Font Color, Background Color, Link, Undo/Redo

### Form: COMMITMENT SELECT Section

| Column | Type | Notes |
|--------|------|-------|
| Change Event Line Item | Read-only link | Links to the CE line item |
| RFQ Scope Description | Text input | Pre-populated from line item description |
| Contract Company | Dropdown | Auto-selected (e.g., "Deem, LLC") |
| Contract # | Dropdown | Auto-selected (e.g., "SC-002") |
| Recipients | Dropdown | Auto-selected from contract (e.g., "Richey, Jared") |
| Delete (×) | Button | Remove this line from RFQ |

### Action Buttons
- **Cancel** (link)
- **Create and Send RFQs** (primary orange button)

---

## 4. DETAIL VIEW PAGE

### URL
`https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949955214671/tools/change-events/events/562949957178970`

### Page Header
- Title: "Change Event #004: New opening"
- Breadcrumb: Change Events > #004 New opening
- **Edit** button (link to edit page)
- **Export** dropdown button
- Three-dot menu (•••) for additional actions

### Detail Tabs
- **General** (active)
- **Related Items (0)**
- **Comments (0)**
- **Emails (0)**
- **Change History (19)**
- **Advanced Settings**

### General Information Fields (read-only)

| Field | Value (example) |
|-------|----------------|
| Number | 004 |
| Title | New opening |
| Status | Open (badge) |
| Origin | -- |
| Type | Owner Change |
| Change Reason | Client Request |
| Scope | Out of Scope |
| Expecting Revenue | Yes |
| Line Item Revenue Source | Match Revenue to Latest Cost |
| Prime Contract for Markup Estimates | 1001 - Prime (linked) |
| Description | "Add new 3070 HM opening." |
| Attachments | -- |

---

## 5. LINE ITEMS SECTION (detail view)

### Line Items Toolbar
- **Search** input
- **Filters** button
- **Add to** (bulk action, same as list page)
- **Send Requests for Quote** (bulk action)
- **Group by** dropdown (default: "Item Type")
- **Configure columns** icon (⚙)
- "N items selected" count

### Line Items Table Columns (detail view)

**Detail group:**
| Column | Notes |
|--------|-------|
| Item Type | Grouped header (e.g., "Markup") |
| Budget Code | e.g., "26-1000.S", "55-0050.R", "55-0500.R" |
| Description | Free text description |
| Vendor | Linked vendor name |
| Contract | Linked contract (e.g., SC-002 - Electrical) |
| Unit of Measure | e.g., "ea" |

**Revenue group:**
| Column | Notes |
|--------|-------|
| Quantity | Numeric |
| Unit Cost | Currency |
| Revenue ROM | Calculated (with calculator icon) |
| Prime PCO | Linked PCO (e.g., "$1,200.00") |

**Cost group (detail view):**
| Column | Notes |
|--------|-------|
| (implied from data) | Cost ROM, RFQ Title, Commitment, Commitment Title |

### Line Items Data (CE #004)

**Direct Line Item:**
| Field | Value |
|-------|-------|
| Budget Code | 26-1000.S — Med-Volt Elect Distribution |
| Description | F&I 3070 HM Exterior Door with Storefront Hardware and... |
| Vendor | Deem, LLC |
| Contract | SC-002 - Electrical |
| Unit of Measure | ea |
| Quantity | 1 |
| Unit Cost | $1,200.00 |
| Revenue ROM | $1,200.00 |
| Prime PCO | $1,200.00 |
| Latest Price | $1,200.00 |

**Markup section (auto-calculated):**

| Budget Code | Description | Revenue ROM | Prime PCO | Latest Price |
|-------------|-------------|-------------|-----------|--------------|
| 55-0050.R — Insurance.Contract Revenue | Insurance | $16.20 | $16.20 | $16.20 |
| 55-0500.R — Contractor Fee.Contract Rev | Fee | $121.62 | $121.62 | $121.62 |
| **Markup Subtotals** | 2 Markup(s) | **$137.82** | **$137.82** | **$137.82** |

**Grand Totals:** $1,337.82 (Revenue) | $1,337.82 (Prime PCO) | $1,337.82 (Latest Price)

### Markup Row Indicators
- **⚡ (lightning bolt) icon** — appears on markup rows, indicates auto-calculated value
- **ℹ (info) icon** — appears next to markup values, shows tooltip with calculation details
- **🔒 (lock) icon** — appears on direct line item rows in edit mode, indicates committed/locked value

---

## 6. EDIT / CREATE PAGE

### URL (Edit)
`/tools/change-events/events/562949957178970/edit`

### URL (Create)
`/tools/change-events/events/new`

### Page Header
- Edit: "Edit Change Event" (breadcrumb: Change Events > #004 New opening)
- Create: "Create New Change Event" (breadcrumb: Change Events > New Change Event)

### Form: General Information Section

| Field | Type | Required | Options / Notes |
|-------|------|----------|-----------------|
| Number | Text input | Yes | Auto-incremented (e.g., "004", "005") — editable |
| Title | Text input | Yes | "Enter Title" placeholder |
| Status | Dropdown | Yes | **Closed, Open (default), Pending, Void** |
| Origin | Dropdown (searchable) | No | Categories: **Emails, Meetings, RFIs** (each expandable to sub-items) |
| Type | Dropdown (searchable) | No | **Allowance, Contingency, Owner Change, TBD, Transfer** |
| Change Reason | Dropdown (searchable, clearable) | No | **Allowance, Backcharge, Client Request, Design Development, Existing Condition** |
| Scope | Dropdown | No | **In Scope, Out of Scope, TBD** |
| Expecting Revenue | Radio buttons | No | **Yes (default), No** |
| Line Item Revenue Source | Dropdown | No | **Match Revenue to Latest Cost (default), Enter manually, Quantity x Unit Cost** |
| Prime Contract for Markup Estimates | Dropdown (searchable, clearable) | No | Shows available prime contracts (e.g., "1001 - Prime") |
| Description | Rich text editor (WYSIWYG) | No | Full formatting toolbar |
| Attachments | File upload | No | "Attach Files" button + Drag & Drop area |

### Status Options (full list)
- **Closed**
- **Open** (default on new)
- **Pending**
- **Void**

### Type Options (full list)
- Allowance
- Contingency
- Owner Change
- TBD
- Transfer

### Change Reason Options (full list)
- Allowance
- Backcharge
- Client Request
- Design Development
- Existing Condition

### Scope Options (full list)
- In Scope
- Out of Scope
- TBD

### Line Item Revenue Source Options (full list)
- Match Revenue to Latest Cost
- Enter manually
- Quantity x Unit Cost

### Origin Options (full list - grouped)
- **Emails** → (sub-list of project emails)
- **Meetings** → (sub-list of project meetings)
- **RFIs** → (sub-list of project RFIs)

---

## 7. LINE ITEMS SECTION (edit mode)

### Columns (edit mode)

**Detail group:**
| Column | Editable | Notes |
|--------|----------|-------|
| Budget Code | Yes | Searchable dropdown |
| Description | Yes | Text input |
| Vendor | Yes | Searchable dropdown |
| Contract | Yes | Searchable dropdown |
| Unit of Measure | Yes | Text/dropdown |

**Revenue group:**
| Column | Editable | Notes |
|--------|----------|-------|
| Quantity | Yes | Number input |
| Unit Cost | Yes | Currency input |
| Revenue ROM | Calculated | Calculator icon |

**Cost group:**
| Column | Editable | Notes |
|--------|----------|-------|
| Quantity | Yes | Number input |
| Unit Cost | Yes | Currency input |
| Cost ROM | Calculated | Calculator icon |
| Non-Committed Cost | Calculated | Read-only |

### Row Icons (edit mode)
- **🔒 (lock icon)** — right side of row, indicates line item is associated with a commitment
- **🗑 (trash icon)** — delete the line item row
- **✗ button** — cancel edit for that row

### Line Item Action Buttons (bottom of section)
1. **Add Line** — adds a new empty inline row
2. **Add Lines for All Commitments** — auto-creates line items for all project commitments
3. **Import Line Items from CSV** — bulk import via CSV file

### Column Header Context Menu (three-dot ••• on any column)
- Group by [Column Name]
- Pin Column →
- Autosize This Column
- Autosize All Columns
- Hide Column
- Sort By This Column →
- Reset Columns

### Form Action Buttons (bottom of page)
- **Cancel** — discards changes, returns to detail/list
- **Save** (edit) / **Create** (new) — primary orange button

---

## 8. MARKUP DROPDOWN (line items — detail view)

The "Markup" section is auto-generated based on the **Prime Contract for Markup Estimates** field. Markups are NOT directly editable in the line items table — they are configured in the Prime Contract settings and applied automatically.

### How Markup Works
1. Set **Prime Contract for Markup Estimates** on the Change Event
2. Procore reads markup rules from that Prime Contract
3. Markup rows auto-appear in the Line Items section under a "Markup" group header
4. Each markup row shows:
   - Budget Code (e.g., 55-0050.R)
   - Description (e.g., "Insurance.Contract Revenue")
   - Markup type (e.g., "Insurance", "Fee")
   - Calculated dollar amounts

### Markup Row Indicators
- **⚡ (lightning bolt)** = auto-calculated value (not manually entered)
- **ℹ (info icon)** = tooltip showing calculation basis

---

## 9. STATUS WORKFLOW

| Status | Meaning | Visual |
|--------|---------|--------|
| **Open** | Active, in progress | Blue badge |
| **Pending** | Awaiting action/approval | Orange/yellow badge |
| **Closed** | Completed/resolved | Gray badge |
| **Void** | Cancelled/voided | — |

---

## 10. DIFFERENCE: CREATE vs. EDIT VIEW

| Aspect | Create | Edit |
|--------|--------|------|
| Page title | "Create New Change Event" | "Edit Change Event" |
| Number field | Auto-incremented (next available) | Shows existing number |
| Status default | Open | Shows current status |
| Type default | Allowance | Shows current type |
| Scope default | TBD | Shows current scope |
| Change Reason | Empty | Shows current value |
| Line items | Empty table | Shows existing items |
| Save button text | **Create** | **Save** |
| Breadcrumb | Change Events > New Change Event | Change Events > #NNN Title |
| Markup section | Not shown (no items yet) | Shows if prime contract set |

---

## 11. RFQs TAB

### URL
`https://us02.procore.com/562949955214671/project/change_events/events?view=rfqs`

Available as a top-level tab on the list page. Shows all Request for Quotes associated with change events.

---

## 12. CONFIGURE COLUMNS (list view)

Accessed via "Configure" button on the list toolbar. Allows users to:
- Show/hide columns in the table
- Reorder columns
- Available column groups: Change Event, Revenue, Cost, Over/Under Budget, Budget Code Segments, Filters

---

## 13. EXPORT OPTIONS

**Export button** (dropdown) on list and detail pages. Likely includes:
- PDF export
- Excel/CSV export

---

## 14. ADVANCED SETTINGS TAB (detail view)

Accessible from the detail page tab bar. Contains additional configuration not shown in the General tab. Content not captured in this crawl.

---

## 15. KEY OBSERVATIONS FOR IMPLEMENTATION

### Required Fields
- **Number** (auto-generated, editable)
- **Title**
- **Status**

### Optional Fields with Important Business Logic
- **Prime Contract for Markup Estimates** — drives auto-calculation of markup rows
- **Line Item Revenue Source** — controls how revenue is calculated
- **Expecting Revenue** — Yes/No radio, affects UI behavior

### Bulk Actions on List Page
- Both "Add to" and "Send Requests for Quote" require ≥1 row selected
- "Add to" options (Commitment, Commitment CO, Prime Contract PCO) are context-sensitive — disabled with explanatory tooltip when preconditions not met

### Line Items
- Direct line items are editable inline in edit mode
- Markup rows are auto-generated (read-only), driven by Prime Contract markup rules
- Line items can be imported via CSV
- Line items can be bulk-created from all commitments

### Navigation Patterns
- List → Detail: click on CE number/title link
- Detail → Edit: click "Edit" button/link
- List → Create: click "+ Create" button
- Detail → RFQ: select line items → "Send Requests for Quote"
- List → RFQ: select rows → "Send Requests for Quote" in bulk toolbar

---

## Screenshots Index

| File | Description |
|------|-------------|
| `screenshots/list-page.png` | Change Events list with 4 events |
| `screenshots/add-to-dropdown.png` | "Add to" dropdown showing Commitment/Commitment CO/Prime Contract PCO |
| `screenshots/rfq-dialog.png` | Send RFQs full form page |
| `screenshots/detail-view.png` | CE #004 detail view, general info |
| `screenshots/detail-markup-section.png` | Line items with markup rows expanded |
| `screenshots/edit-page.png` | Edit Change Event form |
| `screenshots/edit-status-dropdown.png` | Status dropdown: Closed/Open/Pending/Void |
| `screenshots/edit-type-dropdown.png` | Type dropdown: Allowance/Contingency/Owner Change/TBD/Transfer |
| `screenshots/edit-change-reason-dropdown.png` | Change Reason options |
| `screenshots/edit-line-items.png` | Line items in edit mode with Add Line buttons |
| `screenshots/create-new.png` | Create New Change Event form |
