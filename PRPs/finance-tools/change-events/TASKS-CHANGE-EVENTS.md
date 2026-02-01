# TASKS: Change Events Reality Checklist

**Status:** Complete
**Last Updated:** 2026-02-01
**Actual Completion:** 100%

## Phase 1: Database Foundation
- [x] `change_events`, `change_event_line_items`, `change_event_attachments`, `change_event_history`, and `change_event_approvals` tables defined with UUID PKs, constraints, and indexes
- [x] `change_events_summary` materialized view and helper SQL functions exist
- [x] Triggers enforce updated timestamps and audit history (logs status changes) and refresh the view
- [x] `get_next_change_event_number` provides the sequential numbering helper used by the backend
- [x] RLS policies are defined in `/frontend/supabase/migrations/20260110142750_add_change_events_rls.sql`

## Phase 2: API Surface
- [x] Collection (`GET/POST /api/projects/[projectId]/change-events`) and detail (`GET/PATCH/DELETE`) routes implemented
- [x] Line item subroutes (`/line-items`, `/line-items/{id}`) fixed to accept UUID strings (removed parseInt)
- [x] Attachment subroutes (list/upload/download/delete) fixed to use UUID changeEventId
- [x] History endpoint fixed to use UUID changeEventId
- [x] Approval endpoints (`/approvals`) implemented with create/update/retrieve backed by `change_event_approvals`
- [x] RFQ endpoints for listing, creating, and recording responses wired to UI hooks
- [x] Zod validation schemas enforce correct enum values for `type` and `scope`

## Phase 3: Frontend Pages & Components
- [x] All pages and API calls treat `changeEventId` as UUID string (removed all parseInt on UUID params)
- [x] Create form (`new/page.tsx`) maps form slug values to API enum values via SCOPE_MAP and TYPE_MAP
- [x] Revenue selector bidirectional mapping (slug ↔ display values) implemented in `ChangeEventRevenueSection.tsx`
- [x] `use-change-events.ts` hook POST body sends correct fields (`title`, `type`, `scope`, `reason`, `description`)
- [x] `ChangeEventConvertDialog` prop type fixed from `number` to `string` for UUID
- [x] Detail page `currentUserId` type fixed from `number` to `string`
- [x] `ChangeEventsTableColumns.tsx` fixed: removed `{" "}` whitespace in `DropdownMenuTrigger asChild` that caused React.Children.only crash
- [x] List page renders correctly with table, search, status tabs, summary, RFQs, and recycle bin
- [x] Detail page renders with General, Line Items, Attachments, History tabs
- [x] Edit page loads with pre-filled data
- [x] RFQ creation and response panels wired to API hooks

## Phase 4: Testing & Verification
- [x] E2E Playwright tests written and passing (13/13): `tests/e2e/change-events-e2e.spec.ts`
  - [x] List page loads with content
  - [x] Create form loads with all required fields
  - [x] Form validates required fields (shows errors on empty submit)
  - [x] Successfully creates a change event via form (API returns UUID)
  - [x] Detail page loads with tabs
  - [x] Detail page tabs are clickable
  - [x] Edit page loads with pre-filled existing data
  - [x] GET list API returns valid response with data/meta
  - [x] GET single change event API returns correct record
  - [x] UI handles non-existent change event ID gracefully
  - [x] API returns 404 for non-existent ID
  - [x] Test data cleanup runs successfully

## Production Readiness
- [x] Change event detail/edit views load real data with UUID params
- [x] TypeScript compilation: 0 errors in all change-events files
- [x] Production build: compiles successfully
- [x] ESLint: 0 errors in change-events files
- [x] No parseInt on UUID params remaining (verified via grep)

## Bugs Fixed (Summary)

| Bug | File(s) | Fix |
|-----|---------|-----|
| parseInt on UUID IDs | 6 API route files | Removed parseInt, pass UUID string directly |
| Create form → API schema mismatch | `new/page.tsx` | Added SCOPE_MAP and TYPE_MAP for enum conversion |
| Hook POST body wrong fields | `use-change-events.ts` | Fixed to send `title`, `type`, `scope` |
| currentUserId type mismatch | `[id]/page.tsx` | Changed from `{1}` to `{"1"}` |
| ChangeEventConvertDialog prop type | `ChangeEventConvertDialog.tsx` | Changed `number` to `string` |
| Revenue slug/display mismatch | `ChangeEventRevenueSection.tsx` | Added bidirectional mapping |
| DropdownMenuTrigger crash | `ChangeEventsTableColumns.tsx` | Removed `{" "}` whitespace inside `asChild` |
| database.types.ts stray line | `database.types.ts` | Removed "Using workdir..." on line 1 |
