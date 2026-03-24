# Alleato-Procore Data Models

## Overview

| Property | Value |
|----------|-------|
| **Database** | Supabase (PostgreSQL with Row Level Security) |
| **Total Tables/Views/Functions** | 287 |
| **Types File** | `frontend/src/types/database.types.ts` (20,790 lines) |
| **Migrations** | 55 files in `supabase/migrations/` |
| **Database Enums** | 17 |
| **pgvector Search Functions** | 30+ |
| **Database Functions (RPC)** | 60+ |
| **Primary Key Types** | `projects.id` -> INTEGER, most others -> UUID, `cost_codes.id` -> STRING |

---

## Core Domain

### Projects & Companies

#### projects

Primary key: **INTEGER**

The central entity in the system. All project-scoped tables reference this table via an INTEGER foreign key.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| name | text | Project name |
| project_number | text | Unique project identifier |
| client_id | INTEGER | FK -> clients |
| budget | numeric | Total project budget |
| budget_used | numeric | Amount of budget consumed |
| budget_locked | boolean | Whether the budget is locked for editing |
| health_status | text | Current project health indicator |
| health_score | numeric | Numerical health score |
| completion_percentage | numeric | Overall completion percentage |
| archived | boolean | Whether project is archived |
| erp_system | text | Connected ERP system |
| team_members | array | Array of team member references |
| summary_metadata | JSON | Aggregated summary data |

#### companies

Primary key: **UUID**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | text | Company name |
| type | text | One of: vendor, subcontractor, owner, architect |
| status | text | Active/inactive status |
| address | text | Street address |
| city | text | City |
| state | text | State |
| website | text | Company website URL |
| logo_url | text | URL to company logo |

#### clients

Primary key: **INTEGER**

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| name | text | Client name |
| code | text | Short client code |
| status | text | Active/inactive status |
| company_id | UUID | FK -> companies |

#### people

Primary key: **UUID**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| first_name | text | First name |
| last_name | text | Last name |
| email | text | Email address |
| person_type | text | Type classification |
| phone_business | text | Business phone number |
| phone_mobile | text | Mobile phone number |
| company_id | UUID | FK -> companies |
| job_title | text | Job title |

#### users_auth

Links Supabase auth users to the people table. One-to-one relationship.

| Column | Type | Description |
|--------|------|-------------|
| auth_user_id | UUID | FK -> auth.users |
| person_id | UUID | FK -> people |

#### vendors

Primary key: **UUID**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | text | Vendor name |
| company_id | UUID | FK -> companies |
| tax_id | text | Tax identification number |
| contact info | various | Phone, email, address fields |

---

## Financial Domain

### Budget

#### budget_lines

Primary key: **UUID**

Individual line items within a project budget, each tied to a cost code and cost type.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| cost_code_id | text | FK -> cost_codes |
| cost_type_id | UUID | FK -> cost_code_types |
| original_amount | numeric | Original budgeted amount |
| quantity | numeric | Quantity |
| unit_cost | numeric | Cost per unit |
| forecasting_enabled | boolean | Whether forecasting is active for this line |

#### budget_snapshots

Primary key: **UUID**

Point-in-time captures of budget state for historical comparison.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| snapshot_name | text | Human-readable snapshot name |
| snapshot_date | date | Date the snapshot was taken |
| snapshot_type | text | Type of snapshot |
| locked | boolean | Whether the snapshot is locked |

#### budget_line_forecasts

Primary key: **UUID**

Monthly forecasting data for budget lines using forecast-to-complete (FTC) methods.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| budget_line_id | UUID | FK -> budget_lines |
| forecast_period | text | Period in YYYY-MM format |
| forecast_amount | numeric | Forecasted amount for the period |
| actual_amount | numeric | Actual amount spent |
| variance | numeric | Difference between forecast and actual |
| ftc_method | text | Forecast-to-complete calculation method |

#### budget_modifications

Primary key: **UUID**

Tracked modifications to the budget with approval workflow.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| mod_number | text | Modification number |
| description | text | Description of the modification |
| status | text | Approval status |
| amount | numeric | Modification amount |

#### budget_views

Primary key: **UUID**

Saved view configurations for the budget interface.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| name | text | View name |
| is_default | boolean | Whether this is the default view |
| view_config | JSON | Column visibility, sort order, filters |

### Contracts

#### contracts

Primary key: **UUID**

Represents both prime contracts (with owners) and commitments (with subcontractors/vendors).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| contract_number | text | Unique contract number |
| title | text | Contract title |
| vendor_id | UUID | FK -> vendors |
| contract_type | text | One of: prime_contract, commitment |
| contract_amount | numeric | Original contract value |
| executed_amount | numeric | Executed contract value |
| revised_amount | numeric | Revised contract value (with change orders) |
| status | text | One of: draft, pending, executed, closed, terminated |
| terms | JSON | Contract terms and conditions |

#### subcontracts

Primary key: **UUID**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| subcontract_number | text | Subcontract number |
| vendor_id | UUID | FK -> vendors |
| contract_amount | numeric | Original contract amount |
| approved_change_orders | numeric | Sum of approved change orders |
| pending_change_orders | numeric | Sum of pending change orders |
| status | text | Contract status |

#### purchase_orders

Primary key: **UUID**

Similar structure to subcontracts with additional shipping fields.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| ship_to_address | text | Delivery address |
| *(plus fields similar to subcontracts)* | | |

#### contract_line_items

Primary key: **UUID**

Schedule of values line items for progress billing (AIA G702/G703 style).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| contract_id | UUID | FK -> contracts |
| line_item_number | text | Line item number |
| scheduled_value | numeric | Scheduled value of work |
| work_completed_from_previous | numeric | Work completed in prior periods |
| work_completed_this_period | numeric | Work completed this billing period |
| materials_presently_stored | numeric | Materials stored on site |
| percent_complete | numeric | Completion percentage |
| cost_code_id | text | FK -> cost_codes |

#### contract_payments

Primary key: **UUID**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| contract_id | UUID | FK -> contracts |
| payment_number | text | Payment number |
| amount_due | numeric | Amount due |
| amount_retained | numeric | Retention amount |
| amount_paid | numeric | Amount actually paid |
| status | text | Payment status |

### Change Management

#### change_orders

Primary key: **UUID**

Formal change orders that modify contract values.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| change_order_number | text | Sequential CO number |
| title | text | Change order title |
| amount | numeric | Total change order amount |
| status | text | One of: draft, pending, approved, void |
| source_change_event_id | UUID | FK -> change_events (origin event) |

#### change_order_lines

Primary key: **UUID**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| change_order_id | UUID | FK -> change_orders |
| cost_code_id | text | FK -> cost_codes |
| cost_type_id | UUID | FK -> cost_code_types |
| amount | numeric | Line item amount |
| quantity | numeric | Quantity |
| unit_cost | numeric | Cost per unit |

#### change_events

Primary key: **UUID**

Potential change events that may result in change orders. Tracks cost and schedule impact before formalization.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| event_number | text | Sequential event number |
| title | text | Event title |
| estimated_cost | numeric | Estimated cost impact |
| estimated_time_days | integer | Estimated schedule impact in days |
| status | text | One of: open, closed |
| origin | text | Source of the change event |
| category | text | Event category |
| prime_contract_id | UUID | FK -> contracts |

#### change_event_line_items

Primary key: **UUID**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| change_event_id | UUID | FK -> change_events |
| budget_code_id | text | FK -> cost_codes |
| contract_id | UUID | FK -> contracts |
| vendor_id | UUID | FK -> vendors |

#### Related Change Event Tables

- **change_event_rfqs** - Requests for quote sent to vendors for change events
- **change_event_rfq_responses** - Vendor responses to RFQs
- **change_event_approvals** - Approval workflow records
- **change_event_attachments** - Files attached to change events
- **change_event_history** - Audit trail of changes

### Direct Costs

#### direct_costs

Primary key: **UUID**

Non-contract costs applied directly to the project budget.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| description | text | Cost description |
| date | date | Date of the cost |
| cost_code_id | text | FK -> cost_codes |
| cost_type_id | UUID | FK -> cost_code_types |
| amount | numeric | Total amount |
| quantity | numeric | Quantity |
| unit_cost | numeric | Cost per unit |
| vendor_id | UUID | FK -> vendors |
| invoice_number | text | Associated invoice number |
| status | text | One of: pending, approved, rejected |

#### direct_cost_line_items

Primary key: **UUID**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| direct_cost_id | UUID | FK -> direct_costs |

### Invoicing

#### owner_invoices

Primary key: **UUID**

Invoices sent to the project owner for completed work.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| invoice_number | text | Invoice number |
| prime_contract_id | UUID | FK -> contracts |
| billing_period_start | date | Start of billing period |
| billing_period_end | date | End of billing period |
| invoice_amount | numeric | Total invoice amount |
| retention_amount | numeric | Retention held |
| status | text | One of: draft, pending, approved, paid |

#### billing_periods

Primary key: **UUID**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| period_number | integer | Sequential period number |
| start_date | date | Period start date |
| end_date | date | Period end date |
| status | text | One of: open, closed, approved |

### Cost Codes

#### cost_codes

Primary key: **STRING** (e.g., "01-1000")

Standard CSI-format cost codes organized by division.

| Column | Type | Description |
|--------|------|-------------|
| id | STRING | Primary key (e.g., "01-1000") |
| division_id | STRING | FK -> cost_code_divisions |
| title | text | Cost code title |
| division_title | text | Parent division title |
| status | text | Active/inactive |

#### cost_code_divisions

Primary key: **STRING**

Standard CSI divisions (01 through 16).

| Column | Type | Description |
|--------|------|-------------|
| id | STRING | Primary key (e.g., "01") |

#### cost_code_types

Primary key: **UUID**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| code | text | Type code |
| description | text | Type description |
| category | text | One of: Labor, Materials, Equipment, Subcontractors, Other |

#### project_cost_codes

Primary key: **UUID**

Associates cost codes with specific projects, allowing per-project activation.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| cost_code_id | STRING | FK -> cost_codes |
| cost_type_id | UUID | FK -> cost_code_types |
| is_active | boolean | Whether enabled for this project |

#### sub_jobs

Primary key: **UUID**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| code | text | Sub-job code |
| name | text | Sub-job name |
| description | text | Description |

---

## Field Management

### Schedule

#### schedule_tasks

Primary key: **UUID**

Hierarchical task structure with self-referencing parent for WBS breakdown. Supports CPM scheduling concepts (dependencies, constraints, milestones).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| name | text | Task name |
| wbs_code | text | Work breakdown structure code |
| parent_task_id | UUID | FK -> schedule_tasks (self-referencing) |
| start_date | date | Planned start date |
| finish_date | date | Planned finish date |
| duration_days | integer | Duration in calendar days |
| status | text | Task status |
| percent_complete | numeric | Completion percentage |
| is_milestone | boolean | Whether this is a milestone (zero duration) |
| constraint_type | text | Scheduling constraint type |
| sort_order | integer | Display order |

#### schedule_dependencies

Primary key: **UUID**

Task-to-task relationships for critical path scheduling.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| predecessor_task_id | UUID | FK -> schedule_tasks |
| successor_task_id | UUID | FK -> schedule_tasks |
| dependency_type | text | One of: FS (Finish-to-Start), SS (Start-to-Start), FF (Finish-to-Finish), SF (Start-to-Finish) |
| lag_days | integer | Lag or lead time in days |

### Punch List

#### punch_items

Primary key: **UUID**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| number | integer | Sequential punch item number |
| title | text | Item title |
| assignee_id | UUID | FK -> people |
| assignee_company | text | Responsible company name |
| punch_item_manager_id | UUID | FK -> people |
| final_approver_id | UUID | FK -> people |
| status | text | One of: open, in_progress, closed |
| priority | text | One of: high, medium, low |
| due_date | date | Due date |
| location | text | Physical location on site |

### Daily Logs

#### daily_logs

Primary key: **UUID**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| log_date | date | Date of the log entry |
| weather_conditions | JSON | Temperature, precipitation, wind, etc. |

#### Related Daily Log Tables

- **daily_log_manpower** - Workforce counts by trade/company
- **daily_log_equipment** - Equipment usage records
- **daily_log_notes** - General notes and observations

### RFIs

#### rfis

Primary key: **UUID**

Requests for Information with assignment and impact tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| number | integer | Sequential RFI number |
| subject | text | RFI subject line |
| question | text | Full question text |
| assignees | array | Array of assigned person references |
| rfi_manager | UUID | FK -> people |
| cost_impact | numeric | Estimated cost impact |
| schedule_impact | integer | Estimated schedule impact in days |
| status | text | One of: open, closed, draft |
| due_date | date | Response due date |
| is_private | boolean | Whether RFI is restricted visibility |

---

## Documents

### Specifications

#### specification_sections

Primary key: **BIGINT**

CSI-organized specification sections with revision tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT | Primary key |
| project_id | INTEGER | FK -> projects |
| section_number | text | CSI section number |
| title | text | Section title |
| current_revision_id | BIGINT | FK -> specification_section_revisions |
| status | text | One of: active, archived, superseded |

#### specification_section_revisions

Primary key: **BIGINT**

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT | Primary key |
| section_id | BIGINT | FK -> specification_sections |
| revision_number | integer | Sequential revision number |
| file_url | text | URL to the revision file |
| file_name | text | Original file name |
| file_size | integer | File size in bytes |
| content | text | Extracted text content |
| notes | text | Revision notes |

#### specification_areas

Primary key: **BIGINT**

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT | Primary key |
| project_id | INTEGER | FK -> projects |
| name | text | Area name |
| description | text | Area description |
| sort_order | integer | Display order |

### Drawings

#### drawings

Primary key: **UUID**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| drawing_number | text | Drawing number (e.g., A-101) |
| title | text | Drawing title |
| area_id | UUID | FK -> drawing_areas |
| current_revision_id | UUID | FK -> drawing_revisions |

#### drawing_revisions

Primary key: **UUID**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| drawing_id | UUID | FK -> drawings |
| revision_number | integer | Sequential revision number |
| drawing_set_id | UUID | FK -> drawing_sets |
| file_url | text | URL to the drawing file |
| status | text | One of: draft, under_review, approved, superseded, void |
| is_current_revision | boolean | Whether this is the active revision |

#### drawing_sets

Primary key: **UUID**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| name | text | Set name (e.g., "IFC Set 3") |
| issued_at | timestamp | Date the set was issued |
| status | text | Set status |

#### drawing_areas

Primary key: **UUID**

Hierarchical area organization with self-referencing parent.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| name | text | Area name |
| parent_area_id | UUID | FK -> drawing_areas (self-referencing) |
| sort_order | integer | Display order |

### Submittals

#### submittals

Primary key: **UUID**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| submittal_number | text | Submittal number |
| title | text | Submittal title |
| submittal_type_id | UUID | FK -> submittal types |
| specification_id | BIGINT | FK -> specification_sections |
| status | text | Submittal status |
| current_version | integer | Current version number |
| submission_date | date | Date submitted |

---

## Directory & Permissions

#### project_directory_memberships

Primary key: **UUID**

Controls which people have access to which projects and their roles.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| person_id | UUID | FK -> people |
| role | text | Project role |
| user_type | text | One of: standard, admin, read_only |
| status | text | Membership status |
| permission_template_id | UUID | FK -> permission_templates |
| invite_status | text | Invitation status |
| invite_token | text | Unique invitation token |

#### project_companies

Primary key: **UUID**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| company_id | UUID | FK -> companies |
| company_type | text | One of: general_contractor, subcontractor, supplier, owner |

#### distribution_groups

Group-based communication lists. Associated **distribution_group_members** join table links people to groups.

#### permission_templates

Primary key: **UUID**

Reusable permission configurations applied to project members.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | text | Template name |
| scope | text | One of: project, company, global |
| permissions | JSON | Permission definitions |

---

## AI & Analytics

#### ai_insights

Primary key: **INTEGER**

AI-generated project insights with confidence scoring and impact analysis.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| project_id | INTEGER | FK -> projects |
| title | text | Insight title |
| insight_type | text | Type of insight |
| severity | text | Severity level |
| confidence_score | numeric | AI confidence (0-1) |
| exact_quotes | JSON | Supporting evidence quotes |
| financial_impact | numeric | Estimated financial impact |
| timeline_impact_days | integer | Estimated schedule impact |
| stakeholders_affected | text | Impacted stakeholders |

#### ai_tasks

Primary key: **UUID**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| project_id | INTEGER | FK -> projects |
| title | text | Task title |
| assignee | text | Assigned person |
| status | text | One of: pending, in_progress, completed |
| due_date | date | Due date |

#### chunks

Primary key: **UUID**

Document chunks for RAG (Retrieval-Augmented Generation) with vector embeddings.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| document_id | UUID | FK -> source document |
| chunk_number | integer | Sequential chunk number |
| content | text | Chunk text content |
| embedding | vector | pgvector embedding for similarity search |

#### Conversational AI Tables

- **chat_sessions** - Top-level AI conversation sessions
- **chat_messages** - Individual messages within sessions
- **chat_threads** - Threaded conversation support

---

## Acumatica ERP Integration

Bidirectional sync with Acumatica accounting system. All tables store raw payloads alongside mapped fields.

| Table | Description |
|-------|-------------|
| `acumatica_ap_bill_lines` | AP bill line items from Acumatica |
| `acumatica_ap_bills` | Accounts payable bills |
| `acumatica_ar_invoice_lines` | AR invoice line items |
| `acumatica_ar_invoices` | Accounts receivable invoices |
| `acumatica_change_orders` | Change orders synced from Acumatica |
| `acumatica_checks` | Payment checks |
| `acumatica_payments` | Payment records |
| `acumatica_project_budgets` | Project budget data from Acumatica |
| `acumatica_purchase_orders` | Purchase orders |
| `acumatica_subcontracts` | Subcontract records |
| `acumatica_sync_state` | Sync status tracking per entity type |

---

## Meetings & Communications

| Table | Description |
|-------|-------------|
| `meetings` | Meeting records (from Fireflies.ai integration) |
| `meeting_chunks` | Segmented meeting transcript chunks |
| `meeting_embeddings` | Vector embeddings for meeting content |
| `meeting_digests` | AI-generated meeting summaries |
| `daily_recaps` | AI-generated daily recap summaries |

---

## App Metadata & Configuration

| Table | Description |
|-------|-------------|
| `app_pages` / `app_page_links` | Application page registry |
| `app_commands` | Command palette entries |
| `app_roles` | Role definitions |
| `app_ui_components` | UI component registry |
| `app_ui_tables` / `app_ui_table_columns` | Table configuration |
| `app_state_transitions` | State machine transitions |
| `app_system_states` / `app_system_actions` | System state management |
| `app_functional_capabilities` / `app_capability_actions` | Feature capabilities |
| `app_parity_checks` | Procore feature parity tracking |
| `database_tables_catalog` | Database introspection catalog |
| `design_recommendations` | AI design recommendations |
| `admin_view_backups` | Saved admin view configurations |

---

## Documents & RAG Infrastructure

Additional tables beyond the `chunks` table documented above.

| Table | Description |
|-------|-------------|
| `documents` | Uploaded document records |
| `document_chunks` | RAG chunks from documents (24K+ rows, unified embedding table) |
| `document_embeddings` | Vector embeddings |
| `document_metadata` | Document metadata |
| `knowledge_documents` | Knowledge base documents |
| `ai_analysis_jobs` | Background AI analysis job queue |
| `ai_memories` | Persistent AI memory per user/project |
| `ai_models` | Available AI model configurations |
| `asrs_*` (6 tables) | Automated Sprinkler Reference System knowledge base |
| `block_embeddings` | pgvector embeddings for content blocks |
| `briefing_runs` | Daily briefing generation history |
| `crawled_pages` | Web-crawled page content + embeddings |
| `code_examples` | Code example embeddings |
| `company_context` | Company-level AI context |
| `company_knowledge` | Company knowledge base documents |

---

## Database Enums

| Enum | Values |
|------|--------|
| `billing_period_status` | open, closed, approved |
| `budget_status` | locked, unlocked |
| `calculation_method` | unit_price, lump_sum, percentage |
| `change_event_status` | open, closed |
| `change_order_status` | draft, pending, approved, void |
| `commitment_type` | subcontract, purchase_order, service_order |
| `company_type` | vendor, subcontractor, owner, architect, other |
| `contract_status` | draft, pending, executed, closed, terminated |
| `contract_type` | prime_contract, commitment |
| `erp_sync_status` | pending, synced, failed, resyncing |
| `invoice_status` | draft, pending, approved, paid, void |
| `issue_category` | (multiple categories) |
| `issue_severity` | Low, Medium, High, Critical |
| `issue_status` | Open, In Progress, Resolved, Pending Verification |
| `payment_status` | received, void |
| `prime_contract_co_status` | draft, submitted, approved, void |
| `prime_contract_sov_status` | draft, approved, locked |
| `prime_contract_status` / `prime_contract_status_v2` | draft, pending, executed, closed |
| `project_status` | active, inactive, complete |
| `task_status` | todo, doing, review, done |

---

## pgvector Functions (RAG Search)

| Function | Description |
|----------|-------------|
| `match_chunks` | Semantic search over document chunks |
| `match_documents` / `match_documents_enhanced` | Full document semantic search |
| `match_meeting_chunks` / `match_meeting_chunks_with_project` | Meeting transcript search |
| `match_memories` | AI memory search |
| `match_crawled_pages` | Web-crawled content search |
| `hybrid_search` | Combined semantic + full-text search |
| `hybrid_search_fm_global` | FM Global knowledge base hybrid search |
| `full_text_search_meetings` | Full-text meeting search |
| `search_all_knowledge` | Cross-source knowledge search |
| `vector_search` | Generic vector similarity search |
| `get_document_insights_page` | Paginated document insights |
| `get_project_matching_context` | AI context for project queries |

---

## Key Patterns

### Foreign Key Convention

All project-scoped tables use `project_id INTEGER` referencing `projects.id`. This is critical because `projects.id` is **INTEGER, not UUID**. Mismatching this type causes silent query failures.

| Referenced Table | PK Type | Your FK Column Must Be |
|-----------------|---------|------------------------|
| projects | INTEGER | `project_id INTEGER` |
| companies | UUID | `company_id UUID` |
| people | UUID | `person_id UUID` |
| cost_codes | STRING | `cost_code_id TEXT` |
| auth.users | UUID | `user_id UUID` |

### Audit Columns

All major tables include:

| Column | Type | Description |
|--------|------|-------------|
| created_at | timestamp with time zone | Record creation timestamp |
| updated_at | timestamp with time zone | Last modification timestamp |
| created_by | UUID | FK -> auth.users |
| updated_by | UUID | FK -> auth.users |

### Database Triggers

- **update_updated_at_column()** - Automatically sets `updated_at` to `NOW()` on row update. Applied to all major tables.

### Row Level Security (RLS)

All project-scoped tables have RLS policies that restrict access based on project membership. Users can only read/write data for projects they are members of via `project_directory_memberships`.

### Self-Referencing Tables

- **schedule_tasks** - `parent_task_id` FK -> `schedule_tasks.id` for WBS hierarchy
- **drawing_areas** - `parent_area_id` FK -> `drawing_areas.id` for nested area organization

### Revision Tracking Pattern

Two tables use a current-revision pointer pattern:

- **drawings** has `current_revision_id` FK -> **drawing_revisions**
- **specification_sections** has `current_revision_id` FK -> **specification_section_revisions**

Each revision table maintains a full history, while the parent table points to the active revision for fast lookups.

---

_Generated using BMAD Method document-project workflow_
