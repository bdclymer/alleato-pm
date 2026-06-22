# S9 Handoff - Directory Members Company Column

## Scope

- Task ID: `ORCH-011`
- Objective: add a visible company column to the project members table on `frontend/src/app/(main)/[projectId]/directory/page.tsx` and clear the targeted page lint warnings
- Owned paths:
  - `frontend/src/app/(main)/[projectId]/directory/page.tsx`
  - `docs/ops/handoffs/2026-04-14-S9-directory-members-company.md`

## Intake Block

1. Session ID: `S9`
2. Task ID: `ORCH-011`
3. Current status: `Pending Review`
4. Files changed (absolute paths):
   - `/Users/meganharrison/Documents/github/alleato-pm/docs/ops/orchestration/session-board.md`
   - `/Users/meganharrison/Documents/github/alleato-pm/docs/ops/handoffs/2026-04-14-S9-directory-members-company.md`
   - `/Users/meganharrison/Documents/github/alleato-pm/frontend/src/app/(main)/[projectId]/directory/page.tsx`
5. Commands run and outcome (pass/fail counts):
   - `rg -n "directory|project members|members table|Project Members|project_members|member" frontend/src --glob '!**/*.map'` - pass
   - `rg --files frontend/src | rg "directory|member|people|company"` - pass
   - `git status --short` - pass
   - `sed -n '1,220p' docs/ops/orchestration/worker-protocol.md` - pass
   - `sed -n '1,220p' docs/ops/orchestration/session-board.md` - pass
   - `sed -n '1,220p' docs/ops/orchestration/review-queue.md` - pass
   - `sed -n '1,260p' frontend/src/components/directory/DirectoryTable.tsx` - pass
   - `sed -n '1,260p' frontend/src/services/directoryService.ts` - pass
   - `sed -n '260,520p' frontend/src/components/directory/DirectoryTable.tsx` - pass
   - `sed -n '260,520p' frontend/src/services/directoryService.ts` - pass
   - `sed -n '1,260p' frontend/src/components/directory/DirectoryFilters.tsx` - pass
   - `sed -n '1,260p' 'frontend/src/app/(main)/[projectId]/directory/page.tsx'` - pass
   - `sed -n '1,260p' frontend/src/components/directory/responsive/ResponsiveUsersTable.tsx` - pass
   - `sed -n '1,260p' frontend/src/components/directory/responsive/ResponsiveAuthUsersTable.tsx` - pass
   - `sed -n '1,220p' frontend/src/hooks/useDirectory.ts` - pass
   - `sed -n '1,260p' 'frontend/src/app/api/projects/[projectId]/directory/people/route.ts'` - pass
   - `sed -n '1,260p' frontend/src/hooks/use-project-users.ts` - pass
   - `rg -n "Project Members|Members|memberStatusLabel|useProjectUsers|company_name|Company" 'frontend/src/app/(main)/[projectId]/directory/page.tsx'` - pass
   - `sed -n '260,760p' 'frontend/src/app/(main)/[projectId]/directory/page.tsx'` - pass
   - `sed -n '1240,1395p' 'frontend/src/app/(main)/[projectId]/directory/page.tsx'` - pass
   - `npx eslint 'src/app/(main)/[projectId]/directory/page.tsx'` - pass with 9 pre-existing warnings, 0 errors
   - `git diff -- 'frontend/src/app/(main)/[projectId]/directory/page.tsx' 'docs/ops/orchestration/session-board.md' 'docs/ops/handoffs/2026-04-14-S9-directory-members-company.md'` - pass
   - `npx eslint 'src/app/(main)/[projectId]/directory/page.tsx'` - pass with 0 warnings, 0 errors after cleanup
   - `git diff -- 'frontend/src/app/(main)/[projectId]/directory/page.tsx'` - pass
6. Evidence artifacts:
   - No screenshot artifact captured; code diff and targeted lint output used for this UI/page cleanup change
7. Top 3 findings (frontend-visible issues first):
   - The active project directory page uses a custom `MembersDataTable`, not the older `DirectoryTable`, so the visible table was missing company despite the data already being present.
   - The company column was added directly to `MembersDataTable`, which fixes the actual `/[projectId]/directory` project members table instead of a legacy directory view.
   - The page-level warnings were real debt: raw `fetch`, a raw `<button>`, arbitrary dialog width classes, and an incorrect `PageShell` import. All targeted warnings are now cleared.
8. Recommended next action (one line):
   - Accept this change set; no further warning cleanup is required on this page for the scoped lint target.
9. Handoff file path:
   - `/Users/meganharrison/Documents/github/alleato-pm/docs/ops/handoffs/2026-04-14-S9-directory-members-company.md`

## Implementation Summary

- Added a `Company` column to the `MembersDataTable` column definition in `/Users/meganharrison/Documents/github/alleato-pm/frontend/src/app/(main)/[projectId]/directory/page.tsx`
- Reused existing `PersonWithDetails.company?.name` data path, so no API or service changes were required
- Replaced raw `fetch` calls on this page with `apiFetch` so user-visible failures surface real API errors instead of generic fallbacks
- Replaced the raw vendor CTA `<button>` with the shared `Button` primitive
- Normalized dialog widths and moved `PageShell` to the canonical `@/components/layout` import to satisfy design-system rules

## Risks

- No remaining targeted lint warnings on `frontend/src/app/(main)/[projectId]/directory/page.tsx`
