# Data Models — Alleato-PM

> Generated: 2026-03-22 | Source: `frontend/src/types/database.types.ts` (20,790 lines), `supabase/migrations/` (55 migrations)
> Supabase project: `lgveqfnpkxvzbnnwuled`

---

## Overview

| Metric | Count |
|--------|-------|
| Total tables/views/functions | 287 |
| SQL migrations | 55 |
| TypeScript type file | 20,790 lines |
| Database enums | 17 |
| pgvector search functions | 30+ |
| Database functions (RPC) | 60+ |

---

## Table Categories

### Acumatica ERP Integration (11 tables)
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

### AI & RAG (20+ tables)
Vector embeddings, chat history, memories, and AI analysis infrastructure.

| Table | Description |
|-------|-------------|
| `ai_analysis_jobs` | Background AI analysis job queue |
| `ai_insights` | Generated AI insights per project |
| `ai_memories` | Persistent AI memory per user/project |
| `ai_models` | Available AI model configurations |
| `asrs_*` (6 tables) | Automated Sprinkler Reference System knowledge base |
| `block_embeddings` | pgvector embeddings for content blocks |
| `briefing_runs` | Daily briefing generation history |
| `chat_history` | Legacy chat history |
| `chat_messages` | Individual chat messages |
| `chat_sessions` | Chat session metadata |
| `chat_thread_*` (4 tables) | Threaded chat system (items, attachments, feedback) |
| `chat_threads` | Top-level chat threads |
| `chats` | Chat container records |
| `chunks` | Document chunks for RAG |
| `code_examples` | Code example embeddings |
| `conversations` | Conversation containers |
| `crawled_pages` | Web-crawled page content + embeddings |

---

### Budget & Financial (15+ tables)

| Table | Description |
|-------|-------------|
| `budget_lines` | Budget line items (SOV) |
| `budget_line_history` | Audit trail for budget changes |
| `budget_line_item_history` | Detailed line item change log |
| `budget_line_forecasts` | Budget forecasting data |
| `budget_mod_lines` / `budget_modification_lines` | Budget modification line items |
| `budget_modifications` | Budget modification records |
| `budget_snapshots` | Point-in-time budget snapshots |
| `budget_views` / `budget_view_columns` | Saved budget view configurations |
| `billing_periods` | Billing period definitions |
| `contract_billing_periods` | Contract-specific billing periods |
| `cost_codes` | Cost code hierarchy |
| `cost_code_divisions` | Cost code divisions |
| `cost_code_types` | Cost code type classification |
| `cost_factors` | Cost factor definitions |
| `cost_forecasts` | Financial forecasting records |

---

### Contracts & Commitments (12+ tables)

| Table | Description |
|-------|-------------|
| `contracts` | Prime contracts and commitments (unified) |
| `contract_change_orders` | Contract change orders |
| `contract_documents` | Documents attached to contracts |
| `contract_line_items` | SOV / line items for contracts |
| `contract_payments` | Payment applications |
| `contract_snapshots` | Point-in-time contract snapshots |
| `contract_views` / `contract_views_columns` | Saved view configurations |
| `commitment_change_order_lines` | CCO line items |
| `cco_attachments` | CCO file attachments |

---

### Change Events (8 tables)

| Table | Description |
|-------|-------------|
| `change_events` | Change event records |
| `change_event_line_items` | Line items within a change event |
| `change_event_approvals` | Approval workflow records |
| `change_event_attachments` | File attachments |
| `change_event_history` | Change event audit log |
| `change_event_rfqs` | Request for quotes issued |
| `change_event_rfq_responses` | Vendor RFQ responses |

---

### Direct Costs

| Table | Description |
|-------|-------------|
| `direct_costs` | Direct cost records |
| `direct_cost_line_items` | Line items within a direct cost |

---

### Drawings (4+ tables)

| Table | Description |
|-------|-------------|
| `drawings` | Drawing records |
| `drawing_sets` | Drawing set groupings |
| `drawing_areas` | Drawing area definitions |
| `drawing_revisions` | Revision tracking |
| `drawing_pins` | Annotation pins on drawings |

---

### Meetings & Communications (8+ tables)

| Table | Description |
|-------|-------------|
| `meetings` | Meeting records (from Fireflies.ai integration) |
| `meeting_chunks` | Segmented meeting transcript chunks |
| `meeting_embeddings` | Vector embeddings for meeting content |
| `meeting_digests` | AI-generated meeting summaries |
| `daily_logs` | Daily log entries |
| `daily_log_equipment` | Equipment entries in daily logs |
| `daily_log_manpower` | Manpower entries |
| `daily_log_notes` | Notes within daily logs |
| `daily_recaps` | AI-generated daily recap summaries |

---

### Projects & Companies (10+ tables)

| Table | Description |
|-------|-------------|
| `projects` | Project records |
| `companies` | Company directory |
| `company_context` | Company-level AI context |
| `company_knowledge` | Company knowledge base documents |
| `project_companies` | Project-company associations |
| `profiles` | User profiles |
| `users` | Application users (linked to Supabase Auth) |
| `attachments` | Global attachment store |
| `estimates` | Estimate records |
| `billing_periods` | Project billing periods |

---

### Specifications, Submittals, RFIs, Punch Items

| Table | Description |
|-------|-------------|
| `specifications` | Specification sections |
| `specification_areas` | Specification area groupings |
| `specification_revisions` | Specification revision tracking |
| `submittals` | Submittal records |
| `submittal_revisions` | Submittal revisions |
| `rfis` | Request for Information records |
| `rfi_responses` | RFI responses |
| `punch_items` | Punch list items |

---

### Scheduling

| Table | Description |
|-------|-------------|
| `schedule_tasks` | Schedule task records |
| `app_schedule_task_hierarchy` | Task dependency/hierarchy |
| `app_schedule_bulk_operations` | Bulk operation tracking |

---

### App Metadata & Configuration (10+ tables)

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

### Documents & RAG Infrastructure

| Table | Description |
|-------|-------------|
| `documents` | Uploaded document records |
| `document_chunks` | RAG chunks from documents |
| `document_embeddings` | Vector embeddings |
| `document_metadata` | Document metadata |
| `knowledge_documents` | Knowledge base documents |

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

## Key pgvector Functions (RAG Search)

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

## Supabase Client Pattern

```typescript
// Browser (singleton)
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

// Server Components / API Routes (new instance per request)
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
```

Session management: `proxy.ts` → `updateSession()` refreshes Supabase tokens on every request.
