# Handoff: 2026-06-25 - AI/RAG Production Finalization Audit

## Intake Block

1) Session ID: S91
2) Task ID: ai-rag-production-finalization-audit
3) Linear issue: AAI-637
4) Linear URL: https://linear.app/megankharrison/issue/AAI-637/audit-current-airag-pipeline-production-paths-and-deletion-candidates
5) Current status: In Progress
6) Files changed (absolute paths):
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/tasks/2026-06-25-ai-rag-production-finalization-audit.md
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/handoffs/2026-06-25-S91-ai-rag-production-finalization-audit.md
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/orchestration/session-board.md
   - /Users/meganharrison/Documents/alleato-pm/docs/architecture/AI-DATA-PIPELINE-RAG-PRODUCTION-ARCHITECTURE.md
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/chat-architecture.txt
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/graph-embedding.txt
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/meetings.txt
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/render-services.json
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/source-lifecycle.json
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/source-specific.txt
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/current-path-inventory.md
   - /Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai/retrieval/source-specific-rag.ts
   - /Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai/retrieval/__tests__/source-specific-rag.test.ts
7) Commands run and outcome (pass/fail counts):
   - PASS: Linear parent AAI-636 created for production finalization.
   - PASS: Linear sub-issue AAI-637 created for this audit/deletion-candidate slice.
   - PASS: Linear kickoff comment posted to AAI-637.
   - PASS: Created authoritative final production architecture document before implementation changes.
   - PASS/WARN: `npm run rag:verify:chat-architecture` passed, warning that live `/ai-assistant` has `@ai-sdk/mcp` installed without AI SDK MCP discovery/merge/trace/close implementation.
   - PASS: `npm run rag:verify:graph-embedding`.
   - FAIL: `npm run rag:verify:source-specific` failed on live Microsoft source plus indexed Supabase fallback observability.
   - FAIL: `npm run rag:verify:source-lifecycle` failed on Fireflies/Teams/Outlook project-assignment coverage, Fireflies embedded coverage, and generated-task project-assignment coverage.
   - FAIL: `npm run rag:verify:meetings` failed with `13227` Fireflies ingestion jobs in `error` and only `70/75` recent meetings with embedded chunks.
   - PASS: `cd backend && .venv/bin/python -m pytest tests/test_meeting_signal_promotion.py tests/test_pipeline_orchestrator.py -q` passed after repairing projection-guard handling.
   - PASS: bounded reprocess of four recent eligible Fireflies meetings through canonical `run_full_pipeline` completed and produced embedded chunks.
   - PASS/WARN: `npm run rag:verify:meetings` now passes with `75/75` recent eligible meetings embedded; warning remains for `13225` historical Fireflies jobs in `error` and direct OpenAI quota.
   - FAIL: `npm run rag:verify:source-lifecycle` still fails after Fireflies vectorization repair on project-assignment and generated-task assignment thresholds.
   - PASS: `node scripts/verify/backfill_project_assignments_from_compiler_jobs.mjs --dry-run --days 14 --limit 5000` identified 162 deterministic task/source-document project links.
   - PASS: `node scripts/verify/backfill_project_assignments_from_compiler_jobs.mjs --days 14 --limit 5000` updated 162 task links.
   - PASS: `PYTHONPATH=backend backend/.venv/bin/python scripts/verify/verify_fireflies_task_integrity.py --window-hours 336 --limit 1000` passed with 0 link violations.
   - PASS: `npm run rag:verify:source-lifecycle` now passes with no failures.
   - PASS: `cd frontend && npm run test:unit -- source-specific-rag.test.ts --runInBand` passed after adding Teams retrieval coverage assertions.
   - PASS: `npm run rag:verify:source-specific` now passes with explicit Teams source coverage.
   - PASS: Created follow-on Linear sub-issues AAI-638, AAI-639, AAI-640, and AAI-641.
   - PASS: `render services --output json` read live Render provider state.
   - PASS: `vercel crons ls` read live Vercel cron state for `alleato-hub`; Vercel reported 7 cron jobs found and disabled.
   - PASS: Created current path inventory against the target architecture.
8) Evidence artifacts (screenshot/video/report/log paths):
   - /Users/meganharrison/Documents/alleato-pm/docs/architecture/AI-DATA-PIPELINE-RAG-PRODUCTION-ARCHITECTURE.md
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/chat-architecture.txt
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/graph-embedding.txt
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/meetings.txt
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/render-services.json
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/source-lifecycle.json
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/source-specific.txt
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/current-path-inventory.md
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/fireflies-error-analysis.json
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/fireflies-reprocess-recent-missing.json
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/fireflies-reprocess-final-missing.json
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/meetings-after-fireflies-final-fix.txt
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/source-lifecycle-after-fireflies-fix.json
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/project-assignment-backfill-dry-run-after-patch.json
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/project-assignment-backfill-applied.json
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/source-lifecycle-after-project-assignment-fix.json
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/fireflies-task-integrity-after-project-assignment-fix.json
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/source-specific-rag-unit-after-observability-fix.txt
   - /Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/source-specific-after-observability-fix.txt
9) Top 3 findings (frontend-visible issues first):
   - Source-specific RAG contract is recovered: recent Teams evidence now carries explicit row-count coverage and indexed fallback observability before model synthesis.
   - Recent source lifecycle is not production-ready: project-assignment and generated-task assignment coverage are below thresholds across Fireflies, Teams, and Outlook.
   - Meeting vectorization for recent eligible meetings is recovered: official verifier now reports `75/75` recent meetings with embedded chunks. Historical Fireflies error backlog remains at `13225` rows and must be classified/drained separately.
   - Source lifecycle verifier is recovered: project disposition semantics now honor manual-review terminal states, and 162 deterministic task links were repaired from their source document projects.
   - Provider schedules do not fully match the target architecture: Render Acumatica, RAG health, AI provider health, and Microsoft Executive Assistant checks are suspended; Vercel Graph/Graph-embed/Acumatica crons are disabled but still present in repo config.
10) Recommended next action (one line): Inventory active production paths, then run compact source lifecycle and RAG verifier commands before any deletion or implementation edits.
11) Handoff file path: docs/ops/handoffs/2026-06-25-S91-ai-rag-production-finalization-audit.md
12) Migration ledger evidence: No migration in this slice.

## Linear Updates

- Kickoff comment: Posted to AAI-637 (`1b955385-0e31-4284-87b7-0705234d4786`).
- Milestone comments: Architecture document milestone posted to AAI-637 (`a7550838-d048-4cc2-b70d-824929b0c03c`).
- Completion/blocker comment: Pending.

## Current Status

This is the first production-finalization slice for AAI-636. The final production architecture document now exists and is the comparison target. Compact verification has confirmed current blockers, so this audit cannot claim production readiness.

Follow-on sub-issues:

- AAI-638: source-specific RAG live Microsoft plus indexed fallback observability.
- AAI-639: source lifecycle project-assignment and task-assignment coverage.
- AAI-640: Fireflies ingestion error backlog and recent meeting vectorization gap.
- AAI-641: AI SDK MCP implementation gap or unused MCP dependency removal.

Current provider schedule findings:

- Render `alleato-acumatica-financial-sync` is suspended even though the target architecture requires scheduled Acumatica sync.
- Render `alleato-rag-health` and `alleato-ai-provider-health` are suspended even though target architecture requires meeting/vector and provider outage alerting.
- Render `alleato-microsoft-executive-assistant-check` is suspended even though target architecture calls for webhook plus scheduled fallback behavior for Microsoft assistant work.
- Vercel has `/api/cron/graph-sync`, `/api/cron/graph-embed`, and `/api/cron/acumatica-sync` registered but disabled; these are deletion/decommission candidates after route/import/provider proof.
- `rg` proof found the disabled Vercel Graph/Graph-embed/Acumatica cron paths only in `frontend/vercel.json` and their own route files; backend sync/embed endpoints remain active and should not be deleted.

AAI-640 progress:

- Root cause found: recent missing Fireflies rows were retryable `[Errno 35] Resource temporarily unavailable`, but canonical `run_full_pipeline` then failed after embedding because PM app final projection guards were treated as fatal ingestion errors.
- Code changed:
  - `/Users/meganharrison/Documents/alleato-pm/backend/src/services/pipeline/extractor.py`
  - `/Users/meganharrison/Documents/alleato-pm/backend/src/services/pipeline/orchestrator.py`
  - `/Users/meganharrison/Documents/alleato-pm/backend/tests/test_meeting_signal_promotion.py`
  - `/Users/meganharrison/Documents/alleato-pm/backend/tests/test_pipeline_orchestrator.py`
- Bounded live repair:
  - Reprocessed `01KVD86PYMPG69CHFZ9CPZRQRC`, `01KVTVXHPJPBX9YD4YBXW6DNCW`, `01KVDGP7KYSBHEZCA89CJYN3RN`, and `01KVDGP7KGPTRWD1PC7T4S8S4D`.
  - Official meeting verifier passed afterward.
- Remaining blockers:
  - Historical Fireflies backlog remains, dominated by manually paused 2026-05-13 rows.
  - Structured extraction provider contract is noisy: several model calls reject `response_format=json_object` and fallback can still return non-JSON.

AAI-639 progress:

- Root cause found: source lifecycle was measuring direct project assignment only, not the final architecture's project disposition contract. Ambiguous items with `project_assignment_review` were being treated as failed even though they were routed to manual review. Separately, generated task failures included stale task rows that could be deterministically linked from `document_metadata.project_id`.
- Code changed:
  - `/Users/meganharrison/Documents/alleato-pm/scripts/verify/verify_source_lifecycle_health.mjs`
  - `/Users/meganharrison/Documents/alleato-pm/scripts/verify/source_lifecycle_project_applicability.mjs`
  - `/Users/meganharrison/Documents/alleato-pm/scripts/verify/backfill_project_assignments_from_compiler_jobs.mjs`
- Data repair:
  - Updated 162 task rows from linked source document project IDs.
  - No ambiguous source documents were auto-assigned.
- Verification:
  - Source lifecycle verifier passed.
  - Fireflies task integrity passed with 0 link violations.

AAI-638 progress:

- Root cause found: source-specific Teams retrieval already checked live Microsoft Graph and the indexed Supabase fallback, but the Teams synthesis evidence block did not include the exact Teams row-count observability required by the contract verifier.
- Code changed:
  - `/Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai/retrieval/source-specific-rag.ts`
  - `/Users/meganharrison/Documents/alleato-pm/frontend/src/lib/ai/retrieval/__tests__/source-specific-rag.test.ts`
- Verification:
  - Focused source-specific RAG Jest test passed.
  - Source-specific contract verifier passed.

The current repo has unrelated dirty files, so any further implementation changes must remain isolated to owned files.

AAI-669 progress:

- Scope: SharePoint/PDF/uploaded document OCR, vision, embedding, citation metadata, and RAG chunk integrity.
- Code changed:
  - `/Users/meganharrison/Documents/alleato-pm/backend/src/services/integrations/microsoft_graph/embed.py`
  - `/Users/meganharrison/Documents/alleato-pm/backend/src/services/pipeline/vision_analyzer.py`
  - `/Users/meganharrison/Documents/alleato-pm/backend/tests/test_graph_embed.py`
- Production/data repair:
  - Deployed automatic Graph vision path on Render for commit `238b56c8e0824e5ad5d258d3f8ddce3108fd1d9b`.
  - Repaired OneDrive vision gaps, drawing-upload vision gaps, OneDrive OCR-failed rows through vision-only/vector fallback, Outlook metadata-only PDF attachments through Graph `$value`, and small manual text uploads through the canonical document parser/embedder.
  - Final tracked candidate inventory: 66/66 covered, 0 active missing.
- Root causes confirmed:
  - Graph PDF embedding required text before running vision, blocking vision-only searchable records when OCR failed.
  - Successful Graph embedding updated existing RAG metadata only, so vision-only chunks could be left without citation/status metadata.
  - Outlook promoted attachment metadata had no stored PDF and stored Outlook ids were not valid for direct attachment detail fetch; resolving by `internet_message_id` and downloading matched attachments through Graph `$value` works.
- Verification:
  - PASS: `python3 -m py_compile backend/src/services/integrations/microsoft_graph/embed.py backend/src/services/pipeline/vision_analyzer.py backend/tests/test_graph_embed.py`
  - PASS: `PYTHONPATH=backend backend/.venv/bin/python -m pytest backend/tests/test_graph_embed.py -q`
  - PASS: `node scripts/verify/verify_rag_chunk_integrity.mjs --days=2`
- Evidence:
  - `/Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/pdf-backfill-candidates-final-aai-669.json`
  - `/Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/pdf-vision-outlook-attachment-remaining-batch-aai-669.json`
  - `/Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/manual-text-upload-pipeline-batch-aai-669.json`
  - `/Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/rag-chunk-integrity-final-aai-669.txt`
  - `/Users/meganharrison/Documents/alleato-pm/docs/ops/evidence/2026-06-25-ai-rag-production-finalization/test-graph-embed-after-outlook-vision-fix-aai-669.txt`

## Exact Next Step

Compare current code paths against `/Users/meganharrison/Documents/alleato-pm/docs/architecture/AI-DATA-PIPELINE-RAG-PRODUCTION-ARCHITECTURE.md`, then classify each mismatch as delete, migrate, or verify-current.

## Known Pitfalls

- Do not treat archived docs as proof that a code path is inactive.
- Do not delete stale-looking code until provider schedules, route references, imports, and database writes prove it is not production-owned.
- Do not collapse Fireflies, Outlook, Teams, and SharePoint failures into one generic embedding verdict; source-scoped reporting is required.
- Do not claim production readiness from HTTP 200 alone; prove sync, parse/OCR, embedding, project assignment, task generation, retrieval, and assistant use.
- Do not treat the target architecture document as proof that current production matches it.

## Resume Commands

```bash
git status --short
rg -n "Fireflies|fireflies|outlook|teams|sharepoint|embedding|document_chunks|rag_document_metadata|source_processing|pipeline|ocr|vision|Acumatica|acumatica" backend frontend scripts docs/architecture docs/ops/tasks docs/ops/handoffs
npm run rag:verify:source-specific
npm run rag:verify:meetings
npm run rag:verify:chat-architecture
node scripts/verify/verify_graph_embedding_contract.mjs
```

## Evidence

Pending.
