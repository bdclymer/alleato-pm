# Procore Specifications Crawl - Status Report

**Generated:** 2026-01-11T08:53:00.000Z
**App URL:** https://us02.procore.com/562949954728542/project/specification_sections
**Project ID:** 562949954728542

## Summary

Successfully crawled:
- **App Pages:** 59 screenshots captured (including tabs, dropdowns, expanded states)
- **Main Feature Pages:** 6 unique URL pages
- **Tabs/Variations:** 53 tab and state captures

## App Crawl Results

### Core Pages Captured

1. **Main Specifications List** (`specification_sections/`)
   - Table with 14 spec sections across divisions
   - Columns: Number, Description, Revision, Issued Date, Received Date, Set
   - Filters: All Divisions, Current (13)
   - Actions: Create Division, Create Specification, Upload, Export

2. **Configure Tab** (`specification_sections/configure_tab`)
   - Communication Groups configuration
   - Subscriber management for notifications

3. **Project Home** (context page)
   - Project overview and navigation

4. **Conversations** (related tool)

5. **Support Documentation** (external)
   - Procore support page for Specifications

### Specification Sections Captured

The tool manages the following CSI MasterFormat divisions:

| Number | Description |
|--------|-------------|
| 03 00 00 | Concrete |
| 06 12 00 | Structural Foam |
| 07 40 00 | Roofing |
| 08 00 00 | Doors, Frames & Hardware |
| 09 00 00 | Flooring |
| 09 20 00 | Drywall & Framing |
| 09 90 00 | Painting |
| 10 28 00 | Bathroom Accessories |
| 12 00 00 | Cabinets & Countertops |
| 21 00 00 | Fire Sprinkler |
| 22 00 00 | Plumbing |
| 23 00 00 | HVAC |
| 26 00 00 | Electrical |
| 100 | Unclassified |

### Dropdowns & Menus Captured

1. **Export Menu** (4 items)
   - Export to various formats

2. **Division Actions Menu**
   - Edit Name
   - Edit Number
   - Delete

3. **More Menu** (navigation)
   - Additional tool options

### Tab Variations Captured

- Create Divisions form
- Create Spec Sections form
- Division-specific views
- Edit/Info actions for each spec section

## Structure Analysis

### Tables Detected

1. **New Division Table** (`spec_new_division_table`)
   - Headers: Number, Description
   - For creating new divisions

2. **New Section Table** (`spec_new_section_table`)
   - Headers: Division, Number, Description
   - For creating new spec sections

3. **Main Specifications Table** (`specifications-table`)
   - Headers: Number, Description, Revision, Issued Date, Received Date, Set
   - 14 rows (spec sections)
   - Sticky header wrapper

### UI Components

| Component | Count |
|-----------|-------|
| Buttons | 14 |
| Forms | 2 |
| Inputs | 33 |
| Tables | 4 |
| Navigation | 2 |
| Lists | 1 |
| Icons | 28 |
| Divisions | 12 |
| Sections | 7 |
| Revisions | 15 |

### Key Features Identified

1. **Division Management**
   - Create new divisions
   - Edit division name/number
   - Delete divisions (with restrictions)

2. **Specification Sections**
   - Create spec sections within divisions
   - CSI MasterFormat numbering (XX XX XX)
   - Edit/Info actions per section

3. **Revision Tracking**
   - Revision numbers per spec
   - Issued Date tracking
   - Received Date tracking
   - Set associations

4. **Export Capabilities**
   - Export to multiple formats

5. **Upload Functionality**
   - Upload spec documents

6. **Subscription/Notifications**
   - Subscribe to spec changes
   - Communication group management

7. **Navigation Views**
   - Specifications (main list)
   - All Revisions view
   - Trash (deletion log)

## Implementation Insights

### Data Model Considerations

```sql
-- Specification Divisions
CREATE TABLE specification_divisions (
  id BIGINT PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id),
  number VARCHAR(10) NOT NULL,  -- e.g., "03", "100"
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, number)
);

-- Specification Sections (Specs)
CREATE TABLE specification_sections (
  id BIGINT PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id),
  division_id BIGINT NOT NULL REFERENCES specification_divisions(id),
  number VARCHAR(20) NOT NULL,  -- CSI format: "03 00 00"
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, number)
);

-- Specification Revisions
CREATE TABLE specification_revisions (
  id BIGINT PRIMARY KEY,
  spec_section_id BIGINT NOT NULL REFERENCES specification_sections(id),
  revision_number INT NOT NULL DEFAULT 0,
  issued_date DATE,
  received_date DATE,
  set_id BIGINT REFERENCES specification_sets(id),
  file_url TEXT,  -- Uploaded PDF/document
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Specification Sets
CREATE TABLE specification_sets (
  id BIGINT PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Specification Subscribers
CREATE TABLE specification_subscribers (
  id BIGINT PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id),
  user_id BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);
```

### API Endpoints Needed

```
GET    /api/projects/{projectId}/specifications/divisions
POST   /api/projects/{projectId}/specifications/divisions
PATCH  /api/projects/{projectId}/specifications/divisions/{divisionId}
DELETE /api/projects/{projectId}/specifications/divisions/{divisionId}

GET    /api/projects/{projectId}/specifications/sections
POST   /api/projects/{projectId}/specifications/sections
GET    /api/projects/{projectId}/specifications/sections/{sectionId}
PATCH  /api/projects/{projectId}/specifications/sections/{sectionId}
DELETE /api/projects/{projectId}/specifications/sections/{sectionId}

GET    /api/projects/{projectId}/specifications/sections/{sectionId}/revisions
POST   /api/projects/{projectId}/specifications/sections/{sectionId}/revisions
GET    /api/projects/{projectId}/specifications/revisions/{revisionId}
PATCH  /api/projects/{projectId}/specifications/revisions/{revisionId}

POST   /api/projects/{projectId}/specifications/upload
GET    /api/projects/{projectId}/specifications/export

GET    /api/projects/{projectId}/specifications/subscribers
POST   /api/projects/{projectId}/specifications/subscribers
DELETE /api/projects/{projectId}/specifications/subscribers/{userId}

GET    /api/projects/{projectId}/specifications/deletion-log
POST   /api/projects/{projectId}/specifications/restore/{sectionId}
```

### Frontend Components

1. **SpecificationsPage** - Main page container
2. **SpecificationsTable** - Main data table with divisions
3. **SpecificationDivisionRow** - Collapsible division header
4. **SpecificationSectionRow** - Individual spec section row
5. **CreateDivisionModal** - Modal for creating divisions
6. **CreateSpecificationModal** - Modal for creating spec sections
7. **EditDivisionInline** - Inline editing for division name/number
8. **SpecificationRevisionDetail** - Revision detail view
9. **SpecificationConfigureTab** - Subscriber/communication settings
10. **SpecificationExportMenu** - Export dropdown menu
11. **SpecificationUploadDialog** - File upload dialog
12. **SpecificationFilters** - Division and status filters

## Statistics

**App Crawl:**
- Screenshots captured: 59
- Page directories: 59
- Links extracted: 33 (main page)
- Clickable elements: 17 (main page)
- Dropdowns: 8 (main page)
- Tree items: 12

## Output Locations

- **Crawl output:** `documentation/*project-mgmt/in-progress/specifications/crawl-specifications/`
- **Screenshots:** `crawl-specifications/pages/*/screenshot.png`
- **DOM snapshots:** `crawl-specifications/pages/*/dom.html`
- **Metadata:** `crawl-specifications/pages/*/metadata.json`

## Key URLs for Development

- Main list: `/[projectId]/specifications`
- Configure: `/[projectId]/specifications/configure`
- All Revisions: `/[projectId]/specifications/all-revisions`
- Trash: `/[projectId]/specifications/deletion-log`
- Revision Detail: `/[projectId]/specifications/revisions/[revisionId]`
- Revision Edit: `/[projectId]/specifications/revisions/[revisionId]/edit`

## Next Steps for Implementation

1. Review captured screenshots against requirements
2. Define database schema based on analyzed structure
3. Create Supabase migration for spec tables
4. Implement API routes for CRUD operations
5. Build frontend components matching captured UI
6. Implement file upload for spec documents
7. Add revision tracking functionality
8. Implement subscriber notifications
9. Create export functionality
10. Add RLS policies for data security
