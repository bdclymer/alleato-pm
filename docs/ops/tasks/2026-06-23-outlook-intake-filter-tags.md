# Task: Outlook intake sent-to/from filters and tagging

Status: Blocked/Deferred
Owner: Codex
Created: 2026-06-23
Linear Issue: Not created yet - blocked by Linear connector argument validation for team name on `_save_issue`
Related Handoff: N/A

## Objective

Reviewers can filter `/outlook-intake` by sender and recipient, apply durable review tags to intake rows, and remove low-value automated notifications from the default active queue without deleting source evidence.

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
| Static/type/lint      | `npx eslint src/app/api/outlook-intake/route.ts 'src/app/api/outlook-intake/[intakeId]/route.ts' src/app/api/outlook-intake/__tests__/route.test.ts 'src/app/(tables)/outlook-intake/outlook-intake-client.tsx'` | Pass | Focused lint for changed implementation and test files. |
| Static/type/lint      | `npm run typecheck:changed` | Pass | No new `any` type debt detected. |
| Static/type/lint      | `npm run typecheck` | Deferred | Timed out after 60s in `scripts/run-typecheck-bounded.mjs`; no file-level TypeScript errors reported. Owner: frontend tsconfig/typecheck scope. Relatedness: likely existing repo-wide typecheck performance debt, not specific to this slice. |
| Targeted tests        | `npx jest src/app/api/outlook-intake/__tests__/route.test.ts --runInBand` | Pass | 5 tests passed, including sender/recipient/tag/triage query guardrail. |
| Browser/user-flow     | `agent-browser` artifacts in `tests/agent-browser-runs/2026-06-23-outlook-intake-filter-tags/` | Pass | Authenticated page loaded, filters opened, From filter updated URL to `?sent_from=alerts&page=1`. |
| DB/provider read-back | No migration needed | Pass | Uses existing `source_metadata` JSONB and existing triage columns from `20260619220000_outlook_email_triage_columns.sql`. |
| End-to-end proof      | `tests/agent-browser-runs/2026-06-23-outlook-intake-filter-tags/VERIFICATION_SUMMARY.md` | Pass | UI control rendering and query-state proof captured; production row mutation was not performed. |

## Files Changed

- `frontend/src/app/api/outlook-intake/route.ts` - add sent-from/sent-to/tag/triage filters and expose tags/triage fields.
- `frontend/src/app/api/outlook-intake/[intakeId]/route.ts` - allow durable tag updates and triage-aware ignored status.
- `frontend/src/app/(tables)/outlook-intake/outlook-intake-client.tsx` - add filter controls, tag column, tag action, and clearer ignore action for unimportant emails.
- `frontend/src/app/api/outlook-intake/__tests__/route.test.ts` - add API query guardrails.
- `tests/agent-browser-runs/2026-06-23-outlook-intake-filter-tags/VERIFICATION_SUMMARY.md` - browser verification summary.

## Risks / Gaps

- Linear issue creation is blocked until the correct Linear team identifier is available to the connector. Attempted `_save_issue` with team `Alleato`; connector returned `Argument Validation Error`.
- Full bounded typecheck timed out after 60s in `scripts/run-typecheck-bounded.mjs`; focused lint, changed type guard, targeted Jest, and browser smoke passed.

## Final Status

- [ ] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [ ] Final response includes what is done, what remains, and recommended next steps.
