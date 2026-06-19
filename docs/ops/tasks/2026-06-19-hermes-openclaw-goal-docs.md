# Task: Hermes/OpenClaw AI Goal Documents

Status: Complete
Owner: Codex
Created: 2026-06-19
Linear Issue: Not created yet - planning-only documentation split; create or link the implementation Linear issue before Goal 1 code changes.
Related Handoff: Not applicable

## Objective

Split the Hermes-Agent + OpenClaw research plan into goal-sized implementation documents so Codex can start with the first shippable goal without reinterpreting the full research report.

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

| Check | Command / artifact | Result | Notes |
| ----- | ------------------ | ------ | ----- |
| Static/type/lint | Not run | Not applicable | Documentation-only split. Implementation goals require delegated quality gates before closeout. |
| Targeted tests | Not run | Not applicable | No runtime code changed. |
| Browser/user-flow | Not run | Not applicable | No frontend-visible UI changed. |
| DB/provider read-back | Not run | Not applicable | No schema, provider, or environment change. |
| End-to-end proof | `docs/ai-plan/hermes-openclaw-goals/README.md` plus per-goal docs | Passed | Goal documents created with source references, acceptance criteria, verification, and failure-loudly rules. |

## Files Changed

- `docs/ai-plan/hermes-openclaw-goals/README.md` - goal index and execution rules.
- `docs/ai-plan/hermes-openclaw-goals/goal-01-net-policy-closeout.md` - first implementation goal.
- `docs/ai-plan/hermes-openclaw-goals/goal-02-outbound-action-policy.md` - AI SDK tool policy goal.
- `docs/ai-plan/hermes-openclaw-goals/goal-03-operator-presentation.md` - cross-channel operator message goal.
- `docs/ai-plan/hermes-openclaw-goals/goal-04-session-search.md` - conversation recall goal.
- `docs/ai-plan/hermes-openclaw-goals/goal-05-hybrid-rag-ranking.md` - RAG ranking goal.
- `docs/ai-plan/hermes-openclaw-goals/goal-06-context-compaction.md` - long-chat compaction goal.
- `docs/ai-plan/hermes-openclaw-goals/goal-07-later-high-risk-work.md` - deferred/high-risk goals.
- `docs/ops/tasks/2026-06-19-hermes-openclaw-goal-docs.md` - working definition of done for this documentation split.

## Risks / Gaps

- Implementation Linear issues are intentionally not created in this planning-only task; each implementation goal must create/link a Linear issue before code changes.
- `hermes-agent/` and `openclaw/` are local untracked source clones. They may be used for copy/adapt/reference work, but must not be committed wholesale.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
