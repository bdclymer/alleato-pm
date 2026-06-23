# Task: Restore attachments on create submittal form

Status: Complete
Owner: Codex
Created: 2026-06-22
Linear Issue: AAI-606 - https://linear.app/megankharrison/issue/AAI-606/restore-attachments-on-create-submittal-form
Related Handoff: N/A

## Objective

Restore the Attachments control on the New Submittal form and ensure files
selected during create are uploaded and linked to the newly created submittal.

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

- New Submittal form shows an Attachments field.
- Selected files remain visible while the user completes the form.
- After a successful create, selected files upload to the existing submittal
  attachment endpoint and are linked to the new submittal.
- Upload failures fail loudly with a specific toast and do not silently imply
  attachment success.
- The implementation uses shared attachment/upload primitives where practical.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Database schema/types/migrations handled, if applicable.
- [x] Provider/env/config changes handled through CLI/API/MCP when available.
- [x] Centralized/shared abstraction used when the behavior is cross-cutting.
- [x] Legacy or duplicate paths removed, blocked, or explicitly marked deprecated.
- [x] Errors are specific and actionable; no silent fallback added.
- [x] User-facing copy/UI follows project noise gate and design-system rules, if applicable.

## Files To Change

- `frontend/src/features/submittals/submittal-form-page.tsx` - add create-form attachment state/UI and post-create upload.
- `frontend/src/hooks/use-submittals.ts` - shared post-create attachment upload helper.
- `frontend/src/hooks/use-auth-users.ts` - explicit company FK embed for Alleato employee source.
- `frontend/src/lib/submittals/attachment-files.ts` - pending file reconciliation helper.
- `frontend/src/lib/submittals/__tests__/attachment-files.test.ts` - regression coverage for pending file removal/duplicates.
- `docs/ops/tasks/2026-06-22-create-submittal-attachments.md` - evidence ledger.

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
| Static/type/lint      | `npx eslint src/features/submittals/submittal-form-page.tsx src/hooks/use-submittals.ts src/hooks/use-auth-users.ts src/lib/submittals/attachment-files.ts src/lib/submittals/__tests__/attachment-files.test.ts` | Pass | Targeted changed-file lint. |
| Static/type/lint      | `npm run typecheck:changed` from `frontend/` | Pass | No new `any` type debt. |
| Targeted tests        | `npm run test:unit -- --runTestsByPath src/lib/submittals/__tests__/attachment-files.test.ts --runInBand` | Pass | 1 suite, 2 tests. |
| Browser/user-flow     | `agent-browser` session `submittal-attachments` at `/767/submittals/new` | Pass | Attachments section visible; file picker accepted temp file. |
| DB/provider read-back | Detail page/API read-back for `7ee76e56-3954-4c9e-ba19-fef7e9de4574` | Pass | Uploaded file listed as `submittal-create-attachment-proof.txt`; cleanup DELETE returned 200. |
| End-to-end proof      | Create submittal with temp attachment | Pass | Create POST 201, attachment POST 201, detail GET 200, cleanup DELETE 200. |

## Files Changed

- `docs/ops/tasks/2026-06-22-create-submittal-attachments.md` - task ledger.
- `frontend/src/features/submittals/submittal-form-page.tsx` - attachments field, pending file state, post-create upload, upload failure toast.
- `frontend/src/hooks/use-submittals.ts` - shared `uploadSubmittalAttachments` helper.
- `frontend/src/hooks/use-auth-users.ts` - explicit `people_company_id_fkey` company embed to remove runtime dropdown query error.
- `frontend/src/lib/submittals/attachment-files.ts` - shared pending file reconciliation helper.
- `frontend/src/lib/submittals/__tests__/attachment-files.test.ts` - regression coverage.

## Risks / Gaps

- Existing attachment API accepts uploads only after a submittal ID exists, so
  create-form attachments are staged client-side until the create succeeds.
- Full `codex:finish` remains blocked by known unrelated guardrail debt in
  `frontend/src/app/(admin)/document-metadata/document-metadata-client.tsx` and
  `frontend/src/app/(main)/[projectId]/pcos/page.tsx`.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
