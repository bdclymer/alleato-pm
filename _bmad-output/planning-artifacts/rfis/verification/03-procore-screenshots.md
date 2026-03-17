# RFIs — Procore Live Crawl

**Generated:** 2026-03-17
**Procore Project:** 562949954728542 (Goodwill Bart)
**Company:** 562949953443325 (Alleato Group)

## Screenshots Captured

| # | Page | Screenshot | Notes |
|---|------|-----------|-------|
| 1 | List view | [screenshots/01-list-view.png] | 21+ RFIs, full filter panel visible, 19 columns |
| 2 | Detail view (closed RFI) | [screenshots/02-detail-view.png] | Collapsible: Request, Responses, General Information. Actions: Reopen, Edit, Export, More Options |
| 3 | Create form | [screenshots/03-create-form.png] | Rich text editor for Question, all General Info fields, "Create as Draft" / "Create as Open" buttons |
| 4 | Edit form | [screenshots/04-edit-form.png] | Pre-populated fields, assignee chips with remove buttons, "Save Changes" button |
| 5 | Detail with responses | [screenshots/05-detail-with-responses.png] | Responses section expanded |
| 6 | Settings page | [screenshots/06-settings.png] | Full admin settings: RFI Manager config, privacy, due date defaults, custom fields, email notifications matrix, revisions |
| 7 | Actions menu | [screenshots/07-actions-menu.png] | Detail page action buttons |
| 8 | Filters panel | [screenshots/08-filters.png] | Left sidebar filters: Status, Resp Contractor, Received From, Assignees, RFI Manager, Ball In Court, Overdue, Locations, Cost Code, Sub Job, RFI Stage, Created By |
| 9 | Export options | [screenshots/09-export.png] | Dropdown: PDF (All Responses), PDF (Official Only), PDF, CSV |

## List View Columns (extracted from live DOM)

| # | Column Name | Present in Procore |
|---|-------------|-------------------|
| 1 | Number | Yes |
| 2 | Status | Yes |
| 3 | Subject | Yes |
| 4 | Responsible Contractor | Yes |
| 5 | Received From | Yes |
| 6 | Date Initiated | Yes |
| 7 | Assignees | Yes |
| 8 | Distribution List | Yes |
| 9 | RFI Manager | Yes |
| 10 | Ball In Court | Yes |
| 11 | Due Date | Yes |
| 12 | Closed Date | Yes |
| 13 | Location | Yes |
| 14 | Schedule Impact | Yes |
| 15 | Cost Impact | Yes |
| 16 | Cost Code | Yes |
| 17 | Sub Job | Yes |
| 18 | RFI Stage | Yes |
| 19 | Private | Yes |

## Form Fields (from Create Form DOM)

### Request Section
| Label | Type | Required | Notes |
|-------|------|----------|-------|
| Subject | text input | Yes (Open) | — |
| Question | rich text editor | Yes (Open) | Full toolbar: bold, italic, underline, strikethrough, alignment, lists, indent |
| Attachments | file upload | No | "Attach Files" button |

### General Information Section
| Label | Type | Required | Notes |
|-------|------|----------|-------|
| Number | text input | Auto | Auto-sequential |
| Due Date | date picker (month/day/year spinbuttons) | Yes (Open) | Auto-populated from settings default |
| RFI Manager | dropdown button | Yes | — |
| Status | display only | — | Shows on edit, not on create |
| Received From | combobox | No | Person selector |
| Assignees | combobox + chips | Yes (Open) | Multi-select with "Select a person" placeholder |
| Distribution List | combobox + chips | No | Multi-select with "Select a person" placeholder |
| Ball In Court | display only | — | Computed, not editable on create |
| Responsible Contractor | button/dropdown | No | Auto-populated from Received From |
| Specification | button "Select a Specification" | No | Dropdown |
| Location | button "Select a Location" | No | Dropdown |
| Created By | display only | — | Auto-set |
| RFI Stage | button/dropdown | No | — |
| Drawing Number | text input | No | — |
| Sub Job | button/dropdown | No | — |
| Date Initiated | display only | — | Auto-set |
| Cost Code | button/dropdown | No | — |
| Schedule Impact | button/dropdown | No | — |
| Cost Impact | button/dropdown | No | — |
| Reference | text input | No | — |
| Private | checkbox | No | — |

### Submit Actions
| Button | Description |
|--------|-------------|
| Create as Draft | Saves as Draft status (disabled until Subject filled) |
| Create as Open | Saves as Open status (disabled until required fields filled) |
| Cancel | Returns to list |

### Edit Form Differences
- "Save Changes" replaces "Create as Draft"/"Create as Open"
- Responses section visible (between Request and General Information)
- Assignees shown as chips with remove buttons
- Distribution list shown as chips with remove buttons

## Filter Panel Options (from list view)

| Filter | Type |
|--------|------|
| Status | Text/dropdown |
| Responsible Contractor | Text/dropdown |
| Received From | Text/dropdown |
| Assignees | Text/dropdown |
| RFI Manager | Text/dropdown |
| Ball In Court | Text/dropdown |
| Overdue | Checkbox |
| Locations | Button (multi-level?) |
| Cost Code | Text/dropdown |
| Sub Job | Text/dropdown |
| RFI Stage | Text/dropdown |
| Created By | Text/dropdown |

## Detail View Sections

| Section | Collapsible | Content |
|---------|-------------|---------|
| Request | Yes (expanded by default) | Subject, Question with rich text, attachments |
| Responses | Yes (expanded by default) | Assignee responses, official response designation |
| General Information | Yes (expanded by default) | All metadata fields in read-only format |

## Detail View Actions

| Action | Button Type | Notes |
|--------|-------------|-------|
| Reopen RFI / Close RFI | Primary action button | Status-dependent |
| Edit | Secondary button | Navigates to edit form |
| Export | Dropdown | PDF (All Responses), PDF (Official Only), PDF, CSV |
| More Options | Dropdown | Additional actions |

## Settings Page Options (extracted from live DOM)

| Setting | Type | Current State |
|---------|------|---------------|
| RFI Manager assignment mode | Radio (2 options) | "Allow Standard users to select..." checked |
| Enable Private RFIs | Checkbox | Checked |
| Set new RFIs to private by default | Checkbox | Unchecked |
| Days to Answer RFI Questions | Text input | — |
| Mark assignees' responses required by default | Checkbox | Unchecked |
| Only show official responses to Standard/Read-Only | Checkbox | Checked |
| Custom Field 1 Label | Text input | — |
| Custom Field 2 Label | Text input | — |
| Enable prefix RFI numbers by stage | Checkbox | Unchecked |
| Default Distribution List | Combobox (search users) | — |
| Enable email reminders for overdue RFIs | Checkbox | Checked |
| Email Notifications Matrix | ~38 checkboxes | Various checked/unchecked |
| Enable Revisions | Checkbox | Unchecked |

## Export Options

| Format | Description |
|--------|-------------|
| PDF - All Responses | Full RFI with all responses |
| PDF - Official Only | Only official response included |
| PDF | Standard PDF export |
| CSV | Spreadsheet export |
