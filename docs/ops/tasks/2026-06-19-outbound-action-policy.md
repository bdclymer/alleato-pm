# Task: Outbound Action Policy

Status: Complete
Owner: Codex
Created: 2026-06-19
Linear Issue: AAI-558 - https://linear.app/megankharrison/issue/AAI-558/goal-2-outbound-action-policy-for-ai-write-tools
Related Handoff: docs/ops/handoffs/2026-06-19-S60-outbound-action-policy.md

## Objective

Create a central AI tool policy hook layer for outbound actions that preserves confirmed-write behavior, redacts tool outputs before tracing/rendering, and gives Alleato tool execution explicit before/after semantics behind a default-off feature flag.

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
| Static/type/lint      | `cd frontend && npx eslint src/lib/ai/tools/outbound-action-policy.ts src/lib/ai/tools/__tests__/outbound-action-policy.test.ts src/lib/ai/tools/action-tools.ts src/lib/ai/email-operator-policy.ts src/lib/ai/action-capabilities.ts`; `cd frontend && npm run typecheck:changed` | Passed | Targeted lint passed; changed-file type guard reported no new `any` debt. |
| Targeted tests        | `cd frontend && npm run test:unit -- --runInBand --runTestsByPath src/lib/ai/tools/__tests__/outbound-action-policy.test.ts`; `cd frontend && npm run test:unit -- --runInBand --runTestsByPath src/lib/ai/tools/__tests__/action-tools.test.ts src/lib/ai/__tests__/email-operator-policy.test.ts` | Passed | Policy blocks unconfirmed writes, redacts outputs, fails safely, and existing action/email policy tests still pass. |
| Browser/user-flow     | N/A | Passed | No frontend-visible UI change. |
| DB/provider read-back | N/A | Passed | No database, migration, or provider config changes. |
| End-to-end proof      | `AI_EVAL_BASE_URL=http://localhost:3002 AI_EVAL_JUDGE_ENABLED=false AI_EVAL_CASE_TIMEOUT_MS=60000 npm run rag:verify:eval-suite:case -- outbound_action_policy_high_risk_draft_only_guard` | Passed | Controlled local server used `ALLEATO_OUTBOUND_ACTION_POLICY_ENABLED=true` with Teams/Microsoft delivery credentials blanked. Eval passed 1/1 with one warning for duration over 30s. Artifacts: `docs/ai-plan/evals/runs/2026-06-19T17-11-56-784Z-f8ac2775/summary.md`, `docs/ai-plan/evals/runs/2026-06-19T17-11-56-784Z-f8ac2775/results.json`. |

## Files Changed

- `frontend/src/lib/ai/tools/outbound-action-policy.ts` - central policy hook, redaction, feature flag, and wrapper.
- `frontend/src/lib/ai/tools/action-tools.ts` - opt-in wrapper around action tools.
- `frontend/src/lib/ai/tools/outbound-action-policy.test.ts` - guardrail tests.
- `frontend/src/lib/ai/email-operator-policy.ts` - deprecation note for delivery/write checks.
- `frontend/src/lib/ai/action-capabilities.ts` - deprecation note for policy enforcement.
- `docs/ai-plan/evals/assistant-eval-suite.json` - high-risk write/draft-only eval.
- `docs/architecture/AI-RAG-ARCHITECTURE.md` - architecture verification note for the default-off policy layer.
- `frontend/src/data/assistant-eval-runs.json` - published eval-run index updated by verifier.
- `docs/ops/tasks/2026-06-19-outbound-action-policy.md` - task evidence.
- `docs/ops/handoffs/2026-06-19-S60-outbound-action-policy.md` - worker handoff and command evidence.
- `docs/ops/orchestration/session-board.md` - S60 ownership row.
- `docs/ops/orchestration/review-queue.md` - S60 pending review row.
- Local evidence artifact, ignored by git: `docs/ai-plan/evals/runs/2026-06-19T17-11-56-784Z-f8ac2775/**`.

## Risks / Gaps

- Full `npm run quality` was not rerun because Goal 1's broad quality attempt previously timed out in frontend typecheck. This slice used focused lint, changed-file type guard, related Jest suites, and the single-case live eval verifier.
- The single-case eval did not fire `sendTeamsMessage`; it passed by refusing direct send in the active runtime and avoiding any send-success claim. The policy unit tests cover the direct action-tool wrapper path.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
