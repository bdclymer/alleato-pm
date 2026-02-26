# Progress - Submittals

## 2026-02-26 — Feature Complete ✅

All phases implemented, tested, and committed.

**Files created/updated:**

- `supabase/migrations/20260224000005_create_submittal_tables.sql` — full schema with RLS
- `supabase/migrations/20260226000001_make_submittal_type_id_nullable.sql` — DB fixes
- `frontend/src/hooks/use-submittals.ts` — full CRUD hooks
- `frontend/src/app/api/projects/[projectId]/submittals/route.ts` — GET/POST
- `frontend/src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts` — GET/PUT/DELETE
- `frontend/src/features/submittals/submittal-form-dialog.tsx` — create/edit dialog
- `frontend/src/features/submittals/submittal-detail-client.tsx` — 4-tab detail view
- `frontend/src/features/submittals/submittals-table-config.tsx` — table columns/filters
- `frontend/src/app/(main)/[projectId]/submittals/page.tsx` — list page (5 tabs)
- `frontend/src/app/(main)/[projectId]/submittals/[submittalId]/page.tsx` — detail page

**Bugs fixed during implementation:**

1. `submittal_type_id` NOT NULL constraint → made nullable (free-text type field used instead)
2. `submittals_status_check` only allowed lowercase values → updated to accept Procore UI values (Draft, Open, Distributed, Closed)
3. Route `?? ""` for UUID FK → fixed to `?? null`

**UAT verified (2026-02-26):**

- ✅ List page loads with correct columns
- ✅ Create button opens form dialog
- ✅ Create new submittal → toast + row appears in Items tab
- ✅ Row click navigates to detail page
- ✅ Detail page shows 4 tabs (General, Workflow, Related Items, Change History)
- ✅ Delete → confirm dialog → "Submittal moved to Recycle Bin" toast → item in Recycle Bin tab

**Commit:** `b2db3d0c feat(submittals): implement full CRUD feature with list, detail, and form`

## 2026-01-31

- Reorganized task list for clarity
- Grouped tasks by implementation phase
- Added visual indicators and better structure

## 2026-01-28

- Initial implementation planning
- Created PRP document
- Defined 17 implementation tasks
