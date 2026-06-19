# Task: <title>

Status: Draft
Owner: Codex
Created: YYYY-MM-DD
Linear Issue: <required before coding, or "Not created yet - blocked">
Related Handoff: <path if applicable>

## Objective

<One concrete outcome. Describe the workflow or user/system behavior that must
be true when this is finished.>

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence
filled in. If any item cannot be completed, change `Status` to
`Blocked/Deferred` and document the blocker, owner, and next action.

## Scope Checklist

- [ ] Existing architecture and prior related implementations reviewed.
- [ ] Existing shared primitives/services/helpers identified before adding new ones.
- [ ] Source-of-truth owner chosen for the workflow/data/control plane.
- [ ] Deprecated or bypassed paths identified.
- [ ] Acceptance criteria written as observable behavior, not implementation hopes.
- [ ] Failure-loudly behavior defined.

## Implementation Checklist

- [ ] Files/modules to change listed before edits.
- [ ] Database schema/types/migrations handled, if applicable.
- [ ] Provider/env/config changes handled through CLI/API/MCP when available.
- [ ] Centralized/shared abstraction used when the behavior is cross-cutting.
- [ ] Legacy or duplicate paths removed, blocked, or explicitly marked deprecated.
- [ ] Errors are specific and actionable; no silent fallback added.
- [ ] User-facing copy/UI follows project noise gate and design-system rules, if applicable.

## Integration Checklist

- [ ] End-to-end path wired through one owner, not separate disconnected pieces.
- [ ] All entry points for the workflow use the same canonical service/runtime.
- [ ] Source adapters or external dependencies return typed, inspectable results.
- [ ] Run/task/session ledger records every meaningful attempt.
- [ ] Artifacts link back to source evidence and run logs.
- [ ] Delivery/output adapters report sent, skipped, blocked, failed, and dry-run states.

## Regression Guardrails

- [ ] Unit or integration test added/updated for the core behavior.
- [ ] Contract test added/updated for cross-module or source/delivery boundaries.
- [ ] Guardrail added so the same class of bug fails loudly next time.
- [ ] Existing tests adjusted only for intentional behavior changes.

## Verification Checklist

- [ ] Static/type/lint check run, or explicitly delegated to a cheaper sub-agent.
- [ ] Targeted automated test run.
- [ ] Browser/user-flow verification run for frontend-visible changes.
- [ ] Database/provider read-back performed for migrations/config/external services.
- [ ] End-to-end workflow proof captured for the actual requested outcome.
- [ ] Evidence artifacts recorded below.
- [ ] Known unrelated failures documented with exact command and owner files.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      |                    |        |       |
| Targeted tests        |                    |        |       |
| Browser/user-flow     |                    |        |       |
| DB/provider read-back |                    |        |       |
| End-to-end proof      |                    |        |       |

## Files Changed

- `<path>` - <reason>

## Risks / Gaps

- <None, or list concrete unresolved issues.>

## Final Status

- [ ] All checklist items are complete.
- [ ] Evidence is recorded.
- [ ] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [ ] Final response includes what is done, what remains, and recommended next steps.
