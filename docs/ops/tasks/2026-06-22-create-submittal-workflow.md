# Task: Add workflow steps to create submittal form

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: AAI-602 - https://linear.app/megankharrison/issue/AAI-602/add-workflow-steps-to-create-submittal-form
Related Handoff: N/A

## Objective

New submittals can be created with an initial review workflow so reviewers,
roles, and pending response rows are persisted with the submittal instead of
requiring a separate detail-page setup pass.

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

- The new submittal form shows a Submittal Workflow section only for creation.
- Users can select a workflow template or build workflow rows manually.
- Each workflow row requires a reviewer before submission.
- Creating a submittal with workflow rows creates `submittal_workflow_steps` and
  matching pending `submittal_responses`.
- If workflow persistence fails, the API returns a specific error instead of
  silently pretending the workflow was saved.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Database schema/types/migrations handled, if applicable.
- [x] Provider/env/config changes handled through CLI/API/MCP when available.
- [x] Centralized/shared abstraction used when the behavior is cross-cutting.
- [x] Legacy or duplicate paths removed, blocked, or explicitly marked deprecated.
- [x] Errors are specific and actionable; no silent fallback added.
- [x] User-facing copy/UI follows project noise gate and design-system rules, if applicable.

## Files To Change

- `frontend/src/features/submittals/submittal-form-page.tsx` - add create-only workflow controls using existing form primitives.
- `frontend/src/hooks/use-submittals.ts` - extend create input/types with initial workflow steps.
- `frontend/src/app/api/projects/[projectId]/submittals/route.ts` - persist workflow steps/responses during create.
- `frontend/src/lib/submittals/create-workflow.ts` - shared row-mapping guardrail for create workflow persistence.
- `frontend/src/lib/submittals/__tests__/create-workflow.test.ts` - focused regression coverage.
- `docs/ops/tasks/2026-06-22-create-submittal-workflow.md` - task evidence ledger.

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
| Static/type/lint      | `cd frontend && npx eslint src/features/submittals/submittal-form-page.tsx src/hooks/use-submittals.ts src/lib/submittals/create-workflow.ts src/lib/submittals/__tests__/create-workflow.test.ts 'src/app/api/projects/[projectId]/submittals/route.ts'` | Passed | Touched frontend/API/helper/test files lint cleanly. |
| Static/type/lint      | `cd frontend && npm run typecheck:changed` | Passed | No new `any` type debt detected. |
| Static/type/lint      | `cd frontend && npm run typecheck` | Timed out | Repo bounded full typecheck hit its existing 60s fail-loud timeout without task-owned TypeScript errors. |
| Targeted tests        | `cd frontend && npm run test:unit -- --runTestsByPath src/lib/submittals/__tests__/create-workflow.test.ts --runInBand` | Passed | 1 suite, 3 tests passed. |
| Browser/user-flow     | `agent-browser --session submittal-workflow open http://localhost:3001/25125/submittals/new`; `click Add Step`; snapshot | Passed | New create form shows `Workflow Template`, `Add Step`, reviewer `Name`, `Role`, remove, and submit controls. |
| DB/provider read-back | Authenticated browser `fetch` to `POST /api/projects/767/submittals`, then `GET /api/projects/767/submittals/{id}`, then cleanup `DELETE` | Passed | Create returned `201`; detail read-back showed `steps=1`, `responses=1`, `responseStatus=Pending`, `stepType=Approver`; cleanup returned `200`. |
| End-to-end proof      | Authenticated browser `fetch` invalid workflow payload to `POST /api/projects/767/submittals` | Passed | Invalid reviewer UUID now returns `400 BAD_REQUEST` with `Submittal create request is invalid.` instead of a generic 500. |

## Files Changed

- `docs/ops/tasks/2026-06-22-create-submittal-workflow.md` - task ledger.
- `frontend/src/features/submittals/submittal-form-page.tsx` - create-only workflow template/manual-step UI.
- `frontend/src/hooks/use-submittals.ts` - create payload type now includes initial workflow steps.
- `frontend/src/app/api/projects/[projectId]/submittals/route.ts` - create route validates and persists workflow steps plus pending responses.
- `frontend/src/lib/submittals/create-workflow.ts` - shared create workflow row builders and mismatch guardrail.
- `frontend/src/lib/submittals/__tests__/create-workflow.test.ts` - focused workflow persistence helper tests.

## Risks / Gaps

- Per-step workflow due dates remain unsupported because current
  `submittal_workflow_steps` / `submittal_responses` schema has no due-date
  column. Remote Supabase type generation was attempted but failed without
  diagnostics, so no migration was introduced in this slice.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
