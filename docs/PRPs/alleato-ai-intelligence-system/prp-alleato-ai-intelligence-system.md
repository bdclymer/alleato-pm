# Alleato AI Intelligence System: Tool Validation And Packet-First Client Project Intelligence

Date: 2026-04-30
Status: Implementation PRP
Primary proof target: Westfield Collective, project id 43
Primary source: `docs/ai-plan/rag-pipeline/RAG-STRATEGY-2026-04-29/CLIENT-PROJECT-INTELLIGENCE-PRP-SCOPE-2026-04-30.md`
Confidence score: 8.5/10

## Goal

Diagnose and stabilize the current Alleato AI assistant tool-calling path, then implement packet-first client project intelligence as the project-advisor layer inside the broader Alleato intelligence system.

The current AI chat responds, but it is not useful enough. Do not assume AI SDK is the problem. The first implementation workstream must prove whether the failure is caused by AI Gateway, direct OpenAI provider configuration, tool schema/message shape, or fragile local assistant-route code.

After that validation gate, implement packet-first client project intelligence for Westfield Collective so the assistant answers "What's the latest on Westfield Collective?" like a prepared strategic project advisor: current read, what changed, financial exposure, change-management risk, schedule/operational risk, decisions, follow-ups, source confidence, honest gaps, and next best action.

## Non-Goals

- Do not frame V1 primarily around internal initiatives or JobPlanner Replacement.
- Do not rewrite or discard existing useful assistant tools.
- Do not build the full automated compiler, scheduler, portfolio-wide intelligence system, or review UI in this first pass.
- Do not permanently bypass AI SDK or AI Gateway without validation evidence.
- Do not answer numeric financial questions from vector chunks before structured project/financial tools.

## Required Outcome

For the prompt:

> What's the latest on Westfield Collective?

The assistant must:

1. Resolve Westfield Collective to `projects.id = 43`.
2. Load the current Client Project Intelligence Packet before raw RAG.
3. State whether the packet is fresh, stale, partial, working sample, or failed.
4. Explain what changed recently.
5. Identify financial exposure and change-management risk.
6. Identify schedule/operational risks, decisions, and likely missed follow-ups.
7. Cite source coverage and confidence without pretending the packet is complete.
8. Recommend the next best action.
9. Fall back to raw source lookup only when the packet is missing, stale, thin, challenged, or source-specific evidence is requested.

## Core Context

### Planning Docs Read

- `docs/ai-plan/rag-pipeline/RAG-STRATEGY-2026-04-29/CLIENT-PROJECT-INTELLIGENCE-PRP-SCOPE-2026-04-30.md`
- `docs/ai-plan/rag-pipeline/RAG-STRATEGY-2026-04-29/CURRENT-AI-ASSISTANT-DIAGNOSIS-AND-VALIDATION-GATE-2026-04-30.md`
- `docs/ai-plan/rag-pipeline/RAG-STRATEGY-2026-04-29/RAG-STRATEGY-WORKING-DECISIONS-2026-04-30.md`
- `docs/ai-plan/rag-pipeline/RAG-STRATEGY-2026-04-29/RAG-STORAGE-MODEL-V1-2026-04-30.md`
- `docs/ai-plan/rag-pipeline/RAG-STRATEGY-2026-04-29/RAG-COMPILER-AND-ASSISTANT-BEHAVIOR-V1-2026-04-30.md`
- `docs/ai-plan/rag-pipeline/RAG-STRATEGY-2026-04-29/CLIENT-PROJECT-GOLD-STANDARD-CHAT-EXAMPLES-2026-04-30.md`
- `docs/ai-plan/rag-pipeline/RAG-STRATEGY-2026-04-29/RAG-GOLD-STANDARD-CHAT-EXAMPLES-2026-04-30.md`
- `docs/ai-plan/rag-pipeline/RAG-STRATEGY-2026-04-29/JOBPLANNER-REPLACEMENT-INTELLIGENCE-PACKET-V1-2026-04-30.md`
- `docs/ai-plan/rag-pipeline/RAG-STRATEGY-2026-04-29/AI-JOBPLANNER-INTERNAL-INITIATIVES-IDEATION-2026-04-30.md`
- `docs/ai-plan/rag-pipeline/RAG-STRATEGY-2026-04-29/AI-ASSISTANT-RAG-STRATEGY-2026-04-29.md`
- `docs/ai-plan/rag-pipeline/RAG-STRATEGY-2026-04-29/rag-upgrade.md`

### Current Assistant Architecture

Primary files:

- `frontend/src/app/api/ai-assistant/chat/route.ts` is the active strategist chat route.
- `frontend/src/lib/ai/providers.ts` selects AI Gateway when `AI_GATEWAY_API_KEY` exists, otherwise direct OpenAI, and uses `openai.chat(...)` for chat completions because of gateway validation concerns on Responses API multi-step tools.
- `frontend/src/lib/ai/assistant-models.ts` allowlists `openai/gpt-5.4`, `openai/gpt-5.5`, and `openai/gpt-5.4-mini`; default is `openai/gpt-5.4`.
- `frontend/src/lib/ai/orchestrator.ts` defines `ToolLoopAgent` specialist flows and `createStrategistTools`.
- `frontend/src/lib/ai/bot-core.ts` still uses AI SDK `generateText` / `streamText` with tools for non-main chat bot paths.
- `frontend/src/lib/ai/detect-rag-request.ts` documents source-specific deterministic pre-retrieval as a workaround because model tools are disabled in the main route.
- `frontend/src/lib/ai/tools/project-tools.ts` includes `getProjectBriefingSnapshot`.
- `frontend/src/lib/ai/tools/operational.ts` includes semantic search, app help, source lookup, company knowledge, communications, schedule, vendor, RFI/submittal, and structured financial row helpers.
- `frontend/src/lib/ai/tools/financial.ts` includes commitments, change orders, direct costs, budget lines, trends, and margin analysis.
- `frontend/src/lib/ai/tools/acumatica.ts` and Acumatica sync tables/tools must remain available.
- `frontend/src/lib/ai/services/ai-memory-service.ts`, `conversation-memory.ts`, and `memory-extraction.ts` preserve memory behavior.
- `frontend/src/components/ai-assistant/rag-chat-page.tsx` and `chat-area.tsx` own the visible chat experience.
- `frontend/src/app/api/ai-assistant/messages/[sessionId]/route.ts` reloads `chat_history.metadata`, so new metadata must be compact and backward compatible.

Key current failure signal:

- `frontend/src/app/api/ai-assistant/chat/route.ts` currently sets `modelTools = undefined` around the main `streamText` call because OpenAI tool calls through AI Gateway previously produced empty text with `finishReason: other`.
- The route compensates with deterministic retrieval, source-specific RAG, source-grounded synthesis, and no-tool retry paths.
- This is a workaround, not a proven final architecture.

### Existing Capabilities To Preserve

Do not replace these. Fold them into a coherent intelligence system:

- Memory and conversation continuity.
- Company knowledge and app help.
- Structured project tools.
- Financial analysis and Acumatica/ERP analysis.
- Project/portfolio/risk/operations tools.
- Raw source lookup for Teams, email, meetings, documents, OneDrive, and document rows.
- Specialist CFO/COO/CRO/CHRO/VPBD analysis flows.
- Write tools and action previews/audit semantics.
- Source citations, trace panel, timeline, and `chat_history.metadata.response_quality`.

## Documentation Research

Current installed package versions observed:

- `frontend/package.json`: `ai` `^6.0.105`, `@ai-sdk/openai` `^3.0.25`, `@ai-sdk/react` `^3.0.71`, `openai` `^6.17.0`.
- `frontend/node_modules/ai/docs/` exists and is the local source of truth for AI SDK behavior.
- Current AI Gateway model list includes `openai/gpt-5.5`, `openai/gpt-5.4`, `openai/gpt-5.4-mini`, `openai/o4-mini`, and embeddings models as of 2026-04-30.

Primary doc facts:

- AI SDK tool calling supports `generateText`, `streamText`, `tools`, and `stopWhen`.
- AI SDK multi-step calls with `stopWhen` send tool results back to the model until no more tool calls or a stop condition is met.
- `streamText` can return `toUIMessageStreamResponse()` / UI message streams and has `onError`, `onStepFinish`, `experimental_onStepStart`, `experimental_onToolCallStart`, and `experimental_onToolCallFinish` hooks.
- `ToolLoopAgent` wraps the same tool-loop behavior and defaults to `stepCountIs(20)`.
- Vercel AI Gateway is the default provider for string model IDs and supports model IDs like `openai/gpt-5.4`.
- Direct OpenAI provider remains the documented path through `@ai-sdk/openai`.
- Raw OpenAI function calling is a multi-step application loop: provide tools, receive tool call, execute locally, send tool output, receive final response.

Doc/source references:

- `frontend/node_modules/ai/docs/03-ai-sdk-core/15-tools-and-tool-calling.mdx`
- `frontend/node_modules/ai/docs/03-ai-sdk-core/05-generating-text.mdx`
- `frontend/node_modules/ai/docs/03-agents/02-building-agents.mdx`
- `frontend/node_modules/ai/docs/03-agents/04-loop-control.mdx`
- `frontend/node_modules/ai/docs/02-getting-started/02-nextjs-app-router.mdx`
- `frontend/node_modules/@ai-sdk/openai`
- `https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling`
- `https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text`
- `https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text`
- `https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent`
- `https://ai-sdk.dev/providers/ai-sdk-providers/openai`
- `https://vercel.com/docs/ai-gateway`
- `https://vercel.com/docs/ai-gateway/models-and-providers`
- `https://developers.openai.com/api/docs/guides/function-calling`

## Database Schema

Supabase types were regenerated before writing this PRP:

```bash
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts
```

Generated table count: 340 public tables.

All current table names from `frontend/src/types/database.types.ts`:

```text
__drizzle_migrations, _prisma_migrations, acumatica_accounts, acumatica_ap_bill_lines, acumatica_ap_bills, acumatica_ar_invoice_lines, acumatica_ar_invoices, acumatica_change_orders, acumatica_checks, acumatica_customers, acumatica_outbound_audit_logs, acumatica_payment_applications, acumatica_payments, acumatica_project_budgets, acumatica_project_tasks, acumatica_projects, acumatica_purchase_orders, acumatica_subcontracts, acumatica_sync_runs, acumatica_sync_state, admin_feedback_comments, admin_feedback_items, admin_view_backups, ai_analysis_jobs, ai_insights, ai_memories, ai_models, ai_tool_write_audits, app_crawl_sessions, app_pages, app_parity_checks, app_roles, app_schedule_bulk_operations, app_schedule_task_hierarchy, app_system_actions, app_system_states, app_ui_components, app_ui_table_columns, app_ui_tables, asrs_blocks, asrs_configurations, asrs_decision_matrix, asrs_logic_cards, asrs_protection_rules, asrs_sections, attachments, billing_invitations, billing_periods, block_embeddings, bot_user_mappings, briefing_runs, budget_changes, budget_forecast_line_items, budget_line_forecasts, budget_line_history, budget_line_item_history, budget_lines, budget_mod_lines, budget_modification_lines, budget_modifications, budget_snapshots, budget_view_columns, budget_views, cco_attachments, change_event_approvals, change_event_attachments, change_event_history, change_event_line_items, change_event_pco_links, change_event_related_items, change_event_rfq_responses, change_event_rfqs, change_events, change_orders, change_workflow_comments, change_workflow_notifications, chat_history, chat_messages, chat_sessions, chat_thread_attachment_files, chat_thread_attachments, chat_thread_feedback, chat_thread_items, chat_threads, chats, chunks, code_examples, collaboration_comments, collaboration_notifications, commitment_audit_log, commitment_change_order_lines, commitment_pcos, commitment_related_items, companies, company_context, company_knowledge, contract_billing_periods, contract_change_orders, contract_documents, contract_line_items, contract_payments, contract_snapshots, contract_views, conversations, cost_code_division_updates_audit, cost_code_divisions, cost_code_types, cost_codes, cost_factors, cost_forecasts, daily_log_equipment, daily_log_manpower, daily_log_notes, daily_logs, daily_recaps, database_tables_catalog, design_recommendations, design_violations, dev_annotations, dev_panel_comments, direct_cost_line_items, direct_costs, discrepancies, distribution_group_members, distribution_groups, document_chunks, document_executive_summaries, document_group_access, document_insights, document_metadata, document_rows, document_user_access, documents, drawing_areas, drawing_change_history, drawing_downloads, drawing_markup_pins, drawing_related_items, drawing_revisions, drawing_sets, drawing_sketches, drawings, email_attachments, email_events, erp_sync_log, estimate_allowances, estimate_alternates, estimate_line_items, estimates, files, financial_contracts, fireflies_ingestion_jobs, fm_blocks, fm_cost_factors, fm_documents, fm_form_submissions, fm_global_figures, fm_global_tables, fm_optimization_rules, fm_optimization_suggestions, fm_sections, fm_sprinkler_configs, fm_table_vectors, fm_text_chunks, forecasting, forecasting_curves, graph_sync_state, group_members, groups, ingestion_jobs, initiative_cards, initiatives, insights, inspections, invoice_attachments, invoice_payments, invoicing_settings, issues, meeting_preps, meeting_segments, memories, messages, nods_page, nods_page_section, notes, notion_databases, observation_comments, observation_history, observation_photos, observation_types, observations, optimization_rules, organization_members, organizations, owner_invoice_line_items, owner_invoices, parts, payment_application_line_items, payment_transactions, pcco_attachments, pcco_line_items, pco_change_events, pco_line_items, pco_versions, people, permission_audit_log, permission_templates, person_company_templates, photo_albums, photo_links, photos, pipeline_config, potential_change_orders, prime_contract_change_order_related_items, prime_contract_change_orders, prime_contract_payment_applications, prime_contract_payments, prime_contract_pco_attachments, prime_contract_pcos, prime_contract_project_settings, prime_contract_sovs, prime_contracts, processing_queue, procore_capture_sessions, procore_components, procore_feature_implementations, procore_features, procore_modules, procore_pages, procore_screenshots, procore_tools, project_briefings, project_budget_codes, project_budget_settings, project_companies, project_directory_memberships, project_documents, project_emails, project_insights, project_notification_groups, project_photos, project_resources, project_risk_snapshots, project_role_members, project_roles, project_transmittals, project_vendors, projects, projects_audit, prospects, punch_item_comments, punch_item_template_categories, punch_item_templates, punch_items, purchase_order_attachments, purchase_order_sov_items, purchase_orders, qa_page_audit, qto_items, qtos, rag_pipeline_state, requests, review_comments, reviews, rfi_assignees, rfis, roadmap_items, schedule_deadlines, schedule_dependencies, schedule_of_values, schedule_tasks, sources, sov_line_items, specification_area_sections, specification_areas, specification_divisions, specification_section_revisions, specification_sections, specification_subscribers, specifications, sub_jobs, subcontract_attachments, subcontract_sov_items, subcontractor_contacts, subcontractor_documents, subcontractor_invoice_audit_log, subcontractor_invoice_emails, subcontractor_invoice_line_items, subcontractor_invoice_related_items, subcontractor_invoices, subcontractor_projects, subcontractor_sov_items, subcontractor_sov_submissions, subcontractors, subcontracts, submittal_analytics_events, submittal_attachments, submittal_distribution_recipients, submittal_distributions, submittal_documents, submittal_history, submittal_linked_drawings, submittal_notifications, submittal_packages, submittal_performance_metrics, submittal_responses, submittal_types, submittal_workflow_steps, submittal_workflow_templates, submittals, support_article_chunks, support_articles, sync_status, table_metadata, tasks, team_chat_channels, team_chat_messages, test_cases, test_results, test_runs, test_screenshots, test_suites, timeline_events, timesheets, todos, tool_features, tool_form_fields, transmittal_items, user_directory_permissions, user_email_notifications, user_granular_permission_overrides, user_module_permissions, user_project_preferences, user_project_roles, user_projects, user_schedule_notifications, users_auth, vendor_contacts, vertical_markup
```

### Relevant Existing Tables

`projects`

- `id: number` is the primary key. SQL FK type must be `INTEGER`.
- Relevant columns: `name`, `project_number`, `aliases`, `client`, `summary`, `summary_metadata`, `health_score`, `budget`, `budget_used`, `current_phase`, `phase`.
- Live check found Westfield Collective as `id = 43`, `project_number = 24-115`, `client = Collective Group`.

`document_metadata`

- `id: string` is the source document identifier.
- `project_id: number | null` references `projects.id`.
- Relevant columns: `title`, `type`, `category`, `source`, `source_system`, `date`, `captured_at`, `summary`, `raw_text`, `content`, `participants`, `participants_array`, `keywords`, `sentiment`, `source_metadata`, `source_web_url`, `summary_embedding`.
- Live check found `1223` rows with `project_id = 43`; recent rows include Teams DM records dated `2026-04-22`.

`document_chunks`

- Current generated type has `chunk_id: string`, `document_id: string`, `chunk_index: number`, `text`, `source_type`, `metadata`, and `embedding`.
- There is no generated `id` column. Do not create new FKs to `document_chunks.id`.
- For evidence, store `source_chunk_id text null` and either leave it as a soft reference to `document_chunks.chunk_id` or add a FK only after confirming `chunk_id` is unique in the live schema.

`ai_memories`

- `id: string`; `user_id: string`; `project_id: number | null`; `meeting_id: string | null`; `content`, `type`, `source`, `visibility`, `importance`, `confidence`, `embedding`.
- Live check found `544` rows with `project_id = 43`.

`chat_history`

- `id: string`; `session_id: string`; `user_id: string | null`; `role`; `content`; `sources: Json | null`; `metadata: Json | null`.
- Store packet metadata references compactly here. Do not store full packet JSON or large source text in chat metadata.

`project_emails`

- `id: number`; `project_id: number`; `subject`, `body`, `from_email`, `from_name`, `to_list`, `thread_id`, `received_at`, `sent_at`.
- Live check found `0` rows with `project_id = 43`, so V1 Westfield packet should lean on `document_metadata` communications and structured project tools unless email rows are backfilled.

`team_chat_messages`

- `id: string`; `channel_id: string`; `content`; `user_name`; `user_id`; `created_at`.
- This table is not project-scoped by generated type. Project-aware Teams evidence should normally come through `document_metadata` / `document_chunks` unless a channel-to-project mapping exists.

### New Tables To Add

Use generalized targets so V1 supports client projects first and internal initiatives second.

`intelligence_targets`

```sql
id uuid primary key default gen_random_uuid()
target_type text not null check (target_type in ('client_project','internal_initiative','vendor_platform','company_process'))
name text not null
slug text not null unique
description text
status text not null default 'active'
priority text
owner_person_id uuid null references people(id)
project_id integer null references projects(id)
metadata jsonb not null default '{}'
last_signal_at timestamptz
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Rules:

- `target_type = 'client_project'` requires `project_id is not null`.
- `target_type != 'client_project'` normally has `project_id is null`.
- Seed `westfield-collective` as primary V1 target with `project_id = 43`.
- Seed `jobplanner-replacement`, `ai-implementation`, and `jobplanner` only as secondary compatibility targets.

`insight_cards`

```sql
id uuid primary key default gen_random_uuid()
primary_target_id uuid not null references intelligence_targets(id)
title text not null
card_type text not null check (card_type in ('risk','decision','blocker','task','product_need','process_issue','project_update','open_question','requirement','financial_exposure','change_management','schedule_risk'))
summary text not null
why_it_matters text
current_status text not null default 'open' check (current_status in ('open','resolved','blocked','needs_review','stale','rejected'))
confidence text not null check (confidence in ('high','medium','low'))
attribution_status text not null default 'candidate' check (attribution_status in ('auto_assigned','candidate','needs_review','approved','rejected'))
suggested_owner_person_id uuid null references people(id)
suggested_owner_label text
next_action text
first_seen_at timestamptz
last_seen_at timestamptz
stale_after timestamptz
source_count integer not null default 0
compiler_version text
metadata jsonb not null default '{}'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

`insight_card_targets`

```sql
id uuid primary key default gen_random_uuid()
insight_card_id uuid not null references insight_cards(id) on delete cascade
target_id uuid not null references intelligence_targets(id)
relationship text not null
confidence text not null check (confidence in ('high','medium','low'))
attribution_status text not null default 'candidate' check (attribution_status in ('auto_assigned','candidate','needs_review','approved','rejected'))
matched_terms text[] not null default '{}'
reason text
reviewed_by uuid null references auth.users(id)
reviewed_at timestamptz
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Rules:

- Every `insight_cards.primary_target_id` must have a matching `relationship = 'primary'` target row.
- Client project references inside internal initiative conversations should be `candidate` unless evidence is project-specific.

`insight_card_evidence`

```sql
id uuid primary key default gen_random_uuid()
insight_card_id uuid not null references insight_cards(id) on delete cascade
source_document_id text null references document_metadata(id) on delete set null
source_chunk_id text null
source_type text not null
source_title text
source_occurred_at timestamptz
source_message_id text
participants text[] not null default '{}'
excerpt text
summary text
relevance_reason text not null
evidence_role text not null
confidence text not null check (confidence in ('high','medium','low'))
created_at timestamptz not null default now()
```

Rules:

- Keep excerpts short. Do not copy full Teams/email/meeting transcripts into compiled tables.
- Source of truth remains `document_metadata`, `document_chunks`, and structured project tables.

`intelligence_packets`

```sql
id uuid primary key default gen_random_uuid()
target_id uuid not null references intelligence_targets(id)
packet_type text not null default 'current' check (packet_type in ('current','snapshot','manual_gold_standard'))
packet_version text not null
generated_at timestamptz not null default now()
covered_start_at timestamptz
covered_end_at timestamptz
freshness_status text not null check (freshness_status in ('fresh','stale','partial','working_sample','failed'))
executive_summary text not null
current_status text
strategic_read text
why_it_matters text
recommended_next_moves text[] not null default '{}'
confidence_summary jsonb not null default '{}'
source_coverage jsonb not null default '{}'
review_queue_count integer not null default 0
stale_item_count integer not null default 0
packet_json jsonb not null default '{}'
compiler_version text
created_at timestamptz not null default now()
```

Rule:

- Enforce one `current` packet per target with a partial unique index:

```sql
create unique index intelligence_packets_one_current_per_target
on intelligence_packets(target_id)
where packet_type = 'current';
```

`intelligence_packet_cards`

```sql
id uuid primary key default gen_random_uuid()
packet_id uuid not null references intelligence_packets(id) on delete cascade
insight_card_id uuid not null references insight_cards(id)
section text not null
rank integer not null default 0
included_reason text
created_at timestamptz not null default now()
```

`intelligence_reviews`

```sql
id uuid primary key default gen_random_uuid()
review_type text not null
status text not null default 'open' check (status in ('open','approved','rejected','edited','deferred'))
insight_card_id uuid null references insight_cards(id) on delete cascade
target_link_id uuid null references insight_card_targets(id) on delete cascade
evidence_id uuid null references insight_card_evidence(id) on delete cascade
review_reason text not null
proposed_value jsonb not null default '{}'
reviewed_value jsonb
reviewed_by uuid null references auth.users(id)
reviewed_at timestamptz
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### Required Indexes

```sql
create index intelligence_targets_project_id_idx on intelligence_targets(project_id);
create index intelligence_targets_type_slug_idx on intelligence_targets(target_type, slug);
create index insight_cards_target_status_idx on insight_cards(primary_target_id, current_status, confidence);
create index insight_card_targets_target_idx on insight_card_targets(target_id, attribution_status, confidence);
create index insight_card_evidence_card_idx on insight_card_evidence(insight_card_id, source_occurred_at desc);
create index insight_card_evidence_source_document_idx on insight_card_evidence(source_document_id);
create index intelligence_packets_current_lookup_idx on intelligence_packets(target_id, packet_type, generated_at desc);
create index intelligence_reviews_open_idx on intelligence_reviews(status, created_at);
```

### Migration Gate

If this PRP creates migrations, the executor must apply them or explicitly mark them deferred:

```bash
npm run db:types
npm run db:migrations:verify-applied -- supabase/migrations/<timestamp>_<name>.sql
```

Do not claim database completion if the migration exists only locally.

## Known Pitfalls And Prevention

### Database FK Type Mismatches

Historical error: project FKs were created as UUID when `projects.id` is INTEGER, causing silent query failures.

Prevention:

- `project_id` must be `integer`.
- `owner_person_id`, `suggested_owner_person_id`, `reviewed_by` must be UUID.
- `source_document_id` must be `text` because `document_metadata.id` is `string`.
- `source_chunk_id` must be `text` unless a live unique `document_chunks.chunk_id` FK is confirmed.

Validation:

```bash
rg "project_id uuid|project_id UUID" supabase/migrations
npm run db:types
```

### AI Gateway Tool-Calling Workaround Becoming Architecture

Historical/current risk: `modelTools = undefined` disables model tools globally in the active route because of prior Gateway empty `finishReason: other` behavior.

Prevention:

- Build the isolated validation harness first.
- Compare Gateway, direct OpenAI provider, and raw OpenAI only if needed.
- Preserve diagnostics: tool calls, tool results, final text, finish reason, raw finish reason, warnings, provider metadata, model id, and error message.
- Do not remove AI SDK or Gateway based on assumptions.

Validation:

```bash
node scripts/verify/verify_ai_tool_calling_provider_matrix.mjs
```

### Silent Source Failures

Historical risk: deterministic retrieval and fallback synthesis can make a failed source look like a normal answer.

Prevention:

- Every packet has `freshness_status`, `source_coverage`, `confidence_summary`, and `review_queue_count`.
- Failed/empty/skipped source layers must be visible in packet metadata and response metadata.
- Thin packet answers must name the gap in business language.

Validation:

```bash
npm run rag:verify:latest-briefing
npm run rag:verify:response-contract
```

### Source Contamination Across Project And Internal Initiative Context

Risk: JobPlanner/internal initiative records can mention Union Collective or Westfield and accidentally update a client-project packet.

Prevention:

- Use `intelligence_targets` and `insight_card_targets`.
- Treat project mentions inside internal initiative conversations as `candidate` related targets unless project-specific evidence exists.
- Do not update Westfield's packet from unrelated internal AI/JobPlanner planning records.

Validation:

```bash
# Created in Phase 8 — run after Phase 8 completes
node scripts/verify/verify_ai_intelligence_packet_contract.mjs
```

### Next.js Route Caching

Historical error: new route files showed 404 until `.next` was cleared.

Prevention:

- If adding new API routes, run route checks and clear `.next` before debugging 404s.

Validation:

```bash
npm run check:routes
cd frontend && rm -rf .next
```

### Next.js Async Params

Historical error: App Router `params` treated as a plain object.

Prevention:

- For any new dynamic API route, use `const { projectId } = await params`.

Validation:

```bash
cd frontend && npm run typecheck
```

### Acumatica OData Filter Failures

Historical error: Acumatica returned HTTP 500 for some `$filter` numeric/date comparisons.

Prevention:

- Preserve Acumatica tools.
- Do not add OData numeric/date filters for AI assistant financial analysis without raw endpoint testing.
- Filter in-memory where the existing client does.

Validation:

```bash
rg "\\$filter" frontend/src/lib/acumatica frontend/src/lib/ai/tools
```

### Testing Claims Without Evidence

Historical error: tests were claimed as passing without being run.

Prevention:

- Final implementation handoff must include exact commands and pass/fail output summary.
- For long-running validation, delegate to a cheaper sub-agent and require compact pass/fail report.

Validation:

```bash
npm run rag:verify:chat-architecture
npm run rag:verify:response-contract
npm run rag:verify:latest-briefing
```

## Implementation Blueprint

### Phase 0: Baseline And Tool-Calling Provider Matrix

Create `scripts/verify/verify_ai_tool_calling_provider_matrix.mjs`.

Requirements:

- Use one simple read-only tool with an obvious output, for example `getProjectSignal({ projectName })` returning `{ projectName: "Westfield Collective", projectId: 43, risk: "TCO timeline and pending cost exposure need review" }`.
- Use a prompt that requires tool use and synthesis: `Use the tool to identify the project id for Westfield Collective, then tell me the current risk in one sentence.`
- Run the same logical test across:
  1. AI SDK `generateText` + AI Gateway + OpenAI model string, e.g. `openai/gpt-5.4`.
  2. AI SDK `generateText` + direct OpenAI provider from `@ai-sdk/openai`, e.g. `openai.chat("gpt-5.4")` or documented equivalent in this installed version.
  3. AI SDK `streamText` + AI Gateway.
  4. AI SDK `streamText` + direct OpenAI.
  5. Raw OpenAI API only if the first four do not isolate the failure.
- Capture:
  - provider path
  - model id
  - tool call count
  - tool call names
  - tool result count
  - final text length
  - final text
  - finish reason
  - raw finish reason when available
  - warnings
  - error stack/message
- Write compact JSON to `docs/ai-plan/evals/ai-tool-calling-provider-matrix-2026-04-30.json`.

Decision rules:

- Gateway fails, direct OpenAI works: keep AI SDK and bypass Gateway for tool-heavy assistant calls.
- Direct OpenAI fails too: inspect local AI SDK usage, tool schemas, message shape, streaming integration, and model options.
- Raw OpenAI fails too: inspect model/tool schema compatibility or switch model.
- All paths work: the local route/workflow is the problem; retire the global tool-disable workaround behind a feature flag after integration tests pass.

Validation:

```bash
node scripts/verify/verify_ai_tool_calling_provider_matrix.mjs
```

### Phase 1: Provider Routing Decision Layer

Add a small provider decision module rather than scattering conditional logic.

Target file:

- `frontend/src/lib/ai/provider-routing.ts`

Types:

```ts
export type AssistantProviderPath =
  | "ai_sdk_gateway_openai"
  | "ai_sdk_direct_openai"
  | "raw_openai";

export type AssistantToolCallingDecision = {
  providerPath: AssistantProviderPath;
  modelId: string;
  reason: string;
  validatedAt: string;
  supportsToolCalling: boolean;
  diagnosticsArtifactPath: string;
};
```

Rules:

- Use validation artifact as evidence.
- Keep text-only/non-tool calls on the existing path unless validation says otherwise.
- Use direct OpenAI for tool-heavy assistant calls only if Gateway failure is proven.
- Persist selected provider path into `chat_history.metadata.provider_path`.

Validation:

```bash
cd frontend && npm run typecheck
```

### Phase 2: Intelligence Schema Migration

Create a migration for:

- `intelligence_targets`
- `insight_cards`
- `insight_card_targets`
- `insight_card_evidence`
- `intelligence_packets`
- `intelligence_packet_cards`
- `intelligence_reviews`
- trigger/update helpers for `updated_at`
- indexes and one-current-packet unique index
- RLS policies consistent with existing AI/memory access patterns

RLS minimum:

- Authenticated users can read client-project intelligence only for accessible projects unless admin/service role.
- Internal initiative/vendor/company process targets should be admin-only in V1 unless a broader visibility model is explicitly added.
- Service role can insert/update compiler records.

Validation:

```bash
npm run db:types
npm run db:migrations:verify-applied -- supabase/migrations/<timestamp>_ai_intelligence_packets.sql
cd frontend && npm run typecheck
```

### Phase 3: Seed Westfield Collective Packet

Create a seed/backfill script under `scripts/seed-db/`.

Target file:

- `scripts/seed-db/seed-westfield-intelligence-packet.mjs`

Seed:

- `intelligence_targets`: Westfield Collective as `client_project`, `project_id = 43`.
- `intelligence_packets`: one `manual_gold_standard` and one `current` packet.
- `insight_cards`: at least one card in each required category:
  - project status
  - financial exposure
  - change-management risk
  - schedule/operational risk
  - decision/open question
  - likely missed follow-up
- `insight_card_evidence`: link to real `document_metadata.id` rows where available; use concise excerpts/summaries only.
- `intelligence_reviews`: create review rows for candidate/uncertain evidence and any source gaps.

Use current live evidence:

- `projects.id = 43`
- `document_metadata.project_id = 43` has substantial coverage.
- `ai_memories.project_id = 43` has substantial coverage.
- `project_emails.project_id = 43` returned zero in a live check, so packet source coverage must say email project table is missing/empty unless document metadata email records are found.

Validation:

```bash
node scripts/seed-db/seed-westfield-intelligence-packet.mjs --dry-run
node scripts/seed-db/seed-westfield-intelligence-packet.mjs
# verify_ai_intelligence_packet_contract.mjs is created in Phase 8 — run after Phase 8 completes
node scripts/verify/verify_ai_intelligence_packet_contract.mjs --target westfield-collective
```

### Phase 4: Packet Access Layer

Create a typed service for packet reads.

Target file:

- `frontend/src/lib/ai/intelligence/packet-service.ts`

Exports:

```ts
export type IntelligenceTargetType =
  | "client_project"
  | "internal_initiative"
  | "vendor_platform"
  | "company_process";

export type PacketFreshnessStatus =
  | "fresh"
  | "stale"
  | "partial"
  | "working_sample"
  | "failed";

export async function resolveIntelligenceTarget(input: {
  query: string;
  selectedProjectId?: number;
  supabase: SupabaseClient;
}): Promise<ResolvedIntelligenceTarget | null>;

export async function loadCurrentIntelligencePacket(input: {
  targetId: string;
  supabase: SupabaseClient;
}): Promise<ClientProjectIntelligencePacket | null>;

export async function loadPacketCards(input: {
  targetId: string;
  supabase: SupabaseClient;
  includeCandidate?: boolean;
}): Promise<InsightCard[]>;
```

Rules:

- Resolve selected project first when the user says "this project".
- Resolve exact named client project before internal initiatives.
- Never ask the user for a project id if a name/project selector can resolve it.
- Keep packet JSON shape typed in `frontend/src/lib/ai/intelligence/types.ts`.

Validation:

```bash
cd frontend && npm run typecheck
npm run rag:verify:response-contract
```

### Phase 5: Intent Router And Packet-First Assistant Path

Add or extend intent routing.

Target file:

- `frontend/src/lib/ai/intent-router.ts`

Minimum intents:

```ts
export type AssistantIntent =
  | "target_briefing"
  | "latest_status"
  | "risk_review"
  | "financial_analysis"
  | "change_management_review"
  | "decision_lookup"
  | "task_followup"
  | "source_lookup"
  | "strategy_brainstorm"
  | "implementation_planning"
  | "app_help"
  | "general_conversation";
```

Wire into:

- `frontend/src/app/api/ai-assistant/chat/route.ts`

Behavior:

- For `target_briefing`, `latest_status`, `risk_review`, `financial_analysis`, `change_management_review`, `decision_lookup`, and `task_followup`, resolve target and load packet before raw RAG.
- For `source_lookup`, preserve current source-specific RAG and raw lookup tools.
- For `app_help`, preserve app-help path and avoid project intelligence unless needed.
- For `strategy_brainstorm`, use packet as background if a target is present, but do not force report format.

Validation:

```bash
cd frontend && npm run test:unit -- src/lib/ai/__tests__/intent-router.test.ts
npm run rag:verify:source-specific
npm run rag:verify:latest-briefing
```

### Phase 6: Advisor Synthesis Contract

Create a synthesis module that turns packets into business answers.

Target file:

- `frontend/src/lib/ai/intelligence/advisor-synthesis.ts`

Response shape for project status:

1. Current read.
2. What changed recently.
3. Financial/change-management exposure.
4. Schedule/operational risk.
5. Decisions/open questions/follow-ups.
6. Recommended next action.
7. Evidence basis and confidence.
8. Gaps, only if relevant.

Rules:

- Do not lead with "I found X results".
- Do not expose "RAG", "tool call", "retrieval", or provider internals unless the user asks about the AI system.
- Separate fact, inference, and open question when attribution is uncertain.
- Use structured project/financial tools for formal costs and communication evidence for early-warning signals.

Validation:

```bash
# verify_ai_advisor_quality.mjs is created in Phase 8 — run after Phase 8 completes
node scripts/verify/verify_ai_advisor_quality.mjs --prompt "What's the latest on Westfield Collective?"
```

### Phase 7: Preserve And Re-Enable Tool Loop Safely

After Phase 0 proves the provider path:

- If tools are safe through Gateway/direct path, replace global `modelTools = undefined` with a provider-decision branch.
- Limit active tools by intent. Do not pass every tool for every turn.
- For packet-first project advisor questions, active tools should be small:
  - packet read
  - structured project snapshot
  - financial exposure/check tools
  - raw evidence lookup only when needed
  - specialist consult only when required
- Keep write tools behind existing preview/approval/audit patterns.

Validation:

```bash
npm run rag:verify:chat-architecture
npm run rag:verify:response-contract
cd frontend && npm run test:unit -- src/lib/ai/__tests__/strategist-failure-response.test.ts
```

### Phase 8: Evals And Browser Verification

Create:

- `scripts/verify/verify_ai_intelligence_packet_contract.mjs`
- `scripts/verify/verify_ai_advisor_quality.mjs`
- `frontend/src/lib/ai/__tests__/intelligence-packet-service.test.ts`
- `frontend/src/lib/ai/__tests__/advisor-synthesis.test.ts`

Golden prompts:

- `What's the latest on Westfield Collective?`
- `What should I be worried about financially on Westfield Collective?`
- `Are there any change order issues I need to know about on Westfield?`
- `What follow-ups are likely being missed?`
- `What decisions were made about this project in meetings this week?`
- `What source evidence supports that?`
- `What's the latest on JobPlanner replacement?` secondary compatibility only.
- `Is the JobPlanner conversation related to Union Collective?` secondary attribution test only.

Browser verification:

```bash
npm run verify:browser -- --name ai-westfield-packet-first --url http://localhost:3000/ai-assistant
```

Required artifacts:

- `frontend/tests/agent-browser-runs/<timestamp>-ai-westfield-packet-first/VERIFICATION_SUMMARY.md`
- screenshots before/after asking Westfield prompt
- session video
- action log

## Acceptance Criteria

### Tool Validation

- Provider matrix artifact exists and records pass/fail for Gateway, direct OpenAI, and raw OpenAI if needed.
- The team can state the actual failure mode: Gateway, direct provider, raw OpenAI/model compatibility, tool schema/message shape, or local route code.
- Any decision to keep Gateway, bypass Gateway for tool-heavy calls, or fix local usage is documented in code comments and the validation artifact.

### Data Layer

- Fresh Supabase types include all new intelligence tables.
- `project_id` FKs are INTEGER.
- `source_document_id` matches `document_metadata.id` type.
- Migration application is verified against the remote ledger.
- Westfield target, current packet, manual gold-standard packet, insight cards, evidence links, and review items exist.

### Assistant Behavior

- Project advisor prompts load packet first.
- Source lookup prompts still use raw source search.
- Missing packet response is honest and useful.
- Stale packet response uses packet as baseline and checks newer source evidence.
- Thin packet response names source gaps without sounding broken.
- The assistant preserves existing memory, financial, Acumatica, company knowledge, app help, source lookup, and specialist analysis tools.

### Westfield V1

For `What's the latest on Westfield Collective?`, answer includes:

- direct current status
- recent change summary
- financial/change-management exposure
- schedule/operational risk
- decisions/open questions/follow-ups
- recommended next action
- evidence basis and confidence
- clear caveat if source coverage is stale, partial, or working sample

### Guardrails

- No silent source failures.
- No generic error messages.
- No full raw transcript copying into compiled intelligence tables.
- No internal initiative evidence auto-updates a client-project packet without project-specific confidence.
- No new AI answer claims are marked verified without command/browser evidence.

## Validation Commands

Short targeted checks:

```bash
node scripts/verify/verify_ai_tool_calling_provider_matrix.mjs
node scripts/verify/verify_ai_intelligence_packet_contract.mjs --target westfield-collective
npm run rag:verify:chat-architecture
npm run rag:verify:response-contract
npm run rag:verify:source-specific
npm run rag:verify:latest-briefing
cd frontend && npm run typecheck
```

Focused unit tests:

```bash
cd frontend && npm run test:unit -- \
  src/lib/ai/__tests__/intelligence-packet-service.test.ts \
  src/lib/ai/__tests__/advisor-synthesis.test.ts \
  src/lib/ai/__tests__/score-response-quality.test.ts \
  src/lib/ai/__tests__/strategist-failure-response.test.ts
```

Browser evidence:

```bash
npm run verify:browser -- --name ai-westfield-packet-first --url http://localhost:3000/ai-assistant
```

Long-running checks should be delegated to a cheaper sub-agent:

```bash
cd frontend && npm run build
cd frontend && npm run lint:errors
```

Sub-agent report must include:

- pass/fail status
- exact failing command
- concise error lines only
- likely owner files
- related/unrelated classification

## Implementation Task List

1. Generate and review Supabase types.
2. Create tool-calling provider matrix verifier.
3. Run provider matrix and record artifact.
4. Add provider routing decision type/module.
5. Create intelligence schema migration.
6. Apply migration and verify remote ledger.
7. Regenerate Supabase types and update typed packet contracts.
8. Seed Westfield Collective target and packet.
9. Seed secondary internal initiative compatibility targets.
10. Add packet service and target resolver.
11. Add intent router or extend current detection into one shared module.
12. Add packet-first assistant path in chat route.
13. Add advisor synthesis contract.
14. Preserve source-specific RAG path for exact lookup questions.
15. Preserve memory, Acumatica, financial, company knowledge, app help, and specialist tools.
16. Add packet contract verifier.
17. Add advisor quality verifier.
18. Add focused unit tests.
19. Run targeted checks.
20. Run browser verification and save artifacts.
21. Update docs/eval artifact with provider decision and Westfield acceptance evidence.

## No Prior Knowledge Test

An implementation agent unfamiliar with this repo should be able to complete the work using:

- this PRP
- the listed planning docs
- the active code paths and file references above
- fresh Supabase types
- AI SDK local docs and official docs
- the validation commands and acceptance criteria here

The most important implementation constraint is sequencing: validate tool calling first, then implement packet-first Westfield client project intelligence. Do not reverse those steps.

## Confidence Score

8.5/10.

Why not 10/10:

- The current main route is large and has multiple overlapping fallback paths.
- The Gateway/direct provider behavior must be proven in this environment before changing the live tool path.
- Westfield has strong `document_metadata` and memory coverage, but `project_emails` returned zero for project id 43 in a live check, so the seed packet must be honest about source coverage.

Why this is implementable:

- The existing assistant already has memory, structured tools, financial tools, source search, response metadata, and project briefing snapshots.
- AI SDK docs support the intended tool loop.
- The first packet can be manually seeded before building the full compiler.
- The acceptance path is narrowed to one client project.
