# Task: Source Embedding Health Visibility

Status: Blocked/Deferred
Owner: Codex
Created: 2026-06-22
Linear Issue: Not created - Linear issue creation tool unavailable in current connector set; only comment tools exposed
Related Handoff: N/A

## Objective

Verify whether meeting transcripts, emails, Teams messages, and SharePoint documents have source rows and embedded RAG chunks, identify duplicate/legacy tool paths that could cause later failures, and define the lowest-noise way to communicate source embedding health.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence filled in. If any item cannot be completed, change `Status` to `Blocked/Deferred` and document the blocker, owner, and next action.

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

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      | `cd frontend && npx eslint 'src/app/api/admin/ai-system-health/route.ts' 'src/components/ai-intelligence/ai-system-health-panel.tsx'` | Passed | Targeted changed-file lint. |
| Static/type/lint      | `cd frontend && npm run typecheck -- --pretty false` | Failed/Unrelated | Existing bounded full-program timeout after 60s; no changed-file error emitted. |
| Targeted tests        | `npm run rag:verify:graph-embedding` | Passed | Contract now validates shared `ai_transport.py` provider ownership. |
| Targeted tests        | `npm run rag:verify:teams-ingestion` | Passed | Teams conversation ingestion contract guarded. |
| Targeted tests        | `npm run rag:verify:chunk-integrity` | Passed | Existing chunks all have embeddings. |
| Targeted tests        | `npm run rag:verify:meetings` | Passed | 77/77 eligible recent meetings have embedded chunks; 1/1 transcript-bearing recent meeting has embedded transcript chunks. |
| Targeted tests        | `npm run rag:verify:source-lifecycle -- --days 14 --min-embedded-ratio 1 --min-project-assigned-ratio 0 --min-task-assigned-ratio 0 --require-lifecycle-rows false` | Failed/Downstream | Embedding-required rows are 100% covered; current Project Intelligence packets are stale, newest `2026-06-17T12:32:08.088Z`. |
| Syntax check          | `node --check scripts/verify/verify_source_lifecycle_health.mjs && node --check scripts/verify/verify_meeting_vectorization_health.mjs && node --check scripts/verify/verify_graph_embedding_contract.mjs` | Passed | Changed verifier scripts parse. |
| Browser/user-flow     | `agent-browser open http://localhost:3001/ai-system-health` | Passed | Screenshot: `tests/agent-browser-runs/2026-06-22-source-embedding-health/ai-system-health-source-coverage-post-remediation.png`. |
| DB/provider read-back | Live app DB + RAG DB read-back | Passed | Meetings 102/102, emails 294/294, Teams 161/161, SharePoint 18/18, OneDrive 38/38 embedded after terminal exclusions. |
| End-to-end proof      | `docs/reports/source-embedding-health-2026-06-22.md` | Passed/Partial downstream | Communication surface exists and source embeddings are covered; Project Intelligence packet freshness remains deferred. |

## Files Changed

- `docs/ops/tasks/2026-06-22-source-embedding-health-visibility.md` - task evidence ledger.
- `.gitignore` - prevents temporary `hermes-agent/` and `openclaw/` reference clones from reappearing in staging.
- `scripts/verify/verify_graph_embedding_contract.mjs` - validates Graph embedding provider ownership through the shared AI transport layer.
- `scripts/verify/verify_source_lifecycle_health.mjs` - classifies terminal source rows from app/RAG metadata so skipped/OCR-failed rows do not create false embedding gaps.
- `scripts/verify/verify_meeting_vectorization_health.mjs` - excludes deleted/no-transcript meetings and requires transcript chunks only for transcript-bearing recent meetings.
- `frontend/src/app/api/admin/ai-system-health/route.ts` - adds 14-day source embedding coverage read-back.
- `frontend/src/components/ai-intelligence/ai-system-health-panel.tsx` - shows source coverage in the existing admin AI health surface.
- `docs/reports/source-embedding-health-2026-06-22.md` - compact audit report and communication recommendation.

## Risks / Gaps

- Current Project Intelligence packets are stale: newest current packet is `2026-06-17T12:32:08.088Z`, outside the 36-hour lifecycle threshold.
- `/ai-system-health` reports 1 recent Microsoft Graph vectorization failure; current source coverage is green after terminal exclusions, but the run-level failure still needs operational review.
- `npm run rag:verify:meetings` still warns about direct OpenAI quota and historical Fireflies ingestion-job errors. AI Gateway is working, so this is not blocking current embedding coverage.
- Full frontend typecheck still times out at the repo's 60s bounded guard. Owner: broader frontend tsconfig/generated-code scope, not this health-surface change.
- Linear issue creation was not available in the exposed Linear connector set for this turn; only comment/list/delete comment tools were available.

## Final Status

- [ ] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.

Blocked/Deferred owner/action: source embedding coverage and visibility are complete, but downstream Project Intelligence packet freshness is deferred to the intelligence compiler owner. Next action is to regenerate current packets or repair the scheduled compiler drain, then rerun `npm run rag:verify:source-lifecycle -- --days 14 --min-embedded-ratio 1 --min-project-assigned-ratio 0 --min-task-assigned-ratio 0 --require-lifecycle-rows false`.
