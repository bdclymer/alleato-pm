# Drawings — Procore Feature Test Matrix

**Generated:** 2026-04-08

## Summary

| Category | # Tests | Priority |
|----------|---------|---------|
| Core Actions | 18 | HIGH |
| Views & Navigation | 12 | HIGH |
| Fields & Data | 14 | HIGH |
| Viewer | 11 | HIGH |
| Revisions | 8 | HIGH |
| Filters & Search | 8 | HIGH |
| Permissions | 3 | MEDIUM |
| Integrations | 8 | MEDIUM |
| Reporting & Export | 3 | MEDIUM |
| Advanced Features | 16 | MEDIUM |
| **TOTAL** | **101** | |

---

## 1. Core Actions

> Source: Drawings list page (`/[projectId]/drawings`), DrawingUploadDialog, API POST `/api/projects/[projectId]/drawings`

### 1.1 Upload (Create)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.1.1 | Upload a drawing with all required fields | 1. Navigate to `/767/drawings`<br>2. Click "Upload"<br>3. Fill Drawing Number: **A-101**, Title: **First Floor Plan**, Discipline: Architectural, Revision Number: 0, Received Date: today<br>4. Select a PDF file<br>5. Click Upload | Upload dialog closes; "A-101 — First Floor Plan" appears in the list with status badge and correct discipline | HIGH | 🔲 | |
| 1.1.2 | Upload fails when Drawing Number is missing | 1. Click "Upload"<br>2. Leave Drawing Number blank<br>3. Fill Title and select a file<br>4. Click Upload | Validation error shown near Drawing Number field; record NOT created; dialog stays open | HIGH | 🔲 | |
| 1.1.3 | Upload fails when Title is missing | Fill Drawing Number only; omit Title; click Upload | Validation error on Title field; record NOT created | HIGH | 🔲 | |
| 1.1.4 | Upload fails when Revision Number is missing | Fill all fields except Revision Number; click Upload | Validation error on Revision Number; record NOT created | HIGH | 🔲 | |
| 1.1.5 | Upload fails when Received Date is missing | Fill all fields except Received Date; click Upload | Validation error on Received Date; record NOT created | HIGH | 🔲 | |
| 1.1.6 | Upload fails when no file is selected | Fill all metadata fields; do NOT select a file; click Upload | Error: "File is required" (or similar); dialog stays open; no record created | HIGH | 🔲 | |
| 1.1.7 | Upload with all optional fields | Fill Number, Title, Discipline, Type, Area, Drawing Date, Description, Revision Number, Received Date, select file | Drawing created; all supplied fields visible on the detail page General tab | MEDIUM | 🔲 | |
| 1.1.8 | Duplicate drawing number rejected | Upload a drawing with number A-101; attempt to upload a second drawing with the same number A-101 | 409 conflict error shown; second drawing NOT created | HIGH | 🔲 | API returns 409 for DUPLICATE_DRAWING_NUMBER |
| 1.1.9 | Cancel upload discards data | Open Upload dialog, fill fields, click Cancel | Dialog closes; no new drawing appears in list | MEDIUM | 🔲 | |

### 1.2 Edit

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.2.1 | Edit drawing number and title | 1. Open drawing detail<br>2. Click "Edit" in General Information card<br>3. Change Number to **A-102** and Title to **Updated Plan**<br>4. Click Save | Updated number and title shown on detail page; no "Select..." placeholders | HIGH | 🔲 | |
| 1.2.2 | Edit discipline dropdown | 1. Click Edit on detail page<br>2. Open Discipline dropdown<br>3. Select **Structural**<br>4. Click Save | Discipline field shows "Structural" after save | HIGH | 🔲 | |
| 1.2.3 | Edit type dropdown | Click Edit; change Type to **Detail**; Save | Type field shows "Detail" after save and page refresh | HIGH | 🔲 | |
| 1.2.4 | Cancel edit discards changes | Click Edit; change Title; click Cancel | Original title shown; no data changed | HIGH | 🔲 | |
| 1.2.5 | Edit reopens with pre-filled values | Create a drawing with known values; navigate away; return and click Edit | All fields (Number, Title, Discipline, Type) pre-filled with saved values; no blank placeholders | HIGH | 🔲 | |

### 1.3 Delete

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 1.3.1 | Delete drawing from list row action | 1. Navigate to `/767/drawings`<br>2. Find a drawing row<br>3. Click row action menu → Delete<br>4. Confirm in dialog | Drawing disappears from list; success toast shown | HIGH | 🔲 | |
| 1.3.2 | Cancel delete leaves record intact | Row action menu → Delete → click Cancel in dialog | Record remains in list unchanged | HIGH | 🔲 | |
| 1.3.3 | Delete from detail page via action menu | Open drawing detail → three-dot menu → "Move to Recycle Bin" → Confirm | Redirected to drawings list; deleted drawing no longer appears in Current Drawings tab | HIGH | 🔲 | Currently shows "coming soon" toast |

---

## 2. Views & Navigation

> Source: Drawings list page, viewer page, detail page, sets page, recycle-bin page, areas page

### 2.1 List View & Tabs

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.1.1 | Current Drawings tab loads with correct columns | Navigate to `/767/drawings` | Table renders with columns: Drawing Number, Title, Discipline, Type, Status, Area, Received Date; no error messages | HIGH | 🔲 | |
| 2.1.2 | Drawing Sets tab loads | Click "Drawing Sets" tab | Navigates to `/767/drawings/sets`; sets table renders with columns: Name, Date, Published, Unpublished | HIGH | 🔲 | |
| 2.1.3 | Recycle Bin tab loads | Click "Recycle Bin" tab | Navigates to `/767/drawings/recycle-bin`; page loads; empty state or deleted drawings shown | HIGH | 🔲 | |
| 2.1.4 | Active tab is highlighted | On each tab page, inspect the tab navigation | The active tab (Current Drawings, Drawing Sets, Recycle Bin) is visually highlighted; others are not | MEDIUM | 🔲 | |
| 2.1.5 | Count badge on Current Drawings tab updates with filters | Apply a discipline filter | Tab count badge reflects the number of filtered drawings | MEDIUM | 🔲 | |

### 2.2 View Switcher (Table / Card / List)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.2.1 | Default view is Card | Navigate to `/767/drawings` | Drawings rendered as cards (grid layout); default view matches `view: "card"` config | MEDIUM | 🔲 | |
| 2.2.2 | Switch to Table view | Click Table view icon in toolbar | Drawings rendered in a sortable table with column headers | HIGH | 🔲 | |
| 2.2.3 | Switch to List view | Click List view icon | Drawings rendered as compact list rows | MEDIUM | 🔲 | |
| 2.2.4 | View preference persists via URL | Switch to Table view; copy URL; paste in new tab | Table view is loaded from the URL param | LOW | 🔲 | |

### 2.3 Detail Page Navigation

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 2.3.1 | Click a drawing row opens detail page | Click any drawing in table view | Navigates to `/767/drawings/[drawingId]`; detail page loads with drawing title and number in header | HIGH | 🔲 | |
| 2.3.2 | Back button returns to list | On detail page, click the back arrow | Navigates back to the Drawings list | MEDIUM | 🔲 | |
| 2.3.3 | "View" button from detail opens viewer | On detail page, click "View" button | Navigates to `/767/drawings/viewer/[drawingId]` | HIGH | 🔲 | |

---

## 3. Fields & Data

> Source: Upload dialog, edit form on detail page, `DRAWING_DISCIPLINES` and `DRAWING_TYPES` constants, API route validation

### 3.1 Upload Form Fields

| # | Field | Type | Required | Valid Values | Test: Accepts Valid | Test: Rejects Invalid | Priority | Result |
|---|-------|------|---------|-------------|---------------------|----------------------|---------|--------|
| 3.1.1 | Drawing Number | Text | Yes | Any alphanumeric string (e.g. A-101) | "A-101" accepted | Blank → validation error | HIGH | 🔲 |
| 3.1.2 | Title | Text | Yes | Free text | "First Floor Plan" accepted | Blank → validation error | HIGH | 🔲 |
| 3.1.3 | Discipline | Dropdown | No | Architectural, Structural, Mechanical, Electrical, Plumbing, Fire Protection, Civil, Landscape, Other | All 9 options selectable | — | HIGH | 🔲 |
| 3.1.4 | Drawing Type | Dropdown | No | Plan, Section, Detail, Elevation, Schedule, Specification, Other | All 7 options selectable | — | MEDIUM | 🔲 |
| 3.1.5 | Revision Number | Text | Yes | Alphanumeric (e.g. 0, 1, A, B) | "0", "A" accepted | Blank → validation error | HIGH | 🔲 |
| 3.1.6 | Received Date | Date | Yes | Valid date | Today's date accepted | Blank → validation error | HIGH | 🔲 |
| 3.1.7 | Drawing Date | Date | No | Valid date | Optional; saved when supplied | — | MEDIUM | 🔲 |
| 3.1.8 | File | File upload | Yes | PDF (and other file types) | PDF accepted | No file → validation error | HIGH | 🔲 |

### 3.2 Edit Form Fields

| # | Field | Type | Required | Test | Priority | Result | Notes |
|---|-------|------|---------|------|---------|--------|-------|
| 3.2.1 | Drawing Number editable in edit mode | Text | No (edit) | Type new number, Save → persists | HIGH | 🔲 | |
| 3.2.2 | Title editable in edit mode | Text | No (edit) | Type new title, Save → persists | HIGH | 🔲 | |
| 3.2.3 | Discipline dropdown shows all 9 options | Dropdown | No | Open discipline select → all 9 disciplines listed | HIGH | 🔲 | |
| 3.2.4 | Type dropdown shows all 7 options | Dropdown | No | Open type select → all 7 types listed | MEDIUM | 🔲 | |
| 3.2.5 | Obsolete field displayed (read-only) | Display | No | Detail view shows "Obsolete: No" in General Information | LOW | 🔲 | Currently read-only |
| 3.2.6 | Status displayed via StatusBadge | Badge | — | Status (draft, under_review, approved, superseded, void) shown as colored badge | HIGH | 🔲 | |

---

## 4. Viewer

> Source: `/[projectId]/drawings/viewer/[drawingId]/page.tsx` — annotation toolbar, zoom controls, pan, download, info panel, links panel

### 4.1 Core Viewer Controls

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.1.1 | Drawing viewer loads and renders PDF | Navigate to `/767/drawings/viewer/[drawingId]` | PDF renders in the viewer; drawing number and title shown in header | HIGH | 🔲 | Uses react-pdf (SSR disabled) |
| 4.1.2 | Zoom In increases drawing size | Click the Zoom In button (+ icon) 3 times | Drawing content visibly enlarges with each click | HIGH | 🔲 | |
| 4.1.3 | Zoom Out decreases drawing size | After zooming in, click Zoom Out 3 times | Drawing shrinks back toward original size | HIGH | 🔲 | |
| 4.1.4 | Rotate clockwise | Click Rotate CW button | Drawing rotates 90° clockwise | MEDIUM | 🔲 | |
| 4.1.5 | Rotate counter-clockwise | Click Rotate CCW button | Drawing rotates 90° counter-clockwise | MEDIUM | 🔲 | |
| 4.1.6 | Download from viewer | Click Download button in viewer toolbar | File download initiates in browser; file name matches drawing | HIGH | 🔲 | |
| 4.1.7 | Info panel opens | Click Info icon in right toolbar | Info panel slides open showing drawing metadata (number, title, discipline, revision, dates) | MEDIUM | 🔲 | |
| 4.1.8 | Navigate to previous drawing | Click the left chevron (ChevronLeft) | Navigates to the previous drawing in the project list | MEDIUM | 🔲 | |
| 4.1.9 | Navigate to next drawing | Click the right chevron (ChevronRight) | Navigates to the next drawing in the project list | MEDIUM | 🔲 | |

### 4.2 Markup / Annotations

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 4.2.1 | Select annotation tool | Click "Select" (MousePointer2) in the annotation toolbar | Select mode activates; cursor changes to pointer | MEDIUM | 🔲 | |
| 4.2.2 | Freehand pen annotation | Click "Pen" tool; draw on the canvas; click Select tool | Freehand stroke visible on the drawing | HIGH | 🔲 | |
| 4.2.3 | Rectangle annotation | Click "Rectangle" tool; drag to draw a box | Rectangle appears on the drawing | HIGH | 🔲 | |
| 4.2.4 | Arrow annotation | Click "Arrow" tool; drag to draw | Arrow line with head appears | MEDIUM | 🔲 | |
| 4.2.5 | Text annotation | Click "Text" tool; click on drawing; type text | Text label appears at click position | MEDIUM | 🔲 | |
| 4.2.6 | Eraser removes annotation | Draw a stroke; click "Eraser"; click on the stroke | Annotation removed | MEDIUM | 🔲 | |
| 4.2.7 | Comment pin | Click "Comment" tool; click on drawing | Comment pin placed; comment input opens | HIGH | 🔲 | |

---

## 5. Revisions

> Source: Detail page Versions card, API POST `/api/projects/[projectId]/drawings/[drawingId]/revisions`, useDrawingRevisions hook

### 5.1 View Revisions

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.1.1 | Versions table shows on General tab | Open a drawing detail page → General tab | "Versions" card renders with columns: Revision, Set, Drawing Date, Received Date, Status | HIGH | 🔲 | |
| 5.1.2 | Current revision is highlighted | Open detail for a drawing with 2+ revisions | The current (latest) revision row has a "(current)" label and a muted background | HIGH | 🔲 | |
| 5.1.3 | Empty state shown when no revisions | Open a newly created drawing (edge case — should always have rev 0) | "No revisions found" message shown in the table | LOW | 🔲 | |
| 5.1.4 | Download a specific revision | Click the Download icon on any revision row | File download initiates for that revision | HIGH | 🔲 | |
| 5.1.5 | View in viewer from revision row | Click the Info icon on any revision row | Navigates to the viewer page for that drawing | MEDIUM | 🔲 | |

### 5.2 Upload New Revision

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 5.2.1 | Upload a new revision via viewer | 1. Open drawing in viewer<br>2. Open Revisions panel<br>3. Click "Add Revision"<br>4. Fill Revision Number: **1**, Received Date: today<br>5. Select a PDF file<br>6. Click Upload | New revision "1" appears in the revisions list; becomes the current revision; old revision "0" still listed | HIGH | 🔲 | |
| 5.2.2 | New revision appears as current in list view | After uploading revision 1, return to `/767/drawings` | Drawing row shows the updated revision number | HIGH | 🔲 | |
| 5.2.3 | Revision upload fails when file missing | Click "Add Revision"; fill metadata but no file; submit | Validation error shown; revision NOT created | HIGH | 🔲 | |

---

## 6. Filters & Search

> Source: List page filter state, `drawingFilters` config, search implementation

### 6.1 Search

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 6.1.1 | Search by drawing number | Type a known drawing number in the search box | List filters in real time to show only matching drawings | HIGH | 🔲 | Searches `drawingNumber` field |
| 6.1.2 | Search by title | Type part of a drawing title | List shows only drawings whose title contains the typed text | HIGH | 🔲 | Searches `title` field |
| 6.1.3 | Search by discipline text | Type "Architectural" | Drawings whose discipline contains the text are shown | MEDIUM | 🔲 | Searches `discipline` field |
| 6.1.4 | Clear search restores full list | Type a search term; then delete all text | Full unfiltered list restored | HIGH | 🔲 | |

### 6.2 Filters

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 6.2.1 | Filter by discipline | Open Filters; select Discipline = "Structural" | Only Structural drawings shown; others hidden | HIGH | 🔲 | |
| 6.2.2 | Filter by drawing type | Open Filters; select Type = "Plan" | Only drawings with type "Plan" shown | MEDIUM | 🔲 | |
| 6.2.3 | Filter by status | Open Filters; select Status = "Approved" | Only approved drawings shown | HIGH | 🔲 | |
| 6.2.4 | Clear all filters restores list | Apply multiple filters; click "Clear Filters" | All drawings visible again; URL params cleared | HIGH | 🔲 | |

---

## 7. Permissions

> Source: API routes check `supabase.auth.getUser()` before all operations; Procore permissions matrix for Drawings

| # | Test | Role | Action | Expected | Priority | Result | Notes |
|---|------|------|--------|---------|---------|--------|-------|
| 7.1.1 | Unauthenticated user cannot list drawings | None (logged out) | GET `/api/projects/767/drawings` | 401 Unauthorized response | HIGH | 🔲 | |
| 7.1.2 | Unauthenticated user cannot upload | None (logged out) | POST `/api/projects/767/drawings` with file | 401 Unauthorized response | HIGH | 🔲 | |
| 7.1.3 | Authenticated user can view drawings list | Standard user (test1@mail.com) | Navigate to `/767/drawings` | List loads; no access denied banner | MEDIUM | 🔲 | |

---

## 8. Integrations & Cross-Tool Links

> Source: Viewer link pins (RFIs, punch items, coordination issues, tasks, drawing links, documents, photos), Related Items tabs on detail page

### 8.1 Link Pins in Viewer

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 8.1.1 | Place an RFI link pin | 1. Open drawing in viewer<br>2. Click "Link" tool<br>3. Click on the drawing canvas<br>4. In the modal, select type "RFI" and link to an existing RFI<br>5. Save | RFI pin appears on the drawing at the clicked location; pin shows RFI number | HIGH | 🔲 | |
| 8.1.2 | Place a Punch Item link pin | Repeat 8.1.1 with type "Punch Item" | Punch Item pin placed with correct color and label | HIGH | 🔲 | |
| 8.1.3 | Place a Photo link pin | Repeat 8.1.1 with type "Photo" | Photo pin placed; links to existing photo | MEDIUM | 🔲 | |
| 8.1.4 | Place a Drawing link pin | Repeat 8.1.1 with type "Drawing" | Drawing-to-drawing link pin placed | MEDIUM | 🔲 | |
| 8.1.5 | Links panel shows all pins | Click Links panel icon in viewer right toolbar | Panel lists all link pins on the current drawing with type, entity number, and position | MEDIUM | 🔲 | |

### 8.2 Related Items (Detail Page)

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 8.2.1 | Revision Related Items tab shows link button | Open drawing detail → "Revision Related Items" tab | Tab loads; "Link Related Item" button visible; empty state shown when no items linked | MEDIUM | 🔲 | Currently "coming soon" |
| 8.2.2 | Drawing Related Items tab shows link button | Open drawing detail → "Drawing Related Items" tab | Tab loads; "Link Related Item" button visible; empty state shown | MEDIUM | 🔲 | Currently "coming soon" |
| 8.2.3 | Emails tab loads | Open drawing detail → "Emails" tab | Tab renders; "Compose Email" button visible; empty state shown | LOW | 🔲 | Currently "coming soon" |

---

## 9. Reporting & Export

> Source: `UnifiedTablePage` `enableExport: true`, detail page Download button, download API endpoint

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 9.1.1 | Export drawings list as CSV | On list page, click the Export icon in the toolbar | CSV file downloads containing visible drawing rows with columns: Drawing Number, Title, Discipline, Type, Status | MEDIUM | 🔲 | `enableExport: true` in page config |
| 9.1.2 | Download current drawing file from detail | Open drawing detail → click "Download" button | File download initiates; downloaded file name matches the stored file name | HIGH | 🔲 | |
| 9.1.3 | Download log records activity | Download a drawing file → navigate to Download Log tab | Download Log tab shows the download activity entry with timestamp and user | LOW | 🔲 | Currently shows empty state |

---

## 10. Advanced Features

> Source: Drawing Sets page, Areas page, Recycle Bin, Sketches tab, column visibility, sorting, viewer comment system, change history

### 10.1 Drawing Sets

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.1.1 | Create a new drawing set | 1. Navigate to `/767/drawings/sets`<br>2. Click "New Set"<br>3. In the inline row, enter Name: **Permit Set**, Date: any date<br>4. Click Save (or press Enter) | New set appears in the sets table with the given name and date | HIGH | 🔲 | |
| 10.1.2 | Create set fails when name is empty | Click "New Set"; leave name blank; click Save | Error toast: "Set name is required"; no set created | HIGH | 🔲 | |
| 10.1.3 | Edit a drawing set name | Click on any set row; change the name in the inline editor; click Save | Updated name persists | MEDIUM | 🔲 | |
| 10.1.4 | Edit a drawing set date | Click on any set row; change the date; click Save | Updated date persists | MEDIUM | 🔲 | |
| 10.1.5 | Cancel set edit | Click a row; change the name; press Escape (or Cancel) | Original name restored; no change saved | MEDIUM | 🔲 | |
| 10.1.6 | View drawings in a set | Click "View" button on any set row | Navigates to `/767/drawings?set=[setId]`; list filters to drawings in that set | MEDIUM | 🔲 | |
| 10.1.7 | Search drawing sets | On Sets page, type in the search box | Sets list filters to matching set names in real time | LOW | 🔲 | |

### 10.2 Area Management

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.2.1 | Areas page loads with KPI stats | Navigate to `/767/drawings/areas` | Page loads; KPI row shows Total Areas, Total Drawings, Root Areas counts | MEDIUM | 🔲 | |
| 10.2.2 | Create a new drawing area | Click "Create Area" | New area named "New Area" created; appears in the area selector | HIGH | 🔲 | |
| 10.2.3 | Delete a drawing area | Select an area → Delete → confirm | Area removed; drawing count updates | HIGH | 🔲 | Uses native browser confirm dialog |
| 10.2.4 | Empty state shown with no areas | On a project with no areas | Empty state with "Create First Area" CTA shown | LOW | 🔲 | |

### 10.3 Recycle Bin

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.3.1 | Deleted drawing appears in Recycle Bin | Delete a drawing from the list; navigate to Recycle Bin tab | Deleted drawing listed in recycle bin | HIGH | 🔲 | Currently empty state only |
| 10.3.2 | Recycle Bin empty state shown when no deletions | Navigate to Recycle Bin on a project with no deleted drawings | Empty state: "Recycle Bin is empty — Deleted drawings will appear here and can be restored." | MEDIUM | 🔲 | |

### 10.4 Sketches

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.4.1 | Sketches tab loads on detail page | Open drawing detail → "Sketches" tab | Tab loads; "Add Sketch" button visible; empty state shown | MEDIUM | 🔲 | Currently "coming soon" |

### 10.5 Change History

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.5.1 | Change History tab loads | Open drawing detail → "Change History" tab | Tab loads; shows history entries or empty state | MEDIUM | 🔲 | Currently shows empty state |

### 10.6 Comments

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.6.1 | Add a comment on detail page | Open drawing detail → "Comments" tab → type a comment → submit | Comment appears with author name and timestamp | MEDIUM | 🔲 | Uses DrawingComments component |
| 10.6.2 | Add a comment pin in viewer | Click "Comment" tool in viewer → click on drawing → type comment → save | Comment pin placed on drawing; comment visible in activity panel | HIGH | 🔲 | |

### 10.7 Column Visibility & Sorting

| # | Test | Steps | Expected | Priority | Result | Notes |
|---|------|-------|----------|---------|--------|-------|
| 10.7.1 | Toggle column visibility | In table view, open column visibility selector; hide "Discipline" column | Discipline column disappears; other columns remain | LOW | 🔲 | |
| 10.7.2 | Sort by drawing number | Click "Drawing Number" column header in table view | List sorts alphabetically by drawing number; ascending first, then descending on second click | HIGH | 🔲 | Default sort is `drawingNumber` asc |
| 10.7.3 | Pagination — change page size | Default is 50 per page; change to 25 | List shows max 25 drawings per page; pagination controls update | LOW | 🔲 | |

---

## Sources

| # | Title | URL / Location | Category |
|---|-------|---------------|---------|
| 1 | Drawings list page | `frontend/src/app/(main)/[projectId]/drawings/page.tsx` | Codebase |
| 2 | Drawing detail page | `frontend/src/app/(main)/[projectId]/drawings/[drawingId]/page.tsx` | Codebase |
| 3 | Drawing viewer page | `frontend/src/app/(main)/[projectId]/drawings/viewer/[drawingId]/page.tsx` | Codebase |
| 4 | Drawing Sets page | `frontend/src/app/(main)/[projectId]/drawings/sets/page.tsx` | Codebase |
| 5 | Recycle Bin page | `frontend/src/app/(main)/[projectId]/drawings/recycle-bin/page.tsx` | Codebase |
| 6 | Drawing Areas page | `frontend/src/app/(main)/[projectId]/drawings/areas/page.tsx` | Codebase |
| 7 | Drawings list API | `frontend/src/app/api/projects/[projectId]/drawings/route.ts` | Codebase |
| 8 | Drawing detail API | `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/route.ts` | Codebase |
| 9 | Drawing revisions API | `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/route.ts` | Codebase |
| 10 | Drawing types & constants | `frontend/src/types/drawings.types.ts` | Codebase |
| 11 | Procore manifest | `.claude/procore-manifests/drawings/manifest.json` | Manifest |
| 12 | Guided test scenarios | `docs/testing/drawings-scenarios.md` | Codebase |
| 13 | Drawings — Upload | https://v2.support.procore.com/product-manuals/drawings-project/tutorials/upload-drawings | Procore Docs |
| 14 | Drawings — Edit | https://v2.support.procore.com/product-manuals/drawings-project/tutorials/edit-a-drawing | Procore Docs |
| 15 | Drawings — Revisions | https://v2.support.procore.com/product-manuals/drawings-project/tutorials/upload-a-drawing-revision | Procore Docs |
| 16 | Drawings — Sets | https://v2.support.procore.com/product-manuals/drawings-project/tutorials/create-a-drawing-set | Procore Docs |
| 17 | Drawings — Areas | https://v2.support.procore.com/product-manuals/drawings-project/tutorials/manage-drawing-areas | Procore Docs |
| 18 | Drawings — Markup & Annotations | https://v2.support.procore.com/product-manuals/drawings-project/tutorials/add-markups-to-drawings | Procore Docs |
| 19 | Drawings — Link Pins | https://v2.support.procore.com/product-manuals/drawings-project/tutorials/link-an-item-to-a-drawing | Procore Docs |
| 20 | Drawings — Recycle Bin | https://v2.support.procore.com/product-manuals/drawings-project/tutorials/restore-drawings-from-the-recycle-bin | Procore Docs |
| 21 | Permissions Matrix — Drawings | https://v2.support.procore.com/process-guides/permissions-matrix/project-level-drawings-permissions | Procore Docs |

---

## Testing Session Log

| Date | Tester | Environment | Pass | Fail | Skip | Notes |
|------|--------|-------------|------|------|------|-------|
| | | localhost:3000 | | | | |
