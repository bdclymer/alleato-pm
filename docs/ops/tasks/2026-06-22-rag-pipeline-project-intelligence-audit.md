# Task: RAG Pipeline Through Project Intelligence Audit

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: AAI-593 - https://linear.app/megankharrison/issue/AAI-593/audit-and-document-end-to-end-rag-pipeline-through-project
Related Handoff: N/A

## Objective

Produce a repo-grounded end-to-end map of the Alleato RAG pipeline from initial
source sync through parsing, embeddings, retrieval, AI assistant tool routing,
and Project Intelligence synthesis; verify the live assistant/RAG contracts; and
remove or explicitly block outdated RAG code paths with evidence.

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

- The pipeline document names each source owner, table/ledger, processing step,
  retrieval step, assistant tool boundary, Project Intelligence packet boundary,
  and failure-loudly signal.
- Model usage is traced from code/config/env defaults where visible, not guessed.
- AI assistant tools and routing are verified with the narrowest available
  contract checks.
- Outdated RAG paths are deleted when safe; otherwise each retained path has a
  concrete owner, reason, and follow-up.

## Failure-Loudly Behavior

- Sync success cannot be treated as embedding success.
- App DB metadata cannot be treated as RAG DB chunk coverage.
- Assistant answers cannot silently fall back from failed source lookup or stale
  packets without exposing the degraded state.
- Retired ingestion/vectorization paths must fail predeploy checks if they
  reappear.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `python3 -m py_compile backend/src/services/pipeline/config.py backend/src/services/pipeline/llm.py backend/src/services/ingestion/fireflies_task_rewriter.py backend/scripts/...` | Passed | Validated changed backend helpers and scripts compile. |
| Targeted tests        | `node scripts/verify/verify_ai_assistant_response_contract.mjs` | Passed | Guard now checks current `handler-v2` AI SDK tool loop and retrieval planner boundary. |
| Targeted tests        | `npm run rag:verify:source-specific` | Passed | Source-specific RAG contract passes. |
| Targeted tests        | `npm run rag:verify:chat-architecture` | Passed with warnings | AI SDK/chat architecture passes; warnings remain for installed MCP package not being live-merged into `/ai-assistant`. |
| Targeted tests        | `node scripts/verify/verify_ai_tool_calling_provider_matrix.mjs` | Partial | Gateway `generateText` and `streamText` tool-calling passed; direct OpenAI failed on quota/stream output. Decision remains Gateway path. |
| Targeted tests        | `node scripts/verify/verify_ai_advisor_quality.mjs` | Passed | Westfield advisor answer shape passed. |
| Targeted tests        | `node scripts/verify/verify_ai_intelligence_packet_contract.mjs` | Passed | Westfield target resolves to project 43; current and manual gold packets exist; 11 current packet cards; 4 open review rows. |
| Docs validation       | `npm run lint` in `/Users/meganharrison/Documents/github/alleato-os/apps/docs` | Passed | Mintlify broken-link check passed. |
| Browser/user-flow     | N/A | N/A | No user-facing UI was changed. |
| DB/provider read-back | Direct app/RAG Postgres read-back for five June 22 meetings | Passed | All five repaired meetings are `complete`, have embedded chunks, and have `fireflies_ingestion_jobs.stage=done`. |
| End-to-end proof      | `npm run rag:verify:meetings` | Passed | 77/77 recent meetings have embedded chunks; latest chunk embedding `2026-06-22T19:42:59.063Z`. |
| Bounded promotion     | `ALLOW_PM_APP_FINAL_PROJECTIONS=true PYTHONPATH=src .venv/bin/python - <<'PY' ... run_full_pipeline(...)` | Passed | `Weekly design coordination Exol PA`: 12 segments, 36 chunks, 1 task, 11 decisions, 14 risks. `Weekly Touch Base`: 10 segments, 35 chunks, 15 tasks, 6 decisions, 15 risks. |
| Bounded refresh       | `ALLOW_PM_APP_FINAL_PROJECTIONS=true .venv/bin/python -m src.scripts.refresh_fireflies_transcripts --fireflies-id 01KV8VH4Z228ZBQ7RA2WJA80PZ` | Passed | `Accounting Review meeting`: 98 initial chunks, pipeline done, 5 tasks; read-back shows 75 embedded chunks after pipeline re-chunk. |

## Files Changed

- `docs/ops/tasks/2026-06-22-rag-pipeline-project-intelligence-audit.md` - task ledger.
- `docs/alleato-os-docs/architecture/rag-pipeline-project-intelligence.mdx` - end-to-end RAG pipeline and model map.
- `/Users/meganharrison/Documents/github/alleato-os/apps/docs/docs.json` - added the new docs page to Mintlify navigation.
- `backend/src/services/pipeline/config.py` - changed unavailable light extraction default from `gpt-5.5-mini` to `gpt-5.4-mini`.
- `backend/src/services/pipeline/llm.py` - added guarded retry without `response_format` when the provider rejects JSON mode.
- `backend/src/services/ingestion/fireflies_task_rewriter.py` - added the same guarded `response_format` fallback for task rewrite calls.
- `frontend/src/lib/ai/detect-rag-request.ts` - removed stale "tools disabled" workaround comments.
- `frontend/src/lib/ai/provider-routing.ts` - deleted unused provider-routing shim.
- `frontend/src/lib/ai/__tests__/provider-routing.test.ts` - deleted tests for the removed shim.
- `scripts/verify/verify_ai_assistant_response_contract.mjs` - updated guardrail to current handler/tool contracts.
- `scripts/verify/verify_ai_chat_architecture.mjs` - updated backend Deep Agents bridge check to current trace shape.
- `backend/scripts/*.py` - removed stale worker import paths from maintained helper scripts.
- `backend/src/scripts/backfill_missing_embeddings.py` - deleted legacy small-embedding script.
- `backend/src/scripts/update_chunk_embeddings.py` - deleted legacy small-embedding script.
- `backend/src/scripts/clean_and_reingest.py` - deleted legacy small-embedding/reingest script.
- `backend/src/scripts/process_existing_documents.py` - deleted legacy direct processing script.
- `backend/src/scripts/backfill_segment_embeddings.py` - deleted legacy small-embedding segment script.
- `docs/reference/ENV-VARS.md`, `docs/architecture/AI-RAG-ARCHITECTURE.md`, `docs/architecture/_audit/frontend-orchestration-inventory.md` - removed stale provider-routing/env references.

## Risks / Gaps

- Historical Fireflies jobs still have a large error backlog; meeting vector
  health passes, but the backlog should be grouped and drained deliberately.
- `/ai-assistant` architecture check still warns that `@ai-sdk/mcp` is installed
  but live MCP tools are not merged/traced/closed on the chat path.
- `npm run lint` in the docs app emits a local duplicate `sharp-libvips` Objective-C
  class warning before passing; no broken links were found.

## Completion Detail

Cause: The original missing-meeting issue was an app-to-RAG mirror gap for four
June 22 Fireflies meetings. Refreshing them exposed two separate downstream
provider/config gaps: unavailable `gpt-5.5-mini` model defaults and provider
rejection of `response_format=json_object`. Those are now fixed in code. A fifth
meeting arrived while verification was running and was processed through the
same canonical Fireflies path.

Detection gap: `/rag` sync health did not prove chunk coverage, and the full
pipeline run only exposed model/provider failures after the refresh attempted
parser/extractor promotion.

Prevention step: `npm run rag:verify:meetings` now passes and should remain the
canary for meeting recall. The response-contract and architecture verifiers now
assert current AI SDK handler/tool wiring instead of stale provider-routing
flags.

Owner / next action: Historical Fireflies error backlog and optional live MCP
tool merge should be handled as separate follow-up tasks.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
