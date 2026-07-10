# Current Path Inventory Against Target Architecture

Date: 2026-06-25
Task: AAI-637 / S91
Target architecture: `/Users/meganharrison/Documents/alleato-pm/docs/architecture/AI-DATA-PIPELINE-RAG-PRODUCTION-ARCHITECTURE.md`

This inventory compares current repo/provider evidence against the target production architecture. It does not authorize deletion by itself; deletion still requires import, route, provider-schedule, database-write, and verifier proof.

## Provider Schedule Readback

### Render

Evidence:

- `/Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/render-services.json`
- Command: `render services --output json`

| Service | Live status | Live schedule | Target status | Classification |
| --- | --- | --- | --- | --- |
| `alleato-graph-sync` | active | `20 */2 * * *` | Outlook/SharePoint reconciliation owner | Keep; verify command parity with target architecture |
| `alleato-teams-channel-sync` | active | `10 * * * *` | Teams channel reconciliation owner | Keep; verify webhook coverage separately |
| `alleato-teams-dm-sync` | active | `40 * * * *` | Teams DM reconciliation owner | Keep; verify source lifecycle assignment gap under AAI-639 |
| `alleato-fireflies-sync` | active | `15 * * * *` | Fireflies polling fallback owner | Keep; investigate error backlog under AAI-640 |
| `alleato-graph-subscription-reconcile` | active | `0 */6 * * *` | Microsoft webhook/subscription recovery owner | Keep; verify subscription inventory and webhook drain path |
| `alleato-pipeline-alert` | active | `*/15 * * * *` | pipeline alert owner | Keep; verify completion-lag coverage exists |
| `alleato-source-sync-health` | active | `*/30 * * * *` | source health recompute owner | Keep |
| `alleato-source-rag-health` | active | `5 */4 * * *` | RAG source health alert owner | Mismatch: local `render.yaml` says `*/5 * * * *`; decide intended cadence and converge live/config |
| `alleato-domain-packet-compiler` | active | `30 2,9,15,21 * * *` | domain packet compiler | Keep; verify assistant consumption after source pipeline blockers |
| `alleato-project-synthesis-sweep` | active | `0 7 * * *` | Project Intelligence synthesis backstop | Keep |
| `alleato-acumatica-financial-sync` | suspended by user, service `crn-d827cfm7r5hc73e7lp20`, updated `2026-06-16T22:02:24Z` | `0 */2 * * *` | Acumatica twice-daily or better scheduled sync | Blocker: final architecture requires scheduled Acumatica sync; live service is suspended |
| `alleato-rag-health` | suspended by user, service `crn-d827ch7avr4c739i5mp0`, updated `2026-06-17T04:51:01Z` | `15 12 * * *` | meeting vectorization health alert | Blocker: target requires alerting; live meeting verifier currently fails |
| `alleato-ai-provider-health` | suspended by user, service `crn-d8ndbas8aovs73abp21g`, updated `2026-06-16T22:06:34Z` | `20 * * * *` | provider auth/credit canary | Blocker: target requires provider outage alerting; live canary is suspended |
| `alleato-microsoft-executive-assistant-check` | suspended by user, service `crn-d8orvmmrnols73abp21g`, updated `2026-06-22T18:05:04Z` | `*/15 * * * *` | scheduled Microsoft assistant review/check | Mismatch: target allows webhook plus scheduled fallback; scheduled check is suspended |
| `alleato-executive-daily-brief-morning/evening` | suspended | weekday schedules | intentionally deactivated per repo comments | Not part of this cleanup unless final assistant delivery architecture reactivates it |

### Vercel

Evidence:

- Command: `vercel crons ls`
- Live output: `7 cron jobs found for meganharrisons-projects/alleato-hub (disabled)`

| Path | Live status | Target status | Classification |
| --- | --- | --- | --- |
| `/api/cron/graph-sync` | disabled | Render owns Graph sync | Delete/decommission candidate after route/import proof |
| `/api/cron/graph-embed` | disabled | Render/backend embedding owns vectorization | Delete/decommission candidate after route/import proof |
| `/api/cron/acumatica-sync` | disabled; route returns deprecated stub | Render owns Acumatica sync | Delete/decommission candidate, but first fix Render Acumatica suspension |
| `/api/cron/attribution-rules` | disabled | weekly learning promotion generation may still be valid | Verify-current or migrate to backend scheduler depending final learning architecture |
| `/api/cron/daily-flags` | disabled | outside current RAG source pipeline | Out of scope unless assistant/task automation finalization requires it |
| `/api/cron/decay-memories` | disabled | outside source ingestion pipeline | Out of scope unless memory finalization requires it |
| `/api/cron/progress-reports` | disabled | outside source ingestion pipeline | Out of scope unless reporting finalization requires it |

## Active Code Path Inventory

### Microsoft Graph Sync

Target owner:

- `backend/src/services/integrations/microsoft_graph/sync.py`
- `backend/src/scripts/run_graph_sync_phase.py`
- `backend/src/services/integrations/microsoft_graph/outlook.py`
- `backend/src/services/integrations/microsoft_graph/teams.py`
- `backend/src/services/integrations/microsoft_graph/onedrive.py`
- `backend/src/services/integrations/microsoft_graph/subscriptions.py`
- `backend/src/services/integrations/microsoft_graph/webhooks.py`

Current evidence:

- Render Graph/Teams crons are active.
- Render web service sets `GRAPH_SYNC_ENABLED=false`, `GRAPH_SYNC_OUTLOOK=false`, `GRAPH_SYNC_TEAMS=false`, `GRAPH_SYNC_TEAMS_DM=false`, `GRAPH_SYNC_ONEDRIVE=false`, which supports the target rule that web service should not run background sync.
- Vercel Graph cron routes exist but live Vercel crons are disabled.

Mismatches:

- Repo still contains Vercel Graph cron routes and Vercel cron config, even though final architecture assigns production ownership to Render/backend.
- Source-specific retrieval verifier fails on live Microsoft plus indexed fallback observability.

### Fireflies

Target owner:

- `backend/src/services/ingestion/fireflies_pipeline.py`
- scheduler entry `_run_fireflies_sync`
- `backend/src/scripts/backfill_fireflies_meeting_embeddings.py`
- Fireflies/RAG tables: `fireflies_ingestion_jobs`, `document_metadata`, `rag_document_metadata`, `document_chunks`

Current evidence:

- Render `alleato-fireflies-sync` is active hourly.
- `npm run rag:verify:meetings` fails: `13227` Fireflies ingestion jobs are in `error`; only `70/75` recent meetings have embedded chunks.

Mismatches:

- Target requires Fireflies transcripts to become searchable through RAG immediately; current verifier proves recent gaps.
- Target requires errors to retry/log/alert; backlog indicates alerting/recovery is incomplete or ignored.

### Uploaded PDFs, OCR, And Vision

Target owner:

- `backend/src/services/integrations/microsoft_graph/ocr_worker.py`
- `backend/src/services/pipeline/orchestrator.py`
- `backend/src/services/pipeline/document_parser.py`
- `backend/src/services/pipeline/vision_analyzer.py`
- upload/product routes that create `document_metadata`
- PM App `document_page_intelligence`

Current evidence:

- Code paths exist.
- No end-to-end upload/OCR/vision verifier was run in this slice.

Mismatches:

- Unknown until current upload-to-RAG verifier exists or is run.
- Final architecture requires image extraction and AI vision for visual construction documents; current proof is not yet recorded.

### Embeddings And Vector Storage

Target owner:

- `backend/src/services/integrations/microsoft_graph/embed.py`
- `backend/src/services/pipeline/embedder.py`
- `backend/src/services/pipeline/llm.py`
- AI/RAG `rag_document_metadata`
- AI/RAG `document_chunks`

Current evidence:

- `npm run rag:verify:graph-embedding` passes.
- Meeting verifier fails recent coverage.
- Source lifecycle verifier fails Fireflies embedded coverage in saved run.

Mismatches:

- Graph embedding contract is healthy, but source-level embedding readiness is not production-ready because Fireflies/recent-meeting coverage fails.

### Project Assignment And Task Generation

Target owner:

- `backend/src/services/ingestion/project_assignment.py`
- `backend/src/services/ingestion/communication_project_backfill.py`
- project attribution/backfill scripts under `scripts/verify/`
- `document_attribution_candidates`
- `tasks`

Current evidence:

- `npm run rag:verify:source-lifecycle` fails project-assignment coverage for Fireflies, Teams, Outlook, and generated tasks.

Mismatches:

- Target requires every eligible item to be assigned, review-required, intentionally unassigned, or excluded; current coverage is below threshold.

### AI Assistant Retrieval And Tools

Target owner:

- `frontend/src/app/api/ai-assistant/chat/handler-v2.ts`
- `frontend/src/lib/ai/retrieval/source-specific-rag.ts`
- `frontend/src/lib/ai/retrieval/planner.ts`
- `frontend/src/lib/ai/retrieval/executor.ts`
- `frontend/src/lib/ai/tools/operational.ts`
- `frontend/src/lib/ai/tools/outlook-operations.ts`
- backend Microsoft Executive Assistant route/service

Current evidence:

- `npm run rag:verify:chat-architecture` passes with MCP warnings.
- `npm run rag:verify:source-specific` fails.

Mismatches:

- Source-specific retrieval observability is incomplete.
- `@ai-sdk/mcp` dependency/tool policy exists, but live `/ai-assistant` does not discover/merge/trace/close MCP tools.

### Acumatica

Target owner:

- `backend/src/services/acumatica_sync.py`
- `backend/scripts/run_acumatica_financial_sync.py`
- PM App `acumatica_sync_state`
- PM App `acumatica_sync_runs`

Current evidence:

- Render `alleato-acumatica-financial-sync` is suspended.
- Vercel `/api/cron/acumatica-sync` is disabled and returns a deprecated stub.

Mismatches:

- Target requires Acumatica scheduled cron twice daily; current live provider state does not satisfy that.

## Deletion Or Decommission Candidates

Do not delete until proof is complete.

| Candidate | Reason | Required proof before deletion |
| --- | --- | --- |
| `frontend/src/app/api/cron/graph-sync/route.ts` | Vercel cron disabled; Render owns Graph sync | no imports/internal callers; no active Vercel cron; backend Render Graph sync verified; docs updated |
| `frontend/src/app/api/cron/graph-embed/route.ts` | Vercel cron disabled; Render/backend owns embedding | no imports/internal callers; no active Vercel cron; Graph embedding verifier passes; source lifecycle path has replacement |
| `frontend/src/app/api/cron/acumatica-sync/route.ts` | Vercel cron disabled; route is deprecated stub; Render should own Acumatica | Render Acumatica unsuspended/healthy first; no UI/manual trigger depends on stub response |
| `frontend/vercel.json` Graph/Graph-embed/Acumatica cron entries | disabled live and not target production owner | confirm deployment config can remove entries without affecting non-RAG cron decisions |
| MCP assistant dependency/config surface | package/tool policy exists without live assistant integration | decide AAI-641 implement vs remove; if remove, prove no production assistant path needs MCP |

Reference proof so far:

- `rg` found `/api/cron/graph-sync`, `/api/cron/graph-embed`, and `/api/cron/acumatica-sync` only in `frontend/vercel.json` and their own route files.
- Backend endpoints called by those wrapper routes are still active and must not be deleted as part of Vercel wrapper cleanup: `POST /api/graph/sync` and `POST /api/admin/documents/generate-embeddings`.

## Immediate Follow-Ups

1. AAI-640: fix Fireflies vectorization/backlog first because it directly violates source-to-RAG retrieval readiness.
2. AAI-639: recover project assignment and task assignment coverage; source lifecycle is the broadest production-readiness gate.
3. AAI-638: fix source-specific retrieval observability so assistants can fail loudly when Microsoft/live/fallback retrieval degrades.
4. Acumatica provider action: unsuspend or otherwise restore the Render Acumatica cron, then run `npm run verify:acumatica-sync-health`.
5. Render alerting action: decide whether `alleato-rag-health`, `alleato-ai-provider-health`, and `alleato-microsoft-executive-assistant-check` should be unsuspended under the target architecture or replaced by currently active health jobs.
