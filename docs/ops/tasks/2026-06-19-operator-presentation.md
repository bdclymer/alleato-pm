# Task: Operator Presentation

Status: Complete
Owner: Codex
Created: 2026-06-19
Linear Issue: AAI-559 - https://linear.app/megankharrison/issue/AAI-559/goal-3-operator-presentation-envelope-for-ai-approval-prompts
Related Handoff: docs/ops/handoffs/2026-06-19-S61-operator-presentation.md

## Objective

Implement Goal 3 from `docs/ai-plan/hermes-openclaw-goals/goal-03-operator-presentation.md`: an additive Alleato-native operator message envelope that validates approval/action prompts, renders deterministic Teams Adaptive Cards, and records unsupported channel affordance drops with inspectable metadata.

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
| Static/type/lint      | `cd frontend && npx eslint src/lib/ai/operator/presentation.ts src/lib/ai/operator/__tests__/presentation.test.ts src/app/api/ai-operator/presentation-preview/route.ts src/app/api/ai-operator/presentation-preview/__tests__/route.test.ts`; `cd frontend && npm run quality:changed`; `npm run check:routes`; `cd frontend && npm run quality` | Passed with unrelated broad-quality timeout | Targeted ESLint, changed-file quality, and route check passed. Full quality failed before task-specific checks at the existing bounded frontend typecheck timeout after 60000ms. Owner: frontend tsconfig/typecheck scope, unrelated to Goal 3 files. |
| Targeted tests        | `cd frontend && npm run test:unit -- --runInBand --runTestsByPath src/lib/ai/operator/__tests__/presentation.test.ts src/app/api/ai-operator/presentation-preview/__tests__/route.test.ts` | Passed | 2 suites / 7 tests / 1 snapshot. |
| Browser/user-flow     | `VERCEL_ENV=development PORT=3003 npx next dev --port 3003 --turbopack`; live POST to `http://localhost:3003/api/ai-operator/presentation-preview` | Passed | Returned HTTP 200, `AdaptiveCard`, `Action.Submit`, rendered `approve`, and dropped unsupported `copy` with metadata. A first production-like e2e probe returned HTTP 403, proving the no-send preview route is blocked when `VERCEL_ENV=production`. |
| DB/provider read-back | N/A                | N/A    | No database or provider config changes expected. |
| End-to-end proof      | Live preview API POST with supported button and unsupported copy affordance | Passed | Response proved deterministic Teams card rendering and inspectable `unsupported_affordance` metadata without sending. |

## Files Changed

- `frontend/src/lib/ai/operator/presentation.ts` - new canonical operator message envelope, validation, capability filtering, and Teams renderer.
- `frontend/src/lib/ai/operator/__tests__/presentation.test.ts` - validation, rendering, unsupported-affordance, and snapshot guardrails.
- `frontend/src/lib/ai/operator/__tests__/__snapshots__/presentation.test.ts.snap` - deterministic Teams Adaptive Card snapshot.
- `frontend/src/app/api/ai-operator/presentation-preview/route.ts` - local/e2e preview route for validating/rendering operator messages without sending.
- `frontend/src/app/api/ai-operator/presentation-preview/__tests__/route.test.ts` - API contract guardrail for preview route.
- `docs/architecture/AI-RAG-ARCHITECTURE.md` - RAG docs gate note for the additive operator presentation adapter.
- `docs/ops/tasks/2026-06-19-operator-presentation.md` - task evidence.
- `docs/ops/handoffs/2026-06-19-S61-operator-presentation.md` - worker handoff.
- `docs/ops/orchestration/session-board.md` - S61 ownership row.
- `docs/ops/orchestration/review-queue.md` - S61 review row.

## Risks / Gaps

- Existing Teams builders are not migrated in this goal; this is intentionally additive until parity is proven.
- Full `npm run quality` failed at the existing bounded frontend typecheck timeout after 60000ms before task-specific lint/audit checks. Cause: frontend tsconfig admits enough heavy app/generated code that full-program checking stalls. Detection gap: broad typecheck was still the only full quality entrypoint. Prevention: keep non-app/generated artifacts out of frontend/tsconfig and rely on changed-file gates for this slice until the broad typecheck debt is repaired.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
