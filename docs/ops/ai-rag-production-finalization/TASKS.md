# AI/RAG Production Finalization Tasks

Date created: 2026-06-25
Owner: Alleato AI
Linear parent: AAI-636
Status: In Progress

This is the canonical step-by-step task list and progress ledger for the AI data pipeline and RAG production-finalization program. Update this file whenever a phase, implementation slice, provider change, data repair, deletion, or verification milestone completes.

Target architecture:

- [AI-DATA-PIPELINE-RAG-PRODUCTION-ARCHITECTURE.md](../../architecture/AI-DATA-PIPELINE-RAG-PRODUCTION-ARCHITECTURE.md)

Active handoff:

- [2026-06-25-S91-ai-rag-production-finalization-audit.md](../handoffs/2026-06-25-S91-ai-rag-production-finalization-audit.md)

Evidence directory:

- [2026-06-25-ai-rag-production-finalization](../evidence/2026-06-25-ai-rag-production-finalization)

## Master Checklist

### Phase 1: Architecture And Source Of Truth

- [x] Create authoritative target architecture document before implementation or deletion.
- [x] Record that the architecture document is the target state, not proof of production parity.
- [x] Create parent Linear issue and follow-on sub-issues.
- [x] Create local task and handoff evidence ledgers.
- [x] Inventory active production source paths and provider schedules.
- [ ] Keep this `TASKS.md` updated after each phase or major implementation task.

### Phase 2: Current-State Verification

- [x] Run AI chat architecture verifier.
- [x] Run Microsoft Graph embedding contract verifier.
- [x] Run source-specific RAG verifier.
- [x] Run source lifecycle verifier.
- [x] Run meeting vectorization verifier.
- [x] Run Acumatica sync health verifier.
- [x] Run Microsoft assistant health verifier.
- [x] Run Render AI provider health verifier.
- [ ] Run final all-pipeline verification bundle after implementation cleanup.

### Phase 3: Fireflies Meeting Transcript Pipeline

- [x] Recover recent eligible meeting vectorization after PM projection guard failure.
- [x] Reprocess known recent missing Fireflies meetings through canonical `run_full_pipeline`.
- [ ] Drain or classify historical `fireflies_ingestion_jobs` error backlog.
- [ ] Fix provider JSON-mode/non-JSON extraction noise or classify it with a fail-loud follow-up.
- [ ] Verify meeting transcripts sync automatically, save, embed, assign projects, create tasks where appropriate, and retrieve through RAG.

### Phase 4: Outlook Email Pipeline

- [x] Confirm Graph webhook plus scheduled reconciliation is the target trigger model.
- [x] Confirm Graph subscription reconciliation cron exists and is active in Render.
- [x] Repair stale cached Outlook intake for Microsoft Executive Assistant health.
- [ ] Verify Outlook messages sync, embed, project-assign, generate tasks where applicable, and appear in semantic search.
- [ ] Verify Outlook data is available to every relevant AI assistant through the finalized RAG/tool path.

### Phase 5: Microsoft Teams Pipeline

- [x] Confirm Teams channel and DM Render cron jobs are active.
- [x] Confirm source-specific Teams RAG checks live Microsoft Graph and indexed Supabase fallback with explicit observability.
- [ ] Verify Teams message sync, embedding, project assignment, task generation, and RAG retrieval end to end.

### Phase 6: SharePoint Pipeline

- [x] Confirm Graph sync target includes SharePoint reconciliation.
- [ ] Verify SharePoint documents sync/download/OCR/image extraction/embedding/project assignment end to end.
- [ ] Verify SharePoint documents are retrievable through RAG with citations.

### Phase 7: Uploaded PDF And Document Processing

- [ ] Verify upload event creates canonical `document_metadata` row.
- [ ] Verify OCR runs automatically for eligible uploads.
- [ ] Verify image extraction and AI vision/page intelligence for drawings, plans, specs, RFIs, submittals, invoices, contracts, and manuals.
- [ ] Verify clean searchable text, extracted metadata, chunks, embeddings, and AI retrieval.

### Phase 8: Embeddings, Vector Search, And RAG

- [x] Recover source lifecycle/project assignment verifier gate.
- [x] Recover source-specific RAG observability verifier gate.
- [ ] Validate finalized chunking strategy and duplicate chunk elimination.
- [ ] Verify metadata filters, project filters, permissions, citations/reference links, and retrieval quality.
- [ ] Remove or migrate legacy retrieval paths after import/route/provider/database-write proof.
- [ ] Verify every AI assistant uses the finalized RAG pipeline.

### Phase 9: Project Assignment And Task Generation

- [x] Repair deterministic generated-task project links from linked source documents.
- [x] Preserve manual review routing for ambiguous project assignment.
- [ ] Verify project assignment for emails, meetings, Teams, SharePoint, uploads, PDFs, drawings, submittals, RFIs, contracts.
- [ ] Verify unmatched items route to manual review with confidence scoring.
- [ ] Verify task generation from meetings, emails, Teams, document analysis, and AI extraction.
- [ ] Verify duplicate task prevention and accurate owner/project association.

### Phase 10: Acumatica Sync

- [x] Align repo and verifier contract to the final twice-daily Acumatica schedule.
- [x] Update live Render Acumatica cron schedule to twice daily.
- [x] Resume live Render Acumatica cron.
- [x] Trigger an immediate Acumatica run.
- [x] Verify Acumatica sync entities are fresh and successful after the triggered or next scheduled run.
- [ ] Verify retries, logging, statistics, and duplicate-import prevention.

### Phase 11: AI Assistants And Tool Architecture

- [x] Record AI SDK MCP architecture gap.
- [ ] Resolve AAI-641 by either fully implementing AI SDK MCP discovery/merge/trace/close or removing unused MCP package/config/docs surface.
- [ ] Verify every assistant uses finalized prompt, tool calling, and RAG architecture.
- [ ] Verify assistants retrieve expected context end to end.

### Phase 12: Cleanup And Deletion

- [ ] For each deletion candidate, prove inactive status through imports, route references, provider schedules, database writes, and verifier output.
- [ ] Delete obsolete Vercel Graph/Graph-embed/Acumatica cron routes only after replacement ownership is proven.
- [ ] Remove archived, duplicate, experimental, deprecated, dead, or unused implementations.
- [ ] Remove unused environment variables and orphaned database code where safe.
- [ ] Confirm the codebase has one production implementation for every major workflow.

### Phase 13: Final Production Readiness

- [ ] Every ingestion pipeline executes successfully.
- [ ] Every supported document reaches the vector database.
- [ ] Every supported document is retrievable through RAG.
- [ ] OCR output is validated.
- [ ] AI vision processing is validated.
- [ ] Project assignment is validated.
- [ ] Task generation is validated.
- [ ] Error handling and retry logic are exercised.
- [ ] Logging and monitoring are operational.
- [ ] Final deliverables are produced.

## Progress Notes

### 2026-06-25: Target Architecture Created

- Created the authoritative target architecture document before implementation or deletion.
- Evidence: [AI-DATA-PIPELINE-RAG-PRODUCTION-ARCHITECTURE.md](../../architecture/AI-DATA-PIPELINE-RAG-PRODUCTION-ARCHITECTURE.md)
- Linear: AAI-637 under AAI-636.

### 2026-06-25: Initial Verifier Results Recorded

- Passed: chat architecture with warning, Graph embedding contract.
- Failed initially: source-specific RAG, source lifecycle, meeting vectorization.
- Evidence:
  - [chat-architecture.txt](../evidence/2026-06-25-ai-rag-production-finalization/chat-architecture.txt)
  - [graph-embedding.txt](../evidence/2026-06-25-ai-rag-production-finalization/graph-embedding.txt)
  - [source-specific.txt](../evidence/2026-06-25-ai-rag-production-finalization/source-specific.txt)
  - [source-lifecycle.json](../evidence/2026-06-25-ai-rag-production-finalization/source-lifecycle.json)
  - [meetings.txt](../evidence/2026-06-25-ai-rag-production-finalization/meetings.txt)

### 2026-06-25: AAI-640 Recent Fireflies Meeting Vectorization Recovered

- Fixed canonical pipeline handling so PM final projection guard failures stay loud but do not fail terminal ingestion/vectorization.
- Reprocessed recent eligible missing meetings through the canonical pipeline.
- Verification passed at that point with 75/75 recent eligible meetings embedded.
- Remaining: historical Fireflies error backlog and provider JSON-mode noise.
- Evidence:
  - [meetings-after-fireflies-final-fix.txt](../evidence/2026-06-25-ai-rag-production-finalization/meetings-after-fireflies-final-fix.txt)
  - [fireflies-reprocess-final-missing.json](../evidence/2026-06-25-ai-rag-production-finalization/fireflies-reprocess-final-missing.json)

### 2026-06-25: AAI-639 Source Lifecycle And Project Assignment Gate Recovered

- Updated source lifecycle verifier semantics to measure project disposition instead of only direct assignment.
- Repaired 162 deterministic task/source-document project links.
- Verification passed: source lifecycle and Fireflies task integrity.
- Evidence:
  - [source-lifecycle-after-project-assignment-fix.json](../evidence/2026-06-25-ai-rag-production-finalization/source-lifecycle-after-project-assignment-fix.json)
  - [fireflies-task-integrity-after-project-assignment-fix.json](../evidence/2026-06-25-ai-rag-production-finalization/fireflies-task-integrity-after-project-assignment-fix.json)
- Commit: `914b2b56dea0e6a8f07428a968eee5dde5de9207`

### 2026-06-25: AAI-638 Source-Specific RAG Observability Gate Recovered

- Added explicit Teams row-count and indexed fallback observability to the canonical source-specific Teams evidence block.
- Added focused Jest regression assertions.
- Verification passed: focused Jest test and `npm run rag:verify:source-specific`.
- Evidence:
  - [source-specific-rag-unit-after-observability-fix.txt](../evidence/2026-06-25-ai-rag-production-finalization/source-specific-rag-unit-after-observability-fix.txt)
  - [source-specific-after-observability-fix.txt](../evidence/2026-06-25-ai-rag-production-finalization/source-specific-after-observability-fix.txt)
- Commit: `8719f2a0d4ce6f7466c6b9d69c151f6990340e9b`

### 2026-06-25: AAI-653 Provider Schedule Reconciliation Started

- Created provider schedule reconciliation task and Linear issue AAI-653.
- Refreshed Render and Vercel provider state.
- Confirmed Render owns active Graph, Teams, Fireflies, and source health schedules.
- Confirmed disabled Vercel crons still exist for Graph sync, Graph embed, and Acumatica and remain deletion candidates after proof.
- Evidence:
  - [render-services-aai-653.json](../evidence/2026-06-25-ai-rag-production-finalization/render-services-aai-653.json)
  - [vercel-crons-aai-653.txt](../evidence/2026-06-25-ai-rag-production-finalization/vercel-crons-aai-653.txt)

### 2026-06-25: Acumatica Schedule Restored To Target Cadence

- Updated Acumatica schedule contract to twice daily (`0 0,12 * * *`) in repo config and verifier.
- Patched live Render Acumatica cron schedule through the Render API.
- Resumed live Render Acumatica cron.
- Triggered immediate Acumatica run `crn-d827cfm7r5hc73e7lp20-1782421595`.
- Current blocker: sync state remains stale after the short poll window; freshness must be verified after the triggered run completes or surfaces a provider/code failure.
- Evidence:
  - [acumatica-render-schedule-patch-aai-653.json](../evidence/2026-06-25-ai-rag-production-finalization/acumatica-render-schedule-patch-aai-653.json)
  - [acumatica-render-resume-aai-653.json](../evidence/2026-06-25-ai-rag-production-finalization/acumatica-render-resume-aai-653.json)
  - [acumatica-render-trigger-run-aai-653.json](../evidence/2026-06-25-ai-rag-production-finalization/acumatica-render-trigger-run-aai-653.json)
  - [acumatica-sync-health-after-trigger-aai-653.txt](../evidence/2026-06-25-ai-rag-production-finalization/acumatica-sync-health-after-trigger-aai-653.txt)

### 2026-06-25: Health And Assistant Crons Restored

- Resumed live Render crons:
  - `alleato-rag-health`
  - `alleato-ai-provider-health`
  - `alleato-microsoft-executive-assistant-check`
- Triggered immediate runs for all three restored crons.
- Render AI Gateway health passes.
- Current blockers surfaced by resumed checks:
  - Microsoft Executive Assistant live Graph works, but cached Outlook intake is stale.
  - Meeting vectorization slipped to 73/75 recent meetings after new Fireflies records arrived.
- Evidence:
  - [render-health-cron-resume-aai-653.json](../evidence/2026-06-25-ai-rag-production-finalization/render-health-cron-resume-aai-653.json)
  - [render-health-cron-trigger-runs-aai-653.json](../evidence/2026-06-25-ai-rag-production-finalization/render-health-cron-trigger-runs-aai-653.json)
  - [render-ai-health-after-resume-aai-653.txt](../evidence/2026-06-25-ai-rag-production-finalization/render-ai-health-after-resume-aai-653.txt)
  - [microsoft-assistant-health-after-resume-aai-653.json](../evidence/2026-06-25-ai-rag-production-finalization/microsoft-assistant-health-after-resume-aai-653.json)
  - [meetings-after-health-cron-resume-aai-653.txt](../evidence/2026-06-25-ai-rag-production-finalization/meetings-after-health-cron-resume-aai-653.txt)

### 2026-06-25: Current Active Work

- Re-drove two newly missing Fireflies meetings through canonical `run_full_pipeline`:
  - `01KVD86PYMPG69CHFZ9CPZRQRC` - Ulta Beauty Fresno Weekly Meeting
  - `01KVV1ZXBWSG077B23VWVA0F7V` - Quarterly Meeting Brainstorm
- Both completed successfully.
- `npm run rag:verify:meetings` passed after re-drive with 75/75 recent meetings covered.
- `npm run rag:verify:source-lifecycle` passed after re-drive.
- Evidence:
  - [fireflies-redrive-missing-after-health-resume-aai-653.json](../evidence/2026-06-25-ai-rag-production-finalization/fireflies-redrive-missing-after-health-resume-aai-653.json)
  - [meetings-after-redrive-aai-653.txt](../evidence/2026-06-25-ai-rag-production-finalization/meetings-after-redrive-aai-653.txt)
  - [source-lifecycle-after-provider-reconcile-aai-653.txt](../evidence/2026-06-25-ai-rag-production-finalization/source-lifecycle-after-provider-reconcile-aai-653.txt)

### 2026-06-25: Current Active Work

- Investigate AI SDK MCP architecture gap under AAI-641.
- Package disabled Vercel cron route deletion proof for the cleanup slice.

### 2026-06-25: Microsoft Executive Assistant Outlook Cache Recovered

- Ran a bounded canonical Outlook delta redrive for `bclymer@alleatogroup.com`.
- Result: 24 messages synced, 24 persisted, delta token saved.
- `npm run verify:microsoft-assistant-health -- --json` passed afterward.
- Evidence:
  - [outlook-bclymer-delta-redrive-aai-653.json](../evidence/2026-06-25-ai-rag-production-finalization/outlook-bclymer-delta-redrive-aai-653.json)
  - [microsoft-assistant-health-after-outlook-redrive-aai-653.json](../evidence/2026-06-25-ai-rag-production-finalization/microsoft-assistant-health-after-outlook-redrive-aai-653.json)

### 2026-06-25: Acumatica Sync Health Recovered

- Ran the guarded Acumatica financial sync entrypoint directly after the Render-triggered run did not update health within the short poll window.
- Sync completed with no errors and known warnings about Acumatica payment-application endpoint exposure.
- `npm run verify:acumatica-sync-health` passed afterward.
- Evidence:
  - [acumatica-manual-sync-aai-653.txt](../evidence/2026-06-25-ai-rag-production-finalization/acumatica-manual-sync-aai-653.txt)
  - [acumatica-sync-health-after-manual-sync-aai-653.txt](../evidence/2026-06-25-ai-rag-production-finalization/acumatica-sync-health-after-manual-sync-aai-653.txt)

## Remaining Blockers

- Historical Fireflies error backlog remains large and must be drained or classified.
- Provider JSON-mode fallback/non-JSON extraction noise still occurs during canonical Fireflies processing.
- Acumatica cron is restored but entity freshness is still stale until a triggered/scheduled run completes successfully.
- Microsoft Executive Assistant cached Outlook intake is stale even though live Graph reads work.
- AI SDK MCP package surface remains unresolved under AAI-641.
- Disabled Vercel cron routes remain deletion candidates, but deletion is blocked until replacement proof is complete for each route.
