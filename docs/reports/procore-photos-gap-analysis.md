# Procore Research: Photos Tool — Gap Analysis

**Date:** 2026-04-09
**Question:** Compare all functionality between our photos tool and Procore's
**Sources used:** Tier 1 (RAG) | Tier 2 (Manifest) | Tier 3 (WebFetch)

---

## Summary

Our Photos tool has solid upload mechanics and a well-structured page shell, but 4 of the 5 tabs (Map, Timeline, Albums, Recycle Bin) are empty-state placeholders. The core gaps are album management, bulk operations, photo comments, download/export, and recycle bin recovery.

**Overall completeness: ~30% of Procore's Photos feature set**

---

## Feature Comparison

| Feature | Procore | Ours | Notes |
|---------|---------|------|-------|
| **Upload** | | | |
| Drag-and-drop upload | ✅ | ✅ | |
| File picker (browse) | ✅ | ✅ | |
| Multi-file upload | ✅ | ✅ | |
| Album selection on upload | ✅ | ✅ | Ours uses hardcoded options, not DB albums |
| Private flag on upload | ✅ | ❌ | Field exists in DB/API but not exposed in upload dialog |
| Add to Daily Log on upload | ✅ | ❌ | Checkbox during upload flow |
| Email inbound upload | ✅ | ❌ | Project-specific email address |
| Supported formats (.jpg, .jpeg, .tif, .tiff, .gif, .png, .bmp) | ✅ | Partial | Ours accepts `image/*` (broader but missing TIFF caveat) |
| **Viewing** | | | |
| Grid / gallery view | ✅ | ✅ | |
| Lightbox (single photo modal) | ✅ | ✅ | |
| Timeline view (chronological) | ✅ | ❌ | Tab exists, empty state only |
| Map view (geotagged pins) | ✅ | ❌ | Tab exists, empty state only |
| **Photo Metadata** | | | |
| Title | ✅ | ✅ | |
| Description | ✅ | ✅ (view only) | No inline edit in lightbox |
| Album | ✅ | ✅ (view only) | Can't reassign album from UI |
| Location / trade | ✅ | ✅ (view only) | Displayed in lightbox, no edit UI |
| Tags | ✅ | ✅ (view only) | Displayed in lightbox, no edit UI |
| Dimensions (W×H) | ✅ | ✅ | |
| Date taken (EXIF) | ✅ | ✅ | |
| File size | ✅ | ✅ | |
| **Photo Actions** | | | |
| Star / favorite | ✅ | ✅ | Card hover + lightbox |
| Filter by starred | ✅ | ❌ | API supports `?starred=true` but UI has no filter |
| Mark as private | ✅ | ❌ | Field in DB, not exposed in any UI |
| Edit description | ✅ | ❌ | Lightbox is view-only |
| Rotate | ✅ | ❌ | |
| Delete (soft) | ✅ | ✅ | |
| Download (individual) | ✅ | ❌ | No download button |
| Download (bulk / zip) | ✅ | ❌ | |
| Export as PDF | ✅ | ❌ | |
| Subscribe to photos | ✅ | ❌ | |
| Set as Project Photo | ✅ | ❌ | Hero/cover photo for project |
| **Comments** | | | |
| Add comment to a photo | ✅ | ❌ | |
| Mention someone in a comment | ✅ | ❌ | |
| **Albums** | | | |
| Albums tab | ✅ | ❌ | Tab exists, empty state only |
| Create album | ✅ | ❌ | |
| Rename album | ✅ | ❌ | |
| Delete album | ✅ | ❌ | |
| Reorder albums | ✅ | ❌ | |
| Mark album as private | ✅ | ❌ | |
| Set album cover photo | ✅ | ❌ | |
| Move photos between albums | ✅ | ❌ | No UI to reassign |
| Unclassified album (auto-bucket) | ✅ | ❌ | |
| **Bulk Operations** | | | |
| Multi-select photos | ✅ | ❌ | No checkboxes |
| Bulk edit descriptions | ✅ | ❌ | |
| Bulk move to album | ✅ | ❌ | |
| Bulk delete | ✅ | ❌ | |
| **Recycle Bin** | | | |
| Soft delete → Recycle Bin | ✅ | Partial | `deleted_at` set on delete |
| Recycle Bin tab | ✅ | ❌ | Tab exists, empty state only |
| Recover photo from Recycle Bin | ✅ | ❌ | No recovery UI |
| Permanently delete from Recycle Bin | ✅ | ❌ | |
| 30-day auto-purge | ✅ | ❌ | |
| **Map Integration** | | | |
| View photos on map | ✅ | ❌ | |
| Add/remove photo pin from map | ✅ | ❌ | |
| Filter map by album/date | ✅ | ❌ | |
| **Integrations** | | | |
| Add photo to Inspection | ✅ | ❌ | Populated in Photos tool |
| Add photo to Observation | ✅ | ❌ | Populated in Photos tool |
| Photos from Drawings tool | ✅ | ❌ | |
| Photos in Daily Log | ✅ | ❌ | |
| **Settings** | | | |
| Configure Advanced Settings | ✅ | ❌ | Default album for Drawings, private-by-default |
| **Permissions** | | | |
| Read Only / Standard / Admin levels | ✅ | ❌ | No permission tiers |
| Granular: Create Photo Album | ✅ | ❌ | |

---

## What We Have That Works Well

- Upload dialog with drag-and-drop, multi-file, album selection, file preview
- Page-level drag-and-drop overlay (drop anywhere on the page)
- Mobile FAB for upload
- Star/favorite with hover reveal on card
- Lightbox modal with metadata display (location, trade, tags, dimensions)
- Soft delete pattern (`deleted_at`) ready for recycle bin
- API supports `?starred=true`, `?album=`, `?search=` query params
- All tab slots exist in the UI (just need implementation behind them)

---

## Priority Gaps (by impact)

### P0 — Core functionality incomplete
1. **Recycle Bin UI** — soft delete exists but users can't recover photos; the tab is empty
2. **Edit photo metadata from lightbox** — users can't change description, album, location, trade after upload
3. **Move photos between albums** — no UI to reassign

### P1 — Album management (Albums tab is entirely empty)
4. **Create/rename/delete/reorder albums** — albums are currently hardcoded strings
5. **Set album cover photo**
6. **Mark album as private**

### P1 — Bulk operations
7. **Multi-select + bulk actions** (move, delete, edit description)

### P2 — Download/export
8. **Download individual photo** — no download button in lightbox
9. **Export as PDF** — per Procore docs, available to Read Only+

### P2 — Missing upload options
10. **Private flag** on upload — field is in DB/API, just needs a checkbox in the upload dialog
11. **Add to Daily Log** on upload

### P3 — Advanced features
12. **Map view** — geotagged photo pins
13. **Timeline view** — chronological browsing
14. **Photo comments + mentions**
15. **Subscribe to photos**
16. **Starred filter in toolbar** — API already supports it
17. **Configure Advanced Settings page**

---

## Quick Wins (low effort, high value)

These can be done with minimal code since the infrastructure exists:

| Win | Effort | Why easy |
|-----|--------|----------|
| Starred filter in toolbar | 30 min | `?starred=true` already in API |
| Private checkbox in upload dialog | 30 min | `is_private` field already in DB/API/schema |
| Download button in lightbox | 30 min | Just an `<a href={url} download>` |
| Editable description in lightbox | 1h | `useUpdatePhoto` hook already exists |
| Editable album in lightbox | 1h | Same hook, just add Select |

---

## Sources

- https://v2.support.procore.com/product-manuals/photos-project/tutorials
- https://v2.support.procore.com/product-manuals/photos-project/tutorials/upload-photos
- https://v2.support.procore.com/product-manuals/photos-project/tutorials/bulk-edit-photos
- https://v2.support.procore.com/product-manuals/photos-project/tutorials/create-a-photo-album
- https://v2.support.procore.com/product-manuals/photos-project/tutorials/move-photos
- https://v2.support.procore.com/product-manuals/photos-project/tutorials/export-photos-as-a-pdf
- https://v2.support.procore.com/product-manuals/photos-project/tutorials/download-photos
- https://v2.support.procore.com/product-manuals/photos-project/permissions
- https://v2.support.procore.com/product-manuals/photos-project/tutorials/configure-advanced-settings-photos
