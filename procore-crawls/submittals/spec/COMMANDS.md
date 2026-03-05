# SUBMITTALS — Domain Commands

This file lists all canonical domain commands for the **submittals** module,
derived from the Procore crawl (screenshots, DOM analysis, and system actions).

## Submittal CRUD Commands

| Command Key | Label | Trigger | Source | Category |
|------------|-------|---------|--------|----------|
| `create_submittal` | Create Submittal | button | Create menu | CREATE |
| `create_submittal_package` | Create Submittal Package | menuitem | Create menu | CREATE |
| `edit_submittal` | Edit | button | detail toolbar | UPDATE |
| `update_submittal` | Update | button | edit form | UPDATE |
| `update_and_send_emails` | Update & Send Emails | button | edit form | UPDATE |
| `delete_submittal` | Delete | button/menuitem | edit form / actions menu | DELETE |
| `view_submittal` | View | link | list row | READ |

## Revision & Workflow Commands

| Command Key | Label | Trigger | Source | Category |
|------------|-------|---------|--------|----------|
| `create_revision` | Create Revision | menuitem | actions menu (detail) | CREATE |
| `duplicate_submittal` | Duplicate Submittal | menuitem | actions menu (detail) | CREATE |
| `create_new_submittal` | Create New Submittal | menuitem | actions menu (detail) | CREATE |
| `redistribute` | Redistribute | button | detail toolbar | UPDATE |
| `add_workflow_step` | Add Step | button | edit form (workflow section) | UPDATE |

## Distribution & Communication

| Command Key | Label | Trigger | Source | Category |
|------------|-------|---------|--------|----------|
| `email_submittal` | Email | menuitem | actions menu (detail) | ACTION |
| `attach_files` | Attach Files | button | edit form (attachments) | UPDATE |

## Export & Reports

| Command Key | Label | Trigger | Source | Category |
|------------|-------|---------|--------|----------|
| `export_pdf` | PDF | menuitem | Export menu | READ |
| `export_csv` | CSV | menuitem | Export menu | READ |
| `export_excel` | Excel | menuitem | Export menu | READ |
| `report_approvers_response_time` | Submittal Approvers' Response Time | menuitem | Reports menu | READ |
| `create_new_report` | Create New Report | link | Reports menu | CREATE |

## List Management Commands

| Command Key | Label | Trigger | Source | Category |
|------------|-------|---------|--------|----------|
| `bulk_actions` | Bulk Actions | button | list toolbar | ACTION |
| `add_filter` | Add Filter | button | list toolbar | UI |
| `clear_all_filters` | Clear All | button | filter panel | UI |
| `reset_table_to_default` | Reset Table to Default | button | column config | UI |
| `save_column_changes` | Save Changes | button | column config | UI |

## Navigation Tabs

| Tab | Selector | Description |
|-----|----------|-------------|
| Items | default tab | Main submittal list view |
| Packages | `[data-qa='tooltab-packages']` | Submittals grouped by package |
| Spec Sections | `[data-qa='tooltab-spec_sections']` | Submittals grouped by spec section |
| Ball In Court | `[data-qa='tooltab-ball_in_court']` | Submittals grouped by responsible party |
| Recycle Bin | `[data-qa='tooltab-recycle_bin']` | Deleted submittals |

## Detail View Tabs

| Tab | Description |
|-----|-------------|
| General | Distribution summary, description, workflow responses |
| Related Items (0) | Linked items from other tools |
| Emails (0) | Email correspondence |
| Change History (23) | Audit trail of changes |

## Table Columns (Items List)

Column headers visible in the submittal list table:

| Column Label | SQL Name | Inferred Type |
|-------------|----------|---------------|
| Spec | specification_section | text |
| # | number | integer |
| Rev. | revision | integer |
| Title | title | text |
| Type | submittal_type | text |
| Status | status | text |
| Responsible C. | responsible_contractor | text (FK) |
| Received From | received_from | text (FK) |
| Ball In Court | ball_in_court | text (FK) |
| Approvers | approvers | text[] / relation |
| Response | response | text |
| Sent Date | sent_date | date |

## Filter Options

Filterable fields from the Add Filter panel:

| Filter | Description |
|--------|-------------|
| Approver | Filter by approver person |
| Ball In Court | Filter by current responsible party |
| Created By | Filter by creator |
| Current Revision | Filter by revision number |
| Division | Filter by CSI division |
| Location | Filter by project location |
| Number | Filter by submittal number |
| Private | Filter by private flag |
| Received From | Filter by sender |
| Response | Filter by response status |
| Responsible Contractor | Filter by responsible company |
