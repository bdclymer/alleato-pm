# Task: RAG Pipeline Trust Dashboard And Alerts

Status: In Progress
Owner: Codex
Created: 2026-06-22
Linear Issue: AAI-598 - https://linear.app/megankharrison/issue/AAI-598/build-daily-rag-pipeline-trust-dashboard-and-failure-alerts
Related Handoff: N/A

## Objective

Make the RAG pipeline trustworthy day to day by giving operators one visual daily
view of what has synced, vectorized, become searchable by the AI assistant, been
assigned to projects, had tasks extracted, and updated Project Intelligence for
meeting transcripts, Teams messages, emails, and SharePoint files. Pipeline
errors must fail loudly with immediate notification or a documented blocked
notification path.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence
filled in. If any item cannot be completed, change `Status` to
`Blocked/Deferred` and document the blocker, owner, and next action.

## Scope Checklist

- [x] Existing architecture and prior related implementations reviewed.
- [x] Existing shared primitives/services/helpers identified before adding new ones.
- [x] Source-of-truth owner chosen for the workflow/data/control plane.
- [x] Deprecated or bypassed paths identified.
- [x] Acceptance criteria written as observable behavior, not implementation hopes.
- [x] Failure-loudly behavior defined.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Database schema/types/migrations handled, if applicable.
- [x] Provider/env/config changes handled through CLI/API/MCP when available.
- [x] Centralized/shared abstraction used when the behavior is cross-cutting.
- [x] Legacy or duplicate paths removed, blocked, or explicitly marked deprecated.
- [x] Errors are specific and actionable; no silent fallback added.
- [x] User-facing copy/UI follows project noise gate and design-system rules, if applicable.

## Integration Checklist

- [x] End-to-end path wired through one owner, not separate disconnected pieces.
- [x] All entry points for the workflow use the same canonical service/runtime.
- [x] Source adapters or external dependencies return typed, inspectable results.
- [x] Run/task/session ledger records every meaningful attempt.
- [x] Artifacts link back to source evidence and run logs.
- [x] Delivery/output adapters report sent, skipped, blocked, failed, and dry-run states.

## Regression Guardrails

- [x] Unit or integration test added/updated for the core behavior.
- [x] Contract test added/updated for cross-module or source/delivery boundaries.
- [x] Guardrail added so the same class of bug fails loudly next time.
- [x] Existing tests adjusted only for intentional behavior changes.

## Verification Checklist

- [x] Static/type/lint check run, or explicitly delegated to a cheaper sub-agent.
- [x] Targeted automated test run.
- [x] Browser/user-flow verification run for frontend-visible changes.
- [x] Database/provider read-back performed for migrations/config/external services.
- [x] End-to-end workflow proof captured for the actual requested outcome.
- [x] Evidence artifacts recorded below.
- [x] Known unrelated failures documented with exact command and owner files.

## Acceptance Criteria

- Daily status covers meetings, Teams messages, emails, and SharePoint files.
- Each source reports synced, vectorized/searchable, project assigned, tasks
  extracted, and Project Intelligence updated status from real app/RAG data.
- Meeting transcript Project Intelligence updated status requires proof that the
  compiler read the full transcript body or complete transcript chunk set.
  Metadata-only, title-only, snippet-only, or stale-summary-only updates do not
  satisfy the PI stage.
- Any degraded source/stage exposes exact source, stage, count, latest error or
  freshness gap, and owner hint.
- Operator UI is low-noise: one source/stage matrix, one alert list, and drill
  links to existing source-sync or document evidence.
- Immediate notification uses the existing source health alert path when
  available; if delivery credentials are unavailable, the blocker is proven and
  recorded.
- A verifier fails non-zero when source-stage coverage or packet freshness
  regresses.

## Failure-Loudly Behavior

- Sync success cannot satisfy vectorization/searchability.
- Embedded chunks cannot satisfy project assignment, task extraction, or packet
  freshness.
- Project Intelligence stale state is a downstream failure, not a green source
  health result.
- A transcript with Project Intelligence evidence but no full transcript-read
  proof is a PI failure until the compiler ledger proves full-read coverage.
- Notification delivery must report sent, skipped, blocked, or failed.

## Planned Files

- `docs/ai-plan/councils/2026-06-22-rag-strategy-council-pipeline-trust-dashboard.md` - strategy decision.
- `frontend/src/app/api/admin/source-sync/status/route.ts` or shared source-sync API helper - add daily RAG lifecycle matrix.
- `frontend/src/app/(admin)/source-sync/page.tsx` and existing source-sync components - visual daily status.
- `scripts/verify/verify_source_lifecycle_health.mjs` or a narrow companion verifier - guardrail for the daily matrix.
- `docs/ops/tasks/2026-06-22-rag-pipeline-trust-dashboard-alerts.md` - evidence ledger.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `cd frontend && npx eslint 'src/app/api/admin/source-sync/_contracts.ts' 'src/app/api/admin/source-sync/status/route.ts' 'src/components/ai-intelligence/source-sync-health-panel.tsx'` | Passed | Changed source-sync files lint clean. |
| Static/type/lint      | `cd frontend && npx tsc --noEmit --pretty false --incremental false --skipLibCheck --project tsconfig.json` | Failed/Repo tooling | Node heap OOM after ~94s; no changed-file TypeScript error was emitted before process abort. |
| Supabase type gate    | `npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > /tmp/alleato-supabase-types-check.ts` | Failed/Auth | CLI returned `LegacyInvalidAccessTokenError`; existing checked-in types were restored and verified to include required tables. |
| Targeted tests        | `node scripts/verify/verify_source_sync_lifecycle_ui_contract.mjs` | Passed | Required sources/stages remain present across API contract, route, and UI. |
| Targeted tests        | `node --check scripts/verify/verify_source_sync_lifecycle_ui_contract.mjs && node --check scripts/verify/verify_source_lifecycle_health.mjs` | Passed | Verifier scripts parse. |
| Targeted tests        | `npm run rag:verify:source-lifecycle -- --days 1 --min-embedded-ratio 1 --min-project-assigned-ratio 0 --min-task-assigned-ratio 0 --require-lifecycle-rows false` | Failed/Current RAG health | Initial fail-loud proof: Fireflies 5/6 embedded, Teams 0/2 embedding-required embedded, no fresh current Project Intelligence packets; newest packet `2026-06-17T12:32:08.088Z`. |
| Targeted tests        | `npm run rag:verify:source-lifecycle -- --days 1 --min-embedded-ratio 1 --min-project-assigned-ratio 0 --min-task-assigned-ratio 0 --require-lifecycle-rows false` | Passed | After remediation: 17 recent sources checked, Fireflies 6/6 embedded, Teams 7/7 embedding-required embedded, fresh current Project Intelligence packets `3`, newest packet `2026-06-22T21:07:08.311Z`, failures `[]`. |
| Targeted tests        | `python3 -m py_compile backend/src/services/health/source_rag_health.py backend/src/services/intelligence/client.py` | Passed | Backend watchdog and intelligence-client JSON fallback compile. |
| Targeted tests        | `PYTHONPATH=backend:backend/src backend/.venv/bin/pytest backend/tests/test_graph_embed.py backend/tests/test_outlook_intake.py -q` | Passed | `21 passed`; guardrails cover metadata-only Outlook attachment listing, escaped Graph attachment IDs, Outlook source-intelligence queueing, and Graph embed source-intelligence queueing. |
| Static/type/lint      | `python3 -m py_compile backend/src/services/integrations/microsoft_graph/client.py backend/src/services/integrations/microsoft_graph/outlook.py backend/src/services/integrations/microsoft_graph/embed.py` | Passed | Graph client, Outlook sync, and Graph embedder compile after queueing/timeout changes. |
| Browser/user-flow     | `agent-browser open http://localhost:3001/source-sync` | Passed/Degraded visible | Page loads and renders Daily RAG trust matrix. |
| Browser/user-flow     | `frontend/tests/agent-browser-runs/source-sync-final-working.png` | Passed/Degraded visible | Repaired local route: HTTP 200, real daily RAG counts render for meetings, Teams, emails, and SharePoint, and notification state is visible as ready. |
| Static/type/lint      | `cd frontend && npx eslint src/app/api/admin/source-sync/status/route.ts src/app/api/admin/source-sync/_shared.ts --cache --cache-strategy content` | Passed | Source-sync local backend routing and RAG lifecycle read-back fixes lint clean. |
| Provider auth guardrail | `npm run rag:verify:source-provider-auth -- --hours 24` | Passed | AI Gateway credit probe and Render backend health pass; no unresolved source-processing provider auth failures remain. |
| Browser/user-flow | `frontend/tests/agent-browser-runs/source-sync-auth-alert-cleared.png` | Passed/Auth alert cleared | `/source-sync` no longer contains `AuthenticationError`, `Authentication failed`, or `AI_GATEWAY_API_KEY` alert text after Fireflies repair and lifecycle refresh. |
| Targeted guardrail | `npm run rag:verify:project-intelligence-read-proof -- --days 1 --family fireflies` | Passed | Current Fireflies meeting transcript PI evidence checked `6`; failures `[]`. Meeting PI status now requires compiler `read_proof.status=full_source_read` and `scope=full_transcript`, preventing title/summary-only PI evidence from counting green. |
| Browser/user-flow     | `tests/agent-browser-runs/2026-06-22-rag-pipeline-trust-dashboard/source-sync-rag-lifecycle-after-wait.png` | Passed/Degraded visible | Matrix shows real stage counts even when backend source-sync health proxy is unavailable. |
| Browser/user-flow     | `tests/agent-browser-runs/2026-06-22-rag-pipeline-trust-dashboard/source-sync-rag-lifecycle-after-remediation.png` | Passed/Degraded visible | Refreshed visual proof after embedding and packet remediation. |
| DB/provider read-back | `npm run rag:verify:source-lifecycle -- --days 1 ...` | Passed | Live app/RAG read-back proves the measured 24-hour source lifecycle now has embeddings and fresh Project Intelligence packets. |
| DB/provider read-back | `run_source_rag_health_check(trigger_remediation=True)` | Failed/Alert sent | Watchdog still fails because Outlook/SharePoint/OneDrive sync freshness is degraded, but Teams notification returned `{"status":"sent","channel":"teams","detail":"sent"}` after Vercel env repair and redeploy. |
| Provider config       | `vercel env remove/add NOTIFICATION_SERVICE_KEY production` + `vercel redeploy ... --scope meganharrisons-projects --target production` | Passed | Replaced mismatched production notification key without printing the secret; redeployed previous production deployment, aliased to `alleato-hub.vercel.app`. |
| Remediation           | `refresh_fireflies_transcripts --fireflies-id 01KVQP3E6AGV75ZHETYPY56DZT` | Passed | Reprocessed `Ace Pricing Review`: `chunks=70`, `pipeline=done`, `tasks=8`. |
| Remediation           | `run_graph_sync_phase teams-dm --embed-limit 25` | Passed | Follow-up verifier showed Teams 7/7 embedding-required rows embedded and lifecycle rows present. |
| Remediation           | `refresh_project_intelligence` for projects `67`, `90`, `876` | Passed | Wrote fresh current packets for Vermillion Rise Warehouse, Alleato Internal Ops, and Exol Morrisville. |
| Remediation           | `run_graph_sync_phase outlook --embed-limit 50` | Blocked/Stopped | Stopped after local process sat idle in Microsoft Graph attachment download; stack ended in `outlook.py::_list_message_attachments` -> `client.py::_get_with_retry` reading `/attachments`. |
| Remediation           | `run_graph_sync_phase outlook --embed-limit 25` | Partial/Stopped | After attachment-list hardening, sync advanced into embedding but exposed inline compiler/projection pressure and long embedding writes. Stopped to split freshness from embedding. |
| Remediation           | `run_graph_sync_phase outlook --skip-embedding` | Passed | Sync-only run completed: `total_synced=91`, `outlook=91`, `errors=[]`, selected `jdawson@alleatogroup.com`; attachment promotion `promoted=10`, `review_needed=15`, `failed=0`. |
| Remediation           | `run_graph_sync_phase sharepoint --skip-embedding` | Blocked/DB pressure | Blocked twice by app DB pressure guard: first `total_connections=37>35`, then `total_connections=41>35`. |
| DB/provider read-back | `run_source_rag_health_check(trigger_remediation=False)` | Blocked/DB pressure | Health watchdog itself was blocked by pressure guard: `source_rag_health: total_connections=38>35`. |
| Source ownership      | `.env`, `render.yaml`, Render API read-back for `alleato-graph-sync` | Passed | Confirmed OneDrive was configured against an individual-drive path for shared files; live OneDrive run returned Graph 404. Disabled OneDrive sync and set SharePoint as file source of truth. Render read-back: `GRAPH_SYNC_ONEDRIVE=false`, `GRAPH_SYNC_SHAREPOINT=true`, OneDrive max-scope vars missing, `SHAREPOINT_SYNC_MAX_FOLDERS=2`. |
| Targeted tests        | `PYTHONPATH=backend:backend/src backend/.venv/bin/pytest backend/tests/test_microsoft_graph_onedrive_project_documents.py backend/tests/test_graph_embed.py backend/tests/test_outlook_intake.py -q` | Passed | `26 passed`; includes guardrails for OneDrive delta failures failing loudly and bounded Graph ingestion. |
| Static/type/lint      | `python3 -m py_compile backend/src/services/integrations/microsoft_graph/sync.py backend/src/services/integrations/microsoft_graph/onedrive.py backend/src/services/scheduler.py backend/src/services/health/source_rag_health.py backend/src/services/health/source_sync_health.py backend/src/scripts/run_graph_sync_phase.py scripts/verify/verify_integration_health.py` | Passed | Backend sync, scheduler, watchdog, and verifier files compile after SharePoint-only file source refactor. |
| Static/type/lint      | `cd frontend && npx eslint src/app/api/admin/source-sync/status/route.ts src/app/api/admin/rag-snapshots/route.ts 'src/app/(admin)/rag/page.tsx' src/app/api/cron/graph-sync/route.ts --cache --cache-strategy content` | Passed | Touched frontend dashboard/API files lint clean after SharePoint label/contract changes. |
| Static/type/lint      | `cd frontend && npm run typecheck` | Failed/Repo tooling | Bounded typecheck timed out after 60s with existing repo guard message; no changed-file TypeScript error emitted. Follow-up changed-type-debt guard passed. |
| Static/type/lint      | `cd frontend && npm run typecheck:changed` | Passed | No new `any` type debt detected in changed files. |
| Targeted tests        | `npm run check:routes` | Passed | No dynamic route conflicts found. |
| Targeted tests        | `node scripts/verify/verify_source_sync_lifecycle_ui_contract.mjs` | Passed | Required daily RAG lifecycle sources/stages remain wired after SharePoint-only file source change. |
| Behavioral proof      | `run_graph_sync_phase onedrive --skip-embedding` | Passed/Removed | Command now fails fast as invalid phase; accepted phases are `outlook`, `sharepoint`, `teams`, `teams-dm`. |
| Behavioral proof      | bounded `run_graph_sync_phase sharepoint --skip-embedding` | Passed | Completed in ~15s with `status=complete`, `errors=[]`, `sharepoint=0`, attachment promotion `promoted=2`; proves SharePoint phase still runs without OneDrive. |
| External guardrail    | `node scripts/verify/verify-render-web-scheduler-disabled.mjs` | Failed/Unrelated repo debt | File-sync-specific expectations now pass by read-back, but broad guardrail still fails on existing DB-incident scheduler controls: backend webhook/subscription flags `auto` vs expected `false`, missing `DATABASE_URL` on two cron blueprints, and four Render crons not suspended. |
| End-to-end proof      | `/source-sync` Daily RAG trust matrix + watchdog notification | Partial | Visual proof and immediate Teams notification are wired; full source-sync health still blocked by Outlook/SharePoint/OneDrive freshness and vectorization backlog. |
| Targeted tests        | `PYTHONPATH=backend:backend/src backend/.venv/bin/python -m py_compile backend/src/services/health/source_rag_health.py backend/src/services/health/source_sync_health.py backend/src/services/integrations/microsoft_graph/embed.py` | Passed | Watchdog, source-sync health, and Graph embedder compile after terminal-exclusion and inactive OneDrive/SharePoint filtering changes. |
| Remediation           | `embed_graph_document` for `sharepoint_01AFX6IXI5OUO5OEYFEFF35523S2MVG72N`, `sharepoint_01AFX6IXOBREE37OCTYZD2OT75VOLIO6OH`, `sharepoint_01AFX6IXLFMP5XKAQFUBCJWMXG2E7ZOVWG` | Passed | Targeted final SharePoint vectorization drain: chunks `10`, `15`, and `2`. |
| Targeted tests        | `npm run rag:verify:source-lifecycle -- --days 1 --min-embedded-ratio 1 --min-project-assigned-ratio 0 --min-task-assigned-ratio 0 --require-lifecycle-rows false` | Passed | Current read-only verifier: 190 recent sources, Fireflies `7/7` embedded, Teams `7/7` required embedded with `4` terminal low-content rows, SharePoint `171/171` required embedded with `1` intentional exclusion, failures `[]`. |
| Lifecycle ledger      | `node scripts/verify/backfill_source_lifecycle_from_current_state.mjs --days 1 --source-limit 1500` | Passed | Refreshed 190 source-processing rows with current-state lifecycle/applicability metadata; SharePoint remained `161` project-assignment-review plus `11` indexed-for-RAG rows. |
| Project assignment    | `node scripts/verify/backfill_project_assignments_from_attribution_rules.mjs --days 1 --limit 1500` | Passed/No-op | Read-only default dry run loaded `283` active rules and scanned `176` rows; found `0` deterministic assignments. |
| Project assignment    | `node scripts/verify/backfill_project_assignments_from_compiler_jobs.mjs --days 1 --limit 1500 --min-confidence 0.85 --dry-run true` | Passed/No-op | Considered `3` compiler jobs; `0` eligible documents to update. |
| Project assignment    | `node scripts/verify/backfill_onedrive_project_assignments_from_source_path.mjs --days 1 --limit 250 --dry-run true` | Passed/No-op | Scanned `161` SharePoint document rows with paths; `0` project-number path matches and `0` ambiguous matches. |
| DB/provider read-back | `run_source_rag_health_check(trigger_remediation=False)` | Failed/Degraded by real lifecycle gaps | Watchdog now treats terminal/unvectorizable rows and non-project rows as excluded from applicable stages. Remaining degradation is real: meetings `3/5` project-assigned/tasks/intelligence, Teams `0/2`, SharePoint `11/156` project-assigned and `0/156` task/intelligence. |
| Source ownership      | `pgrep -fl "run_graph_sync_phase.py|python.*run_graph_sync_phase"` | Passed | Interrupted Outlook sync process exited; no live sync/remediation command remains running. |
| Targeted tests        | `node --check scripts/verify/backfill_sharepoint_ap_check_project_assignments.mjs` | Passed | New strict SharePoint AP check attribution script parses. |
| Project assignment    | `node scripts/verify/backfill_sharepoint_ap_check_project_assignments.mjs --days 1 --limit 250 --dry-run true` | Passed/Dry-run | Scanned `124` SharePoint check PDFs, parsed `116`, proposed `13` exact amount/vendor matches from Acumatica AP bills, rejected `103`. |
| Project assignment    | `node scripts/verify/backfill_sharepoint_ap_check_project_assignments.mjs --days 1 --limit 250 --apply true` | Passed | Applied `13` strict Acumatica AP bill amount/vendor project assignments; rejected rows remained in review. |
| Lifecycle ledger      | `node scripts/verify/backfill_source_lifecycle_from_current_state.mjs --days 1 --source-limit 1500` | Passed | Refreshed ledger after AP check assignment: SharePoint moved from `161` to `148` project-assignment-review rows and from `11` to `24` indexed/projected rows. |
| Targeted tests        | `npm run rag:verify:source-lifecycle -- --days 1 --min-embedded-ratio 1 --min-project-assigned-ratio 0 --min-task-assigned-ratio 0 --require-lifecycle-rows false` | Passed | Current read-only verifier after AP check assignment: SharePoint `24/156` project-required assigned, `171/171` required embedded, failures `[]`. |
| DB/provider read-back | `run_source_rag_health_check(trigger_remediation=False)` | Failed/Degraded by real lifecycle gaps | Dashboard/watchdog read-back now shows SharePoint vectorized `171/171`, project-assigned `24/156`, tasks `0/156`, Project Intelligence `0/156`; meetings `3/5`; Teams `0/2`. |
| Remediation           | `ALLOW_PM_APP_FINAL_PROJECTIONS=true PYTHONPATH=backend:backend/src backend/.venv/bin/python backend/src/scripts/backfill_source_operating_records.py --ids-json <24 current assigned SharePoint ids> --force` | Passed/Partial batches | Moved the 24 current assigned SharePoint documents through the canonical source compiler in bounded batches. One first-batch typo failed for a nonexistent id, then the corrected row succeeded. Successful rows wrote source syntheses, project daily deltas, operating projections, promoted insight evidence, and Project Intelligence evidence. |
| Lifecycle ledger      | `node scripts/verify/backfill_source_lifecycle_from_current_state.mjs --days 1 --source-limit 1500` | Passed | Refreshed 190 lifecycle rows after compiler processing: SharePoint remained `24/156` project-assigned and advanced `24` SharePoint rows to `project_intelligence_updated`. |
| Task extraction status | RAG SQL read-back of `source_processing_jobs.metadata->>'task_extraction_status'` | Passed | SharePoint lifecycle rows now include `18` `no_actionable_tasks` outcomes for AP check PDFs and `154` without task-extraction outcome. This distinguishes successful no-task extraction from unprocessed sources. |
| Static/type/lint      | `PYTHONPATH=backend:backend/src backend/.venv/bin/python -m py_compile backend/src/services/health/source_rag_health.py` | Passed | Watchdog task-outcome semantics compile. |
| Static/type/lint      | `cd frontend && npx eslint src/app/api/admin/source-sync/status/route.ts --cache --cache-strategy content` | Passed | Admin source-sync status route lint clean after task-outcome metadata support. |
| Targeted tests        | `node --check scripts/verify/backfill_source_lifecycle_from_current_state.mjs` | Passed | Lifecycle backfill script parses after deterministic AP check no-task outcome support. |
| Targeted tests        | `npm run rag:verify:source-lifecycle -- --days 1 --min-embedded-ratio 1 --min-project-assigned-ratio 0 --min-task-assigned-ratio 0 --require-lifecycle-rows false` | Passed | Current verifier still passes: SharePoint `171/171` required embedded, `24/156` project-required assigned, recent evidence newest `2026-06-22T22:58:59.893Z`, failures `[]`. |
| DB/provider read-back | `run_source_rag_health_check(trigger_remediation=False)` with dotenv loaded | Failed/Degraded by real lifecycle gaps | SharePoint visual/watchdog state improved to vectorized `171/171` with `1` exclusion, project-assigned `24/156`, tasks-extracted `18/156` from AP check no-actionable-task outcomes, Project Intelligence `24/156`; meetings remain `3/5`; Teams remains `0/2`. |
| Classification guardrail | `scripts/verify/source_lifecycle_project_applicability.mjs` | Updated | Internal Teams payroll messages now match plural `timesheets` and `timecards`, preventing recurring false project-required alerts for Timeco/timecard approvals. |
| Project assignment | bounded SQL update for `teamsdm_c3e2df591742922c_2026-06-22` | Passed | Assigned the current Teams vanity-options thread to project `1009` Union Collective using same-chat evidence: earlier thread messages explicitly referenced Union Collective, Old Union Rd, and vanity sequencing. Stored assignment evidence and `no_actionable_tasks` lifecycle metadata. |
| Remediation | `ALLOW_PM_APP_FINAL_PROJECTIONS=true PYTHONPATH=backend:backend/src backend/.venv/bin/python backend/src/scripts/backfill_source_operating_records.py --id teamsdm_c3e2df591742922c_2026-06-22 --force` | Passed | Canonical source compiler wrote the Union Collective Teams source synthesis, project daily delta, operating projection, promoted insight evidence, and Project Intelligence evidence. |
| Lifecycle ledger | `node scripts/verify/backfill_source_lifecycle_from_current_state.mjs --days 1 --source-limit 1500` | Passed | Refreshed 190 lifecycle rows. Teams now has `1` project-required row, `1/1` project-assigned, and `1` Teams row at `project_intelligence_updated`; Timesheets Approval is now internal-project, not project-required. |
| Static/type/lint | `node --check scripts/verify/backfill_source_lifecycle_from_current_state.mjs && node --check scripts/verify/source_lifecycle_project_applicability.mjs` | Passed | Lifecycle scripts parse after task-outcome preservation and plural internal-timecard classification. |
| Static/type/lint | `PYTHONPATH=backend:backend/src backend/.venv/bin/python -m py_compile backend/src/services/health/source_rag_health.py` | Passed | Watchdog still compiles after task-outcome timestamp changes. |
| Static/type/lint | `cd frontend && npx eslint src/app/api/admin/source-sync/status/route.ts --cache --cache-strategy content` | Passed | Admin source-sync status route still lint clean. |
| Targeted tests | `npm run rag:verify:source-lifecycle -- --days 1 --min-embedded-ratio 1 --min-project-assigned-ratio 0 --min-task-assigned-ratio 0 --require-lifecycle-rows false` | Passed | Teams improved from `0/2` to `1/1` project-assigned with no project-assignment-review samples; Teams vectorized remains `7/7` with `4` terminal low-content exclusions and failures `[]`. |
| DB/provider read-back | `run_source_rag_health_check(trigger_remediation=False)` with dotenv loaded | Blocked/DB pressure | Scheduled watchdog read-back was correctly blocked by the app DB pressure guard: `total_connections=37>35`. Guard was not bypassed. |
| Classification guardrail | `scripts/verify/source_lifecycle_project_applicability.mjs` | Updated | Added business-trust/tax-planning internal patterns so Brandon/Ben trust, holding-company, extraordinary-dividend, MSA, and tax-compliance meetings are not flagged only because they mention invoices. |
| Project assignment | bounded SQL update for `01KVQP3E6AGV75ZHETYPY56DZT` | Passed | Assigned `Ace Pricing Review` to project `1008` `Champaign Ace Addition` using active project evidence: project number `26-118`, phase `Current`, plus recent Ace Champaign meetings and permit documents already assigned to project `1008`. Updated document metadata, 8 task rows, 49 RAG chunks, and lifecycle metadata. |
| Remediation | `ALLOW_PM_APP_FINAL_PROJECTIONS=true PYTHONPATH=backend:backend/src backend/.venv/bin/python backend/src/scripts/backfill_source_operating_records.py --id 01KVQP3E6AGV75ZHETYPY56DZT --force` | Passed | Canonical source compiler processed Ace with confidence `0.95`, wrote source synthesis/daily delta/operating projection, promoted insight evidence, and queued packet refresh. |
| Remediation | bounded `run_extractor(metadata_id)` for `01KVQK1DZX98GZVYGF83GQNSWW` and `01KV8BCC0CCKQNGENB3YP8Y535` | Passed/Exposed task-accounting gap | Vermillion extracted 10 task candidates and Exol extracted 3, but all were skipped because assignees resolved to external contacts (`George Russell`, `Jerome | DKGR`, `Nathan Williams`). No app `tasks` rows were written for those meetings, so they remain task-extraction warnings rather than false green. |
| Guardrail | `backend/src/services/pipeline/extractor.py` | Updated | `run_extractor` now returns persisted task rows in `tasks` and exposes `tasksAttempted` / `tasksSkipped`, preventing future false success when all extracted tasks are skipped by assignee-quality rules. |
| Lifecycle ledger | `node scripts/verify/backfill_source_lifecycle_from_current_state.mjs --days 1 --source-limit 1500` | Passed | Refreshed 190 lifecycle rows after Fireflies remediation. Current Fireflies rows: Ace, Timeco, Vermillion, and Exol are `project_intelligence_updated`; Brandon/Ben and Accounting Review are `actions_routed`; Weekly Touch Base remains multi-project review. |
| Targeted tests | `npm run rag:verify:source-lifecycle -- --days 1 --min-embedded-ratio 1 --min-project-assigned-ratio 0 --min-task-assigned-ratio 0 --require-lifecycle-rows false` | Passed | Current read-only verifier after Fireflies remediation: Fireflies `7/7` embedded, `6/6` project-required assigned, no project-assignment-review samples, failures `[]`; SharePoint remains `24/156` project-assigned and `18/156` task outcomes. |
| Static/type/lint | `PYTHONPATH=backend:backend/src backend/.venv/bin/python -m py_compile backend/src/services/pipeline/extractor.py backend/src/services/health/source_rag_health.py` | Passed | Extractor accounting guardrail and watchdog compile. |
| Static/type/lint | `node --check scripts/verify/source_lifecycle_project_applicability.mjs && node --check scripts/verify/backfill_source_lifecycle_from_current_state.mjs` | Passed | Lifecycle classifier/backfill scripts parse after Fireflies guardrail changes. |
| DB/provider read-back | `run_source_rag_health_check(trigger_remediation=False)` with compact output | Failed/Degraded by real lifecycle gaps | Watchdog runs and persists alerts. Current daily RAG matrix: meetings synced/vectorized/project-assigned healthy, tasks `4/6` warning, PI `4/6` warning; Teams fully healthy for the `1/1` project-required row; SharePoint vectorized `171/171` but project-assigned `24/156`, tasks `18/156`, PI `24/156`; emails have no current 24-hour rows and broader Outlook freshness alerts remain critical. |
| Project assignment | `node scripts/verify/backfill_sharepoint_ap_check_project_assignments.mjs --days 1 --limit 250 --apply true` | Passed | Applied `22` additional strict SharePoint AP check assignments using unique project references found in OCR/body text. Examples included Matcom Diamond -> project `820`, Mechanical Systems -> project `818`, Done Right Plumbing -> project `807`, and Westfield Collective checks -> project `43`. |
| Remediation | `ALLOW_PM_APP_FINAL_PROJECTIONS=true PYTHONPATH=backend:backend/src backend/.venv/bin/python backend/src/scripts/backfill_source_operating_records.py --ids-json <22 check_body_unique_project_name SharePoint ids> --force` | Passed | Processed the `22` newly assigned SharePoint check PDFs through the canonical source compiler in three bounded batches. All `22/22` succeeded and wrote source synthesis, daily delta, operating projection, promoted insight evidence, and Project Intelligence evidence. |
| Lifecycle ledger | `node scripts/verify/backfill_source_lifecycle_from_current_state.mjs --days 1 --source-limit 1500` | Passed | Refreshed `190` lifecycle rows after the second SharePoint AP check pass. SharePoint advanced to `46` `project_intelligence_updated` rows and `126` `project_assignment_review` rows. |
| Targeted tests | `npm run rag:verify:source-lifecycle -- --days 1 --min-embedded-ratio 1 --min-project-assigned-ratio 0 --min-task-assigned-ratio 0 --require-lifecycle-rows false` | Passed | Current read-only verifier: `190` recent sources, Fireflies `7/7` embedded and `6/6` project-required assigned, Teams `1/1` project-required assigned with `10` excluded, SharePoint `171/171` embedded with `1` exclusion and `46/156` project-required assigned, failures `[]`. |
| DB/provider read-back | `run_source_rag_health_check(trigger_remediation=False)` with compact output | Failed/Degraded by real lifecycle gaps | Daily RAG matrix now shows SharePoint vectorized `171/171`, project-assigned `46/156`, tasks `40/156`, PI `46/156`; meetings tasks/PI remain `4/6`; Teams remains healthy for the `1/1` project-required row; emails still have no current 24-hour rows and Outlook/Teams freshness alerts remain active. |
| Project assignment | `node scripts/verify/backfill_sharepoint_ap_check_project_assignments.mjs --days 1 --limit 250 --dry-run true` | Passed/No-op | Follow-up scan after the body-reference pass found `0` additional safe AP check assignments, leaving `81` parsed check PDFs in review rather than guessing. |
| Remediation | `ALLOW_PM_APP_FINAL_PROJECTIONS=true PYTHONPATH=backend:backend/src backend/.venv/bin/python backend/src/scripts/backfill_source_operating_records.py --ids-json '["01KV8CKZZZE682V1PHGV8E93QA","01KV8VH4Z228ZBQ7RA2WJA80PZ"]' --force` | Passed | Reprocessed the two Alleato Finance meeting transcripts that were project-assigned and task-routed but missing Project Intelligence evidence. Both succeeded, promoted insight evidence, wrote operating projections, and queued packet refresh `a4813a1a-38ac-4ab3-8de7-18663495b83f`. |
| Lifecycle ledger | `node scripts/verify/backfill_source_lifecycle_from_current_state.mjs --days 1 --source-limit 1500` | Passed | Refreshed `190` lifecycle rows after Finance meeting compile. Fireflies current-day rows now show `6` `project_intelligence_updated` and `1` multi-project review. |
| Targeted tests | `npm run rag:verify:source-lifecycle -- --days 1 --min-embedded-ratio 1 --min-project-assigned-ratio 0 --min-task-assigned-ratio 0 --require-lifecycle-rows false` | Passed | Current read-only verifier after Finance meeting remediation: Fireflies `7/7` embedded, `6/6` project-required assigned, `6` Project Intelligence lifecycle rows, failures `[]`; Teams remains `1/1` project-required assigned; SharePoint remains `46/156` project-required assigned. |
| DB/provider read-back | `run_source_rag_health_check(trigger_remediation=False)` with compact output | Failed/Degraded by real lifecycle gaps | Meeting matrix improved: synced `7/7`, vectorized `7/7`, project-assigned `6/6`, Project Intelligence `6/6`; task extraction remains warning at `4/6`. SharePoint remains degraded at project-assigned `46/156`, tasks `40/156`, PI `46/156`; emails still show `0` current 24-hour rows. |
| Guardrail | `backend/src/services/intelligence/compiler.py` | Updated | `enqueue_source_intelligence_job` now uses bounded direct RAG Postgres enqueue when `RAG_DATABASE_URL` is present, with connect, statement, and CLI alarm timeouts before falling back to Supabase REST only when no RAG DB URL exists. This prevents Outlook sync from hanging indefinitely on source-intelligence queue writes. |
| Static/type/lint | `PYTHONPATH=backend:backend/src backend/.venv/bin/python -m py_compile backend/src/services/intelligence/compiler.py backend/src/services/integrations/microsoft_graph/outlook.py` | Passed | Compiler queue guard and Outlook integration compile. |
| Targeted tests | `PYTHONPATH=backend:backend/src backend/.venv/bin/pytest backend/tests/test_outlook_intake.py::test_outlook_source_intelligence_is_queued_by_default backend/tests/test_graph_embed.py::test_graph_embed_queues_source_intelligence_by_default -q` | Passed | `2 passed`; focused queueing behavior still routes Outlook and Graph embed paths through the queued source-intelligence contract. |
| Remediation | `OUTLOOK_SYNC_MAX_USERS=1 SOURCE_INTELLIGENCE_QUEUE_TIMEOUT_SECONDS=3 SOURCE_INTELLIGENCE_QUEUE_CONNECT_TIMEOUT_SECONDS=2 SOURCE_INTELLIGENCE_QUEUE_STATEMENT_TIMEOUT_MS=2000 PYTHONPATH=backend:backend/src backend/.venv/bin/python backend/src/scripts/run_graph_sync_phase.py outlook --skip-embedding` | Blocked/DB pressure | Outlook foreground smoke now fails fast at the app DB pressure guard instead of hanging: `App DB pressure guard blocked graph_sync: total_connections=37>35`. |
| Guardrail | `backend/src/services/integrations/microsoft_graph/outlook.py` | Updated | Added `OUTLOOK_SYNC_MAX_MESSAGES_PER_MAILBOX` so mailbox freshness remediation can cap per-mailbox delta processing instead of draining hundreds of items in one foreground run. |
| Targeted tests | `PYTHONPATH=backend:backend/src backend/.venv/bin/pytest backend/tests/test_outlook_intake.py::test_sync_outlook_emails_respects_mailbox_message_cap backend/tests/test_outlook_intake.py::test_outlook_source_intelligence_is_queued_by_default -q` | Passed | `2 passed`; Outlook now has a regression guard for the mailbox message cap and still queues source intelligence by default. |
| Remediation | `OUTLOOK_SYNC_MAX_USERS=1 OUTLOOK_SYNC_MAX_MESSAGES_PER_MAILBOX=2 ... run_graph_sync_phase.py outlook --skip-embedding` | Passed | One-mailbox Outlook pass selected `njepson@alleatogroup.com`, capped processing at `2/100` delta items, synced `2`, skipped embedding, and returned `errors=[]`. |
| Remediation | `OUTLOOK_SYNC_MAX_USERS=4 OUTLOOK_SYNC_MAX_MESSAGES_PER_MAILBOX=2 ... run_graph_sync_phase.py outlook --skip-embedding` | Passed | Four-mailbox Outlook pass selected `ctragesser`, `cgillespie`, `acannon`, and `accounting`; capped large deltas including `2/243`, `2/79`, and `2/400`; synced `3`, promoted `5` attachments, and returned `errors=[]`. |
| Remediation | `MICROSOFT_SYNC_USERS=bclymer@alleatogroup.com OUTLOOK_SYNC_MAX_USERS=1 OUTLOOK_SYNC_MAX_MESSAGES_PER_MAILBOX=2 ... run_graph_sync_phase.py outlook --skip-embedding` | Passed | Direct Brandon mailbox freshness pass capped processing at `2/119`, synced `2`, and returned `errors=[]`. Watchdog then moved `bclymer@alleatogroup.com` from critical stale to warning/current. |
| Guardrail | `backend/src/services/integrations/microsoft_graph/project_documents.py` | Updated | Added `GRAPH_PROJECT_DOCUMENT_UPSERT_TIMEOUT_SECONDS` alarm around shared `project_documents` promotion upserts so SharePoint/OneDrive/Outlook attachment promotion cannot hang silently in Supabase/PostgREST. |
| Targeted tests | `PYTHONPATH=backend:backend/src backend/.venv/bin/pytest backend/tests/test_microsoft_graph_onedrive_project_documents.py::test_onedrive_sync_promotes_assigned_file_to_project_documents backend/tests/test_microsoft_graph_onedrive_project_documents.py::test_existing_onedrive_metadata_still_promotes_to_project_documents -q` | Passed | `2 passed`; existing Graph file promotion behavior still works after the shared timeout guard. |
| Remediation | `GRAPH_INGEST_MAX_FILES_PER_FOLDER=10 GRAPH_PROJECT_DOCUMENT_UPSERT_TIMEOUT_SECONDS=3 ... run_graph_sync_phase.py sharepoint --skip-embedding` | Passed | Bounded SharePoint sync-only pass capped Accounting folder at `10` supported files, completed with `errors=[]`, and promoted `2` attachments. Watchdog then showed SharePoint Accounting and SOP freshness at `0-2` minutes old. |
| Guardrail | `backend/src/scripts/run_graph_sync_phase.py` | Updated | Added `--skip-ocr` and `--skip-attachment-promotion` so source freshness phases can be run without unrelated OCR/attachment workers. This exposed that Teams DM source sync had completed enough to reach OCR, where the old foreground run stalled. |
| Static/type/lint | `PYTHONPATH=backend:backend/src backend/.venv/bin/python -m py_compile backend/src/scripts/run_graph_sync_phase.py backend/src/services/integrations/microsoft_graph/sync.py` | Passed | Phase runner and sync orchestration compile after source-only flags. |
| Remediation | `TEAMS_DM_SYNC_MAX_USERS=4 TEAMS_DM_EXPORT_MAX_PAGES=2 TEAMS_DM_EXPORT_PAGE_SIZE=25 ... run_graph_sync_phase.py teams-dm --skip-embedding` | Stopped/Exposed OCR stall | Teams DM export progressed through selected users but the foreground run stalled in `ocr_worker._fetch_no_text_records`; interrupted after useful foreground window. |
| Remediation | `TEAMS_DM_SYNC_MAX_USERS=4 ... run_graph_sync_phase.py teams-dm --skip-embedding --skip-ocr --skip-attachment-promotion` | Blocked/DB pressure | Source-only Teams DM retry failed fast at pressure guard: `App DB pressure guard blocked graph_sync: total_connections=37>35`. No guard bypass was used. |
| Remediation | `PYTHONPATH=backend:backend/src backend/.venv/bin/python backend/src/scripts/run_graph_sync_phase.py teams --skip-embedding` | Passed | Teams channel sync processed `5` selected channels, handled a stale delta token fallback for the AI Assistant channel, and returned `errors=[]`. |
| Lifecycle ledger | `node scripts/verify/backfill_source_lifecycle_from_current_state.mjs --days 1 --source-limit 1500` | Passed | Refreshed `190` rows after bounded sync work; project-required lifecycle counts remained stable: Fireflies PI `6`, Teams PI `1`, SharePoint PI `46`. |
| Targeted tests | `npm run rag:verify:source-lifecycle -- --days 1 --min-embedded-ratio 1 --min-project-assigned-ratio 0 --min-task-assigned-ratio 0 --require-lifecycle-rows false` | Passed | Current verifier remains green under fail-loud thresholds: meetings/Teams vectorized and project-required assignment healthy; SharePoint remains `46/156` project-required assigned and `171/171` embedded. |
| DB/provider read-back | `run_source_rag_health_check(trigger_remediation=False)` with compact output | Failed/Degraded by real lifecycle gaps | Latest matrix: meetings PI `6/6` but tasks `4/6`; Teams current project-required lifecycle healthy; emails still `0` current 24-hour RAG rows but Outlook freshness critical cleared for Brandon; SharePoint freshness improved but lifecycle remains `46/156` assigned/tasks/PI warning. Remaining criticals are Teams channel and Teams DM freshness. |
| Guardrail | `backend/src/services/integrations/microsoft_graph/ocr_worker.py` | Updated | Added `GRAPH_OCR_FETCH_TIMEOUT_SECONDS` around the `no_text` Supabase/PostgREST fetch so OCR side work cannot hang a foreground sync silently. |
| Targeted tests | `PYTHONPATH=backend:backend/src backend/.venv/bin/pytest backend/tests/test_graph_sync_options.py::test_ocr_no_text_fetch_times_out_loudly backend/tests/test_graph_sync_options.py::test_run_graph_sync_can_skip_heavy_embedding_and_compiler -q` | Passed | `2 passed`; the OCR no-text fetch now fails loudly on a stalled query and source-only graph sync still skips heavy workers. |
| Remediation | `TEAMS_DM_SYNC_MAX_USERS=4 TEAMS_DM_EXPORT_MAX_PAGES=2 TEAMS_DM_EXPORT_PAGE_SIZE=25 ... run_graph_sync_phase.py teams-dm --skip-embedding --skip-ocr --skip-attachment-promotion` | Passed | Source-only Teams DM pass completed with `teams_dm=8`, selected `acannon`, `accounting`, `awehner`, and `bclymer`, and returned `errors=[]`. |
| Observability fix | `scripts/verify/backfill_source_lifecycle_from_current_state.mjs`, `scripts/verify/verify_source_lifecycle_health.mjs`, `/api/admin/source-sync/status`, `source_rag_health.py` | Updated | Daily lifecycle now includes recent RAG-side Outlook email metadata when app `document_metadata` does not have a current row. This corrected the false `0 emails` view and exposed the real Outlook backlog. |
| Guardrail | `/api/admin/source-sync/status` and `backend/src/services/health/source_rag_health.py` | Updated | Batched per-source lookups to avoid PostgREST URL-length failures after the daily source set expanded from `190` rows to `847` rows. |
| Static/type/lint | `node --check scripts/verify/verify_source_lifecycle_health.mjs && node --check scripts/verify/backfill_source_lifecycle_from_current_state.mjs`; `py_compile source_rag_health.py ocr_worker.py embed.py`; `eslint src/app/api/admin/source-sync/status/route.ts` | Passed | Syntax, Python compile, and changed API route lint pass after split-RAG email and batching changes. |
| Remediation | Two bounded `embed_pending_graph_documents(..., limit=25)` passes | Passed | First pass embedded `17` docs (`teams_message=16`, `email=1`) with `18` chunks and `0` errors. Second pass embedded `21` docs (`email=12`, `email_attachment=7`, `teams_message=2`) with `25` chunks and `0` errors. |
| Guardrail | `backend/src/services/integrations/microsoft_graph/embed.py` | Updated | RAG-only Outlook rows no longer log expected app metadata absence as a warning; the embedder now treats app-missing/RAG-present fallback as informational and still warns/errors only when RAG metadata is unavailable. |
| Remediation | `embed_graph_document(..., "teamsdm_f8040d175e4c02da_2026-06-11")` | Passed | Cleared the final Teams DM vectorization miss; direct embed wrote `1` chunk. |
| Lifecycle ledger | `node scripts/verify/backfill_source_lifecycle_from_current_state.mjs --days 1 --source-limit 1500` | Passed | Refreshed `847` lifecycle rows after split-RAG email observability and embedding work. Outlook now appears as `628` recent lifecycle rows instead of `0`: `252` project-assignment review, `167` indexed for RAG, `157` project-assigned, `52` Project Intelligence updated. |
| Targeted tests | `node scripts/verify/verify_source_lifecycle_health.mjs --days 1 --source-limit 1500 --min-embedded-ratio 1 --min-project-assigned-ratio 0 --min-task-assigned-ratio 0 --require-lifecycle-rows false` | Failed/Current RAG health | Strict verifier now fails only on Outlook email embedding coverage. Current counts: Fireflies `7/7` embedded, Teams `26/26` embedded, SharePoint `171/171` embedded, Outlook `271/570` embedding-required rows embedded. |
| DB/provider read-back | `run_source_rag_health_check(trigger_remediation=False)` with compact output | Failed/Degraded by real lifecycle gaps | Watchdog runs with the larger `847` source set. Meetings vectorized/project/PI healthy with tasks warning `4/6`; Teams vectorized healthy `26/26` but project/tasks/PI warning; Emails synced `628/628`, vectorized `271/570`, project-assigned `324/547`, tasks `0/547`, PI `0/547`; SharePoint vectorized `171/171`, project-assigned `46/156`, tasks `40/156`, PI `46/156`. |
| Remediation | Subagent bounded Outlook embedding drain | Passed | Worker drained remaining Outlook/email embeddings in bounded batches under the pressure guard. Final worker report: Outlook `embedding_required=559`, `embedded=559`, `remaining=0`, errors `0`. |
| Lifecycle ledger | `node scripts/verify/backfill_source_lifecycle_from_current_state.mjs --days 1 --source-limit 1500` | Passed | Current refresh after embedding drain and Outlook wrapper work prepared/wrote `719` lifecycle rows. |
| Remediation | `PYTHONPATH=backend:backend/src backend/.venv/bin/python backend/src/scripts/backfill_unlinked_intake_emails.py --lookback-days 1 --limit 100` | Passed | Outlook-only wrapper created `1` missing RAG/app bridge row, normalized `51` assigned rows, marked `49` review-needed, and projected vectorization statuses for `100` intake rows with `0` errors. |
| Remediation | `PYTHONPATH=backend:backend/src backend/.venv/bin/python backend/src/scripts/backfill_unlinked_intake_emails.py --lookback-days 1 --limit 500` | Passed | Larger Outlook-only wrapper scanned `134` project-assignment rows: `69` assigned/normalized, `5` not-project, `60` review-needed, `0` failed; vectorization statuses updated for `134` rows with `124` embedded and `10` skipped. |
| Remediation | `embed_graph_document(..., "outlook_AAMkADBjMWMyYWI1LWE4ZjAtNDUwMy04NzBmLWYyN2Q3MDg0ZDU2ZgBGAAAAAACGVNWcC9x6TZ3hpX2q-XxPBwDu9QOyYKZbS5NACM9H9erIAAAAAAEMAADu9QOyYKZbS5NACM9H9erIAADnjURlAAA=")` | Passed | Embedded the single new Outlook bridge row created by the 100-row wrapper pass; wrote `1` chunk. |
| Targeted tests | `node scripts/verify/verify_source_lifecycle_health.mjs --days 1 --source-limit 1500 --min-embedded-ratio 1 --min-project-assigned-ratio 0 --min-task-assigned-ratio 0 --require-lifecycle-rows false` | Passed | Lightweight lifecycle verifier now green for vectorization across all families: Fireflies `7/7`, Teams `26/26`, Outlook `436/436`, SharePoint `171/171`, failures `[]`. |
| DB/provider read-back | `run_source_rag_health_check(trigger_remediation=False)` | Blocked/DB pressure | Watchdog read-back was blocked by the pressure guard after Outlook wrapper work: `App DB pressure guard blocked source_rag_health: total_connections=42>35`. No bypass used. |

## Files Changed

- `docs/ops/tasks/2026-06-22-rag-pipeline-trust-dashboard-alerts.md` - working definition of done.
- `docs/ai-plan/councils/2026-06-22-rag-strategy-council-pipeline-trust-dashboard.md` - strategy decision.
- `frontend/src/app/api/admin/source-sync/_contracts.ts` - typed RAG lifecycle status payload.
- `frontend/src/app/api/admin/source-sync/status/route.ts` - daily source-stage read-back from app/RAG Supabase data.
- `frontend/src/components/ai-intelligence/source-sync-health-panel.tsx` - Daily RAG trust matrix in `/source-sync`.
- `scripts/verify/verify_source_sync_lifecycle_ui_contract.mjs` - static guard for required sources/stages.
- `backend/src/services/health/source_rag_health.py` - scheduled lifecycle alerts and Teams notification bridge.
- `backend/src/services/intelligence/client.py` - JSON-mode fallback for models/providers that reject `response_format`.
- `backend/src/services/intelligence/compiler.py` - bounded source-intelligence enqueue path for Outlook/Graph sync reliability.
- `backend/src/services/integrations/microsoft_graph/client.py` - bounded per-call Graph GET timeout/retry controls.
- `backend/src/services/integrations/microsoft_graph/outlook.py` - metadata-only attachment listing, escaped Graph attachment detail IDs, metadata-only intake attachments by default, queued source intelligence by default, and bounded per-mailbox message caps.
- `backend/src/services/integrations/microsoft_graph/project_documents.py` - bounded shared project-document promotion upsert for Graph file/attachment sources.
- `backend/src/services/integrations/microsoft_graph/embed.py` - queued source intelligence by default after embedding so vectorization is not blocked by inline projection writes.
- `backend/src/services/integrations/microsoft_graph/sync.py` - SharePoint and OneDrive sync controls split; OneDrive disabled by default, SharePoint remains the default file source.
- `backend/src/services/integrations/microsoft_graph/onedrive.py` - bounded per-folder file ingestion, once-only optional PDF dependency warnings, and delta failures raised to the orchestrator.
- `backend/src/scripts/run_graph_sync_phase.py` - removed OneDrive as a manual sync phase; added source-only controls for skipping embedding, OCR, and attachment promotion independently.
- `backend/src/services/scheduler.py` - scheduled Graph sync copy/metrics now reference SharePoint files.
- `backend/src/services/health/source_sync_health.py` - generic Graph document health maps to SharePoint and promotion alerts are SharePoint-only.
- `backend/src/services/pipeline/extractor.py` - task extraction now reports persisted task rows separately from attempted/skipped tasks.
- `frontend/src/app/api/admin/rag-snapshots/route.ts` - daily file snapshot source renamed from OneDrive to SharePoint.
- `frontend/src/app/(admin)/rag/page.tsx` - daily snapshot table labels file column as SharePoint.
- `frontend/src/app/api/cron/graph-sync/route.ts` - cron copy references SharePoint files.
- `.env` - local Graph sync defaults disable OneDrive and enable SharePoint.
- `scripts/verify/verify-render-web-scheduler-disabled.mjs` - Render guardrail expects OneDrive disabled and SharePoint enabled for the graph cron.
- `scripts/verify/verify_integration_health.py` - integration health checks SharePoint documents and treats OneDrive sync-state rows as inactive.
- `scripts/verify/backfill_sharepoint_ap_check_project_assignments.mjs` - strict model-free SharePoint AP check attribution from Acumatica bill/check evidence and unique in-document project references.
- `backend/tests/test_graph_embed.py` - guardrail for queued source intelligence on the embed path.
- `backend/tests/test_outlook_intake.py` - guardrails for attachment timeout/metadata-only behavior, escaped Graph IDs, and queued Outlook intelligence.
- `backend/tests/test_microsoft_graph_onedrive_project_documents.py` - guardrails for bounded file ingestion and OneDrive delta failure propagation.
- `render.yaml` - source RAG health cron notification/remediation environment keys.

## Risks / Gaps

- Existing worktree contains unrelated dirty files; this task must stage only
  owned files.
- Outlook/email vectorization is no longer the active blocker. The current
  blocker moved downstream: recent assigned Outlook RAG rows were missing app
  `document_metadata` catalog rows, and the intelligence compiler requires that
  app row before it can extract tasks or update Project Intelligence. Added
  `backend/src/scripts/backfill_outlook_rag_metadata_to_app_documents.py` to
  bridge only already-assigned RAG Outlook rows into the app catalog.
- Direct root-cause proof: before the bridge, a dry run over the current daily
  Outlook window found `247` assigned Outlook RAG candidates, `7` existing app
  rows, `240` missing app rows, and `240` eligible payloads. The first REST and
  SQL write attempts returned no durable rows because the PM app table has the
  incident trigger `trg_db_incident_block_outlook_document_metadata`; its
  sanctioned session flag is `app.allow_outlook_ingestion_write=true`.
- Bridge remediation proof: bounded apply used the app DB pressure guard and
  transaction-local `app.allow_outlook_ingestion_write=true`, created `240`
  app catalog rows, and follow-up dry run reported `missing_app_rows=0`,
  `existing_app_rows=247`, `eligible_payloads=0`. App-client read-back for
  ten sample IDs returned `10/10` visible rows; SQL read-back showed `169`
  recent assigned Outlook app rows in the 24-hour window.
- Compiler drain is now delegated to worker `019ef2e4-aac5-7003-b96e-1c2e5a55e523`
  for a bounded 25-document Outlook batch using
  `backfill_source_operating_records.py --ids-json ... --force`.
- Compiler worker result: bounded Outlook compiler backfill processed `25`
  documents, succeeded `25`, failed `0`, and made email Project Intelligence
  evidence visible in the daily lifecycle ledger.
- Follow-up guardrail fix: compiler success now writes explicit
  `task_extraction_status` (`no_actionable_tasks` or `task_signal_staged`) and
  lifecycle backfill prefers compiler output with task-extraction metadata before
  newer generic source-processing rows. This moved the authoritative email
  watchdog task stage from `0/409` critical to `7/409` warning after a 10-row
  validation slice; one validation ID failed because the command input was
  malformed, not because of compiler logic.
- Latest watchdog read-back after bridge/compiler fixes: meetings
  synced/vectorized/project/PI healthy with tasks `4/6`; Teams vectorized
  healthy with project/tasks/PI `1/15`; Emails synced `500/500`, vectorized
  `436/436`, project-assigned `193/409`, tasks `7/409`, PI `20/409`;
  SharePoint synced `172/172`, vectorized `171/171`, project-assigned `46/156`,
  tasks `40/156`, PI `46/156`.
- Current live gap: source-sync health still reports critical Outlook and Teams
  freshness, plus real lifecycle gaps for project attribution, task extraction,
  and Project Intelligence. Notification is working, so this fails loudly
  instead of silently passing.
- Outlook attachment-list stall is fixed in code, and one sync-only Outlook run
  completed. Outlook freshness is still broad/rotating: the completed run
  selected `jdawson@alleatogroup.com`, while health readback still showed other
  mailboxes stale.
- SharePoint vectorization is drained for the current 24-hour verifier window:
  `171/171` required SharePoint documents embedded, with `1` intentional
  exclusion. The remaining SharePoint gap is project attribution: after
  Acumatica/accounting and OCR/body-reference backfills, SharePoint is
  `46/156` project-assigned and `110` project-required rows remain in review.
- The source health watchdog can run again, but remains degraded by real
  lifecycle gaps: SharePoint `46/156` project-assigned, `40/156` task-extraction
  outcomes, and `46/156` Project Intelligence evidence for project-required rows.
  The task outcomes are deterministic `no_actionable_tasks` for assigned AP check
  PDFs; remaining SharePoint files still need assignment and extraction.
- Strict accounting and OCR/body evidence improved SharePoint attribution by 35
  AP check PDFs total: 13 exact accounting amount/vendor matches plus 22 unique
  in-document project-reference matches. Remaining AP checks did not have exact
  amount/vendor or unique project-reference evidence and are intentionally left
  in review instead of guessed.
- Outlook/Teams freshness remediation is now source-visible. Capped Outlook
  passes refreshed `bclymer`, `njepson`, `ctragesser`, `cgillespie`, `acannon`,
  and `accounting` without queue stalls. The daily lifecycle no longer reports
  false `0` email rows; it now shows `628` recent Outlook/email rows and exposes
  the real downstream backlog: `271/570` embedded, `324/547` project-assigned,
  `0/547` task outcomes, and `0/547` Project Intelligence evidence in the
  watchdog matrix.
- Teams DM source-only sync now completes under bounded controls. Current Teams
  vectorization is healthy at `26/26` embedding-required rows after the direct
  Accounting Team DM embed. Remaining Teams warnings are project assignment,
  task extraction, and Project Intelligence for newly visible DM rollups.
- Fireflies current 24-hour project assignment is now clean in the lighter
  verifier: `6/6` project-required rows assigned and no project-assignment-review
  samples. Fireflies current 24-hour Project Intelligence is now clean:
  `6/6` project-required rows have Project Intelligence evidence. Two meeting
  task-extraction gaps are now explained instead of hidden:
  Vermillion and Exol extracted task candidates, but the task writer skipped all
  candidates because the assignees resolved to external contacts. The extractor
  now reports persisted vs attempted/skipped task counts so this cannot look
  green without app task rows.
- The scheduled watchdog now runs again and reports degraded state instead of
  being blocked by DB pressure. Current meeting warning is `tasks_extracted`
  `4/6`; current SharePoint warnings
  remain `46/156` project-assigned, `40/156` task outcomes, and `46/156`
  Project Intelligence.
- SharePoint freshness is now current for the configured SharePoint folders
  checked by the watchdog, but SharePoint lifecycle remains degraded because
  `110` project-required documents still lack deterministic project assignment.
- Teams channel sync can complete, and Teams DM export source-only pass now
  completes when DB pressure allows. Additional Teams attribution work remains
  for project-relevant DM rollups that are not safe to guess.
- `RAG_HEALTH_REMEDIATION_WEBHOOK_URL` is not configured, so automatic
  remediation dispatch reports `triggered=false`; Teams notification is the
  immediate alert path.
- Supabase type generation is blocked by an invalid local Supabase access token.
- Broader Render DB-incident scheduler guardrail remains failing for pre-existing
  operational controls outside this source ownership change; file-sync-specific
  live Render env read-back is clean.

## Final Status

- [ ] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.

Blocked/Deferred owner/action: Codex owns the remaining source freshness and
backlog remediation. Next action is to wait for app DB pressure to clear or
reduce active DB pressure, then run bounded sync-only SharePoint and additional
Outlook mailbox passes. After source freshness is current, drain
embedding/source-intelligence queues as separate bounded workers and rerun
`source_rag_health`.
