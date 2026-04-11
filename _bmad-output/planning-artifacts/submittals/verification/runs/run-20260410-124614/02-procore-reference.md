# Procore Submittals Tool -- Authoritative Reference

**Generated**: 2026-04-10
**Sources**: RAG queries (12), crawl manifest, crawl detailed report, PRP, Procore support articles

---

## Business Rules & Workflows

### Submittal Lifecycle

A submittal in Procore represents written and/or physical information provided by subcontractors to the general contractor, then to the design team for approval of equipment, materials, etc. before fabrication and delivery. Common formats include shop drawings, cut sheets on equipment, and material samples.

### Status State Machine

```
Draft --> Open --> Closed
                    |
                    +--> Distributed (optional final step after Close)
```

**Statuses:**

| Status | Description | Transitions To |
|--------|-------------|----------------|
| **Draft** | Initial status for newly created submittals. Not yet sent for review. | Open |
| **Open** | Submittal has been sent out for review via "Create & Send" or "Update & Send Emails". Ball In Court is assigned. | Closed |
| **Closed** | All approver responses received or manually closed by Submittal Manager. | Distributed |
| **Distributed** | Submittal has been distributed to the distribution list members. This is the terminal state. Status set automatically when distribution occurs. | (terminal) |

**Custom statuses** can be created at the company admin level. Common custom statuses include:
- Approved / No Exceptions
- Approved as Noted
- Revise and Resubmit
- Rejected
- For Record Only

Custom statuses help distinguish final versions from intermediate revisions. Without them, all closed submittals look the same.

### Approver Response Statuses

Each approver/reviewer in the workflow provides an individual response:

| Response | Description |
|----------|-------------|
| **Pending** | No response yet (default when workflow step is assigned) |
| **Submitted** | Submitter has uploaded/submitted their materials |
| **Approved** | Approver approves the submittal |
| **Approved as Noted** | Approver approves with comments/markups |
| **Revise and Resubmit** | Approver rejects; requires a new revision |
| **Rejected** | Approver rejects outright |
| **Reviewed - No Exception** | Reviewer finds no issues |

### Ball In Court Logic

"Ball In Court" (BIC) tracks who currently needs to take action on a submittal.

**Rules:**
1. When a submittal is first sent for approval, the members of the **first group** in the workflow are assigned BIC.
2. When **all required members** of a group submit a response, BIC automatically advances to the **next group** in the sequential workflow.
3. The designation changes in sequential order until the last group in the workflow has responded.
4. After the final group responds, BIC returns to the **Submittal Manager**.
5. A Submittal Manager with Admin permissions can **manually change** BIC at any time by editing the workflow.
6. Removing an approver from the workflow automatically flags the next person/group as BIC and sends an "Action Required" email.

**Parallel vs Sequential Approval:**
- **Sequential** (default): Groups are processed in order. Group 2 does not receive notification until Group 1 completes.
- **Parallel**: All groups receive notification simultaneously. The Submittal Manager and all workflow members are notified at once.

The BIC view tab on the list page groups submittals by who currently has the ball in court.

### Revision Workflow

- You can only create a revision for the **most current revision** of a submittal (e.g., Rev 0 -> Rev 1, not Rev 0 -> Rev 3).
- Creating a revision copies the submittal data and increments the revision number.
- The previous revision is archived; only the most current version is shown in the list.
- Revision history is visible on the detail view showing Revision Number, Title, Date Created, and Status.
- A PDF icon allows downloading a copy of any listed revision.

### Distribution Workflow

Distribution is the act of sending the approved/final submittal to project team members.

**Prerequisites for distribution:**
1. The submittal must have a minimum of one (1) approver in the workflow.
2. The submittal must have at least one (1) approver response.
3. Submittals in the Recycle Bin cannot be distributed.

**When a submittal is distributed:**
- Status is set to **Closed**.
- Date, action, and timestamp are logged in the Change History tab.
- A "Submittal Distributed" banner appears with date and time.
- Email notifications sent to distribution list members.

**Close and Distribute** can be done in one step, or separately:
- **Close only**: Update status to Closed.
- **Close and Distribute**: Close, then distribute to list members with email notification.
- **Redistribute**: After initial distribution, you can redistribute to send updated information.

### Email Notifications

Automatic emails are sent for these events:
- Submittal created
- Submittal sent for review (Create & Send / Update & Send Emails)
- Approver response submitted
- Approver response edited
- Attachments added/changed
- Status changed
- Submittal distributed

Settings page controls which roles receive each notification type:

| Email Event | Creator | Submittal Manager | Submitter | Approver | Reviewer | Distribution Group |
|-------------|---------|-------------------|-----------|----------|----------|-------------------|
| (7 configurable events) | Yes/No | Yes/No | Yes/No | Yes/No | Yes/No | Yes/No |

**"Action Required" emails** to BIC users are NOT controlled by these settings -- they always send.

**Forward by Email**: Allows sending an email outside of the automatic notification system to any email address.

---

## UI Structure & Fields

### List View (Submittals Log)

**Views/Tabs:**

| Tab | Description |
|-----|-------------|
| **Items** | Default view. Flat list of all submittals. Supports search, filters, sort, bulk actions. |
| **Packages** | Submittals grouped by Submittal Package. |
| **Spec Sections** | Submittals grouped by Specification Section/Division. |
| **Ball In Court** | Submittals grouped by who currently has BIC responsibility. |
| **Recycle Bin** | Soft-deleted submittals. Can be restored or permanently deleted. |

A "More" dropdown contains additional tabs when screen width is limited.

**List View Columns (12 columns):**

| # | Column | Field | Type | Notes |
|---|--------|-------|------|-------|
| 1 | Spec | specification_section | text | Spec section number (e.g., "06 25 09") |
| 2 | # | number | text | Submittal number (e.g., "001" or "06 25 09 - 001" if numbered by spec section) |
| 3 | Rev. | revision | integer | Revision number (0, 1, 2...) |
| 4 | Title | title | text | Submittal title/name |
| 5 | Type | submittal_type | text | Submittal type (Shop Drawings, Product Data, Samples, etc.) |
| 6 | Status | status | badge | Draft, Open, Closed, Distributed (+ custom statuses) |
| 7 | Responsible C. | responsible_contractor | text (FK to company) | The company responsible for producing the submittal |
| 8 | Received From | received_from | text (FK to person/company) | Who the submittal was received from |
| 9 | Ball In Court | ball_in_court | text | Person(s) currently responsible for action |
| 10 | Approvers | approvers | text[] | Names of all approvers in the workflow |
| 11 | Response | response | text/badge | Aggregate response status |
| 12 | Sent Date | sent_date | date | Date the submittal was sent for review |

**Column configuration** is available in Settings (General tab) with options to:
- Show/hide columns
- Reorder columns
- Set default sort column and direction (ascending/descending)
- Reset to default

### Create/Edit Form Fields

**Section: General Information**

| Field | Label | Type | Required | Notes |
|-------|-------|------|----------|-------|
| title | Title | text input | Yes | Free text |
| specification_section | Specification | select/search | No | Linked to project Specifications tool |
| number | Number | text/auto | Yes | Can be auto-generated; "Number Submittals by Spec Section" setting adds prefix |
| revision | Revision | integer (read-only on create) | Yes | Starts at 0; incremented via "Create Revision" action |
| submittal_type | Submittal Type | select | No | Company-configurable. Defaults: Shop Drawings, Product Data, Samples, etc. |
| submittal_package | Submittal Package | select | No | Existing package or create inline |
| responsible_contractor | Responsible Contractor | select (company) | No | From project directory companies |
| received_from | Received From | select (company/person) | No | From project directory |
| submittal_manager | Submittal Manager | select (person) | Yes | Project team member. Default set in tool settings. |
| status | Status | select | No | Draft (default), Open, Closed, Distributed + custom |
| final_due_date | Final Due Date | date picker | No | May be calculated via Schedule Calculations feature |
| cost_code | Cost Code | select | No | From project cost codes |
| location | Location | select | No | From project locations (tiered) |
| linked_drawings | Linked Drawings | multi-select | No | Links to Drawings tool |

**Section: Schedule Information (optional -- requires "Submittal Schedule Calculations" enabled)**

| Field | Label | Type | Notes |
|-------|-------|------|-------|
| lead_time | Lead Time | number (days) | Number of days for fabrication/delivery |
| required_on_site_date | Required On-Site Date | date picker | Date materials must be on-site |
| internal_review_time | Internal Review Time | number (days) | Days allotted for internal review |

When Schedule Calculations is enabled, the system can auto-calculate due dates based on lead time, review time, and required on-site date.

**Section: Workflow**

| Field | Label | Type | Notes |
|-------|-------|------|-------|
| workflow_template | Workflow Template | select | Pre-configured workflow templates |
| workflow_steps | Submittal Workflow | drag-and-drop list | Ordered steps with Role (Submitter/Approver/Reviewer) and Person assignment |

Workflow steps support:
- Adding submitters, approvers, and reviewers
- Drag-and-drop reordering (via vertical grip icon)
- Grouping (parallel approval within a group)
- Removing participants

**Section: Distribution & Visibility**

| Field | Label | Type | Notes |
|-------|-------|------|-------|
| distribution_list | Distribution List | multi-select (tag chips) | People to receive the final distributed submittal |
| ball_in_court | Ball In Court | text (auto-calculated) | Read-only; set by workflow logic |
| is_private | Private | checkbox | "Visible only to admins, workflow, and distribution list members" |

**Section: Content**

| Field | Label | Type | Notes |
|-------|-------|------|-------|
| description | Description | rich text editor | Supports bold, italic, underline, strikethrough, alignment, indentation |
| attachments | Attachments | file upload (drag-and-drop) | From computer or from project Documents tool |

**Section: Delivery Information**

| Field | Label | Type | Notes |
|-------|-------|------|-------|
| anticipated_delivery_date | Anticipated Delivery Date | date picker | When delivery is expected |

**Form Actions:**
- **Create** / **Update**: Save without sending email notifications
- **Create & Send** / **Update & Send Emails**: Save and send email notifications to workflow members, distribution list, and submittal manager
- **Cancel**: Discard changes
- **Delete** (edit mode only): Trash icon, sends to Recycle Bin

### Detail View

**Header:**
- Title, Number & Revision, Status badge
- Toolbar: Edit button, Redistribute button, Actions dropdown (overflow menu)

**Tabs:**

| Tab | Content |
|-----|---------|
| **General** | Distribution summary, Description (rich text), Workflow Responses section |
| **Related Items** | Linked items (Bids, RFIs, Change Events, etc.) with count |
| **Emails** | Email history with count |
| **Change History** | Audit log of all changes with timestamps and count |

**General Tab Sections:**

1. **Distribution Summary** (shown after distribution):
   - From: Submittal Manager name + company
   - To: List of recipients
   - Message: Distribution message text
   - Attachments: File list with download links
   - "Submittal Distributed" banner with date/time

2. **Description**: Rich text content

3. **Workflow Responses**: Cards for each approver showing:
   - Person name + company
   - Role (Submitter/Approver/Reviewer)
   - Response status badge
   - Comments/notes
   - Attachments with "CURRENT" badge on latest
   - Response date

4. **Revision History**: Table showing Revision Number, Title, Date Created, Status with PDF download icon

---

## Toolbar & Actions

### List View Toolbar

| Button | Type | Options/Behavior |
|--------|------|-----------------|
| **Create** | Dropdown | "Submittal" (opens create form), "Submittal Package" (creates a package) |
| **Export** | Dropdown | PDF, CSV, Excel (see Export section) |
| **Reports** | Dropdown | "Submittal Approvers Response Time" report |
| **Search** | Button | Opens search bar; searches across title, number, spec section |
| **Add Filter** | Button | Opens filter panel (see Filters below) |
| **Clear All** | Button | Clears all active filters |
| **Bulk Actions** | Dropdown (appears when rows selected) | Apply Workflow, Edit, Delete |
| **Settings** (gear icon) | Link | Opens Submittals Settings page |

### List View Filters

Available via "Add Filter" button:

| Filter | Field | Type |
|--------|-------|------|
| Approver | approver names | multi-select |
| Ball In Court | ball_in_court person | multi-select |
| Created By | creator | multi-select |
| Current Revision | revision (boolean: current only) | toggle |
| Division | spec division | multi-select |
| Location | location | multi-select |
| Number | submittal number | text |
| Private | is_private | toggle |
| Received From | received_from | multi-select |
| Response | response status | multi-select |
| Responsible Contractor | responsible_contractor | multi-select |
| Submittal Type | submittal_type (custom types via company admin) | multi-select |
| Status | status | multi-select |

Filters are additive. The exported data reflects active search results, filters, and sorted columns.

### Detail View Toolbar

| Button | Type | Behavior |
|--------|------|----------|
| **Edit** | Button | Opens the edit form for the current submittal |
| **Redistribute** | Button | Re-distributes the submittal to distribution list members |
| **Actions** (overflow) | Dropdown | See below |

**Actions Dropdown Menu:**

| Action | Description | Permission |
|--------|-------------|------------|
| Create Revision | Creates a new revision (copy with incremented rev number) | Admin or BIC for current revision |
| Duplicate Submittal | Creates a copy with new number | Admin |
| Email | Opens email compose to forward submittal | Read Only+ |
| Generate QR Code | Generates a QR code linking to the submittal | Read Only+ |
| Delete | Moves submittal to Recycle Bin (soft delete) | Admin |

### Bulk Actions (List View)

Available when one or more rows are selected via checkboxes:

| Action | Supported Views | Permission | Fields |
|--------|----------------|------------|--------|
| **Apply Workflow** | Items, Packages, Spec Sections, Ball In Court | Admin | Select and apply a workflow template to selected submittals |
| **Edit** | Items, Packages, Spec Sections, Ball In Court | Admin | Responsible Contractor, Received From, Status, Submittal Package, Type, Required On-Site Date |
| **Delete** | Items only | Admin | Moves selected submittals to Recycle Bin |

Bulk Actions > Delete is NOT supported in Packages, Spec Sections, Ball In Court, or Recycle Bin views.

---

## Export & Print

### Export Individual Submittal (from Detail View)

**PDF with Attachments:**
- Combines the Procore-generated cover sheet with all attachments into a single PDF
- Users can select which attachments to include
- Users can rearrange attachment order via drag-and-drop (vertical grip icons)
- Export options: **Single PDF** or **.zip**
- For large exports, system sends email notification when complete with download link

### Export Submittals Log (from List View)

**Export button dropdown options:**

| Format | Description |
|--------|-------------|
| **PDF** | Exports the log as a formatted PDF |
| **CSV** | Exports as comma-separated values |
| **Excel** | Exports as Excel spreadsheet |

**Behavior:**
- Exported data reflects active search results, filters, and sorted columns
- Column display settings do NOT affect the export (all columns included)
- For 150 submittals or fewer: downloads directly to browser
- For more than 150 submittals: exports in background and sends email notification with download link

### Submittal Approvers Response Time Report

Available from Reports dropdown. Shows:
- Approver name
- Response times per submittal
- Filterable by specific approver
- Sortable by column headers
- Exportable to CSV or PDF

---

## Packages & Spec Sections

### Submittal Packages

A submittal package is a container that stores one or more submittals. Typically, a GC creates packages that list all submittals specific to a particular trade or subcontractor.

**Organization options (3 common approaches):**
1. **Trade/Responsible Contractor**: One package per trade (e.g., "Plumbing", "Electrical")
2. **Spec Section**: One package per specification section
3. **Phase/Area**: One package per project phase or building area

**Key behaviors:**
- Individual items within a package can be revised independently
- Only the most current revision is shown at any time
- Field staff spend less time searching through separate packages
- Packages view in the list groups submittals under their package headers

**Creating packages:**
- Via Create dropdown > "Submittal Package" on list view
- Via Submittal Builder (from Specifications tool)
- Assigning a package when creating/editing a submittal

### Spec Sections

Submittals are organized by CSI specification division/section:
- Spec section numbers follow industry standards (e.g., "06 25 09" for Division 6)
- The Spec Sections tab groups submittals under their division headers
- Submittal Builder in the Specifications tool can auto-create submittals from spec sections
- "Number Submittals by Spec Section" setting adds spec prefix to submittal numbers (e.g., "06 25 09 - 001")

**Submittal Builder:**
- Run from the Specifications tool
- Creates submittal items with pre-populated fields: Spec Section Number & Description, Status (Draft), Submittal Number
- Users fill in: Title, Type, Description, Submittal Manager
- Can only run once per spec section revision per project

---

## Distribution & Forwarding

### Distribution List

- Multi-select person picker (tag chips) on the create/edit form
- Members receive email notifications when the submittal is distributed
- Members also receive notifications on status changes and updates (configurable)
- Distribution list is separate from the approval workflow

### Distribution Process

1. Submittal completes workflow (all approvers respond) or is manually closed
2. Submittal Manager clicks "Close and Distribute" or uses the Redistribute action
3. System sets status to Closed
4. Email notification sent to all distribution list members
5. "Submittal Distributed" banner appears with date/time
6. Change History logs the distribution event

### Forwarding by Email

Separate from distribution. Allows:
- Sending email to any email address (not limited to project directory)
- Attaching submittal information
- Custom message body
- Useful for sending to external consultants or stakeholders

---

## Attachments

### Attachment Sources

- **Computer upload**: Drag-and-drop or file picker
- **Project Documents tool**: Link existing project documents
- **Third-party integrations**: Additional options may appear if integrated tools are configured

### Attachment Behavior

- Attachments can be added to the submittal itself
- Attachments can be added to individual approver responses
- "CURRENT" badge marks the latest/current attachment
- File types: PDFs, images, drawings, product specs, user manuals, etc.
- When exporting a submittal as PDF, users can select and reorder which attachments to include
- Attachments on responses are visible in the Workflow Responses section of the General tab

### Linked Drawings

- Separate from attachments
- Links to the project Drawings tool
- Multi-select field on the create/edit form
- Creates a cross-reference between the submittal and specific drawings

---

## Settings & Configuration

### Project-Level Settings (Settings > General)

| Setting | Description |
|---------|-------------|
| Default Submittal Manager | Pre-fills the Submittal Manager field on new submittals. Does NOT update existing submittals. |
| Number Submittals by Spec Section | Adds spec section prefix to submittal numbers |
| Submittal Schedule Calculations | Enables auto-calculation of due dates from lead time, review time, required on-site date |
| Email Notification Matrix | 7 email events x 6 recipient roles (Creator, SM, Submitter, Approver, Reviewer, Distribution Group) |
| Default Sort Column | Which column to sort by default |
| Default Sort Direction | Ascending or descending |
| Column Visibility | Show/hide and reorder columns |

### Company-Level Settings

| Setting | Description |
|---------|-------------|
| Custom Submittal Types | Add/remove submittal type options (beyond defaults) |
| Custom Statuses | Add/remove status options (beyond Draft/Open/Closed/Distributed) |
| Configurable Fieldsets | Control which fields are visible/required per project |
| Workflow Templates | Pre-configured approval workflows that can be applied to submittals |

### Workflow Templates

Created at project or company level. Define:
- Ordered list of workflow steps
- Each step has: Role (Submitter/Approver/Reviewer), assigned Person(s)
- Templates can be applied to individual submittals or bulk-applied via Bulk Actions

---

## Permissions

| Permission Level | Capabilities |
|-----------------|--------------|
| **None** | No access to Submittals tool |
| **Read Only** | View submittals, export, forward by email |
| **Standard** | Read Only + create submittals, respond when assigned as BIC |
| **Admin** | Standard + edit all, delete, bulk actions, manage settings, change BIC, distribute |

Additional permission nuances:
- Submitters can upload/submit when they have BIC
- Approvers can respond when they have BIC
- Reviewers can provide non-binding reviews
- Private submittals visible only to admins, workflow members, and distribution list members

---

## Recycle Bin

- Submittals are **soft-deleted** (moved to Recycle Bin, not permanently removed)
- Accessible via the Recycle Bin tab on the list view
- Recycle Bin submittals cannot be distributed
- Admin permission required to delete or restore
- Bulk Actions > Delete moves submittals to Recycle Bin

---

## Import

- **Submittals Import Template**: Downloadable CSV/Excel template
- Fields in template: Title, Spec Section, Number, Revision, Type, Description, Submittal Manager, Status, Responsible Contractor, Received From, Lead Time, Internal Review Time, Required On-Site Date
- Send completed template to Procore for import processing

---

## Related Items

Submittals can be linked to other Procore items:
- Bids
- RFIs
- Change Events
- Other project tool items (depends on which tools are active)

Added via the Related Items tab on the detail view. Linking requires selecting the item type and the specific item.

---

## Source URLs

All Procore support articles referenced:

| Article | URL |
|---------|-----|
| Submittals Overview | https://v2.support.procore.com/product-manuals/submittals-project |
| Create a Submittal | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/create-a-submittal |
| View a Submittal | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/view-a-submittal |
| Edit a Submittal | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/edit-a-submittal |
| Export a Submittal | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/export-a-submittal |
| Export the Submittals Log | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/export-the-submittals-log |
| Create a Submittal Revision | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/create-a-submittal-revision |
| Duplicate a Submittal | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/duplicate-a-submittal |
| Distribute a Submittal | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/distribute-a-submittal |
| Close a Submittal | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/close-a-submittal |
| Forward a Submittal by Email | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/forward-a-submittal-by-email |
| Switch Between Submittals Views | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/switch-between-submittals-views |
| Search for and Filter Submittals | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/search-for-and-filter-submittals |
| Change the Ball in Court on a Submittal | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/change-the-ball-in-court-on-a-submittal |
| Add Submitter and Approvers to Workflow | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/add-submitter-and-approvers-to-the-submittal-workflow |
| Remove Submitter/Approver from Workflow | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/remove-a-submitter-or-approver-from-the-submittal-workflow |
| Upload and Submit a Submittal | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/upload-and-submit-a-submittal |
| Perform Bulk Actions on Submittals | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/perform-bulk-actions-on-submittals |
| Bulk Actions > Edit | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/use-bulk-actions-edit-in-the-submittals-tool |
| Bulk Actions > Delete | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/use-bulk-actions-delete-in-the-submittals-tool |
| Designate Default Submittal Manager | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/designate-the-default-submittal-manager-for-the-submittals-tool |
| Enable Submittal Schedule Calculations | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/enable-submittal-schedule-calculations |
| Configure Settings: Submittals | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/configure-settings-submittals |
| Create Custom Submittal Types | https://v2.support.procore.com/product-manuals/admin-company/tutorials/create-custom-submittal-types |
| Create Custom Submittal Log Statuses | https://v2.support.procore.com/product-manuals/admin-company/tutorials/create-custom-submittal-log-statuses |
| Add a Related Item to a Submittal Package | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/add-a-related-item-to-a-submittal-package |
| Create a New Submittal in a Package | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/create-a-new-submittal-in-a-submittal-package |
| Generate a QR Code for a Submittal | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/generate-a-qr-code-for-a-submittal |
| Submittal Approvers Response Time Report | https://v2.support.procore.com/product-manuals/submittals-project/tutorials/view-the-submittal-approvers-response-time-report |
| Submittals Permissions | https://v2.support.procore.com/product-manuals/submittals-project/permissions |
| Submittals FAQ/Troubleshooting | https://v2.support.procore.com/product-manuals/submittals-project/faq-or-troubleshooting |
| Submittals Workflow Diagrams | https://v2.support.procore.com/product-manuals/submittals-project/diagrams |
| Submittal Builder (Specifications) | https://v2.support.procore.com/product-manuals/specifications-project/tutorials/submittal-builder-add-submittals |
| Best Practices: Submittal Packages | https://v2.support.procore.com/reference-best-practices-submittal-packages-introduction |
| Best Practices: Company Level Settings | https://v2.support.procore.com/reference-best-practices-company-level-submittal-settings |
| Best Practices: Project Configurations | https://v2.support.procore.com/reference-best-practices-submittal-project-configurations |
| Best Practices: Submittal Builder | https://v2.support.procore.com/reference-best-practices-submittal-builder |
| Best Practices: Workflow Management | https://v2.support.procore.com/process-guides/best-practices-submittals/workflow-management |
| Best Practices: Creation and Review | https://v2.support.procore.com/process-guides/best-practices-submittals/creation-and-review |
| Best Practices: Itemization | https://v2.support.procore.com/process-guides/best-practices-submittals/itemization |
| Construction Management Glossary | https://v2.support.procore.com/glossary-of-terms |

### Crawl Artifacts Used

| Artifact | Path |
|----------|------|
| Crawl Manifest | `.claude/procore-manifests/submittals/manifest.json` |
| Detailed Report | `_bmad-output/planning-artifacts/submittals/crawl/crawl/reports/detailed-report.json` |
| PRP | `_bmad-output/planning-artifacts/submittals/prp-submittals.md` |
| Forms Spec | `_bmad-output/planning-artifacts/submittals/crawl/crawl/spec/forms.md` |
| Commands Spec | `_bmad-output/planning-artifacts/submittals/crawl/crawl/spec/commands.md` |
| Schema SQL | `_bmad-output/planning-artifacts/submittals/crawl/crawl/spec/schema.sql` |
| Patterns | `_bmad-output/planning-artifacts/submittals/crawl/patterns.md` |
