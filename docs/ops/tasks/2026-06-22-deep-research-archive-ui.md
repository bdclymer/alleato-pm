# Task: Deep Research Archive UI Cleanup

Status: In Progress
Owner: Codex
Created: 2026-06-22
Linear Issue: AAI-590 - https://linear.app/megankharrison/issue/AAI-590/clean-up-deep-research-archive-page-ui
Related Handoff: N/A

## Objective

Make `/deep-research` read as a quiet admin archive reader for saved Deep Agents LLM wiki workspaces, with a compact selectable workspace list, a clear artifact browser, and loud artifact-load failures.

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

- [ ] `/deep-research` presents archived workspaces as a compact list, not card-like buttons.
- [ ] Selecting a workspace shows title, file count/session metadata, artifact list, and preview.
- [ ] Artifact loading errors are visible to the user and include a retry path.
- [ ] Empty states stay specific and low-noise.
- [ ] Layout is mobile-first, stacks cleanly on small screens, and uses standard breakpoints.
- [ ] UI removes decorative badges/icons/wrapper panels that do not improve the archive task.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Database schema/types/migrations handled, if applicable.
- [x] Provider/env/config changes handled through CLI/API/MCP when available.
- [x] Centralized/shared abstraction used when the behavior is cross-cutting.
- [x] Legacy or duplicate paths removed, blocked, or explicitly marked deprecated.
- [ ] Errors are specific and actionable; no silent fallback added.
- [ ] User-facing copy/UI follows project noise gate and design-system rules, if applicable.

## Integration Checklist

- [x] End-to-end path wired through one owner, not separate disconnected pieces.
- [x] All entry points for the workflow use the same canonical service/runtime.
- [x] Source adapters or external dependencies return typed, inspectable results.
- [ ] Run/task/session ledger records every meaningful attempt.
- [ ] Artifacts link back to source evidence and run logs.
- [x] Delivery/output adapters report sent, skipped, blocked, failed, and dry-run states.

## Regression Guardrails

- [ ] Unit or integration test added/updated for the core behavior.
- [x] Contract test added/updated for cross-module or source/delivery boundaries.
- [ ] Guardrail added so the same class of bug fails loudly next time.
- [x] Existing tests adjusted only for intentional behavior changes.

## Verification Checklist

- [ ] Static/type/lint check run, or explicitly delegated to a cheaper sub-agent.
- [ ] Targeted automated test run.
- [ ] Browser/user-flow verification run for frontend-visible changes.
- [x] Database/provider read-back performed for migrations/config/external services.
- [ ] End-to-end workflow proof captured for the actual requested outcome.
- [ ] Evidence artifacts recorded below.
- [ ] Known unrelated failures documented with exact command and owner files.

## Evidence

| Check                 | Command / artifact | Result | Notes |
| --------------------- | ------------------ | ------ | ----- |
| Static/type/lint      |                    |        |       |
| Targeted tests        |                    |        |       |
| Browser/user-flow     |                    |        |       |
| DB/provider read-back | N/A                | PASS   | No database, migration, provider, or env changes in scope. |
| End-to-end proof      |                    |        |       |

## Files Changed

- `frontend/src/app/(admin)/deep-research/page.tsx` - quiet archive-reader UI and artifact error handling.
- `docs/ops/tasks/2026-06-22-deep-research-archive-ui.md` - task definition, checklist, and evidence.

## Risks / Gaps

- Browser verification depends on `agent-browser`; initial daemon startup failed before implementation.

## Final Status

- [ ] All checklist items are complete.
- [ ] Evidence is recorded.
- [ ] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [ ] Final response includes what is done, what remains, and recommended next steps.
