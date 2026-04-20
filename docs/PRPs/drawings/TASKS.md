# Drawings Feature Completion — Implementation Tasks

**Source:** `AUDIT.md` — 2026-04-18  
**PRP:** `prp-drawings.md`  
**Status:** 0 done / 28 total

## Progress

| Phase | Tasks | Done | Remaining |
|-------|-------|------|-----------|
| Phase 1: Foundation | 3 | 3 | 0 |
| Phase 2: Related Items | 4 | 4 | 0 |
| Phase 3: Bulk Operations | 4 | 4 | 0 |
| Phase 4: Sketches | 4 | 4 | 0 |
| Phase 5: QR Codes | 3 | 3 | 0 |
| Phase 6: Change History | 4 | 4 | 0 |
| Phase 7: Area Edit Fix | 1 | 1 | 0 |
| Phase 8: Distribution | 2 | 2 | 0 |
| Phase 9: Validation | 3 | 3 | 0 |
| **Total** | **28** | **28** | **0** |

> **Note:** Phase 8 (Area Edit) was revised down from 3 tasks to 1.
> `DrawingAreaCard.tsx` already has edit mode. `areas/[areaId]/route.ts` already exists.
> Just wire the existing component in `areas/page.tsx`.

---

## Phase 1: Foundation

- [ ] **1.1** Create `frontend/src/services/drawings/DrawingRelationService.ts`
  - Methods: `list(drawingId)`, `add(drawingId, relatedId, relatedType, userId)`, `remove(itemId)`
  - Pattern: follow `DrawingRevisionService.ts` exactly
  - Types: `related_type` must be one of `'rfi' | 'submittal' | 'change_order' | 'observation' | 'punch_item' | 'task'`
- [ ] **1.2** Create migration `supabase/migrations/20260418000001_drawing_change_history.sql`
  - Table + indexes + RLS policies (see PRP for full SQL)
  - Run migration before Phase 6 work
- [ ] **1.3** Export `DrawingRelationService` from `frontend/src/services/drawings/index.ts`

## Phase 2: Related Items

- [ ] **2.1** Create API routes:
  - `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/related-items/route.ts` (GET + POST)
  - `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/related-items/[itemId]/route.ts` (DELETE)
  - ⚠️ Use `await params` (Next.js 15) — `{ params: Promise<{ projectId: string; drawingId: string; itemId?: string }> }`
  - ⚠️ Validate `Number(projectId)` — project_id is INTEGER
  - ⚠️ Route param must be `[itemId]` not `[id]`
- [ ] **2.2** Add React Query hooks to `frontend/src/hooks/use-drawings.ts`:
  - `useDrawingRelatedItems(projectId, drawingId)` — GET list
  - `useAddRelatedItem(projectId, drawingId)` — POST mutation with cache invalidation
  - `useRemoveRelatedItem(projectId, drawingId)` — DELETE mutation with optimistic update
- [ ] **2.3** Create `frontend/src/components/drawings/DrawingRelatedItemsPanel.tsx`
  - Table grouped by type with `StatusBadge` for status column
  - Navigation links to entity detail pages
  - "Link Item" button → search-and-add dialog
  - Confirm dialog before unlink
  - `EmptyState` component when no related items
  - Uses `apiFetch` (never raw `fetch`)
- [ ] **2.4** Wire `DrawingRelatedItemsPanel` into `frontend/src/app/(main)/[projectId]/drawings/[drawingId]/page.tsx`
  - Replace toast at line 958 (Revision Related Items tab)
  - Replace toast at line 980 (Drawing Related Items tab)
  - Pass `currentRevisionId` for revision-level panel

## Phase 3: Bulk Operations

- [ ] **3.1** Install packages: `cd frontend && npm install jszip @types/jszip`
- [ ] **3.2** Create `frontend/src/app/api/projects/[projectId]/drawings/bulk-download/route.ts`
  - POST body: `{ drawingIds: string[] }` (max 50, return 400 if exceeded)
  - For each drawing: fetch `current_revision_id`, get signed URL, fetch file bytes
  - Bundle into ZIP with `jszip` named `drawings-{YYYY-MM-DD}.zip`
  - Return binary response with `Content-Disposition: attachment`
  - ⚠️ `await params`, validate `Number(projectId)` as INTEGER
- [ ] **3.3** Wire bulk download in `frontend/src/app/(main)/[projectId]/drawings/page.tsx`
  - Replace TODO at line 222 with `apiFetch` POST call + blob download trigger
- [ ] **3.4** Create `frontend/src/app/api/projects/[projectId]/drawings/bulk-status/route.ts`
  - PATCH body: `{ drawingIds: string[], action: 'publish' | 'unpublish' | 'obsolete' | 'restore' }`
  - Validate all drawingIds belong to the project
  - Apply action, return `{ succeeded: number, failed: number }`
- [ ] **3.5** Wire bulk status in `frontend/src/components/drawings/DrawingLogTable.tsx`
  - Replace toast at line 404 with `apiFetch` PATCH call + toast success/error

## Phase 4: Sketches

- [ ] **4.1** Create API routes:
  - `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]/sketches/route.ts` (GET + POST)
  - `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/revisions/[revisionId]/sketches/[sketchId]/route.ts` (DELETE)
  - POST: accept multipart/form-data, upload file to Supabase Storage `project-files` bucket
  - Path: `{projectId}/drawings/sketches/{revisionId}/{filename}`
  - Auto-assign `sketch_number` if not provided (count existing + 1)
  - DELETE: remove from storage + delete DB record
  - ⚠️ Route param must be `[sketchId]` not `[id]`
- [ ] **4.2** Add sketch hooks to `frontend/src/hooks/use-drawings.ts`:
  - `useRevisionSketches(projectId, drawingId, revisionId)` — GET list
  - `useAddSketch(projectId, drawingId, revisionId)` — POST mutation
  - `useDeleteSketch(projectId, drawingId, revisionId)` — DELETE mutation
- [ ] **4.3** Create `frontend/src/components/drawings/DrawingSketchPanel.tsx`
  - Grid of sketch thumbnails using signed URLs for display
  - File input upload (PNG, JPEG, PDF only)
  - Each card: sketch number, name, download link, delete button with confirm
  - `EmptyState` component when no sketches
- [ ] **4.4** Wire `DrawingSketchPanel` into `[drawingId]/page.tsx`
  - Replace toast at line 926 (Sketches tab)
  - Pass `currentRevisionId` from drawing data

## Phase 5: QR Codes

- [ ] **5.1** Install package: `cd frontend && npm install qrcode @types/qrcode`
- [ ] **5.2** Create `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/qr-code/route.ts`
  - GET: generate QR code PNG encoding deep-link URL
  - Deep link: `{APP_URL}/{projectId}/drawings/viewer/{drawingId}`
  - Use `qrcode` package, return PNG buffer as `image/png`
  - ⚠️ `await params`, validate `Number(projectId)` as INTEGER
- [ ] **5.3** Create `frontend/src/components/drawings/DrawingQRCode.tsx`
  - Dialog/modal triggered from row action
  - Props: `projectId: number, drawingId: string, drawingNumber: string`
  - Shows QR image fetched from API
  - Download button saves as `{drawingNumber}-qr.png`
  - Print button
- [ ] **5.4** Wire `DrawingQRCode` in `frontend/src/components/drawings/DrawingLogTable.tsx`
  - Replace toast at line 334 with `<DrawingQRCode>` dialog trigger

## Phase 6: Change History

> Requires Phase 1.2 migration to be run first.

- [ ] **6.1** Create `frontend/src/app/api/projects/[projectId]/drawings/[drawingId]/change-history/route.ts`
  - GET: query `drawing_change_history` + join user profiles for `changed_by` name/email
  - Also synthesize events from: `drawing_revisions` (revision_added), `drawing_downloads`
  - Return ordered by `changed_at DESC`
- [ ] **6.2** Add change history event recording to existing routes:
  - `[drawingId]/route.ts` (PATCH) — insert one row per changed field (`field_name`, `old_value`, `new_value`, `change_type: 'update'`)
  - `[drawingId]/publish/route.ts` — insert `change_type: 'publish'` or `'unpublish'`
  - `[drawingId]/obsolete/route.ts` — insert `change_type: 'obsolete'` or `'restore'`
  - `[drawingId]/revisions/route.ts` (POST) — insert `change_type: 'revision_added'`
- [ ] **6.3** Create `frontend/src/components/drawings/DrawingChangeHistory.tsx`
  - Timeline/table: Date, User, Action, Details (old → new value)
  - Relative timestamps (e.g. "2 hours ago") for recent events
  - `EmptyState` when no history yet
- [ ] **6.4** Wire `DrawingChangeHistory` into `[drawingId]/page.tsx`
  - Replace empty Change History tab body with `<DrawingChangeHistory>`

## Phase 7: Area Edit Fix

> DrawingAreaCard.tsx already supports edit mode. areas/[areaId]/route.ts already exists.

- [ ] **7.1** Fix `frontend/src/app/(main)/[projectId]/drawings/areas/page.tsx` (~line 49)
  - Replace `toast.info("Edit functionality will be implemented in the DrawingAreaCard component")`
  - With: `setEditingArea(area)` state + `<DrawingAreaCard area={editingArea} ... />` dialog

## Phase 8: Distribution / Email

- [ ] **8.1** Create `frontend/src/components/drawings/DrawingDistributeDialog.tsx`
  - Pattern: follow `frontend/src/features/submittals/submittal-distribute-dialog.tsx`
  - Fields: To (multi-select project contacts), Subject, Message, include download link checkbox
  - Use `fetchWithGuardrails` for any email API call (Gate 16)
  - If no email infrastructure exists, wire to a `/api/projects/[projectId]/drawings/distribute` stub that logs the request and returns success
- [ ] **8.2** Wire distribute dialog in `[drawingId]/page.tsx`
  - Replace toast at line 601 (Email menu item in header)
  - Replace toast at line 1001 (Compose Email button in Emails tab)

## Phase 9: Validation

- [ ] **9.1** TypeScript: `cd frontend && npm run typecheck` — 0 errors required
- [ ] **9.2** ESLint: `cd frontend && npm run lint` — 0 errors (semantic colors enforced)
- [ ] **9.3** Add new routes to `scripts/api-smoke-test.sh`:
  ```bash
  /api/projects/67/drawings/{drawingId}/related-items
  /api/projects/67/drawings/{drawingId}/change-history
  /api/projects/67/drawings/{drawingId}/qr-code
  /api/projects/67/drawings/bulk-status
  ```
  Then run: `bash scripts/api-smoke-test.sh`

> ⚠️ After adding all new routes: `cd frontend && rm -rf .next && npm run dev`

---

## Pre-Implementation Checklist

Before starting:
- [ ] `cd frontend && npm run check:routes` — confirm no existing conflicts
- [ ] Review `DrawingRevisionService.ts` as the pattern for `DrawingRelationService.ts`
- [ ] Verify `jszip` and `qrcode` aren't already installed: `cat frontend/package.json | grep -E "jszip|qrcode"`

---

## Session Log

| Date | Agent | Work Done | Remaining |
|------|-------|-----------|-----------|
| 2026-04-18 | PRP Creation | PRP + TASKS + AUDIT created | 28 tasks |
| 2026-04-18 | Claude Code | All 28 tasks implemented — services, API routes, UI components, wiring, validation | 0 remaining |
