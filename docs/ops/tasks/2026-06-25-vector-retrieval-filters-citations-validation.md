# Vector Retrieval Filters Citations Validation

Date: 2026-06-25
Linear: AAI-682
Parent: AAI-636
Status: In Progress - Blocker Found

## Objective

Finalize and verify the production vector retrieval layer: chunk integrity, duplicate handling, metadata/project/permission filters, citation/reference metadata, retrieval quality, and assistant usage of the canonical RAG pipeline.

## Scope

- AI assistant source lookup and retrieval planning/execution.
- RAG search RPC usage and retrieval filters.
- `document_chunks` and `rag_document_metadata` citation/reference metadata.
- Duplicate chunk and orphan metadata guardrails.
- Assistant/tool usage of finalized retrieval paths.
- Deletion or migration candidates only after import, route, provider schedule, and database-write proof.

## Done Checklist

- [x] Create Linear issue before coding/provider operations.
- [x] Create task markdown before coding/provider operations.
- [x] Post Linear kickoff comment with scope, evidence locations, and next action.
- [x] Inventory active retrieval and assistant code paths against the target architecture.
- [x] Run current retrieval guardrails before edits and record outputs.
- [x] Validate finalized chunking strategy and duplicate chunk elimination.
- [x] Verify metadata filters and project filters on live RAG search paths.
- [ ] Verify permission behavior or record the exact ownership gap with prevention step.
- [ ] Verify citations/reference links are present for retrieved source records.
- [x] Verify retrieval quality using current source-specific, hybrid ranking, and assistant eval gates.
- [ ] Identify legacy retrieval candidates and prove inactive status before deletion.
- [ ] Migrate or delete any proven duplicate retrieval implementation in this slice.
- [x] Verify every relevant AI assistant/tool consumes the finalized RAG pipeline or record a follow-on blocker.
- [x] Update central AI/RAG finalization `TASKS.md`.
- [x] Update handoff with evidence, root cause, prevention, and remaining blockers.
- [ ] Publish code/docs/evidence if code/docs change.

## Evidence

Pending. Evidence will be stored under:

- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/`

Linear kickoff comment:

- AAI-682 comment `154b437f-52f9-4a96-a02f-5473721660a4`

Path inventory:

- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/vector-retrieval-path-inventory-aai-682.md`

Baseline verifier evidence:

- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/source-specific-baseline-aai-682.txt`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/chunk-integrity-baseline-aai-682.txt`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/hybrid-ranking-baseline-aai-682.txt`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/response-contract-baseline-aai-682.txt`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/assistant-tool-registry-baseline-aai-682.txt`

Low-content repair evidence:

- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/minimal-extract-chunk-inventory-aai-682.json`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/minimal-extract-repair-plan-aai-682.json`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/minimal-extract-repair-applied-aai-682.json`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/chunk-integrity-after-minimal-repair-aai-682.txt`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/hybrid-ranking-after-minimal-repair-aai-682.txt`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/test-document-low-content-and-graph-embed-aai-682.txt`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/source-specific-after-minimal-repair-aai-682.txt`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/response-contract-after-minimal-repair-aai-682.txt`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/assistant-operational-readiness-after-minimal-repair-aai-682.txt`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/metadata-boundary-after-minimal-repair-aai-682.txt`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/client-boundary-after-minimal-repair-aai-682.txt`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/backend-client-boundary-after-minimal-repair-aai-682.txt`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/assistant-operational-readiness-after-executive-bridge-aai-682.txt`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/frontend-typecheck-after-executive-bridge-aai-682.txt`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/metadata-boundary-after-boundary-fix-aai-682.txt`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/client-boundary-after-boundary-fix-aai-682.txt`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/backend-client-boundary-after-boundary-fix-aai-682.txt`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/frontend-typecheck-after-boundary-fix-aai-682.txt`
- `docs/ops/evidence/2026-06-25-ai-rag-production-finalization/focused-compile-lint-after-boundary-fix-aai-682.txt`

Linear milestone comment:

- AAI-682 comment `db0b4236-06bf-4c57-9d1a-5c187c7420d0`
- AAI-682 checkpoint/blocker comment `bbf351b8-8ba2-4586-8ead-37f64e256877`
- AAI-682 executive bridge checkpoint comment `e584c809-6cd4-4acc-b247-f2eb60d2c705`

## Initial Known Constraints

- The architecture document is the comparison target, not proof of production parity.
- Do not delete retrieval paths until imports, routes, provider schedules, and database writes prove they are inactive.
- Fireflies backlog rows older than two months are historical unless a historical reconstruction request needs them.
- Outlook and Teams backlog rows older than one week are historical unless a historical reconstruction request needs them.
- Existing checkout contains unrelated dirty files; this slice must keep ownership scoped to AAI-682 files.

## Blockers

- Permission behavior and citation/reference-link proof still need a dedicated live retrieval validation pass before AAI-682 can close.
- Legacy retrieval candidates still need import/route/provider-schedule/database-write proof before deletion or migration.

## Resolved Blockers

- `npm run rag:verify:assistant-operational-readiness` passed after restoring the canonical `backendDeepAgentExecutiveBriefing` handler path. The restored path is backed by the active Render Deep Agents research endpoint, records the canonical executive trace, and persists source/debug metadata for direct and fallback synthesis paths.
- RAG/app database ownership boundary verifiers now pass after routing app metadata text fallbacks through `rag_document_metadata`, routing admin `source_sync_runs` reads through `createRagServiceClient()`, and routing Outlook intake reads/writes through AI DB resolver helpers.

## Root Cause

The document parser created placeholder summaries and segments for low-content documents. Those placeholders were embedded as searchable chunks, so hybrid ranking retrieved junk instead of production-grade source content.

The assistant-readiness verifier also pointed at a missing archived eval-suite path, which hid the real remaining Deep Agents executive bridge assertion until the verifier path was fixed.

The executive bridge assertion failed because the current handler and bridge module no longer exposed the canonical business-wide Deep Agents path, while the active architecture and eval suite still required `backendDeepAgentExecutiveBriefing` for no-project executive/operator prompts.

The RAG/app boundary failures came from mature production code still reading high-churn or heavy AI data through app-database paths: parser/embedder and document-intelligence fallbacks read `document_metadata.content/raw_text`, the admin work-runs endpoint queried `source_sync_runs` through the app client, and Outlook digest/assistant triage used the generic Supabase client for Outlook intake control-plane tables.

## Prevention

- Low-content documents no longer create fake parser segments or fake summaries.
- The embedder allows vision-only retrieval when real page intelligence exists.
- Documents with no searchable text and no vision are marked `skipped_low_content`, have stale chunks removed, and do not call embedding.
- RAG chunk integrity now fails on low-content placeholder chunks.
- Assistant operational readiness now loads the active `docs/ai-plan2/evals/assistant-eval-suite.json` eval suite.
- Broad no-project executive prompts now route through `fetchDeepAgentExecutiveBriefing`, backed by the active Render Deep Agents research endpoint, and persist the canonical `backendDeepAgentExecutiveBriefing` trace.
- Boundary verifiers now enforce that app `document_metadata` selects in AI/RAG paths do not pull heavy body text, frontend RAG tables/RPCs use `createRagServiceClient()`, and backend RAG-owned tables use explicit AI DB resolver helpers.

## Failure-Loud Guardrail

This slice is not complete until failed retrieval filters, missing citations, duplicate chunks, inactive legacy paths, or assistant drift are caught by a repeatable verifier instead of manual inspection alone.
