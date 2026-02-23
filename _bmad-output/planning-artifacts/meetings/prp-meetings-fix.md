# PRP: Meetings Tool — Fix & Complete

**Feature:** Project-level Meeting Management — Gap Completion
**Deliverable:** Bridge existing transcript viewer to functional meetings CRUD tool
**Confidence Score:** 8/10

---

## Audit Summary

### Current State
The meetings feature has a **transcript-viewing system** built on `document_metadata` (type='meeting_transcript') and `meeting_segments`. It can display, search, and edit existing meeting transcripts imported from Fireflies. However, it lacks core CRUD capabilities for creating/managing meetings natively.

### Working (DO NOT TOUCH)
These files are functional and should not be modified unless fixing a direct bug:

| File | Purpose |
|------|---------|
| `(main)/[projectId]/meetings/page.tsx` | Meeting list with stats — WORKING |
| `(main)/[projectId]/meetings/meetings-table-wrapper.tsx` | Client wrapper with state — WORKING |
| `(main)/[projectId]/meetings/formatted-transcript.tsx` | Markdown transcript renderer — WORKING |
| `(main)/[projectId]/meetings/[meetingId]/parse-transcript-sections.ts` | Transcript section parser — WORKING |
| `(main)/[projectId]/meetings/[meetingId]/markdown-summary.tsx` | Summary markdown renderer — WORKING |
| `components/meetings/meetings-table.tsx` | Reusable meetings table — WORKING |
| `(tables)/meetings/page.tsx` | Global meetings list — WORKING |
| `(tables)/meetings/components/meetings-data-table.tsx` | Advanced data table with inline edit — WORKING |
| `(tables)/meetings2/page.tsx` | Alternative generic table view — WORKING |
| `(tables)/meeting-segments/page.tsx` | Segments table — WORKING |

### Broken / Incomplete
| File | Issue |
|------|-------|
| `components/meetings/edit-meeting-modal.tsx` | Uses `alert()` instead of toast; missing error handling on project search |
| `(tables)/meetings/[meetingId]/page.tsx` | Missing Summary/Gist/Keywords sections that project detail page has; imports from wrong path |
| `(main)/[projectId]/meetings/[meetingId]/page.tsx` | Empty error handlers; breadcrumb href missing projectId |

### Missing (Must Build)
| Component | Priority | Description |
|-----------|----------|-------------|
| Create Meeting Form | P1 | Dialog/form to create new meetings with title, date, project, type, participants |
| Meeting CRUD API Routes | P1 | `/api/projects/[projectId]/meetings/` — GET, POST, PUT, DELETE |
| `use-meetings` Hook | P1 | React Query hook for fetching/mutating meetings |
| Meeting Service | P2 | Business logic layer for meeting operations |
| Real E2E Tests | P2 | Create/Read/Edit/Delete test workflows |
| TASKS.md | P1 | Implementation tracking |

### Database Context
Meetings are stored in `document_metadata` table with `type = 'meeting_transcript'`. Key columns: `id` (TEXT), `title`, `content`, `summary`, `date`, `duration_minutes`, `participants`, `category`, `project` (name), `source`, `url`, `fireflies_link`, `access_level`, `status`, `metadata` (JSONB).

The `meeting_segments` table stores AI-processed chunks with vector embeddings for semantic search.

**No separate `meetings` table exists.** The PRP describes one but it hasn't been created. For this fix, we work with `document_metadata` as the meetings table to avoid breaking existing functionality.

### Tests Context
All 5 existing test files are smoke/debug tests — none follow E2E standards:
- `verify-meeting-fixes.spec.ts` — Screenshot-based smoke test
- `project-meeting-detail.spec.ts` — Page load verification
- `meetings2-page.spec.ts` — UI element presence checks
- `meeting-transcript-format.spec.ts` — Visual formatting check
- `debug-meeting-transcript.spec.ts` — Debug script (should be removed)

---

## Goal

### Feature Goal
Complete the meetings tool so users can **create**, **view**, **edit**, and **delete** meetings within a project context, with proper API routes, hooks, and E2E test coverage.

### Deliverable
1. Create Meeting dialog with form validation
2. API routes for meeting CRUD operations
3. React Query hook for data fetching/mutations
4. Fix incomplete components (edit modal, detail pages)
5. Real E2E tests covering Create/Read/Edit/Delete workflows

### Success Definition
- Users can create new meetings via a form dialog
- Users can edit existing meetings
- Users can delete meetings with confirmation
- Meeting list page shows all meetings for a project
- Meeting detail page displays complete information
- All operations go through proper API routes
- E2E tests pass for Create, Read, Edit, Delete workflows
- TypeScript compiles cleanly
- No route conflicts

---

## What

### Task 1: Create Meeting CRUD API Route
**File:** `frontend/src/app/api/projects/[projectId]/meetings/route.ts`

```typescript
// GET: List meetings for a project
// POST: Create a new meeting
// Uses document_metadata table with type='meeting_transcript'
```

**File:** `frontend/src/app/api/projects/[projectId]/meetings/[meetingId]/route.ts`

```typescript
// GET: Get single meeting
// PUT: Update meeting
// DELETE: Delete meeting
```

**Pattern Reference:** Follow `/api/projects/[projectId]/commitments/route.ts` for structure.

### Task 2: Create `use-meetings` Hook
**File:** `frontend/src/hooks/use-meetings.ts`

```typescript
// useMeetings(projectId) - list meetings with React Query
// useMeeting(meetingId) - single meeting
// useCreateMeeting() - mutation
// useUpdateMeeting() - mutation
// useDeleteMeeting() - mutation
```

**Pattern Reference:** Follow `frontend/src/hooks/use-commitments.ts` for React Query patterns.

### Task 3: Create Meeting Form Dialog
**File:** `frontend/src/components/meetings/create-meeting-dialog.tsx`

Form fields:
- Title (required, text)
- Date (required, date picker)
- Start Time (optional, time)
- End Time (optional, time)
- Duration (optional, number in minutes)
- Type/Category (optional, select)
- Location (optional, text)
- Description (optional, textarea)
- Participants (optional, text — comma-separated)
- Access Level (select: public/private/restricted)

**Pattern Reference:** Follow `frontend/src/components/commitments/create-commitment-dialog.tsx`.

### Task 4: Fix Edit Meeting Modal
**File:** `frontend/src/components/meetings/edit-meeting-modal.tsx`

Fixes:
- Replace `alert()` with `toast()` from sonner
- Add error handling for project search failures
- Ensure form resets on close

### Task 5: Fix Meeting Detail Page Breadcrumbs
**File:** `frontend/src/app/(main)/[projectId]/meetings/[meetingId]/page.tsx`

Fixes:
- Fix breadcrumb href to include `params.projectId` instead of hardcoded path
- Add proper error logging in catch blocks

### Task 6: Integrate Create Meeting Button
**File:** `frontend/src/app/(main)/[projectId]/meetings/page.tsx`

Add "Create Meeting" button to the page header that opens the CreateMeetingDialog.

### Task 7: Write E2E Tests
**File:** `frontend/tests/e2e/meetings-crud.spec.ts`

Test scenarios:
1. **Create:** Navigate to meetings, click Create, fill form, submit, verify new meeting appears
2. **Read:** Navigate to meetings list, verify existing meetings display with correct data
3. **Edit:** Open meeting, edit title, save, verify update persists
4. **Delete:** Delete a meeting, verify it disappears from list
5. **Validation:** Submit empty required fields, verify error messages

**Pattern Reference:** Follow `frontend/tests/e2e/budget-line-item-validation.spec.ts` for test structure.

### Task 8: Clean Up Debug Test
Remove or convert `frontend/tests/e2e/debug-meeting-transcript.spec.ts` — it's a debug script with no assertions.

---

## Validation

### Gate Checks (Run After Each Task)
1. `npx tsc --noEmit` — TypeScript clean
2. `npm run lint` — No lint errors
3. `npm run check:routes` — No route conflicts

### Final Validation
1. All TASKS.md items checked off
2. TypeScript compiles
3. Dev server starts without errors
4. Meeting CRUD works in browser
5. E2E tests pass
6. Production build succeeds

---

## Context Files

| File | Purpose |
|------|---------|
| `frontend/src/types/database.types.ts` | Supabase generated types — source of truth for schema |
| `frontend/src/hooks/use-commitments.ts` | Pattern reference for React Query hooks |
| `frontend/src/app/api/projects/[projectId]/commitments/route.ts` | Pattern reference for API routes |
| `frontend/src/components/commitments/create-commitment-dialog.tsx` | Pattern reference for create dialogs |
| `docs-ai/contents/docs/PRPs/meetings/prp-meetings.md` | Full feature PRP (aspirational) |
| `.claude/rules/SUPABASE-GATE.md` | Database types gate |
| `.claude/rules/CRITICAL-NEXTJS-ROUTING-RULES.md` | Route naming rules |
| `.claude/rules/E2E-TESTING-STANDARDS.md` | E2E test requirements |
