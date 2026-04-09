# Procore Research: Drawings Gap Analysis

**Date:** 2026-04-09
**Question:** Compare our drawings implementation to Procore
**Sources used:** Tier 1 (RAG) | Tier 2 (Manifest — incomplete, recrawl needed) | Tier 3 (WebFetch)

---

## Procore Drawings — What Procore Has

### Core Upload & Revision Workflow
- **Upload drawings** — bulk PDF upload with progress indicator + email notification when complete
- **OCR auto-fill** — Procore reads drawing number, title, and discipline directly from the PDF
- **Duplicate detection on upload** — If drawing number matches an existing one, Procore auto-marks it as a revision (no manual wiring required)
- **Upload Drawing Revisions** — Same upload flow, Procore detects it as a newer revision
- **Publish/Unpublish** — Drawings start as "Unpublished" after upload. Must be explicitly published to be visible to the team. Moving to a new area also resets to Unpublished.
- **Change a drawing version's number** — Rename revision numbers after upload

### Statuses
Procore's primary states are **Published** and **Unpublished**. Drawings can also be marked **Obsolete** (shown gray/italicized in the All Sets and Revisions report). Our statuses (draft/under_review/approved/superseded/void) are not aligned with Procore's model.

### Organization
- **Drawing Areas** — Hierarchical sections for multi-building projects. Each area can have its own drawings with separate numbering.
- **Drawing Sets** — Groups of drawings issued together (e.g., "Bid Set", "Construction Set"). Published vs Unpublished counts shown per set.
- **Disciplines** — Procore allows renaming disciplines (custom names). Drawings are grouped and reordered within disciplines.
- **Reorder drawings within a discipline** — Manual sort order control
- **Move drawings to another drawing area** — Move action available

### Viewing & Markup
- **Full drawing viewer** — Zoom, pan, multi-sheet navigation
- **Markup toolbar** — Select/Multi/Lasso, shapes, text, line width, fill, color picker
- **Personal vs Published markups** — Users have personal (private) markups; publishing shares them with the team
- **Markup inheritance** — When a new revision is uploaded, all previous markups (except sketches) are automatically preserved on the new version
- **Markup Activity Feed** — View activity log of all markup actions
- **Edit/Delete markups**
- **Filter markups**

### Linking & Related Items
- **Link items on a drawing** — Pin RFIs, submittals, coordination issues, observations, inspections to specific locations on the drawing
- **Revision Related Items** — Items linked to a specific revision
- **Drawing Related Items** — Items linked across all revisions of a drawing
- **Automatic Drawing Sheet Linking** — Procore auto-creates hyperlinks between referenced sheet numbers
- **Add Links** — Manual hyperlinks within drawing content

### Download, Print & Export
- **Download individual drawings** — Current revision
- **Bulk download** — Select multiple drawings, download as zip
- **Print drawings** — Print via browser PDF viewer
- **Print/Generate QR codes** — QR codes per drawing for field access
- **Email drawings** — Send via email from within Procore
- **Export drawings log to PDF or CSV** — Full log export

### Reports
- **All Sets and Revisions Report** — Shows every drawing including obsolete ones; obsolete drawings appear gray/italicized
- **All Sketches Report** — View all sketches across all drawings

### Additional Features
- **Search text within drawings** — Full text search inside PDF content
- **Measurements** — Add measurements/dimensions to drawings
- **Offline viewing** — Mobile: view drawings offline
- **Mark as Obsolete** — Explicit action to obsolete a drawing

---

## Our Implementation — What We Have

| Feature | Status |
|---------|--------|
| List view (table/card/list) | ✅ Done |
| Upload dialog | ✅ Done |
| Drawing Areas (CRUD) | ✅ Done |
| Drawing Sets (CRUD) | ✅ Done |
| Revisions table | ✅ Done |
| Detail page with tabs | ✅ Done |
| Drawing viewer | ✅ Done |
| Download current revision | ✅ Done |
| Download individual revision | ✅ Done |
| Edit (number, title, discipline, type) | ✅ Done |
| Filters (discipline, type, status, area) | ✅ Done |
| Recycle Bin page | ✅ Done (shell) |
| Comments tab | ✅ Done |
| Export flag on table | ✅ Partial (enableExport: true, unknown format) |
| Pins API routes | ✅ API exists, not wired to detail UI |

---

## Gap Summary

### HIGH PRIORITY — Core Workflow Gaps

| Gap | Procore Behavior | Our Behavior | Impact |
|-----|-----------------|--------------|--------|
| **Publish/Unpublish workflow** | Drawings must be published to be visible to team. Start as Unpublished. | No publish concept — all drawings visible immediately | High — fundamental workflow difference |
| **Status model mismatch** | Published / Unpublished / Obsolete | draft / under_review / approved / superseded / void | High — statuses don't align with Procore |
| **Mark as Obsolete** | Explicit action, drawing shown gray/italicized | "Obsolete: No" field in detail view, no action wired | High — no way to obsolete a drawing |
| **Duplicate detection on upload** | Same drawing number = auto-detected as new revision | No detection — creates new drawing | High — users must manually manage revisions |
| **Bulk download** | Select multiple → download as zip | `enableRowSelection: false` — no bulk ops | Medium |
| **Move to another area** | Available as action | Not in edit form or detail actions | Medium |

### MEDIUM PRIORITY — Missing Features

| Gap | Notes |
|-----|-------|
| **OCR auto-fill** | Procore reads drawing #/title/discipline from PDF on upload — we show empty fields |
| **Compare revisions** | Procore generates a PDF diff (additions in color, removals in red) — not implemented |
| **Markup tools** | Sketches tab is empty state / coming soon — no markup at all |
| **Personal vs Published markups** | Not applicable until markup exists |
| **All Sets and Revisions Report** | We have the Drawing Sets list but no unified "all revisions" report |
| **Email drawings** | Shows "coming soon" toast in detail page |
| **Print / QR codes** | No print or QR generation |
| **Change revision number** | Shows "coming soon" in revision row dropdown |
| **Reorder within discipline** | No sort control on the list |
| **Rename disciplines** | Hardcoded `DRAWING_DISCIPLINES` array — cannot be customized per project |
| **Automatic sheet linking** | No auto-hyperlink between sheet references |

### LOW PRIORITY — Nice to Have

| Gap | Notes |
|-----|-------|
| **Search text within drawings** | Full PDF content search |
| **Measurements/dimensions tool** | In viewer |
| **Markup Activity Feed** | Activity log for markups |
| **All Sketches Report** | Cross-drawing sketches view |
| **Pins wired to detail UI** | API routes exist (`/pins/route.ts`, `/pins/[pinId]/route.ts`) but pins tab not present on detail page |

---

## Navigation Tabs — Comparison

| Procore | Our App |
|---------|---------|
| Drawing Areas view (default landing) | Current Drawings (default tab) |
| All Sets and Revisions Report | Drawing Sets tab |
| — | Recycle Bin tab |
| Markup Activity Feed | — |
| All Sketches Report | — |

Procore's default landing is the **drawing areas view** (organized by area/discipline). Our default is a flat list. For projects with many drawings this matters for usability.

---

## Detail Page Tabs — Comparison

| Procore | Our App |
|---------|---------|
| General | ✅ General |
| Markups | Sketches (empty/coming soon) |
| Links | — (not present) |
| Related Items (Revision) | ✅ Revision Related Items (empty) |
| Related Items (Drawing) | ✅ Drawing Related Items (empty) |
| Download Log | ✅ Download Log (empty) |
| Emails | ✅ Emails (coming soon) |
| Change History | ✅ Change History (empty) |
| Comments | ✅ Comments (implemented) |

---

## Sources

- https://v2.support.procore.com/product-manuals/drawings-project/tutorials
- https://v2.support.procore.com/product-manuals/drawings-project/tutorials/upload-drawing-revisions
- https://v2.support.procore.com/product-manuals/drawings-project/tutorials/compare-drawing-revisions
- https://v2.support.procore.com/product-manuals/drawings-project/tutorials/mark-up-a-drawing
- https://v2.support.procore.com/product-manuals/drawings-project/tutorials/upload-drawings
- https://v2.support.procore.com/product-manuals/drawings-project/tutorials/add-a-drawing-area
- https://v2.support.procore.com/product-manuals/drawings-project/tutorials/view-the-all-sets-and-revisions-report-in-the-drawings-tool
