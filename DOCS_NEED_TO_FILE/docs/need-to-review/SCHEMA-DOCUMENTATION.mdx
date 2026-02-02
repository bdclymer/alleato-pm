# Alleato-Procore Database Schema Documentation

> Auto-generated from feature tracker database
> Generated: 2026-01-14T18:39:31.587Z

## Overview

This document provides:
1. Current Supabase schema for each feature
2. Procore UI requirements (from crawled pages)
3. Calculated fields that should be views, not stored columns
4. Recommended schema changes

---

## Table of Contents

- [Budget](#budget)
- [Change Events](#change-events)
- [Change Orders](#change-orders)
- [Commitments](#commitments)
- [Direct Costs](#direct-costs)
- [Invoicing](#invoicing)
- [Prime Contracts](#prime-contracts)
- [Budget Forecasting](#budget-forecasting)
- [Daily Logs](#daily-logs)
- [Rfis](#rfis)
- [Submittals](#submittals)
- [Full Table List](#full-table-list)

---

## Budget {#budget}

**Priority:** CRITICAL
**Description:** Project budget tracking, cost codes, and financial overview
**Crawled Pages:** 53

### Related Tables

#### `budget_lines`

**Type:** table
**Columns:** 19

| Column | Type | Notes |
|--------|------|-------|
| cost_code_id | unknown | nullable |
| cost_type_id | unknown | nullable |
| created_at | unknown | nullable |
| created_by | unknown | nullable |
| default_curve_id | unknown | nullable |
| default_ftc_method | unknown | nullable |
| description | unknown | nullable |
| forecasting_enabled | unknown | nullable |
| id | unknown | nullable |
| original_amount | unknown | nullable |
| project_budget_code_id | unknown | nullable |
| project_id | unknown | nullable |
| quantity | unknown | nullable |
| sub_job_id | unknown | nullable |
| sub_job_key | unknown | nullable |
| unit_cost | unknown | nullable |
| unit_of_measure | unknown | nullable |
| updated_at | unknown | nullable |
| updated_by | unknown | nullable |

#### `budget_modifications`

**Type:** table
**Columns:** 10

| Column | Type | Notes |
|--------|------|-------|
| created_at | unknown | nullable |
| created_by | unknown | nullable |
| effective_date | unknown | nullable |
| id | unknown | nullable |
| number | unknown | nullable |
| project_id | unknown | nullable |
| reason | unknown | nullable |
| status | unknown | nullable |
| title | unknown | nullable |
| updated_at | unknown | nullable |

#### `budget_views`

**Type:** table
**Columns:** 9

| Column | Type | Notes |
|--------|------|-------|
| created_at | unknown | nullable |
| created_by | unknown | nullable |
| description | unknown | nullable |
| id | unknown | nullable |
| is_default | unknown | nullable |
| is_system | unknown | nullable |
| name | unknown | nullable |
| project_id | unknown | nullable |
| updated_at | unknown | nullable |

#### `v_budget_lines`

**Type:** view
**Columns:** 13

| Column | Type | Notes |
|--------|------|-------|
| approved_co_total | unknown | nullable |
| budget_mod_total | unknown | nullable |
| cost_code_id | unknown | nullable |
| cost_type_id | unknown | nullable |
| created_at | unknown | nullable |
| created_by | unknown | nullable |
| description | unknown | nullable |
| id | unknown | nullable |
| original_amount | unknown | nullable |
| project_id | unknown | nullable |
| revised_budget | unknown | nullable |
| sub_job_id | unknown | nullable |
| updated_at | unknown | nullable |

### Calculated Fields (Should be VIEWs)

These fields should NOT be stored - they should be calculated in database views:

| Field | Formula |
|-------|---------|
| `revised_budget` | `original_budget + budget_modifications` |
| `committed` | `SUM(commitments WHERE budget_code matches)` |
| `actual_costs` | `SUM(direct_costs) + SUM(invoiced_commitments)` |
| `projected_cost` | `actual_costs + remaining_commitments` |
| `over_under` | `revised_budget - projected_cost` |
| `percent_complete` | `actual_costs / revised_budget * 100` |

---

## Change Events {#change-events}

**Priority:** CRITICAL
**Description:** Potential changes before they become change orders
**Crawled Pages:** 0

### Related Tables

#### `change_events`

**Type:** table
**Columns:** 18

| Column | Type | Notes |
|--------|------|-------|
| created_at | unknown | nullable |
| created_by | unknown | nullable |
| deleted_at | unknown | nullable |
| description | unknown | nullable |
| expecting_revenue | unknown | nullable |
| id | unknown | nullable |
| line_item_revenue_source | unknown | nullable |
| number | unknown | nullable |
| origin | unknown | nullable |
| prime_contract_id | unknown | nullable |
| project_id | unknown | nullable |
| reason | unknown | nullable |
| scope | unknown | nullable |
| status | unknown | nullable |
| title | unknown | nullable |
| type | unknown | nullable |
| updated_at | unknown | nullable |
| updated_by | unknown | nullable |

#### `change_event_approvals`

**Type:** table
**Columns:** 7

| Column | Type | Notes |
|--------|------|-------|
| approval_status | unknown | nullable |
| approver_id | unknown | nullable |
| change_event_id | unknown | nullable |
| comments | unknown | nullable |
| created_at | unknown | nullable |
| id | unknown | nullable |
| responded_at | unknown | nullable |

#### `change_event_line_items`

**Type:** table
**Columns:** 15

| Column | Type | Notes |
|--------|------|-------|
| budget_code_id | unknown | nullable |
| change_event_id | unknown | nullable |
| contract_id | unknown | nullable |
| cost_rom | unknown | nullable |
| created_at | unknown | nullable |
| description | unknown | nullable |
| id | unknown | nullable |
| non_committed_cost | unknown | nullable |
| quantity | unknown | nullable |
| revenue_rom | unknown | nullable |
| sort_order | unknown | nullable |
| unit_cost | unknown | nullable |
| unit_of_measure | unknown | nullable |
| updated_at | unknown | nullable |
| vendor_id | unknown | nullable |

### Calculated Fields (Should be VIEWs)

These fields should NOT be stored - they should be calculated in database views:

| Field | Formula |
|-------|---------|
| `total_amount` | `SUM(line_items.amount)` |
| `rom_total` | `SUM(line_items.rom_amount)` |

---

## Change Orders {#change-orders}

**Priority:** CRITICAL
**Description:** Contract modifications and change management
**Crawled Pages:** 36

### Related Tables

#### `change_orders`

**Type:** table
**Columns:** 13

| Column | Type | Notes |
|--------|------|-------|
| apply_vertical_markup | unknown | nullable |
| approved_at | unknown | nullable |
| approved_by | unknown | nullable |
| co_number | unknown | nullable |
| created_at | unknown | nullable |
| description | unknown | nullable |
| id | unknown | nullable |
| project_id | unknown | nullable |
| status | unknown | nullable |
| submitted_at | unknown | nullable |
| submitted_by | unknown | nullable |
| title | unknown | nullable |
| updated_at | unknown | nullable |

#### `change_order_lines`

**Type:** table
**Columns:** 10

| Column | Type | Notes |
|--------|------|-------|
| amount | unknown | nullable |
| change_order_id | unknown | nullable |
| cost_code_id | unknown | nullable |
| cost_type_id | unknown | nullable |
| created_at | unknown | nullable |
| description | unknown | nullable |
| id | unknown | nullable |
| project_id | unknown | nullable |
| sub_job_id | unknown | nullable |
| updated_at | unknown | nullable |

### Calculated Fields (Should be VIEWs)

These fields should NOT be stored - they should be calculated in database views:

| Field | Formula |
|-------|---------|
| `total_amount` | `SUM(line_items.amount)` |
| `approved_amount` | `total_amount WHERE status = approved` |

---

## Commitments {#commitments}

**Priority:** CRITICAL
**Description:** Subcontracts and purchase orders
**Crawled Pages:** 21

### Related Tables

#### `purchase_orders`

**Type:** table
**Columns:** 27

| Column | Type | Notes |
|--------|------|-------|
| accounting_method | unknown | nullable |
| allow_non_admin_view_sov_items | unknown | nullable |
| assigned_to | unknown | nullable |
| bill_to | unknown | nullable |
| contract_company_id | unknown | nullable |
| contract_date | unknown | nullable |
| contract_number | unknown | nullable |
| created_at | unknown | nullable |
| created_by | unknown | nullable |
| default_retainage_percent | unknown | nullable |
| deleted_at | unknown | nullable |
| delivery_date | unknown | nullable |
| description | unknown | nullable |
| executed | unknown | nullable |
| id | unknown | nullable |
| invoice_contact_ids | unknown | nullable |
| is_private | unknown | nullable |
| issued_on_date | unknown | nullable |
| non_admin_user_ids | unknown | nullable |
| payment_terms | unknown | nullable |
| project_id | unknown | nullable |
| ship_to | unknown | nullable |
| ship_via | unknown | nullable |
| signed_po_received_date | unknown | nullable |
| status | unknown | nullable |
| title | unknown | nullable |
| updated_at | unknown | nullable |

#### `subcontracts`

**Type:** table
**Columns:** 25

| Column | Type | Notes |
|--------|------|-------|
| actual_completion_date | unknown | nullable |
| allow_non_admin_view_sov_items | unknown | nullable |
| contract_company_id | unknown | nullable |
| contract_date | unknown | nullable |
| contract_number | unknown | nullable |
| created_at | unknown | nullable |
| created_by | unknown | nullable |
| default_retainage_percent | unknown | nullable |
| deleted_at | unknown | nullable |
| description | unknown | nullable |
| estimated_completion_date | unknown | nullable |
| exclusions | unknown | nullable |
| executed | unknown | nullable |
| id | unknown | nullable |
| inclusions | unknown | nullable |
| invoice_contact_ids | unknown | nullable |
| is_private | unknown | nullable |
| issued_on_date | unknown | nullable |
| non_admin_user_ids | unknown | nullable |
| project_id | unknown | nullable |
| signed_contract_received_date | unknown | nullable |
| start_date | unknown | nullable |
| status | unknown | nullable |
| title | unknown | nullable |
| updated_at | unknown | nullable |

#### `commitments_unified`

**Type:** view
**Columns:** 20

| Column | Type | Notes |
|--------|------|-------|
| allow_non_admin_view_sov_items | unknown | nullable |
| commitment_type | unknown | nullable |
| contract_company_id | unknown | nullable |
| contract_date | unknown | nullable |
| contract_number | unknown | nullable |
| created_at | unknown | nullable |
| created_by | unknown | nullable |
| default_retainage_percent | unknown | nullable |
| deleted_at | unknown | nullable |
| description | unknown | nullable |
| executed | unknown | nullable |
| id | unknown | nullable |
| invoice_contact_ids | unknown | nullable |
| is_private | unknown | nullable |
| issued_on_date | unknown | nullable |
| non_admin_user_ids | unknown | nullable |
| project_id | unknown | nullable |
| status | unknown | nullable |
| title | unknown | nullable |
| updated_at | unknown | nullable |

### Calculated Fields (Should be VIEWs)

These fields should NOT be stored - they should be calculated in database views:

| Field | Formula |
|-------|---------|
| `revised_contract_value` | `original_value + approved_cos` |
| `remaining_to_invoice` | `revised_contract_value - invoiced_amount` |
| `percent_complete` | `invoiced_amount / revised_contract_value * 100` |

---

## Direct Costs {#direct-costs}

**Priority:** CRITICAL
**Description:** Labor, materials, equipment tracking
**Crawled Pages:** 14

### Related Tables

#### `direct_costs`

**Type:** table
**Columns:** 18

| Column | Type | Notes |
|--------|------|-------|
| cost_type | unknown | nullable |
| created_at | unknown | nullable |
| created_by_user_id | unknown | nullable |
| date | unknown | nullable |
| description | unknown | nullable |
| employee_id | unknown | nullable |
| id | unknown | nullable |
| invoice_number | unknown | nullable |
| is_deleted | unknown | nullable |
| paid_date | unknown | nullable |
| project_id | unknown | nullable |
| received_date | unknown | nullable |
| status | unknown | nullable |
| terms | unknown | nullable |
| total_amount | unknown | nullable |
| updated_at | unknown | nullable |
| updated_by_user_id | unknown | nullable |
| vendor_id | unknown | nullable |

#### `direct_cost_line_items`

**Type:** table
**Columns:** 11

| Column | Type | Notes |
|--------|------|-------|
| budget_code_id | unknown | nullable |
| created_at | unknown | nullable |
| description | unknown | nullable |
| direct_cost_id | unknown | nullable |
| id | unknown | nullable |
| line_order | unknown | nullable |
| line_total | unknown | nullable |
| quantity | unknown | nullable |
| unit_cost | unknown | nullable |
| uom | unknown | nullable |
| updated_at | unknown | nullable |

### Calculated Fields (Should be VIEWs)

These fields should NOT be stored - they should be calculated in database views:

| Field | Formula |
|-------|---------|
| `total_amount` | `SUM(line_items.amount)` |

---

## Invoicing {#invoicing}

**Priority:** CRITICAL
**Description:** Billing and payment applications
**Crawled Pages:** 0

### Related Tables

#### `owner_invoices`

**Type:** table
**Columns:** 10

| Column | Type | Notes |
|--------|------|-------|
| approved_at | unknown | nullable |
| billing_period_id | unknown | nullable |
| contract_id | unknown | nullable |
| created_at | unknown | nullable |
| id | unknown | nullable |
| invoice_number | unknown | nullable |
| period_end | unknown | nullable |
| period_start | unknown | nullable |
| status | unknown | nullable |
| submitted_at | unknown | nullable |

#### `owner_invoice_line_items`

**Type:** table
**Columns:** 6

| Column | Type | Notes |
|--------|------|-------|
| approved_amount | unknown | nullable |
| category | unknown | nullable |
| created_at | unknown | nullable |
| description | unknown | nullable |
| id | unknown | nullable |
| invoice_id | unknown | nullable |

### Calculated Fields (Should be VIEWs)

These fields should NOT be stored - they should be calculated in database views:

| Field | Formula |
|-------|---------|
| `total_billed` | `SUM(line_items.amount)` |
| `retention_amount` | `total_billed * retention_percent` |
| `net_amount` | `total_billed - retention_amount` |
| `balance_due` | `net_amount - payments_received` |

---

## Prime Contracts {#prime-contracts}

**Priority:** CRITICAL
**Description:** Owner contracts (GC perspective)
**Crawled Pages:** 11

### Related Tables

#### `prime_contracts`

**Type:** table
**Columns:** 29

| Column | Type | Notes |
|--------|------|-------|
| actual_completion_date | unknown | nullable |
| architect_engineer_id | unknown | nullable |
| billing_schedule | unknown | nullable |
| client_id | unknown | nullable |
| contract_company_id | unknown | nullable |
| contract_number | unknown | nullable |
| contract_termination_date | unknown | nullable |
| contractor_id | unknown | nullable |
| created_at | unknown | nullable |
| created_by | unknown | nullable |
| description | unknown | nullable |
| end_date | unknown | nullable |
| exclusions | unknown | nullable |
| executed_at | unknown | nullable |
| id | unknown | nullable |
| inclusions | unknown | nullable |
| is_private | unknown | nullable |
| original_contract_value | unknown | nullable |
| payment_terms | unknown | nullable |
| project_id | unknown | nullable |
| retention_percentage | unknown | nullable |
| revised_contract_value | unknown | nullable |
| signed_contract_received_date | unknown | nullable |
| start_date | unknown | nullable |
| status | unknown | nullable |
| substantial_completion_date | unknown | nullable |
| title | unknown | nullable |
| updated_at | unknown | nullable |
| vendor_id | unknown | nullable |

#### `contract_line_items`

**Type:** table
**Columns:** 11

| Column | Type | Notes |
|--------|------|-------|
| contract_id | unknown | nullable |
| cost_code_id | unknown | nullable |
| created_at | unknown | nullable |
| description | unknown | nullable |
| id | unknown | nullable |
| line_number | unknown | nullable |
| quantity | unknown | nullable |
| total_cost | unknown | nullable |
| unit_cost | unknown | nullable |
| unit_of_measure | unknown | nullable |
| updated_at | unknown | nullable |

#### `prime_contract_sovs`

**Type:** table
**Columns:** 10

| Column | Type | Notes |
|--------|------|-------|
| contract_id | unknown | nullable |
| cost_code | unknown | nullable |
| created_at | unknown | nullable |
| description | unknown | nullable |
| id | unknown | nullable |
| line_amount | unknown | nullable |
| quantity | unknown | nullable |
| sort_order | unknown | nullable |
| unit_cost | unknown | nullable |
| uom | unknown | nullable |

### Missing Columns

- ❌ executed_at (TIMESTAMP) - When contract was signed/executed

### Schema Issues

- ⚠️ vendor_id should be client_id - Prime contracts are WITH clients/owners, not vendors
- ⚠️ revised_contract_value should be CALCULATED, not stored

### Calculated Fields (Should be VIEWs)

These fields should NOT be stored - they should be calculated in database views:

| Field | Formula |
|-------|---------|
| `revised_contract_value` | `original_contract_value + SUM(approved_change_orders)` |
| `approved_cos` | `SUM(change_orders WHERE status = approved)` |
| `pending_cos` | `SUM(change_orders WHERE status = pending)` |
| `invoiced` | `SUM(owner_invoices.amount)` |
| `payments_received` | `SUM(payment_transactions.amount)` |
| `percent_paid` | `payments_received / revised_contract_value * 100` |
| `remaining_balance` | `revised_contract_value - payments_received` |

### Notes

Critical: This is one of the most complex features. The current schema stores redundant data and uses wrong entity relationships.

---

## Budget Forecasting {#budget-forecasting}

**Priority:** HIGH
**Description:** Budget projections and forecasting
**Crawled Pages:** 0

### Related Tables

---

## Daily Logs {#daily-logs}

**Priority:** HIGH
**Description:** Daily field reports and logs
**Crawled Pages:** 7

### Related Tables

#### `daily_logs`

**Type:** table
**Columns:** 7

| Column | Type | Notes |
|--------|------|-------|
| created_at | unknown | nullable |
| created_by | unknown | nullable |
| id | unknown | nullable |
| log_date | unknown | nullable |
| project_id | unknown | nullable |
| updated_at | unknown | nullable |
| weather_conditions | unknown | nullable |

---

## Rfis {#rfis}

**Priority:** HIGH
**Description:** Requests for Information
**Crawled Pages:** 41

### Related Tables

#### `rfis`

**Type:** table
**Columns:** 30

| Column | Type | Notes |
|--------|------|-------|
| assignees | unknown | nullable |
| ball_in_court | unknown | nullable |
| ball_in_court_employee_id | unknown | nullable |
| closed_date | unknown | nullable |
| cost_code | unknown | nullable |
| cost_impact | unknown | nullable |
| created_at | unknown | nullable |
| created_by | unknown | nullable |
| created_by_employee_id | unknown | nullable |
| date_initiated | unknown | nullable |
| distribution_list | unknown | nullable |
| due_date | unknown | nullable |
| id | unknown | nullable |
| is_private | unknown | nullable |
| location | unknown | nullable |
| number | unknown | nullable |
| project_id | unknown | nullable |
| question | unknown | nullable |
| received_from | unknown | nullable |
| reference | unknown | nullable |
| responsible_contractor | unknown | nullable |
| rfi_manager | unknown | nullable |
| rfi_manager_employee_id | unknown | nullable |
| rfi_stage | unknown | nullable |
| schedule_impact | unknown | nullable |
| specification | unknown | nullable |
| status | unknown | nullable |
| sub_job | unknown | nullable |
| subject | unknown | nullable |
| updated_at | unknown | nullable |

---

## Submittals {#submittals}

**Priority:** HIGH
**Description:** Document submittals and approvals
**Crawled Pages:** 7

### Related Tables

#### `submittals`

**Type:** table
**Columns:** 18

| Column | Type | Notes |
|--------|------|-------|
| created_at | unknown | nullable |
| current_version | unknown | nullable |
| description | unknown | nullable |
| id | unknown | nullable |
| metadata | unknown | nullable |
| priority | unknown | nullable |
| project_id | unknown | nullable |
| required_approval_date | unknown | nullable |
| specification_id | unknown | nullable |
| status | unknown | nullable |
| submission_date | unknown | nullable |
| submittal_number | unknown | nullable |
| submittal_type_id | unknown | nullable |
| submitted_by | unknown | nullable |
| submitter_company | unknown | nullable |
| title | unknown | nullable |
| total_versions | unknown | nullable |
| updated_at | unknown | nullable |

---

## Full Table List

All tables in the Supabase schema:

| Table | Type | Columns | Features |
|-------|------|---------|----------|
| `Prospects` | table | 5 | - |
| `__drizzle_migrations` | table | 2 | - |
| `actionable_insights` | view | 29 | - |
| `active_submittals` | view | 23 | - |
| `ai_analysis_jobs` | table | 14 | - |
| `ai_insights` | table | 32 | - |
| `ai_insights_today` | view | 29 | - |
| `ai_insights_with_project` | view | 12 | - |
| `ai_models` | table | 10 | - |
| `ai_tasks` | table | 12 | - |
| `app_users` | table | 10 | - |
| `asrs_blocks` | table | 7 | - |
| `asrs_configurations` | table | 8 | - |
| `asrs_decision_matrix` | table | 13 | - |
| `asrs_logic_cards` | table | 15 | - |
| `asrs_protection_rules` | table | 15 | - |
| `asrs_sections` | table | 6 | - |
| `attachments` | table | 8 | - |
| `billing_periods` | table | 10 | - |
| `block_embeddings` | table | 2 | - |
| `briefing_runs` | table | 9 | - |
| `budget_line_history` | table | 10 | - |
| `budget_line_item_history` | table | 14 | - |
| `budget_lines` | table | 19 | budget |
| `budget_mod_lines` | table | 10 | - |
| `budget_modification_lines` | table | 7 | - |
| `budget_modifications` | table | 10 | budget |
| `budget_view_columns` | table | 10 | - |
| `budget_views` | table | 9 | budget |
| `change_event_approvals` | table | 7 | change-events |
| `change_event_attachments` | table | 8 | - |
| `change_event_history` | table | 8 | - |
| `change_event_line_items` | table | 15 | change-events |
| `change_events` | table | 18 | change-events |
| `change_events_summary` | view | 15 | - |
| `change_order_approvals` | table | 7 | - |
| `change_order_costs` | table | 9 | - |
| `change_order_lines` | table | 10 | change-orders |
| `change_orders` | table | 13 | change-orders |
| `chat_history` | table | 8 | - |
| `chat_messages` | table | 6 | - |
| `chat_sessions` | table | 6 | - |
| `chat_thread_attachment_files` | table | 7 | - |
| `chat_thread_attachments` | table | 6 | - |
| `chat_thread_feedback` | table | 6 | - |
| `chat_thread_items` | table | 5 | - |
| `chat_threads` | table | 4 | - |
| `chats` | table | 1 | - |
| `chunks` | table | 9 | - |
| `clients` | table | 6 | - |
| `code_examples` | table | 9 | - |
| `commitment_change_order_lines` | table | 9 | - |
| `commitments_unified` | view | 20 | commitments |
| `companies` | table | 13 | directory |
| `company_context` | table | 8 | - |
| `contacts` | table | 20 | directory |
| `contract_billing_periods` | table | 16 | - |
| `contract_change_orders` | table | 13 | - |
| `contract_documents` | table | 14 | - |
| `contract_financial_summary` | view | 17 | - |
| `contract_financial_summary_mv` | view | 18 | - |
| `contract_line_items` | table | 11 | prime-contracts |
| `contract_payments` | table | 16 | - |
| `contract_snapshots` | table | 8 | - |
| `contract_views` | table | 12 | - |
| `contracts` | table | 36 | - |
| `conversations` | table | 7 | - |
| `cost_by_category` | view | 4 | - |
| `cost_code_division_updates_audit` | table | 6 | - |
| `cost_code_divisions` | table | 6 | - |
| `cost_code_types` | table | 5 | - |
| `cost_codes` | table | 7 | - |
| `cost_codes_with_division_title` | view | 8 | - |
| `cost_factors` | table | 7 | - |
| `cost_forecasts` | table | 7 | - |
| `crawled_pages` | table | 9 | - |
| `daily_log_equipment` | table | 7 | - |
| `daily_log_manpower` | table | 7 | - |
| `daily_log_notes` | table | 5 | - |
| `daily_logs` | table | 7 | daily-logs |
| `daily_recaps` | table | 21 | - |
| `database_tables_catalog` | table | 8 | - |
| `decisions` | table | 17 | - |
| `design_recommendations` | table | 9 | - |
| `direct_cost_line_items` | table | 11 | direct-costs |
| `direct_costs` | table | 18 | direct-costs |
| `direct_costs_with_details` | view | 24 | - |
| `discrepancies` | table | 18 | - |
| `distribution_group_members` | table | 4 | - |
| `distribution_groups` | table | 7 | - |
| `document_chunks` | table | 9 | - |
| `document_executive_summaries` | table | 22 | - |
| `document_group_access` | table | 3 | - |
| `document_insights` | table | 27 | - |
| `document_metadata` | table | 30 | - |
| `document_metadata_manual_only` | view | 30 | - |
| `document_metadata_view_no_summary` | view | 6 | - |
| `document_rows` | table | 3 | - |
| `document_user_access` | table | 3 | - |
| `documents` | table | 17 | - |
| `documents_ordered_view` | view | 8 | - |
| `employees` | table | 17 | - |
| `erp_sync_log` | table | 8 | - |
| `figure_statistics` | view | 2 | - |
| `figure_summary` | view | 12 | - |
| `files` | table | 11 | - |
| `financial_contracts` | table | 17 | - |
| `fireflies_ingestion_jobs` | table | 9 | - |
| `fm_blocks` | table | 12 | - |
| `fm_cost_factors` | table | 8 | - |
| `fm_documents` | table | 13 | - |
| `fm_form_submissions` | table | 15 | - |
| `fm_global_figures` | table | 32 | - |
| `fm_global_tables` | table | 26 | - |
| `fm_optimization_rules` | table | 11 | - |
| `fm_optimization_suggestions` | table | 13 | - |
| `fm_sections` | table | 14 | - |
| `fm_sprinkler_configs` | table | 19 | - |
| `fm_table_vectors` | table | 7 | - |
| `fm_text_chunks` | table | 23 | - |
| `forecasting` | table | 7 | - |
| `forecasting_curves` | table | 12 | - |
| `group_members` | table | 3 | - |
| `groups` | table | 4 | - |
| `ingestion_jobs` | table | 8 | - |
| `initiatives` | table | 22 | - |
| `issues` | table | 15 | - |
| `meeting_segments` | table | 14 | - |
| `memories` | table | 4 | - |
| `messages` | table | 6 | - |
| `nods_page` | table | 7 | - |
| `nods_page_section` | table | 7 | - |
| `notes` | table | 8 | - |
| `open_tasks_view` | view | 14 | - |
| `opportunities` | table | 16 | - |
| `optimization_rules` | table | 6 | - |
| `owner_invoice_line_items` | table | 6 | invoicing |
| `owner_invoices` | table | 10 | invoicing |
| `parts` | table | 29 | - |
| `payment_transactions` | table | 8 | - |
| `pcco_line_items` | table | 10 | - |
| `pco_line_items` | table | 10 | - |
| `people` | table | 18 | - |
| `permission_templates` | table | 8 | - |
| `prime_contract_change_orders` | table | 10 | - |
| `prime_contract_sovs` | table | 10 | prime-contracts |
| `prime_contracts` | table | 29 | prime-contracts |
| `prime_potential_change_orders` | table | 13 | - |
| `processing_queue` | table | 13 | - |
| `procore_capture_sessions` | table | 8 | - |
| `procore_capture_summary` | view | 7 | - |
| `procore_components` | table | 13 | - |
| `procore_features` | table | 11 | - |
| `procore_modules` | table | 15 | - |
| `procore_rebuild_estimate` | view | 5 | - |
| `procore_screenshots` | table | 23 | - |
| `profiles` | table | 6 | - |
| `project` | table | 44 | - |
| `project_activity_view` | view | 6 | - |
| `project_briefings` | table | 9 | - |
| `project_budget_codes` | table | 12 | - |
| `project_companies` | table | 12 | - |
| `project_cost_codes` | table | 6 | - |
| `project_directory` | table | 7 | - |
| `project_directory_memberships` | table | 16 | - |
| `project_health_dashboard` | view | 13 | - |
| `project_health_dashboard_no_summary` | view | 12 | - |
| `project_insights` | table | 9 | - |
| `project_issue_summary` | view | 5 | - |
| `project_members` | table | 7 | - |
| `project_resources` | table | 6 | - |
| `project_role_members` | table | 5 | - |
| `project_roles` | table | 7 | - |
| `project_tasks` | table | 9 | - |
| `project_users` | table | 6 | - |
| `project_with_manager` | view | 33 | - |
| `projects` | table | 40 | - |
| `projects_audit` | table | 9 | - |
| `prospects` | table | 26 | - |
| `purchase_order_sov_items` | table | 14 | - |
| `purchase_orders` | table | 27 | commitments |
| `purchase_orders_with_totals` | view | 32 | - |
| `qa_page_audit` | table | 13 | - |
| `qto_items` | table | 13 | - |
| `qtos` | table | 8 | - |
| `rag_pipeline_state` | table | 7 | - |
| `requests` | table | 4 | - |
| `review_comments` | table | 11 | - |
| `reviews` | table | 12 | - |
| `rfi_assignees` | table | 4 | - |
| `rfis` | table | 30 | rfis |
| `risks` | table | 18 | - |
| `schedule_of_values` | table | 9 | - |
| `schedule_progress_updates` | table | 9 | - |
| `schedule_resources` | table | 10 | - |
| `schedule_task_dependencies` | table | 4 | - |
| `schedule_tasks` | table | 17 | schedule |
| `sources` | table | 6 | - |
| `sov_line_items` | table | 8 | - |
| `sov_line_items_with_percentage` | view | 9 | - |
| `specifications` | table | 15 | - |
| `sub_jobs` | table | 8 | - |
| `subcontract_attachments` | table | 8 | - |
| `subcontract_sov_items` | table | 11 | - |
| `subcontractor_contacts` | table | 11 | - |
| `subcontractor_documents` | table | 9 | - |
| `subcontractor_projects` | table | 12 | - |
| `subcontractors` | table | 69 | - |
| `subcontractors_summary` | view | 13 | - |
| `subcontracts` | table | 25 | commitments |
| `subcontracts_with_totals` | view | 31 | - |
| `submittal_analytics_events` | table | 10 | - |
| `submittal_documents` | table | 13 | - |
| `submittal_history` | table | 11 | - |
| `submittal_notifications` | table | 13 | - |
| `submittal_performance_metrics` | table | 10 | - |
| `submittal_project_dashboard` | view | 11 | - |
| `submittal_types` | table | 8 | - |
| `submittals` | table | 18 | submittals |
| `sync_status` | table | 9 | - |
| `tasks` | table | 17 | - |
| `todos` | table | 5 | - |
| `user_directory_permissions` | table | 6 | - |
| `user_email_notifications` | table | 13 | - |
| `user_profiles` | table | 7 | - |
| `user_project_preferences` | table | 6 | - |
| `user_project_roles` | table | 4 | - |
| `user_projects` | table | 11 | - |
| `user_schedule_notifications` | table | 10 | - |
| `users` | table | 4 | - |
| `users_auth` | table | 3 | - |
| `v_budget_lines` | view | 13 | budget |
| `vendors` | table | 16 | - |
| `vertical_markup` | table | 8 | - |


---

## How to Use This Document

1. **Review each feature section** to understand the current schema
2. **Check calculated fields** - these should be views, not stored columns
3. **Note schema issues** - wrong relationships, missing columns
4. **Create migrations** to fix issues
5. **Update types** after migrations: `npx supabase gen types typescript ...`

## Recommended Action Items

1. Create database views for calculated fields
2. Fix the `prime_contracts.vendor_id` → `client_id` issue
3. Ensure `revised_contract_value` is calculated, not stored
4. Add missing columns identified above
5. Set up proper foreign key relationships

---

*This document should be regenerated after schema changes.*
