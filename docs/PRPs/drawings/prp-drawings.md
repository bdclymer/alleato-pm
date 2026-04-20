# PRP: Drawings Feature Completion

**Version:** 1.0  
**Date:** 2026-04-18  
**Confidence Score:** 8/10  
**Status:** Ready for Implementation

---

## Goal

**Feature Goal:** Complete the Drawings tool to Procore feature parity — filling all "coming soon" gaps and wiring up all stubbed functionality across the drawing detail page, table, viewer, and management screens.

**Deliverable:** Fully functional Drawings module with working Related Items, Sketches, Distribution/Email, Bulk Download, QR Codes, Bulk Status Updates, Change History, and Drawing Area editing.

**Success Definition:** Every tab on the drawing detail page renders real data. Every "coming soon" toast is replaced with working functionality. The feature passes a full Procore parity audit against the construction drawings tool.

---

## Why

**Business Value:** Drawings is the highest-traffic tool on any construction project — the source of truth for what gets built. Gaps in this feature (stub tabs, missing bulk actions, no email distribution) erode trust and force workarounds in the field.

**Current State:** The core is built — database schema, file upload, PDF viewer, revisions, sets, areas, and publish/obsolete workflows all work. What remains are the communication and cross-reference features that tie drawings to the rest of the project: related items, sketches, email distribution, bulk download, QR codes.

**Gaps Blocking Production Use:**
1. Drawing detail page has 5 "coming soon" tabs/actions
2. DrawingRelationService doesn't exist (file referenced but missing)
3. Bulk download has no API backing
4. QR code generation is a placeholder
5. Bulk status update has no implementation
6. Change history tab is empty
7. Drawing area edit is a stub toast

---

## What

### Pages (existing — gaps to complete)
- `frontend/src/app/(main)/[projectId]/drawings/[drawingId]/page.tsx` — detail page with 5 stub tabs
- `frontend/src/app/(main)/[projectId]/drawings/areas/page.tsx` — area edit stub

### New API Routes
- `POST /api/projects/[projectId]/drawings/[drawingId]/related-items` — link related item
- `DELETE /api/projects/[projectId]/drawings/[drawingId]/related-items/[itemId]` — unlink
- `GET /api/projects/[projectId]/drawings/[drawingId]/related-items` — list linked items
- `POST /api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]/sketches` — create sketch
- `GET /api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]/sketches` — list sketches
- `DELETE /api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]/sketches/[sketchId]` — delete sketch
- `POST /api/projects/[projectId]/drawings/bulk-download` — zip and return multiple drawings
- `PATCH /api/projects/[projectId]/drawings/bulk-status` — bulk status update
- `GET /api/projects/[projectId]/drawings/[drawingId]/change-history` — audit trail
- `GET /api/projects/[projectId]/drawings/[drawingId]/qr-code` — generate QR code PNG

### New/Modified Components
- `DrawingRelationService.ts` — missing service (referenced in codebase, not created)
- `DrawingRelatedItemsPanel.tsx` — UI for linking/unlinking related items
- `DrawingSketchPanel.tsx` — Upload and view sketches per revision
- `DrawingChangeHistory.tsx` — Audit log table for drawing metadata changes
- `DrawingQRCode.tsx` — QR code display/download modal
- `DrawingDistributeDialog.tsx` — Email distribution dialog
- `DrawingAreaEditDialog.tsx` — Edit area name and parent

### Database Schema Changes
- New table: `drawing_change_history` — tracks field-level changes to drawings and revisions

---

## Success Criteria

- [ ] All 5 "coming soon" items in `[drawingId]/page.tsx` render real data or functional dialogs
- [ ] Related Items tab shows linked RFIs, submittals, change orders, and allows adding/removing links
- [ ] Sketches tab shows uploaded sketches per revision and supports adding new ones
- [ ] Bulk download API returns a ZIP of selected drawing files
- [ ] QR code modal shows scannable code that deep-links to the drawing viewer
- [ ] Bulk status update applies `is_published` or `is_obsolete` changes to selected rows
- [ ] Change History tab shows an audit log of drawing metadata changes
- [ ] Drawing area edit dialog saves name and parent area changes
- [ ] TypeScript compiles with 0 errors (`npm run typecheck`)
- [ ] ESLint passes with 0 errors (`npm run lint`)

---

## All Needed Context

### Documentation References

| Resource | Purpose | URL/Path |
|----------|---------|----------|
| Procore Drawings Tool | Feature parity reference | `https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/drawings` |
| Supabase Storage Docs | Signed URLs, file upload | https://supabase.com/docs/guides/storage |
| JSZip | Client/server ZIP generation | https://stuk.github.io/jszip/ |
| qrcode npm package | QR code generation | https://www.npmjs.com/package/qrcode |
| Next.js App Router API Routes | Route handlers | https://nextjs.org/docs/app/building-your-application/routing/route-handlers |
| React Hook Form | Form handling pattern | Existing: `frontend/src/lib/schemas/drawing-schemas.ts` |

### Critical Files to Read Before Implementing

```
# Core drawing feature files
frontend/src/types/drawings.types.ts          # All drawing TypeScript types + constants
frontend/src/lib/schemas/drawing-schemas.ts   # Zod schemas for forms
frontend/src/hooks/use-drawings.ts            # All CRUD mutations + query hooks
frontend/src/services/drawings/DrawingFileService.ts     # File upload/download service
frontend/src/services/drawings/DrawingRevisionService.ts # Revision management service

# Implementation targets (files with "coming soon" stubs)
frontend/src/app/(main)/[projectId]/drawings/[drawingId]/page.tsx   # Lines 601, 926, 958, 980, 1001
frontend/src/components/drawings/DrawingLogTable.tsx                 # Lines 334, 404
frontend/src/app/(main)/[projectId]/drawings/page.tsx               # Line 222

# Reference patterns from similar features
frontend/src/features/submittals/submittal-distribute-dialog.tsx    # Email distribution pattern
frontend/src/app/api/projects/[projectId]/submittals/route.ts       # API route pattern
frontend/src/hooks/use-submittals.ts                                 # Hook pattern

# Design system
frontend/src/components/ds/GOLDEN-EXAMPLES.tsx                       # Copy-paste UI patterns
docs/design/DESIGN.md                                                # Design tokens + rules
```

### Context Completeness Check

An agent with no prior knowledge of this codebase can implement this feature using:
- The database schema below
- The existing files listed above
- The implementation tasks below
- The patterns documented in this PRP

### Codebase Tree (Drawings Feature)

```
frontend/src/
├── app/
│   ├── (main)/[projectId]/drawings/
│   │   ├── page.tsx                          # Main log table (DONE — bulk download stub)
│   │   ├── [drawingId]/page.tsx              # Detail page (5 STUBS TO COMPLETE)
│   │   ├── viewer/[drawingId]/page.tsx       # Full-screen PDF viewer (DONE)
│   │   ├── areas/page.tsx                    # Area management (edit stub)
│   │   ├── sets/page.tsx                     # Drawing sets (DONE)
│   │   ├── revisions-report/page.tsx         # Revisions report
│   │   ├── recycle-bin/page.tsx              # Soft-deleted drawings (DONE)
│   │   └── board/page.tsx                    # Board view
│   └── api/projects/[projectId]/drawings/
│       ├── route.ts                          # GET list, POST create (DONE)
│       ├── bulk-download/route.ts            # POST bulk ZIP (TO CREATE)
│       ├── bulk-status/route.ts              # PATCH bulk status (TO CREATE)
│       ├── areas/route.ts                    # GET/POST areas (DONE)
│       ├── sets/route.ts                     # GET/POST sets (DONE)
│       └── [drawingId]/
│           ├── route.ts                      # GET/PATCH/DELETE (DONE)
│           ├── publish/route.ts              # PATCH/DELETE publish (DONE)
│           ├── obsolete/route.ts             # PATCH/DELETE obsolete (DONE)
│           ├── restore/route.ts              # POST restore (DONE)
│           ├── download/route.ts             # GET download (DONE)
│           ├── pdf-proxy/route.ts            # GET PDF proxy (DONE)
│           ├── change-history/route.ts       # GET audit log (TO CREATE)
│           ├── qr-code/route.ts              # GET QR PNG (TO CREATE)
│           ├── related-items/
│           │   ├── route.ts                  # GET list, POST add (TO CREATE)
│           │   └── [itemId]/route.ts         # DELETE unlink (TO CREATE)
│           ├── revisions/route.ts            # GET/POST revisions (DONE)
│           └── revisions/[revisionId]/
│               ├── route.ts                  # DONE
│               ├── download/route.ts         # DONE
│               ├── upload-url/route.ts       # DONE
│               └── sketches/
│                   ├── route.ts              # GET/POST (TO CREATE)
│                   └── [sketchId]/route.ts   # DELETE (TO CREATE)
├── components/drawings/
│   ├── DrawingViewer.tsx                     # PDF viewer (DONE)
│   ├── DrawingViewerWithComments.tsx         # Liveblocks wrapper (DONE)
│   ├── DrawingUploadDialog.tsx               # Upload (DONE)
│   ├── DrawingLogTable.tsx                   # Table (QR + bulk status stubs)
│   ├── DrawingAreaSelector.tsx               # Area selection (DONE)
│   ├── DrawingAreaCard.tsx                   # Area card (DONE)
│   ├── DrawingComments.tsx                   # Comments (DONE)
│   ├── DrawingLinksPanel.tsx                 # Links panel
│   ├── LinkPinModal.tsx                      # Pin linking (DONE)
│   ├── DrawingRelatedItemsPanel.tsx          # TO CREATE
│   ├── DrawingSketchPanel.tsx                # TO CREATE
│   ├── DrawingChangeHistory.tsx              # TO CREATE
│   ├── DrawingQRCode.tsx                     # TO CREATE
│   └── DrawingDistributeDialog.tsx           # TO CREATE
├── services/drawings/
│   ├── DrawingFileService.ts                 # DONE
│   ├── DrawingRevisionService.ts             # DONE
│   ├── DrawingRelationService.ts             # TO CREATE (referenced, missing)
│   └── index.ts
├── hooks/
│   ├── use-drawings.ts                       # DONE
│   ├── use-drawing-upload.ts                 # DONE
│   ├── use-drawing-areas.ts                  # DONE
│   ├── use-drawing-sets.ts                   # DONE
│   ├── use-drawing-revisions.ts              # DONE
│   └── use-drawing-pins.ts                   # DONE
└── features/drawings/
    └── drawings-table-config.tsx             # Table config (DONE)
```

---

## Database Schema

### Existing Tables (do not modify)

```sql
-- drawings (main table)
-- id: uuid, project_id: int4 (FK→projects.id INTEGER — not UUID)
-- drawing_number: text (required)
-- title: text (required)
-- discipline: text (one of DRAWING_DISCIPLINES constant)
-- drawing_type: text (one of DRAWING_TYPES constant)
-- area_id: uuid? (FK→drawing_areas.id)
-- current_revision_id: uuid? (FK→drawing_revisions.id)
-- is_published: bool (default false)
-- is_obsolete: bool (default false)
-- deleted_at: timestamptz? (soft delete)
-- deleted_by: uuid? (FK→auth.users)
-- created_at: timestamptz
-- created_by: uuid (FK→auth.users)
-- updated_at: timestamptz

-- drawing_areas
-- id: uuid, project_id: int4, name: text
-- parent_area_id: uuid? (self-referential — hierarchy)
-- sort_order: int4?

-- drawing_revisions
-- id: uuid, drawing_id: uuid, revision_number: text?
-- drawing_date: date?, received_date: date?
-- status: text?, file_url: text, file_name: text
-- file_size: int8, file_type: text
-- drawing_set_id: uuid?, is_current_revision: bool
-- uploaded_by: uuid, created_at: timestamptz

-- drawing_sets
-- id: uuid, project_id: int4, name: text, issued_at: date
-- description: text?, status: text?

-- drawing_sketches
-- id: uuid, drawing_revision_id: uuid
-- sketch_number: text, name: text
-- description: text?, sketch_date: date?
-- file_url: text, created_by: uuid

-- drawing_downloads
-- id: uuid, drawing_revision_id: uuid
-- downloaded_by: uuid, downloaded_at: timestamptz
-- ip_address: text?, user_agent: text?

-- drawing_related_items
-- id: uuid, drawing_id: uuid
-- related_id: text (entity UUID stored as text)
-- related_type: text (one of: rfi, submittal, change_order, observation, punch_item, task)
-- created_by: uuid, created_at: timestamptz

-- drawing_markup_pins
-- id: uuid, drawing_id: uuid, project_id: int4
-- x_pct: float8, y_pct: float8, page: int4?
-- pin_type: text?, entity_id: text?, entity_number: text?
-- entity_label: text?, entity_status: text?, color: text?
```

### New Table Required

```sql
-- drawing_change_history (new migration needed)
CREATE TABLE drawing_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'publish', 'unpublish', 'obsolete', 'restore', 'delete', 'revision_added'))
);

CREATE INDEX idx_drawing_change_history_drawing_id ON drawing_change_history(drawing_id);
CREATE INDEX idx_drawing_change_history_project_id ON drawing_change_history(project_id);
```

### CRITICAL FK TYPE RULE

`project_id` is `INTEGER` (int4) — NOT UUID. The `projects.id` column is an integer.

```typescript
// CORRECT
project_id: number   // e.g. 67

// WRONG — will fail at runtime
project_id: string   // e.g. "some-uuid"
```

---

## Known Pitfalls & Prevention

### From Incident Log Analysis

#### Next.js 15 Async Params (api-routing-errors.md — CRITICAL)
**Error:** Accessing `params.drawingId` synchronously causes "params should be awaited" error  
**Prevention:** Always `await params` in all route handlers  
**Pattern:**
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; drawingId: string }> }
) {
  const { projectId, drawingId } = await params;
  // ...
}
```

#### Route Parameter Naming (INCIDENT-LOG.md — CRITICAL)
**Error:** Using generic `[id]` conflicts with other dynamic routes and crashes the dev server  
**Prevention:** Always use specific param names — `[drawingId]`, `[sketchId]`, `[itemId]`  
**Validation:** Run `npm run check:routes` after creating new route files

#### stale .next Cache (INCIDENT-LOG.md — CRITICAL)
**Error:** New page.tsx or route.ts files show 404 despite being correct  
**Prevention:** Clear cache when adding new routes:  
```bash
cd frontend && rm -rf .next && npm run dev
```

#### Project ID Type Mismatch (database-issues.md — CRITICAL)
**Error:** Passing project_id as string UUID fails silently on integer FK  
**Prevention:** `project_id` must always be `Number(projectId)` when inserting  
**Example:**
```typescript
const projectIdNum = Number(projectId);
if (isNaN(projectIdNum)) return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
```

#### apiFetch vs raw fetch (CLAUDE.md Gate 13)
**Error:** Using raw `fetch('/api/...')` loses structured error messages  
**Prevention:** Always use `apiFetch` from `@/lib/api-client` in components/hooks  
**Exception:** Server-side in API routes, use Supabase client directly (not fetch)

#### fetchWithGuardrails for External Calls (CLAUDE.md Gate 16)
**Error:** Raw `fetch()` to external services hangs forever with no timeout  
**Prevention:** Use `fetchWithGuardrails` from `@/lib/fetch-with-guardrails` for any external service call (email, etc.)

#### Design System Violations (DESIGN-SYSTEM-GATE.md)
**Error:** Using `bg-white`, `gray-*` classes, raw `<button>`, hardcoded colors  
**Prevention:** Only semantic tokens. Never hex codes. Use `<Button>` from `@/components/ui/button`  
**Validation:** `npm run lint` — 3 ESLint rules enforce this as ERRORS

---

## Implementation Blueprint

### Phase 1: Foundation — Missing Service + Migration

#### Task 1.1: Create DrawingRelationService
**File:** `frontend/src/services/drawings/DrawingRelationService.ts`  
**Pattern:** Follow `DrawingRevisionService.ts` structure

```typescript
// Service handles DB operations for drawing_related_items table
// Methods: list(drawingId), add(drawingId, relatedId, relatedType, userId), remove(itemId, userId)
// related_type values: 'rfi' | 'submittal' | 'change_order' | 'observation' | 'punch_item' | 'task'
// related_id is stored as text (entity UUID)
```

#### Task 1.2: Create change history migration
**File:** `supabase/migrations/20260418000001_drawing_change_history.sql`  
**Content:** The `drawing_change_history` table above + RLS policy:
```sql
ALTER TABLE drawing_change_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project members can read drawing change history"
  ON drawing_change_history FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));
CREATE POLICY "Authenticated users can insert change history"
  ON drawing_change_history FOR INSERT
  WITH CHECK (auth.uid() = changed_by);
```

#### Task 1.3: Export DrawingRelationService from index
**File:** `frontend/src/services/drawings/index.ts`  
Add export for `DrawingRelationService`

---

### Phase 2: Related Items

#### Task 2.1: Create Related Items API routes
**Files:**
- `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/related-items/route.ts`
- `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/related-items/[itemId]/route.ts`

**route.ts (GET + POST):**
```typescript
// GET: query drawing_related_items WHERE drawing_id = drawingId
// POST body: { related_id: string, related_type: string }
// Validate related_type is in allowed list
// Insert into drawing_related_items
// Record in drawing_change_history (change_type: 'update', field_name: 'related_items')
```

**[itemId]/route.ts (DELETE):**
```typescript
// DELETE: verify item belongs to drawing, delete from drawing_related_items
```

#### Task 2.2: Add React Query hooks for related items
**File:** `frontend/src/hooks/use-drawings.ts`  
Add hooks:
- `useDrawingRelatedItems(projectId, drawingId)` — fetches list
- `useAddRelatedItem(projectId, drawingId)` — mutation
- `useRemoveRelatedItem(projectId, drawingId)` — mutation with optimistic update

#### Task 2.3: Create DrawingRelatedItemsPanel component
**File:** `frontend/src/components/drawings/DrawingRelatedItemsPanel.tsx`

```typescript
// Props: projectId: number, drawingId: string
// Shows table of linked items grouped by type (RFIs, Submittals, Change Orders)
// Each row: type badge, number, title, status, link to detail page
// "Link Item" button opens a search dialog
// Uses useDrawingRelatedItems hook
// Unlink button on each row with confirm dialog
// Empty state: EmptyState component from @/components/ds
```

Related item type → route mapping:
```typescript
const RELATED_TYPE_ROUTES: Record<string, string> = {
  rfi: '/[projectId]/rfis/[id]',
  submittal: '/[projectId]/submittals/[id]',
  change_order: '/[projectId]/change-orders/[id]',
};
```

#### Task 2.4: Wire DrawingRelatedItemsPanel into detail page
**File:** `frontend/src/app/(main)/[projectId]/drawings/[drawingId]/page.tsx`  
Replace "coming soon" toasts at lines ~958 and ~980 with `<DrawingRelatedItemsPanel>`  
The page already has tabs for "Revision Related Items" and "Drawing Related Items" — populate both with the panel (filter by revision vs drawing level)

---

### Phase 3: Sketches

#### Task 3.1: Create sketches API routes
**Files:**
- `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]/sketches/route.ts`
- `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]/sketches/[sketchId]/route.ts`

**route.ts (GET + POST):**
```typescript
// GET: list sketches WHERE drawing_revision_id = revisionId
// POST: accept multipart/form-data with file + metadata
//   - Upload file to Supabase Storage bucket 'project-files', path: `${projectId}/drawings/sketches/${filename}`
//   - Insert into drawing_sketches: { drawing_revision_id, sketch_number, name, description, file_url, created_by }
//   - sketch_number is auto-assigned (count + 1) if not provided
```

**[sketchId]/route.ts (DELETE):**
```typescript
// DELETE: verify sketch exists, remove file from storage, delete DB record
```

#### Task 3.2: Add sketch hooks
**File:** `frontend/src/hooks/use-drawings.ts`  
Add `useRevisionSketches(projectId, drawingId, revisionId)` and `useAddSketch()` mutation

#### Task 3.3: Create DrawingSketchPanel component
**File:** `frontend/src/components/drawings/DrawingSketchPanel.tsx`

```typescript
// Props: projectId: number, drawingId: string, revisionId: string
// Shows grid of sketch thumbnails with number/name
// Upload button → file input → validates image type (PNG/JPEG/PDF)
// Each sketch card: preview image, sketch number, download link, delete button
// Uses signed URLs from Supabase for display
// Empty state with EmptyState component
```

#### Task 3.4: Wire DrawingSketchPanel into detail page
**File:** `frontend/src/app/(main)/[projectId]/drawings/[drawingId]/page.tsx`  
Replace "coming soon" toast at line ~926 with `<DrawingSketchPanel>`  
Pass the `currentRevisionId` as `revisionId`

---

### Phase 4: Bulk Operations

#### Task 4.1: Create bulk download API route
**File:** `frontend/src/app/api/projects/[projectId]/drawings/bulk-download/route.ts`

```typescript
// POST body: { drawingIds: string[] }
// For each drawing:
//   - Fetch drawing with current_revision_id from DB
//   - Get signed download URL from Supabase storage (use DrawingFileService)
//   - Fetch file bytes
// Bundle into ZIP using 'jszip' package
// Return ZIP as binary response with Content-Disposition: attachment; filename="drawings-{date}.zip"
// Limit: max 50 drawings per request (return 400 if exceeded)
// Install: npm install jszip @types/jszip (in frontend/)
```

#### Task 4.2: Wire bulk download in main page
**File:** `frontend/src/app/(main)/[projectId]/drawings/page.tsx`  
Replace TODO at line ~222:
```typescript
// Replace the placeholder with:
const response = await apiFetch(`/api/projects/${projectId}/drawings/bulk-download`, {
  method: 'POST',
  body: JSON.stringify({ drawingIds: selectedIds }),
});
// Trigger browser download from blob response
```

#### Task 4.3: Create bulk status update API route
**File:** `frontend/src/app/api/projects/[projectId]/drawings/bulk-status/route.ts`

```typescript
// PATCH body: { drawingIds: string[], action: 'publish' | 'unpublish' | 'obsolete' | 'restore' }
// Validate all drawings belong to the project
// Apply the action to all drawings
// Return { succeeded: number, failed: number }
```

#### Task 4.4: Wire bulk status update in DrawingLogTable
**File:** `frontend/src/components/drawings/DrawingLogTable.tsx`  
Replace "coming soon" toast at line ~404 with actual call to the bulk-status API

---

### Phase 5: QR Codes

#### Task 5.1: Create QR code API route
**File:** `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/qr-code/route.ts`

```typescript
// GET: generate QR code PNG that encodes the deep-link URL
// Deep link: https://{APP_URL}/[projectId]/drawings/viewer/[drawingId]
// Use 'qrcode' npm package: npm install qrcode @types/qrcode
// Return PNG buffer as image/png
```

#### Task 5.2: Create DrawingQRCode component
**File:** `frontend/src/components/drawings/DrawingQRCode.tsx`

```typescript
// Dialog/modal component
// Props: projectId: number, drawingId: string, drawingNumber: string
// Shows QR code image fetched from /api/.../qr-code
// Download button: saves PNG as "{drawingNumber}-qr.png"
// Print button: opens print dialog with just the QR code
// Design: clean modal, centered QR image, drawing number caption
```

#### Task 5.3: Wire QR code in DrawingLogTable
**File:** `frontend/src/components/drawings/DrawingLogTable.tsx`  
Replace "coming soon" toast at line ~334 with `<DrawingQRCode>` dialog trigger

---

### Phase 6: Change History

#### Task 6.1: Create change history API route
**File:** `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/change-history/route.ts`

```typescript
// GET: query drawing_change_history WHERE drawing_id = drawingId
// JOIN with auth.users to get changed_by email/name
// Return ordered by changed_at DESC
// Also synthesize events from: drawing_revisions (created_at = revision_added event),
//   drawing_downloads (download events from drawing_downloads table)
```

#### Task 6.2: Write change history events in existing routes
**Files to modify:**
- `route.ts (PATCH)` — on drawing update, insert into drawing_change_history for each changed field
- `publish/route.ts` — on publish/unpublish, insert change_type: 'publish'/'unpublish'
- `obsolete/route.ts` — on obsolete/restore, insert change_type: 'obsolete'/'restore'
- `revisions/route.ts (POST)` — on new revision, insert change_type: 'revision_added'

#### Task 6.3: Create DrawingChangeHistory component
**File:** `frontend/src/components/drawings/DrawingChangeHistory.tsx`

```typescript
// Props: projectId: number, drawingId: string
// Renders timeline/table of change events
// Columns: Date, User, Action, Details (field changed + old/new value)
// Uses relative time for recent events (e.g., "2 hours ago")
// Empty state: "No changes recorded yet"
```

#### Task 6.4: Wire change history into detail page
**File:** `frontend/src/app/(main)/[projectId]/drawings/[drawingId]/page.tsx`  
Replace empty "Change History" tab with `<DrawingChangeHistory>`

---

### Phase 7: Distribution / Email

#### Task 7.1: Create DrawingDistributeDialog component
**File:** `frontend/src/components/drawings/DrawingDistributeDialog.tsx`  
**Pattern:** Follow `frontend/src/features/submittals/submittal-distribute-dialog.tsx`

```typescript
// Dialog for distributing drawings to project contacts
// Props: projectId: number, drawingIds: string[], onClose: () => void
// Form fields:
//   - To: multi-select of project directory members
//   - Subject: pre-filled "Drawing Distribution - {date}"
//   - Message: textarea
//   - Include download link: checkbox (generates signed URL)
//   - Include QR code: checkbox
// Uses fetchWithGuardrails for the email send call (Gate 16)
// Wire to existing email infrastructure or placeholder API route
```

#### Task 7.2: Wire distribute dialog in detail page
**File:** `frontend/src/app/(main)/[projectId]/drawings/[drawingId]/page.tsx`  
Replace "coming soon" toast at line ~1001 (Compose Email) with `<DrawingDistributeDialog>`

---

### Phase 8: Area Edit

#### Task 8.1: Create DrawingAreaEditDialog component
**File:** `frontend/src/components/drawings/DrawingAreaEditDialog.tsx`

```typescript
// Props: area: DrawingArea, projectId: number, onClose: () => void
// Form: name (text input), parent_area_id (select from other areas)
// Uses PATCH /api/projects/[projectId]/drawings/areas/[areaId]
// Create the areas/[areaId]/route.ts API route if it doesn't exist
```

#### Task 8.2: Create area detail route if missing
**File:** `frontend/src/app/api/projects/[projectId]/drawings/areas/[areaId]/route.ts`

```typescript
// PATCH: update area name and parent_area_id
// DELETE: delete area (only if no drawings assigned — return 409 if occupied)
```

#### Task 8.3: Wire edit dialog in areas page
**File:** `frontend/src/app/(main)/[projectId]/drawings/areas/page.tsx`  
Replace stub toast at line ~49 with `<DrawingAreaEditDialog>`

---

### Phase 9: Validation + Testing

#### Task 9.1: TypeScript compilation check
```bash
cd frontend && npm run typecheck
```
Fix all type errors before marking complete.

#### Task 9.2: ESLint check
```bash
cd frontend && npm run lint
```
Fix all lint errors (semantic colors, apiFetch, etc.)

#### Task 9.3: Smoke test all new endpoints
```bash
# Add new routes to scripts/api-smoke-test.sh
# Test each new endpoint with curl against the dev server
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/projects/67/drawings/[drawingId]/related-items
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/projects/67/drawings/[drawingId]/change-history
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/projects/67/drawings/[drawingId]/qr-code
```

#### Task 9.4: Browser verification
```
agent-browser open http://localhost:3000/67/drawings
agent-browser screenshot /tmp/drawings-list.png
# Navigate to a drawing detail page
agent-browser open http://localhost:3000/67/drawings/[drawingId]
agent-browser screenshot /tmp/drawings-detail.png
# Verify each tab renders (no "coming soon" toasts)
```

---

## Validation Loop

### Level 1 — Syntax & Style
```bash
cd frontend && npm run typecheck   # 0 TypeScript errors
cd frontend && npm run lint        # 0 ESLint errors (semantic colors, apiFetch enforced)
```

### Level 2 — Existing Test Suite
```bash
cd frontend && npm run test:unit   # Jest unit tests — no regressions
```

### Level 3 — Integration Testing (per task group)

**Related Items:**
1. Create a drawing, add an RFI as related item
2. Navigate away, return — related item persists
3. Remove the link — it disappears from the list

**Sketches:**
1. Open a drawing detail, go to Sketches tab
2. Upload a PNG sketch file
3. Verify thumbnail appears, download works
4. Delete sketch, verify it's gone

**Bulk Download:**
1. Select 3+ drawings in table
2. Click Bulk Download
3. Verify ZIP file downloads and contains the PDFs

**QR Codes:**
1. Click QR Code action on a table row
2. Modal opens with scannable QR
3. Download button saves PNG

**Change History:**
1. Edit a drawing title via PATCH
2. Open Change History tab
3. Verify the title change appears with old/new values

### Level 4 — Production Readiness
```bash
# Build passes
cd frontend && npm run build

# New routes added to smoke test
grep "drawings" scripts/api-smoke-test.sh  # all new endpoints present

# Migration committed
ls supabase/migrations/ | grep drawing_change_history
```

---

## Final Validation Checklist

### Technical
- [ ] TypeScript strict — 0 errors (`npm run typecheck`)
- [ ] ESLint — 0 errors (`npm run lint`)
- [ ] Build passes (`npm run build`)
- [ ] All new API routes use `await params` (Next.js 15)
- [ ] All routes validate project_id as `Number()` before DB queries
- [ ] No raw `fetch()` in components/hooks — uses `apiFetch`
- [ ] No raw `fetch()` to external services — uses `fetchWithGuardrails`
- [ ] All new routes use specific param names (`[sketchId]`, `[itemId]`)
- [ ] `npm run check:routes` passes after all new routes created

### Feature
- [ ] Related Items tab shows linked entities with working navigation links
- [ ] Sketches tab shows uploaded sketches, upload works, delete works
- [ ] Bulk download returns valid ZIP file
- [ ] QR code renders and downloads correctly
- [ ] Bulk status update applies to all selected drawings
- [ ] Change History tab shows audit trail
- [ ] Area edit dialog saves changes
- [ ] Distribute dialog sends email (or shows working form)
- [ ] Zero "coming soon" toasts remain in drawings feature

### Code Quality
- [ ] All new components use design system tokens (no `bg-white`, `gray-*`)
- [ ] All new components use `PageShell` if they're new pages
- [ ] No raw `<button>` — always `<Button>` from `@/components/ui/button`
- [ ] `StatusBadge` used for status rendering
- [ ] `EmptyState` component used for empty lists
- [ ] New routes added to `scripts/api-smoke-test.sh`
- [ ] Migration file created and named correctly

### TypeScript/Next.js
- [ ] `'use client'` only on components that use hooks/browser APIs
- [ ] Server Components used where no interactivity needed
- [ ] All Zod schemas in `frontend/src/lib/schemas/drawing-schemas.ts`
- [ ] All new types in `frontend/src/types/drawings.types.ts`
- [ ] DrawingRelationService follows same pattern as DrawingRevisionService

---

## Anti-Patterns to Avoid

1. **Don't re-read existing working code** — the list of DONE files is done; start from the stubs
2. **Don't create new Zod schemas outside `drawing-schemas.ts`** — extend the existing file
3. **Don't use `toast.info("coming soon")`** — that's what we're replacing
4. **Don't ignore the project_id INTEGER constraint** — `Number(projectId)` always
5. **Don't create new hook files** — extend `use-drawings.ts` for all drawing hooks
6. **Don't use `bg-white` or hardcoded colors** — fail ESLint check will block completion
7. **Don't skip the smoke test step** — TypeScript doesn't catch runtime DB errors
8. **Don't claim a tab is complete without browser verification** — screenshot required
9. **Don't forget RLS policies** on the `drawing_change_history` table migration
10. **Don't use `[id]` as a route parameter** — causes conflicts; use `[sketchId]`, `[itemId]`

---

## Packages to Install

```bash
cd frontend && npm install jszip qrcode
cd frontend && npm install -D @types/jszip @types/qrcode
```

Verify these don't conflict with existing packages before installing.
