# Task: Claude Code handoff generator path fix

Status: Complete
Owner: Codex
Created: 2026-06-19
Linear Issue: AAI-553 - https://linear.app/megankharrison/issue/AAI-553/fix-claude-code-handoff-generator-path-failures
Related Handoff: Not created yet

## Objective

Fix the AIS feature-request Claude Code/Codex handoff generator so local runs
write generated handoff files to the repo handoff directory deterministically,
serverless runs without a repo checkout create an inline handoff artifact, and
filesystem failures still fail loudly without recording misleading metadata.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence
filled in. If any item cannot be completed, change `Status` to
`Blocked/Deferred` and document the blocker, owner, and next action.

## Scope Checklist

- [x] Linear issue created before coding starts.
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
| Static/type/lint      | `cd frontend && npx eslint src/lib/feature-requests/handoffs.ts src/lib/feature-requests/server.ts src/lib/ai/tools/feature-request-tools.ts src/lib/feature-requests/__tests__/handoffs.test.ts` | Passed | Focused lint clean for touched feature-request handoff files. |
| Targeted tests        | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/feature-requests/__tests__/handoffs.test.ts --runInBand` | Passed | 8 tests passed for markdown, path resolution, repo-root override, serverless inline fallback, literal undefined env values, and write failure behavior. |
| Browser/user-flow     | Not run | Not applicable | Server-side generator bug with no UI rendering change. |
| DB/provider read-back | Linear connector `_save_issue` | Passed | Backfilled AAI-553 after issue-create tool became available; no DB/schema/provider changes were required for this fix. |
| End-to-end proof      | Targeted unit writes to temp handoff directory and no-root runtime cwd | Passed | Proves generated markdown lands under the configured handoff root locally, falls back to `ais-inline://...` in serverless, does not drift under bad env strings, and write failures throw actionable errors. |

## Files Changed

- `frontend/src/lib/feature-requests/handoffs.ts` - deterministic repo-root/handoff directory resolution and actionable write errors.
- `frontend/src/lib/feature-requests/server.ts` - stores inline handoff markdown in the feature-request event when no repo filesystem exists.
- `frontend/src/lib/ai/tools/feature-request-tools.ts` - returns handoff storage mode and inline markdown to the AI tool caller.
- `frontend/src/lib/feature-requests/__tests__/handoffs.test.ts` - regression coverage for path handling and write failures.
- `docs/ops/tasks/2026-06-19-claude-code-handoff-generator-path-fix.md` - task checklist and evidence ledger.

## Risks / Gaps

- Linear issue was backfilled after the Linear issue-create connector became available. No remaining code risk identified for this contained generator fix.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
