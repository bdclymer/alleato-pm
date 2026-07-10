# Database Tables — Live List

> **AUTO-GENERATED — DO NOT EDIT BY HAND.**
> Regenerate with `npm run db:inventory`. Source: `docs/architecture/tables.yaml` + live Supabase stats.
> Last generated: 2026-07-10T12:58:33.150Z

This file lists every table in both Supabase projects with its current status, row count, code-reference count, one-line purpose, and any gotchas/notes. It is the fastest way to answer "does table X exist, what does it do, is it live, does anything use it?"

Column meanings:
- **Rows** — approximate row count from `pg_class.reltuples` (refreshed each regenerate).
- **Code refs** — count of `.from("table")` / `.table("table")` references in `frontend/src`, `backend/src`, and `alleato-ai`. Does NOT include migration files or one-off scripts. **0 code refs + 0 rows = strong drop candidate.** **0 code refs + N rows = stale data, no readers.**
- **Notes** — uses notesForAi when set, otherwise gotchas, from tables.yaml.

For richer information (full writer/reader file lists, columns, line numbers), open the admin UI at `/database-inventory` or read the source: `docs/architecture/tables.yaml`. For architectural narrative + dated corrections, read `docs/architecture/TABLE-INVENTORY.md`.

**How to update:** edit `docs/architecture/tables.yaml` and run `npm run db:inventory`. This file is regenerated from that source.

---

## MAIN — PM App database (`lgveqfnpkxvzbnnwuled`)

450 tables · 240 live · 154 dormant · 42 live-empty · 8 dead · 2 active · 2 orphan-mirror · 1 legacy · 1 blocked

| Table | Domain | Status | Rows | Code refs | Purpose | Notes |
|---|---|---|---:|---:|---|---|
| `admin_feedback_assistant_threads` | admin | live | 0 | 0 | Links an admin feedback item to an assistant session/thread that works it, tracking status, runtime, relay comments, and last message/error. |  |
| `admin_view_backups` | admin | dormant | 2 | 0 | Dormant admin view backup snapshots. |  |
| `app_crawl_sessions` | admin | live | 7 | 0 | App crawl sessions for admin auditing. |  |
| `app_error_events` | admin | live | 6.9k | 0 | Application error event tracking. |  |
| `app_error_groups` | admin | live | 1.7k | 0 | Error group aggregation. |  |
| `app_page_access_policies` | admin | active | 21 | 0 | Admin-managed route access inventory. Records explicit per-page access levels (route, access_level, permission_module) so page visibility decisions are reviewa… |  |
| `app_page_tag_assignments` | admin | live | 4 | 0 | Join table mapping a route from the app route inventory to a tag in app_page_tags. |  |
| `app_page_tags` | admin | live | 2 | 0 | Admin-managed catalog of page tags applied from the site map. Reusable across pages; drives curated tagged-page views. |  |
| `app_pages` | admin | live | 1 | 0 | App page registry. |  |
| `app_parity_checks` | admin | dormant | 0 | 0 | Dormant parity check results. |  |
| `app_schedule_bulk_operations` | admin | dormant | 0 | 0 | Dormant app schedule bulk operation records. |  |
| `app_schedule_task_hierarchy` | admin | dormant | 0 | 0 | Dormant app schedule task hierarchy records. |  |
| `app_system_actions` | admin | live | 831 | 0 | App system action log. |  |
| `app_system_states` | admin | dormant | 0 | 0 | Dormant app system state snapshots. |  |
| `app_ui_components` | admin | dormant | 0 | 0 | Dormant UI component registry. |  |
| `app_ui_table_columns` | admin | dormant | 0 | 0 | Dormant UI table column definitions. |  |
| `app_ui_tables` | admin | live | 0 | 0 | App UI table registry for admin tooling. |  |
| `database_tables_catalog` | admin | live | 318 | 0 | Schema metadata catalog for admin tooling. Separate from db-inventory.generated.ts. |  |
| `dev_annotations` | admin | live | 498 | 0 | Dev/admin annotation overlay for the UI. |  |
| `dev_panel_comments` | admin | live | 4 | 0 | Dev panel inline comments. |  |
| `parts` | admin | dormant | 7 | 0 | Dormant parts catalog. Purpose unclear. |  |
| `procore_capture_sessions` | admin | live | 6 | 0 | Procore crawler capture sessions. |  |
| `procore_components` | admin | dormant | 864 | 0 | Dormant Procore component tracker. No code references. |  |
| `procore_feature_implementations` | admin | dormant | 0 | 0 | Dormant Procore feature implementation tracker. No code references. |  |
| `procore_features` | admin | live | 138 | 0 | Procore feature parity audit. |  |
| `procore_modules` | admin | live | 24 | 0 | Procore module groupings. |  |
| `procore_pages` | admin | live | 391 | 0 | Procore page registry for parity audit. |  |
| `procore_screenshots` | admin | live | 22 | 0 | Admin crawler screenshots from Procore. |  |
| `procore_tools` | admin | live | 35 | 0 | Admin Procore parity tracker. |  |
| `psr_comments` | admin | live | 1 | 0 | PSR (Project Status Report) comments. |  |
| `qa_page_audit` | admin | live | 148 | 0 | QA audit results for page parity. |  |
| `table_metadata` | admin | live | 19 | 0 | Table-level metadata for admin tooling. |  |
| `test_cases` | admin | live | 812 | 0 | Test plan case definitions. |  |
| `test_results` | admin | live | 307 | 0 | Test run results. |  |
| `test_runs` | admin | live | 51 | 0 | Test run sessions. |  |
| `test_screenshots` | admin | live | 40 | 0 | Test run screenshots. |  |
| `test_suites` | admin | live | 42 | 0 | Test suite groupings. |  |
| `tool_features` | admin | live | 40 | 0 | Feature flags or tool feature definitions. |  |
| `tool_form_fields` | admin | live | 31 | 0 | Form field definitions for tool configuration. |  |
| `agent_learning_usages` | ai | live | 0 | 0 | Session-level usage/outcome log for injected agent learnings. Proves whether a retrieved learning was used and whether later feedback marked that session posit… | Rows are written opportunistically when learnings are injected into assistant context. Treat it as effectiveness telemetry, not the source of the learning itse… |
| `agent_learnings` | ai | live | 168 | 0 | Durable AI failure-pattern and prevention-prompt memory. Read and upserted by agent-learning-service.ts from thumbs-down feedback, eval failures, and admin fee… | PM APP stores the structured learning record only. Embeddings for retrieval are synced separately into the RAG database and must not be written into this table. |
| `ai_agent_runs` | ai | live | 0 | 0 | Run history for configured AI agents. Used by admin AI agent drilldowns and operational review. |  |
| `ai_agents` | ai | live | 20 | 0 | AI agent registry rows for configured assistant agents, approvals, thresholds, and admin-visible agent metadata. |  |
| `ai_feedback_events` | ai | live-empty | 61 | 0 | AI feedback events. Writer wired in feedback-event-service.ts but never triggered. |  |
| `ai_learning_promotions` | ai | live-empty | 2 | 0 | AI learning promotion records. Writer wired but never triggered. |  |
| `ai_memories` | ai | live | 70.1k | 0 | Long-term AI assistant memory store. 27,990 rows. Written by ai-memory-service.ts and workspace artifact promotions. |  |
| `ai_operation_events` | ai | live | 63 | 0 | AI Ops event ledger for scheduled/manual AI workflow events, accepted/rejected event state, and run conversion. |  |
| `ai_retrieval_feedback` | ai | live | 2.2k | 0 | Thumb/score feedback on AI retrieval results. 1,948 rows. Written by feedback-event-service.ts. |  |
| `ai_retrieval_weights` | ai | dormant | 0 | 0 | Dormant AI retrieval weight tuning table. |  |
| `ai_review_feedback` | ai | dormant | 0 | 0 | Dormant AI review feedback. |  |
| `ai_skill_usage_events` | ai | live | 0 | 0 | Telemetry ledger for selected Skill Library context attached to assistant responses. |  |
| `ai_skills` | ai | live | 0 | 0 | Approved Skill Library definitions consumed by assistant surface-specific skill injection. |  |
| `ai_task_feedback` | ai | dormant | 26 | 0 | Dormant AI task feedback. |  |
| `ai_tool_write_audits` | ai | dormant | 178 | 0 | Dormant AI tool write audit log. |  |
| `ai_work_run_artifacts` | ai | live | 80 | 0 | Inspectable generated and delivered artifacts for AI workflow runs, including Executive Daily Brief packets, Teams/email payloads, source-health reports, deliv… |  |
| `ai_work_run_delivery_attempts` | ai | live | 32 | 0 | Per-channel delivery attempt ledger for AI workflow runs, with recipient, status, exact failure code/message, retryability, provider response, and artifact lin… |  |
| `ai_work_run_sources` | ai | live | 190 | 0 | Evidence/source rows linked to AI workflow runs. |  |
| `ai_work_run_steps` | ai | live | 310 | 0 | Step-level execution log for canonical AI workflow runs, including source fetch, tool call, synthesis, artifact persistence, delivery, and verification outcome… |  |
| `ai_work_runs` | ai | live | 64 | 0 | Canonical AI workflow run ledger for Executive Daily Brief and related AI Ops workflows. |  |
| `chat_history` | ai | live | 4.8k | 0 | AI assistant chat message persistence. 2,908 rows. The live chat store. |  |
| `conversations` | ai | live | 544 | 0 | AI assistant chat session metadata. 226 rows. Thread/session header for chat_history. |  |
| `memories` | ai | live | 101 | 0 | Per-session AI conversation summaries with 3072-dim embeddings, used for cross-session recall. Written by conversation-memory.ts (embedAndStoreMemory, memory_t… |  |
| `notes` | ai | dead | 0 | 0 | Dead schema. No code references. Drop candidate. |  |
| `app_roles` | auth | dormant | 0 | 0 | Dormant role definitions. |  |
| `billing_invitations` | auth | dormant | 0 | 0 | Dormant billing/invite infrastructure. |  |
| `organization_members` | auth | dormant | 0 | 0 | Multi-tenant infrastructure scaffolding. Not in use. |  |
| `organizations` | auth | dormant | 0 | 0 | Multi-tenant infrastructure scaffolding. Not in use. |  |
| `user_email_notifications` | auth | live-empty | 1 | 0 | Email notification preferences per user. UI present, no rows. |  |
| `user_profiles` | auth | live | 45 | 0 | Per-user app preferences and is_admin flag. Read by 123+ code paths for permission checks. | CRITICAL BUG: Table appears empty but 123+ code paths read it. Every permission check silently falls back to null/non-admin. Investigate RLS or actual data sta… |
| `user_schedule_notifications` | auth | live-empty | 0 | 0 | Schedule notification preferences per user. UI present, no rows. |  |
| `user_table_views` | auth | live | 0 | 0 | Per-user named presets for UnifiedTablePage — captures visible columns, column order, sort, and filters. Lets PMs/testers save 'Quick view', 'Full detail', etc. | scope_key is project-agnostic (e.g. 'meetings'), not 'meetings-25125'. A view created on project A's meetings page applies on project B's. is_default is enforc… |
| `users_auth` | auth | live | 45 | 0 | Bridge between Supabase auth user (UUID) and people.id. Critical for all permission checks. | CRITICAL BUG: Only 1 row despite ~7 writer paths. Most signups not producing the bridge row. Silent privilege degradation for all users without a row. |
| `change_event_candidates` | change_management | live | 9 | 0 | Candidate change-event records staged from AI/intelligence signals before promotion into formal change management. |  |
| `bot_debug_log` | communications | live | 718 | 0 | Observability log for Teams bot. 336 rows. Written by teams-chat.ts. Not read in app. |  |
| `bot_user_mappings` | communications | live | 5 | 0 | Maps (platform, platform_user_id) to supabase_user_id. Drives Teams and Telegram bot identity. 1 active row. |  |
| `email_attachments` | communications | live | 935 | 0 | In-app attachment store. 419 rows, 391 MB. Covers manual uploads and change-event/contract/commitment/prime-CO/submittal attachments. NOT the same as outlook_e… | Do not confuse with outlook_email_intake_attachments. This stores in-app uploads. |
| `email_events` | communications | dormant | 143 | 0 | Dormant email event log. |  |
| `email_filter_rules` | communications | live | 0 | 0 | User-trained junk-mail rules. Applied by the Outlook sync as Gate 1.5 between the hand-coded noise filter (_is_noise_email) and the heuristic classifier. Each… | Reads in backend/src/services/integrations/microsoft_graph/user_filter_rules.py. Writes from frontend/src/app/api/email-filter-rules/ (admin-only POST/PATCH/DE… |
| `email_messages` | communications | dead | 0 | 0 | Dead schema. No code references. Drop candidate. |  |
| `fireflies_ingestion_jobs` | communications | live | 33.8k | 0 | Pipeline ingest-job stage queue (MAIN side). ~27k rows. As of 2026-06-17 the pipeline DUAL-WRITES stage rows here AND into RAG.fireflies_ingestion_jobs via sup… | Both copies are now kept in sync. Key is COALESCE(document_metadata.fireflies_id, id) (on_conflict=fireflies_id), so generic uploads are keyed by metadata id a… |
| `meeting_preps` | communications | dormant | 0 | 0 | Dormant meeting preparation records. |  |
| `meeting_segments` | communications | live | 30.0k | 0 | Meeting transcript chunks and summary embeddings. 19,527 rows. Written by parser.py, embedder.py. Read by meeting pages and project intelligence. |  |
| `outlook_email_assistant_reviews` | communications | live-empty | 9 | 0 | Human review ledger for Brandon Outlook assistant decisions, draft outcomes, and feedback signals. | Admin/service-role table. It records review outcomes only; raw email source remains outlook_email_intake and project-matched email remains project_emails. |
| `outlook_email_intake` | communications | live | 2.1k | 0 | Raw Outlook email sync. Every email from the Graph sync lands here first. Source for document_metadata (AI-relevant) and project_emails (project-matched). tria… |  |
| `outlook_email_intake_attachments` | communications | live | 1.6k | 0 | Attachments from synced Outlook emails. 627 rows, 355 MB. Written by outlook.py and attachment_promotion.py. |  |
| `outlook_email_skip_audit` | communications | dormant | 126 | 0 | Dormant audit log for skipped Outlook emails. |  |
| `outlook_inbox_rules` | communications | live | 0 | 0 | Gmail/Outlook-style inbox rules for the Outlook Draft Feedback surface. Each rule matches a sender / sender_domain / subject / body / any pattern (contains, eq… | Applied at READ time in frontend/src/app/api/emails/route.ts (the pure matcher is frontend/src/lib/email-assistant/inbox-rules.ts) — NOT in the backend sync. H… |
| `team_chat_channels` | communications | live | 5 | 0 | Teams chat channel registry. 2 rows. |  |
| `team_chat_messages` | communications | live-empty | 6 | 0 | Teams chat messages. Wired but unused. |  |
| `teams_conversation_refs` | communications | live | 2 | 0 | Per-user proactive Teams thread cache. Upserted on every inbound Teams message so the bot can reply in the same thread. |  |
| `teams_link_codes` | communications | live-empty | 7 | 0 | Short-lived link codes for Teams bot↔account linking. Empty = no in-progress flows. |  |
| `telegram_link_codes` | communications | live-empty | 1 | 0 | Short-lived link codes for Telegram bot↔account linking. Empty = no in-progress flows. |  |
| `companies` | directory | live | 776 | 0 | Master company directory — vendors, clients, subs. is_vendor flag drives Acumatica sync. FK target for vendor-related forms. | FK-validation gate: vendor dropdown sources from vendors view but FK targets companies table. ~50 read sites. |
| `company_context` | directory | live-empty | 0 | 0 | Admin singleton doc for company-level AI context. Not yet populated. |  |
| `people` | directory | live | 966 | 0 | Master person directory. UUID id. Bridged to auth via users_auth.auth_user_id. |  |
| `people_junk_backup` | directory | dormant | 887 | 0 | Backup of orphaned auto-created people/contact rows deleted during the auto-people-contacts trigger retirement (2026-06-30). Retained for recovery only. |  |
| `prospects` | directory | live-empty | 0 | 0 | Prospects directory page exists and reads/writes. Never used in production. |  |
| `vendor_contacts` | directory | live-empty | 2 | 0 | UI tries to read vendor contacts. No writer found in codebase. |  |
| `change_order_documents` | documents | live | 0 | 0 | Pattern C junction: change orders ↔ document_metadata. TODO: expand metadata, identify writers/readers. |  |
| `commitment_change_order_documents` | documents | live | 0 | 0 | Pattern C junction: commitment change orders ↔ document_metadata. Replaces cco_attachments writers. |  |
| `company_documents` | documents | live | 0 | 0 | Pattern C junction: companies ↔ document_metadata. TODO: expand metadata, identify writers/readers. |  |
| `daily_log_photos` | documents | live | 0 | 0 | Photo metadata written by the Site Scribe daily-log flow. Stores uploaded image records plus pairing back to the generated daily log and note context. | This is not the old project photos feature. The active writer is /api/projects/[projectId]/daily-log/site-scribe, which replaces rows for a daily log on regene… |
| `daily_logs_project_photos_links` | documents | live-empty | 0 | 0 | Link table between daily logs and project photos. Feature shipped, never adopted. |  |
| `document_attribution_candidates` | documents | live | 13.2k | 0 | Low-confidence project attribution review queue. 13,233 rows. Written by compiler when project confidence < 0.70. No review UI yet. | Known gap: no review UI exists. Items accumulate without resolution. |
| `document_group_access` | documents | dormant | 0 | 0 | Dormant per-group document access control. |  |
| `document_insights` | documents | blocked | 0 | 0 | Dormant document insights table, but retained because the actionable_insights view depends on it. Do not drop until the view is retired or migrated. |  |
| `document_metadata` | documents | live | 43.0k | 0 | Primary document catalog. 36,511 rows. Dual-written with RAG.rag_document_metadata on every ingestion. Full business metadata including project_id, source_type… | Always written alongside rag_document_metadata via upsert_document_metadata() — never write to one without the other. document_type for onedrive/sharepoint/mic… |
| `document_page_intelligence` | documents | live | 1.2k | 0 | Per-page AI vision extraction for drawings and PDFs. Written by backend OCR/vision processing and read by drawing intelligence, submittal required-package dete… | Keyed by document_metadata_id + page_number. Stores AI summaries plus raw extraction; service role writes, authenticated users can read. Do not replace with do… |
| `document_rows` | documents | live | 13.1k | 0 | Structured document rows loaded by ETL outside the repo. 12,354 rows. Read by AI tools/structured-queries.ts. |  |
| `document_type_taxonomy` | documents | live | 42 | 0 | Lookup table for document_metadata.document_type values (Pattern C). TODO: expand metadata, identify writers/readers. |  |
| `document_user_access` | documents | dormant | 0 | 0 | Dormant per-user document access control. |  |
| `drawing_areas` | documents | live | 1 | 0 | Drawing area definitions. 1 row. Admin-only. |  |
| `drawing_change_history` | documents | live | 13 | 0 | Change history for drawing publish/obsolete actions. 11 rows. |  |
| `drawing_downloads` | documents | live | 1.5k | 0 | Download audit log for drawings. 1,400 rows. |  |
| `drawing_markup_pins` | documents | live | 17 | 0 | Markup pins on drawings. 11 rows. |  |
| `drawing_related_items` | documents | dormant | 0 | 0 | Dormant drawing related items. |  |
| `drawing_revisions` | documents | live | 246 | 0 | Drawing revision history. 44 rows. |  |
| `drawing_sets` | documents | live | 24 | 0 | Drawing set groupings. 14 rows. |  |
| `drawing_sketches` | documents | dormant | 1 | 0 | Dormant drawing sketches. |  |
| `drawings` | documents | live | 195 | 0 | Drawing records. 44 rows. Managed by DrawingService.ts and drawing API routes. Storage bucket: drawings. |  |
| `drawings_rfis_links` | documents | dormant | 0 | 0 | Dormant drawing to RFI links. |  |
| `files` | documents | live | 6 | 0 | Project-setup wizard file index. 2 rows. Parallel to legacy documents table. Storage buckets: drawings, specifications, schedules. |  |
| `owner_invoice_documents` | documents | live | 0 | 0 | Pattern C junction: owner invoices ↔ document_metadata. TODO: expand metadata, identify writers/readers. |  |
| `photo_albums` | documents | live-empty | 1 | 0 | Photo albums. Feature shipped, never adopted. |  |
| `photo_links` | documents | live-empty | 0 | 0 | Photo links. Feature shipped, never adopted. |  |
| `photos` | documents | live-empty | 0 | 0 | Photo feature. Routes wired, zero data. Feature shipped but never adopted. |  |
| `prime_contract_change_order_documents` | documents | live | 0 | 0 | Pattern C junction: prime contract change orders ↔ document_metadata. Replaces pcco_attachments writers. |  |
| `prime_contract_documents` | documents | live | 3 | 0 | Pattern C junction: prime contracts ↔ document_metadata. TODO: expand metadata, identify writers/readers. |  |
| `prime_contract_pco_documents` | documents | live | 0 | 0 | Pattern C junction: prime contract PCOs ↔ document_metadata. Replaces prime_contract_pco_attachments readers. |  |
| `project_documents_v2` | documents | live | 14 | 0 | Successor to project_documents (Pattern C migration). Project ↔ document_metadata. TODO: expand metadata, identify writers/readers. |  |
| `purchase_order_documents` | documents | live | 3 | 0 | Pattern C junction: purchase orders ↔ document_metadata. TODO: expand metadata, identify writers/readers. |  |
| `rfi_documents` | documents | live | 0 | 0 | Pattern C junction: RFIs ↔ document_metadata. TODO: expand metadata, identify writers/readers. |  |
| `sop_backlog` | documents | live | 1 | 0 | SAIS structured backlog for missing or lifecycle-managed accounting/finance SOP requirements. Placeholder records exist before a real SOP file is uploaded, the… | Do not create fake document_metadata rows for missing SOPs. Placeholder backlog rows are requirements, not uploaded files; AI retrieval must distinguish them f… |
| `spec_drawing_links` | documents | live-empty | 0 | 0 | Junction between specification sections and drawings. Used by document-intelligence tooling to answer which drawings cover a spec section and which submittal p… | Links specifications.id to drawings.id with link_method and confidence. Even when empty, the table is part of the finalized spec/drawing/submittal coverage mod… |
| `specification_area_sections` | documents | dormant | 0 | 0 | Dormant specification area sections. |  |
| `specification_areas` | documents | dormant | 0 | 0 | Dormant specification areas. |  |
| `specification_divisions` | documents | dormant | 0 | 0 | Dormant specification divisions. |  |
| `specification_section_revisions` | documents | live | 0 | 0 | Specification section revisions. 1 row. |  |
| `specification_sections` | documents | dormant | 0 | 0 | Dormant specification sections. |  |
| `specification_subscribers` | documents | dormant | 0 | 0 | Dormant specification subscribers. |  |
| `specifications` | documents | live-empty | 1 | 0 | Specification records. Feature wired, no production data. |  |
| `subcontract_documents` | documents | live | 17 | 0 | Pattern C junction: subcontracts ↔ document_metadata. TODO: expand metadata, identify writers/readers. |  |
| `subcontractor_invoice_documents` | documents | live | 0 | 0 | Pattern C junction: subcontractor invoices ↔ document_metadata. Replaces subcontractor side of invoice_attachments. |  |
| `submittal_doc_links` | documents | live | 10 | 0 | Pattern C junction: submittals ↔ document_metadata. TODO: expand metadata, identify writers/readers. |  |
| `estimate_gc_templates` | estimating | live | 1 | 0 | GC template definitions for the estimating workflow. TODO: expand metadata, identify writers/readers. |  |
| `estimate_sublist_bid_items` | estimating | live | 1 | 0 | Line items in subcontractor bid lists during estimating. TODO: expand metadata, identify writers/readers. |  |
| `estimate_sublist_call_logs` | estimating | live | 3 | 0 | Call logs against estimate sublists. TODO: expand metadata, identify writers/readers. |  |
| `estimate_sublist_scope_items` | estimating | live | 34 | 0 | Scope items attached to estimate sublists. TODO: expand metadata, identify writers/readers. |  |
| `acumatica_accounts` | financial | live | 154 | 0 | Chart of accounts mirror from Acumatica. 154 rows. Frontend-only sync (mirror-sync.ts). No app reads. |  |
| `acumatica_ap_bill_lines` | financial | live | 4.6k | 0 | Line items for acumatica_ap_bills. 4,016 rows. Delete+reinsert per sync cycle. | Delete+reinsert on every sync. Do not reference rows by id across sync cycles. |
| `acumatica_ap_bills` | financial | live | 3.6k | 0 | Acumatica AP bills mirror. 6,399 rows. Source for direct_costs projection. Updated 2×/day by Render cron. |  |
| `acumatica_ar_invoice_lines` | financial | live | 2.9k | 0 | Line items for acumatica_ar_invoices. 1,922 rows. |  |
| `acumatica_ar_invoices` | financial | live | 513 | 0 | Acumatica AR invoices mirror. 464 rows. Read by accounting invoices, dashboard, WIP, global invoices API. |  |
| `acumatica_change_orders` | financial | live | 2.4k | 0 | Acumatica change orders mirror. 4,069 rows. Projects into both prime_contract_change_orders and contract_change_orders via status mapping. |  |
| `acumatica_checks` | financial | live | 2.8k | 0 | Acumatica checks mirror. 2,775 rows. Projects into commitment_payments. Also flips paid flag on subcontractor_invoices when matching check found. |  |
| `acumatica_customers` | financial | live | 62 | 0 | Acumatica customers mirror. 58 rows. Frontend-only sync. Used to backfill customer_name on acumatica_ar_invoices. |  |
| `acumatica_outbound_audit_logs` | financial | live-empty | 0 | 0 | Audit log for outbound Acumatica exports. Writer exists but never triggered in production. |  |
| `acumatica_payment_applications` | financial | live | 1.7k | 0 | Join table for payment applications. 183 rows. | CRITICAL: No writer found in current code. Schema defined in migration 20260413000001. Rows from historical/manual load. If invoice-paid logic depends on this… |
| `acumatica_payments` | financial | live | 414 | 0 | Acumatica payments mirror. 368 rows. Read by accounting/payments and accounting/invoices paid logic. |  |
| `acumatica_project_budgets` | financial | live | 6.9k | 0 | Acumatica project budgets mirror. 6,172 rows. Read by accounting/wip route only. |  |
| `acumatica_project_tasks` | financial | live | 108 | 0 | Acumatica project tasks mirror. 99 rows. Frontend-only sync. Used for accounting cross-references. |  |
| `acumatica_projects` | financial | live | 87 | 0 | Acumatica projects mirror. 87 rows. Also upserts matching rows in the projects table on sync. |  |
| `acumatica_purchase_orders` | financial | live | 125 | 0 | Acumatica purchase orders mirror. 204 rows. Projects into purchase_orders. |  |
| `acumatica_subcontracts` | financial | live | 397 | 0 | Acumatica subcontracts mirror. 718 rows. Projects into subcontracts and subcontract_sov_items. |  |
| `acumatica_sync_runs` | financial | live-empty | 1.3k | 0 | Audit log of Acumatica sync runs. Writer exists at acumatica_sync.py:408 but no rows recorded. | CRITICAL: Empty despite writer. Likely exception path or ACUMATICA_FINANCIAL_SYNC_ENABLED env flag is off. Investigate _record_sync_run. |
| `acumatica_sync_state` | financial | live | 31 | 0 | Cursor state for Acumatica sync. 25 rows. Read before each sync to determine where to resume. |  |
| `billing_periods` | financial | dormant | 12 | 0 | Dormant billing periods. |  |
| `budget_changes` | financial | dead | 1 | 0 | Older budget change mechanism predating budget_modifications. 1 row. Effectively dead. |  |
| `budget_forecast_line_items` | financial | dormant | 0 | 0 | Dormant budget forecasting. No active writers. |  |
| `budget_line_forecasts` | financial | dormant | 0 | 0 | Dormant budget line forecasts. |  |
| `budget_line_history` | financial | live | 2.3k | 0 | Immutable audit history for budget_lines. 1,696 rows. Written by Postgres trigger only — never by app code. |  |
| `budget_line_item_history` | financial | dormant | 0 | 0 | Dormant. Likely superseded by budget_line_history (trigger-driven). |  |
| `budget_lines` | financial | live | 729 | 0 | Per-project budget line items. Core operational budget table. 564 rows. Every budget change is mirrored to budget_line_history via Postgres trigger. | budget_code_id FK→budget_lines but dropdown sources from project_cost_codes (FORM-FK-VALIDATION-GATE). All history via trigger not app code. |
| `budget_mod_lines` | financial | live | 119 | 0 | Line-level deltas for budget modifications. 32 rows. The live table (not budget_modification_lines which is empty). | Name collision: budget_modification_lines (with full 'ation') is the empty dead twin. budget_mod_lines is live. |
| `budget_modification_lines` | financial | dead | 0 | 0 | Dead twin of budget_mod_lines. Empty. Drop candidate. |  |
| `budget_modifications` | financial | live | 41 | 0 | Budget revision documents. 22 rows. Formal modification records with associated line deltas in budget_mod_lines. |  |
| `budget_snapshots` | financial | dormant | 4 | 0 | Dormant budget snapshot mechanism. |  |
| `budget_view_columns` | financial | live | 312 | 0 | Column definitions for budget view layouts. 312 rows. |  |
| `budget_views` | financial | live | 26 | 0 | UI column-layout state for budget views. 63 rows. |  |
| `change_event_approvals` | financial | dormant | 0 | 0 | Dormant change event approval workflow. |  |
| `change_event_documents` | financial | live | 6 | 0 | Pattern C junction between change events and document_metadata. Created during attachment backfill; 2 rows. |  |
| `change_event_history` | financial | live | 100 | 0 | Hand-rolled audit log for change events. 43 rows. Written at multiple change-event API call sites. |  |
| `change_event_line_items` | financial | live | 134 | 0 | Line-item detail per change event. 54 rows. |  |
| `change_event_pco_links` | financial | dormant | 49 | 0 | Dormant change event to PCO links. |  |
| `change_event_project_settings` | financial | live | 0 | 0 | Per-project change-event configuration flags (budget-code sync, ROM columns, line-item autopopulation, attachment copy, PCO/CO behavior). |  |
| `change_event_related_items` | financial | dormant | 4 | 0 | Dormant change event related items. |  |
| `change_event_rfq_responses` | financial | live | 1 | 0 | Vendor responses to change event RFQs. 1 row. |  |
| `change_event_rfqs` | financial | live | 3 | 0 | RFQs sent from a change event to vendors. 6 rows. |  |
| `change_events` | financial | live | 75 | 0 | Project-level change events. 77 rows. Neutral upstream object that can generate RFQs and link to PCOs/CCOs. |  |
| `change_events_documents_links` | financial | dormant | 0 | 0 | Dormant change event to document links. |  |
| `change_orders` | financial | dead | 5 | 0 | Generic change order table. Dead — all CO data lives in contract_change_orders and prime_contract_change_orders. |  |
| `change_workflow_comments` | financial | dormant | 0 | 0 | Dormant change workflow comments. |  |
| `change_workflow_notifications` | financial | dormant | 0 | 0 | Dormant change workflow notifications. |  |
| `commitment_audit_log` | financial | live | 1.8k | 0 | Postgres trigger-driven audit covering subcontracts and purchase_orders mutations. 852 rows. |  |
| `commitment_change_order_lines` | financial | dormant | 8 | 0 | Commitment change order line items. Not clearly mapped in inventory. |  |
| `commitment_payments` | financial | live | 4.1k | 0 | Mirror of relevant acumatica_checks. 2,775 rows. Only backend Python sync writes. |  |
| `commitment_pcos` | financial | dormant | 30 | 0 | Dormant commitment PCO tracking. |  |
| `commitment_related_items` | financial | dormant | 0 | 0 | Dormant commitment related items. |  |
| `contract_billing_periods` | financial | dormant | 5 | 0 | Dormant contract billing period definitions. |  |
| `contract_change_orders` | financial | live | 172 | 0 | Commitment-side change orders (subcontracts/POs). 140 rows. Despite the name, these are NOT prime CCOs. | Misleading name: stores commitment-side CCOs (subcontracts/POs), NOT prime contract change orders. Routes at api/commitments/[commitmentId]/change-orders/*. |
| `contract_documents` | financial | live | 0 | 0 | Contract-level documents. 1 row. Effectively unused. |  |
| `contract_line_items` | financial | live | 312 | 0 | Line items for contract_change_orders. 140 rows. |  |
| `contract_payments` | financial | dormant | 0 | 0 | Dormant contract payments. Not the same as prime_contract_payments. |  |
| `contract_snapshots` | financial | dormant | 0 | 0 | Dormant contract snapshots. |  |
| `contract_views` | financial | dormant | 0 | 0 | Dormant contract view state. |  |
| `cost_code_division_updates_audit` | financial | dormant | 11 | 0 | Dormant audit table for cost code division changes. |  |
| `cost_code_divisions` | financial | live | 40 | 0 | Cost code division groupings. 40 rows. |  |
| `cost_code_types` | financial | live | 9 | 0 | Cost code type classifications. 6 rows. |  |
| `cost_codes` | financial | live | 354 | 0 | Global master cost code table. 310 rows. Referenced by budget lines and project budget codes. |  |
| `cost_factors` | financial | dormant | 8 | 0 | Dormant cost factor table. |  |
| `cost_forecasts` | financial | dormant | 4 | 0 | Dormant cost forecast table. |  |
| `direct_cost_line_items` | financial | live | 9.5k | 0 | Line items for direct_costs. 8,436 rows. Delete+reinsert per sync cycle. | Delete+reinsert on every sync. Do not reference rows by id across sync cycles. |
| `direct_costs` | financial | live | 6.9k | 0 | Domain projection of acumatica_ap_bills. 6,555 rows. Project-attributed AP charges. acumatica_document_key is the upsert key — do not edit manually. |  |
| `erp_sync_log` | financial | live | 75 | 0 | Frontend-initiated Acumatica sync audit log. 51 rows. Written by the frontend cron route, not the backend Python sync. |  |
| `estimate_allowances` | financial | dormant | 0 | 0 | Dormant estimate allowances. |  |
| `estimate_alternates` | financial | dormant | 0 | 0 | Dormant estimate alternates. |  |
| `estimate_detail_items` | financial | live | 5.2k | 0 | Sub-line drill-downs for estimate line items. 615 rows. |  |
| `estimate_gc_items` | financial | live | 2.1k | 0 | General conditions items for estimates. 281 rows. |  |
| `estimate_line_items` | financial | live | 594 | 0 | Main cost-of-work breakdown for estimates. 495 rows. |  |
| `estimate_sublist_subs` | financial | dormant | 10 | 0 | Dormant estimate sublist substitutions. |  |
| `estimates` | financial | live | 35 | 0 | Estimate header records. 5 rows. Bridge from estimates to budget and contract line items via estimate-import. |  |
| `finance_spend_classification_rules` | financial | live | 11 | 0 | SAIS classification layer for accounting/finance overhead spend. Read with acumatica_ap_bills to produce trailing monthly spend by category/vendor while exclud… | Raw Acumatica AP bills remain sync-owned. Broad keyword rules such as PAYROLL, TAX, CPA, LEGAL, and COMPLIANCE are disabled by default until reviewed so spend… |
| `financial_contracts` | financial | dormant | 2 | 0 | Dormant financial contracts. |  |
| `forecasting` | financial | dormant | 0 | 0 | Dormant forecasting header table. |  |
| `forecasting_curves` | financial | dormant | 2 | 0 | Dormant forecasting curves. |  |
| `invoice_payments` | financial | dormant | 1 | 0 | Dormant invoice payments. |  |
| `invoicing_settings` | financial | dormant | 1 | 0 | Dormant invoicing settings. |  |
| `owner_invoice_line_items` | financial | live | 1.7k | 0 | Line items for owner_invoices. 604 rows. Average ~20 lines per invoice. |  |
| `owner_invoices` | financial | live | 104 | 0 | Invoices sent to the owner (pay applications outbound). 29 rows. Full state machine UI. Line-item granularity is in active use. |  |
| `payment_application_line_items` | financial | dormant | 5 | 0 | Dormant payment application line items. |  |
| `payment_transactions` | financial | dormant | 0 | 0 | Dormant payment transactions. |  |
| `pcco_line_items` | financial | dormant | 3 | 0 | Dormant PCCO line items. |  |
| `pco_change_events` | financial | dormant | 0 | 0 | Dormant PCO to change event links. |  |
| `pco_line_items` | financial | dormant | 111 | 0 | Dormant PCO line items. |  |
| `pco_versions` | financial | dormant | 0 | 0 | Dormant PCO version history. |  |
| `potential_change_order_line_items` | financial | active | 0 | 0 | Line items for numeric potential_change_orders (pco_id bigint). line_amount is generated (quantity * unit_cost). Written atomically via create_pco_with_lines /… |  |
| `potential_change_orders` | financial | dormant | 1 | 0 | Numeric (bigint) potential change orders that group change events (via pco_change_events) and convert to COs. Header written atomically by create_pco_with_line… |  |
| `prime_contract_change_order_related_items` | financial | live | 1 | 0 | Related item links for prime contract change orders. 1 row. |  |
| `prime_contract_change_orders` | financial | live | 158 | 0 | Owner-side change orders. 142 rows. Projected from acumatica_change_orders via status mapping. |  |
| `prime_contract_payment_applications` | financial | dormant | 4 | 0 | Dormant prime contract pay applications. |  |
| `prime_contract_payments` | financial | live | 54 | 0 | Owner payment records. 26 rows. Most owner payments tracked via acumatica_payments + invoice join instead. |  |
| `prime_contract_pcos` | financial | dormant | 10 | 0 | Dormant prime contract PCO table. |  |
| `prime_contract_project_settings` | financial | live | 2 | 0 | Per-project prime contract settings. 1 row. |  |
| `prime_contract_sovs` | financial | dormant | 6 | 0 | Dormant prime contract schedule of values. |  |
| `prime_contracts` | financial | live | 22 | 0 | Owner contracts. 21 rows. Routes live under /api/projects/[projectId]/contracts (NOT /prime-contracts). | API routes are at /contracts not /prime-contracts. Bootstrap creates one only when project has owner info. |
| `project_budget_codes` | financial | live | 4.0k | 0 | Per-project budget codes linking cost codes to budget lines. The dropdown source for budget code selection in forms. | FK-validation gate: budget_code_id FK→budget_lines but dropdown sources from project_cost_codes. Always resolve the ID mismatch in both read and write paths. |
| `project_budget_settings` | financial | live-empty | 1 | 0 | Per-project budget UI configuration. Schema exists, API routes exist, but no projects have settings saved yet. |  |
| `purchase_order_sov_items` | financial | live | 378 | 0 | SOV items for purchase orders. 198 rows. |  |
| `purchase_orders` | financial | live | 187 | 0 | Purchase order records. 129 rows. Domain projection from acumatica_purchase_orders. Audited via Postgres trigger to commitment_audit_log. |  |
| `qto_items` | financial | dormant | 0 | 0 | Dormant quantity takeoff items. |  |
| `qtos` | financial | dormant | 0 | 0 | Dormant quantity takeoff headers. |  |
| `reconciliation_findings` | financial | live-empty | 3.4k | 0 | Current and historical reconciliation findings between Job Planner project records and Acumatica mirrors. | fingerprint is the primary key. review_status tracks triage; is_active distinguishes current findings from resolved/stale findings. |
| `reconciliation_runs` | financial | live-empty | 11 | 0 | Job Planner to Acumatica reconciliation run ledger. Tracks scan status, finding counts, and dollars at risk. | RLS is enabled with service-role access only. Treat as operational triage state, not user-authored financial source data. |
| `schedule_of_values` | financial | dead | 0 | 0 | SOV table. Referenced as a reader in AI financial tools but NEVER written. Dead reads. |  |
| `sov_line_items` | financial | dead | 0 | 0 | SOV line items. Same as schedule_of_values — never written. |  |
| `sub_jobs` | financial | dormant | 0 | 0 | Dormant sub-job tracking. |  |
| `subcontract_sov_items` | financial | live | 1.7k | 0 | Schedule of Values line items for subcontracts. 964 rows. Source for subcontractor invoicing. | Name collision: subcontractor_sov_items (2 rows) is the near-dead sibling. This is the live table. |
| `subcontractor_invoice_audit_log` | financial | live | 2.6k | 0 | App-level audit log for subcontractor invoice state changes. 2,444 rows. Hand-rolled inserts scattered across invoice routes — no DB trigger backstop. | No DB trigger. Missing inserts in some code paths mean silent audit gaps. |
| `subcontractor_invoice_emails` | financial | dormant | 1 | 0 | Dormant subcontractor invoice email log. |  |
| `subcontractor_invoice_line_items` | financial | live | 3.3k | 0 | Line items for subcontractor_invoices. Only 12 rows — legacy invoices are header-only. |  |
| `subcontractor_invoice_related_items` | financial | dormant | 0 | 0 | Dormant subcontractor invoice related items. |  |
| `subcontractor_invoices` | financial | live | 2.6k | 0 | Subcontractor pay applications. 2,433 rows. Full state machine UI. Acumatica sync flips paid flag when matching check found. | Only 12 line items for 2,433 invoices — legacy invoices imported header-only. Line-item granularity not guaranteed for historical data. |
| `subcontractor_sov_items` | financial | dead | 9 | 0 | Near-dead sibling of subcontract_sov_items. 2 rows. Used for subcontractor-portal submissions. Verify usage before dropping. |  |
| `subcontractor_sov_submissions` | financial | dormant | 58 | 0 | Subcontractor SOV submission tracking. Dormant. |  |
| `subcontracts` | financial | live | 579 | 0 | Subcontract records. 398 rows. Written by Acumatica sync and UI routes. Audited via Postgres trigger to commitment_audit_log. |  |
| `vertical_markup` | financial | dormant | 34 | 0 | Dormant vertical markup table. |  |
| `asrs_blocks` | fm-asrs | live | 476 | 0 | ASRS blocks. Lightly referenced. |  |
| `asrs_configurations` | fm-asrs | dormant | 4 | 0 | Dormant ASRS configurations. No code references. |  |
| `asrs_decision_matrix` | fm-asrs | dormant | 0 | 0 | Dormant ASRS decision matrix. No code references. |  |
| `asrs_logic_cards` | fm-asrs | dormant | 0 | 0 | Dormant ASRS logic cards. No code references. |  |
| `asrs_protection_rules` | fm-asrs | dormant | 0 | 0 | Dormant ASRS protection rules. No code references. |  |
| `asrs_sections` | fm-asrs | live | 70 | 0 | ASRS section definitions. Lightly referenced. |  |
| `block_embeddings` | fm-asrs | dormant | 0 | 0 | Dormant block embeddings. No code references. |  |
| `design_recommendations` | fm-asrs | live | 0 | 0 | Design recommendations. Lightly referenced. |  |
| `design_violations` | fm-asrs | live | 3 | 0 | Design violations. Lightly referenced. |  |
| `fm_blocks` | fm-asrs | dormant | 629 | 0 | Dormant FM blocks. No code references. |  |
| `fm_cost_factors` | fm-asrs | dormant | 7 | 0 | Dormant FM cost factors. No code references. |  |
| `fm_documents` | fm-asrs | dormant | 1 | 0 | Dormant FM documents. No code references. |  |
| `fm_form_submissions` | fm-asrs | live | 19 | 0 | FM Global form submissions. Lightly referenced. |  |
| `fm_global_figures` | fm-asrs | live | 31 | 0 | FM Global figures/charts. Lightly referenced. |  |
| `fm_global_tables` | fm-asrs | live | 46 | 0 | FM Global lookup tables for sprinkler design. Lightly referenced. |  |
| `fm_optimization_rules` | fm-asrs | dormant | 3 | 0 | Dormant FM optimization rules. |  |
| `fm_optimization_suggestions` | fm-asrs | dormant | 0 | 0 | Dormant FM optimization suggestions. |  |
| `fm_sections` | fm-asrs | live | 66 | 0 | FM Global section definitions. Lightly referenced. |  |
| `fm_sprinkler_configs` | fm-asrs | live | 0 | 0 | FM Global sprinkler configurations. Lightly referenced. |  |
| `fm_table_vectors` | fm-asrs | dormant | 45 | 0 | Dormant FM table vectors. No code references. |  |
| `fm_text_chunks` | fm-asrs | dormant | 43 | 0 | Dormant FM text chunks. No code references. |  |
| `optimization_rules` | fm-asrs | dormant | 0 | 0 | Dormant generic optimization rules. |  |
| `__drizzle_migrations` | infrastructure | live | 1 | 0 | Drizzle ORM migration ledger. Tracks applied migrations. |  |
| `_prisma_migrations` | infrastructure | legacy | 1 | 0 | Prisma migration ledger from prior ORM. Kept for historical record; Supabase migrations are authoritative. |  |
| `db_audit_log` | infrastructure | live | 103.8k | 0 | Central audit log for all key business entity tables. Populated by fn_audit_log_generic trigger (trg_audit_log) on 37 tables covering projects, financial, cont… | Query this table to answer 'who changed X and when' questions. Filter by table_name + record_id for per-record history. changed_by is null for service-role/cro… |
| `briefing_runs` | intelligence | dormant | 0 | 0 | Dormant briefing run tracker. |  |
| `daily_corpus_syntheses` | intelligence | live | 2 | 0 | Canonical previous-day full-corpus synthesis artifact for executive briefing and downstream intelligence consumers. |  |
| `daily_recaps` | intelligence | live | 104 | 0 | Executive briefing packet store. Executive Daily Brief generation now writes canonical AI Ops run linkage through ai_work_run_id. | Legacy mechanism, but still actively generated for Executive Daily Brief. ai_work_run_id is the canonical generation run pointer; ai_work_runs.daily_recap_id r… |
| `executive_briefing_follow_ups` | intelligence | live | 978 | 0 | Follow-up actions from executive briefings. 108 rows. |  |
| `initiative_cards` | intelligence | live | 10 | 0 | Strategic initiative cards. 8 rows. Separate from insight_cards. |  |
| `insight_card_evidence` | intelligence | live | 27.6k | 0 | Links insight cards to their source documents. 6,185 rows. FK to document_metadata/source_documents. |  |
| `insight_card_targets` | intelligence | live | 16.7k | 0 | Links insight cards to intelligence targets with is_primary flag. 5,990 rows. |  |
| `insight_cards` | intelligence | live | 17.9k | 0 | Durable extracted signals from the intelligence pipeline. 5,991 rows. Created by promote_signal_candidate. Can be acknowledged, snoozed, or manually created. |  |
| `intelligence_packet_cards` | intelligence | live | 4.3k | 0 | Packet to insight_card join table with section and rank. 2,230 rows. Wiped and re-inserted on every packet refresh. | Wiped and re-inserted on every refresh. Do not reference rows by id across refresh cycles. |
| `intelligence_packets` | intelligence | live | 136 | 0 | Rendered briefing per intelligence target — latest snapshot. 83 rows. Upserted by compile_current_packet on every refresh. |  |
| `intelligence_reviews` | intelligence | live | 4 | 0 | Human review queue for packet/card feedback. Low row count today, but active insert/read paths make it the durable app-side review ledger. | Do not let this become a silent junk drawer for AI corrections. Keep ownership tight around packet/card feedback until a broader review workflow exists. |
| `intelligence_targets` | intelligence | live | 112 | 0 | Registry of compile-able intelligence targets (client_project, etc). 77 rows. status='active' gates packet refresh. Source for periodic refresh cron. |  |
| `project_attribution_rules` | intelligence | live | 573 | 0 | Heuristic rules for matching emails/documents to projects. 514 rows. Auto-learned from confirmed attributions. |  |
| `project_briefings` | intelligence | dormant | 0 | 0 | Dormant. NOT the same as intelligence_packets. No writer found. | Do not confuse with intelligence_packets, which is the live briefing store. |
| `initiatives` | marketing | dormant | 3 | 0 | Dormant marketing initiatives table. Not the same as initiative_cards. |  |
| `marketing_content_assets` | marketing | dormant | 6 | 0 | Dormant marketing content assets. |  |
| `marketing_content_calendar_items` | marketing | dormant | 6 | 0 | Dormant marketing content calendar. |  |
| `marketing_intelligence_items` | marketing | dormant | 13 | 0 | Dormant marketing intelligence items. CMO tool path wired but no production traffic. |  |
| `marketing_performance_snapshots` | marketing | dormant | 0 | 0 | Dormant marketing performance snapshots. |  |
| `workspace_artifacts` | marketing | dormant | 13 | 0 | Dormant workspace artifacts. Referenced in CMO path but no production traffic. |  |
| `meeting_attendees` | meetings | live | 10 | 0 | Per-meeting attendee roster (person_id -> people.id). attended is null until the meeting is in minutes mode and attendance is marked. |  |
| `meeting_categories` | meetings | live | 33 | 0 | Agenda section headers within a single meeting (ordered by position). Parent of meeting_items. |  |
| `meeting_documents` | meetings | live | 0 | 0 | Pattern C attachment junction: links document_metadata records (generic uploads, not the transcript) to a meeting. |  |
| `meeting_item_documents` | meetings | live | 0 | 0 | Pattern C attachment junction: links document_metadata records to an individual meeting_item. |  |
| `meeting_items` | meetings | live | 68 | 0 | Individual agenda/minutes line items within a meeting_category: title, assignee, due date, status. Can carry forward to a later meeting (carried_from_item_id)… | origin_meeting_id and carried_from_item_id both self/cross-reference meetings and meeting_items to support 'carry open item to next meeting' workflows — do not… |
| `meeting_series` | meetings | live | 690 | 0 | Groups recurring meetings under one project-scoped name (e.g. weekly OAC). unique(project_id, name). Backfilled from distinct document_metadata.title per proje… |  |
| `meeting_template_categories` | meetings | live | 0 | 0 | Agenda section headers within a meeting_template, mirrors meeting_categories. |  |
| `meeting_template_items` | meetings | live | 0 | 0 | Pre-defined agenda line items within a meeting_template_category, mirrors meeting_items minus assignment/status fields. |  |
| `meeting_templates` | meetings | live | 0 | 0 | Company-level (no project_id by design, matching Procore) reusable meeting template. Everyone authenticated can read; only admins write. |  |
| `meetings` | meetings | live | 1.4k | 0 | Procore-style meeting record: agenda/minutes mode, schedule fields, optional link to a Fireflies transcript via transcript_document_id. Backfilled one row per… | transcript_document_id references document_metadata.id (TEXT) — do not confuse with meeting_documents (generic attachment junction). number is scoped per serie… |
| `db_incident_activity_samples` | ops | live | 4 | 0 | Operational diagnostic samples captured during database incident investigations. |  |
| `db_incident_outlook_write_block_log` | ops | live | 4.1k | 0 | Operational audit log for Outlook write blocks during database incident mitigation. |  |
| `db_incident_write_log` | ops | live | 11.2k | 0 | Operational audit log for write attempts captured during database incident mitigation. |  |
| `app_page_role_access_policies` | permissions | live | 0 | 0 | Admin-managed project-page role access policy. Presence of a route row makes the route policy explicit; child rows define allowed permission templates. |  |
| `app_page_role_access_policy_templates` | permissions | live | 0 | 0 | Allowed permission templates for an explicit page-role access policy. |  |
| `distribution_group_members` | permissions | live-empty | 0 | 0 | Members of distribution groups. No rows. |  |
| `distribution_groups` | permissions | live-empty | 0 | 0 | Distribution groups for notifications. Full CRUD service exists, no rows. |  |
| `group_members` | permissions | dormant | 0 | 0 | Dormant. No active code references. |  |
| `groups` | permissions | dormant | 0 | 0 | Dormant. No active code references. |  |
| `permission_audit_log` | permissions | live | 3 | 0 | Auto-written by lib/permissions.ts on permission changes. 7 rows. |  |
| `permission_templates` | permissions | live | 15 | 0 | 11 active permission templates. Managed via admin UI at /permissions/templates. |  |
| `person_company_templates` | permissions | live-empty | 49 | 0 | Permission templates per person-company pair. Feature defined, no data. |  |
| `user_directory_permissions` | permissions | live-empty | 0 | 0 | Admin-only per-user directory permission overrides. No rows set. |  |
| `user_granular_permission_overrides` | permissions | live | 4 | 0 | Fine-grained permission overrides. 4 active rows. |  |
| `user_module_permissions` | permissions | live-empty | 0 | 0 | Per-module tool access overrides per user. Same null-fallback bug as user_profiles. |  |
| `graph_subscriptions` | pipeline | live | 1 | 0 | Microsoft Graph webhook subscriptions. RLS-protected row count. Auto-renewed by subscriptions.py and webhooks.py. |  |
| `graph_sync_state` | pipeline | live | 322 | 0 | Per-resource delta sync tokens for Microsoft Graph. Per-user mailbox rows key resource_id by the bare mailbox email, not user:<email>. | Do not prefix mailbox resource_id values when reading graph_sync_state for stale-first sync selection; prefixed lookups match zero rows and collapse the limite… |
| `ingestion_dead_letter` | pipeline | orphan-mirror | 17 | 0 | STALE DLQ for failed ingestions. RAG.ingestion_dead_letter is canonical. |  |
| `ingestion_jobs` | pipeline | orphan-mirror | 449 | 0 | STALE copy of generic ingestion audit. 431 rows. RAG.ingestion_jobs is canonical. |  |
| `pipeline_config` | pipeline | dormant | 2 | 0 | Dormant pipeline configuration table. |  |
| `processing_queue` | pipeline | dormant | 3 | 0 | Dormant processing queue. |  |
| `source_sync_runs` | pipeline | live | 3.8k | 0 | Per-sync-run audit log. 3,478 MAIN rows (3,639 in RAG canonical). Written by graph sync, outlook.py, Acumatica sync. |  |
| `sources` | pipeline | live | 1.2k | 0 | Source registry — canonical list of ingestion sources. 1,218 rows. |  |
| `sync_status` | pipeline | dormant | 0 | 0 | Dormant sync status table. |  |
| `system_alerts` | pipeline | live | 654 | 0 | Health alert sink. 646 rows. Written by source_sync_health.py and source_rag_health.py crons. |  |
| `project_current_state` | project_intelligence | live | 46 | 0 | Current synthesized project state used by intelligence and executive surfaces. |  |
| `project_intelligence_timeline_event_sources` | project_intelligence | live | 252 | 0 | Source/evidence links for project intelligence timeline events. |  |
| `project_intelligence_timeline_events` | project_intelligence | live | 252 | 0 | Project intelligence timeline events used for current-state and executive drilldown views. |  |
| `project_operating_snapshots` | project_intelligence | live | 302 | 0 | Point-in-time project operating snapshots for intelligence and reporting comparisons. |  |
| `project_report_suggestions` | project_intelligence | live | 218 | 0 | Suggested project report content/actions generated from project intelligence workflows. |  |
| `project_companies` | projects | live | 104 | 0 | Many-to-many join between projects and companies. company_type and status columns describe the relationship. |  |
| `project_contact_references` | projects | live | 6.0k | 0 | Pipeline-internal contact references built during Graph email sync for project assignment. No UI. Rows accumulate uncontrolled. | Written by project_assignment.py every 30-min Graph sync. No cleanup/expiry mechanism. Row count grows unbounded. |
| `project_directory_memberships` | projects | live | 308 | 0 | Core M2M join between projects and directory members. Race-protected via onConflict upserts. |  |
| `project_documents` | projects | live | 3.4k | 0 | Project-scoped uploaded + OneDrive/SharePoint-synced documents (full file inventory). Parallel to document_metadata (the AI-ready catalog). document_type is au… | document_type is set by trigger trg_project_documents_classify via classify_document_type(source_web_url) — folder-name based, number-agnostic. Do not set it m… |
| `project_emails` | projects | live | 1.3k | 0 | Project-matched inbound emails plus outbound emails sent via the app. Distinct from outlook_email_intake (raw sync) and document_metadata (AI relevance). |  |
| `project_notification_groups` | projects | dormant | 0 | 0 | Dormant. No writer or reader found in codebase. |  |
| `project_photos` | projects | live-empty | 6 | 0 | Photo feature — routes wired, never used in production. |  |
| `project_photos_punch_items_links` | projects | live-empty | 0 | 0 | Link table joining project photos to punch items. Feature not yet adopted. |  |
| `project_progress_report_photos` | projects | live | 6 | 0 | Photos attached to progress reports. |  |
| `project_progress_reports` | projects | live | 19 | 0 | Weekly progress reports. Triggered by api/cron/progress-reports and user-triggered PDF email flow. |  |
| `project_resources` | projects | dormant | 0 | 0 | Dormant. No writer or reader found in codebase. |  |
| `project_role_members` | projects | live-empty | 51 | 0 | Intended for role-member assignments. Assignment goes through project_directory_memberships instead. |  |
| `project_roles` | projects | live | 370 | 0 | Project-specific role definitions managed via CRUD routes. |  |
| `project_transmittals` | projects | live-empty | 0 | 0 | Transmittals feature — routes wired, no data yet. |  |
| `project_vendors` | projects | live | 5 | 0 | User-managed vendor associations per project. |  |
| `projects` | projects | live | 118 | 0 | Master project record. Integer id is the FK target for nearly every project-scoped table. Acumatica sync AND manual API can both write — race conditions possib… | id is INTEGER (not UUID). Several columns are mostly null: address, city, state, client, current_phase. project_manager FK→people.id (uuid). team_members is uu… |
| `projects_audit` | projects | live | 21.6k | 0 | Append-only audit trail of changes to the projects table. Written by a Postgres trigger only — no app code touches it directly. | Only useful via direct SQL. No UI. Cannot be queried via normal app routes. |
| `projects_sync` | projects | dormant | 1 | 0 | Leftover staging table from early project sync work. No code references found. |  |
| `user_project_preferences` | projects | live-empty | 0 | 0 | Per-user per-project UI preferences. Service exists, no rows saved. |  |
| `user_project_roles` | projects | dormant | 0 | 0 | Dormant. No writer or reader found in codebase. |  |
| `user_projects` | projects | dormant | 0 | 0 | Dormant. No writer or reader found in codebase. |  |
| `nods_page` | support | live-empty | 6 | 0 | Page registry for knowledge base navigation. Empty but code references exist. |  |
| `nods_page_section` | support | dormant | 0 | 0 | Dormant knowledge base page sections. No code references. |  |
| `support_article_chunks` | support | live | 5.2k | 0 | Knowledge base embeddings for semantic search. 5,219 rows. |  |
| `support_articles` | support | live | 2.3k | 0 | In-app knowledge base articles. 2,205 rows. |  |
| `training_doc_assets` | support | live | 124 | 0 | Screenshots/images/video attached to a training_doc (asset_type: screenshot\|image\|video), stored in the documents bucket. Rendered into published MDX. |  |
| `training_doc_relations` | support | live | 18 | 0 | Links between training_docs for the training map: relation_type related\|prerequisite\|next, source_doc_id→target_doc_id. Added 2026-06-30 to let docs link relat… |  |
| `training_doc_steps` | support | live | 118 | 0 | Ordered steps for a training_doc (instruction_markdown, expected_result, action_metadata, source_url). QA-ready; produced by the AI step generator and the Play… |  |
| `training_docs` | support | live | 90 | 0 | User-facing training/help articles (one row per task). Powers /training-docs admin UI, /knowledge/app/* viewer, and the publish pipeline to alleato-os-docs. to… |  |
| `admin_feedback_comments` | workflow | dormant | 39 | 0 | Dormant admin feedback comments. |  |
| `admin_feedback_items` | workflow | live | 396 | 0 | In-app user feedback inbox. 291 rows. Managed at /api/admin/feedback/*. |  |
| `collaboration_comments` | workflow | dormant | 16 | 0 | Dormant collaboration comments. |  |
| `collaboration_notifications` | workflow | dormant | 133 | 0 | Dormant collaboration notifications. |  |
| `daily_log_equipment` | workflow | dormant | 0 | 0 | Dormant daily log equipment entries. |  |
| `daily_log_manpower` | workflow | dormant | 1 | 0 | Dormant daily log manpower entries. |  |
| `daily_log_notes` | workflow | dormant | 0 | 0 | Dormant daily log notes. |  |
| `daily_log_weather` | workflow | live-empty | 2 | 0 | Per-observation weather entries (sky, temperature, precipitation, wind) attached to a daily_log. Added by the daily-log expansion migration (20260521020000). |  |
| `daily_logs` | workflow | live-empty | 4 | 0 | Daily log records for project field reporting. Feature shipped, no data. |  |
| `discrepancies` | workflow | dormant | 0 | 0 | Dormant discrepancy tracking. |  |
| `execution_handoffs` | workflow | dormant | 2 | 0 | Dormant execution handoff records. |  |
| `feature_request_events` | workflow | dormant | 16 | 0 | Dormant feature request events. |  |
| `feature_request_linear_events` | workflow | dormant | 4 | 0 | Dormant Linear integration events for feature requests. |  |
| `feature_request_linear_sub_issues` | workflow | dormant | 3 | 0 | Dormant Linear sub-issue tracking for feature requests. |  |
| `feature_requests` | workflow | live | 8 | 0 | Product feature requests from users. 1 row. |  |
| `idea_items` | workflow | live | 1 | 0 | Lightweight editable idea inbox for quick capture, AI routing review, and later promotion to Linear, Codex, sub-agent, project, or manual workflows. | Ideas are not automatically executed. Status and route_type preserve inspectable routing before automation acts. |
| `implementation_plans` | workflow | dormant | 4 | 0 | Dormant implementation plans. |  |
| `inspections` | workflow | dormant | 0 | 0 | Dormant inspections feature. |  |
| `issues` | workflow | dormant | 7 | 0 | Dormant issues tracking. |  |
| `manpower_assignments` | workflow | live-empty | 142 | 0 | Role/person assignment rows within an imported manpower plan project. | assignee_person_id is nullable; assignee_name preserves imported names before directory matching. |
| `manpower_plans` | workflow | live-empty | 1 | 0 | Imported manpower planning snapshot header. Marks the active manpower plan and tracks import metadata/warnings. | Only one active plan is allowed by partial unique index. Plan rows own manpower_projects and manpower_assignments via cascade delete. |
| `manpower_projects` | workflow | live-empty | 41 | 0 | Project rows within an imported manpower plan, optionally linked to the canonical projects table. | project_id is nullable; external_code/project_name may be the only source when the imported plan cannot be matched to a project. |
| `observation_comments` | workflow | dormant | 0 | 0 | Dormant observation comments. |  |
| `observation_history` | workflow | dormant | 0 | 0 | Dormant observation change history. |  |
| `observation_photos` | workflow | live-empty | 0 | 0 | Photos for observations. Feature shipped, never adopted. |  |
| `observation_types` | workflow | dormant | 12 | 0 | Dormant observation type definitions. |  |
| `observations` | workflow | dormant | 0 | 0 | Dormant observations (site conditions, safety, quality). Feature wired but no production traffic. |  |
| `observations_project_photos_links` | workflow | dormant | 0 | 0 | Dormant link table between observations and project photos. |  |
| `punch_item_comments` | workflow | dormant | 0 | 0 | Dormant punch item comments. |  |
| `punch_item_template_categories` | workflow | dormant | 0 | 0 | Dormant punch item template categories. |  |
| `punch_item_templates` | workflow | dormant | 0 | 0 | Dormant punch item templates. |  |
| `punch_items` | workflow | live | 37 | 0 | Punch list items. 6 rows. |  |
| `recurring_issue_evidence` | workflow | live | 9 | 0 | Evidence supporting recurring issues. 9 rows. |  |
| `recurring_issue_projects` | workflow | dormant | 0 | 0 | Dormant recurring issue to project links. |  |
| `recurring_issues` | workflow | live | 5 | 0 | Pattern-detection recurring issues. 5 rows. |  |
| `requests` | workflow | dormant | 50 | 0 | Dormant generic requests table. |  |
| `review_comments` | workflow | dormant | 0 | 0 | Dormant review comments. |  |
| `reviews` | workflow | dormant | 0 | 0 | Dormant review records. |  |
| `rfi_assignees` | workflow | dormant | 0 | 0 | Dormant RFI assignee table. |  |
| `rfi_response_tokens` | workflow | live | 5 | 0 | Opaque no-login authorization tokens for one recipient to respond to one RFI through web or email reply channels. | Token rows have no authenticated/anon policy. Access must stay service-role only after API-side validation. |
| `rfi_responses` | workflow | live | 1 | 0 | Structured RFI responses from app, public magic-link web replies, and email reply ingestion. | Public response routes and RFI reply cron use service-role access after token validation; authenticated users may read responses. Do not expose rfi_response_to… |
| `rfis` | workflow | live | 37 | 0 | Request for Information records. 11 rows. |  |
| `rfis_submittals_links` | workflow | dormant | 0 | 0 | Dormant RFI to submittal cross-links. |  |
| `roadmap_items` | workflow | live | 10 | 0 | Product roadmap items. 10 rows. Admin-managed at /api/admin/roadmap/*. |  |
| `schedule_deadlines` | workflow | dormant | 0 | 0 | Dormant schedule deadline tracking. |  |
| `schedule_dependencies` | workflow | dormant | 0 | 0 | Dormant schedule task dependencies. |  |
| `schedule_tasks` | workflow | live | 441 | 0 | Project schedule tasks. 241 rows. |  |
| `submittal_ai_review_checks` | workflow | live | 24 | 0 | Per-check AI submittal review findings with severity, confidence, source references, missing data, and human reviewer disposition. | Rows belong to submittal_ai_review_runs. Reviewer disposition controls are part of the active submittal AI review workflow. |
| `submittal_ai_review_runs` | workflow | live | 10 | 0 | AI submittal review run headers, including readiness, source coverage, model output, recommendation, status, and error details. | Runs are not the source documents; they are review artifacts tied to submittals and projects. Keep check rows in submittal_ai_review_checks. |
| `submittal_analytics_events` | workflow | live-empty | 0 | 0 | Analytics events for submittal workflows. Wired but no data. |  |
| `submittal_distribution_recipients` | workflow | dormant | 2 | 0 | Dormant submittal distribution recipient records. |  |
| `submittal_distributions` | workflow | dormant | 2 | 0 | Dormant submittal distribution records. |  |
| `submittal_documents` | workflow | dormant | 3 | 0 | Dormant submittal document links. |  |
| `submittal_history` | workflow | dormant | 11 | 0 | Dormant submittal change history. |  |
| `submittal_linked_drawings` | workflow | dormant | 11 | 0 | Dormant submittal to drawing links. |  |
| `submittal_notifications` | workflow | dormant | 0 | 0 | Dormant submittal notifications. |  |
| `submittal_packages` | workflow | dormant | 1 | 0 | Dormant submittal packages for grouped submissions. |  |
| `submittal_performance_metrics` | workflow | dormant | 0 | 0 | Dormant submittal performance metrics. |  |
| `submittal_project_settings` | workflow | live | 1 | 0 | Per-project Submittals tool configuration for default managers, distribution behavior, response days, workflow toggles, and email notification defaults. | One row per project. The settings API deliberately handles missing-table errors loudly with an actionable migration message. |
| `submittal_responses` | workflow | dormant | 9 | 0 | Dormant submittal response records. |  |
| `submittal_types` | workflow | dormant | 19 | 0 | Dormant submittal type definitions. |  |
| `submittal_workflow_steps` | workflow | dormant | 9 | 0 | Dormant submittal workflow step definitions. |  |
| `submittal_workflow_templates` | workflow | live | 1 | 0 | Submittal workflow templates. 1 row. |  |
| `submittals` | workflow | live | 220 | 0 | Submittal records. 1 row. |  |
| `task_comments` | workflow | live-empty | 0 | 0 | Comments on tasks. Routes exist, no data. |  |
| `tasks` | workflow | live | 326 | 0 | Project action items. 845 rows. Written by task_extraction.py (daily cron) and teams_compiler.py. |  |
| `timeline_events` | workflow | dormant | 1 | 0 | Dormant timeline events. |  |
| `timesheets` | workflow | dormant | 0 | 0 | Dormant timesheet records. |  |
| `todos` | workflow | live-empty | 1 | 0 | SOV-related todos. Referenced in subcontractor-sov-service.ts but empty. |  |
| `transmittal_items` | workflow | dormant | 0 | 0 | Dormant transmittal items. |  |


---

## RAG — AI Database (`fqcvmfqldlewvbsuxdvz`)

24 tables · 19 live · 4 live-empty · 1 dormant

| Table | Domain | Status | Rows | Code refs | Purpose | Notes |
|---|---|---|---:|---:|---|---|
| `fireflies_ingestion_jobs` | communications | live | 28.5k | 0 | Pipeline ingest-job stage queue (RAG side). ~27k rows. As of 2026-06-17 written in lockstep with MAIN.fireflies_ingestion_jobs via supabase_helpers.update_inge… | Both copies are now kept in sync — MAIN is no longer stale. Always update both DBs through update_ingestion_job_state(), never one side directly. |
| `outlook_email_intake` | communications | live | 4.6k | 0 | RAG database Outlook email intake rows for Microsoft Graph ingestion and vectorization workflows. |  |
| `outlook_email_intake_attachments` | communications | live | 1.8k | 0 | RAG database attachment metadata for Outlook email intake rows. |  |
| `outlook_email_skip_audit` | communications | live | 191 | 0 | Audit rows for Outlook email messages skipped by ingestion or filtering rules. |  |
| `document_attribution_candidates` | documents | live | 16.2k | 0 | Low-confidence project attribution review queue. 13,193 rows. Canonical copy. Written when project confidence < 0.70. |  |
| `document_chunk_retrieval_telemetry` | documents | live | 16 | 0 | Daily bucket recall telemetry for document_chunks retrieval. Stores recall_count and last_recalled_at by chunk/date/retrieval mode so hybrid RAG ranking can us… | RAG-owned only. Do not mirror to PM APP. Writes are only enabled when RAG_RETRIEVAL_TELEMETRY_ENABLED=true and should fail loudly if unavailable. |
| `document_chunks` | documents | live | 171.5k | 0 | THE unified vector store. 109,171 rows. halfvec 3072 embeddings. Written by pipeline/embedder.py. Read by rpc('search_document_chunks'). Canonical source for a… | MAIN.document_chunks (103K rows) is a stale orphan. Always use the RAG copy for reads and writes. |
| `rag_document_metadata` | documents | live | 69.2k | 0 | Embedding-side document catalog. 36,657 rows. app_document_id FK back to MAIN.document_metadata. Only backend pipeline reads this directly. |  |
| `packet_refresh_jobs` | intelligence | live | 2.1k | 0 | Packet refresh job queue and PM packet projection staging handoff. Canonical copy. MAIN copy is stale orphan. Projection payload/status columns were added 2026… |  |
| `source_intelligence_jobs` | intelligence | live | 19.6k | 0 | Compiler job queue. 11,071 rows. Canonical copy. Drained every 10 min by APScheduler in FastAPI. |  |
| `source_signal_candidates` | intelligence | live | 11.1k | 0 | Pre-promotion signal candidates from compiler. 7,527 rows. Canonical copy. |  |
| `graph_subscriptions` | pipeline | live | 11 | 0 | RAG database copy of Microsoft Graph webhook subscriptions used by Graph ingestion workers. |  |
| `graph_sync_state` | pipeline | live | 324 | 0 | RAG database Graph delta-token state for mailbox, Teams, and OneDrive sync workers. |  |
| `ingestion_dead_letter` | pipeline | live-empty | 17 | 0 | Dead letter queue for failed ingestion jobs. Wired but empty. |  |
| `ingestion_jobs` | pipeline | live | 725 | 0 | Generic ingestion audit log. 436 rows. Canonical copy. |  |
| `pipeline_model_usage` | pipeline | live-empty | 30.3k | 0 | Durable model usage and estimated-cost ledger for source processing, embeddings, daily briefs, Brandon email review, and project intelligence. Used by the dail… | High-volume telemetry belongs in RAG, not PM APP. Cost is an estimate based on configured pricing; provider billing remains authoritative. |
| `rag_pipeline_state` | pipeline | live-empty | 1 | 0 | RAG pipeline state metadata. Wired but empty. |  |
| `source_processing_jobs` | pipeline | live-empty | 9.9k | 0 | Durable per-source lifecycle ledger tracking source item hashes through assignment, RAG indexing, signal extraction, project intelligence, routing, and termina… | This is the cross-source status contract for Fireflies, Outlook, Teams, OneDrive, SharePoint, and future Acumatica-derived intelligence. Keep high-churn lifecy… |
| `source_sync_health_snapshots` | pipeline | live | 340 | 0 | Source sync health rollup snapshots. 330 rows. Canonical copy. |  |
| `source_sync_runs` | pipeline | live | 27.3k | 0 | Per-sync-run audit log. 3,639 rows. Canonical copy. |  |
| `system_alerts` | pipeline | live | 81 | 0 | RAG database pipeline health and system alert sink. |  |
| `project_daily_deltas` | project_intelligence | live | 213 | 0 | Daily project delta summaries produced by RAG/intelligence processing. |  |
| `source_syntheses` | project_intelligence | live | 2.4k | 0 | Synthesized source-level intelligence outputs generated from RAG-ingested communications and documents. |  |
| `user_phone_links` | unknown | dormant | 0 | 0 | TODO: Document this table. Discovered as pre-existing schema drift while regenerating TABLE-LIST.md; not created or touched by the meetings tool migration. |  |

