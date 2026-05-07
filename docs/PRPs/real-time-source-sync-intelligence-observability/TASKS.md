# Real-Time Source Sync And Intelligence Observability Tasks

Source PRP: `docs/PRPs/real-time-source-sync-intelligence-observability/prp-real-time-source-sync-intelligence-observability.md`

## Progress Summary

- Status: Phase 1 producer wiring, Phase 2 manual actions, and Phase 3 Graph phase options implemented
- Current phase: Source health read model and run ledger wiring live; webhook/subscription lifecycle and assistant health awareness remain
- Last updated: 2026-05-07 16:58 UTC
- Confidence score: 8.5/10
- Required first implementation slice: read-only health aggregation before webhook changes

## Phase 0: Baseline And Evidence

- [x] Run `npm run db:types`.
- [x] Verify schema types for `graph_sync_state`, `document_metadata`, `document_chunks`, `fireflies_ingestion_jobs`, `source_intelligence_jobs`, `source_signal_candidates`, `packet_refresh_jobs`, `intelligence_packets`, `project_documents`, and `tasks`.
- [ ] Run `npm run rag:verify:meetings`.
- [ ] Run `node scripts/verify/verify_graph_embedding_contract.mjs`.
- [ ] Run `node scripts/verify/verify_ai_intelligence_compiler_health.mjs`.
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
- [ ] Verify with `agent-browser` and store screenshots/video/summary.

## Phase 3: Decouple Graph Sync From Heavy Processing

- [x] Add options to `run_graph_sync()` for fetch-only/enqueue/embed/compile behavior.
- [x] Keep source sync bounded and observable.
- [ ] Move embedding work to explicit pending-embedding worker path.
- [ ] Move compiler work to explicit compiler queue path.
- [ ] Ensure Outlook enqueues source intelligence without blocking sync.
- [ ] Ensure Teams channel/DM enqueues source intelligence without blocking sync.
- [ ] Ensure OneDrive/SharePoint source rows enqueue source intelligence when project-relevant.
- [x] Keep `frontend/src/app/api/cron/graph-sync/route.ts` as trigger-only.
- [ ] Run `node scripts/verify/verify_graph_embedding_contract.mjs`.
- [ ] Run `node scripts/verify/verify_ai_intelligence_compiler_health.mjs`.

## Phase 4: Microsoft Graph Webhook And Delta Architecture

- [ ] Add `POST /api/graph/webhooks/notifications` on FastAPI.
- [ ] Return plain-text `validationToken` for Graph validation requests.
- [ ] Validate `clientState` for notifications.
- [ ] Queue work and return `200` or `202` quickly.
- [ ] Add lifecycle endpoint or lifecycle handling.
- [ ] Add `backend/src/services/integrations/microsoft_graph/subscriptions.py`.
- [ ] Implement `ensure_subscriptions`.
- [ ] Implement `renew_expiring_subscriptions`.
- [ ] Implement `delete_subscription`.
- [ ] Implement `record_notification`.
- [ ] Implement `handle_lifecycle_event`.
- [ ] Track subscriptions in `graph_subscriptions`.
- [ ] Add Outlook subscription/delta plan.
- [ ] Add Teams subscription/delta plan with permission-blocked states.
- [ ] Add OneDrive/SharePoint driveItem subscription/delta plan.
- [ ] Add scheduled renewal/reconciliation job.
- [ ] Add tests for validation token, clientState, lifecycle, and renewal.

## Phase 5: Task Extraction Provenance And Freshness

- [ ] Record task extraction runs in `source_sync_runs`.
- [ ] Store docs found, processed, inserted, skipped, and errors.
- [ ] Surface task source document and source excerpt in tasks UI/detail.
- [ ] Surface extraction model/prompt/source metadata where useful.
- [ ] Alert when new source docs exist but task extraction is stale.
- [ ] Run backend task extraction tests.
- [ ] Run focused frontend typecheck.

## Phase 6: Assistant Health Awareness

- [ ] Add `frontend/src/lib/ai/source-health.ts`.
- [ ] Attach source health context when packet is missing, stale, thin, or source lookup is empty.
- [ ] Attach source health context when user asks sync/vectorization/status questions.
- [ ] Persist compact `chat_history.metadata.source_health`.
- [ ] Update assistant answer contract for no-evidence responses.
- [ ] Run `npm run rag:verify:assistant-routing`.
- [ ] Run `npm run rag:verify:source-specific`.
- [ ] Run `node scripts/verify/verify_ai_advisor_quality.mjs`.

## Phase 7: Alerts

- [ ] Add alert type `source_sync_stale`.
- [ ] Add alert type `graph_subscription_expiring`.
- [ ] Add alert type `graph_subscription_removed`.
- [ ] Add alert type `delta_reconciliation_failed`.
- [ ] Add alert type `embedding_backlog`.
- [ ] Add alert type `compiler_backlog`.
- [ ] Add alert type `packet_refresh_failed`.
- [ ] Add alert type `task_extraction_stale`.
- [ ] Add alert type `project_attribution_backlog`.
- [ ] Route alerts to existing admin inbox or a new generic `system_alerts` table.
- [ ] Surface active alerts on `/admin/source-sync`.
- [ ] Surface project-relevant health warnings on project intelligence page.

## Final Validation

- [ ] `npm run db:types`
- [ ] `npm run check:routes`
- [ ] `cd frontend && npm run typecheck -- --pretty false`
- [ ] `node scripts/verify/verify_graph_embedding_contract.mjs`
- [ ] `node scripts/verify/verify_ai_intelligence_compiler_health.mjs`
- [ ] `npm run rag:verify:source-specific`
- [ ] `npm run rag:verify:assistant-routing`
- [ ] `npm run verify:browser`
- [ ] Migration ledger verified for every new migration.
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
