# Real-Time Source Sync And Intelligence Observability Tasks

Source PRP: `docs/PRPs/real-time-source-sync-intelligence-observability/prp-real-time-source-sync-intelligence-observability.md`

## Progress Summary

- Status: Phase 1 producer wiring, Phase 2 manual actions, Phase 3 Graph phase options, Phase 4 webhook/subscription lifecycle foundation, and Phase 6 assistant health awareness implemented
- Current phase: Source health read model, run ledger wiring, fetch-only Graph sync, separate Graph embedding scheduler, webhook/lifecycle intake, subscription reconcile, opt-in Teams/drive targets, assistant source-health metadata, and durable system alert routing are live
- Last updated: 2026-05-07 22:24 UTC
- Confidence score: 8.7/10
- Required first implementation slice: read-only health aggregation before webhook changes

## Phase 0: Baseline And Evidence

- [x] Run `npm run db:types`.
- [x] Verify schema types for `graph_sync_state`, `document_metadata`, `document_chunks`, `fireflies_ingestion_jobs`, `source_intelligence_jobs`, `source_signal_candidates`, `packet_refresh_jobs`, `intelligence_packets`, `project_documents`, and `tasks`.
- [ ] Run `npm run rag:verify:meetings`. Ran; blocked by live Fireflies summary-embedding backlog and stuck raw ingestion jobs.
- [x] Run `node scripts/verify/verify_graph_embedding_contract.mjs`.
- [ ] Run `node scripts/verify/verify_ai_intelligence_compiler_health.mjs`. Ran; blocked by stale source/packet jobs, unpromoted high-confidence candidates, and active cards missing current packets.
- [x] Capture baseline counts by source system, embedding status, compiler status, packet freshness, and task extraction state.

## Phase 1: Source Health Read Model

- [x] Create additive migration for `source_sync_runs`.
- [x] Create additive migration for `source_sync_health_snapshots`.
- [x] Create additive migration for `graph_subscriptions` or add minimal subscription columns to `graph_sync_state`.
- [x] Run exact migration application and ledger verification.
- [x] Add `backend/src/services/health/source_sync_health.py`.
- [x] Implement `record_sync_run`.
- [x] Implement `update_source_health_snapshot`.
- [x] Implement `get_source_sync_health`.
- [x] Implement `detect_source_sync_alerts`.
- [x] Wire Microsoft Graph sync to write source run/health rows.
- [x] Wire Fireflies sync to write source run/health rows.
- [x] Wire Graph embedding to write vectorization run/health rows.
- [x] Wire task extraction to write extraction run/health rows.
- [x] Wire intelligence compiler to write compiler/packet run health rows.
- [x] Add `GET /api/health/source-sync` on FastAPI.
- [x] Add `POST /api/health/source-sync/recompute` on FastAPI.
- [x] Add backend unit tests for source sync health.

## Phase 2: Frontend Admin Control Plane

- [x] Add `frontend/src/app/api/admin/source-sync/status/route.ts`.
- [x] Add `frontend/src/app/api/admin/source-sync/recompute/route.ts`.
- [x] Add `frontend/src/app/(admin)/source-sync/page.tsx`.
- [x] Add `frontend/src/components/ai-intelligence/source-sync-health-panel.tsx`.
- [x] Show source freshness by Fireflies, Outlook, Teams, Teams DM, OneDrive, and SharePoint.
- [x] Show active alerts.
- [x] Show unprocessed, unembedded, uncompiled, and stale packet counts.
- [x] Show last task extraction run and error state.
- [x] Add safe manual actions for recompute, compiler run, Graph sync, and embed pending.
- [ ] Link the page from existing admin/intelligence navigation.
- [x] Run `npm run check:routes`.
- [ ] Run `cd frontend && npm run typecheck -- --pretty false`. Attempted; blocked by existing repo-wide type debt unrelated to source-sync files.
- [x] Verify with `agent-browser` and store screenshots/video/summary.

## Phase 3: Decouple Graph Sync From Heavy Processing

- [x] Add options to `run_graph_sync()` for fetch-only/enqueue/embed/compile behavior.
- [x] Keep source sync bounded and observable.
- [x] Move embedding work to explicit pending-embedding worker path.
- [x] Move compiler work to explicit compiler queue path.
- [ ] Ensure Outlook enqueues source intelligence without blocking sync.
- [ ] Ensure Teams channel/DM enqueues source intelligence without blocking sync.
- [ ] Ensure OneDrive/SharePoint source rows enqueue source intelligence when project-relevant.
- [x] Keep `frontend/src/app/api/cron/graph-sync/route.ts` as trigger-only.
- [x] Run `node scripts/verify/verify_graph_embedding_contract.mjs`.
- [ ] Run `node scripts/verify/verify_ai_intelligence_compiler_health.mjs`. Ran; live compiler backlog remains.

## Phase 4: Microsoft Graph Webhook And Delta Architecture

- [x] Add `POST /api/graph/webhooks/notifications` on FastAPI.
- [x] Return plain-text `validationToken` for Graph validation requests.
- [x] Validate `clientState` for notifications.
- [x] Queue work and return `200` or `202` quickly.
- [x] Add lifecycle endpoint or lifecycle handling.
- [x] Add `backend/src/services/integrations/microsoft_graph/subscriptions.py`.
- [x] Implement `ensure_subscriptions`.
- [x] Implement `renew_expiring_subscriptions`.
- [x] Implement `delete_subscription`.
- [x] Implement `record_notification`.
- [x] Implement `handle_lifecycle_event`.
- [x] Track subscriptions in `graph_subscriptions`.
- [x] Add Outlook subscription/delta plan.
- [x] Add Teams subscription/delta plan with permission-blocked states.
- [x] Add OneDrive/SharePoint driveItem subscription/delta plan.
- [ ] Add scheduled renewal/reconciliation job.
- [x] Add tests for validation token, clientState, subscription targets, expiration caps, and renewal.

## Phase 5: Task Extraction Provenance And Freshness

- [x] Record task extraction runs in `source_sync_runs`.
- [ ] Store docs found, processed, inserted, skipped, and errors.
- [ ] Surface task source document and source excerpt in tasks UI/detail.
- [ ] Surface extraction model/prompt/source metadata where useful.
- [ ] Alert when new source docs exist but task extraction is stale.
- [ ] Run backend task extraction tests.
- [ ] Run focused frontend typecheck.

## Phase 6: Assistant Health Awareness

- [x] Add `frontend/src/lib/ai/source-health.ts`.
- [x] Attach source health context when packet is missing, stale, thin, or source lookup is empty.
- [x] Attach source health context when user asks sync/vectorization/status questions.
- [x] Persist compact `chat_history.metadata.source_health`.
- [x] Update assistant answer contract for no-evidence responses.
- [ ] Run `npm run rag:verify:assistant-routing`. Ran; blocked by streaming request abort in assistant routing spec.
- [x] Run `npm run rag:verify:source-specific`.
- [ ] Run `node scripts/verify/verify_ai_advisor_quality.mjs`. Ran; blocked by forbidden phrase `RAG`.

## Phase 7: Alerts

- [x] Add alert type `source_sync_stale`.
- [x] Add alert type `graph_subscription_expiring`.
- [x] Add alert type `graph_subscription_removed`.
- [ ] Add alert type `delta_reconciliation_failed`.
- [x] Add alert type `embedding_backlog`.
- [x] Add alert type `compiler_backlog`.
- [x] Add alert type `packet_refresh_failed`.
- [x] Add alert type `task_extraction_stale`.
- [ ] Add alert type `project_attribution_backlog`.
- [x] Route alerts to existing admin inbox or a new generic `system_alerts` table.
- [x] Surface active alerts on `/admin/source-sync`.
- [ ] Surface project-relevant health warnings on project intelligence page.

## Final Validation

- [x] `npm run db:types`
- [x] `npm run check:routes`
- [ ] `cd frontend && npm run typecheck -- --pretty false`
- [x] `node scripts/verify/verify_graph_embedding_contract.mjs`
- [ ] `node scripts/verify/verify_ai_intelligence_compiler_health.mjs`
- [x] `npm run rag:verify:source-specific`
- [ ] `npm run rag:verify:assistant-routing`
- [ ] `npm run verify:browser`. Manual `agent-browser` verification completed with artifacts; exact npm wrapper was not run.
- [x] Migration ledger verified for every new migration.
- [ ] Full build/test delegated to cheaper sub-agent if required.

## Session Log

### 2026-05-07

- Created PRP and implementation checklist.
- Generated fresh Supabase types.
- Reviewed schema, pattern docs, repo ingestion/compiler/assistant architecture, and official Microsoft Graph/Vercel constraints.
- Identified first implementation slice: read-only source and intelligence health aggregation before webhook/delta refactor.
- Created and applied `supabase/migrations/20260507160000_source_sync_health_observability.sql`; ledger verified for `20260507160000`.
- Added backend source sync health aggregation, run recording, snapshot upsert, alert detection, FastAPI status/recompute endpoints, and unit tests.
- Added admin API proxy routes and `/source-sync` admin page with source freshness, active alerts, pipeline counts, task extraction freshness, and recompute action.
- Live source health baseline reported `degraded` with 311 source rows, 311 alerts, 10000 sampled documents, 10000 sampled chunks, 8210 unembedded, 8615 uncompiled, 48 tasks, and 0 graph subscriptions.
- Wired source run ledger recording into Microsoft Graph source sync, Graph embedding, Fireflies recent transcript sync, scheduled task extraction, and intelligence compiler batches.
- Added `/api/admin/source-sync/graph-sync` and `/api/admin/source-sync/graph-embed` admin proxies plus `/source-sync` buttons for Graph sync, embed pending, and compiler run.
- Focused validation after producer wiring: `python -m pytest backend/tests/test_source_sync_health.py` passed, touched Python modules compiled, `npm run check:routes` passed, and targeted TypeScript grep found no source-sync errors.
- Added `run_graph_sync()` phase options so source fetch can run without embedding or Teams compiler work in the same call; scheduled cron keeps full default behavior while the admin Graph sync action now sends fetch-only options.
- Added `backend/tests/test_graph_sync_options.py` to guard against fetch-only Graph sync accidentally running heavy embedding/compiler phases.
- Added Microsoft Graph webhook notification endpoint and service with validation-token plain-text response, required `clientState` validation, fast accepted response, and `source_sync_runs` webhook ledger rows for valid notifications.
- Added `backend/tests/test_graph_webhooks.py`; focused webhook/source-sync backend tests pass.
- Added Graph subscription lifecycle helpers, Graph client POST/PATCH/DELETE methods, and `POST /api/graph/subscriptions/reconcile` for configured Outlook mailbox subscriptions.
- Added `supabase/migrations/20260507171000_graph_subscription_unique_resource.sql`, applied it, repaired the linked Supabase migration ledger, and regenerated database types.
- Added `backend/tests/test_graph_subscriptions.py`; focused Graph/source-sync backend tests pass.
- Added opt-in Teams tenant/channel, Teams chat, OneDrive root, and SharePoint drive-root Graph subscription targets with expiration caps and failed-state tracking through `graph_subscriptions`.
- Added assistant source-health context from `source_sync_health_snapshots`/`graph_subscriptions`, injected it for source/status-sensitive chat turns, and persisted compact `chat_history.metadata.source_health`.
- Focused validation after subscription/assistant health work: `python -m pytest backend/tests/test_graph_subscriptions.py backend/tests/test_graph_webhooks.py backend/tests/test_graph_sync_options.py backend/tests/test_source_sync_health.py` passed with 13 tests, touched Python modules compiled, `npm run check:routes` passed, and targeted TypeScript grep found no source-health/chat-route errors.
- Split scheduled Microsoft Graph sync into fetch-only work by default and added a separate bounded `graph_embedding` scheduler job for pending document vectorization; existing AI intelligence compiler queue remains a separate scheduler job.
- Added `backend/tests/test_scheduler_graph_jobs.py` to lock scheduled Graph sync to fetch-only defaults and verify the embedding worker path; focused scheduler/Graph/source-health suite passed with 15 tests.
- Added `POST /api/graph/webhooks/lifecycle`, lifecycle validation-token handling, `record_notification`, and `handle_lifecycle_event` so `reauthorizationRequired`, `subscriptionRemoved`, and `missed` lifecycle events update `graph_subscriptions` and write source run ledger rows.
- Focused lifecycle/scheduler/Graph/source-health suite passed with 17 tests.
- Added `supabase/migrations/20260507213000_system_alerts.sql`, applied it, repaired the linked Supabase migration ledger, and regenerated database types.
- Added durable source-sync alert routing into `system_alerts` from recompute/live health checks with dedupe keys, active/resolved transitions, and alert codes for stale source sync, Graph subscription lifecycle states, embedding backlog, compiler backlog, packet refresh failures, and task extraction staleness.
- Live alert routing verification wrote 312 active source-sync/system alerts and resolved 310 superseded generic alert rows after detector-code tightening.
- Ran remaining source/RAG verification. Graph embedding contract and source-specific RAG passed. Meeting verification failed on live Fireflies backlog: 14/84 recent meetings had summary embeddings, 24342 Fireflies jobs were stuck at `raw_ingested`, and 2816 Fireflies jobs had provider/quota errors.
- Ran compiler/advisor/assistant routing verification. Compiler health failed on stale queued/running jobs, 8 high-confidence unpromoted candidates, and 355 active cards missing current packets. Advisor quality failed on forbidden phrase `RAG`. Assistant routing failed because the streaming chat POST returned `200` text/event-stream and then the Playwright request aborted.
- Verified `/source-sync` with `agent-browser`. Port 3000 showed a backend timeout because that existing frontend process points to the remote Render backend; a local backend plus local-backend frontend on port 3001 loaded successfully, rendered degraded source health, exposed manual actions, and saved screenshot/video/snapshot artifacts under `tests/agent-browser-runs/20260507T221417Z-source-sync-admin/`.
- Added a scheduled Fireflies pipeline backlog drain so stale `raw_ingested` jobs and retryable provider/quota error jobs are processed through the normal full pipeline in small batches instead of waiting for a manual admin replay.
- Live proof processed one stale Fireflies backlog row from `raw_ingested` to `done`; `npm run rag:verify:meetings` still failed, but the raw backlog dropped from 24342 to 24341 and the done count increased to 8572.
- Deployed the Fireflies backlog scheduler to Render, configured runtime env so the scheduler starts, and verified production intervals for Fireflies sync, Fireflies backlog vectorization, Microsoft Graph vectorization, and intelligence compiler runs.
- Added recent run ledger rows and concrete stuck Fireflies items to the source-sync health response and `/source-sync` admin page, so last sync/vectorization outcomes and failed/stale items are visible without backend log digging.
- Focused validation for the source-sync visibility slice passed: backend source-sync/scheduler tests, Python compile, route conflict check, and targeted ESLint. Full frontend typecheck still fails on unrelated existing repo debt outside this slice.
- Added Fireflies backlog preflight classification for unsupported binary/image/audio/video/archive files and financial/tabular rows missing `document_metadata.file_path`. These rows are now marked `NON_VECTORIZABLE`, counted as skipped, and excluded from retryable provider-error loops instead of failing repeatedly.
