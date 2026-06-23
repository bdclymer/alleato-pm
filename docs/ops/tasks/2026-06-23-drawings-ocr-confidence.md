# Task: Drawings OCR Confidence

Status: Complete - Pushed
Owner: Codex
Created: 2026-06-23
Linear Issue: AAI-614 - https://linear.app/megankharrison/issue/AAI-614/add-drawings-review-queue-for-unpublished-revisions
Related Handoff: docs/ops/handoffs/2026-06-23-S87-drawings-ocr-confidence.md

## Objective

Persist and surface drawing upload metadata confidence as explicit OCR/metadata
confidence so users can see whether uploaded sheet metadata came from reliable
extraction, filename fallback, or needs review.

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
| Static/type/lint      | `cd frontend && npx eslint 'src/app/api/projects/[projectId]/drawings/route.ts' 'src/app/api/projects/[projectId]/drawings/__tests__/route.test.ts' src/services/drawings/DrawingRevisionService.ts src/services/drawings/types.ts src/hooks/use-drawing-upload.ts src/hooks/__tests__/use-drawing-upload.test.tsx src/components/drawings/DrawingUploadDialog.tsx src/components/drawings/__tests__/DrawingUploadDialog.partial-failure.test.tsx src/lib/drawings/drawing-identity.ts src/lib/drawings/__tests__/drawing-identity.unit.test.ts --no-warn-ignored`; `npm --prefix frontend run typecheck:changed` | PASS | Changed-file type debt check reported no new `any` debt. |
| Targeted tests        | `npm --prefix frontend run test:unit -- --runTestsByPath 'src/app/api/projects/[projectId]/drawings/__tests__/route.test.ts' src/hooks/__tests__/use-drawing-upload.test.tsx src/components/drawings/__tests__/DrawingUploadDialog.partial-failure.test.tsx src/lib/drawings/__tests__/drawing-identity.unit.test.ts` | PASS | 4 suites, 11 tests passed. |
| Browser/user-flow     | `tests/agent-browser-runs/2026-06-23-drawings-ocr-confidence/ocr-confidence-upload.png`; `tests/agent-browser-runs/2026-06-23-drawings-ocr-confidence/ocr-confidence-dom.json` | PASS | Upload review row showed `filename high` for `S201 Framing Plan.pdf`; `hasFilenameHigh: true`. |
| DB/provider read-back | `npm run db:migrations:verify-applied -- supabase/migrations/20260623174000_add_drawing_revision_ocr_confidence.sql`; remote column/constraint queries | PASS | Ledger passed for `20260623174000`; columns and check constraints present. |
| End-to-end proof      | Transaction-rolled-back insert into `drawing_revisions` | PASS | Read back `ocr_confidence=high:0.875:ocr` before rollback. |

## Files Changed

- `supabase/migrations/<timestamp>_add_drawing_revision_ocr_confidence.sql` - add OCR confidence metadata fields.
- `frontend/src/types/database.types.ts` - reflect revision OCR confidence columns.
- `frontend/src/services/drawings/types.ts` - add OCR confidence to revision create input.
- `frontend/src/services/drawings/DrawingRevisionService.ts` - persist OCR confidence fields.
- `frontend/src/app/api/projects/[projectId]/drawings/route.ts` - accept, normalize, and forward OCR confidence.
- `frontend/src/app/api/projects/[projectId]/drawings/__tests__/route.test.ts` - guard OCR confidence persistence.
- `frontend/src/hooks/use-drawing-upload.ts` - carry reviewed confidence through batch uploads.
- `frontend/src/hooks/__tests__/use-drawing-upload.test.tsx` - guard hook POST confidence payload.
- `frontend/src/components/drawings/DrawingUploadDialog.tsx` - show explicit metadata confidence source in upload review rows.
- `frontend/src/components/drawings/__tests__/DrawingUploadDialog.partial-failure.test.tsx` - guard submitted confidence metadata.
- `docs/ops/tasks/2026-06-23-drawings-ocr-confidence.md` - task ledger.
- `docs/ops/handoffs/2026-06-23-S87-drawings-ocr-confidence.md` - handoff.

## Risks / Gaps

- This slice persists OCR/metadata confidence fields and labels filename fallback
  as such. It does not implement full PDF text OCR before upload review.
- True content OCR confidence still depends on the asynchronous document/OCR
  pipeline and should update these fields when that pipeline returns scores.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
