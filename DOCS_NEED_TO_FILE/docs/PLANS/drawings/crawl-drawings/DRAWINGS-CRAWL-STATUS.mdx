# Procore Drawings Crawl - Status Report

**Generated:** 2026-01-11T08:45:00Z
**App URL:** https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/drawings/areas/562949954293344/revisions

## Summary

Successfully crawled the Procore Drawings feature:
- **Pages Captured:** 15 screenshots (including dropdowns and tabs)
- **Key Views:** Drawing list, revision viewer, sketch creation, email forwarding, QR codes
- **Feature Scope:** Drawing management, version control, sketches, related items, download logs

## App Crawl Results

### Core Pages Captured

| Page | Description | Screenshot |
|------|-------------|------------|
| drawings-revisions | Add Sketch form for a drawing revision | [View](pages/drawings-revisions/screenshot.png) |
| drawings-areas | Email forwarding form for drawings | [View](pages/drawings-areas/screenshot.png) |
| drawings-revisions_tab_qr_code | QR Code modal for drawing access | [View](pages/drawings-revisions_tab_qr_code/screenshot.png) |
| drawings-revisions_dropdown_4 | Full drawing viewer with markup toolbar | [View](pages/drawings-revisions_dropdown_4/screenshot.png) |
| drawings-areas_dropdown_2 | Drawing log list view (main table) | [View](pages/drawings-areas_dropdown_2/screenshot.png) |
| drawings-areas_dropdown_3 | Drawing detail with versions panel | [View](pages/drawings-areas_dropdown_3/screenshot.png) |

### Feature Analysis from Screenshots

#### 1. Drawing Log (Main List View)
- **Table columns:** Drawing No, Drawing Title, Revision, Drawing Date, Received Date, Set, Status
- **Filters:** Search, Discipline, Type dropdowns
- **Actions:** Reports dropdown, Export (PDF), Create Locations button
- **Bulk operations:** Checkbox selection per row
- **Status values:** Published (with status badges)

#### 2. Drawing Viewer (Fullscreen)
- **Navigation:** Previous/Next drawing arrows, dropdown selectors
- **Top toolbar:** Download, QR Code, Markup, Filter, Info, Search, Activity, Close
- **Drawing info:** Drawing number (A213), Title, Revision set selector
- **Viewer controls:** Zoom in/out, thumbnail navigation
- **Markup capabilities:** Drawing annotation tools visible

#### 3. Drawing Detail Page
- **Tabs:** General, Sketches (0), Download Log (34), Related Items (0), Emails (0), Change History (10)
- **Edit mode:** Full edit form with fields
- **Versions panel:** Revision number, Drawing Set, Drawing Date, Received Date, Status
- **Actions:** Open, Info, 3-dot menu per version

#### 4. Sketch Creation Form
- **Fields:** Number*, Date*, Name*, Description, File*
- **Rich text editor:** Full formatting toolbar (bold, italic, lists, alignment, etc.)
- **File upload:** Drag and drop or Attach File button
- **Actions:** Cancel, Create

#### 5. Email Forwarding
- **Fields:** To (people search), CC, Subject (pre-filled), Attachments, Message
- **Private checkbox:** Control email visibility
- **Rich text editor:** Same formatting as sketch form

#### 6. QR Code Feature
- **Modal display:** Project name, Drawing title
- **QR code:** Scannable code for mobile access
- **Actions:** Cancel, Print QR Code

### Structure Analysis

**Tables Detected:**
- Drawing Log table with columns: Drawing No, Drawing Title, Revision, Drawing Date, Received Date, Set, Status
- Versions table with columns: Revision, Drawing Set, Drawing Date, Received Date, Status
- Sketch table with form fields

**Dropdowns & Interactions:**
- Reports dropdown (3 menu items)
- Export dropdown (2 menu items: PDF option visible)
- Drawing selector dropdown
- Revision set selector dropdown
- Discipline filter
- Type filter
- Attach File menu (Upload from computer, Select from Procore)

**UI Components Identified:**
- 21+ buttons per page
- Rich text editors (TinyMCE-style)
- File upload with drag-and-drop
- Modal dialogs (QR Code, etc.)
- Tab navigation
- Breadcrumb navigation
- Status badges
- Thumbnail previews
- Drawing canvas with markup tools

## Key Features Identified

### Primary Features
1. **Drawing Log Management** - List, search, filter drawings
2. **Drawing Viewer** - Full-screen viewing with zoom and navigation
3. **Version Control** - Track revisions with drawing sets
4. **Markup/Annotation** - Drawing markup tools
5. **Sketches** - Create and attach sketches to drawings
6. **QR Codes** - Generate QR codes for mobile access

### Secondary Features
1. **Download Log** - Track who downloaded drawings
2. **Related Items** - Link to other project items
3. **Emails** - Forward drawings with messages
4. **Change History** - Audit trail of modifications
5. **Export** - PDF export functionality
6. **Reports** - Drawing-related reports

### Areas/Folders
- Drawing Areas concept for organizing drawings
- Discipline and Type categorization

## Implementation Insights

### Data Model Considerations

```sql
-- Drawing Areas (folders)
CREATE TABLE drawing_areas (
  id BIGINT PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drawings
CREATE TABLE drawings (
  id BIGINT PRIMARY KEY,
  drawing_area_id BIGINT REFERENCES drawing_areas(id),
  project_id BIGINT REFERENCES projects(id),
  drawing_number VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  discipline VARCHAR(100),
  drawing_type VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drawing Revisions
CREATE TABLE drawing_revisions (
  id BIGINT PRIMARY KEY,
  drawing_id BIGINT REFERENCES drawings(id),
  revision_number INTEGER DEFAULT 0,
  drawing_set VARCHAR(255),
  drawing_date DATE,
  received_date DATE,
  status VARCHAR(50) DEFAULT 'draft', -- draft, published
  file_url TEXT,
  file_name VARCHAR(255),
  file_size BIGINT,
  is_current BOOLEAN DEFAULT true,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drawing Sketches
CREATE TABLE drawing_sketches (
  id BIGINT PRIMARY KEY,
  drawing_revision_id BIGINT REFERENCES drawing_revisions(id),
  sketch_number VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sketch_date DATE,
  file_url TEXT,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drawing Download Log
CREATE TABLE drawing_downloads (
  id BIGINT PRIMARY KEY,
  drawing_revision_id BIGINT REFERENCES drawing_revisions(id),
  downloaded_by BIGINT REFERENCES users(id),
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET
);

-- Drawing Related Items
CREATE TABLE drawing_related_items (
  id BIGINT PRIMARY KEY,
  drawing_id BIGINT REFERENCES drawings(id),
  related_type VARCHAR(50), -- rfi, submittal, punch_item, etc.
  related_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints Needed

```
# Drawing Areas
GET    /api/projects/{projectId}/drawing-areas
POST   /api/projects/{projectId}/drawing-areas
GET    /api/projects/{projectId}/drawing-areas/{areaId}
PUT    /api/projects/{projectId}/drawing-areas/{areaId}
DELETE /api/projects/{projectId}/drawing-areas/{areaId}

# Drawings
GET    /api/projects/{projectId}/drawings
POST   /api/projects/{projectId}/drawings
GET    /api/projects/{projectId}/drawings/{drawingId}
PUT    /api/projects/{projectId}/drawings/{drawingId}
DELETE /api/projects/{projectId}/drawings/{drawingId}

# Drawing Revisions
GET    /api/projects/{projectId}/drawings/{drawingId}/revisions
POST   /api/projects/{projectId}/drawings/{drawingId}/revisions
GET    /api/projects/{projectId}/drawings/{drawingId}/revisions/{revisionId}
PUT    /api/projects/{projectId}/drawings/{drawingId}/revisions/{revisionId}
DELETE /api/projects/{projectId}/drawings/{drawingId}/revisions/{revisionId}
GET    /api/projects/{projectId}/drawings/{drawingId}/revisions/{revisionId}/download
GET    /api/projects/{projectId}/drawings/{drawingId}/revisions/{revisionId}/qr-code

# Sketches
GET    /api/projects/{projectId}/drawing-revisions/{revisionId}/sketches
POST   /api/projects/{projectId}/drawing-revisions/{revisionId}/sketches
GET    /api/projects/{projectId}/drawing-revisions/{revisionId}/sketches/{sketchId}
DELETE /api/projects/{projectId}/drawing-revisions/{revisionId}/sketches/{sketchId}

# Download Log
GET    /api/projects/{projectId}/drawings/{drawingId}/download-log

# Related Items
GET    /api/projects/{projectId}/drawings/{drawingId}/related-items
POST   /api/projects/{projectId}/drawings/{drawingId}/related-items
DELETE /api/projects/{projectId}/drawings/{drawingId}/related-items/{itemId}

# Emails
POST   /api/projects/{projectId}/drawings/{drawingId}/send-email

# Export
GET    /api/projects/{projectId}/drawings/export?format=pdf&ids=...
```

### Frontend Components Required

1. **DrawingLogTable** - Main list view with filtering, sorting, bulk actions
2. **DrawingViewer** - Full-screen drawing viewer with zoom/pan
3. **DrawingDetailPage** - Tabbed detail view
4. **RevisionPanel** - Version history sidebar
5. **SketchForm** - Create/edit sketch modal
6. **EmailDrawingDialog** - Forward drawing modal
7. **QRCodeModal** - Display/print QR code
8. **DrawingUploader** - File upload with drag-and-drop
9. **MarkupToolbar** - Drawing annotation tools (future)
10. **DrawingAreaTree** - Folder/area navigation
11. **DrawingFilters** - Discipline, Type, Search filters
12. **DownloadLogTable** - Download history view
13. **ChangeHistoryTimeline** - Audit log display

## Statistics

**App Crawl:**
- Pages captured: 15
- Screenshots: 15 files (1.6MB total)
- Links extracted: 62+ per page
- Clickable elements: 87+ per page
- Dropdowns captured: 5 Reports/Export menus
- Tabs captured: 2 tab views

## Output Locations

- **Screenshots:** `crawl-drawings/pages/*/screenshot.png`
- **DOM snapshots:** `crawl-drawings/pages/*/dom.html`
- **Metadata:** `crawl-drawings/pages/*/metadata.json`

## Next Steps for Implementation

1. **Database:** Create tables for drawing_areas, drawings, drawing_revisions, drawing_sketches
2. **API:** Implement CRUD endpoints for drawings and revisions
3. **Storage:** Set up file storage for drawing PDFs/images
4. **Frontend:** Build DrawingLogTable component first
5. **Viewer:** Implement basic drawing viewer (PDF.js or similar)
6. **Versioning:** Implement revision tracking logic
7. **Features:** Add sketches, QR codes, email forwarding
8. **Markup:** Consider markup/annotation as future enhancement

## Notes

- Drawing viewer uses a tile-based image rendering system
- QR codes link directly to mobile-accessible drawing URLs
- Rich text editor appears to be TinyMCE-based
- Status values include: Published, Draft
- Revision sets group related drawings together