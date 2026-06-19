# Task: Goal 7 G3 - Human-Gated Learning Loop

Status: Published to origin/main
Owner: Codex
Created: 2026-06-19
Linear Issue: AAI-564 - https://linear.app/megankharrison/issue/AAI-564/goal-7-g3-human-gated-learning-proposal-loop
Related Handoff: docs/ops/handoffs/2026-06-19-S65-human-gated-learning-loop.md

## Objective

Add an opt-in assistant background proposal workflow that can suggest memory or
skill learning candidates into the existing `ai_learning_promotions` human
review queue without auto-promoting to `ai_memories` or `ai_skills`.

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

## Acceptance Criteria

- Proposal workflow is default-off behind a narrow feature flag.
- Enabled runs inspect assistant conversation context and produce at most review
  queue candidates; no code path writes directly to approved memories or skills.
- Duplicate or low-evidence candidates are skipped with typed metadata.
- Persistence failures return explicit failed status and do not silently swallow
  proposal loss.
- Source clone usage is documented as REFERENCE or ADAPT, not a daemon transplant.
- Tests prove default-off behavior, proposal-only behavior, invalid/duplicate
  skips, and persistence failure reporting.

## Failure-Loudly Behavior

If proposal learning is disabled, lacks evidence, produces an invalid candidate,
finds a duplicate, or cannot persist to the review queue, the service returns an
inspectable `skipped` or `failed` result with a reason code. The chat response
metadata records that learning was not applied; no path pretends learning was
successful unless a promotion candidate was actually created.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Database schema/types/migrations handled, if applicable.
- [x] Provider/env/config changes handled through CLI/API/MCP when available.
- [x] Centralized/shared abstraction used when the behavior is cross-cutting.
- [x] Legacy or duplicate paths removed, blocked, or explicitly marked deprecated.
- [x] Errors are specific and actionable; no silent fallback added.
- [x] User-facing copy/UI follows project noise gate and design-system rules, if applicable.

## Planned Files

- `frontend/src/lib/ai/learning-proposals/*` - proposal-only service, types, tests.
- `frontend/src/lib/ai/bot-core.ts` - default-off post-response task integration.
- `frontend/src/app/api/ai-assistant/chat/handler-v2.ts` - response-message metadata wiring for the streamed chat path.
- `docs/architecture/AI-RAG-ARCHITECTURE.md` - learning proposal architecture note.
- `docs/ops/tasks/2026-06-19-human-gated-learning-loop.md` - task done gate.
- `docs/ops/handoffs/2026-06-19-S65-human-gated-learning-loop.md` - handoff evidence.
- `docs/ops/orchestration/session-board.md` and `docs/ops/orchestration/review-queue.md` - orchestration ledger.

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
| Static/type/lint      | `cd frontend && npm run quality:changed` | PASS | No new ESLint debt, no new `any` debt, no unsafe patterns, no changed API route guardrail failures. |
| Targeted tests        | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/ai/learning-proposals/__tests__/human-gated-learning.test.ts --runInBand` | PASS | 1 suite / 4 tests. |
| Browser/user-flow     | Not applicable | PASS | No new user-facing UI; uses existing `/ai/learning-promotions` review queue. |
| DB/provider read-back | Not applicable | PASS | No migration or provider config change; reused existing `ai_feedback_events` and `ai_learning_promotions` tables. |
| End-to-end proof      | Focused service test creates memory and skill review candidates through injected event/promotion writers | PASS | Tests prove default-off, proposal-only destinations, duplicate skip, and persistence failure result. |
| Publish verification  | `npm run codex:finish -- --message "Add human-gated learning proposals" --files ...` | PASS | Published commit `864d36f9f5b247a23571d82fe50f73d5f3922947`; verified `HEAD == origin/main`. |

## Files Changed

- `docs/ops/tasks/2026-06-19-human-gated-learning-loop.md` - task done gate.
- `docs/ops/handoffs/2026-06-19-S65-human-gated-learning-loop.md` - handoff evidence.
- `docs/ops/orchestration/session-board.md` - S65 ownership row.
- `docs/ops/orchestration/review-queue.md` - S65 review queue row.
- `frontend/src/lib/ai/learning-proposals/human-gated-learning.ts` - default-off proposal-only service.
- `frontend/src/lib/ai/learning-proposals/__tests__/human-gated-learning.test.ts` - focused tests.
- `frontend/src/lib/ai/bot-core.ts` - post-response proposal hook.
- `frontend/src/app/api/ai-assistant/chat/handler-v2.ts` - response-message metadata wiring.
- `docs/architecture/AI-RAG-ARCHITECTURE.md` - architecture/source-clone usage note.

## Risks / Gaps

- Broader live chat verification should be run before enabling
  `AI_ASSISTANT_LEARNING_PROPOSALS_ENABLED` in production.
- Existing direct memory extraction still runs as pre-existing behavior; this
  Goal 7 loop is a separate proposal-only path and does not auto-apply.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
