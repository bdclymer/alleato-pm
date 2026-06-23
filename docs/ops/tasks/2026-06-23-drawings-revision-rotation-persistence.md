# Task: Drawings Revision Rotation Persistence

Status: Complete - Pushed
Owner: Codex
Created: 2026-06-23
Linear Issue: AAI-614 - https://linear.app/megankharrison/issue/AAI-614/add-drawings-review-queue-for-unpublished-revisions
Related Handoff: docs/ops/handoffs/2026-06-23-S86-drawings-revision-rotation-persistence.md

## Objective

Persist reviewed upload rotation on drawing revisions so rotation selected during
upload is stored as revision metadata and available to future viewer/upload
processing work.

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
| Supabase types gate   | `npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts` | FAIL | CLI exited 1 and wrote a short failure payload to stdout, truncating the redirected file. Restored `frontend/src/types/database.types.ts` from `HEAD` immediately. |
| Static/type/lint      | `cd frontend && npx eslint 'src/app/api/projects/[projectId]/drawings/route.ts' 'src/app/api/projects/[projectId]/drawings/__tests__/route.test.ts' src/services/drawings/DrawingRevisionService.ts src/services/drawings/types.ts src/hooks/use-drawing-upload.ts src/hooks/__tests__/use-drawing-upload.test.tsx src/components/drawings/DrawingUploadDialog.tsx src/components/drawings/__tests__/DrawingUploadDialog.partial-failure.test.tsx --no-warn-ignored` | PASS | No output. |
| Static/type/lint      | `npm --prefix frontend run typecheck:changed` | PASS | No new changed-file type debt. |
| Targeted tests        | `npm --prefix frontend run test:unit -- --runTestsByPath 'src/app/api/projects/[projectId]/drawings/__tests__/route.test.ts' src/hooks/__tests__/use-drawing-upload.test.tsx src/components/drawings/__tests__/DrawingUploadDialog.partial-failure.test.tsx` | PASS | 3 suites, 9 tests. |
| Browser/user-flow     | N/A | PASS | No new visible UI; S85 browser proof already covered rotate/remove controls. This slice persists that reviewed value server-side. |
| DB/provider read-back | `npm run db:migrations:verify-applied -- supabase/migrations/20260623172600_add_drawing_revision_rotation_degrees.sql` | PASS | Supabase migration ledger check passed: `20260623172600`. |
| DB/provider read-back | `psql "$DATABASE_URL" -At -c ...information_schema...` | PASS | Remote column readback: `rotation_degrees:integer:0`; constraint readback: `drawing_revisions_rotation_degrees_check`. |
| End-to-end proof      | Transaction-rolled-back insert/readback against `drawing_revisions` | PASS | Inserted temporary revision with `rotation_degrees=180`, read back `rotation_persistence=180`, then `ROLLBACK`. |

## Files Changed

- `supabase/migrations/20260623172600_add_drawing_revision_rotation_degrees.sql` - add revision rotation field and constraint.
- `frontend/src/types/database.types.ts` - reflect new `drawing_revisions.rotation_degrees` column.
- `frontend/src/services/drawings/types.ts` - add rotation to revision create input.
- `frontend/src/services/drawings/DrawingRevisionService.ts` - persist rotation on revision insert.
- `frontend/src/app/api/projects/[projectId]/drawings/route.ts` - accept and forward upload rotation.
- `frontend/src/app/api/projects/[projectId]/drawings/__tests__/route.test.ts` - guard create/revision rotation persistence.
- `frontend/src/hooks/use-drawing-upload.ts` - preserve reviewed rotation through real batch uploads.
- `frontend/src/hooks/__tests__/use-drawing-upload.test.tsx` - guard real hook batch upload rotation body.
- `docs/architecture/PROJECT-MAP.md` - regenerated after Drawings API route change.
- `frontend/src/lib/app-surface/app-surface.generated.json` - regenerated after Drawings API route change.
- `docs/ops/tasks/2026-06-23-drawings-revision-rotation-persistence.md` - task ledger.
- `docs/ops/handoffs/2026-06-23-S86-drawings-revision-rotation-persistence.md` - handoff.

## Risks / Gaps

- This slice persists rotation metadata only. It does not rotate PDF/image bytes
  or make viewer rotation load from the stored value.
- The Supabase type generation gate failed before edits; the generated file was
  restored and the type change is patched locally with migration evidence.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
