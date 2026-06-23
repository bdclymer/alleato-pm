# Task: Drawings Upload Metadata Review

Status: Complete - Pushed
Owner: Codex
Created: 2026-06-23
Linear Issue: AAI-614 - https://linear.app/megankharrison/issue/AAI-614/add-drawings-review-queue-for-unpublished-revisions
Related Handoff: docs/ops/handoffs/2026-06-23-S84-drawings-upload-metadata-review.md

## Objective

Make uploaded drawing metadata reviewable before processing by showing
filename-detected drawing number, title, revision, and discipline for each
selected file and using user edits during upload.

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
| Static/type/lint      | `cd frontend && npx eslint src/lib/drawings/drawing-identity.ts src/hooks/use-drawing-upload.ts src/components/drawings/DrawingUploadDialog.tsx src/components/drawings/__tests__/DrawingUploadDialog.partial-failure.test.tsx src/lib/drawings/__tests__/drawing-identity.unit.test.ts --no-warn-ignored` | PASS | No output. |
| Static/type/lint      | `npm --prefix frontend run typecheck:changed` | PASS | No new changed-file type debt. |
| Targeted tests        | `npm --prefix frontend run test:unit -- --runTestsByPath src/lib/drawings/__tests__/drawing-identity.unit.test.ts src/components/drawings/__tests__/DrawingUploadDialog.partial-failure.test.tsx` | PASS | 2 suites, 6 tests. |
| Browser/user-flow     | `tests/agent-browser-runs/2026-06-23-drawings-upload-metadata-review/metadata-review-dialog.png` | PASS | Upload dialog shows editable detected metadata controls in the selected file row. |
| DB/provider read-back | N/A | PASS | No database or provider changes in this slice. |
| End-to-end proof      | `tests/agent-browser-runs/2026-06-23-drawings-upload-metadata-review/metadata-review-values.txt` | PASS | Browser-visible values: drawing number `A101`, title `First Floor Plan`, revision `2`, discipline `Architectural`. |

## Files Changed

- `frontend/src/lib/drawings/drawing-identity.ts` - add reusable filename metadata detection.
- `frontend/src/lib/drawings/__tests__/drawing-identity.unit.test.ts` - guard filename metadata detection behavior.
- `frontend/src/hooks/use-drawing-upload.ts` - pass per-file metadata overrides through multi-upload.
- `frontend/src/components/drawings/DrawingUploadDialog.tsx` - show/edit per-file detected metadata before upload.
- `frontend/src/components/drawings/__tests__/DrawingUploadDialog.partial-failure.test.tsx` - guard metadata review submit behavior.
- `docs/ops/tasks/2026-06-23-drawings-upload-metadata-review.md` - task ledger.
- `docs/ops/handoffs/2026-06-23-S84-drawings-upload-metadata-review.md` - handoff.

## Risks / Gaps

- This slice provides filename-based confidence, not true PDF OCR confidence.
  OCR confidence still depends on the downstream document/OCR pipeline.
- Multi-page PDF splitting remains a separate backend processing gap.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
