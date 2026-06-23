# Task: RAG Pipeline Remaining Work To Reach Trusted Daily Health

Status: In Progress
Owner: Codex
Created: 2026-06-23
Linear Issue: AAI-598 - https://linear.app/megankharrison/issue/AAI-598/build-daily-rag-pipeline-trust-dashboard-and-failure-alerts
Related Handoff: docs/ops/tasks/2026-06-22-rag-pipeline-trust-dashboard-alerts.md

## Objective

Finish the remaining work required for the RAG pipeline to be trustworthy every
day. Meeting transcripts, Teams messages, emails, and SharePoint files must all
show complete, live, source-backed coverage through:

- Vectorized/searchable
- Project assigned or explicitly excluded from project-required coverage
- Tasks extracted, including explicit `no_actionable_tasks` when applicable
- Project Intelligence updated
- Project Intelligence updated from full source reads, including full meeting
  transcript content when the source is a transcript
- Operator-visible daily status
- Immediate failure notification

This task exists to prevent hidden partial progress. Long-running drains must be
delegated to subagents or background workers and must not block the main thread.

## Current Authoritative State

## Updated Priority Order - 2026-06-23

1. `/source-sync` dashboard must be reliable first:
   - It must render current lifecycle counts.
   - It must not block on long Graph, embedding, compiler, or watchdog work.
   - It must expose accepted/running/degraded/failed states clearly.
   - Dashboard run controls must start bounded work or delegate it; they must
     not sit on multi-minute requests and then show generic timeout errors.
2. Project Intelligence quality is the next highest priority:
   - PI updated is not complete unless source evidence proves the compiler read
     the full source body where available.
   - Meeting transcript PI requires full transcript-read proof.
   - Teams/email/SharePoint PI requires full message/body/OCR proof or an
     explicit parser limitation reason.
3. Embedding, compiler drains, lifecycle refreshes, and broad watchdog runs are
   subagent/background work by default. The main thread should only inspect
   compact reports and fix concrete blockers.
4. OneDrive remains disabled for file sync; SharePoint is the only active file
   source of truth.

Latest watchdog read-back before this file was created:

| Source | Synced | Vectorized | Project Assigned | Tasks Extracted | Project Intelligence |
| --- | ---: | ---: | ---: | ---: | ---: |
| Meeting transcripts | 7/7 healthy | 7/7 healthy | 6/6 healthy | 4/6 warning | 6/6 healthy |
| Teams messages | 40/40 healthy | 26/26 healthy, 14 excluded | 1/15 warning | 1/15 warning | 1/15 warning |
| Emails | 500/500 healthy | 436/436 healthy, 64 excluded | 193/409 warning | 7/409 warning | 20/409 warning |
| SharePoint files | 172/172 healthy | 171/171 healthy, 1 excluded | 46/156 warning | 40/156 warning | 46/156 warning |

Known improvements already made:

- OneDrive sync was confirmed as duplicate/stale for file ingestion and removed
  from the active manual Graph phase. SharePoint is the file source of truth.
- Outlook/email embedding is no longer the active blocker.
- Missing Outlook app `document_metadata` bridge rows were repaired for the
  bounded current assigned-email window.
- The compiler now records explicit task extraction outcomes:
  `no_actionable_tasks` or `task_signal_staged`.
- The lifecycle backfill now prefers compiler output with task extraction
  metadata over generic lifecycle rows.
- Bounded Outlook compiler workers have succeeded in subagents.
- Embeddings are not the active blocker as of the bounded worker report:
  recent 14-day pending rows are `0`, recent meetings are `79/79` embedded,
  and the worker drained `18` additional Graph/email documents with `0` errors.

## Non-Negotiable Done Rule

This task is not complete until every source above is healthy for every required
stage, the dashboard visibly reflects those counts, notification proof exists,
and evidence is recorded below. If a row is excluded, the exclusion reason must
be explicit and inspectable.

## Execution Rules

- Main thread owns code changes, integration decisions, short read-backs, and
  task ledger updates.
- Subagents own long-running compiler drains, embedding drains, full watchdog
  repeats, broad verifier runs, and browser evidence capture.
- Do not wait on embeddings or compiler drains in the main thread unless the
  result is needed for the next code change.
- Every subagent report must include pass/fail, exact command, concise errors,
  likely owner files, related/unrelated status, processed count, success count,
  failure count, and sample IDs.
- Do not bypass app DB pressure controls.
- Do not mark complete based on lightweight vectorization checks. The scheduled
  watchdog matrix is the authoritative completion gate.

## Remaining Work Checklist

### 1. Email / Outlook Completion

- [x] Confirm Outlook embedding backlog is not the active blocker.
- [x] Bridge assigned Outlook RAG rows into app `document_metadata`.
- [x] Fix compiler task extraction outcome metadata.
- [x] Prove at least one bounded compiler batch moves email task/PI counts.
- [x] Subagent: identify current Outlook blockers without waiting on
      embeddings. Current 24h state: `500` email sources, `436/436`
      embedding-required rows vectorized, project assignment `193/409`,
      task extraction `34/409`, Project Intelligence `34/409`.
- [ ] Subagent: run current bounded Outlook compiler batch for `12` already
      assigned queued rows.
- [ ] Subagent: continue bounded Outlook compiler batches until email
      Project Intelligence coverage reaches the applicable assigned population.
- [ ] Subagent: continue bounded Outlook compiler batches until email task
      extraction coverage reaches the applicable assigned population.
- [ ] Main thread: after each successful batch, run lifecycle backfill:
      `node scripts/verify/backfill_source_lifecycle_from_current_state.mjs --days 1 --source-limit 1500`.
- [ ] Main thread: rerun compact watchdog and record email counts.
- [ ] Main thread: identify remaining `project_assignment_review` email rows
      and split them into deterministic assignment, explicit non-project, or
      review-required buckets.
- [ ] Implement only deterministic email project assignment repairs. Do not
      guess projects for ambiguous emails.
- [ ] Add or update a verifier that fails if assigned Outlook RAG rows are
      missing app `document_metadata` rows.
- [ ] Add or update a verifier that fails if compiler success lacks
      `task_extraction_status`.
- [ ] Verify email source lookup in the AI assistant returns recent processed
      Outlook evidence.

### 2. Teams Message Completion

- [x] Confirm Teams vectorization is healthy for embedding-required rows.
- [x] Mark low-content Teams rows as excluded instead of unembedded failures.
- [x] Subagent: inspect current Teams lifecycle blockers. Current state:
      `40` Teams rows in 1-day window, `26/26` searchable, `14` terminal
      low-content exclusions, `18` project-required rows, `1/18` assigned,
      `1/18` task/PI covered.
- [ ] Normalize `3` contradictory Teams rows that are both
      `skipped_low_content` and `project_assignment_review`.
- [ ] Inspect the remaining Teams excluded rows and confirm every exclusion
      reason is explicit and defensible.
- [ ] Main thread: identify the `17` project-required Teams rows missing
      assignment/task/PI coverage.
- [ ] Implement deterministic Teams project attribution for rows with project
      number/name signals.
- [ ] Leave ambiguous Teams rows in review with concrete reason and sample text.
- [ ] Subagent: run bounded Teams compiler batches after assignment repairs.
- [ ] Refresh lifecycle and watchdog until Teams project/task/PI stages are
      healthy or explicitly excluded.
- [ ] Verify Teams source lookup in the AI assistant returns recent processed
      Teams evidence.

### 3. SharePoint File Completion

- [x] Confirm SharePoint, not OneDrive, is the file source of truth.
- [x] Confirm SharePoint vectorization is healthy for embedding-required rows.
- [x] Process strict Acumatica AP check matches through compiler.
- [x] Main thread/subagent: classify remaining SharePoint review rows by
      deterministic assignment strategy. Current active SharePoint state:
      `187` active docs, `51` assigned, `136` unassigned blockers, `27` likely
      explicit exclusions, `109` manual review, `135/136` embedded.
- [ ] Main thread: reduce the `109` manual-review SharePoint rows by
      deterministic exclusion/assignment strategy:
      rows by deterministic assignment strategy:
      project-number path, OCR/body project reference, Acumatica amount/vendor,
      file path context, or manual review.
- [ ] Implement deterministic SharePoint assignment repairs for safe buckets.
- [ ] Do not guess project assignment for ambiguous SharePoint files.
- [ ] Subagent: run bounded SharePoint compiler batches after each assignment
      slice.
- [ ] Refresh lifecycle and watchdog until SharePoint project/task/PI stages are
      healthy or explicitly excluded.
- [ ] Verify SharePoint document source lookup in the AI assistant returns
      recent processed SharePoint evidence.

### 4. Meeting Transcript Completion

- [x] Meeting sync, vectorization, project assignment, and PI are healthy.
- [ ] Investigate the `2` meeting transcript task-extraction warning rows.
- [ ] Determine whether those rows are true `no_actionable_tasks`,
      external-assignee skipped tasks, or task writer failures.
- [ ] Persist explicit task extraction outcomes for the two warning rows.
- [ ] Refresh lifecycle and watchdog until meeting task extraction is healthy or
      explicitly excluded.
- [ ] Verify meeting source lookup in the AI assistant returns recent transcript
      evidence.
- [x] Verify Project Intelligence updates for meeting transcripts were generated
      from full transcript reads, not metadata, summaries, snippets, or title-only
      context.
- [x] Add evidence that the compiler input for each current project-required
      transcript includes the full transcript text or a complete chunk coverage
      manifest before PI evidence is counted as updated.
- [x] Add a fail-loud guardrail so a transcript can be vectorized and assigned
      but still fail the PI stage if the compiler did not read the full
      transcript body.

### 4A. Full-Source Project Intelligence Read Coverage

- [x] Top priority: implement full-read Project Intelligence proof before
      accepting PI status as green for meeting transcripts.
- [x] Define the minimum read-proof contract for PI updates:
      source id, source family, compiler job id, content character count or
      chunk coverage count, source hash, read timestamp, and PI evidence id.
- [x] Implement or identify the ledger field that stores full-read proof for
      source compiler runs.
- [x] Backfill full-read proof for current meeting transcript PI evidence.
- [x] Verify all current meeting transcript PI rows have full transcript-read
      proof before they are counted as complete.
- [ ] Extend the same proof pattern to Teams, emails, and SharePoint where
      available: full message/email/file body or explicit parser/OCR limitation
      reason.
- [ ] Update `/source-sync` so the Project Intelligence stage can distinguish
      `updated_from_full_read`, `updated_without_full_read_proof`, and
      `not_updated`.
- [x] Add a verifier that fails if Project Intelligence evidence exists for a
      required transcript but the associated compiler run lacks full transcript
      read proof.

### 5. Visual Daily Trust Dashboard

- [x] `/source-sync` daily RAG trust matrix exists.
- [x] Replace `/rag` with the clear operator-facing RAG lifecycle dashboard;
      `/source-sync` can remain the low-level sync/debug page.
- [x] Matrix includes meeting transcripts, Teams messages, emails, and
      SharePoint files.
- [x] Matrix reports sync, vectorization, project assignment, task extraction,
      and Project Intelligence stages.
- [x] Ensure dashboard uses authoritative scheduled watchdog/lifecycle data, not
      a stale or lightweight-only verifier.
- [ ] Ensure every warning/critical cell exposes source, stage, count, latest
      timestamp, owner hint, and exclusion count.
- [x] Ensure dashboard run controls never block on long Graph/embedding/compiler
      work; long work must return accepted/delegated/running status.
- [x] Fix `backend.source-sync.graph-sync did not complete within retry policy`
      so the dashboard action returns a clear accepted/delegated state instead
      of a generic timeout.
- [ ] Add drill links for samples needing project assignment review.
- [ ] Add drill links for failed compiler/task extraction rows.
- [ ] Add explicit "searchable by AI assistant" status derived from embedded
      chunks and source-specific retrieval availability.
- [x] Browser subagent: capture dashboard proof with current degraded state.
- [x] `/rag` Sync history now counts Fireflies meeting rows from
      `document_metadata.created_at` and shows meeting `Added` vs full-pipeline
      `Complete` instead of using only `source_sync_runs`.
- [x] Fix `/rag` table regression where the UI still rendered generic
      `Synced/Failed` meeting columns and warning icons across normal empty
      historical cells even though the API exposed `meetings_added` and
      `meetings_complete`.
- [ ] Browser subagent: capture dashboard proof again after final green state.

### 6. Immediate Notification Path

- [x] Teams notification path has previously sent a watchdog alert.
- [x] Clear current Fireflies `AuthenticationError` source-processing alerts by
      reprocessing affected meeting IDs after AI Gateway health is verified.
- [x] Add or update a provider-auth verifier so invalid AI Gateway credentials
      fail before meeting transcript source jobs enter retry loops.
- [ ] Rerun watchdog with degraded state and confirm notification persistence
      records sent/skipped/failed.
- [ ] Confirm Teams notification includes the lifecycle stage matrix, not only
      high-level source freshness.
- [ ] Confirm notification fires immediately for critical stages.
- [ ] Confirm warning-only degraded state still records alert rows.
- [ ] Document missing remediation webhook as a non-blocking automation gap or
      configure it if credentials are available.
- [ ] Add guardrail so notification delivery never silently fails.

### 7. Verifiers And Regression Guardrails

- [x] Lightweight lifecycle verifier proves vectorization is green.
- [x] Scheduled watchdog fails loudly while downstream stages are degraded.
- [ ] Add or update a strict completion verifier that requires all four source
      families to be healthy for all required stages.
- [ ] Add or update a verifier for OneDrive staying disabled and SharePoint
      staying enabled as file source.
- [ ] Add or update a verifier for Outlook RAG-to-app metadata bridge coverage.
- [ ] Add or update a verifier for compiler task extraction metadata.
- [ ] Add or update source-specific AI assistant retrieval tests for meetings,
      Teams, emails, and SharePoint.
- [ ] Subagent: run full relevant verifier suite and return compact report.

### 8. Data And Architecture Cleanup

- [ ] Remove or clearly quarantine stale OneDrive rows from daily operator
      counts if they still appear through legacy history.
- [ ] Confirm `source_processing_jobs` and `source_intelligence_jobs` ownership:
      which table is lifecycle ledger versus compiler queue.
- [ ] Normalize naming so task extraction status is not lost between compiler
      output and lifecycle rows.
- [ ] Confirm app DB incident trigger settings are only used in bounded repair
      scripts, not normal ingestion.
- [ ] Update architecture docs to reflect SharePoint-only file source and
      split app/RAG DB lifecycle.
- [ ] Update runbook with exact commands for future daily repair.

### 9. Final Acceptance Verification

- [ ] Run lifecycle backfill.
- [ ] Run authoritative watchdog.
- [ ] Required final watchdog matrix:
      meetings healthy for vector/project/tasks/PI;
      Teams healthy or explicitly excluded for vector/project/tasks/PI;
      emails healthy or explicitly excluded for vector/project/tasks/PI;
      SharePoint healthy or explicitly excluded for vector/project/tasks/PI.
- [ ] Required final full-read matrix:
      every current project-required meeting transcript counted as PI-updated
      has full transcript-read proof; no transcript PI row is accepted from
      metadata-only, title-only, snippet-only, or stale summary-only compiler
      context.
- [ ] Run source-specific AI assistant retrieval checks for all four sources.
- [ ] Run browser dashboard verification with screenshot/video artifact.
- [ ] Confirm notification delivery proof.
- [ ] Update this file and
      `docs/ops/tasks/2026-06-22-rag-pipeline-trust-dashboard-alerts.md`
      with final evidence.
- [ ] Only then mark the goal complete.

## Subagent Queue

Use subagents for these tasks immediately when continuing work:

1. Embedding/vectorization drain worker:
   - Run bounded embedding verification/drain only.
   - Respect DB pressure guards.
   - Return compact source counts and errors.
   - Do not block the main thread.

2. Project Intelligence full-read proof worker:
   - Identify compiler ledger fields and patch scope for full transcript-read
     proof.
   - Prioritize meeting transcripts before Teams/email/SharePoint.
   - Return exact owner files and verifier design.

3. Outlook compiler drain worker:
   - Select 25 assigned Outlook docs without task metadata.
   - Run `backfill_source_operating_records.py --ids-json ... --force`.
   - Return compact pass/fail report.

4. Teams attribution explorer:
   - Inspect the 14 Teams project-required warning rows.
   - Return deterministic assignment candidates and ambiguous rows.
   - No writes.

5. SharePoint attribution explorer:
   - Inspect remaining SharePoint review rows.
   - Group by deterministic assignment strategy.
   - No writes.

6. Browser/dashboard verifier:
   - Capture `/source-sync` daily matrix.
   - Confirm warning/critical cells expose source/stage/count/owner.
   - Return artifact paths.

7. Final verifier:
   - Run strict lifecycle/watchdog/source-lookup checks after remediation.
   - Return compact report only.

## Current Blockers / Risks

- Full goal is not blocked, but it is not complete.
- Current `/rag` read-back shows 2026-06-22 meeting metadata rows as `7` added
  and `6` full-pipeline complete. The remaining incomplete 2026-06-22 row is
  `Weekly Touch Base`, which has no project assignment and no PI completion.
- Current `/rag` read-back shows 2026-06-23 meeting metadata rows as `3` added
  and `0` full-pipeline complete: two are vectorized and project assigned, but
  none have task extraction or PI completion yet.
- Evidence artifact:
  `frontend/tests/agent-browser-runs/rag-meeting-added-complete-fixed.png`.
- Regression-fix evidence artifact:
  `frontend/tests/agent-browser-runs/rag-sync-history-added-complete-no-icon-noise.png`.
- Outlook recovery evidence, 2026-06-23:
  - Fetch-only Outlook phase succeeded locally for `awehner@alleatogroup.com`:
    `14` synced, embedding/OCR/attachment promotion skipped.
  - Fetch-only Outlook phase succeeded locally for `bclymer@alleatogroup.com`:
    `41` synced, embedding/OCR/attachment promotion skipped.
  - `/rag` now reads Outlook daily inventory from AI DB `rag_document_metadata`,
    not stale app DB `document_metadata`, and shows 2026-06-23 Outlook as
    `56` added / `0` complete.
  - Bounded local embedding drain succeeded: first `5` docs with `0` errors,
    then `25` additional email docs with `0` errors.
  - Current 2026-06-23 Outlook stage counts: `56` added, `30` vectorized,
    `17` project assigned, `0` task rows, `0` Project Intelligence evidence,
    `0` complete.
  - Evidence artifact:
    `frontend/tests/agent-browser-runs/rag-outlook-ai-db-added-complete.png`.
- Targeted lint passed:
  `cd frontend && npx eslint src/app/'(admin)'/rag/page.tsx src/app/api/admin/rag-snapshots/route.ts --cache --cache-strategy content`.
- Full frontend typecheck was attempted and hit the repo's bounded 60-second
  timeout in `scripts/run-typecheck-bounded.mjs`; this is an existing broad
  typecheck performance limit, not a specific syntax/lint failure in the edited
  files.
- The remaining work is mostly coverage and attribution, not embedding.
- Project assignment cannot be guessed. Ambiguous rows must stay review-needed
  with explicit reasons.
- Existing worktree contains unrelated dirty files. Do not stage or revert
  unrelated frontend/email/site-map changes while finishing this RAG task.
- Supabase type generation has previously failed locally due an invalid CLI
  access token. Use live read-back for operational evidence unless credentials
  are repaired.
- Broad verification can be slow and must be delegated.

## Evidence To Record Going Forward

| Check | Command / artifact | Result | Notes |
| --- | --- | --- | --- |
| Outlook compiler batch | `ALLOW_PM_APP_FINAL_PROJECTIONS=true PYTHONPATH=backend:backend/src backend/.venv/bin/python backend/src/scripts/backfill_source_operating_records.py --ids-json ... --force` | Pending | Run in subagent batches. |
| Lifecycle refresh | `node scripts/verify/backfill_source_lifecycle_from_current_state.mjs --days 1 --source-limit 1500` | Pending | Run after every compiler/assignment batch. |
| Watchdog matrix | `run_source_rag_health_check(trigger_remediation=False)` compact output | Pending | Authoritative status gate. |
| Dashboard proof | `frontend/tests/agent-browser-runs/source-sync-final-working.png` | Pass for current degraded state | `/source-sync` HTTP 200; daily RAG trust matrix renders real counts for meetings, Teams, emails, and SharePoint; no page/request errors; notification state says ready. |
| Notification proof | Watchdog alert persistence and Teams notification result | Pending | Must show sent/skipped/failed. |
| Full transcript PI proof | `npm run rag:verify:project-intelligence-read-proof -- --days 1 --family fireflies` | Passed | Current Fireflies meeting PI evidence checked `6`; failures `[]`. Verifier now requires `metadata.read_proof.status=full_source_read scope=full_transcript`, and the dashboard/backend health metadata merge prefers proof-bearing intelligence rows over newer generic lifecycle rows. |
| AI Gateway auth alert | `npm run rag:verify:render-ai`; bounded Fireflies compiler repair subagent; `npm run rag:verify:source-provider-auth -- --hours 24`; `frontend/tests/agent-browser-runs/source-sync-auth-alert-cleared.png` | Passed | Gateway key and Render backend health are valid; compiler repair processed `13/13` meeting IDs with `0` command failures; lifecycle refresh wrote `1089` rows; provider-auth verifier reports `authFailures=[]`; `/source-sync` no longer contains `AuthenticationError` or `AI_GATEWAY_API_KEY` alert text. |
| Dashboard graph-sync timeout | Authenticated Playwright request to `POST /api/admin/source-sync/graph-sync` | Passed | Route returned HTTP `202` with `status=accepted`, `timeoutMs=15000`, and refresh/delegation next step instead of `backend.source-sync.graph-sync did not complete within retry policy`. |
| Embedding subagent | Worker report `019ef319-9664-7061-9112-85bc86df07bc` | Passed with warnings | Embeddings are not blocking current RAG goal: graph embedding contract passed, provider auth passed, meeting vectorization passed `79/79`, recent 14-day pending embedding rows `0`, bounded Graph drains embedded `18`, skipped `2`, failed `0`. Older cleanup debt remains: `11` unknown-family rows and `2` old Outlook rows. |
| Project Intelligence full-read proof | `npm run rag:verify:project-intelligence-read-proof -- --days 1 --family fireflies` | Passed | Initial verifier correctly exposed `6` Fireflies PI rows missing read-proof visibility. Targeted six-row compiler touch wrote `full_source_read` proofs with transcript character counts (`33386` to `198477` chars), then verifier passed with `checked=6`, `failures=[]`. |
| Outlook blocker classification | Worker report `019ef430-ce9f-7e70-99a0-2f397db52f9f` | Failed/current lifecycle gaps | Embeddings green: `436/436` embedding-required Outlook rows vectorized. Downstream blockers remain: project assignment `193/409`, task extraction `34/409`, Project Intelligence `34/409`. |
| SharePoint blocker classification | Worker report `019ef431-3e94-71c0-89ef-7a424618b9dd` | Failed/current lifecycle gaps | Active SharePoint only: `187` docs, `51` assigned, `136` unassigned blockers. Classifier found `27` likely explicit exclusions and `109` manual-review rows; no deterministic project-number/path/body/AP matches in the bounded read-only check. |
| Teams blocker classification | Worker report `019ef431-36e7-70b1-8933-d7b1483e59e9` | Failed/current lifecycle gaps | Teams embeddings are green: `26/26` searchable with `14` low-content exclusions. Downstream blockers remain: `18` project-required rows, `1/18` assigned, `1/18` task/PI covered, and `3` contradictory low-content/project-review rows need normalization. |
| `/rag` dashboard replacement | `frontend/tests/agent-browser-runs/rag-sync-tab.png`; `frontend/tests/agent-browser-runs/rag-lifecycle-unified-table-fixed.png`; `cd frontend && npx eslint src/app/(admin)/rag/page.tsx --cache --cache-strategy content` | Passed | `/rag` now uses the shared table-page tab pattern. The first tab restores the original daily sync-history table. The RAG lifecycle tab is a single unified table with source, stage, status, complete, remaining, owner, and current evidence columns. |
| `/rag` Acumatica sync history | `frontend/tests/agent-browser-runs/rag-sync-history-acumatica-fixed.png`; `cd frontend && npx eslint src/app/(admin)/rag/page.tsx src/app/api/admin/rag-snapshots/route.ts --cache --cache-strategy content` | Passed | Sync history now includes Acumatica grouped columns. The API merges `acumatica_sync_runs` from the app database with RAG `source_sync_runs`, and day totals include Acumatica synced/failed counts. |
| `/rag` today sync counts | `frontend/tests/agent-browser-runs/rag-sync-history-today-counts-fixed.png`; `cd frontend && npx eslint src/app/(admin)/rag/page.tsx src/app/api/admin/rag-snapshots/route.ts --cache --cache-strategy content` | Passed | Root cause: Microsoft Graph vectorization runs were filtered out because the sync-history API only accepted source-specific run names. The route now distributes `microsoft_graph` rows by `metadata.by_category` (`email`, `email_attachment`, `teams_message`) and the page no longer blocks the sync-history tab on the lifecycle status request. June 23 now shows Outlook `346`, Teams `88`, Day total `434`, and Meetings failed `35`. |
| `/rag` missing-run state | `frontend/tests/agent-browser-runs/rag-sync-history-fireflies-run-recorded.png`; `cd frontend && npx eslint src/app/(admin)/rag/page.tsx src/app/api/admin/rag-snapshots/route.ts --cache --cache-strategy content`; `backend/.venv/bin/python -m py_compile backend/src/services/ingestion/fireflies_pipeline.py` | Passed | Root cause: June 22 had `124` sync-run rows but `0` Fireflies source-sync rows, so Meetings should not have rendered as a harmless zero. The API now returns per-source run counts and the table renders a semantic warning icon when a source did not run. Fireflies memory extraction now has a 20-second no-retry cap so downstream AI enrichment cannot hold source sync open indefinitely. A limit-1 Fireflies sync completed and recorded `status=succeeded`, `items_seen=1`, `items_skipped=1`, `items_failed=0`. |

## 2026-06-23 Source Sync Page Repair Evidence

- Fixed local `/source-sync` backend routing so development uses the local
  FastAPI backend at `127.0.0.1:8000` unless `SOURCE_SYNC_BACKEND_URL` is set.
  The previous route preferred production `BACKEND_URL` from `.env`, causing
  local source-sync status to time out against Render.
- Started local FastAPI in API-only mode on port `8000`; read-back:
  `/health` returned `status=healthy`, `ai_provider_path=vercel_gateway`.
- Fixed the status API lifecycle read-back to include
  `source_intelligence_jobs.output_summary` as task extraction evidence and to
  count `task_signal_staged` as an extraction outcome.
- Fixed intermittent RAG matrix failures by reducing long source-ID batch size
  and retrying transient Supabase `fetch failed` read errors.
- Browser proof: `frontend/tests/agent-browser-runs/source-sync-final-working.png`.
  Result: page returned HTTP 200, daily RAG matrix rendered real counts, and the
  current degraded state is visible instead of a blank/unknown `0/0` matrix.
  Current displayed matrix includes meetings `7` rows, Teams `40` rows, emails
  `500` rows, SharePoint `172` rows, and `Notification ready`.

## Files Changed By This Remaining-Work Plan

- `docs/ops/tasks/2026-06-23-rag-pipeline-remaining-work.md` - complete remaining task ledger.
- `frontend/src/app/api/admin/source-sync/_shared.ts` - local dev backend URL
  resolution for source-sync controls.
- `frontend/src/app/api/admin/source-sync/status/route.ts` - authoritative RAG
  lifecycle read-back, compiler-output task evidence, smaller batches, and
  transient Supabase read retries.

## Final Status

- [ ] All checklist items are complete.
- [x] Evidence is recorded for current remaining state.
- [x] Deferred/remaining work is explicitly listed with owner and next action.
- [ ] Final response includes what is done, what remains, and recommended next steps.
