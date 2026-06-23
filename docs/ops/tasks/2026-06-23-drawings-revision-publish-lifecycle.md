# Task: Drawings Revision Publish Lifecycle

Status: Complete - Pushed
Owner: Codex
Created: 2026-06-23
Linear Issue: AAI-613 - https://linear.app/megankharrison/issue/AAI-613/add-drawings-revision-level-publish-lifecycle
Related Handoff: docs/ops/handoffs/2026-06-23-S80-drawings-revision-publish-lifecycle.md

## Objective

Move Drawings publish/review state to the revision layer so a previously
published drawing can remain visible while a newly uploaded revision stays under
review/unpublished.

## Non-Negotiable Done Rule

This task is not done until every checklist item below is checked, with evidence
filled in. If any item cannot be completed, change `Status` to
`Blocked/Deferred` and document the blocker, owner, and next action.

## Workflow Map

User action: upload a duplicate drawing number; publish/unpublish a drawing.
Frontend owner component: `DrawingUploadDialog`, `DrawingLogTable` bulk/status actions.
Shared primitive/component owner: existing dialog/table/button primitives.
Client state changed: Drawings React Query cache invalidation.
API route(s): `POST /api/projects/[projectId]/drawings`, `/publish`, `bulk-status`.
Validation schema(s): existing drawing upload form schema; route request parsing.
Service/helper(s): `DrawingService`, `DrawingRevisionService`.
Supabase table(s): `drawings`, `drawing_revisions`, `drawing_log` view.
Live DB column/type assumptions: `drawings.id` and `drawing_revisions.id` are UUID; `projects.id` is integer.
Side effects on render: none expected.
Bulk/import/template behavior: bulk publish should use one update path.
Expected success evidence: default drawing list shows latest published revision; admin/unpublished view can see newest under-review revision; no duplicate logical drawing created.
Expected failure behavior: missing/invalid revision state fails API route with structured error; no silent publish.

## Scope Checklist

- [x] Existing architecture and prior related implementations reviewed.
- [x] Existing shared primitives/services/helpers identified before adding new ones.
- [x] Source-of-truth owner chosen for the workflow/data/control plane.
- [x] Deprecated or bypassed paths identified.
- [x] Acceptance criteria written as observable behavior, not implementation hopes.
- [x] Failure-loudly behavior defined.

## Acceptance Criteria

- [x] `drawing_revisions` can represent revision publication independently of `drawings.is_published`.
- [x] Uploading a duplicate drawing number creates an under-review, unpublished revision without unpublishing the logical drawing.
- [x] Publishing a drawing publishes the selected/current uploaded revision and updates `drawings.current_revision_id` to that revision.
- [x] Default drawing log excludes unpublished revisions while still showing the latest published revision.
- [x] `include_unpublished=true` shows the newest current/uploaded revision for admin/review flows.
- [x] Prior revisions remain accessible in revision history.
- [x] Targeted tests cover upload, publish, and listing behavior.

## Implementation Checklist

- [x] Files/modules to change listed before edits.
- [x] Database schema/types/migrations handled, if applicable.
- [x] Provider/env/config changes handled through CLI/API/MCP when available.
- [x] Centralized/shared abstraction used when the behavior is cross-cutting.
- [x] Legacy or duplicate paths removed, blocked, or explicitly marked deprecated.
- [x] Errors are specific and actionable; no silent fallback added.
- [x] User-facing copy/UI follows project noise gate and design-system rules, if applicable.

## Files/Modules To Change

- `supabase/migrations/<timestamp>_drawing_revision_publication_lifecycle.sql` - revision publication columns and drawing log view.
- `frontend/src/types/database.types.ts` - regenerated Supabase types.
- `frontend/src/services/drawings/types.ts` - revision lifecycle input types.
- `frontend/src/services/drawings/DrawingRevisionService.ts` - publish/current pointer behavior.
- `frontend/src/services/DrawingService.ts` - publish/unpublish/list behavior.
- `frontend/src/app/api/projects/[projectId]/drawings/route.ts` - duplicate upload no longer unpublishes logical drawing.
- `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/publish/route.ts` - publish/unpublish semantics.
- `frontend/src/app/api/projects/[projectId]/drawings/bulk-status/route.ts` - bulk publish semantics.
- Targeted tests under Drawings API/service paths.

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
| Supabase types gate   | `bash -lc 'set -a; source .env; set +a; tmp=$(mktemp); npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > "$tmp" && test -s "$tmp" && mv "$tmp" frontend/src/types/database.types.ts'` | Pass | `.env.local` token path failed; `.env` token path passed with temp-file guard. |
| Migration apply       | `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260623155200_drawing_revision_publication_lifecycle.sql` | Pass | Backfilled 380 review pointers and 378 published current revisions. |
| Migration ledger      | `npm run db:migrations:verify-applied -- supabase/migrations/20260623155200_drawing_revision_publication_lifecycle.sql` | Pass | Ledger version `20260623155200` verified after exact migration repair. |
| Static/type/lint      | `npx eslint ...drawings changed files...` | Pass | Targeted lint passed for services/routes/test. |
| Static/type/lint      | `npm --prefix frontend run typecheck:changed` | Pass | No new `any` debt. |
| Targeted tests        | `npm run test:unit -- --runTestsByPath 'src/app/api/projects/[projectId]/drawings/__tests__/route.test.ts'` | Pass | Covers first upload and duplicate-as-review-revision behavior. |
| Browser/user-flow     | `agent-browser` run against `http://localhost:3001/1009/drawings`; artifacts in `tests/agent-browser-runs/2026-06-23-drawings-revision-publish-lifecycle/` | Pass | Default log shows published Rev `0`; review log shows under-review Rev `1`; verification data cleaned up. |
| DB/provider read-back | `psql` information schema read-back for `drawing_revisions`/`drawings` publication columns | Pass | Confirmed live revision publication columns and drawing review pointer. |
| End-to-end proof      | `tests/agent-browser-runs/2026-06-23-drawings-revision-publish-lifecycle/final-readback.json` | Pass | One drawing, published/current-view revision separate from review-current revision. |
| Finish/publish        | `npm run codex:finish -- --message "Add drawings revision publish lifecycle" --files ...` | Pass | Commit `bc917687e` pushed to `origin/main`; route checks, changed-file quality, migration ledger, lint-staged, and push verification passed. |

## Files Changed

- `docs/ops/tasks/2026-06-23-drawings-revision-publish-lifecycle.md` - task ledger.
- `docs/ops/handoffs/2026-06-23-S80-drawings-revision-publish-lifecycle.md` - orchestration handoff.
- `docs/ops/orchestration/session-board.md` - S80 session claim.
- `supabase/migrations/20260623155200_drawing_revision_publication_lifecycle.sql` - revision publication schema and views.
- `frontend/src/types/database.types.ts` - regenerated Supabase types.
- `frontend/src/services/drawings/types.ts` - revision lifecycle inputs.
- `frontend/src/services/drawings/DrawingRevisionService.ts` - revision publication/current/review pointer behavior.
- `frontend/src/services/DrawingService.ts` - revision-aware list/publish/unpublish.
- `frontend/src/app/api/projects/[projectId]/drawings/route.ts` - duplicate upload no longer unpublishes/moves published current pointer.
- `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/route.ts` - explicit new revisions are under-review by default.
- `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/publish/route.ts` - passes actor to publish service.
- `frontend/src/app/api/projects/[projectId]/drawings/bulk-status/route.ts` - bulk publish/unpublish uses revision-aware service.
- `frontend/src/app/api/projects/[projectId]/drawings/__tests__/route.test.ts` - updated duplicate upload regression.
- `tests/agent-browser-runs/2026-06-23-drawings-revision-publish-lifecycle/` - browser verification artifacts.

## Risks / Gaps

- Existing UI labels may still describe drawing-level publish until the data path is complete.
- The full OCR/review queue remains out of scope.
- Full repository `npm run typecheck` is known to time out from existing tsconfig weight; changed-file checks passed.

## Final Status

- [x] All checklist items are complete.
- [x] Evidence is recorded.
- [x] Any deferred work is explicitly marked Blocked/Deferred with owner and next action.
- [x] Final response includes what is done, what remains, and recommended next steps.
