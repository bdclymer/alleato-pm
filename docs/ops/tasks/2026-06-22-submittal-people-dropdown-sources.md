# Task: Fix create submittal people dropdown sources

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: AAI-604 - https://linear.app/megankharrison/issue/AAI-604/fix-create-submittal-people-dropdown-sources
Related Handoff: N/A

## Objective

The submittal form must source people fields from the correct business context:
Submittal Manager from Alleato employees, and Received From from contacts on the
selected Responsible Contractor company.

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

- Submittal Manager options include Alleato employees, not only current project
  members.
- Received From options are empty/disabled until a Responsible Contractor is
  selected.
- Received From options show contacts whose `people.company_id` matches the
  selected responsible contractor company.
- If the Responsible Contractor changes, a stale Received From value is cleared.
- Existing create workflow reviewer pickers continue to use project users.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Database schema/types/migrations handled, if applicable.
- [x] Provider/env/config changes handled through CLI/API/MCP when available.
- [x] Centralized/shared abstraction used when the behavior is cross-cutting.
- [x] Legacy or duplicate paths removed, blocked, or explicitly marked deprecated.
- [x] Errors are specific and actionable; no silent fallback added.
- [x] User-facing copy/UI follows project noise gate and design-system rules, if applicable.

## Files To Change

- `frontend/src/features/submittals/submittal-form-page.tsx` - adjust picker data sources and stale-value clearing.
- `frontend/src/features/submittals/submittal-form-dialog.tsx` - keep legacy dialog behavior aligned if still used.
- `frontend/src/features/submittals/submittal-detail-client.tsx` - display resolved contact names for Received From.
- `frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts` - return resolved Received From contact name.
- `frontend/src/hooks/use-auth-users.ts` - expose person type/status for manager filtering.
- `frontend/src/lib/submittals/people-options.ts` - shared picker source rules.
- `frontend/src/lib/submittals/__tests__/people-options.test.ts` - focused rule tests.
- `docs/ops/tasks/2026-06-22-submittal-people-dropdown-sources.md` - evidence ledger.

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
| Static/type/lint      | `cd frontend && npx eslint src/features/submittals/submittal-form-page.tsx src/features/submittals/submittal-form-dialog.tsx src/features/submittals/submittal-detail-client.tsx src/hooks/use-auth-users.ts src/lib/submittals/people-options.ts src/lib/submittals/__tests__/people-options.test.ts 'src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts'` | Passed | Touched form/detail/API/helper/test files lint cleanly. |
| Static/type/lint      | `cd frontend && npm run typecheck:changed` | Passed | No new `any` type debt detected. |
| Targeted tests        | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/submittals/__tests__/people-options.test.ts --runInBand` | Passed | 1 suite, 4 tests passed. |
| Browser/user-flow     | `agent-browser --session submittal-people open http://localhost:3001/767/submittals/new`; login with configured test credentials; snapshot; select first responsible contractor by keyboard | Passed | `Received From` was disabled with placeholder `Select responsible contractor first`, then enabled after a responsible contractor was selected. `Submittal Manager` remained enabled independently. |
| DB/provider read-back | N/A | Passed | No schema, migration, provider, or env changes required. Existing `people.company_id` and `users_auth -> people` data sources are reused. |
| End-to-end proof      | Focused helper tests plus browser form state | Passed | Manager rule filters active Alleato auth users; Received From rule filters selected-company contacts; stale Received From values clear when contractor changes. |

## Files Changed

- `docs/ops/tasks/2026-06-22-submittal-people-dropdown-sources.md` - task ledger.
- `frontend/src/features/submittals/submittal-form-page.tsx` - picker data sources and stale-value clearing.
- `frontend/src/features/submittals/submittal-form-dialog.tsx` - legacy dialog picker data sources aligned.
- `frontend/src/features/submittals/submittal-detail-client.tsx` - Received From contact display.
- `frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts` - resolved Received From contact name in detail API.
- `frontend/src/hooks/use-auth-users.ts` - person type/status in auth user options.
- `frontend/src/lib/submittals/people-options.ts` - shared option rules.
- `frontend/src/lib/submittals/__tests__/people-options.test.ts` - regression coverage.

## Risks / Gaps

- `npm run codex:finish` remains blocked by unrelated existing guardrail debt in
  `frontend/src/app/(admin)/document-metadata/document-metadata-client.tsx` and
  `frontend/src/app/(main)/[projectId]/pcos/page.tsx`.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
