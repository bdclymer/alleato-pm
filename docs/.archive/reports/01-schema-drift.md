# Schema Drift Audit — 2026-04-14

Automated audit of drift between the codebase (`frontend/src/`), the generated
Supabase types (`frontend/src/types/database.types.ts`), and the SQL migrations
(`supabase/migrations/`). No fixes applied — reporting only.

## Summary

| Check | Violations |
|-------|-----------:|
| Phantom tables (`.from(...)` references a table/view NOT in `database.types.ts`) | 60 |
| Phantom columns (best-effort: `.select` / `.eq` / `.update` / `.insert` / `.upsert` using a column NOT in its Row) | 113 |
| Tables in migrations but NOT in types (excluding `__drizzle_migrations`) | 15 |
| Tables in types but NOT in migrations | 62 |

Scan covered **2,345 files** and **2,076 `.from()` call sites**. Generated types define **325 tables** and **32 views**. Migrations contain **153 files**, **305 distinct CREATE TABLE** statements, **28 DROP TABLE** statements, and **0 ALTER TABLE … RENAME** statements found.

### Headline findings

- **`plugins` and `plugin_storage` tables (12 refs across `frontend/src/lib/plugins/plugin-manager.ts` + 1 UI file)** are queried heavily but do not exist in the generated types — the plugin manager is wired to a phantom schema.
- **`risks` (7 refs) and `opportunities` (3 refs)** are queried by `lib/executiveIntelligence.ts` and `lib/projectIntelligence.ts` but are absent from the types. These are core AI / executive-intel features talking to non-existent tables.
- **`client-dashboard/page.tsx`** (the top-level client portal landing page) references at least 20 phantom columns across `prime_contracts`, `schedule_tasks`, `rfis`, and `documents`. Likely caused by a schema rename or an out-of-date `select(...)` list.
- **`commitments_unified`** (a heavily used view or table) has 13 phantom column references across 5 API routes — the code treats it as a concrete table but the generated types don't expose these columns.
- **62 tables exist in `database.types.ts` but were never created by a migration** — almost an entire vertical (Drawings, Specifications, Observations, Photos, Submittals) appears to have been built via Supabase dashboard rather than checked-in migrations.

---

## Phantom table references

`file:line — table_name` — 60 violations across 19 files.

```
frontend/src/app/(admin)/(procore)/crawled-pages/page.tsx:185	crawled_pages
frontend/src/app/api/avatar/[personId]/route.ts:56	person_profile_photos
frontend/src/app/api/commitments/[commitmentId]/email/route.ts:171	email_logs
frontend/src/app/api/notes/highlight/route.ts:103	note_highlights
frontend/src/app/api/projects/[projectId]/budget/details/route.ts:227	change_order_lines
frontend/src/app/api/projects/[projectId]/budget/export/route.ts:91	v_budget_lines
frontend/src/app/api/projects/[projectId]/budget/export/route.ts:162	change_order_lines
frontend/src/app/api/projects/[projectId]/budget/lock/route.ts:179	budget_line_items
frontend/src/app/api/projects/[projectId]/budget/route.ts:101	v_budget_lines
frontend/src/app/api/projects/[projectId]/budget/route.ts:239	change_order_lines
frontend/src/app/api/projects/[projectId]/checklist/route.ts:31	budget_line_items
frontend/src/app/api/projects/[projectId]/contracts/[contractId]/line-items/route.ts:130	project_members
frontend/src/app/api/projects/[projectId]/directory/people/[personId]/profile-photo/route.ts:78	person_profile_photos
frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/digest/route.ts:23	meeting_digests
frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/prep/generate/route.ts:75	meeting_digests
frontend/src/components/dev-tools/enhanced-dev-panel.tsx:870	table
frontend/src/components/plugins/plugin-manager-ui.tsx:76	plugins
frontend/src/components/project-setup-wizard/schedule-setup.tsx:86	schedules
frontend/src/components/project-setup-wizard/schedule-setup.tsx:97	schedules
frontend/src/lib/acumatica/mirror-sync.ts:585	acumatica_sync_runs
frontend/src/lib/acumatica/mirror-sync.ts:599	acumatica_sync_runs
frontend/src/lib/ai/services/agent-learning-service.ts:307	agent_learnings
frontend/src/lib/ai/services/agent-learning-service.ts:352	agent_learnings
frontend/src/lib/ai/services/agent-learning-service.ts:391	agent_learnings
frontend/src/lib/ai/services/agent-learning-service.ts:431	agent_learning_usages
frontend/src/lib/ai/services/agent-learning-service.ts:456	agent_learning_usages
frontend/src/lib/ai/tools/action-tools.ts:90	ai_tool_write_audits
frontend/src/lib/ai/tools/action-tools.ts:111	ai_tool_write_audits
frontend/src/lib/ai/tools/financial.ts:381	change_order_lines
frontend/src/lib/ai/tools/financial.ts:716	v_budget_lines
frontend/src/lib/bot/index.ts:88	profiles
frontend/src/lib/executiveIntelligence.ts:79	risks
frontend/src/lib/executiveIntelligence.ts:115	risks
frontend/src/lib/executiveIntelligence.ts:165	risks
frontend/src/lib/executiveIntelligence.ts:274	risks
frontend/src/lib/plugins/plugin-manager.ts:71	plugins
frontend/src/lib/plugins/plugin-manager.ts:155	plugin_storage
frontend/src/lib/plugins/plugin-manager.ts:163	plugin_storage
frontend/src/lib/plugins/plugin-manager.ts:171	plugin_storage
frontend/src/lib/plugins/plugin-manager.ts:178	plugin_storage
frontend/src/lib/plugins/plugin-manager.ts:359	plugins
frontend/src/lib/plugins/plugin-manager.ts:387	plugins
frontend/src/lib/plugins/plugin-manager.ts:395	plugins
frontend/src/lib/plugins/plugin-manager.ts:428	plugins
frontend/src/lib/plugins/plugin-manager.ts:454	plugins
frontend/src/lib/plugins/plugin-manager.ts:536	plugins
frontend/src/lib/projectIntelligence.ts:95	risks
frontend/src/lib/projectIntelligence.ts:121	opportunities
frontend/src/lib/projectIntelligence.ts:212	risks
frontend/src/lib/projectIntelligence.ts:216	opportunities
frontend/src/lib/projectIntelligence.ts:241	risks
frontend/src/lib/projectIntelligence.ts:248	opportunities
frontend/src/lib/services/direct-cost-service.ts:609	direct_costs_summary_by_cost_code
frontend/src/lib/services/direct-cost-service.ts:841	direct_cost_audit_log
frontend/src/lib/supabase/queries.ts:251	budget_line_items
frontend/src/services/directoryAdminService.ts:315	user_activity_log
frontend/src/services/directoryService.ts:707	user_permissions
frontend/src/services/directoryService.ts:757	user_permissions
frontend/src/services/directoryService.ts:765	user_permissions
frontend/src/services/directoryService.ts:801	user_activity_log
```

### By table (top offenders)

| count | table |
|------:|-------|
| 8 | `plugins` |
| 7 | `risks` |
| 4 | `change_order_lines` |
| 4 | `plugin_storage` |
| 3 | `v_budget_lines` |
| 3 | `budget_line_items` |
| 3 | `agent_learnings` |
| 3 | `opportunities` |
| 3 | `user_permissions` |
| 2 | `person_profile_photos` |
| 2 | `meeting_digests` |
| 2 | `schedules` |
| 2 | `acumatica_sync_runs` |
| 2 | `agent_learning_usages` |
| 2 | `ai_tool_write_audits` |
| 2 | `user_activity_log` |

Notes:
- `"table"` in `enhanced-dev-panel.tsx:870` is almost certainly a placeholder / dev tool call, not a real query.
- Several phantom tables (`agent_learnings`, `agent_learning_usages`, `acumatica_sync_runs`, `ai_tool_write_audits`, `note_highlights`, `punch_item_attachments`) DO exist in migrations (see migration-vs-types section below), so these are almost certainly **stale-types** cases — run `npm run db:types` to fix.

---

## Phantom column references (best-effort)

`file:line — table.column` — 113 violations. See **Limitations** below before acting. Raw list:

```
frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx:73	prime_contracts.contract_amount
frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx:73	prime_contracts.execution_date
frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx:73	prime_contracts.final_completion_date
frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx:73	prime_contracts.percent_complete
frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx:73	prime_contracts.revised_contract_amount
frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx:79	prime_contracts.is_active
frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx:87	schedule_tasks.end_date
frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx:96	rfis.date_required
frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx:96	rfis.date_submitted
frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx:96	rfis.priority
frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx:96	rfis.rfi_number
frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx:101	rfis.date_submitted
frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx:107	documents.file_size
frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx:107	documents.file_type
frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx:107	documents.file_url
frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx:107	documents.folder_path
frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx:107	documents.name
frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx:107	documents.uploaded_at
frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx:109	documents.is_private
frontend/src/app/(main)/[projectId]/client-dashboard/page.tsx:110	documents.uploaded_at
frontend/src/app/(main)/[projectId]/home/page.tsx:317	prime_contract_change_orders.change_event_id
frontend/src/app/(main)/[projectId]/home/page.tsx:324	contract_change_orders.change_event_id
frontend/src/app/api/ai-assistant/usage-stats/route.ts:51	conversations.id
frontend/src/app/api/commitments/[commitmentId]/advanced-settings/route.ts:86	commitments_unified.advanced_settings
frontend/src/app/api/commitments/[commitmentId]/advanced-settings/route.ts:171	commitments_unified.advanced_settings
frontend/src/app/api/commitments/[commitmentId]/email/route.ts:242	commitments_unified.total_amount_remaining
frontend/src/app/api/commitments/[commitmentId]/email/route.ts:242	commitments_unified.total_billed_to_date
frontend/src/app/api/commitments/[commitmentId]/email/route.ts:242	commitments_unified.total_sov_amount
frontend/src/app/api/commitments/[commitmentId]/email/route.ts:251	commitments_unified.amount
frontend/src/app/api/commitments/[commitmentId]/email/route.ts:251	commitments_unified.billed_to_date
frontend/src/app/api/commitments/[commitmentId]/email/route.ts:251	commitments_unified.line_number
frontend/src/app/api/commitments/[commitmentId]/email/route.ts:253	commitments_unified.line_number
frontend/src/app/api/commitments/[commitmentId]/export/route.ts:247	commitments_unified.sov_line_count
frontend/src/app/api/commitments/[commitmentId]/export/route.ts:247	commitments_unified.total_amount_remaining
frontend/src/app/api/commitments/[commitmentId]/export/route.ts:247	commitments_unified.total_billed_to_date
frontend/src/app/api/commitments/[commitmentId]/export/route.ts:247	commitments_unified.total_sov_amount
frontend/src/app/api/commitments/[commitmentId]/export/route.ts:258	commitments_unified.line_number
frontend/src/app/api/commitments/[commitmentId]/permanent-delete/route.ts:46	commitments_unified.type
frontend/src/app/api/commitments/[commitmentId]/restore/route.ts:42	commitments_unified.type
frontend/src/app/api/projects/[projectId]/budget-codes/route.ts:109	cost_codes.code
frontend/src/app/api/projects/[projectId]/budget-codes/route.ts:110	cost_codes.code
frontend/src/app/api/projects/[projectId]/budget-codes/route.ts:299	cost_codes.code
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/email/route.ts:282	projects.city
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/email/route.ts:282	projects.number
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/line-items/route.ts:308	change_event_line_items.costRom
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/line-items/route.ts:308	change_event_line_items.SENSITIVE
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/pdf/route.ts:286	projects.city
frontend/src/app/api/projects/[projectId]/change-events/[changeEventId]/pdf/route.ts:286	projects.number
frontend/src/app/api/projects/[projectId]/change-events/add-to-pco/route.ts:407	vertical_markup.total_amount
frontend/src/app/api/projects/[projectId]/change-events/add-to-pco/route.ts:407	vertical_markup.updated_by
frontend/src/app/api/projects/[projectId]/commitment-pcos/[pcoId]/route.ts:86	change_events.total_cost_rom
frontend/src/app/api/projects/[projectId]/commitment-pcos/[pcoId]/route.ts:86	change_events.total_revenue_rom
frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/line-items/import/route.ts:152	budget_lines.line_number
frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/line-items/import/route.ts:154	budget_lines.line_number
frontend/src/app/api/projects/[projectId]/commitments/[commitmentId]/line-items/route.ts:91	commitments_unified.line_number
frontend/src/app/api/projects/[projectId]/commitments/export/route.ts:319	projects.line_number
frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/pdf/route.ts:43	projects.city
frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/pdf/route.ts:43	projects.number
frontend/src/app/api/projects/[projectId]/invoicing/owner/route.ts:50	owner_invoices.null
frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/submit/route.ts:167	subcontractor_invoice_line_items.retention_amount
frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/[invoiceId]/submit/route.ts:167	subcontractor_invoice_line_items.work_completed_this_period
frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/invoices/route.ts:333	subcontractor_invoices.null
frontend/src/components/admin/client-status-toggle.tsx:53	project_directory_memberships.user_id
frontend/src/components/project-setup-wizard/cost-code-setup.tsx:293	cost_codes.code
frontend/src/components/project-setup-wizard/cost-code-setup.tsx:293	cost_codes.description
frontend/src/components/project-setup-wizard/cost-code-setup.tsx:293	cost_codes.typeCode
frontend/src/hooks/use-change-management.ts:104	contract_change_orders.project_id
frontend/src/hooks/use-is-client.ts:54	project_directory_memberships.user_id
frontend/src/hooks/use-is-client.ts:55	project_directory_memberships.is_active
frontend/src/lib/acumatica/mirror-sync.ts:530	acumatica_sync_state.cursor
frontend/src/lib/acumatica/mirror-sync.ts:545	acumatica_sync_state.last_errors
frontend/src/lib/acumatica/mirror-sync.ts:545	acumatica_sync_state.last_fetched
frontend/src/lib/acumatica/mirror-sync.ts:545	acumatica_sync_state.last_skipped
frontend/src/lib/acumatica/mirror-sync.ts:545	acumatica_sync_state.last_synced_at
frontend/src/lib/acumatica/mirror-sync.ts:545	acumatica_sync_state.last_upserted
frontend/src/lib/acumatica/sync.ts:423	owner_invoices.contract_id
frontend/src/lib/ai/tools/action-tools.ts:1659	companies.contract_number
frontend/src/lib/ai/tools/financial.ts:1156	prime_contract_financial_summary.approved_co_total
frontend/src/lib/ai/tools/financial.ts:1156	prime_contract_financial_summary.id
frontend/src/lib/ai/tools/financial.ts:1156	prime_contract_financial_summary.original_amount
frontend/src/lib/ai/tools/financial.ts:1156	prime_contract_financial_summary.revised_budget
frontend/src/lib/ai/tools/project-tools.ts:402	projects.description
frontend/src/lib/ai/tools/project-tools.ts:402	projects.impact
frontend/src/lib/ai/tools/project-tools.ts:402	projects.likelihood
frontend/src/lib/ai/tools/project-tools.ts:402	projects.metadata_id
frontend/src/lib/ai/tools/project-tools.ts:402	projects.owner_name
frontend/src/lib/ai/tools/project-tools.ts:402	projects.project_id
frontend/src/lib/ai/tools/project-tools.ts:402	projects.status
frontend/src/lib/ai/tools/project-tools.ts:405	projects.project_id
frontend/src/lib/ai/tools/project-tools.ts:679	projects.approved_co_total
frontend/src/lib/ai/tools/project-tools.ts:679	projects.description
frontend/src/lib/ai/tools/project-tools.ts:679	projects.original_amount
frontend/src/lib/ai/tools/project-tools.ts:679	projects.revised_budget
frontend/src/lib/ai/tools/project-tools.ts:682	projects.project_id
frontend/src/lib/ai/tools/project-tools.ts:1036	projects.approved_co_total
frontend/src/lib/ai/tools/project-tools.ts:1036	projects.budget_mod_total
frontend/src/lib/ai/tools/project-tools.ts:1036	projects.original_amount
frontend/src/lib/ai/tools/project-tools.ts:1036	projects.revised_budget
frontend/src/lib/ai/tools/project-tools.ts:1039	projects.project_id
frontend/src/lib/documents/record-documents.ts:1273	commitments_unified.total_amount_remaining
frontend/src/lib/documents/record-documents.ts:1273	commitments_unified.total_billed_to_date
frontend/src/lib/documents/record-documents.ts:1273	commitments_unified.total_sov_amount
frontend/src/lib/documents/record-documents.ts:1274	commitments_unified.line_number
frontend/src/lib/documents/record-documents.ts:1474	prime_contracts.amount
frontend/src/lib/documents/record-documents.ts:1475	prime_contracts.change_order_id
frontend/src/lib/documents/record-documents.ts:1511	people.name
frontend/src/lib/executiveIntelligence.ts:211	document_metadata.started_at
frontend/src/lib/executiveIntelligence.ts:212	document_metadata.project_ids
frontend/src/lib/executiveIntelligence.ts:213	document_metadata.started_at
frontend/src/services/distributionGroupService.ts:274	distribution_group_members.first_name
frontend/src/services/distributionGroupService.ts:274	distribution_group_members.last_name
frontend/src/services/DrawingService.ts:113	drawing_log.drawing_set_id
frontend/src/services/SpecificationService.ts:136	specification_area_sections.section_number
```

### By column (top 20)

| count | table.column |
|------:|--------------|
| 5 | `commitments_unified.line_number` |
| 4 | `cost_codes.code` |
| 4 | `projects.project_id` (`projects.id` is the real PK; looks like AI tool code using Procore-style `project_id`) |
| 3 | `commitments_unified.total_amount_remaining` |
| 3 | `commitments_unified.total_billed_to_date` |
| 3 | `commitments_unified.total_sov_amount` |
| 3 | `projects.city` |
| 3 | `projects.number` |
| 2 | `rfis.date_submitted` |
| 2 | `documents.uploaded_at` |
| 2 | `commitments_unified.advanced_settings` |
| 2 | `commitments_unified.type` |
| 2 | `budget_lines.line_number` |
| 2 | `project_directory_memberships.user_id` |
| 2 | `projects.description` |
| 2 | `projects.approved_co_total` |
| 2 | `projects.original_amount` |
| 2 | `projects.revised_budget` |
| 2 | `document_metadata.started_at` |

### Limitations of the column audit

This pass uses regex + bracket walking, not a TypeScript AST. Known cases it will MISS (false negatives) or MIS-REPORT (false positives):

1. **`select("col1, col2, foreign_table(nested)")`** joined selects are skipped entirely (the `(` trips the filter). A join with a phantom parent column won't be reported.
2. **JSON path selects** (`"meta->>key"`) are skipped.
3. **Star selects** (`"*"`) are skipped.
4. **Aliased selects** (`"alias:real_column"`) report the real column name only; if the alias leaks into `.eq("alias", …)` downstream we may incorrectly flag it as phantom.
5. **`.insert({ col1: ..., ...spread })` / computed keys** — the spread is silently ignored; computed-key expressions may or may not be captured depending on formatting.
6. The `owner_invoices.null` and `subcontractor_invoices.null` entries come from a pattern like `.update({ null: x, ... })` or a stray `null:` — these are likely false positives from over-eager object-key matching on ternary/conditional expressions and should be double-checked manually.
7. The `change_event_line_items.SENSITIVE` / `.costRom` hits on line 308 look like real camelCase vs snake_case mismatches that ARE worth fixing.
8. **Chain truncation:** each `.from()`'s window ends at the next `.from()` start (or 4 KB, whichever is smaller). Very long chains with sub-queries in between may truncate.

Treat this list as "what to investigate" rather than "what to mechanically rename."

---

## Migration vs types divergence

### Tables in migrations but NOT in types (15)

Most likely cause: **generated types are stale** — run `npm run db:types`. Exceptions noted below.

| table | first migration file |
|-------|----------------------|
| `Prospects` | `schema_dump.sql` |
| `acumatica_sync_runs` | `20260402000002_acumatica_sync_runs_log.sql` |
| `agent_learning_usages` | `20260407000001_agent_learnings.sql` |
| `agent_learnings` | `20260407000001_agent_learnings.sql` |
| `ai_tool_write_audits` | `20260330000004_ai_tool_write_audits.sql` |
| `contracts` | `schema_dump.sql` |
| `crawled_pages` | `schema_dump.sql` |
| `eval_results` | `20260324000001_eval_framework_tables.sql` |
| `eval_runs` | `20260324000001_eval_framework_tables.sql` |
| `eval_scenarios_raw` | `20260324000001_eval_framework_tables.sql` |
| `eval_test_cases` | `20260324000001_eval_framework_tables.sql` |
| `note_highlights` | `20260305000003_add_note_highlights.sql` |
| `prime_contract_attachments` | `20260328000001_prime_contract_attachments_fk_join.sql` |
| `project` | `schema_dump.sql` |
| `punch_item_attachments` | `20260413000001_create_punch_item_attachments.sql` |

Notes:
- `Prospects`, `contracts`, `crawled_pages`, `project` come from `schema_dump.sql` — could be a historical dump that's since been replaced by renames / deletions. The script does not resolve `schema_dump.sql` contents against later DROP/RENAME, and 0 `ALTER TABLE … RENAME TO` statements were found (limitation: PostgREST RLS changes don't show).
- `punch_item_attachments` was added yesterday (2026-04-13) — types just need regeneration.

### Tables in types but NOT in migrations (62)

These tables exist in the live DB (the types are a snapshot of its real schema) but there is no `CREATE TABLE` in any committed migration. They were almost certainly created via the Supabase dashboard.

```
admin_feedback_comments, admin_view_backups, billing_invitations, budget_line_forecasts,
budget_snapshots, change_orders, chat_messages, chat_sessions, chat_thread_attachment_files,
chat_thread_attachments, chat_thread_feedback, chat_thread_items, chat_threads, chats,
chunks, document_insights, drawing_areas, drawing_downloads, drawing_related_items,
drawing_revisions, drawing_sets, drawing_sketches, drawings, inspections, notion_databases,
observation_comments, observation_history, observation_photos, observation_types, observations,
parts, photo_albums, photo_links, photos, prime_contract_payment_applications,
prime_contract_payments, prime_contract_project_settings, procore_tools,
punch_item_template_categories, punch_item_templates, rag_pipeline_state,
specification_area_sections, specification_areas, specification_divisions,
specification_section_revisions, specification_sections, specification_subscribers,
subcontractor_invoice_audit_log, subcontractor_invoice_emails, subcontractor_invoice_related_items,
submittal_attachments, submittal_distribution_recipients, submittal_distributions,
submittal_linked_drawings, submittal_packages, submittal_responses, submittal_workflow_steps,
table_metadata, timesheets, tool_features, tool_form_fields, vendor_contacts
```

Whole verticals — **Drawings (7 tables), Specifications (6), Observations (5), Submittals (6), Photos (3), Chat (7), Punch Items (2)** — appear to have been built directly in the dashboard.

---

## How to run

```bash
node scripts/audits/audit-phantom-tables.mjs
node scripts/audits/audit-phantom-columns.mjs
node scripts/audits/audit-migration-vs-types.mjs
```

All three:
- Use only Node built-ins (no npm installs required).
- Exit `0` even when violations exist (reporting tool, not CI gate).
- Print a parseable `file:line\tviolation` block with summary headers.

### Known script limitations (consolidated)

- Parser for `database.types.ts` is regex-based on indentation (`    Tables:`, `      name:`, `        Row:`, `          col:`) and relies on the exact indentation that Supabase's generator currently produces. If the generator format changes, update `parseDatabaseTypes` in `scripts/audits/_lib.mjs`.
- Only the `public` schema is considered. `auth.*`, `storage.*`, etc. are ignored.
- Dynamic table/column names (variables, template strings with interpolation) are not analyzed. The audits skip those rather than guess.
- Migration parsing does NOT resolve: `ALTER TABLE … RENAME TO`, `DROP TABLE` followed by re-CREATE with same name, or tables created inside DO $$ blocks / functions. Use the "in migrations but not in types" list as a signal, not a truth.
- Column audit is **best effort**. See the full limitations list in the Phantom Column section above.
