# Real-Time Source Sync And Intelligence Observability PRP

Date: 2026-05-07
Status: Implementation PRP
Feature slug: `real-time-source-sync-intelligence-observability`
Confidence score: 8.5/10

## Goal

Build a reliable, near-real-time ingestion and observability system for the data sources that make the AI Assistant valuable: meeting transcripts, Outlook emails, email attachments, Teams messages, OneDrive/SharePoint documents, extracted tasks, vectorized chunks, source intelligence jobs, and project intelligence packets.

The user-facing outcome is not just "sync more often." The outcome is:

1. Source changes land in Alleato as close to real time as practical.
2. Heavy ingestion/vectorization/compiler work does not run inside site-critical request paths.
3. Every stage has durable state, timestamps, status, errors, and owner/source context.
4. Admins can see what last synced, what is waiting, what is vectorized, what is stale, what failed, and what packets/tasks were affected.
5. AI Assistant can explain when its data is fresh, stale, partial, or blocked instead of silently giving thin answers.

## Recommended Architecture

Use a hybrid event-driven architecture:

```text
Source change from Microsoft Graph / Fireflies
  -> public webhook or bounded poll trigger
  -> source event ledger / sync state update
  -> backend queue job
  -> source-specific delta fetch or transcript fetch
  -> document_metadata / project_documents / attachment rows
  -> parse / text extraction / project attribution
  -> document_chunks + embedding status
  -> task extraction + source_signal_candidates
  -> insight_cards + packet_refresh_jobs
  -> intelligence_packets
  -> AI Assistant packet-first answers + exact source lookup
  -> admin health dashboard + alerts
```

Do not implement this as only cron jobs. Cron is a safety net and renewal/reconciliation trigger. It is not the durable worker system.

## Non-Goals

- Do not replace the existing packet-first intelligence system.
- Do not replace existing Microsoft Graph source-specific sync functions.
- Do not move heavy sync/vectorization/LLM work into Vercel route handlers.
- Do not build a generic RAG platform or add Pinecone/Weaviate/LangChain.
- Do not treat OneDrive/SharePoint documents as less important than messages; they must feed the same health and packet pipeline.
- Do not surface generic "something went wrong" statuses. Every failure must name source, stage, resource, error, and next recovery path.

## Required Outcome

### Admin / Owner Visibility

Create a source and intelligence operations surface that answers:

- When did Fireflies last sync?
- When did each Outlook mailbox last sync?
- When did Teams channel and Teams DM sync last run?
- When did each OneDrive/SharePoint scope last sync?
- What changed in the last 15 minutes, hour, day, and week?
- Which sources are ingested but not vectorized?
- Which documents are vectorized but not compiled into source intelligence?
- Which high-confidence source signals are not promoted?
- Which packet refresh jobs are stale, failed, or missing output packets?
- Which projects have current packets, stale packets, partial packets, or no packet?
- Which extracted tasks were created from which source item?
- Which errors are active now and which require action?

### AI Assistant Behavior

The AI Assistant must be able to attach source/packet health to answers:

- For project-status questions, use current packets first.
- For exact evidence questions, use source lookup.
- When retrieval is empty, identify likely stage: no source rows, no project attribution, no chunks, embedding error, compiler backlog, stale packet, or missing packet.
- Persist compact health metadata in `chat_history.metadata`, not full source payloads.

## Current Repo Architecture

### Microsoft Graph Ingestion

Primary entry points:

- `backend/src/api/main.py:521` exposes `POST /api/graph/sync`.
- `backend/src/services/integrations/microsoft_graph/sync.py:94` runs Outlook, Teams channels, Teams DMs, OneDrive, and SharePoint sync.
- `frontend/src/app/api/cron/graph-sync/route.ts:25` calls the Render/FastAPI backend from Vercel cron.

Important current behavior:

- `graph_sync_state` stores `source`, `resource_id`, `resource_name`, `delta_token`, `last_sync_at`, `sync_status`, `error_message`, and `items_synced`.
- Outlook is synced per mailbox in `MICROSOFT_SYNC_USERS`.
- Teams channel sync uses Graph channel resources.
- Teams DM sync currently uses timestamp-style state under `teams_chat_export`.
- OneDrive/SharePoint use folder/scope configuration and write source metadata.
- `run_graph_sync()` currently does source sync, embedding, and Teams compiler work in one orchestration pass.

Current gap:

- This is batch-oriented and overloaded. Graph sync should become "fetch/enqueue/update ledgers," while embed, compiler, and packet refresh should run as independent bounded workers.
- OneDrive/SharePoint do not feed packet compiler as consistently as Outlook/Teams.

### Fireflies Meeting Ingestion

Primary entry points:

- `backend/src/services/scheduler.py:211` scheduled Fireflies sync.
- `backend/src/services/ingestion/fireflies_pipeline.py` is the active native backend path.
- `backend/src/api/main.py:580` exposes `/api/pipeline/process` for document pipeline processing.

Important current behavior:

- Meeting data lands in `document_metadata`.
- Vectorization uses `document_chunks` and `summary_embedding`.
- `fireflies_ingestion_jobs` tracks `stage`, `attempt_count`, `last_attempt_at`, `error_message`, and `metadata_id`.

Current gap:

- Fireflies health exists in scripts/services, but it is not unified with Microsoft Graph sync health and packet freshness in one owner-facing control plane.

### Vectorization

Primary files:

- `backend/src/services/integrations/microsoft_graph/embed.py`
- `backend/src/services/pipeline/embedder.py`
- `scripts/verify/verify_graph_embedding_contract.mjs`
- `scripts/verify/verify_meeting_vectorization_health.mjs`

Important current behavior:

- `document_chunks.chunk_id` is the identifier in generated Supabase types.
- `document_chunks.document_id` points back to `document_metadata.id` logically.
- `document_metadata.status` is used by graph embedding paths.

Current gap:

- There is no unified per-source "ingested -> text extracted -> chunked -> embedded -> compiled -> packeted" lag view.

### Task Extraction

Primary files:

- `backend/src/services/task_extraction.py:123`
- `backend/src/services/scheduler.py:178`
- `frontend/src/app/(main)/[projectId]/tasks/page.tsx`
- `frontend/src/components/tables/project-tasks-data-table.tsx`

Important current behavior:

- Tasks are stored in `public.tasks`.
- `tasks.metadata_id` links to `document_metadata.id`.
- `tasks.source_chunk_id`, `source_system`, `extraction_source`, `extraction_prompt_version`, and `extraction_metadata` are the provenance fields.

Current gap:

- Task extraction is daily by default and separate from source freshness. The dashboard must show last extraction, extracted rows, skipped rows, errors, and source lag.

### Intelligence Compiler And Packets

Primary files:

- `backend/src/services/intelligence/compiler.py:280` `get_intelligence_compiler_status()`
- `backend/src/services/intelligence/compiler.py:519` `enqueue_source_intelligence_job()`
- `backend/src/services/intelligence/compiler.py:784` `enqueue_packet_refresh()`
- `backend/src/services/intelligence/compiler.py:1158` `compile_current_packet()`
- `backend/src/services/intelligence/compiler.py:1387` `process_packet_refresh_job()`
- `backend/src/services/intelligence/compiler.py:1434` `process_source_document_to_packet()`
- `frontend/src/app/api/admin/intelligence-compiler/status/route.ts`
- `frontend/src/app/(admin)/intelligence-compiler/page.tsx`
- `frontend/src/components/ai-intelligence/intelligence-compiler-health-panel.tsx`

Important current behavior:

- Compiler health already detects stale queued/running jobs, recent failures, high-confidence unpromoted candidates, promoted candidates without cards/evidence, active cards missing current packets, and succeeded packet jobs without output.

Current gap:

- Existing compiler health does not include source sync freshness, Graph delta age, Fireflies stage health, unembedded source count, per-source lag, or task extraction health.

### AI Assistant Consumption

Primary files:

- `frontend/src/app/api/ai-assistant/chat/route.ts`
- `frontend/src/lib/ai/intent-router.ts`
- `frontend/src/lib/ai/retrieval/planner.ts`
- `frontend/src/lib/ai/retrieval/system-prompt.ts`
- `frontend/src/lib/ai/intelligence/packet-service.ts`
- `frontend/src/lib/ai/intelligence/advisor-synthesis.ts`

Important current behavior:

- Source lookup is a separate intent path.
- Packet-first project intelligence is used for project status/advisor answers.
- Stale packets older than the route's threshold may be discarded.
- Metadata such as response quality/tool traces already lives in `chat_history.metadata`.

Current gap:

- Assistant answers do not yet explain whether missing answers came from source sync, project attribution, vectorization, compiler, or packet freshness.

## External Documentation Research

Use official docs as implementation constraints:

- Microsoft Graph change notifications overview: `https://learn.microsoft.com/en-us/graph/change-notifications-overview`
- Microsoft Graph webhook delivery behavior: `https://learn.microsoft.com/en-us/graph/change-notifications-delivery-webhooks`
- Microsoft Graph lifecycle notifications: `https://learn.microsoft.com/en-us/graph/change-notifications-lifecycle-events`
- Microsoft Graph throttling: `https://learn.microsoft.com/en-us/graph/throttling`
- Outlook message delta: `https://learn.microsoft.com/en-us/graph/delta-query-messages`
- Outlook `message: delta`: `https://learn.microsoft.com/en-us/graph/api/message-delta?view=graph-rest-1.0`
- Teams change notifications overview: `https://learn.microsoft.com/en-us/graph/teams-change-notification-in-microsoft-teams-overview`
- Teams chatMessage notifications: `https://learn.microsoft.com/en-us/graph/teams-changenotifications-chatmessage`
- Teams chatMessage delta: `https://learn.microsoft.com/en-us/graph/api/chatmessage-delta?view=graph-rest-1.0`
- OneDrive/SharePoint driveItem delta: `https://learn.microsoft.com/en-us/graph/api/driveitem-delta?view=graph-rest-1.0`
- Vercel Cron Jobs usage/pricing: `https://vercel.com/docs/cron-jobs/usage-and-pricing`
- Vercel Functions limits: `https://vercel.com/docs/functions/limitations`

Implementation implications:

- Graph webhook endpoints must be public HTTPS and respond to `validationToken` in plain text.
- Webhook endpoints must return `200` or `202` quickly; target under 3 seconds.
- Graph retries non-2xx webhook responses for up to 4 hours with exponential backoff.
- Slow webhook endpoints can be throttled, delayed, or dropped.
- Validate `clientState` on every notification.
- Subscription lifecycle events must trigger renewal or delta/backfill.
- Renew subscriptions before expiry with `PATCH /subscriptions/{id}`.
- Do not call reauthorize and renewal for the same subscription inside the same 10-minute window.
- Outlook message delta is per folder. Complete mailbox coverage requires tracking the chosen folders/resources.
- Teams chat message delta has retention/window constraints; do not rely on it as a permanent source of truth.
- Teams chatMessage subscriptions with longer expiry requirements need lifecycle notification handling.
- driveItem delta returns latest state, not every intermediate edit.
- Vercel cron should only call backend endpoints. The real work belongs in FastAPI/background workers.

## Database Schema

Supabase types were regenerated before this PRP was written:

```bash
npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts
```

Generated types confirm the public schema contains 340+ tables. The implementation must use `frontend/src/types/database.types.ts` as the source of truth and verify any migration against these current types.

### FK Type Requirements

- `projects.id` is `number`; all `project_id` FKs must be SQL `integer`.
- `people.id` is `string`; all `person_id` / `owner_person_id` FKs must be SQL `uuid`.
- `document_metadata.id` is `string`; source document FKs must be SQL `uuid` if referencing the table directly.
- `document_chunks.chunk_id` is `string`; do not reference a non-existent `document_chunks.id`.
- `project_documents.id` is `number`; references to project documents must be SQL `integer`.
- `tasks.id` is `string`; task references should be SQL `uuid`.

### Relevant Current Tables

`graph_sync_state`

- Primary state for Microsoft Graph incremental sync.
- Columns: `id: string`, `source: string`, `resource_id: string`, `resource_name: string | null`, `delta_token: string | null`, `last_sync_at: string | null`, `sync_status: string`, `error_message: string | null`, `items_synced: number`, `created_at: string`, `updated_at: string`.
- Current gap: lacks subscription id, subscription expiry, webhook/lifecycle status, last notification time, last delta reconciliation time, and source lag metrics.

`document_metadata`

- Primary normalized source row table for transcripts, emails, Teams, and documents.
- Columns relevant to this feature: `id: string`, `project_id: number | null`, `title`, `type`, `category`, `source`, `source_system`, `source_path`, `source_item_id`, `source_drive_id`, `source_site_id`, `source_etag`, `source_last_modified_at`, `source_web_url`, `source_size`, `file_name`, `file_path`, `content`, `raw_text`, `summary`, `overview`, `source_metadata: Json`, `status`, `content_hash`, `summary_embedding`.
- Current gap: status is source-specific and not enough for unified source-stage observability without aggregation.

`document_chunks`

- Vector rows.
- Columns: `chunk_id: string`, `document_id: string`, `chunk_index: number`, `text: string`, `source_type: string | null`, `metadata: Json | null`, `embedding: unknown`, `content_hash: string | null`, `created_at`, `updated_at`.
- Current gap: no unified stage ledger maps each document to chunk/vector status and error reason.

`fireflies_ingestion_jobs`

- Meeting ingestion state.
- Columns: `id: string`, `fireflies_id: string`, `metadata_id: string | null`, `stage: string`, `attempt_count: number`, `last_attempt_at: string | null`, `error_message: string | null`, `created_at`, `updated_at`.
- Stages include pending/raw/segmented/chunked/embedded/structured/done/error behavior in migrations/code.

`source_intelligence_jobs`

- Source-to-card compiler queue.
- Columns: `id: string`, `source_document_id: string`, `source_hash: string | null`, `job_type: string`, `status: string`, `priority: number`, `target_id: string | null`, `project_id: number | null`, `compiler_version: string`, `input_snapshot: Json`, `output_summary: Json`, `attempt_count: number`, `queued_at`, `started_at`, `finished_at`, `last_error`, `created_at`, `updated_at`.

`source_signal_candidates`

- Extracted source signals before or after promotion.
- Columns: `id: string`, `source_document_id: string`, `source_chunk_id: string | null`, `signal_type: string`, `title`, `summary`, `why_it_matters`, `current_status`, `confidence`, `confidence_score`, `status`, `normalized_signal_key`, `target_id: string | null`, `project_id: number | null`, `suggested_owner_label`, `suggested_owner_person_id: string | null`, `promoted_insight_card_id: string | null`, `source_occurred_at`, `stale_after`, `extraction_json`, `compiler_version`, `created_at`, `updated_at`.

`packet_refresh_jobs`

- Packet refresh queue.
- Columns: `id: string`, `target_id: string`, `reason: string`, `status: string`, `priority: number`, `trigger_source_document_id: string | null`, `trigger_insight_card_id: string | null`, `output_packet_id: string | null`, `compiler_version`, `attempt_count`, `queued_at`, `started_at`, `finished_at`, `last_error`, `created_at`, `updated_at`.

`intelligence_packets`

- Current project intelligence packet storage.
- Columns: `id: string`, `target_id: string`, `packet_type`, `packet_version`, `freshness_status`, `current_status`, `executive_summary`, `strategic_read`, `why_it_matters`, `recommended_next_moves: string[]`, `source_coverage: Json`, `confidence_summary: Json`, `review_queue_count`, `stale_item_count`, `covered_start_at`, `covered_end_at`, `generated_at`, `compiler_version`, `packet_json`, `created_at`.

`insight_cards`

- Promoted intelligence cards.
- Columns: `id: string`, `primary_target_id: string`, `card_type`, `title`, `summary`, `why_it_matters`, `current_status`, `confidence`, `attribution_status`, `source_count`, `first_seen_at`, `last_seen_at`, `stale_after`, `next_action`, `suggested_owner_label`, `suggested_owner_person_id: string | null`, `metadata: Json`, `compiler_version`, `created_at`, `updated_at`.

`project_documents`

- Visible project document records.
- Columns: `id: number`, `project_id: number`, `title`, `file_name`, `file_url`, `source_system`, `source_drive_id`, `source_site_id`, `source_item_id`, `source_etag`, `source_last_modified_at`, `source_web_url`, `source_path`, `source_size`, `source_metadata: Json`, `sync_status`, `sync_error`, `last_synced_at`, `status`, `category`, `folder`, `workflow_target`, `storage_bucket`, `storage_path`.

`tasks`

- AI-extracted communication tasks.
- Columns: `id: string`, `metadata_id: string`, `project_id: number | null`, `project_ids: number[] | null`, `source_chunk_id: string | null`, `source_system: string`, `title`, `description`, `status`, `priority`, `due_date`, `assignee_name`, `assignee_email`, `assignee_person_id: string | null`, `assigned_by`, `extraction_source`, `extraction_model`, `extraction_prompt_version`, `extraction_metadata: Json`, `embedding`, `created_at`, `updated_at`.

### Schema Changes To Add

Add additive migrations only. Do not mutate existing hot tables destructively.

Recommended new/extended tables:

1. `source_sync_runs`
   - Purpose: historical run ledger across Graph, Fireflies, task extraction, embedding, compiler, subscription renewal, and reconciliation.
   - Required fields: `id uuid`, `source text`, `resource_id text`, `resource_name text`, `run_type text`, `status text`, `started_at`, `finished_at`, `duration_ms integer`, `items_seen integer`, `items_changed integer`, `items_inserted integer`, `items_updated integer`, `items_skipped integer`, `items_failed integer`, `error_message text`, `error_code text`, `metadata jsonb`.

2. `source_sync_health_snapshots`
   - Purpose: fast dashboard read model.
   - Required fields: `id uuid`, `source text`, `resource_id text`, `resource_name text`, `status text`, `last_notification_at`, `last_delta_sync_at`, `last_successful_sync_at`, `last_error_at`, `last_error_message`, `last_item_seen_at`, `last_item_ingested_at`, `unprocessed_count integer`, `unembedded_count integer`, `uncompiled_count integer`, `stale_minutes integer`, `metadata jsonb`, `updated_at`.

3. `graph_subscriptions`
   - Purpose: Microsoft Graph subscription lifecycle and renewal.
   - Required fields: `id uuid`, `subscription_id text unique`, `source text`, `resource text`, `resource_id text`, `change_type text`, `notification_url text`, `lifecycle_notification_url text`, `client_state_hash text`, `expires_at timestamptz`, `status text`, `last_renewed_at`, `last_notification_at`, `last_lifecycle_event_at`, `last_error_message`, `metadata jsonb`.

4. `source_processing_jobs`
   - Purpose: optional generalized worker queue if current source-specific queue tables are too fragmented.
   - Required fields: `id uuid`, `source text`, `source_document_id uuid null references document_metadata(id)`, `project_id integer null references projects(id)`, `job_type text`, `status text`, `priority integer`, `attempt_count integer`, `queued_at`, `started_at`, `finished_at`, `last_error`, `input_snapshot jsonb`, `output_summary jsonb`.
   - If this is too much for V1, use existing `source_intelligence_jobs`, `packet_refresh_jobs`, `fireflies_ingestion_jobs`, and `graph_sync_state`, then create read-model APIs over them.

5. Add columns to `graph_sync_state` if preferred over a new table:
   - `subscription_id text null`
   - `subscription_expires_at timestamptz null`
   - `last_notification_at timestamptz null`
   - `last_delta_reconciliation_at timestamptz null`
   - `last_successful_sync_at timestamptz null`
   - `metadata jsonb not null default '{}'`

## Known Pitfalls And Prevention

### Supabase Type Drift And FK Mismatches

Historical error: `project_id` was treated as UUID/string in places where `projects.id` is integer.

Prevention:

- Generate Supabase types before any database work.
- Confirm `project_id` is `number` in TypeScript and `integer` in SQL.
- Confirm `person_id` / `owner_person_id` values reference `people.id` as UUID/string.

Validation:

```bash
npm run db:types
rg -n "project_id.*uuid|project_id: string" supabase/migrations frontend/src
```

### Next.js Route Param Conflicts

Historical error: generic `[id]` routes caused conflicts/404s.

Prevention:

- Never add generic `[id]`.
- Use `[projectId]`, `[subscriptionId]`, `[runId]`, `[sourceDocumentId]`, `[taskId]`, or `[recordId]`.

Validation:

```bash
npm run check:routes
```

### Stale Next.js Cache After New Routes

Historical error: valid pages/API routes looked missing because `.next` was stale.

Prevention:

- Clear cache before debugging 404s for new admin/source health routes.

Validation:

```bash
cd frontend && rm -rf .next
npm run dev
```

### Claimed Verification Without Evidence

Historical error: tests were claimed as passing without execution.

Prevention:

- Verification must include command output and/or artifact paths.
- Browser/admin UI verification must produce `agent-browser` screenshots/video/summary.

Validation:

```bash
npm run verify:browser
```

### Playwright `networkidle` Timeouts

Historical error: tests hung on `networkidle` because modern app connections do not go idle.

Prevention:

- Use `domcontentloaded` or wait for specific elements.

Validation:

```bash
rg -n "networkidle" frontend/tests scripts
```

### Silent Pipeline Failures

Historical error: ingestion/vectorization/provider failures were hidden behind fallback behavior.

Prevention:

- Every source stage must write durable status and error details.
- A working fallback does not make a configured failing provider/source healthy.
- Dashboard and assistant metadata must surface degraded state.

Validation:

```bash
npm run rag:verify:meetings
node scripts/verify/verify_graph_embedding_contract.mjs
node scripts/verify/verify_ai_intelligence_compiler_health.mjs
```

### Vercel Cron Used As Worker

Risk: Vercel cron/function limits make it the wrong place for long syncs.

Prevention:

- Vercel cron route may trigger FastAPI only.
- FastAPI/Render worker owns sync, queue, retry, and long processing.
- Any webhook handler should respond quickly and enqueue work.

Validation:

```bash
rg -n "embed_pending_graph_documents|run_compiler_batch|run_task_extraction" frontend/src/app/api/cron frontend/src/app/api/webhooks
```

## Implementation Tasks

### Phase 0: Baseline And Evidence

1. Regenerate Supabase types and preserve current schema context.
   - Command: `npm run db:types`
   - Verify relevant tables: `graph_sync_state`, `document_metadata`, `document_chunks`, `fireflies_ingestion_jobs`, `source_intelligence_jobs`, `source_signal_candidates`, `packet_refresh_jobs`, `intelligence_packets`, `project_documents`, `tasks`.

2. Run current health verifiers to capture baseline.
   - Commands:
     - `npm run rag:verify:meetings`
     - `node scripts/verify/verify_graph_embedding_contract.mjs`
     - `node scripts/verify/verify_ai_intelligence_compiler_health.mjs`
   - If long-running, delegate to a cheaper verification sub-agent.

3. Record current source freshness metrics with a temporary SQL/script report.
   - Count source rows by `document_metadata.source_system`.
   - Count unembedded documents by source.
   - Count compiler jobs by status.
   - Count packet freshness by project target.

### Phase 1: Source Health Read Model

1. Add additive migration for `source_sync_runs`, `source_sync_health_snapshots`, and `graph_subscriptions` or equivalent minimal extensions to `graph_sync_state`.
   - SQL files under `supabase/migrations/`.
   - Use `integer` for `project_id` if included.
   - Use UUID for references to `document_metadata`, `people`, and job ids.

2. Add backend service module:
   - `backend/src/services/health/source_sync_health.py`
   - Functions:
     - `record_sync_run(...)`
     - `update_source_health_snapshot(...)`
     - `get_source_sync_health(...)`
     - `detect_source_sync_alerts(...)`

3. Extend existing paths to write run/health rows:
   - `backend/src/services/integrations/microsoft_graph/sync.py`
   - `backend/src/services/ingestion/fireflies_pipeline.py`
   - `backend/src/services/integrations/microsoft_graph/embed.py`
   - `backend/src/services/task_extraction.py`
   - `backend/src/services/intelligence/compiler.py`

4. Add backend API:
   - `GET /api/health/source-sync`
   - `POST /api/health/source-sync/recompute`
   - Protect with `require_admin_api_key`.

Validation:

```bash
backend/.venv/bin/python -m pytest backend/tests -k "source_sync_health"
curl -H "x-admin-api-key: $ADMIN_API_KEY" "$PYTHON_BACKEND_URL/api/health/source-sync"
```

### Phase 2: Frontend Admin Control Plane

1. Add Next.js proxy routes:
   - `frontend/src/app/api/admin/source-sync/status/route.ts`
   - `frontend/src/app/api/admin/source-sync/recompute/route.ts`
   - Use `withApiGuardrails`, `parseJsonBody`, `validateResponseContract`, and admin gating.

2. Add UI page:
   - `frontend/src/app/(admin)/source-sync/page.tsx`
   - Reuse `PageContainer` / app admin shell patterns.
   - Do not use nested cards or page-level decorative wrappers.

3. Add component:
   - `frontend/src/components/ai-intelligence/source-sync-health-panel.tsx`
   - Sections:
     - Source freshness table
     - Active alerts
     - Ingested/not embedded/not compiled counts
     - Last sync and delta age
     - Last task extraction status
     - Packet freshness by project
     - Manual safe triggers: recompute health, run compiler, run graph sync, run embed pending

4. Link from the existing intelligence compiler admin page or admin navigation.

Validation:

```bash
npm run check:routes
cd frontend && npm run typecheck -- --pretty false
npm run verify:browser
```

### Phase 3: Decouple Graph Sync From Heavy Processing

1. Refactor `run_graph_sync()` so source fetching can run without embedding/compiler work.
   - Add options object, for example `run_graph_sync(supabase, *, embed_after=False, compile_after=False, enqueue_after=True)`.
   - Default scheduler can still choose enqueue behavior.

2. Add separate backend worker endpoints:
   - `POST /api/graph/embed-pending`
   - `POST /api/intelligence/compiler/run`
   - Existing endpoints can be reused, but source health must track each stage separately.

3. Ensure Outlook, Teams, OneDrive, and SharePoint all enqueue source intelligence consistently after source rows are present.
   - If immediate `process_source_document_to_packet()` is too heavy, enqueue `source_intelligence_jobs`.
   - OneDrive/SharePoint must not remain vectorization-only if documents are project-relevant.

4. Keep `frontend/src/app/api/cron/graph-sync/route.ts` as a trigger-only route.
   - It should call backend Graph sync and optionally backend enqueue endpoints.
   - It should not run heavy work directly.

Validation:

```bash
node scripts/verify/verify_graph_embedding_contract.mjs
node scripts/verify/verify_ai_intelligence_compiler_health.mjs
```

### Phase 4: Microsoft Graph Webhook And Delta Architecture

1. Add backend webhook endpoint:
   - `POST /api/graph/webhooks/notifications`
   - Must handle validation token response exactly as Graph requires.
   - Must validate `clientState`.
   - Must enqueue work and return fast.

2. Add lifecycle endpoint if using separate URL:
   - `POST /api/graph/webhooks/lifecycle`
   - Handle missed/reauthorization/subscriptionRemoved events.

3. Add subscription management service:
   - `backend/src/services/integrations/microsoft_graph/subscriptions.py`
   - Functions:
     - `ensure_subscriptions()`
     - `renew_expiring_subscriptions()`
     - `delete_subscription()`
     - `record_notification()`
     - `handle_lifecycle_event()`

4. Track subscriptions in `graph_subscriptions`.

5. Source-specific subscription plan:
   - Outlook: subscribe to mailbox/folder message changes where supported; use delta for reconciliation.
   - Teams: subscribe to channel/chat message changes where permissions allow; use delta/reconciliation and record unsupported scopes explicitly.
   - OneDrive/SharePoint: subscribe to driveItem root/folder hierarchy changes; use deltaLink to fetch final state.

6. Add scheduled renewal/reconciliation:
   - APScheduler on Render should renew subscriptions and run delta reconciliation.
   - Vercel cron can hit a lightweight Render endpoint if needed.

Validation:

```bash
backend/.venv/bin/python -m pytest backend/tests -k "graph_subscription"
curl -i "$PYTHON_BACKEND_URL/api/graph/webhooks/notifications?validationToken=test-token"
```

### Phase 5: Task Extraction Provenance And Freshness

1. Extend task extraction run health.
   - Record run rows in `source_sync_runs` with `run_type = task_extraction`.
   - Include docs found, processed, inserted, skipped, errors.

2. Add task provenance UI in tasks table/detail.
   - Show source system, source document, source excerpt if present, extraction run, confidence/review status where available.

3. Add freshness alert:
   - If new source docs exist but no task extraction ran within threshold, raise an alert.

Validation:

```bash
backend/.venv/bin/python -m pytest backend/tests -k "task_extraction"
cd frontend && npm run typecheck -- --pretty false
```

### Phase 6: Assistant Health Awareness

1. Add a compact health lookup service:
   - `frontend/src/lib/ai/source-health.ts`
   - Reads admin/source sync status through server-side Supabase/backend call.

2. In `frontend/src/app/api/ai-assistant/chat/route.ts`, attach health context only when:
   - packet is missing/stale/thin,
   - source lookup returns low/empty results,
   - user asks about freshness/sync/vectorization/status.

3. Persist compact metadata:
   - `chat_history.metadata.source_health`
   - Include source statuses, stale flags, missing stage, and generatedAt only.

4. Update response contract:
   - "I have no evidence" must become "I found no matching vectorized source rows; current health shows Teams DM sync is stale / Graph embedding has errors / packet refresh is queued."

Validation:

```bash
npm run rag:verify:assistant-routing
npm run rag:verify:source-specific
node scripts/verify/verify_ai_advisor_quality.mjs
```

### Phase 7: Alerts

1. Add alert generation in backend health service.
   - Alert types:
     - `source_sync_stale`
     - `graph_subscription_expiring`
     - `graph_subscription_removed`
     - `delta_reconciliation_failed`
     - `embedding_backlog`
     - `compiler_backlog`
     - `packet_refresh_failed`
     - `task_extraction_stale`
     - `project_attribution_backlog`

2. Route alerts to existing admin inbox if appropriate:
   - Search current `admin_feedback_items` / annotation inbox patterns before creating new alert UI.
   - If adding a new table, keep it generic: `system_alerts`.

3. UI should show active alerts on `/admin/source-sync` and project intelligence page where relevant.

Validation:

```bash
node scripts/verify/verify_ai_intelligence_compiler_health.mjs
```

## Acceptance Criteria

- Admin can open one page and see sync/vector/compiler/task/packet health without checking Render logs.
- Every source has last sync, last success, last error, item counts, and lag.
- Every processing stage has queued/running/failed/stale counts.
- Outlook, Teams, OneDrive/SharePoint, Fireflies, task extraction, vectorization, and packet refresh are all represented.
- Graph webhook endpoint validates `validationToken` and returns quickly.
- Graph subscription state and renewal are visible.
- OneDrive/SharePoint project documents can feed source intelligence and packet refresh, not only raw vector search.
- Assistant can state whether missing/thin answers are caused by sync, attribution, vectorization, compiler, packet freshness, or actual absence of source evidence.
- All database schema changes are applied and ledger-verified.

## Validation Gates

Short targeted gates:

```bash
npm run db:types
npm run check:routes
cd frontend && npm run typecheck -- --pretty false
node scripts/verify/verify_graph_embedding_contract.mjs
node scripts/verify/verify_ai_intelligence_compiler_health.mjs
npm run rag:verify:source-specific
npm run rag:verify:assistant-routing
```

Migration gate for any new SQL:

```bash
npm run db:migrations:verify-applied -- supabase/migrations/<timestamp>_<name>.sql
```

Browser evidence:

```bash
npm run verify:browser
```

Long-running gates should be delegated to a cheaper sub-agent:

```bash
cd frontend && npm run build
npm run test
```

## Rollout Plan

1. Ship read-only health aggregation first.
2. Add admin UI and alerts second.
3. Decouple Graph sync heavy processing third.
4. Add webhook/subscription management fourth.
5. Add assistant health-aware responses last.

This ordering prevents blind architecture changes. First make the current pipeline visible, then change it.

## Risks

- Microsoft Graph permission gaps may prevent full Teams DM or rich notification coverage. The system must report unsupported/permission-blocked scopes explicitly.
- Graph subscriptions expire and missed notifications are possible. Delta reconciliation is required.
- Vercel function limits can cut off long processing. Keep work in FastAPI/background workers.
- Existing repo warning debt may block full quality gates. Use targeted gates and record unrelated blockers.
- Dirty migration ledger may block applying new migrations. Apply exact migrations deliberately and verify ledger state.

## No Prior Knowledge Checklist

- The executing agent has file paths for every current ingestion, compiler, assistant, and admin route surface.
- The executing agent has current schema/FK requirements.
- The executing agent has official Graph/Vercel documentation constraints.
- The executing agent has phased implementation tasks with validation commands.
- The executing agent has known pitfalls and prevention rules.

## Confidence Score

8.5/10.

Reason: the repo already has most ingestion, vectorization, compiler, packet, and admin building blocks. The main uncertainty is Microsoft Graph subscription coverage and tenant permissions for Teams/DM scopes. The PRP mitigates that by requiring explicit unsupported-scope health states and delta reconciliation.
