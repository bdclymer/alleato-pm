# Drawings Feature - Implementation Tasks

**Status**: ⚪ Not Started | **Last Updated**: 2026-02-02
**PRP Document**: [prp-drawings.md](./prp-drawings.md)

## Progress Summary

| Metric | Count |
|--------|-------|
| Total Tasks | 34 |
| Completed | 0 (0%) |
| In Progress | 0 |
| Remaining | 34 |

---

## PHASE 1: DATA LAYER (Database Foundation)

### Task 1: APPLY Database Migration
**Status**: ⬜ NOT STARTED
**File**: `supabase/migrations/20260131142854_add_drawings_system.sql`
**Dependencies**: None
**Complexity**: ⭐⭐ Medium
**BLOCKER**: All other tasks depend on this

**Implementation**:
- Apply migration via Supabase MCP (`mcp__supabase__apply_migration` or `mcp__supabase__execute_sql`)
- Migration creates 7 tables, 2 views, RLS policies, triggers
- If MCP fails, use Node.js pg library (same approach as specifications)

**Definition of Done**:
- [ ] Migration applied successfully
- [ ] All 7 tables created (drawing_areas, drawing_sets, drawings, drawing_revisions, drawing_sketches, drawing_downloads, drawing_related_items)
- [ ] Both views created (drawing_log, drawing_areas_with_counts)
- [ ] RLS policies active on all tables
- [ ] Triggers working (updated_at, ensure_single_current_revision)

---

### Task 2: GENERATE and VERIFY Database Types
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/types/database.types.ts`
**Dependencies**: Task 1
**Complexity**: ⭐ Low

**Implementation**:
- Run `npm run db:types` from frontend directory
- Verify drawings tables appear in generated types
- Confirm FK types: project_id is number, entity IDs are string (UUID)

**Definition of Done**:
- [ ] Types generated successfully (file size should increase)
- [ ] `grep -c "drawing" database.types.ts` returns 50+ matches
- [ ] Confirmed `drawings.project_id` type is `number`
- [ ] Confirmed all 7 tables + 2 views present
- [ ] drawing_log view columns match expected shape

---

### Task 3: UPDATE Domain Types
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/types/drawings.types.ts`
**Dependencies**: Task 2
**Complexity**: ⭐⭐ Medium

**Implementation**:
- Remove "Temporary type definitions" (lines 11-12 and manual interfaces)
- Import and extend generated Supabase types from database.types.ts
- Keep existing Zod schemas (drawingAreaSchema, drawingUploadSchema, etc.)
- Keep constants (DRAWING_DISCIPLINES, DRAWING_TYPES)
- Add DrawingLogEntry type matching drawing_log view columns

**Definition of Done**:
- [ ] Temporary manual types removed
- [ ] Types extend generated Supabase types
- [ ] DrawingLogEntry type created
- [ ] Zod schemas and constants preserved
- [ ] No TypeScript errors: `npx tsc --noEmit`

---

## PHASE 2: SERVICE LAYER (Business Logic)

### Task 4: CREATE DrawingService
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/services/DrawingService.ts`
**Dependencies**: Task 3
**Complexity**: ⭐⭐⭐ High

**Implementation**:
- Follow SpecificationService pattern (Result wrapper, static methods)
- Use `createClient()` from `@/lib/supabase/server`
- Methods: list (from drawing_log view), getById, create, update, delete
- List method supports filters: search, area_id, discipline, status, set
- Pagination support with offset/limit

**Definition of Done**:
- [ ] Service class created with all CRUD methods
- [ ] Returns Result<T> wrapper pattern
- [ ] Uses server-side Supabase client
- [ ] TypeScript compilation passes
- [ ] Test query via node -e succeeds

---

### Task 5: CREATE DrawingRevisionService (or add to DrawingService)
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/services/DrawingService.ts` (same file, additional methods)
**Dependencies**: Task 4
**Complexity**: ⭐⭐⭐ High

**Implementation**:
- Methods: listRevisions, createRevision, downloadRevision (signed URL)
- createRevision uploads file to Storage, then creates revision record
- is_current_revision = true triggers DB trigger to unset others
- File storage path: `drawings/{projectId}/{drawingId}/{filename}`
- recordDownload method for audit trail

**Definition of Done**:
- [ ] Revision methods added to DrawingService
- [ ] File upload to Supabase Storage works
- [ ] is_current_revision trigger verified
- [ ] Signed URL generation works for downloads
- [ ] Download audit recording works

---

### Task 6: CREATE DrawingAreaService
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/services/DrawingAreaService.ts`
**Dependencies**: Task 3
**Complexity**: ⭐⭐ Medium

**Implementation**:
- Follow SpecificationAreaService pattern
- Methods: list (from drawing_areas_with_counts view), create, update, delete, reorder
- Hierarchical support via parent_area_id
- sort_order management for drag-and-drop

**Definition of Done**:
- [ ] Service class created
- [ ] CRUD methods work with real data
- [ ] Hierarchical queries return correct depth/path
- [ ] Drawing counts accurate via view
- [ ] Reorder updates sort_order correctly

---

### Task 7: CREATE DrawingSetService
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/services/DrawingSetService.ts`
**Dependencies**: Task 3
**Complexity**: ⭐ Low

**Implementation**:
- Methods: list, create, update, archive
- Simple CRUD, no complex logic

**Definition of Done**:
- [ ] Service class created
- [ ] All CRUD methods work
- [ ] Archive sets status to 'archived'

---

## PHASE 3: API LAYER (HTTP Routes)

### Task 8: UPDATE Main Drawings API Route
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/app/api/projects/[projectId]/drawings/route.ts`
**Dependencies**: Task 4
**Complexity**: ⭐⭐ Medium

**Implementation**:
- Replace direct Supabase calls with DrawingService calls
- GET: DrawingService.list() with query param filters
- POST: DrawingService.create() with request body
- Async params pattern: `const { projectId } = await context.params`

**Definition of Done**:
- [ ] GET returns drawings from drawing_log view
- [ ] POST creates drawing record
- [ ] Filters work via query params
- [ ] Error handling with proper HTTP status codes
- [ ] Tested with curl

---

### Task 9: UPDATE Revisions API Route
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/route.ts`
**Dependencies**: Task 5
**Complexity**: ⭐⭐ Medium

**Implementation**:
- Wire to DrawingService revision methods
- POST handles multipart form data for file upload

**Definition of Done**:
- [ ] GET returns revisions for a drawing
- [ ] POST creates revision with file upload
- [ ] current_revision_id updated via trigger

---

### Task 10: UPDATE Download API Route
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]/download/route.ts`
**Dependencies**: Task 5
**Complexity**: ⭐ Low

**Implementation**:
- Generate signed URL via DrawingService
- Record download in drawing_downloads table

**Definition of Done**:
- [ ] Signed URL generated with 1-hour expiry
- [ ] Download recorded in audit table
- [ ] Returns JSON with url field

---

### Task 11: UPDATE Drawing Areas API Routes
**Status**: ⬜ NOT STARTED
**Files**:
- `frontend/src/app/api/projects/[projectId]/drawing-areas/route.ts`
- `frontend/src/app/api/projects/[projectId]/drawing-areas/[areaId]/route.ts`
**Dependencies**: Task 6
**Complexity**: ⭐ Low

**Definition of Done**:
- [ ] GET/POST on collection route work
- [ ] GET/PUT/DELETE on single resource work
- [ ] Uses DrawingAreaService

---

### Task 12: CREATE Drawing Sets API Route
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/app/api/projects/[projectId]/drawing-sets/route.ts`
**Dependencies**: Task 7
**Complexity**: ⭐ Low

**Definition of Done**:
- [ ] GET/POST on collection route
- [ ] Uses DrawingSetService

---

### Task 13: CREATE Sketches API Route
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/sketches/route.ts`
**Dependencies**: Task 4
**Complexity**: ⭐ Low

**Definition of Done**:
- [ ] GET lists sketches for a drawing
- [ ] POST creates sketch with file upload

---

### Task 14: CREATE Related Items API Route
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/related-items/route.ts`
**Dependencies**: Task 4
**Complexity**: ⭐ Low

**Definition of Done**:
- [ ] GET lists related items
- [ ] POST links a related item
- [ ] DELETE unlinks a related item

---

## PHASE 4: HOOK LAYER (React Query Integration)

### Task 15: CREATE Main Drawing Hooks (use-drawings.ts)
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/hooks/use-drawings.ts`
**Dependencies**: Task 8
**Complexity**: ⭐⭐ Medium

**Implementation**:
- useDrawings: list with filters, pagination
- useDrawing: single drawing by ID
- useCreateDrawing: mutation
- useUpdateDrawing: mutation
- useDeleteDrawing: mutation
- Query keys: ['drawings', projectId, filters]

**Definition of Done**:
- [ ] All hooks created
- [ ] Query keys hierarchical
- [ ] Cache invalidation on mutations
- [ ] Loading/error states handled

---

### Task 16: CREATE Revision Hooks (use-drawing-revisions.ts)
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/hooks/use-drawing-revisions.ts`
**Dependencies**: Task 9
**Complexity**: ⭐⭐ Medium

**Implementation**:
- useDrawingRevisions: list revisions for a drawing
- useCreateRevision: mutation with file upload
- useDownloadRevision: mutation returning signed URL

**Definition of Done**:
- [ ] Hooks created
- [ ] File upload progress tracking
- [ ] Download URL handling

---

### Task 17: UPDATE Upload Hook (use-drawing-upload.ts)
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/hooks/use-drawing-upload.ts`
**Dependencies**: Task 15, Task 16
**Complexity**: ⭐⭐ Medium

**Implementation**:
- Wire to API routes (not direct Supabase)
- Flow: create drawing -> upload file to Storage -> create revision
- Multi-file upload support with progress tracking
- Error handling and rollback

**Definition of Done**:
- [ ] Upload creates real database records
- [ ] File uploaded to Supabase Storage
- [ ] Progress tracking works
- [ ] Error handling with toast notifications

---

### Task 18: UPDATE Areas Hook (use-drawing-areas.ts)
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/hooks/use-drawing-areas.ts`
**Dependencies**: Task 11
**Complexity**: ⭐⭐ Medium

**Implementation**:
- Wire to API routes
- Hierarchical data support
- Reorder functionality

**Definition of Done**:
- [ ] CRUD operations work via API
- [ ] Hierarchy renders correctly
- [ ] Drawing counts displayed

---

### Task 19: CREATE Set Hooks (use-drawing-sets.ts)
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/hooks/use-drawing-sets.ts`
**Dependencies**: Task 12
**Complexity**: ⭐ Low

**Definition of Done**:
- [ ] List/create/update/archive hooks
- [ ] Used in upload dialog set selector

---

## PHASE 5: UI COMPONENTS (User Interface)

### Task 20: DELETE Duplicate Upload Dialog
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/components/drawings/upload-drawing-dialog.tsx` (DELETE)
**Dependencies**: None
**Complexity**: ⭐ Low

**Implementation**:
- Review upload-drawing-dialog.tsx for any unique functionality
- Merge any missing features into DrawingUploadDialog.tsx
- Delete upload-drawing-dialog.tsx
- Update any imports referencing deleted file

**Definition of Done**:
- [ ] Unique functionality merged (if any)
- [ ] File deleted
- [ ] No broken imports
- [ ] TypeScript compiles

---

### Task 21: WIRE DrawingUploadDialog to Real Hooks
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/components/drawings/DrawingUploadDialog.tsx`
**Dependencies**: Task 17, Task 20
**Complexity**: ⭐⭐⭐ High

**Implementation**:
- Connect form submission to useCreateDrawing + useCreateRevision
- Wire file upload to useDrawingUpload hook
- Area selector from useDrawingAreas
- Set selector from useDrawingSets
- Toast notifications on success/error
- Dialog close and form reset on success

**Definition of Done**:
- [ ] Form submission creates real records
- [ ] File upload to Storage works
- [ ] Area and set selectors populated
- [ ] Toast notifications appear
- [ ] Dialog resets on success

---

### Task 22: VERIFY DrawingLogTable Types
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/components/drawings/DrawingLogTable.tsx`
**Dependencies**: Task 3
**Complexity**: ⭐⭐ Medium

**Implementation**:
- Verify DrawingLogEntry type matches drawing_log view output
- Update GenericDataTable configuration if types changed
- Ensure filter options match real data (disciplines, statuses, areas)

**Definition of Done**:
- [ ] Types aligned with drawing_log view
- [ ] All 15 columns render correctly
- [ ] Filters use real data values
- [ ] Bulk actions wired to mutations

---

## PHASE 6: PAGE LAYER (Next.js Pages)

### Task 23: REWRITE Main Drawings Page (LARGEST TASK)
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/app/(main)/[projectId]/drawings/page.tsx`
**Dependencies**: Task 15, Task 16, Task 21, Task 22
**Complexity**: ⭐⭐⭐⭐ Very High

**Implementation**:
- REMOVE all hardcoded mock data (~800 lines)
- INTEGRATE useDrawings hook for table data
- INTEGRATE DrawingLogTable component for main table
- WIRE upload button onClick to open DrawingUploadDialog
- WIRE detail panel to real revision, sketch, download data
- FIX board link: `/${projectId}/drawings/board` (not `/projects/${projectId}/...`)
- KEEP: Layout structure, ProjectPageHeader + PageContainer, detail panel tabs, viewer dialog
- All 6 detail tabs: General, Sketches, Download Log, Related Items, Emails, Change History

**Definition of Done**:
- [ ] Zero hardcoded mock data
- [ ] Upload button opens dialog and creates real records
- [ ] Drawing log table shows real data
- [ ] Detail panel shows real revision history
- [ ] Sketches tab shows real sketches
- [ ] Download log shows real downloads
- [ ] Board link path corrected
- [ ] Search and filters work
- [ ] PDF viewer opens for selected drawing

---

### Task 24: UPDATE Areas Page
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/app/(main)/[projectId]/drawings/areas/page.tsx`
**Dependencies**: Task 18
**Complexity**: ⭐⭐ Medium

**Implementation**:
- Wire to useDrawingAreas hook
- Add/edit/delete area functionality
- Show drawing counts from view

**Definition of Done**:
- [ ] Areas loaded from database
- [ ] Add area creates real record
- [ ] Edit area updates record
- [ ] Delete area removes record
- [ ] Drawing counts accurate

---

### Task 25: UPDATE Board Page
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/app/(main)/[projectId]/drawings/board/page.tsx`
**Dependencies**: Task 15
**Complexity**: ⭐⭐ Medium

**Definition of Done**:
- [ ] Real data displayed in card/grid view
- [ ] Clicking card opens viewer or detail

---

### Task 26: UPDATE Table View Page
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/app/(tables)/drawings/page.tsx`
**Dependencies**: Task 15
**Complexity**: ⭐⭐ Medium

**Implementation**:
- Remove mock data (3 hardcoded drawings)
- Wire to useDrawings hook

**Definition of Done**:
- [ ] Real data in table
- [ ] No mock data remains

---

### Task 27: VERIFY Viewer Page
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/app/(main)/[projectId]/drawings/viewer/[drawingId]/page.tsx`
**Dependencies**: Task 16
**Complexity**: ⭐⭐ Medium

**Implementation**:
- Verify viewer loads real PDF from signed URL
- Wire revision selector to real revisions
- Ensure DrawingViewer.tsx works with real file URLs

**Definition of Done**:
- [ ] PDF loads from Supabase Storage signed URL
- [ ] Revision selector shows real revisions
- [ ] Zoom, pan, rotate work
- [ ] Keyboard shortcuts work

---

### Task 28: UPDATE Revisions Page
**Status**: ⬜ NOT STARTED
**File**: `frontend/src/app/(main)/[projectId]/drawings/revisions/page.tsx`
**Dependencies**: Task 16
**Complexity**: ⭐⭐ Medium

**Definition of Done**:
- [ ] All revisions listed from database
- [ ] Filters work (drawing, set, date range)

---

## PHASE 7: TESTING & VALIDATION

### Task 29: CREATE E2E Upload Test
**Status**: ⬜ NOT STARTED
**File**: `frontend/tests/e2e/drawings.spec.ts`
**Dependencies**: Task 23
**Complexity**: ⭐⭐⭐ High

**Implementation**:
- Navigate to drawings page
- Click Upload button
- Fill form (drawing number, title, file, discipline)
- Submit and verify new drawing appears in table
- Verify toast notification
- Reload and verify persistence

**Definition of Done**:
- [ ] Upload workflow passes
- [ ] New drawing visible in table
- [ ] File accessible via viewer

---

### Task 30: CREATE E2E Revision Test
**Status**: ⬜ NOT STARTED
**File**: `frontend/tests/e2e/drawings.spec.ts`
**Dependencies**: Task 29
**Complexity**: ⭐⭐⭐ High

**Implementation**:
- Open existing drawing detail panel
- Upload new revision
- Verify revision number incremented
- Verify previous revision marked superseded
- Verify current revision pointer updated

**Definition of Done**:
- [ ] Revision workflow passes
- [ ] Version history accurate

---

### Task 31: CREATE E2E Area Management Test
**Status**: ⬜ NOT STARTED
**File**: `frontend/tests/e2e/drawings.spec.ts`
**Dependencies**: Task 24
**Complexity**: ⭐⭐ Medium

**Implementation**:
- Navigate to areas page
- Create new area
- Verify area appears
- Edit area name
- Delete area
- Verify cleanup

**Definition of Done**:
- [ ] CRUD workflow passes
- [ ] Drawing counts update

---

### Task 32: CREATE E2E Filter/Search Test
**Status**: ⬜ NOT STARTED
**File**: `frontend/tests/e2e/drawings.spec.ts`
**Dependencies**: Task 29
**Complexity**: ⭐⭐ Medium

**Implementation**:
- Search by drawing number
- Filter by discipline
- Filter by status
- Clear filters
- Verify results match filters

**Definition of Done**:
- [ ] Search narrows results
- [ ] Filters work independently and combined
- [ ] Clear resets to full list

---

### Task 33: CLEANUP Test Data
**Status**: ⬜ NOT STARTED
**File**: `frontend/tests/e2e/drawings.spec.ts`
**Dependencies**: Tasks 29-32
**Complexity**: ⭐ Low

**Implementation**:
- afterAll hook deletes all test drawings, areas, revisions
- Uses Supabase admin client for cleanup
- Delete in reverse dependency order

**Definition of Done**:
- [ ] All test data cleaned up
- [ ] No orphaned records

---

### Task 34: FINAL VALIDATION
**Status**: ⬜ NOT STARTED
**Dependencies**: All previous tasks
**Complexity**: ⭐⭐ Medium

**Implementation**:
- Run full validation loop from PRP
- TypeScript: `npx tsc --noEmit`
- Lint: `npm run lint`
- Build: `npm run build`
- E2E: `npx playwright test tests/e2e/drawings.spec.ts`
- Manual verification of all pages

**Definition of Done**:
- [ ] TypeScript: 0 errors
- [ ] Lint: 0 errors
- [ ] Build: success
- [ ] E2E: all tests pass
- [ ] Manual: all pages functional
- [ ] No mock data anywhere in drawings feature

---

## Session Log

### 2026-02-02
- Started: PRP creation and research
- Completed: Full verification of drawings feature (10 issues identified)
- Created: prp-drawings.md with comprehensive implementation plan
- Created: TASKS.md with 34 implementation tasks
- Next: Begin Phase 1 (apply migration)

---

## Quick Reference

**PRP Document**: `PRPs/drawings/prp-drawings.md`
**Crawl Data**: `PRPs/pm-tools/drawings/crawl-drawings/`
**Migration**: `supabase/migrations/20260131142854_add_drawings_system.sql`
**Spec Artifacts**: `PRPs/pm-tools/drawings/crawl-drawings/spec/`

### Key Commands

```bash
# Apply migration (via Supabase MCP or CLI)
# mcp__supabase__apply_migration or mcp__supabase__execute_sql

# Generate types
cd /Users/meganharrison/Documents/github/alleato-procore/frontend
npm run db:types

# Validate types
npx tsc --noEmit

# Run linting
npm run lint

# Run E2E tests
npx playwright test tests/e2e/drawings.spec.ts

# Build production
npm run build

# Start dev server (after clearing cache)
rm -rf .next && npm run dev
```

### Critical Reminders

1. **project_id is INTEGER** (not UUID) - matches projects.id
2. **Clear .next cache** before testing new/modified routes
3. **Use [projectId]** never [id] in route params
4. **Await params** in API routes: `const { projectId } = await context.params`
5. **Storage RLS** - ensure policies applied before upload testing
6. **Delete upload-drawing-dialog.tsx** - consolidate into DrawingUploadDialog.tsx

---

## How to Update This File

When completing a task:
1. Change `- [ ]` to `- [x]`
2. Update the Progress Summary counts
3. Add an entry to Session Log
4. Update the Status badge if changing phases

**Status Badges**:
- ⚪ Not Started
- 🟡 In Progress
- 🟢 Complete
- 🔴 Blocked
