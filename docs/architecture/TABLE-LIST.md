# Database Tables — Live List

> **AUTO-GENERATED — DO NOT EDIT BY HAND.**
> Regenerate with `npm run db:inventory`. Source: `docs/architecture/tables.yaml` + live Supabase stats.
> Last generated: 2026-06-17T09:31:24.662Z

This file lists every table in both Supabase projects with its current status, row count, code-reference count, one-line purpose, and any gotchas/notes. It is the fastest way to answer "does table X exist, what does it do, is it live, does anything use it?"

Column meanings:
- **Rows** — approximate row count from `pg_class.reltuples` (refreshed each regenerate).
- **Code refs** — count of `.from("table")` / `.table("table")` references in `frontend/src`, `backend/src`, and `alleato-ai`. Does NOT include migration files or one-off scripts. **0 code refs + 0 rows = strong drop candidate.** **0 code refs + N rows = stale data, no readers.**
- **Notes** — `notes_for_ai` if set, else `gotchas`, from `tables.yaml`.

For richer information (full writer/reader file lists, columns, line numbers), open the admin UI at `/database-inventory` or read the source: `docs/architecture/tables.yaml`. For architectural narrative + dated corrections, read `docs/architecture/TABLE-INVENTORY.md`.

**How to update:** edit `docs/architecture/tables.yaml` and run `npm run db:inventory`. This file is regenerated from that source.

---

## MAIN — PM App database (`lgveqfnpkxvzbnnwuled`)

402 tables · 188 live · 159 dormant · 41 live-empty · 11 dead · 2 active · 1 legacy

| Table | Domain | Status | Rows | Code refs | Purpose | Notes |
|---|---|---|---:|---:|---|---|
| `admin_view_backups` | admin | dormant | 2 | 0 | Dormant admin view backup snapshots. |  |
| `app_crawl_sessions` | admin | live | 7 | 0 | App crawl sessions for admin auditing. |  |
| `app_error_events` | admin | live | 5.1k | 3 | Application error event tracking. |  |
| `app_error_groups` | admin | live | 1.2k | 6 | Error group aggregation. |  |
| `app_page_access_policies` | admin | active | 1 | 2 | Admin-managed route access inventory. Records explicit per-page access levels (route, access_level, permission_module) so page visibility decisions are reviewa… |  |
| `app_pages` | admin | live | 1 | 0 | App page registry. |  |
| `app_parity_checks` | admin | dormant | 0 | 0 | Dormant parity check results. |  |
| `app_schedule_bulk_operations` | admin | dormant | 0 | 0 | Dormant app schedule bulk operation records. |  |
| `app_schedule_task_hierarchy` | admin | dormant | 0 | 0 | Dormant app schedule task hierarchy records. |  |
| `app_system_actions` | admin | live | 831 | 0 | App system action log. |  |
| `app_system_states` | admin | dormant | 0 | 0 | Dormant app system state snapshots. |  |
| `app_ui_components` | admin | dormant | 0 | 0 | Dormant UI component registry. |  |
| `app_ui_table_columns` | admin | dormant | 0 | 0 | Dormant UI table column definitions. |  |
| `app_ui_tables` | admin | live | 0 | 0 | App UI table registry for admin tooling. |  |
| `database_tables_catalog` | admin | live | 318 | 2 | Schema metadata catalog for admin tooling. Separate from db-inventory.generated.ts. |  |
| `dev_annotations` | admin | live | 411 | 14 | Dev/admin annotation overlay for the UI. |  |
| `dev_panel_comments` | admin | live | 4 | 2 | Dev panel inline comments. |  |
| `parts` | admin | dormant | 7 | 0 | Dormant parts catalog. Purpose unclear. |  |
| `procore_capture_sessions` | admin | live | 6 | 0 | Procore crawler capture sessions. |  |
| `procore_components` | admin | dormant | 864 | 0 | Dormant Procore component tracker. No code references. |  |
| `procore_feature_implementations` | admin | dormant | 0 | 0 | Dormant Procore feature implementation tracker. No code references. |  |
| `procore_features` | admin | live | 138 | 2 | Procore feature parity audit. |  |
| `procore_modules` | admin | live | 24 | 0 | Procore module groupings. |  |
| `procore_pages` | admin | live | 391 | 1 | Procore page registry for parity audit. |  |
| `procore_screenshots` | admin | live | 22 | 0 | Admin crawler screenshots from Procore. |  |
| `procore_tools` | admin | live | 35 | 11 | Admin Procore parity tracker. |  |
| `psr_comments` | admin | live | 1 | 4 | PSR (Project Status Report) comments. |  |
| `qa_page_audit` | admin | live | 148 | 0 | QA audit results for page parity. |  |
| `table_metadata` | admin | live | 19 | 1 | Table-level metadata for admin tooling. |  |
| `test_cases` | admin | live | 812 | 12 | Test plan case definitions. |  |
| `test_results` | admin | live | 307 | 12 | Test run results. |  |
| `test_runs` | admin | live | 51 | 12 | Test run sessions. |  |
| `test_screenshots` | admin | live | 40 | 3 | Test run screenshots. |  |
| `test_suites` | admin | live | 42 | 10 | Test suite groupings. |  |
| `tool_features` | admin | live | 40 | 1 | Feature flags or tool feature definitions. |  |
| `tool_form_fields` | admin | live | 31 | 1 | Form field definitions for tool configuration. |  |
| `agent_learning_usages` | ai | live | 0 | 0 | Session-level usage/outcome log for injected agent learnings. Proves whether a retrieved learning was used and whether later feedback marked that session posit… | Rows are written opportunistically when learnings are injected into assistant context. Treat it as effectiveness telemetry, not the source of the learning itse… |
| `agent_learnings` | ai | live | 55 | 0 | Durable AI failure-pattern and prevention-prompt memory. Read and upserted by agent-learning-service.ts from thumbs-down feedback, eval failures, and admin fee… | PM APP stores the structured learning record only. Embeddings for retrieval are synced separately into the RAG database and must not be written into this table. |
| `ai_analysis_jobs` | ai | dormant | 0 | 0 | Dormant AI analysis job queue. |  |
| `ai_feedback_events` | ai | live-empty | 12 | 9 | AI feedback events. Writer wired in feedback-event-service.ts but never triggered. |  |
| `ai_learning_promotions` | ai | live-empty | 0 | 30 | AI learning promotion records. Writer wired but never triggered. |  |
| `ai_memories` | ai | live | 61.2k | 11 | Long-term AI assistant memory store. 27,990 rows. Written by ai-memory-service.ts and workspace artifact promotions. |  |
| `ai_models` | ai | dormant | 0 | 0 | Dormant AI model registry. |  |
| `ai_retrieval_feedback` | ai | live | 2.2k | 4 | Thumb/score feedback on AI retrieval results. 1,948 rows. Written by feedback-event-service.ts. |  |
| `ai_retrieval_weights` | ai | dormant | 0 | 6 | Dormant AI retrieval weight tuning table. |  |
| `ai_review_feedback` | ai | dormant | 0 | 1 | Dormant AI review feedback. |  |
| `ai_task_feedback` | ai | dormant | 10 | 8 | Dormant AI task feedback. |  |
| `ai_tool_write_audits` | ai | dormant | 2 | 0 | Dormant AI tool write audit log. |  |
| `chat_history` | ai | live | 4.0k | 31 | AI assistant chat message persistence. 2,908 rows. The live chat store. |  |
| `chats` | ai | dead | 3 | 0 | Dead schema. No code references. Drop candidate. |  |
| `conversations` | ai | live | 401 | 15 | AI assistant chat session metadata. 226 rows. Thread/session header for chat_history. |  |
| `memories` | ai | live | 79 | 4 | Per-session AI conversation summaries with 3072-dim embeddings, used for cross-session recall. Written by conversation-memory.ts (embedAndStoreMemory, memory_t… |  |
| `messages` | ai | dead | 32 | 0 | Dead schema. No code references. Drop candidate. |  |
| `notes` | ai | dead | 0 | 3 | Dead schema. No code references. Drop candidate. |  |
| `app_roles` | auth | dormant | 0 | 0 | Dormant role definitions. |  |
| `billing_invitations` | auth | dormant | 0 | 0 | Dormant billing/invite infrastructure. |  |
| `organization_members` | auth | dormant | 0 | 0 | Multi-tenant infrastructure scaffolding. Not in use. |  |
| `organizations` | auth | dormant | 0 | 0 | Multi-tenant infrastructure scaffolding. Not in use. |  |
| `user_email_notifications` | auth | live-empty | 0 | 5 | Email notification preferences per user. UI present, no rows. |  |
| `user_profiles` | auth | live | 0 | 133 | Per-user app preferences and is_admin flag. Read by 123+ code paths for permission checks. | CRITICAL BUG: Table appears empty but 123+ code paths read it. Every permission check silently falls back to null/non-admin. Investigate RLS or actual data sta… |
| `user_schedule_notifications` | auth | live-empty | 0 | 2 | Schedule notification preferences per user. UI present, no rows. |  |
| `user_table_views` | auth | live | 0 | 7 | Per-user named presets for UnifiedTablePage — captures visible columns, column order, sort, and filters. Lets PMs/testers save 'Quick view', 'Full detail', etc. | scope_key is project-agnostic (e.g. 'meetings'), not 'meetings-25125'. A view created on project A's meetings page applies on project B's. is_default is enforc… |
| `users_auth` | auth | live | 0 | 35 | Bridge between Supabase auth user (UUID) and people.id. Critical for all permission checks. | CRITICAL BUG: Only 1 row despite ~7 writer paths. Most signups not producing the bridge row. Silent privilege degradation for all users without a row. |
| `bot_debug_log` | communications | live | 518 | 1 | Observability log for Teams bot. 336 rows. Written by teams-chat.ts. Not read in app. |  |
| `bot_user_mappings` | communications | live | 4 | 16 | Maps (platform, platform_user_id) to supabase_user_id. Drives Teams and Telegram bot identity. 1 active row. |  |
| `email_attachments` | communications | live | 935 | 11 | In-app attachment store. 419 rows, 391 MB. Covers manual uploads and change-event/contract/commitment/prime-CO/submittal attachments. NOT the same as outlook_e… | Do not confuse with outlook_email_intake_attachments. This stores in-app uploads. |
| `email_events` | communications | dormant | 34 | 24 | Dormant email event log. |  |
| `email_filter_rules` | communications | live | 0 | 4 | User-trained junk-mail rules. Applied by the Outlook sync as Gate 1.5 between the hand-coded noise filter (_is_noise_email) and the heuristic classifier. Each… | Reads in backend/src/services/integrations/microsoft_graph/user_filter_rules.py. Writes from frontend/src/app/api/email-filter-rules/ (admin-only POST/PATCH/DE… |
| `email_messages` | communications | dead | 0 | 0 | Dead schema. No code references. Drop candidate. |  |
| `meeting_preps` | communications | dormant | 0 | 9 | Dormant meeting preparation records. |  |
| `meeting_segments` | communications | live | 24.4k | 17 | Meeting transcript chunks and summary embeddings. 19,527 rows. Written by parser.py, embedder.py. Read by meeting pages and project intelligence. |  |
| `outlook_email_assistant_reviews` | communications | live-empty | 0 | 3 | Human review ledger for Brandon Outlook assistant decisions, draft outcomes, and feedback signals. | Admin/service-role table. It records review outcomes only; raw email source remains outlook_email_intake and project-matched email remains project_emails. |
| `outlook_email_intake` | communications | live | 2.1k | 17 | Raw Outlook email sync. 812 rows. Every email from the Graph sync lands here first. Source for document_metadata (AI-relevant) and project_emails (project-matc… |  |
| `outlook_email_intake_attachments` | communications | live | 1.6k | 8 | Attachments from synced Outlook emails. 627 rows, 355 MB. Written by outlook.py and attachment_promotion.py. |  |
| `outlook_email_skip_audit` | communications | dormant | 123 | 1 | Dormant audit log for skipped Outlook emails. |  |
| `team_chat_channels` | communications | live | 4 | 5 | Teams chat channel registry. 2 rows. |  |
| `team_chat_messages` | communications | live-empty | 4 | 12 | Teams chat messages. Wired but unused. |  |
| `teams_conversation_refs` | communications | live | 2 | 6 | Per-user proactive Teams thread cache. Upserted on every inbound Teams message so the bot can reply in the same thread. |  |
| `teams_link_codes` | communications | live-empty | 6 | 4 | Short-lived link codes for Teams bot↔account linking. Empty = no in-progress flows. |  |
| `telegram_link_codes` | communications | live-empty | 1 | 4 | Short-lived link codes for Telegram bot↔account linking. Empty = no in-progress flows. |  |
| `companies` | directory | live | 0 | 94 | Master company directory — vendors, clients, subs. is_vendor flag drives Acumatica sync. FK target for vendor-related forms. | FK-validation gate: vendor dropdown sources from vendors view but FK targets companies table. ~50 read sites. |
| `company_context` | directory | live-empty | 0 | 5 | Admin singleton doc for company-level AI context. Not yet populated. |  |
| `people` | directory | live | 0 | 136 | Master person directory. UUID id. Bridged to auth via users_auth.auth_user_id. |  |
| `prospects` | directory | live-empty | 0 | 2 | Prospects directory page exists and reads/writes. Never used in production. |  |
| `vendor_contacts` | directory | live-empty | 0 | 3 | UI tries to read vendor contacts. No writer found in codebase. |  |
| `change_order_documents` | documents | live | 0 | 0 | Pattern C junction: change orders ↔ document_metadata. TODO: expand metadata, identify writers/readers. |  |
| `commitment_change_order_documents` | documents | live | 0 | 0 | Pattern C junction: commitment change orders ↔ document_metadata. Replaces cco_attachments writers. |  |
| `company_documents` | documents | live | 0 | 0 | Pattern C junction: companies ↔ document_metadata. TODO: expand metadata, identify writers/readers. |  |
| `daily_log_photos` | documents | live | 0 | 2 | Photo metadata written by the Site Scribe daily-log flow. Stores uploaded image records plus pairing back to the generated daily log and note context. | This is not the old project photos feature. The active writer is /api/projects/[projectId]/daily-log/site-scribe, which replaces rows for a daily log on regene… |
| `daily_logs_project_photos_links` | documents | live-empty | 0 | 0 | Link table between daily logs and project photos. Feature shipped, never adopted. |  |
| `document_executive_summaries` | documents | dormant | 0 | 0 | Dormant document executive summaries. |  |
| `document_group_access` | documents | dormant | 0 | 0 | Dormant per-group document access control. |  |
| `document_insights` | documents | dormant | 0 | 0 | Dormant document insights table. |  |
| `document_metadata` | documents | live | 39.3k | 202 | Primary document catalog. 36,511 rows. Dual-written with RAG.rag_document_metadata on every ingestion. Full business metadata including project_id, source_type… | Always written alongside rag_document_metadata via upsert_document_metadata() — never write to one without the other. |
| `document_rows` | documents | live | 13.1k | 5 | Structured document rows loaded by ETL outside the repo. 12,354 rows. Read by AI tools/structured-queries.ts. |  |
| `document_type_taxonomy` | documents | live | 23 | 3 | Lookup table for document_metadata.document_type values (Pattern C). TODO: expand metadata, identify writers/readers. |  |
| `document_user_access` | documents | dormant | 0 | 0 | Dormant per-user document access control. |  |
| `documents_rfis_links` | documents | dormant | 0 | 0 | Dormant document to RFI links. |  |
| `documents_submittals_links` | documents | dormant | 0 | 0 | Dormant document to submittal links. |  |
| `drawing_areas` | documents | live | 1 | 5 | Drawing area definitions. 1 row. Admin-only. |  |
| `drawing_change_history` | documents | live | 11 | 6 | Change history for drawing publish/obsolete actions. 11 rows. |  |
| `drawing_downloads` | documents | live | 1.5k | 4 | Download audit log for drawings. 1,400 rows. |  |
| `drawing_markup_pins` | documents | live | 12 | 0 | Markup pins on drawings. 11 rows. |  |
| `drawing_related_items` | documents | dormant | 0 | 9 | Dormant drawing related items. |  |
| `drawing_revisions` | documents | live | 69 | 7 | Drawing revision history. 44 rows. |  |
| `drawing_sets` | documents | live | 14 | 4 | Drawing set groupings. 14 rows. |  |
| `drawing_sketches` | documents | dormant | 1 | 10 | Dormant drawing sketches. |  |
| `drawings` | documents | live | 69 | 29 | Drawing records. 44 rows. Managed by DrawingService.ts and drawing API routes. Storage bucket: drawings. |  |
| `drawings_rfis_links` | documents | dormant | 0 | 0 | Dormant drawing to RFI links. |  |
| `files` | documents | live | 6 | 5 | Project-setup wizard file index. 2 rows. Parallel to legacy documents table. Storage buckets: drawings, specifications, schedules. |  |
| `owner_invoice_documents` | documents | live | 0 | 0 | Pattern C junction: owner invoices ↔ document_metadata. TODO: expand metadata, identify writers/readers. |  |
| `photo_albums` | documents | live-empty | 1 | 4 | Photo albums. Feature shipped, never adopted. |  |
| `photo_links` | documents | live-empty | 0 | 0 | Photo links. Feature shipped, never adopted. |  |
| `photos` | documents | live-empty | 0 | 0 | Photo feature. Routes wired, zero data. Feature shipped but never adopted. |  |
| `prime_contract_change_order_documents` | documents | live | 0 | 0 | Pattern C junction: prime contract change orders ↔ document_metadata. Replaces pcco_attachments writers. |  |
| `prime_contract_documents` | documents | live | 3 | 1 | Pattern C junction: prime contracts ↔ document_metadata. TODO: expand metadata, identify writers/readers. |  |
| `prime_contract_pco_documents` | documents | live | 0 | 0 | Pattern C junction: prime contract PCOs ↔ document_metadata. Replaces prime_contract_pco_attachments readers. |  |
| `project_documents_v2` | documents | live | 14 | 0 | Successor to project_documents (Pattern C migration). Project ↔ document_metadata. TODO: expand metadata, identify writers/readers. |  |
| `purchase_order_documents` | documents | live | 1 | 0 | Pattern C junction: purchase orders ↔ document_metadata. TODO: expand metadata, identify writers/readers. |  |
| `rfi_documents` | documents | live | 0 | 0 | Pattern C junction: RFIs ↔ document_metadata. TODO: expand metadata, identify writers/readers. |  |
| `search_documents` | documents | dead | 4 | 0 | Scratch table. 4 rows. No code references. Drop candidate. |  |
| `sop_backlog` | documents | live | 1 | 3 | SAIS structured backlog for missing or lifecycle-managed accounting/finance SOP requirements. Placeholder records exist before a real SOP file is uploaded, the… | Do not create fake document_metadata rows for missing SOPs. Placeholder backlog rows are requirements, not uploaded files; AI retrieval must distinguish them f… |
| `specification_area_sections` | documents | dormant | 0 | 5 | Dormant specification area sections. |  |
| `specification_areas` | documents | dormant | 0 | 9 | Dormant specification areas. |  |
| `specification_divisions` | documents | dormant | 0 | 0 | Dormant specification divisions. |  |
| `specification_section_revisions` | documents | live | 0 | 8 | Specification section revisions. 1 row. |  |
| `specification_sections` | documents | dormant | 0 | 14 | Dormant specification sections. |  |
| `specification_subscribers` | documents | dormant | 0 | 4 | Dormant specification subscribers. |  |
| `specifications` | documents | live-empty | 0 | 13 | Specification records. Feature wired, no production data. |  |
| `subcontract_documents` | documents | live | 13 | 0 | Pattern C junction: subcontracts ↔ document_metadata. TODO: expand metadata, identify writers/readers. |  |
| `subcontractor_invoice_documents` | documents | live | 0 | 0 | Pattern C junction: subcontractor invoices ↔ document_metadata. Replaces subcontractor side of invoice_attachments. |  |
| `submittal_doc_links` | documents | live | 3 | 0 | Pattern C junction: submittals ↔ document_metadata. TODO: expand metadata, identify writers/readers. |  |
| `estimate_gc_templates` | estimating | live | 1 | 2 | GC template definitions for the estimating workflow. TODO: expand metadata, identify writers/readers. |  |
| `estimate_sublist_bid_items` | estimating | live | 1 | 7 | Line items in subcontractor bid lists during estimating. TODO: expand metadata, identify writers/readers. |  |
| `estimate_sublist_call_logs` | estimating | live | 3 | 2 | Call logs against estimate sublists. TODO: expand metadata, identify writers/readers. |  |
| `estimate_sublist_scope_items` | estimating | live | 34 | 7 | Scope items attached to estimate sublists. TODO: expand metadata, identify writers/readers. |  |
| `acumatica_accounts` | financial | live | 154 | 1 | Chart of accounts mirror from Acumatica. 154 rows. Frontend-only sync (mirror-sync.ts). No app reads. |  |
| `acumatica_ap_bill_lines` | financial | live | 4.5k | 2 | Line items for acumatica_ap_bills. 4,016 rows. Delete+reinsert per sync cycle. | Delete+reinsert on every sync. Do not reference rows by id across sync cycles. |
| `acumatica_ap_bills` | financial | live | 6.6k | 11 | Acumatica AP bills mirror. 6,399 rows. Source for direct_costs projection. Updated 2×/day by Render cron. |  |
| `acumatica_ar_invoice_lines` | financial | live | 2.6k | 3 | Line items for acumatica_ar_invoices. 1,922 rows. |  |
| `acumatica_ar_invoices` | financial | live | 498 | 13 | Acumatica AR invoices mirror. 464 rows. Read by accounting invoices, dashboard, WIP, global invoices API. |  |
| `acumatica_change_orders` | financial | live | 4.3k | 5 | Acumatica change orders mirror. 4,069 rows. Projects into both prime_contract_change_orders and contract_change_orders via status mapping. |  |
| `acumatica_checks` | financial | live | 3.0k | 8 | Acumatica checks mirror. 2,775 rows. Projects into commitment_payments. Also flips paid flag on subcontractor_invoices when matching check found. |  |
| `acumatica_customers` | financial | live | 58 | 1 | Acumatica customers mirror. 58 rows. Frontend-only sync. Used to backfill customer_name on acumatica_ar_invoices. |  |
| `acumatica_outbound_audit_logs` | financial | live-empty | 0 | 2 | Audit log for outbound Acumatica exports. Writer exists but never triggered in production. |  |
| `acumatica_payment_applications` | financial | live | 1.6k | 8 | Join table for payment applications. 183 rows. | CRITICAL: No writer found in current code. Schema defined in migration 20260413000001. Rows from historical/manual load. If invoice-paid logic depends on this… |
| `acumatica_payments` | financial | live | 387 | 8 | Acumatica payments mirror. 368 rows. Read by accounting/payments and accounting/invoices paid logic. |  |
| `acumatica_project_budgets` | financial | live | 6.7k | 3 | Acumatica project budgets mirror. 6,172 rows. Read by accounting/wip route only. |  |
| `acumatica_project_tasks` | financial | live | 106 | 1 | Acumatica project tasks mirror. 99 rows. Frontend-only sync. Used for accounting cross-references. |  |
| `acumatica_projects` | financial | live | 87 | 5 | Acumatica projects mirror. 87 rows. Also upserts matching rows in the projects table on sync. |  |
| `acumatica_purchase_orders` | financial | live | 217 | 3 | Acumatica purchase orders mirror. 204 rows. Projects into purchase_orders. |  |
| `acumatica_subcontracts` | financial | live | 741 | 3 | Acumatica subcontracts mirror. 718 rows. Projects into subcontracts and subcontract_sov_items. |  |
| `acumatica_sync_runs` | financial | live-empty | 270 | 1 | Audit log of Acumatica sync runs. Writer exists at acumatica_sync.py:408 but no rows recorded. | CRITICAL: Empty despite writer. Likely exception path or ACUMATICA_FINANCIAL_SYNC_ENABLED env flag is off. Investigate _record_sync_run. |
| `acumatica_sync_state` | financial | live | 31 | 2 | Cursor state for Acumatica sync. 25 rows. Read before each sync to determine where to resume. |  |
| `billing_periods` | financial | dormant | 9 | 11 | Dormant billing periods. |  |
| `budget_changes` | financial | dead | 1 | 3 | Older budget change mechanism predating budget_modifications. 1 row. Effectively dead. |  |
| `budget_forecast_line_items` | financial | dormant | 0 | 4 | Dormant budget forecasting. No active writers. |  |
| `budget_line_forecasts` | financial | dormant | 0 | 2 | Dormant budget line forecasts. |  |
| `budget_line_history` | financial | live | 1.9k | 2 | Immutable audit history for budget_lines. 1,696 rows. Written by Postgres trigger only — never by app code. |  |
| `budget_line_item_history` | financial | dormant | 0 | 0 | Dormant. Likely superseded by budget_line_history (trigger-driven). |  |
| `budget_lines` | financial | live | 628 | 52 | Per-project budget line items. Core operational budget table. 564 rows. Every budget change is mirrored to budget_line_history via Postgres trigger. | budget_code_id FK→budget_lines but dropdown sources from project_cost_codes (FORM-FK-VALIDATION-GATE). All history via trigger not app code. |
| `budget_mod_lines` | financial | live | 107 | 5 | Line-level deltas for budget modifications. 32 rows. The live table (not budget_modification_lines which is empty). | Name collision: budget_modification_lines (with full 'ation') is the empty dead twin. budget_mod_lines is live. |
| `budget_modification_lines` | financial | dead | 0 | 2 | Dead twin of budget_mod_lines. Empty. Drop candidate. |  |
| `budget_modifications` | financial | live | 35 | 10 | Budget revision documents. 22 rows. Formal modification records with associated line deltas in budget_mod_lines. |  |
| `budget_snapshots` | financial | dormant | 3 | 3 | Dormant budget snapshot mechanism. |  |
| `budget_view_columns` | financial | live | 312 | 3 | Column definitions for budget view layouts. 312 rows. |  |
| `budget_views` | financial | live | 26 | 11 | UI column-layout state for budget views. 63 rows. |  |
| `change_event_approvals` | financial | dormant | 0 | 4 | Dormant change event approval workflow. |  |
| `change_event_documents` | financial | live | 2 | 0 | Pattern C junction between change events and document_metadata. Created during attachment backfill; 2 rows. |  |
| `change_event_history` | financial | live | 76 | 8 | Hand-rolled audit log for change events. 43 rows. Written at multiple change-event API call sites. |  |
| `change_event_line_items` | financial | live | 48 | 17 | Line-item detail per change event. 54 rows. |  |
| `change_event_pco_links` | financial | dormant | 9 | 19 | Dormant change event to PCO links. |  |
| `change_event_related_items` | financial | dormant | 4 | 4 | Dormant change event related items. |  |
| `change_event_rfq_responses` | financial | live | 1 | 8 | Vendor responses to change event RFQs. 1 row. |  |
| `change_event_rfqs` | financial | live | 3 | 16 | RFQs sent from a change event to vendors. 6 rows. |  |
| `change_events` | financial | live | 62 | 70 | Project-level change events. 77 rows. Neutral upstream object that can generate RFQs and link to PCOs/CCOs. |  |
| `change_events_documents_links` | financial | dormant | 0 | 0 | Dormant change event to document links. |  |
| `change_orders` | financial | dead | 5 | 3 | Generic change order table. Dead — all CO data lives in contract_change_orders and prime_contract_change_orders. |  |
| `change_workflow_comments` | financial | dormant | 0 | 0 | Dormant change workflow comments. |  |
| `change_workflow_notifications` | financial | dormant | 0 | 0 | Dormant change workflow notifications. |  |
| `commitment_audit_log` | financial | live | 1.2k | 1 | Postgres trigger-driven audit covering subcontracts and purchase_orders mutations. 852 rows. |  |
| `commitment_change_order_lines` | financial | dormant | 5 | 11 | Commitment change order line items. Not clearly mapped in inventory. |  |
| `commitment_payments` | financial | live | 4.0k | 7 | Mirror of relevant acumatica_checks. 2,775 rows. Only backend Python sync writes. |  |
| `commitment_pcos` | financial | dormant | 2 | 25 | Dormant commitment PCO tracking. |  |
| `commitment_related_items` | financial | dormant | 0 | 6 | Dormant commitment related items. |  |
| `contract_billing_periods` | financial | dormant | 5 | 0 | Dormant contract billing period definitions. |  |
| `contract_change_orders` | financial | live | 170 | 63 | Commitment-side change orders (subcontracts/POs). 140 rows. Despite the name, these are NOT prime CCOs. | Misleading name: stores commitment-side CCOs (subcontracts/POs), NOT prime contract change orders. Routes at api/commitments/[commitmentId]/change-orders/*. |
| `contract_documents` | financial | live | 0 | 0 | Contract-level documents. 1 row. Effectively unused. |  |
| `contract_line_items` | financial | live | 248 | 18 | Line items for contract_change_orders. 140 rows. |  |
| `contract_payments` | financial | dormant | 0 | 0 | Dormant contract payments. Not the same as prime_contract_payments. |  |
| `contract_snapshots` | financial | dormant | 0 | 0 | Dormant contract snapshots. |  |
| `contract_views` | financial | dormant | 0 | 0 | Dormant contract view state. |  |
| `cost_code_division_updates_audit` | financial | dormant | 11 | 0 | Dormant audit table for cost code division changes. |  |
| `cost_code_divisions` | financial | live | 40 | 3 | Cost code division groupings. 40 rows. |  |
| `cost_code_types` | financial | live | 9 | 16 | Cost code type classifications. 6 rows. |  |
| `cost_codes` | financial | live | 353 | 36 | Global master cost code table. 310 rows. Referenced by budget lines and project budget codes. |  |
| `cost_factors` | financial | dormant | 8 | 0 | Dormant cost factor table. |  |
| `cost_forecasts` | financial | dormant | 2 | 4 | Dormant cost forecast table. |  |
| `direct_cost_line_items` | financial | live | 9.2k | 11 | Line items for direct_costs. 8,436 rows. Delete+reinsert per sync cycle. | Delete+reinsert on every sync. Do not reference rows by id across sync cycles. |
| `direct_costs` | financial | live | 6.8k | 22 | Domain projection of acumatica_ap_bills. 6,555 rows. Project-attributed AP charges. acumatica_document_key is the upsert key — do not edit manually. |  |
| `erp_sync_log` | financial | live | 75 | 0 | Frontend-initiated Acumatica sync audit log. 51 rows. Written by the frontend cron route, not the backend Python sync. |  |
| `estimate_allowances` | financial | dormant | 0 | 3 | Dormant estimate allowances. |  |
| `estimate_alternates` | financial | dormant | 0 | 3 | Dormant estimate alternates. |  |
| `estimate_detail_items` | financial | live | 5.2k | 18 | Sub-line drill-downs for estimate line items. 615 rows. |  |
| `estimate_gc_items` | financial | live | 2.1k | 15 | General conditions items for estimates. 281 rows. |  |
| `estimate_line_items` | financial | live | 594 | 6 | Main cost-of-work breakdown for estimates. 495 rows. |  |
| `estimate_sublist_subs` | financial | dormant | 10 | 24 | Dormant estimate sublist substitutions. |  |
| `estimates` | financial | live | 35 | 17 | Estimate header records. 5 rows. Bridge from estimates to budget and contract line items via estimate-import. |  |
| `finance_spend_classification_rules` | financial | live | 11 | 3 | SAIS classification layer for accounting/finance overhead spend. Read with acumatica_ap_bills to produce trailing monthly spend by category/vendor while exclud… | Raw Acumatica AP bills remain sync-owned. Broad keyword rules such as PAYROLL, TAX, CPA, LEGAL, and COMPLIANCE are disabled by default until reviewed so spend… |
| `financial_contracts` | financial | dormant | 2 | 2 | Dormant financial contracts. |  |
| `forecasting` | financial | dormant | 0 | 0 | Dormant forecasting header table. |  |
| `forecasting_curves` | financial | dormant | 2 | 0 | Dormant forecasting curves. |  |
| `invoice_payments` | financial | dormant | 3 | 4 | Dormant invoice payments. |  |
| `invoicing_settings` | financial | dormant | 1 | 2 | Dormant invoicing settings. |  |
| `owner_invoice_line_items` | financial | live | 1.3k | 7 | Line items for owner_invoices. 604 rows. Average ~20 lines per invoice. |  |
| `owner_invoices` | financial | live | 92 | 38 | Invoices sent to the owner (pay applications outbound). 29 rows. Full state machine UI. Line-item granularity is in active use. |  |
| `payment_application_line_items` | financial | dormant | 5 | 9 | Dormant payment application line items. |  |
| `payment_transactions` | financial | dormant | 0 | 0 | Dormant payment transactions. |  |
| `pcco_line_items` | financial | dormant | 1 | 14 | Dormant PCCO line items. |  |
| `pco_change_events` | financial | dormant | 0 | 8 | Dormant PCO to change event links. |  |
| `pco_line_items` | financial | dormant | 3 | 10 | Dormant PCO line items. |  |
| `pco_versions` | financial | dormant | 0 | 3 | Dormant PCO version history. |  |
| `potential_change_order_line_items` | financial | active | 0 | 9 | Line items for numeric potential_change_orders (pco_id bigint). line_amount is generated (quantity * unit_cost). Written atomically via create_pco_with_lines /… |  |
| `potential_change_orders` | financial | dormant | 1 | 12 | Numeric (bigint) potential change orders that group change events (via pco_change_events) and convert to COs. Header written atomically by create_pco_with_line… |  |
| `prime_contract_change_order_related_items` | financial | live | 1 | 3 | Related item links for prime contract change orders. 1 row. |  |
| `prime_contract_change_orders` | financial | live | 146 | 75 | Owner-side change orders. 142 rows. Projected from acumatica_change_orders via status mapping. |  |
| `prime_contract_payment_applications` | financial | dormant | 3 | 19 | Dormant prime contract pay applications. |  |
| `prime_contract_payments` | financial | live | 27 | 7 | Owner payment records. 26 rows. Most owner payments tracked via acumatica_payments + invoice join instead. |  |
| `prime_contract_pcos` | financial | dormant | 2 | 17 | Dormant prime contract PCO table. |  |
| `prime_contract_project_settings` | financial | live | 2 | 6 | Per-project prime contract settings. 1 row. |  |
| `prime_contract_sovs` | financial | dormant | 6 | 1 | Dormant prime contract schedule of values. |  |
| `prime_contracts` | financial | live | 20 | 77 | Owner contracts. 21 rows. Routes live under /api/projects/[projectId]/contracts (NOT /prime-contracts). | API routes are at /contracts not /prime-contracts. Bootstrap creates one only when project has owner info. |
| `project_budget_codes` | financial | live | 3.4k | 42 | Per-project budget codes linking cost codes to budget lines. The dropdown source for budget code selection in forms. | FK-validation gate: budget_code_id FK→budget_lines but dropdown sources from project_cost_codes. Always resolve the ID mismatch in both read and write paths. |
| `project_budget_settings` | financial | live-empty | 1 | 3 | Per-project budget UI configuration. Schema exists, API routes exist, but no projects have settings saved yet. |  |
| `purchase_order_sov_items` | financial | live | 230 | 27 | SOV items for purchase orders. 198 rows. |  |
| `purchase_orders` | financial | live | 146 | 27 | Purchase order records. 129 rows. Domain projection from acumatica_purchase_orders. Audited via Postgres trigger to commitment_audit_log. |  |
| `qto_items` | financial | dormant | 0 | 0 | Dormant quantity takeoff items. |  |
| `qtos` | financial | dormant | 0 | 0 | Dormant quantity takeoff headers. |  |
| `reconciliation_findings` | financial | live-empty | 677 | 4 | Current and historical reconciliation findings between Job Planner project records and Acumatica mirrors. | fingerprint is the primary key. review_status tracks triage; is_active distinguishes current findings from resolved/stale findings. |
| `reconciliation_runs` | financial | live-empty | 4 | 4 | Job Planner to Acumatica reconciliation run ledger. Tracks scan status, finding counts, and dollars at risk. | RLS is enabled with service-role access only. Treat as operational triage state, not user-authored financial source data. |
| `schedule_of_values` | financial | dead | 0 | 4 | SOV table. Referenced as a reader in AI financial tools but NEVER written. Dead reads. |  |
| `sov_line_items` | financial | dead | 0 | 1 | SOV line items. Same as schedule_of_values — never written. |  |
| `sub_jobs` | financial | dormant | 0 | 0 | Dormant sub-job tracking. |  |
| `subcontract_sov_items` | financial | live | 1.1k | 28 | Schedule of Values line items for subcontracts. 964 rows. Source for subcontractor invoicing. | Name collision: subcontractor_sov_items (2 rows) is the near-dead sibling. This is the live table. |
| `subcontractor_invoice_audit_log` | financial | live | 2.4k | 7 | App-level audit log for subcontractor invoice state changes. 2,444 rows. Hand-rolled inserts scattered across invoice routes — no DB trigger backstop. | No DB trigger. Missing inserts in some code paths mean silent audit gaps. |
| `subcontractor_invoice_emails` | financial | dormant | 1 | 4 | Dormant subcontractor invoice email log. |  |
| `subcontractor_invoice_line_items` | financial | live | 17 | 6 | Line items for subcontractor_invoices. Only 12 rows — legacy invoices are header-only. |  |
| `subcontractor_invoice_related_items` | financial | dormant | 0 | 4 | Dormant subcontractor invoice related items. |  |
| `subcontractor_invoices` | financial | live | 2.4k | 43 | Subcontractor pay applications. 2,433 rows. Full state machine UI. Acumatica sync flips paid flag when matching check found. | Only 12 line items for 2,433 invoices — legacy invoices imported header-only. Line-item granularity not guaranteed for historical data. |
| `subcontractor_sov_items` | financial | dead | 10 | 9 | Near-dead sibling of subcontract_sov_items. 2 rows. Used for subcontractor-portal submissions. Verify usage before dropping. |  |
| `subcontractor_sov_submissions` | financial | dormant | 48 | 10 | Subcontractor SOV submission tracking. Dormant. |  |
| `subcontracts` | financial | live | 462 | 34 | Subcontract records. 398 rows. Written by Acumatica sync and UI routes. Audited via Postgres trigger to commitment_audit_log. |  |
| `vertical_markup` | financial | dormant | 26 | 13 | Dormant vertical markup table. |  |
| `asrs_blocks` | fm-asrs | live | 476 | 0 | ASRS blocks. Lightly referenced. |  |
| `asrs_configurations` | fm-asrs | dormant | 4 | 0 | Dormant ASRS configurations. No code references. |  |
| `asrs_decision_matrix` | fm-asrs | dormant | 0 | 0 | Dormant ASRS decision matrix. No code references. |  |
| `asrs_logic_cards` | fm-asrs | dormant | 0 | 0 | Dormant ASRS logic cards. No code references. |  |
| `asrs_protection_rules` | fm-asrs | dormant | 0 | 0 | Dormant ASRS protection rules. No code references. |  |
| `asrs_sections` | fm-asrs | live | 70 | 0 | ASRS section definitions. Lightly referenced. |  |
| `block_embeddings` | fm-asrs | dormant | 0 | 0 | Dormant block embeddings. No code references. |  |
| `design_recommendations` | fm-asrs | live | 0 | 0 | Design recommendations. Lightly referenced. |  |
| `design_violations` | fm-asrs | live | 2 | 3 | Design violations. Lightly referenced. |  |
| `fm_blocks` | fm-asrs | dormant | 629 | 0 | Dormant FM blocks. No code references. |  |
| `fm_cost_factors` | fm-asrs | dormant | 7 | 0 | Dormant FM cost factors. No code references. |  |
| `fm_documents` | fm-asrs | dormant | 1 | 0 | Dormant FM documents. No code references. |  |
| `fm_form_submissions` | fm-asrs | live | 19 | 6 | FM Global form submissions. Lightly referenced. |  |
| `fm_global_figures` | fm-asrs | live | 31 | 4 | FM Global figures/charts. Lightly referenced. |  |
| `fm_global_tables` | fm-asrs | live | 46 | 3 | FM Global lookup tables for sprinkler design. Lightly referenced. |  |
| `fm_optimization_rules` | fm-asrs | dormant | 3 | 0 | Dormant FM optimization rules. |  |
| `fm_optimization_suggestions` | fm-asrs | dormant | 0 | 0 | Dormant FM optimization suggestions. |  |
| `fm_sections` | fm-asrs | live | 66 | 0 | FM Global section definitions. Lightly referenced. |  |
| `fm_sprinkler_configs` | fm-asrs | live | 0 | 1 | FM Global sprinkler configurations. Lightly referenced. |  |
| `fm_table_vectors` | fm-asrs | dormant | 45 | 0 | Dormant FM table vectors. No code references. |  |
| `fm_text_chunks` | fm-asrs | dormant | 43 | 0 | Dormant FM text chunks. No code references. |  |
| `optimization_rules` | fm-asrs | dormant | 0 | 0 | Dormant generic optimization rules. |  |
| `__drizzle_migrations` | infrastructure | live | 1 | 0 | Drizzle ORM migration ledger. Tracks applied migrations. |  |
| `_prisma_migrations` | infrastructure | legacy | 1 | 0 | Prisma migration ledger from prior ORM. Kept for historical record; Supabase migrations are authoritative. |  |
| `briefing_runs` | intelligence | dormant | 0 | 0 | Dormant briefing run tracker. |  |
| `daily_recaps` | intelligence | live | 90 | 15 | Legacy executive briefing packets. 49 rows. Still used by alleato-executive-daily-brief-* Render crons. | Legacy mechanism. intelligence_packets is the modern equivalent but daily_recaps is still actively generated. |
| `executive_briefing_follow_ups` | intelligence | live | 428 | 8 | Follow-up actions from executive briefings. 108 rows. |  |
| `initiative_cards` | intelligence | live | 12 | 14 | Strategic initiative cards. 8 rows. Separate from insight_cards. |  |
| `insight_card_evidence` | intelligence | live | 20.8k | 13 | Links insight cards to their source documents. 6,185 rows. FK to document_metadata/source_documents. |  |
| `insight_card_targets` | intelligence | live | 9.8k | 6 | Links insight cards to intelligence targets with is_primary flag. 5,990 rows. |  |
| `insight_cards` | intelligence | live | 11.0k | 37 | Durable extracted signals from the intelligence pipeline. 5,991 rows. Created by promote_signal_candidate. Can be acknowledged, snoozed, or manually created. |  |
| `intelligence_packet_cards` | intelligence | live | 1.2k | 10 | Packet to insight_card join table with section and rank. 2,230 rows. Wiped and re-inserted on every packet refresh. | Wiped and re-inserted on every refresh. Do not reference rows by id across refresh cycles. |
| `intelligence_packets` | intelligence | live | 103 | 24 | Rendered briefing per intelligence target — latest snapshot. 83 rows. Upserted by compile_current_packet on every refresh. |  |
| `intelligence_reviews` | intelligence | live | 4 | 2 | Human review queue for packet/card feedback. Low row count today, but active insert/read paths make it the durable app-side review ledger. | Do not let this become a silent junk drawer for AI corrections. Keep ownership tight around packet/card feedback until a broader review workflow exists. |
| `intelligence_targets` | intelligence | live | 108 | 24 | Registry of compile-able intelligence targets (client_project, etc). 77 rows. status='active' gates packet refresh. Source for periodic refresh cron. |  |
| `project_attribution_rules` | intelligence | live | 514 | 7 | Heuristic rules for matching emails/documents to projects. 514 rows. Auto-learned from confirmed attributions. |  |
| `project_briefings` | intelligence | dormant | 0 | 0 | Dormant. NOT the same as intelligence_packets. No writer found. | Do not confuse with intelligence_packets, which is the live briefing store. |
| `initiatives` | marketing | dormant | 3 | 0 | Dormant marketing initiatives table. Not the same as initiative_cards. |  |
| `marketing_content_assets` | marketing | dormant | 6 | 3 | Dormant marketing content assets. |  |
| `marketing_content_calendar_items` | marketing | dormant | 6 | 3 | Dormant marketing content calendar. |  |
| `marketing_intelligence_items` | marketing | dormant | 13 | 2 | Dormant marketing intelligence items. CMO tool path wired but no production traffic. |  |
| `marketing_performance_snapshots` | marketing | dormant | 0 | 0 | Dormant marketing performance snapshots. |  |
| `workspace_artifacts` | marketing | dormant | 2 | 9 | Dormant workspace artifacts. Referenced in CMO path but no production traffic. |  |
| `distribution_group_members` | permissions | live-empty | 0 | 2 | Members of distribution groups. No rows. |  |
| `distribution_groups` | permissions | live-empty | 0 | 1 | Distribution groups for notifications. Full CRUD service exists, no rows. |  |
| `group_members` | permissions | dormant | 0 | 0 | Dormant. No active code references. |  |
| `groups` | permissions | dormant | 0 | 0 | Dormant. No active code references. |  |
| `permission_audit_log` | permissions | live | 6 | 5 | Auto-written by lib/permissions.ts on permission changes. 7 rows. |  |
| `permission_templates` | permissions | live | 15 | 25 | 11 active permission templates. Managed via admin UI at /permissions/templates. |  |
| `person_company_templates` | permissions | live-empty | 0 | 8 | Permission templates per person-company pair. Feature defined, no data. |  |
| `user_directory_permissions` | permissions | live-empty | 0 | 3 | Admin-only per-user directory permission overrides. No rows set. |  |
| `user_granular_permission_overrides` | permissions | live | 0 | 9 | Fine-grained permission overrides. 4 active rows. |  |
| `user_module_permissions` | permissions | live-empty | 0 | 9 | Per-module tool access overrides per user. Same null-fallback bug as user_profiles. |  |
| `graph_subscriptions` | pipeline | live | 2 | 7 | Microsoft Graph webhook subscriptions. RLS-protected row count. Auto-renewed by subscriptions.py and webhooks.py. |  |
| `graph_sync_state` | pipeline | live | 322 | 4 | Per-resource delta sync tokens for Microsoft Graph. Per-user mailbox rows key resource_id by the bare mailbox email, not user:<email>. | Do not prefix mailbox resource_id values when reading graph_sync_state for stale-first sync selection; prefixed lookups match zero rows and collapse the limite… |
| `pipeline_config` | pipeline | dormant | 1 | 1 | Dormant pipeline configuration table. |  |
| `processing_queue` | pipeline | dormant | 3 | 0 | Dormant processing queue. |  |
| `sources` | pipeline | live | 1.2k | 0 | Source registry — canonical list of ingestion sources. 1,218 rows. |  |
| `sync_status` | pipeline | dormant | 0 | 1 | Dormant sync status table. |  |
| `system_alerts` | pipeline | live | 654 | 4 | Health alert sink. 646 rows. Written by source_sync_health.py and source_rag_health.py crons. |  |
| `project_companies` | projects | live | 66 | 24 | Many-to-many join between projects and companies. company_type and status columns describe the relationship. |  |
| `project_contact_references` | projects | live | 6.0k | 1 | Pipeline-internal contact references built during Graph email sync for project assignment. No UI. Rows accumulate uncontrolled. | Written by project_assignment.py every 30-min Graph sync. No cleanup/expiry mechanism. Row count grows unbounded. |
| `project_directory_memberships` | projects | live | 34 | 63 | Core M2M join between projects and directory members. Race-protected via onConflict upserts. |  |
| `project_documents` | projects | live | 3.1k | 14 | Project-scoped uploaded documents. Parallel to document_metadata (the AI-ready catalog). |  |
| `project_emails` | projects | live | 1.3k | 31 | Project-matched inbound emails plus outbound emails sent via the app. Distinct from outlook_email_intake (raw sync) and document_metadata (AI relevance). |  |
| `project_notification_groups` | projects | dormant | 0 | 0 | Dormant. No writer or reader found in codebase. |  |
| `project_photos` | projects | live-empty | 5 | 13 | Photo feature — routes wired, never used in production. |  |
| `project_photos_punch_items_links` | projects | live-empty | 0 | 0 | Link table joining project photos to punch items. Feature not yet adopted. |  |
| `project_progress_report_photos` | projects | live | 5 | 7 | Photos attached to progress reports. |  |
| `project_progress_reports` | projects | live | 12 | 12 | Weekly progress reports. Triggered by api/cron/progress-reports and user-triggered PDF email flow. |  |
| `project_resources` | projects | dormant | 0 | 0 | Dormant. No writer or reader found in codebase. |  |
| `project_role_members` | projects | live-empty | 42 | 8 | Intended for role-member assignments. Assignment goes through project_directory_memberships instead. |  |
| `project_roles` | projects | live | 362 | 7 | Project-specific role definitions managed via CRUD routes. |  |
| `project_transmittals` | projects | live-empty | 0 | 6 | Transmittals feature — routes wired, no data yet. |  |
| `project_vendors` | projects | live | 5 | 6 | User-managed vendor associations per project. |  |
| `projects` | projects | live | 116 | 152 | Master project record. Integer id is the FK target for nearly every project-scoped table. Acumatica sync AND manual API can both write — race conditions possib… | id is INTEGER (not UUID). Several columns are mostly null: address, city, state, client, current_phase. project_manager FK→people.id (uuid). team_members is uu… |
| `projects_audit` | projects | live | 18.8k | 0 | Append-only audit trail of changes to the projects table. Written by a Postgres trigger only — no app code touches it directly. | Only useful via direct SQL. No UI. Cannot be queried via normal app routes. |
| `projects_sync` | projects | dormant | 1 | 0 | Leftover staging table from early project sync work. No code references found. |  |
| `user_project_preferences` | projects | live-empty | 0 | 3 | Per-user per-project UI preferences. Service exists, no rows saved. |  |
| `user_project_roles` | projects | dormant | 0 | 0 | Dormant. No writer or reader found in codebase. |  |
| `user_projects` | projects | dormant | 0 | 0 | Dormant. No writer or reader found in codebase. |  |
| `nods_page` | support | live-empty | 6 | 0 | Page registry for knowledge base navigation. Empty but code references exist. |  |
| `nods_page_section` | support | dormant | 0 | 0 | Dormant knowledge base page sections. No code references. |  |
| `support_article_chunks` | support | live | 5.2k | 3 | Knowledge base embeddings for semantic search. 5,219 rows. |  |
| `support_articles` | support | live | 2.3k | 8 | In-app knowledge base articles. 2,205 rows. |  |
| `admin_feedback_comments` | workflow | dormant | 32 | 6 | Dormant admin feedback comments. |  |
| `admin_feedback_items` | workflow | live | 323 | 33 | In-app user feedback inbox. 291 rows. Managed at /api/admin/feedback/*. |  |
| `collaboration_comments` | workflow | dormant | 16 | 3 | Dormant collaboration comments. |  |
| `collaboration_notifications` | workflow | dormant | 0 | 9 | Dormant collaboration notifications. |  |
| `daily_log_equipment` | workflow | dormant | 0 | 5 | Dormant daily log equipment entries. |  |
| `daily_log_manpower` | workflow | dormant | 1 | 7 | Dormant daily log manpower entries. |  |
| `daily_log_notes` | workflow | dormant | 0 | 7 | Dormant daily log notes. |  |
| `daily_log_weather` | workflow | live-empty | 2 | 4 | Per-observation weather entries (sky, temperature, precipitation, wind) attached to a daily_log. Added by the daily-log expansion migration (20260521020000). |  |
| `daily_logs` | workflow | live-empty | 4 | 14 | Daily log records for project field reporting. Feature shipped, no data. |  |
| `discrepancies` | workflow | dormant | 0 | 0 | Dormant discrepancy tracking. |  |
| `execution_handoffs` | workflow | dormant | 1 | 2 | Dormant execution handoff records. |  |
| `feature_request_events` | workflow | dormant | 10 | 2 | Dormant feature request events. |  |
| `feature_request_linear_events` | workflow | dormant | 3 | 2 | Dormant Linear integration events for feature requests. |  |
| `feature_request_linear_sub_issues` | workflow | dormant | 3 | 4 | Dormant Linear sub-issue tracking for feature requests. |  |
| `feature_requests` | workflow | live | 6 | 12 | Product feature requests from users. 1 row. |  |
| `implementation_plans` | workflow | dormant | 2 | 3 | Dormant implementation plans. |  |
| `inspections` | workflow | dormant | 0 | 0 | Dormant inspections feature. |  |
| `issues` | workflow | dormant | 7 | 0 | Dormant issues tracking. |  |
| `manpower_assignments` | workflow | live-empty | 0 | 3 | Role/person assignment rows within an imported manpower plan project. | assignee_person_id is nullable; assignee_name preserves imported names before directory matching. |
| `manpower_plans` | workflow | live-empty | 0 | 5 | Imported manpower planning snapshot header. Marks the active manpower plan and tracks import metadata/warnings. | Only one active plan is allowed by partial unique index. Plan rows own manpower_projects and manpower_assignments via cascade delete. |
| `manpower_projects` | workflow | live-empty | 0 | 2 | Project rows within an imported manpower plan, optionally linked to the canonical projects table. | project_id is nullable; external_code/project_name may be the only source when the imported plan cannot be matched to a project. |
| `observation_comments` | workflow | dormant | 0 | 0 | Dormant observation comments. |  |
| `observation_history` | workflow | dormant | 0 | 0 | Dormant observation change history. |  |
| `observation_photos` | workflow | live-empty | 0 | 0 | Photos for observations. Feature shipped, never adopted. |  |
| `observation_types` | workflow | dormant | 12 | 0 | Dormant observation type definitions. |  |
| `observations` | workflow | dormant | 0 | 0 | Dormant observations (site conditions, safety, quality). Feature wired but no production traffic. |  |
| `observations_project_photos_links` | workflow | dormant | 0 | 0 | Dormant link table between observations and project photos. |  |
| `punch_item_comments` | workflow | dormant | 0 | 0 | Dormant punch item comments. |  |
| `punch_item_template_categories` | workflow | dormant | 0 | 0 | Dormant punch item template categories. |  |
| `punch_item_templates` | workflow | dormant | 0 | 0 | Dormant punch item templates. |  |
| `punch_items` | workflow | live | 6 | 7 | Punch list items. 6 rows. |  |
| `recurring_issue_evidence` | workflow | live | 9 | 0 | Evidence supporting recurring issues. 9 rows. |  |
| `recurring_issue_projects` | workflow | dormant | 0 | 0 | Dormant recurring issue to project links. |  |
| `recurring_issues` | workflow | live | 5 | 0 | Pattern-detection recurring issues. 5 rows. |  |
| `requests` | workflow | dormant | 50 | 0 | Dormant generic requests table. |  |
| `review_comments` | workflow | dormant | 0 | 0 | Dormant review comments. |  |
| `reviews` | workflow | dormant | 0 | 0 | Dormant review records. |  |
| `rfi_assignees` | workflow | dormant | 0 | 0 | Dormant RFI assignee table. |  |
| `rfis` | workflow | live | 20 | 46 | Request for Information records. 11 rows. |  |
| `rfis_submittals_links` | workflow | dormant | 0 | 1 | Dormant RFI to submittal cross-links. |  |
| `roadmap_items` | workflow | live | 10 | 0 | Product roadmap items. 10 rows. Admin-managed at /api/admin/roadmap/*. |  |
| `schedule_deadlines` | workflow | dormant | 0 | 3 | Dormant schedule deadline tracking. |  |
| `schedule_dependencies` | workflow | dormant | 0 | 7 | Dormant schedule task dependencies. |  |
| `schedule_tasks` | workflow | live | 441 | 31 | Project schedule tasks. 241 rows. |  |
| `submittal_analytics_events` | workflow | live-empty | 0 | 0 | Analytics events for submittal workflows. Wired but no data. |  |
| `submittal_distribution_recipients` | workflow | dormant | 2 | 0 | Dormant submittal distribution recipient records. |  |
| `submittal_distributions` | workflow | dormant | 2 | 0 | Dormant submittal distribution records. |  |
| `submittal_documents` | workflow | dormant | 2 | 0 | Dormant submittal document links. |  |
| `submittal_history` | workflow | dormant | 3 | 0 | Dormant submittal change history. |  |
| `submittal_linked_drawings` | workflow | dormant | 0 | 3 | Dormant submittal to drawing links. |  |
| `submittal_notifications` | workflow | dormant | 0 | 0 | Dormant submittal notifications. |  |
| `submittal_packages` | workflow | dormant | 1 | 6 | Dormant submittal packages for grouped submissions. |  |
| `submittal_performance_metrics` | workflow | dormant | 0 | 0 | Dormant submittal performance metrics. |  |
| `submittal_responses` | workflow | dormant | 4 | 4 | Dormant submittal response records. |  |
| `submittal_types` | workflow | dormant | 19 | 2 | Dormant submittal type definitions. |  |
| `submittal_workflow_steps` | workflow | dormant | 4 | 9 | Dormant submittal workflow step definitions. |  |
| `submittal_workflow_templates` | workflow | live | 1 | 4 | Submittal workflow templates. 1 row. |  |
| `submittals` | workflow | live | 33 | 48 | Submittal records. 1 row. |  |
| `task_comments` | workflow | live-empty | 0 | 4 | Comments on tasks. Routes exist, no data. |  |
| `tasks` | workflow | live | 1.1k | 58 | Project action items. 845 rows. Written by task_extraction.py (daily cron) and teams_compiler.py. |  |
| `timeline_events` | workflow | dormant | 1 | 11 | Dormant timeline events. |  |
| `timesheets` | workflow | dormant | 0 | 0 | Dormant timesheet records. |  |
| `todos` | workflow | live-empty | 1 | 2 | SOV-related todos. Referenced in subcontractor-sov-service.ts but empty. |  |
| `transmittal_items` | workflow | dormant | 0 | 0 | Dormant transmittal items. |  |


---

## RAG — AI Database (`fqcvmfqldlewvbsuxdvz`)

14 tables · 10 live · 4 live-empty

| Table | Domain | Status | Rows | Code refs | Purpose | Notes |
|---|---|---|---:|---:|---|---|
| `fireflies_ingestion_jobs` | communications | live | 27.2k | 23 | Pipeline ingest-job stage queue (RAG side). ~27k rows. As of 2026-06-17 written in lockstep with MAIN.fireflies_ingestion_jobs via supabase_helpers.update_inge… | Both copies are now kept in sync — MAIN is no longer stale. Always update both DBs through update_ingestion_job_state(), never one side directly. |
| `document_attribution_candidates` | documents | live | 14.1k | 10 | Low-confidence project attribution review queue. 13,193 rows. Canonical copy. Written when project confidence < 0.70. |  |
| `document_chunks` | documents | live | 144.6k | 41 | THE unified vector store. 109,171 rows. halfvec 3072 embeddings. Written by pipeline/embedder.py. Read by rpc('search_document_chunks'). Canonical source for a… | MAIN.document_chunks (103K rows) is a stale orphan. Always use the RAG copy for reads and writes. |
| `rag_document_metadata` | documents | live | 38.6k | 14 | Embedding-side document catalog. 36,657 rows. app_document_id FK back to MAIN.document_metadata. Only backend pipeline reads this directly. |  |
| `packet_refresh_jobs` | intelligence | live | 1.8k | 19 | Packet refresh job queue and PM packet projection staging handoff. Canonical copy. MAIN copy is stale orphan. Projection payload/status columns were added 2026… |  |
| `source_intelligence_jobs` | intelligence | live | 14.5k | 10 | Compiler job queue. 11,071 rows. Canonical copy. Drained every 10 min by APScheduler in FastAPI. |  |
| `source_signal_candidates` | intelligence | live | 9.2k | 8 | Pre-promotion signal candidates from compiler. 7,527 rows. Canonical copy. |  |
| `ingestion_dead_letter` | pipeline | live-empty | 17 | 0 | Dead letter queue for failed ingestion jobs. Wired but empty. |  |
| `ingestion_jobs` | pipeline | live | 601 | 4 | Generic ingestion audit log. 436 rows. Canonical copy. |  |
| `pipeline_model_usage` | pipeline | live-empty | 41 | 2 | Durable model usage and estimated-cost ledger for source processing, embeddings, daily briefs, Brandon email review, and project intelligence. Used by the dail… | High-volume telemetry belongs in RAG, not PM APP. Cost is an estimate based on configured pricing; provider billing remains authoritative. |
| `rag_pipeline_state` | pipeline | live-empty | 1 | 0 | RAG pipeline state metadata. Wired but empty. |  |
| `source_processing_jobs` | pipeline | live-empty | 708 | 1 | Durable per-source lifecycle ledger tracking source item hashes through assignment, RAG indexing, signal extraction, project intelligence, routing, and termina… | This is the cross-source status contract for Fireflies, Outlook, Teams, OneDrive, SharePoint, and future Acumatica-derived intelligence. Keep high-churn lifecy… |
| `source_sync_health_snapshots` | pipeline | live | 336 | 2 | Source sync health rollup snapshots. 330 rows. Canonical copy. |  |
| `source_sync_runs` | pipeline | live | 16.2k | 12 | Per-sync-run audit log. 3,639 rows. Canonical copy. |  |

