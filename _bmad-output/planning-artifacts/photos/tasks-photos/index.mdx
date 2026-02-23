---
title: TASKS PHOTOS
description: TASKS PHOTOS documentation
---

# TASKS: Photos

- Feature: photos
- Crawl Session: 2026-01-12 (`PLANS/photos/crawl-photos`)
- Status: Not Started (parity gap vs Procore reference)
- PM Session Owner: _unassigned_
- **Priority:** MEDIUM
- **Estimated Effort:** 2-3 weeks
- **Dependencies:** None (can be developed independently)

## Implementation Summary

| Phase | Status | Progress | Est. Days |
| ----- | ------ | -------- | --------- |
| Phase 0: Data & Schema | NOT STARTED | 0/8 | 2 |
| Phase 1: Upload & Ingestion | NOT STARTED | 0/6 | 3 |
| Phase 2: APIs & Services | NOT STARTED | 0/8 | 2 |
| Phase 3: Photos Grid UI | NOT STARTED | 0/10 | 3 |
| Phase 4: Map Experience | NOT STARTED | 0/6 | 2 |
| Phase 5: Timeline View | NOT STARTED | 0/5 | 2 |
| Phase 6: Albums & Recycle Bin | NOT STARTED | 0/9 | 2 |
| Phase 7: Settings & Permissions | NOT STARTED | 0/11 | 1 |
| Phase 8: Testing & Verification | NOT STARTED | 0/8 | 2 |

## 🚀 Quick Start Actions

### Immediate Next Steps (Start Here):

1. **Create Database Migration** (`frontend/supabase/migrations/`)

   ```sql
   -- Create photos table
   CREATE TABLE photos (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     project_id UUID REFERENCES projects(id),
     file_url TEXT NOT NULL,
     thumbnail_url TEXT,
     -- ... (see Phase 0 for complete schema)
   );
   ```

2. **Create Basic API Route** (`frontend/src/app/api/projects/[projectId]/photos/route.ts`)
   - Copy pattern from `change-events/route.ts`
   - Implement GET (list) and POST (upload)

3. **Create List Page** (`frontend/src/app/(main)/[projectId]/photos/page.tsx`)
   - Copy structure from `change-events/page.tsx`
   - Display photo grid instead of table

4. **Set Up File Upload**
   - Use existing Supabase storage patterns
   - Reference `attachments` implementation

---

## Phase 0: Data & Schema

- [ ] Design `photos` table (id, project_id, album_id, file_name, file_url, thumbnail_url, captured_at, uploaded_at, uploaded_by_id, location_name, latitude, longitude, gps_accuracy, description, privacy, source_tool, source_record_id, tags jsonb, is_deleted, deleted_at) to power grid, map, and timeline views (`pages/photos`, `pages/map`, `pages/timeline`).
- [ ] Add `photo_albums` table (id, project_id, name, photo_count, is_private, subscribe_opt_in, is_locked, default_sort_order, source_tool) to represent cards shown on `pages/albums`.
- [ ] Add `photo_album_members` join table with `added_at`, `added_by`, `sort_key` to support grouped timeline rendering inside an album detail (`pages/562949957045694`, `pages/562949957592422`).
- [ ] Add `photo_lists` (user-defined "List: All" dropdown) preserving filters, search text, column layouts; include `owner_id`, `visibility`, `payload`.
- [ ] Add `photo_locations` reference table for saved locations used by the “Search Locations” filter dropdown (`dropdownDetails[4]` in `pages/photos`/`pages/map` metadata) plus indexes on `name` + `project_id`.
- [ ] Add `photo_settings` table keyed by `project_id` storing booleans/radios captured in the Settings crawl (`root_image_category_add_new_at_top`, `root_uploaded_images_private__checkbox`, `root_email_private_by_default__checkbox`, `root_inbound_email_options` (3 values), `default_album_drawings`, `default_album_daily_log`, `default_album_punch`, `import_drawings/daily_log/punch` toggles).
- [ ] Add `photo_permissions_matrix` schema (role, can_view, can_upload, can_manage_albums, can_manage_settings) to back the permissions table (`pages/permissions`).
- [ ] Ensure soft-delete strategy (recycle bin) by adding `deleted_by`, `deleted_reason`, indexes on `deleted_at` and `project_id` to allow `/recycle_bin` filtering.

---

## Phase 1: Upload & Ingestion

- [ ] Implement frontend upload dialog that mirrors `pages/photos_upload_dialog_0` (drag-and-drop drop zone, “Upload” CTA, hidden file input, upload status list, disable Save until files selected).
- [ ] Support multi-file selection, progress bars, retry + cancel, and eventual success banners for uploads triggered from Photos, Map, Timeline, Albums views (`uploadButtons` present across crawled pages).
- [ ] Automatically apply privacy defaults + album routing per `photo_settings` (e.g., mark uploads private when `root_uploaded_images_private__checkbox` or `Photos From Daily Log` default album is set).
- [ ] Implement inbound email ingestion respecting the three `root_inbound_email_options` radio choices (likely “Allow anyone”, “Company users”, “Whitelist”), generate project-specific email address, and log processed messages.
- [ ] Build background workers that import assets from Drawings, Daily Log, Punch List when their toggles are enabled and file them into the configured default albums (`Photos from Drawings`, `Photos From Daily Log`, `Photos from Defect List`).
- [ ] Persist upload activity (`photo_upload_jobs`) for audit/history views and to drive Bulk Actions’ “Update” progress messaging.

---

## Phase 2: APIs & Services

- [ ] Build `/api/projects/[projectId]/photos` GET with pagination, search text, location/album/privacy filters, saved list tokens, and support for `view=map|timeline`.
- [ ] Build `/api/projects/[projectId]/photos` POST for new uploads (linking to Supabase storage), returning normalized photo records for UI hydration.
- [ ] Build `/api/projects/[projectId]/photos/[photoId]` PATCH/DELETE for metadata edits, privacy toggles, move to recycle bin.
- [ ] Build `/api/projects/[projectId]/photos/map` GET returning geospatial payload (clusters + raw coordinates) consumed by maplibre control set.
- [ ] Build `/api/projects/[projectId]/photos/timeline` GET returning grouped buckets (day/week/month) plus pagination tokens used by timeline + album detail pages.
- [ ] Build `/api/projects/[projectId]/photos/albums` CRUD endpoints (list + aggregated counts) and `/albums/[albumId]` for detail fetching.
- [ ] Build `/api/projects/[projectId]/photos/settings` GET/PUT covering General, Inbound Emails, Photos from Other Tools, and ensure validation for default album selectors referenced in metadata.
- [ ] Build `/api/projects/[projectId]/photos/permissions` GET/PUT operations that map to the “None/Read Only/Standard/Admin” columns.

---

## Phase 3: Photos Grid UI (pages/photos)

- [ ] Implement page header (Cmd+K search button, “More” tab, `Export`, `Upload`, inline search icon) exactly as captured in metadata.
- [ ] Implement `Add Filter` dropdown offering multi-select chips for Locations, Albums, Privacy, Date Range, Tags (three `rw-dropdownlist` controls plus a date input from metadata).
- [ ] Implement Bulk Actions toolbar (select all, clear selections, “Cancel/Update” buttons) displayed when rows are checked.
- [ ] Implement inline search input with clear buttons (three `clear-field hidden` spans show active states) for quick filtering inside the Add Filter widget.
- [ ] Implement “List: All” dropdown and saved list management UI (rename, duplicate, delete) triggered by `StyledDropdownButton` (index 15).
- [ ] Render list/grid of photo cards with checkboxes, thumbnail preview, file name styled link, date line, quick actions (map pin icon, kebab) – match markup seen in `pages/map` card list.
- [ ] Provide keyboard shortcuts + focus states for search, Add Filter, Bulk Actions to align with Procore behavior.
- [ ] Implement Export menu (CSV, PDF, ZIP) accessed via the `Export` dropdown button captured in metadata index 2.
- [ ] Ensure responsive behavior down to tablet widths (metadata shows 31 buttons; confirm layout stacking).
- [ ] Wire `Upload` CTA to the modal built in Phase 1 and keep disabled/enabled states consistent.

---

## Phase 4: Map Experience (pages/map)

- [ ] Build split-panel layout: fixed-width left column listing photos (checkbox, thumbnail, file name, `Find on Map` button) and right column containing a MapLibre map with controls (`maplibregl-ctrl-*`).
- [ ] Implement `Find on Map` button per list item that pans/zooms to the specific coordinate, highlights the marker, and optionally bounces the card (observed `data-cy="find-on-map-button"` buttons).
- [ ] Add coordinate input widget at top-right of the map (text input + Copy/Delete/Close buttons) matching `data-testid="coordinate-input"` markup.
- [ ] Provide “Map Filter” select + clear icon (metadata index 34/35) for applying location presets from saved filters.
- [ ] Maintain shared selection + bulk actions between the map list and the grid view (select on map updates selection count, and vice versa).
- [ ] Support Map basemap switcher + scale (elements present in DOM) and ensure map honors privacy (private photos must not leak on shared URLs).

---

## Phase 5: Timeline View (pages/timeline)

- [ ] Implement chronological list of photo groups labeled by month/day (`timeline_photoGroup__` and repeated `photoCard_*` classes) sorted newest-first as the crawl shows.
- [ ] Provide Day/Week/Month toggle + grouped switch (observed in album detail pages) and tie into timeline API buckets.
- [ ] Add inline date range picker (placeholder `mm/dd/yyyy` in album detail metadata) enabling jumping to a specific date.
- [ ] Support infinite scroll / paginator drop-down (119 dropdown items in metadata) for navigating older periods.
- [ ] Maintain shared Bulk Actions, filters, search, and `Upload` entry from the Photos grid when timeline view is active.

---

## Phase 6: Albums & Recycle Bin

### 6.1 Albums List (pages/albums)

- [ ] Render album cards with name, photo count, subscribe toggle, lock/trash icons, and action menu (“Please Confirm” modal strings appear twice per card).
- [ ] Implement “Create Album”, “Add Filter”, “Reorder”, and confirmation workflows (Cancel/Confirm buttons repeated in metadata).
- [ ] Display privacy badge (lock icon) and `Subscribe` text exactly as captured.
- [ ] Implement modals for deleting an album (with Are you sure copy) and for reordering (table with `reorderAlbumsModal_borderCollapse__8zGy4` styling).

### 6.2 Album Detail (pages/562949957045694 & 562949957592422)

- [ ] Build album header containing album title, privacy indicator, `Add Filter`, date picker, and Day/Week/Month toggle switch.
- [ ] Render grouped photo sections by month with group-level checkboxes (`albumShow_selectGroup__`), `photoCard_container__` entries, and info block (date, description, icons).
- [ ] Implement paginator drop-down (indices 4-57 & 65-118 in metadata) showing page numbers 1-48; ensure keyboard navigation works.
- [ ] Provide `List` actions (Add to Album, Remove, Share, Download) inside each card overlay to match expected Procore behavior.

### 6.3 Recycle Bin (pages/recycle_bin)

- [ ] Build list/table showing deleted photos, with `Delete` (permanent) and `Restore` buttons plus Add Filter dropdown.
- [ ] Ensure warning banners + counts reflect number of deleted items, and disable actions when selection empty.
- [ ] Surface metadata like original album, deleted_by, deleted_at for auditing.

---

## Phase 7: Settings & Permissions

### 7.1 General & Inbound Email Settings (pages/settings, pages/configure_tab)

- [ ] Build General section toggles: “Add new image categories to top/bottom” (radio `root_image_category_add_new_at_top`), “Uploaded images default to private” (`root_uploaded_images_private__checkbox`), etc.
- [ ] Implement Inbound Emails radio group (`root_inbound_email_options` has 3 entries) controlling who can email photos in, plus exposed inbound email address with copy CTA.
- [ ] Implement “Photos from Other Tools” checkboxes for Drawings, Daily Logs, Punch List plus subordinate options (“Make photos private by default”, “Include photos from private Punch List”).
- [ ] Provide default album selectors for each tool (StyledSelectButton values `Photos from Drawings`, `Photos From Daily Log`, `Photos from Defect List`).
- [ ] Add `Cancel` + `Save Changes` sticky footer matching the crawl, with disabled state until form dirty.

### 7.2 Permissions Table (pages/permissions)

- [ ] Render table columns exactly: Name, Company, Actions, None, Read Only, Standard, Admin (sortable columns).
- [ ] Implement row search + pagination (button `react-aria1563335423-:r8s:`) identical to metadata.
- [ ] Wire toggles so selecting a permission level updates backend via Phase 2 API and re-fetches.
- [ ] Provide quick links on user names (StyledLink) to open Directory person pages (per `linkDetails` indexes 6-15).
- [ ] Mirror Procore’s “More” tab duplication (two “More” dropdowns appear) for nav parity.

### 7.3 Notifications / Subscribe

- [ ] Ensure album “Subscribe” toggles hook into user preference table so notifications fire when new photos added to an album.

---

## Phase 8: Testing & Verification

- [ ] Add unit tests for repositories/services (photos, albums, lists, settings, permissions) with fixtures derived from crawl metadata.
- [ ] Add Playwright e2e specs for each major surface:
  - `photos-grid.spec.ts` (filters, bulk actions, upload entry point, export)
  - `photos-map.spec.ts` (map selection, coordinate copy, map filter)
  - `photos-timeline.spec.ts` (day/week/month toggle, pagination)
  - `photos-albums.spec.ts` (cards, create/reorder/delete, album detail interactions)
  - `photos-settings.spec.ts` (general, inbound emails, other tool imports)
  - `photos-permissions.spec.ts` (role toggles, search, pagination)
  - `photos-recycle-bin.spec.ts` (restore/delete)
- [ ] Configure screenshot regression tests comparing our UI against reference PNGs under `PLANS/photos/crawl-photos/pages/**/screenshot.png`.
- [ ] Wire quality gates:
  - TypeScript: `npm run typecheck --prefix frontend`
  - ESLint: `npm run lint --prefix frontend`
  - Tests: `npx playwright test --grep "photos"`
  - API smoke: `curl http://localhost:3000/api/projects/<id>/photos`
- [ ] Document manual verification checklist (map interactions, inbound email ingestion) before marking feature complete.

---

## Reference Artifacts

- Crawl data (DOM, metadata, screenshots): `PLANS/photos/crawl-photos/pages/**`
  - Main grid: `pages/photos`
  - Map: `pages/map`
  - Timeline: `pages/timeline`
  - Albums: `pages/albums`, `pages/562949957045694`, `pages/562949957592422`
  - Settings: `pages/settings`, `pages/configure_tab`
  - Permissions: `pages/permissions`
  - Recycle Bin: `pages/recycle_bin`
- Reports: `PLANS/photos/crawl-photos/reports/photos-summary.json`, `detailed-report.json`, `link-graph.json`

Leverage these assets for parity reviews, styling references, and test baselines.
