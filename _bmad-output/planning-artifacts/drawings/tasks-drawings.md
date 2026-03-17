---
title: Tasks - Drawings
description: Task management and tracking within projects.
keywords: ["tasks", "management", "tracking", "projects"]
---

## Phase 1: Data Layer (Database & Types)

### Database Setup

- [x] **Task 1**: Create database migration for drawing tables
  - Create migration file: `supabase/migrations/20240xxx_add_drawings.sql`
  - Tables: drawing_areas, drawing_sets, drawings, drawing_revisions, drawing_sketches, drawing_downloads, drawing_related_items
  - Add proper indexes and foreign key relationships
  - Run migration and verify tables created

- [x] **Task 2**: Create TypeScript types and schemas
  - Create file: `frontend/src/types/drawings.types.ts`
  - Define interfaces: DrawingArea, Drawing, DrawingRevision, DrawingSet, DrawingSketch
  - Create Zod schemas for validation
  - Export all types and schemas

## Phase 2: Hooks Layer

### Data Operations

- [x] **Task 3**: Create drawing areas hook
  - Create file: `frontend/src/hooks/use-drawing-areas.ts`
  - Implement: useDrawingAreas, useCreateArea, useUpdateArea, useDeleteArea
  - Handle hierarchical data structure
  - Add proper error handling and loading states

- [x] **Task 5**: Create drawing upload hook
  - Create file: `frontend/src/hooks/use-drawing-upload.ts`
  - Implement multi-file upload with progress tracking
  - Integrate with Supabase storage
  - Handle chunked uploads for large files

## Phase 3: API Layer

### API Endpoints

- [x] **Task 7**: Create drawing areas API routes
  - Create file: `frontend/src/app/api/projects/[projectId]/drawing-areas/route.ts`
  - Implement GET (with hierarchy) and POST handlers
  - Create file: `frontend/src/app/api/projects/[projectId]/drawing-areas/[areaId]/route.ts`
  - Implement GET, PUT, DELETE handlers

- [x] **Task 8**: Create drawings API routes
  - Create file: `frontend/src/app/api/projects/[projectId]/drawings/route.ts`
  - Implement GET with filters and POST for new drawings
  - Add pagination support

- [x] **Task 9**: Create revisions API routes
  - Create file: `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/route.ts`
  - Implement revision creation and retrieval
  - Handle file storage integration
  - Create download and QR code endpoints

## Phase 4: Component Layer

### Core Components

- [x] **Task 4**: Create drawing area selector component
  - Create file: `frontend/src/components/drawings/DrawingAreaSelector.tsx`
  - Implement hierarchical tree view with expand/collapse
  - Add create/edit/delete area functionality
  - Include drag-drop reordering support

- [x] **Task 6**: Create drawing upload dialog
  - Create file: `frontend/src/components/drawings/DrawingUploadDialog.tsx`
  - Implement drag-drop zone with file preview
  - Add metadata form with validation
  - Show upload progress indicator

- [x] **Task 10**: Create drawing log table
  - Create file: `frontend/src/components/drawings/DrawingLogTable.tsx`
  - Configure GenericDataTable with columns
  - Add filters, search, and bulk operations
  - Implement export functionality

- [x] **Task 11**: Create PDF viewer component
  - Create file: `frontend/src/components/drawings/DrawingViewer.tsx`
  - Implement react-pdf integration
  - Add zoom, navigation, and thumbnail controls
  - Ensure mobile responsiveness

## Phase 5: Pages Layer

### User Interface Pages

- [x] **Task 12**: Create drawing areas management page
  - Create file: `frontend/src/app/(main)/[projectId]/drawings/areas/page.tsx`
  - Client component with data fetching via hooks
  - Integrate DrawingAreaSelector component
  - Add breadcrumb navigation and stats cards

- [x] **Task 13**: Create drawing revisions log page
  - Create file: `frontend/src/app/(main)/[projectId]/drawings/revisions/page.tsx`
  - Client component with TableLayout wrapper
  - Integrate DrawingLogTable component
  - Add toolbar with actions and stats

- [x] **Task 14**: Create PDF viewer page
  - Create file: `frontend/src/app/(main)/[projectId]/drawings/viewer/[drawingId]/page.tsx`
  - Dynamic import for DrawingViewer component
  - Full-screen layout with responsive header
  - Keyboard navigation support (Escape, Ctrl+D)

## Phase 6: Testing & Validation

### Quality Assurance

- [x] **Task 15**: Create comprehensive tests
  - Unit tests for all hooks (use-drawing-areas, use-drawing-upload)
  - Component tests with React Testing Library (DrawingAreaSelector, DrawingUploadDialog, DrawingLogTable)
  - API route tests for drawings endpoints
  - E2E tests with Playwright for complete workflows
  - Performance testing for large files

---

## Phase 7: Bug Fixes 🔴 P0

> These are broken or referencing non-existent routes. Fix before anything else.

- [ ] **Task 16**: Fix standalone tables page hardcoded project ID
  - File: `frontend/src/app/(tables)/drawings/page.tsx`
  - Currently hardcoded to project `31` — replace with dynamic project context from URL/auth
  - Verify table renders correctly after fix

- [ ] **Task 17**: Verify and complete drawing download API route
  - Route: `api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]/download`
  - Referenced in DrawingViewer but may be incomplete
  - Implement signed URL generation from Supabase storage with expiry
  - Log download in `drawing_downloads` table on each access

- [ ] **Task 18**: Build Edit Drawing metadata page
  - Route: `/[projectId]/drawings/[drawingId]/edit`
  - Row actions in DrawingLogTable reference this route but it doesn't exist
  - Form fields: Drawing Number, Title, Discipline, Type, Revision, Drawing Date, Received Date, Area, Set, Description
  - On save: update drawing record and invalidate list query

- [ ] **Task 19**: Build New Revision page
  - Route: `/[projectId]/drawings/[drawingId]/new-revision`
  - Referenced in table actions but no page exists
  - Upload form for new revision file with revision number, drawing date, received date, description
  - On submit: create `drawing_revisions` record, upload file to storage, supersede previous current revision

---

## Phase 8: Drawing Sets UI 🟠 P1

- [ ] **Task 20**: Create Drawing Sets list page
  - Route: `/[projectId]/drawings/sets`
  - List all drawing sets with name, drawing count, created date
  - Create/edit/delete set actions
  - Service `DrawingSetService` and hooks `useDrawingSets`/`useCreateDrawingSet` already exist

- [ ] **Task 21**: Create Drawing Set detail page
  - Route: `/[projectId]/drawings/sets/[setId]`
  - Show all drawings assigned to this set
  - Allow drag-to-reorder drawings within the set (call `DrawingAreaService.reorder`)
  - Add/remove drawings from set

- [ ] **Task 22**: Verify set assignment works in DrawingUploadDialog
  - `DrawingUploadDialog` has a set dropdown field — confirm it saves `drawing_set_id` correctly
  - Allow reassigning existing drawings to a different set from DrawingLogTable row actions

---

## Phase 9: Bulk Operations & Export 🟠 P1

- [ ] **Task 23**: Bulk edit drawings
  - DrawingLogTable already has row selection — add bulk edit panel/drawer
  - Fields editable in bulk: Discipline, Area, Status, Set
  - Confirm dialog showing count before applying

- [ ] **Task 24**: Bulk delete drawings
  - Select multiple rows → "Delete Selected" action in toolbar
  - Confirm dialog with drawing count and warning about revision files
  - Delete drawing records and associated Supabase storage files

- [ ] **Task 25**: Export drawing log
  - Add Export button to DrawingLogTable toolbar (CSV and PDF options)
  - Export respects active filters (export what you see)
  - CSV: all visible columns; PDF: formatted report with project header

- [ ] **Task 26**: Bulk upload page
  - Route: `/[projectId]/drawings/upload`
  - Referenced in revisions page header actions but not implemented
  - Large drag-drop zone accepting multiple PDFs
  - Processing queue showing OCR/parsing status per file
  - Batch metadata editing before confirming upload

---

## Phase 10: Drawing Detail Tabbed Page 🟠 P1

- [ ] **Task 27**: Create Drawing detail page with tab navigation
  - Route: `/[projectId]/drawings/[drawingId]`
  - Tabs: **General** | **Revisions** | **Sketches** | **Download Log** | **Related Items** | **Emails** | **Change History**
  - General tab: all drawing metadata, current revision info, file preview thumbnail
  - Breadcrumb: Drawings → Drawing Number/Title

- [ ] **Task 28**: Revisions tab
  - Within `/[projectId]/drawings/[drawingId]` — Revisions tab
  - Timeline list of all revisions: revision number, drawing date, uploaded by, file size, status badge
  - Download button per revision
  - "Set as Current" action for non-current revisions
  - Link to open specific revision in viewer

- [ ] **Task 29**: Download Log tab
  - Within drawing detail — Download Log tab
  - Table from `drawing_downloads`: who downloaded, when, which revision, IP/device (if available)
  - Sortable by date, user, revision

- [ ] **Task 30**: Change History / Audit tab
  - Within drawing detail — Change History tab
  - Chronological log of all metadata changes: field changed, old value, new value, changed by, timestamp
  - Requires audit trigger or explicit change logging on drawing updates

---

## Phase 11: Drawing Metadata Actions 🟠 P1

- [ ] **Task 31**: Mark Drawing Obsolete
  - Add "Mark Obsolete" to row actions in DrawingLogTable and drawing detail page
  - Sets `is_obsolete = true` flag on drawing record
  - Obsolete drawings shown grayed out in table with "Obsolete" badge
  - Confirm dialog before marking
  - Reverse action: "Restore" to un-obsolete

- [ ] **Task 32**: Move Drawings Between Areas
  - Add "Move to Area" action in DrawingLogTable row actions
  - Opens area selector (DrawingAreaSelector component) to pick target area
  - Updates `drawing_area_id` and invalidates list query
  - Support bulk move (select multiple → move all to area)

- [ ] **Task 33**: Reorder Drawings Within a Set
  - In Drawing Set detail page (Task 21) — drag-to-reorder rows
  - Persist order via `display_order` field or junction table
  - Use `DrawingAreaService.reorder` as pattern reference

- [ ] **Task 34**: Reorder Revisions
  - In Revisions tab (Task 28) — allow manual reorder when auto-order is wrong
  - Drag handles on revision rows
  - Warning: reordering changes which revision is "current"

---

## Phase 12: Markup & Sketches 🟡 P2

- [ ] **Task 35**: Add markup/sketch toolbar to DrawingViewer
  - Overlay canvas on PDF using Fabric.js or Konva.js (`use client` required)
  - Tools: freehand pen, highlighter, cloud shape, box, ellipse, arrow, line, text box
  - Color picker and stroke thickness controls per tool
  - Undo/redo stack
  - Save sketch to `drawing_sketches` table tied to `drawing_revision_id`

- [ ] **Task 36**: Markup layers — Personal and Published
  - Personal layer: visible only to the user who created it (default for new markups)
  - "Publish" action: makes markup visible to all project members with drawing access
  - Layer toggle in viewer toolbar: show/hide personal, published layers independently
  - Update `drawing_sketches` with `is_published` and `published_at` fields

- [ ] **Task 37**: Edit and delete markup annotations
  - Click existing markup in viewer to select it
  - Edit panel: change color, stroke, text content
  - Delete selected markup with confirmation
  - Only markup creator (or admin) can edit/delete

- [ ] **Task 38**: Markup activity feed
  - Panel in DrawingViewer (collapsible side panel) listing all annotation activity
  - Each entry: user avatar, action ("added text annotation", "published markup"), timestamp
  - Click entry to pan viewer to that markup location

- [ ] **Task 39**: Sketch reports
  - Generate PDF export of drawing with all published markups overlaid
  - Include markup legend: author, date, type for each annotation
  - Accessible from drawing detail page and viewer download menu

---

## Phase 13: Measurement Tools 🟡 P2

- [ ] **Task 40**: Measurement tools in DrawingViewer
  - Calibration tool: set scale by clicking two points and entering known distance
  - Distance measurement: click-click line with computed length label
  - Area measurement: click polygon points, compute enclosed area
  - Freehand measurement: draw path, compute total length
  - Measurements stored in `drawing_sketches` with type `measurement`

- [ ] **Task 41**: Measurement reports
  - Export all measurements for a drawing/revision as formatted PDF
  - Table: measurement type, label, computed value, unit, created by, date
  - Accessible from drawing detail and viewer

---

## Phase 14: Related Items & Linking 🟡 P2

- [ ] **Task 42**: Related Items tab in drawing detail
  - In drawing detail page (Task 27) — Related Items tab
  - Display records from `drawing_related_items` grouped by type (RFI, Submittal, Change Order, Observation)
  - "Add Link" button opens search-and-select dialog for each type
  - Remove link action per item

- [ ] **Task 43**: Link drawing to RFI
  - From DrawingLogTable row actions and drawing detail: "Link to RFI"
  - Search RFIs by number/title, select one, saves to `drawing_related_items`
  - Also support: open an RFI and link a drawing from there (bidirectional)

- [ ] **Task 44**: Link drawing to Coordination Issue
  - Same pattern as Task 43 — "Link to Coordination Issue"
  - Search coordination issues, select, save to `drawing_related_items`

- [ ] **Task 45**: Pin-based markups
  - In DrawingViewer markup toolbar — "Pin" tool
  - Drop a pin on drawing → select pin type: Photo, Punch List Item, Observation, Coordination Issue
  - Pin links to existing record (search/select) or creates a new one
  - Pins rendered as colored icons on drawing overlay
  - Tap pin to view linked item details

---

## Phase 15: QR Codes & Sharing 🟡 P2

- [ ] **Task 46**: QR code generation per drawing
  - DrawingLogTable row actions show "QR Code" as "coming soon" — implement it
  - Generate QR encoding the drawing viewer URL for the current revision
  - Display in modal with project name, drawing number, title
  - Download as PNG button in modal

- [ ] **Task 47**: Bulk QR code generation
  - Select multiple drawings → "Generate QR Codes" bulk action
  - Generate one QR per drawing, download as ZIP of PNGs
  - Optional: generate single PDF with all QR codes (for printing)

- [ ] **Task 48**: Email drawings
  - "Emails" tab in drawing detail page (Task 27)
  - Compose email to project contacts with drawing PDF attachment (current revision)
  - Log sent emails in an `drawing_emails` table or `drawing_related_items`
  - Show email history: recipient, sent by, date, revision attached

- [ ] **Task 49**: Share link generation
  - In DrawingViewer toolbar — "Share" button
  - Generate shareable URL to specific drawing + revision
  - Optional expiry date
  - Copy to clipboard with one click

---

## Phase 16: OCR & Intelligent Parsing 🔵 P3

- [ ] **Task 50**: OCR auto-detection on upload
  - On PDF upload, extract drawing number, title, discipline, revision from PDF content (not just filename)
  - Use a server-side OCR service (e.g., Tesseract via Python backend or cloud OCR API)
  - Auto-populate form fields in DrawingUploadDialog with extracted values
  - User can override extracted values before confirming upload

- [ ] **Task 51**: Automatic drawing sheet linking
  - Detect callout markers on drawings: detail bubbles, section cut lines, elevation markers
  - Parse reference numbers from markers via OCR
  - Automatically create hyperlinks in viewer: click a callout → navigate to referenced sheet
  - Works on both vector and raster PDFs

- [ ] **Task 52**: OCR language configuration
  - Project-level setting: select OCR language (English, French, German, Spanish)
  - Stored in project settings table
  - Applied during all upload processing for that project

- [ ] **Task 53**: Filename parsing rules configuration
  - Admin settings for drawings: configure regex or position-based rules for extracting drawing number, revision, discipline from filenames
  - Preview panel: paste sample filename, see what gets extracted
  - Stored per project

---

## Phase 17: Admin & Settings 🔵 P3

- [ ] **Task 54**: Drawing Settings page
  - Route: `/[projectId]/drawings/settings` or within project admin settings
  - Configure: default revision format, filename parsing rules (Task 53), OCR language (Task 52), default discipline list
  - Requires project admin permission

- [ ] **Task 55**: Manage drawing disciplines
  - Within Drawing Settings — CRUD list of discipline categories for the project
  - Default set: Architectural, Structural, Civil, MEP, Electrical, Plumbing, Landscape, etc.
  - Custom disciplines can be added/renamed/removed
  - Referenced by drawing upload form and filter dropdowns

- [ ] **Task 56**: Revision location configuration
  - Within Drawing Settings — configure where revision identifier is extracted from filename
  - Options: decimal position, underscore position, prefix/suffix pattern
  - Live preview with sample filenames

---

## Phase 18: Revision Comparison 🔵 P3

- [ ] **Task 57**: Side-by-side revision comparison view
  - Route: `/[projectId]/drawings/[drawingId]/compare?from=[revId]&to=[revId]`
  - Two DrawingViewer panels side by side, synchronized scroll/zoom
  - Revision selector dropdowns above each panel
  - Accessible from Revisions tab (Task 28)

- [ ] **Task 58**: Revision comparison report
  - Generate PDF showing differences between two revisions
  - Overlay diff visualization or side-by-side pages
  - Include metadata diff table: fields changed between revisions

---

## Phase 19: Mobile & Performance 🔵 P3

- [ ] **Task 59**: Optimize DrawingViewer for mobile / field use
  - Touch gesture support: pinch-to-zoom, two-finger pan, swipe to next drawing in set
  - Larger tap targets for toolbar buttons on mobile
  - Responsive toolbar that collapses to icon-only on small screens
  - Test on iOS Safari and Android Chrome

- [ ] **Task 60**: Progressive PDF page loading
  - Currently loads entire PDF before rendering — switch to on-demand page loading
  - Preload 2 pages ahead of current page, lazy-load the rest
  - Show page count and loading progress indicator
  - Critical for large drawing sets (50+ pages)

---

## Session Log

### Session Started: [Timestamp]

- Agent: [Agent ID]
- Starting Phase: Data Layer

### Updates:
<!-- AI agents update this section as work progresses -->

**Session 2026-01-31 - Tasks 12-14 Completed**

- **Agent**: Claude Code
- **Completed**: Page layer implementation (Tasks 12-14)
- **Files Created**:
  - `/frontend/src/app/(main)/[projectId]/drawings/areas/page.tsx` - Drawing areas management page
  - `/frontend/src/app/(main)/[projectId]/drawings/revisions/page.tsx` - Drawing revisions log page
  - `/frontend/src/app/(main)/[projectId]/drawings/viewer/[drawingId]/page.tsx` - PDF viewer page
- **Key Features**:
  - Responsive layouts with mobile-first design
  - Breadcrumb navigation and stats cards
  - Integration with existing component library
  - Full-screen PDF viewer with keyboard shortcuts
  - Proper error handling and loading states

**Session 2026-01-31 - Task 15 Completed**

- **Agent**: Claude Code
- **Completed**: Comprehensive testing implementation (Task 15)
- **Files Created**:
  - `/frontend/src/hooks/__tests__/use-drawing-areas.test.ts` - Unit tests for drawing areas hook
  - `/frontend/src/hooks/__tests__/use-drawing-upload.test.ts` - Unit tests for drawing upload hook
  - `/frontend/src/components/drawings/__tests__/DrawingAreaSelector.test.tsx` - Component tests for area selector
  - `/frontend/src/components/drawings/__tests__/DrawingUploadDialog.test.tsx` - Component tests for upload dialog
  - `/frontend/src/components/drawings/__tests__/DrawingLogTable.test.tsx` - Component tests for drawing table
  - `/frontend/src/app/api/projects/[projectId]/drawings/__tests__/route.test.ts` - API route tests
  - `/frontend/tests/e2e/drawings-comprehensive.spec.ts` - Comprehensive E2E tests with Playwright
- **Test Coverage**:
  - Unit tests: Hooks with mocking and error scenarios
  - Component tests: User interactions, form validation, state management
  - API tests: Authentication, validation, error handling, database operations
  - E2E tests: Complete workflows, accessibility, performance, mobile responsiveness
  - Edge cases: Network failures, large files, concurrent operations

**Session 2026-03-16 - Audit & Task Expansion**

- **Agent**: Claude Code
- **Action**: Full audit against Procore documentation, planning artifacts, and live codebase
- **Result**: Expanded task list from 15 to 60 tasks across 19 phases
- **New Phases Added**: 7 (Bug Fixes) through 19 (Mobile & Performance)
- **Key Finding**: Core infrastructure is complete (~55% Procore parity). Gaps are in advanced features: markup/sketches, QR codes, related items linking, OCR, and admin settings.

---

## Notes for Implementation

### Priority Order

1. 🔴 **P0** — Phase 7 (Tasks 16-19): Fix broken routes and missing pages before shipping
2. 🟠 **P1** — Phases 8-11 (Tasks 20-34): Core Procore parity (sets UI, bulk ops, drawing detail tabs)
3. 🟡 **P2** — Phases 12-15 (Tasks 35-49): Markup, measurements, related items, QR codes
4. 🔵 **P3** — Phases 16-19 (Tasks 50-60): OCR, admin config, revision comparison, mobile

### Critical Dependencies

- Task 2 depends on Task 1 (types need database)
- Tasks 3-5 depend on Task 2 (hooks need types)
- Tasks 7-9 depend on Task 2 (APIs need types)
- Tasks 4, 6, 10, 11 depend on respective hooks
- Tasks 12-14 depend on components
- Task 27 (drawing detail page) should be built before Tasks 28-30, 42, 48 (all are tabs within it)
- Task 35 (markup toolbar) must be done before Tasks 36-39
- Task 40 (measurement tools) requires Task 35 (markup infrastructure) first
- Task 50 (OCR) requires backend infrastructure — coordinate with Python FastAPI backend

### Key Files to Reference

- Pattern: `frontend/src/components/tables/generic-table-factory.tsx`
- Pattern: `frontend/src/hooks/use-supabase-upload.ts`
- Pattern: `frontend/src/app/(main)/[projectId]/commitments/page.tsx`
- Pattern: `frontend/src/components/budget/budget-table.tsx`
- Existing drawings code: `frontend/src/components/drawings/`
- Existing drawings hooks: `frontend/src/hooks/use-drawing*.ts`
- Existing drawings services: `frontend/src/services/Drawing*.ts`

### Testing Commands

```bash
# After each phase
npm run lint
npm run typecheck
npm test

# Final validation
npm run build
npm run test:e2e drawings
```

---

*This document is actively updated by AI agents during implementation. Check the Session Log for latest progress.*
