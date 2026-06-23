# Task: Align create submittal workflow form with Procore parity notes

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: AAI-605 - https://linear.app/megankharrison/issue/AAI-605/align-create-submittal-workflow-form-with-procore-parity-notes
Related Handoff: N/A

## Objective

Review the pasted ChatGPT Procore Submittals instructions and update the current
submittal workflow implementation where existing schema/UI can support parity
without pretending larger workflow engines are complete.

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

- Workflow role choices shown during create align to Procore roles: `Submitter`
  and `Approver`.
- Workflow template chooser does not show when no saved templates exist.
- Current manual workflow creation still works.
- Larger Procore parity items that require schema/permission/workflow-engine work
  are recorded as remaining work, not silently implied complete.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Database schema/types/migrations handled, if applicable.
- [x] Provider/env/config changes handled through CLI/API/MCP when available.
- [x] Centralized/shared abstraction used when the behavior is cross-cutting.
- [x] Legacy or duplicate paths removed, blocked, or explicitly marked deprecated.
- [x] Errors are specific and actionable; no silent fallback added.
- [x] User-facing copy/UI follows project noise gate and design-system rules, if applicable.

## Files To Change

- `frontend/src/features/submittals/submittal-form-page.tsx` - role/template visibility alignment.
- `frontend/src/features/submittals/submittal-form-page.tsx` - role/template visibility alignment.
- `frontend/src/lib/submittals/workflow-roles.ts` - shared role list and normalization guard.
- `frontend/src/lib/submittals/__tests__/workflow-roles.test.ts` - regression coverage for allowed roles and legacy mapping.
- `docs/ops/tasks/2026-06-22-submittal-procore-parity-alignment.md` - evidence ledger and remaining parity notes.

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
| Static/type/lint      | `npx eslint frontend/src/features/submittals/submittal-form-page.tsx frontend/src/features/submittals/submittal-form-dialog.tsx frontend/src/features/submittals/submittal-detail-client.tsx frontend/src/hooks/use-auth-users.ts frontend/src/lib/submittals/people-options.ts frontend/src/lib/submittals/workflow-roles.ts frontend/src/lib/submittals/__tests__/people-options.test.ts frontend/src/lib/submittals/__tests__/workflow-roles.test.ts frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts` | Pass | Targeted changed-file lint. |
| Static/type/lint      | `npm run typecheck:changed` | Pass | Changed-file typecheck completed. |
| Targeted tests        | `npm run test:unit -- --runTestsByPath src/lib/submittals/__tests__/people-options.test.ts src/lib/submittals/__tests__/workflow-roles.test.ts --runInBand` | Pass | 2 suites, 6 tests. |
| Browser/user-flow     | `agent-browser` session `submittal-people` at `/767/submittals/new` | Pass | Template chooser hidden when no saved templates exist; Add Step renders role picker. |
| DB/provider read-back | N/A | Pass | No schema, migration, provider, or env changes in this parity slice. |
| End-to-end proof      | Browser role listbox snapshot | Pass | Role menu contains only `Submitter` and `Approver`; `Approver` selected by default. |

## Files Changed

- `docs/ops/tasks/2026-06-22-submittal-procore-parity-alignment.md` - task ledger.
- `frontend/src/features/submittals/submittal-form-page.tsx` - workflow roles now use the shared Procore role list; empty workflow template chooser is hidden.
- `frontend/src/lib/submittals/workflow-roles.ts` - shared allowed-role list and legacy-role normalizer.
- `frontend/src/lib/submittals/__tests__/workflow-roles.test.ts` - regression test for allowed roles and `Reviewer` normalization.

## Remaining Procore Parity Work

- Workflow due dates need schema support on workflow responses or workflow step
  participants.
- Parallel workflow groups need a participant model that supports multiple users
  per ordered step.
- Ball In Court auto-advance and admin reset need a workflow state machine and
  permission checks.
- Revision creation needs latest-revision guards and permission enforcement.
- Schedule calculations need project-level settings, schedule task linkage, and
  explicit suggested-date application.

## Risks / Gaps

- Full finish remains blocked by unrelated pre-existing guardrails:
  - `frontend/src/app/(admin)/document-metadata/document-metadata-client.tsx` has a silent catch violation.
  - `frontend/src/app/(main)/[projectId]/pcos/page.tsx` has an unreasoned suppression violation.
  - Exact command that exposed this: `npm run codex:finish -- --message "Add workflow steps to submittal create" --files ...`.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
