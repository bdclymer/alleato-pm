# SUBMITTALS — UI Forms

This document defines UI forms required to implement the submittals module.
Field definitions are derived from the edit form screenshot and DOM analysis.

## Create / Edit Submittal Form

**Commands:** `create_submittal`, `edit_submittal`, `update_submittal`
**Source:** Edit form captured from detail page (screenshot: `submittals-detail-open_edit_submittal_form.png`)

### General Information Section

| Field | Label | Type | Required | Widget | Notes |
|-------|-------|------|----------|--------|-------|
| title | Title | text | Yes* | text input | Free text, displayed as heading |
| specification_section | Specification | text | No | searchable dropdown | CSI spec code (e.g., "08-1113 - Doors, Frames, Hardware") |
| number | Number | text | Yes* | text input | Part of "Number & Revision" combined field |
| revision | Revision | text | Yes* | text input | Part of "Number & Revision" combined field, default "0" |
| submittal_type | Submittal Type | text | No | dropdown | e.g., "Product Information" |
| submittal_package_id | Submittal Package | reference | No | dropdown | FK to submittal_packages |
| responsible_contractor_id | Responsible Contractor | reference | No | searchable dropdown (company) | FK to companies (e.g., "CMD Door & Trim Inc") |
| received_from_id | Received From | reference | No | searchable dropdown (contact) | FK to contacts (e.g., "Jared Campbell (CMD Door & Trim Inc)") |
| submittal_manager_id | Submittal Manager | reference | Yes* | searchable dropdown (contact) | FK to contacts (e.g., "AJ Taylor (Alleato Group)") |
| status | Status | text | No | dropdown | e.g., "Closed" |
| final_due_date | Final Due Date | date | No | date display (read-only?) | Shown as "11/11/2022" |
| cost_code_id | Cost Code | reference | No | searchable dropdown | FK to cost_codes ("Select a Cost Code") |
| location_id | Location | reference | No | searchable dropdown | FK to locations ("Select a Location") |
| linked_drawings | Linked Drawings | reference[] | No | multi-select | Links to drawings tool |

### Distribution & Scheduling Section

| Field | Label | Type | Widget | Notes |
|-------|-------|------|--------|-------|
| distribution_list | Distribution List | reference[] | multi-select (contacts) | Tag-style chips with X to remove. Shows "Name (Company)" |
| ball_in_court | Ball In Court | text | display | Shows current responsible party, may be computed |
| lead_time | Lead Time | integer | number input + "day(s)" suffix | Business days |
| required_on_site_date | Required On-Site Date | date | date picker (Month/Day/Year) | Three-part date selector |

### Content Section

| Field | Label | Type | Widget | Notes |
|-------|-------|------|--------|-------|
| is_private | Private | boolean | checkbox | Label: "Visible only to admins, workflow, and distribution list members." |
| description | Description | text | rich text editor | Required*. Has toolbar: Bold, Italic, Underline, Strikethrough, alignment, lists, indent, tables, font size (12pt), colors, undo/redo |
| attachments | Attachments | file[] | file upload area | "Attach Files" button, drag-and-drop zone |

### Workflow Section (within edit form)

| Field | Label | Type | Widget | Notes |
|-------|-------|------|--------|-------|
| workflow_template | Select a Template... | reference | dropdown | Pre-defined workflow templates |
| workflow_steps | Workflow Steps | complex | step builder | "Add Step" button to add workflow steps |

### Form Actions

| Button | Command | Style | Notes |
|--------|---------|-------|-------|
| Cancel | cancel | text/link | Returns to detail view |
| Update | update_submittal | primary (orange) | Saves without email |
| Update & Send Emails | update_and_send_emails | secondary | Saves and sends notification emails |
| Delete | delete_submittal | icon (trash) | Top-right corner, destructive |

---

## Create Submittal Package Form

**Command:** `create_submittal_package`
**Source:** Create menu dropdown

| Field | Label | Type | Required | Notes |
|-------|-------|------|----------|-------|
| | | | | *Form fields not captured in crawl — needs separate crawl of package creation flow* |

---

## Filter Form

**Command:** `add_filter`
**Source:** Filter panel (screenshot: `submittals-list-open_filter_panel.png`)

| Filter Field | Type | Widget | Notes |
|-------------|------|--------|-------|
| Approver | reference | dropdown/search | Filter by approver person |
| Ball In Court | reference | dropdown/search | Filter by current responsible party |
| Created By | reference | dropdown/search | Filter by creator |
| Current Revision | text/number | input | Filter by revision number |
| Division | text | dropdown | CSI division filter |
| Location | reference | dropdown | Filter by project location |
| Number | text/number | input | Filter by submittal number |
| Private | boolean | checkbox/toggle | Filter by private flag |
| Received From | reference | dropdown/search | Filter by sender |
| Response | text | dropdown | Filter by response status (Submitted, Pending, Approved, Approved as Noted) |
| Responsible Contractor | reference | dropdown/search | Filter by responsible company |

---

## Notes

- Fields marked with `*` are required (shown with red asterisk in Procore UI)
- "Searchable dropdown" means the field supports type-ahead search
- Distribution List shows contacts as colored tag chips: "Name (Company) X"
- The edit form URL pattern: `/tools/submittals/{id}` with Edit button click
- Rich text editor supports: Bold, Italic, Underline, Strikethrough, alignment (left/center/right), ordered/unordered lists, indent/outdent, table insert, font size, text/highlight color, undo/redo
