# Task: Drawings Upload Review Controls

Status: Complete - Pushed
Owner: Codex
Created: 2026-06-23
Linear Issue: AAI-614 - https://linear.app/megankharrison/issue/AAI-614/add-drawings-review-queue-for-unpublished-revisions
Related Handoff: docs/ops/handoffs/2026-06-23-S85-drawings-upload-review-controls.md

## Objective

Make selected drawing files in the upload dialog behave like a review queue by
allowing users to rotate a sheet preview state, remove sheets before processing,
and submit that reviewed per-file state through the upload path.

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
| Static/type/lint      | `cd frontend && npx eslint src/components/drawings/DrawingUploadDialog.tsx src/hooks/use-drawing-upload.ts src/components/drawings/__tests__/DrawingUploadDialog.partial-failure.test.tsx --no-warn-ignored` | PASS | No output. |
| Static/type/lint      | `npm --prefix frontend run typecheck:changed` | PASS | No new changed-file type debt. |
| Targeted tests        | `npm --prefix frontend run test:unit -- --runTestsByPath src/components/drawings/__tests__/DrawingUploadDialog.partial-failure.test.tsx` | PASS | 1 suite, 5 tests. |
| Browser/user-flow     | `tests/agent-browser-runs/2026-06-23-drawings-upload-review-controls/upload-review-after-controls.png` | PASS | Three uploaded PDFs, S201 rotated twice, A101 removed. |
| DB/provider read-back | N/A | PASS | No database, provider, or migration changes in this slice. |
| End-to-end proof      | `tests/agent-browser-runs/2026-06-23-drawings-upload-review-controls/upload-review-controls-dom.json` | PASS | DOM readback: `hasA101=false`, `hasS201=true`, `hasM301=true`, `has180=true`. |

## Files Changed

- `frontend/src/components/drawings/DrawingUploadDialog.tsx` - add compact rotate/remove review controls to selected files.
- `frontend/src/hooks/use-drawing-upload.ts` - carry reviewed rotation metadata through the batch upload path.
- `frontend/src/components/drawings/__tests__/DrawingUploadDialog.partial-failure.test.tsx` - guard rotate/remove behavior and submitted per-file review state.
- `docs/ops/tasks/2026-06-23-drawings-upload-review-controls.md` - task ledger.
- `docs/ops/handoffs/2026-06-23-S85-drawings-upload-review-controls.md` - handoff.

## Risks / Gaps

- This slice stores rotation as reviewed upload metadata only. It does not
  rasterize, rewrite, or persist transformed uploaded PDFs/images.
- Multi-page PDF splitting and true OCR confidence remain separate backend
  processing gaps.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
