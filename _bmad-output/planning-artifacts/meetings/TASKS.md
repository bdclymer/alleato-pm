# TASKS: Meetings Tool — Fix & Complete

**PRP:** `prp-meetings-fix.md`
**Status:** Complete

---

## Implementation Tasks

### P1 — Must Build

- [x] **Task 1: Meeting CRUD API Routes**
  - `frontend/src/app/api/projects/[projectId]/meetings/route.ts` (GET, POST)
  - `frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/route.ts` (GET, PUT, DELETE)
  - Uses `document_metadata` table with `type = 'meeting'`
  - Uses `crypto.randomUUID()` for ID generation

- [x] **Task 2: `use-meetings` Hook**
  - `frontend/src/hooks/use-meetings.ts`
  - useMeetings, useMeeting, useCreateMeeting, useUpdateMeeting, useDeleteMeeting
  - React Query with toast notifications from sonner

- [x] **Task 3: Create Meeting Form Dialog**
  - `frontend/src/components/meetings/create-meeting-dialog.tsx`
  - Fields: title (required), date, duration, type/category, participants, access level, description
  - Form validation, reset on close, loading states

- [x] **Task 6: Integrate Create Meeting Button**
  - Added `meetings-actions.tsx` client component
  - `PageHeader` now includes `actions` prop with CreateMeetingDialog
  - Router refresh on successful creation

### P1 — Fix Existing

- [x] **Task 4: Fix Edit Meeting Modal**
  - Replaced `alert()` with `toast()` from sonner
  - Added error handling for project search failures
  - Added console.error logging

- [x] **Task 5: Fix Meeting Detail Page**
  - Fixed breadcrumb href: `/${projectId}` → `/${projectId}/home`
  - Fixed breadcrumb label: uses `project?.name` instead of hardcoded "Project"
  - Added proper error logging in empty catch blocks

### P2 — Testing

- [x] **Task 7: Write E2E Tests**
  - `frontend/tests/e2e/meetings-crud.spec.ts`
  - Tests: list page display, create via dialog, validation errors, seeded data display, delete
  - Added meeting helpers to `tests/helpers/db.ts`
  - Added meeting cleanup to `tests/helpers/cleanup.ts`

- [x] **Task 8: Clean Up Debug Test**
  - Removed `frontend/tests/e2e/debug-meeting-transcript.spec.ts`

---

## Gate Checks (After Each Task)

- [x] `npx tsc --noEmit` — TypeScript clean
- [x] `npm run check:routes` — No route conflicts

## Key Discovery During Implementation

- PRP specified `type = 'meeting_transcript'` but actual data uses `type = 'meeting'`
- Fixed API routes to use `type = 'meeting'` (verified via database query)

## Files Created/Modified

### Created
- `frontend/src/app/api/projects/[projectId]/meetings/route.ts`
- `frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/route.ts`
- `frontend/src/hooks/use-meetings.ts`
- `frontend/src/components/meetings/create-meeting-dialog.tsx`
- `frontend/src/app/(main)/[projectId]/meetings/meetings-actions.tsx`
- `frontend/tests/e2e/meetings-crud.spec.ts`

### Modified
- `frontend/src/components/meetings/edit-meeting-modal.tsx` — alert→toast, error handling
- `frontend/src/app/(main)/[projectId]/meetings/[meetingId]/page.tsx` — breadcrumbs, error logging
- `frontend/src/app/(main)/[projectId]/meetings/page.tsx` — create button, error logging
- `frontend/tests/helpers/db.ts` — meeting helper functions
- `frontend/tests/helpers/cleanup.ts` — meeting cleanup

### Deleted
- `frontend/tests/e2e/debug-meeting-transcript.spec.ts`
