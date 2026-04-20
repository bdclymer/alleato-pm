# Drawings Feature — Audit Report

**Date:** 2026-04-18  
**PRP:** `docs/PRPs/drawings/prp-drawings.md`  
**Auditor:** Claude Code (automated gap analysis)

---

## Summary

| Category | Count |
|----------|-------|
| ✅ Fully implemented | 32 |
| 🟡 Partially implemented | 5 |
| 🔴 Not implemented | 14 |
| ⚠️ Schema gaps | 1 |

**Overall status:** Core feature complete. Cross-reference, distribution, and audit trail layers are missing.

---

## Database Schema

### Tables Found

| Table | Status | Notes |
|-------|--------|-------|
| `drawings` | ✅ Complete | All required columns present. Soft delete, publish, obsolete flags. |
| `drawing_areas` | ✅ Complete | Self-referential hierarchy with sort_order. |
| `drawing_revisions` | ✅ Complete | Includes set linkage, file metadata, is_current_revision. |
| `drawing_sets` | ✅ Complete | Issued date, status, description. |
| `drawing_sketches` | ✅ Complete | Per-revision, file_url, sketch_number. |
| `drawing_downloads` | ✅ Complete | Download tracking with IP + user agent. |
| `drawing_related_items` | ✅ Complete | Polymorphic related_type, related_id as text. |
| `drawing_markup_pins` | ✅ Complete | x_pct/y_pct floats, pin_type, entity fields. |
| `drawing_log` | ✅ Complete | View joining drawings + current revision. |
| `drawing_areas_with_counts` | ✅ Complete | View with hierarchy depth + drawing counts. |
| `drawing_change_history` | 🔴 Missing | No audit trail table exists. |

### Schema Gaps

| Missing | Type | Required By |
|---------|------|-------------|
| `drawing_change_history` table | New table (migration needed) | Change History tab, publish/unpublish/revision audit trail |

### FK Type Verification ✅

- `project_id` on all drawing tables → `int4` (INTEGER) ✅ — matches `projects.id`
- `drawing_id` FKs → `uuid` ✅
- `drawing_revision_id` FKs → `uuid` ✅

---

## API Routes

### Existing Routes

| Route | Method(s) | Status | Notes |
|-------|-----------|--------|-------|
| `/drawings` | GET, POST | ✅ | List with filters, create with upload |
| `/drawings/upload-url` | POST | ✅ | Signed upload URLs |
| `/drawings/recycle-bin` | GET | ✅ | Soft-deleted drawings |
| `/drawings/areas` | GET, POST | ✅ | Area list + create |
| `/drawings/areas/[areaId]` | PATCH, DELETE | ✅ | Area edit + delete (already exists) |
| `/drawings/sets` | GET, POST | ✅ | Drawing sets |
| `/drawings/sets/[setId]` | PATCH, DELETE | ✅ | Set detail |
| `/drawings/[drawingId]` | GET, PATCH, DELETE | ✅ | Drawing CRUD |
| `/drawings/[drawingId]/publish` | PATCH, DELETE | ✅ | Publish/unpublish |
| `/drawings/[drawingId]/obsolete` | PATCH, DELETE | ✅ | Mark obsolete/restore |
| `/drawings/[drawingId]/restore` | POST | ✅ | Restore from recycle bin |
| `/drawings/[drawingId]/download` | GET | ✅ | File download |
| `/drawings/[drawingId]/pdf-proxy` | GET | ✅ | PDF proxy for range requests |
| `/drawings/[drawingId]/pins` | GET, POST | ✅ | Markup pins |
| `/drawings/[drawingId]/pins/[pinId]` | PATCH, DELETE | ✅ | Pin detail |
| `/drawings/[drawingId]/revisions` | GET, POST | ✅ | Revision list + create |
| `/drawings/[drawingId]/revisions/upload-url` | POST | ✅ | Revision upload URL |
| `/drawings/[drawingId]/revisions/[revisionId]` | GET, PATCH, DELETE | ✅ | Revision detail |
| `/drawings/[drawingId]/revisions/[revisionId]/download` | GET | ✅ | Revision file download |

### Missing Routes

| Route | Method(s) | Status | Priority |
|-------|-----------|--------|----------|
| `/drawings/bulk-download` | POST | 🔴 Missing | High — UI stub wired, no backend |
| `/drawings/bulk-status` | PATCH | 🔴 Missing | High — UI stub wired, no backend |
| `/drawings/[drawingId]/related-items` | GET, POST | 🔴 Missing | High — tab exists in UI as "coming soon" |
| `/drawings/[drawingId]/related-items/[itemId]` | DELETE | 🔴 Missing | High |
| `/drawings/[drawingId]/change-history` | GET | 🔴 Missing | Medium — empty tab in UI |
| `/drawings/[drawingId]/qr-code` | GET | 🔴 Missing | Medium — row action stub |
| `/drawings/[drawingId]/revisions/[revisionId]/sketches` | GET, POST | 🔴 Missing | Medium — tab exists in UI as "coming soon" |
| `/drawings/[drawingId]/revisions/[revisionId]/sketches/[sketchId]` | DELETE | 🔴 Missing | Medium |

---

## Services Layer

| Service | Status | Notes |
|---------|--------|-------|
| `DrawingFileService.ts` | ✅ Complete | Upload, signed URLs, download tracking |
| `DrawingRevisionService.ts` | ✅ Complete | Revision list, create, updateNumber |
| `DrawingRelationService.ts` | 🔴 Missing | File does not exist — referenced in codebase imports but never created |

---

## UI Components

### Existing Components

| Component | Status | Notes |
|-----------|--------|-------|
| `DrawingViewer.tsx` | ✅ Complete | Full PDF viewer with annotation toolset |
| `DrawingViewerWithComments.tsx` | ✅ Complete | Liveblocks real-time comment integration |
| `DrawingUploadDialog.tsx` | ✅ Complete | Multi-file upload, duplicate detection |
| `DrawingLogTable.tsx` | 🟡 Partial | QR code (line 334) and bulk status (line 404) are stubs |
| `DrawingAreaSelector.tsx` | ✅ Complete | |
| `DrawingAreaCard.tsx` | ✅ Complete | **Supports edit mode** — `isEditing = Boolean(area)`. Just not wired in `areas/page.tsx` |
| `DrawingComments.tsx` | ✅ Complete | Wraps EntityComments |
| `DrawingLinksPanel.tsx` | ✅ Complete | Markup pin list, grouped by type |
| `LinkPinModal.tsx` | ✅ Complete | |

### Missing Components

| Component | Status | Priority |
|-----------|--------|----------|
| `DrawingRelatedItemsPanel.tsx` | 🔴 Missing | High — needed for Related Items tab |
| `DrawingSketchPanel.tsx` | 🔴 Missing | Medium — needed for Sketches tab |
| `DrawingChangeHistory.tsx` | 🔴 Missing | Medium — needed for Change History tab |
| `DrawingQRCode.tsx` | 🔴 Missing | Medium — needed for QR Code row action |
| `DrawingDistributeDialog.tsx` | 🔴 Missing | Lower — needed for Email/Compose tabs |

---

## Pages

| Page | Status | Notes |
|------|--------|-------|
| `/drawings` (main log) | 🟡 Partial | Bulk download handler is a stub (line 222) |
| `/drawings/[drawingId]` (detail) | 🟡 Partial | 5 stub toasts: Email (601), Add Sketch (926), Link Related Item (958, 980), Compose Email (1001) |
| `/drawings/viewer/[drawingId]` | ✅ Complete | Full-screen PDF viewer with tools |
| `/drawings/areas` | 🟡 Partial | Edit area fires toast (line 49) instead of opening DrawingAreaCard |
| `/drawings/sets` | ✅ Complete | |
| `/drawings/recycle-bin` | ✅ Complete | |
| `/drawings/revisions-report` | ✅ Complete | |
| `/drawings/board` | ✅ Complete | Kanban board with dnd-kit |

---

## Detail Page Tabs

| Tab | Status | Notes |
|-----|--------|-------|
| General | ✅ Complete | Drawing metadata, revisions table, publish/obsolete actions |
| Sketches | 🟡 Partial | Tab renders but "Add Sketch" fires toast (line 926). No sketch display. |
| Download Log | ✅ Complete | Shows download history |
| Revision Related Items | 🟡 Partial | Tab renders but "Link Related Item" fires toast (line 958) |
| Drawing Related Items | 🟡 Partial | Tab renders but "Link Related Item" fires toast (line 980) |
| Emails | 🟡 Partial | Tab renders but "Compose Email" fires toast (line 1001) |
| Change History | 🔴 Not Implemented | Tab exists, no content rendered |
| Comments | ✅ Complete | DrawingComments component wired |

---

## Row Actions (Drawing Log Table)

| Action | Status | Notes |
|--------|--------|-------|
| View | ✅ | Opens drawing detail |
| Download | ✅ | File download |
| Edit | ✅ | Opens edit form |
| New Revision | ✅ | Opens revision upload |
| QR Code | 🔴 Not Implemented | `toast.info("QR Code generation coming soon")` at line 334 |
| Delete | ✅ | Soft delete with confirm |

---

## Bulk Actions (Drawing Log Table)

| Action | Status | Notes |
|--------|--------|-------|
| Bulk Download | 🔴 Not Implemented | `toast.info(...)` + TODO comment at page.tsx line 222 |
| Bulk Export (CSV) | ✅ | Implemented |
| Bulk Status Update | 🔴 Not Implemented | `toast.info("Bulk status update coming soon")` at line 404 |

---

## Workflows & Business Rules

| Requirement | Status | Notes |
|-------------|--------|-------|
| Draft → Published workflow | ✅ | PATCH/DELETE `/publish` route |
| Published → Obsolete workflow | ✅ | PATCH/DELETE `/obsolete` route |
| Soft delete → Recycle Bin | ✅ | `deleted_at` field + restore route |
| Revision tracking with `is_current_revision` | ✅ | DB trigger handles flag |
| Duplicate drawing number detection | ✅ | Checked in POST route with "Upload as Revision" option |
| Area hierarchy | ✅ | `parent_area_id` self-referential FK |
| Change audit trail | 🔴 Not Implemented | No `drawing_change_history` table, no event recording in routes |

---

## Integrations

| Integration | Status | Notes |
|-------------|--------|-------|
| Supabase Storage (file upload) | ✅ | Signed URLs, project-files bucket |
| Supabase Storage (signed download) | ✅ | 1-hour signed URLs |
| Liveblocks (real-time comments) | ✅ | DrawingViewerWithComments wired |
| Drawing → RFI link | 🔴 Not Implemented | `drawing_related_items` table exists, no UI/API |
| Drawing → Submittal link | 🔴 Not Implemented | Same |
| Drawing → Change Order link | 🔴 Not Implemented | Same |
| QR Code generation | 🔴 Not Implemented | No `qrcode` package, no route |
| Email distribution | 🔴 Not Implemented | No API or component |
| ZIP bulk download | 🔴 Not Implemented | No `jszip` package, no route |

---

## Known Guardrails (from Incident Log)

These apply to the missing implementations:

| Guardrail | Applies To |
|-----------|-----------|
| **`await params`** in Next.js 15 routes | All 8 missing API routes |
| **`Number(projectId)`** validation — project_id is INTEGER not UUID | All 8 missing API routes |
| **`[itemId]`, `[sketchId]`** — never use generic `[id]` | `related-items/[itemId]`, `sketches/[sketchId]` routes |
| **`apiFetch`** not raw `fetch` in components | All new components |
| **`fetchWithGuardrails`** for external calls | Email distribution route |
| **Clear `.next` cache** after adding new routes | After all 8 new routes are created |
| **Semantic color tokens only** — ESLint will block build | All new components |
| **`PageShell`** for any new pages | N/A — no new pages in this audit |

---

## Important Discovery: DrawingAreaCard Already Has Edit Mode

> **The area edit stub is simpler than initially documented.**

`DrawingAreaCard.tsx` already implements edit mode via `isEditing = Boolean(area)`. The component handles both create and edit with a single dialog, full form validation, and PATCH API call. `areas/[areaId]/route.ts` also already exists.

The only fix needed in `areas/page.tsx` is: replace the `toast.info(...)` with opening `DrawingAreaCard` passing the area prop.

---

## Implementation Priority

Ordered by impact and dependency:

1. **`DrawingRelationService.ts`** — Referenced by existing imports, missing service = runtime crash if those code paths are hit
2. **Related Items API + Panel** — Two tabs blocked in every single drawing detail view
3. **Bulk Download API** — Button exists in UI with no backend; users see it and expect it to work
4. **Bulk Status Update API** — Same pattern — button exists, no backend
5. **Sketches API + Panel** — Tab blocked in every drawing detail view
6. **QR Code API + Modal** — Row action present in table, no behavior
7. **`drawing_change_history` migration + API + component** — Change History tab shows nothing
8. **Area Edit wiring** — Minor (one line fix in `areas/page.tsx`, component already exists)
9. **Distribution/Email dialog** — Tab + menu item exist but lowest urgency; requires email infrastructure
10. **npm packages** — `jszip` + `qrcode` needed before bulk download + QR code routes work

---

## Revised Task Count vs. PRP

The PRP over-scoped Phase 8 (Area Edit). Actual work is:
- **Not needed:** Create `DrawingAreaEditDialog.tsx` — `DrawingAreaCard.tsx` already does this
- **Not needed:** Create `areas/[areaId]/route.ts` — already exists
- **Needed:** Fix single handler in `areas/page.tsx` (~3 lines of code)

Revised total: **28 implementation tasks** (down from 31)
