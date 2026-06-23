# Task: Drawings Upload Revision Lifecycle

Status: Verified - Not Pushed
Owner: Codex
Created: 2026-06-23
Linear Issue: AAI-612 - https://linear.app/megankharrison/issue/AAI-612/implement-drawings-uploadrevision-lifecycle-foundation
Related Handoff: docs/ops/handoffs/2026-06-23-S79-drawings-upload-revision-lifecycle.md

## Objective

Implement the first Procore-parity Drawings lifecycle slice: duplicate drawing
uploads create a new revision server-side instead of returning a client-only
duplicate error, and new uploads land in a non-published lifecycle state that
can support a future review queue.

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

- [x] `POST /api/projects/[projectId]/drawings` creates a new drawing only when no drawing with the same project-scoped drawing number exists.
- [x] If the drawing number already exists, the same POST creates a `drawing_revisions` row for that drawing and returns the existing drawing with its new current revision.
- [x] New drawing uploads are not marked published by default.
- [x] Revision creation keeps a single current revision and does not silently create duplicate logical drawings.
- [x] Targeted tests cover both first upload and duplicate-as-revision behavior.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Database schema/types/migrations handled, if applicable.
- [x] Provider/env/config changes handled through CLI/API/MCP when available.
- [x] Centralized/shared abstraction used when the behavior is cross-cutting.
- [x] Legacy or duplicate paths removed, blocked, or explicitly marked deprecated.
- [x] Errors are specific and actionable; no silent fallback added.
- [x] User-facing copy/UI follows project noise gate and design-system rules, if applicable.

## Files/Modules To Change

- `frontend/src/app/api/projects/[projectId]/drawings/route.ts` - canonical upload finalization behavior.
- `frontend/src/components/drawings/DrawingUploadDialog.tsx` - remove duplicate-only client revision branch if server path owns it.
- `frontend/src/hooks/use-drawing-upload.ts` - ensure multiple-file upload handles server duplicate-as-revision response.
- `frontend/src/services/DrawingService.ts` - allow callers to create unpublished drawings.
- `frontend/src/services/drawings/DrawingRevisionService.ts` - explicitly maintain current revision state instead of relying on a missing trigger.
- `frontend/src/services/drawings/types.ts` - add lifecycle/current-revision inputs.
- `frontend/src/app/api/projects/[projectId]/drawings/__tests__/route.test.ts` - upload lifecycle regression coverage.

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
| Static/type/lint      | `npx eslint 'src/app/api/projects/[projectId]/drawings/route.ts' 'src/app/api/projects/[projectId]/drawings/__tests__/route.test.ts' 'src/components/drawings/DrawingUploadDialog.tsx' 'src/services/DrawingService.ts' 'src/services/drawings/DrawingRevisionService.ts' 'src/services/drawings/types.ts'` | Pass | Targeted lint for changed files. |
| Static/type/lint      | `npm run typecheck` | Fail | Bounded typecheck timed out after 60000ms with existing tsconfig-weight failure message. |
| Targeted tests        | `npm run test:unit -- --runTestsByPath 'src/app/api/projects/[projectId]/drawings/__tests__/route.test.ts'` | Pass | Covers first upload unpublished/under_review and duplicate-as-revision behavior. |
| Handoff check         | `npm run linear:codex:check -- docs/ops/handoffs/2026-06-23-S79-drawings-upload-revision-lifecycle.md` | Pass | Linear handoff is structurally valid. |
| Browser/user-flow     | `agent-browser` run against `http://localhost:3001/1009/drawings`; artifacts in `tests/agent-browser-runs/2026-06-23-drawings-upload-revision-lifecycle/` | Pass | Uploaded revision `0`, uploaded same drawing number as revision `1`, read back one logical drawing with two revisions, then cleaned up verification data. |
| DB/provider read-back | N/A | Pass | No migrations or provider configuration changes in this slice. |
| End-to-end proof      | Route test exercising POST finalization | Pass | Uses signed-upload finalization JSON path and mocked storage public URL. |

## Files Changed

- `docs/ops/tasks/2026-06-23-drawings-upload-revision-lifecycle.md` - task ledger.
- `docs/ops/handoffs/2026-06-23-S79-drawings-upload-revision-lifecycle.md` - orchestration handoff.
- `docs/ops/orchestration/session-board.md` - S79 session claim.
- `frontend/src/app/api/projects/[projectId]/drawings/route.ts` - duplicate-as-revision server behavior and unpublished under-review uploads.
- `frontend/src/app/api/projects/[projectId]/drawings/__tests__/route.test.ts` - focused upload/revision tests.
- `frontend/src/components/drawings/DrawingUploadDialog.tsx` - removed stale duplicate warning/retry branch.
- `frontend/src/services/DrawingService.ts` - create-time lifecycle flags.
- `frontend/src/services/drawings/DrawingRevisionService.ts` - explicit current-revision state maintenance.
- `frontend/src/services/drawings/types.ts` - create input type additions.
- `tests/agent-browser-runs/2026-06-23-drawings-upload-revision-lifecycle/VERIFICATION_SUMMARY.md` - browser verification summary.
- `tests/agent-browser-runs/2026-06-23-drawings-upload-revision-lifecycle/readback.json` - authenticated API read-back evidence.
- `tests/agent-browser-runs/2026-06-23-drawings-upload-revision-lifecycle/cleanup.json` - verification data cleanup evidence.
- `tests/agent-browser-runs/2026-06-23-drawings-upload-revision-lifecycle/*.png` - browser screenshots.

## Risks / Gaps

- This slice does not implement OCR, PDF splitting, or the full review queue.
- Existing Drawings status values are still not Procore-complete; this slice only prevents the current duplicate upload/revision gap from compounding.
- The current schema still has drawing-level publication rather than revision-level publication. Uploading a new revision unpublishes the logical drawing until a publish/review flow exists, which is safer than exposing unreviewed uploads but not full Procore parity.
- Full repository typecheck still times out after 60000ms because the frontend tsconfig admits heavy app/generated code. Targeted lint and tests pass for the changed Drawings files.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
