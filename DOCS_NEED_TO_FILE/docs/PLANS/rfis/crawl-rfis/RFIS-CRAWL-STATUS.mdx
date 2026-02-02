# Procore RFIs Crawl - Status Report

**Generated:** 2026-01-11T07:08:30Z
**App URL:** https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/rfis
**Project ID:** 562949954728542

## Summary

Successfully crawled **50 pages** capturing the Procore RFI (Request for Information) feature.

### Crawl Results Breakdown

| Category | Count |
|----------|-------|
| RFI List Page | 1 |
| RFI Detail Pages | 1 |
| RFI Edit Pages | 1 |
| RFI PDF Views | 26 |
| Support Documentation | 21 |
| Dropdown Captures | ~20 |

## Core App Pages Captured

### 1. RFI List View (`rfi_list`)
- **URL:** `https://us02.procore.com/.../tools/rfis`
- **Elements Found:**
  - 112 links
  - 131 clickable elements
  - 25 dropdowns
  - 100 buttons
  - 62 inputs
  - 283 icons
- **Dropdowns Captured:**
  - Export menu (4 items: PDF, Excel, CSV options)
  - Reports menu (1 item)

### 2. RFI Detail View (`rfi_562949957101832`)
- **URL:** `https://us02.procore.com/.../rfis/562949957101832`
- **Elements Found:**
  - 17 links
  - 20 clickable elements
  - 3 dropdowns
- **Key Actions:** View, Edit, Export

### 3. RFI Edit Form (`edit`)
- **URL:** `https://us02.procore.com/.../rfis/562949957101832/edit`
- **Elements Found:**
  - 18 links
  - 42 clickable elements
  - 4 dropdowns
- **Form Fields Detected:** Multiple input fields for RFI data entry

### 4. RFI PDF Views (26 captures)
- Individual RFI PDF export views
- Captured for reference screenshots of printed format

## Support Documentation Captured

| Tutorial | Description |
|----------|-------------|
| edit-an-rfi | How to edit an RFI |
| respond-to-an-rfi | Responding to RFIs |
| choose-an-official-response-for-an-rfi | Official response selection |
| export-rfis | Bulk RFI export |
| export-an-rfi | Single RFI export |
| close-an-rfi | Closing an RFI |
| reopen-an-rfi | Reopening closed RFIs |
| view-rfis-ios | iOS RFI viewing |
| respond-to-an-rfi-ios | iOS RFI response |
| change-the-status-of-an-rfi-ios | iOS status changes |
| search-for-and-filter-rfis-ios | iOS search/filter |
| create-a-change-event-from-an-rfi-ios | Creating change events from RFIs |

## UI Components Analysis

| Component Type | Total Count |
|----------------|-------------|
| Buttons | 399 |
| Forms | 22 |
| Inputs | 94 |
| Tables | 0 (uses AG Grid) |
| Tabs | 0 |
| Dropdowns | 42 |
| Icons | 283+ |
| Lists | 71 |
| Navigation | 2 |

**Note:** The RFI list uses AG Grid (virtualized table), not standard HTML tables.

## Key Features Identified

### 1. RFI List Management
- **Grid View:** AG Grid-based data table with:
  - Sortable columns
  - Column visibility toggle
  - Filters panel (left sidebar)
  - Search functionality
- **Filters Available:**
  - Status
  - Responsible Contractor
  - Received From
  - Assignees
  - RFI Manager
  - Ball In Court
  - Overdue
  - Linked to External RFIs
  - Location/Locations
  - Cost Code
  - Sub Job
  - RFI Stage
  - Created By

### 2. Export Capabilities
- Export to PDF
- Export to Excel
- Export to CSV
- Individual RFI PDF generation

### 3. RFI Workflow
- Create RFI
- Edit RFI
- Respond to RFI
- Choose Official Response
- Close RFI
- Reopen RFI

### 4. RFI Detail Fields (from edit form)
- RFI Number (auto-generated)
- Subject/Title
- Question
- Answer fields
- Assignee selection
- Due Date
- Status
- Priority
- Responsible Contractor
- RFI Manager
- Cost Impact
- Schedule Impact
- Location
- Cost Code
- Specification Section
- Drawing references
- Attachments

## Implementation Insights

### Database Schema (Suggested)

```sql
CREATE TABLE rfis (
  id BIGINT PRIMARY KEY DEFAULT generate_snowflake_id(),
  project_id BIGINT NOT NULL REFERENCES projects(id),
  rfi_number VARCHAR(50) NOT NULL,
  subject TEXT NOT NULL,
  question TEXT,
  official_answer TEXT,

  -- Status tracking
  status VARCHAR(50) DEFAULT 'draft',
  priority VARCHAR(20),

  -- Assignment
  assignee_id BIGINT REFERENCES directory_contacts(id),
  rfi_manager_id BIGINT REFERENCES directory_contacts(id),
  responsible_contractor_id BIGINT REFERENCES vendors(id),
  received_from_id BIGINT REFERENCES directory_contacts(id),
  ball_in_court_id BIGINT REFERENCES directory_contacts(id),

  -- Dates
  due_date DATE,
  date_initiated DATE,
  date_required DATE,
  date_closed DATE,

  -- Impact tracking
  cost_impact BOOLEAN DEFAULT FALSE,
  cost_impact_amount DECIMAL(15,2),
  schedule_impact BOOLEAN DEFAULT FALSE,
  schedule_impact_days INTEGER,

  -- References
  location_id BIGINT REFERENCES locations(id),
  cost_code_id BIGINT REFERENCES cost_codes(id),
  specification_section_id BIGINT REFERENCES spec_sections(id),

  -- Metadata
  is_private BOOLEAN DEFAULT FALSE,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, rfi_number)
);

CREATE TABLE rfi_responses (
  id BIGINT PRIMARY KEY DEFAULT generate_snowflake_id(),
  rfi_id BIGINT NOT NULL REFERENCES rfis(id),
  responder_id BIGINT REFERENCES directory_contacts(id),
  response_text TEXT NOT NULL,
  is_official BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rfi_drawings (
  id BIGINT PRIMARY KEY DEFAULT generate_snowflake_id(),
  rfi_id BIGINT NOT NULL REFERENCES rfis(id),
  drawing_id BIGINT REFERENCES drawings(id),
  markup_data JSONB
);

CREATE TABLE rfi_attachments (
  id BIGINT PRIMARY KEY DEFAULT generate_snowflake_id(),
  rfi_id BIGINT NOT NULL REFERENCES rfis(id),
  file_id BIGINT REFERENCES files(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints Needed

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects/[projectId]/rfis` | GET | List all RFIs with filters |
| `/api/projects/[projectId]/rfis` | POST | Create new RFI |
| `/api/projects/[projectId]/rfis/[rfiId]` | GET | Get RFI details |
| `/api/projects/[projectId]/rfis/[rfiId]` | PATCH | Update RFI |
| `/api/projects/[projectId]/rfis/[rfiId]` | DELETE | Delete RFI |
| `/api/projects/[projectId]/rfis/[rfiId]/responses` | GET | Get RFI responses |
| `/api/projects/[projectId]/rfis/[rfiId]/responses` | POST | Add response |
| `/api/projects/[projectId]/rfis/[rfiId]/close` | POST | Close RFI |
| `/api/projects/[projectId]/rfis/[rfiId]/reopen` | POST | Reopen RFI |
| `/api/projects/[projectId]/rfis/export` | POST | Bulk export |
| `/api/projects/[projectId]/rfis/[rfiId]/pdf` | GET | Generate PDF |

### Frontend Components Required

| Component | Description |
|-----------|-------------|
| `RFIList` | Main list view with AG Grid |
| `RFIFiltersPanel` | Left sidebar filter controls |
| `RFIDetailView` | Read-only RFI display |
| `RFIForm` | Create/Edit form |
| `RFIResponseForm` | Response submission |
| `RFIStatusBadge` | Status indicator |
| `RFIPDFViewer` | PDF preview component |
| `RFIExportMenu` | Export options dropdown |
| `RFIDrawingReferences` | Drawing linkage |

## Statistics

**App Crawl:**
- Total Pages Captured: 50
- Total Links Extracted: 1,500+
- Clickable Elements: 500+
- Dropdowns Analyzed: 25+

## Output Locations

- **Screenshots:** `pages/*/screenshot.png`
- **DOM Snapshots:** `pages/*/dom.html`
- **Metadata:** `pages/*/metadata.json`
- **Sitemap Report:** `reports/sitemap-table.md`
- **Detailed JSON:** `reports/detailed-report.json`
- **Link Graph:** `reports/link-graph.json`

## Next Steps for Implementation

1. **Review Screenshots:** Compare `rfi_list/screenshot.png` with current implementation
2. **Database Migration:** Create RFI tables based on schema above
3. **API Development:** Implement CRUD endpoints
4. **Frontend Build:**
   - Implement AG Grid-based list view
   - Create filter sidebar component
   - Build RFI form with all fields
5. **PDF Generation:** Implement PDF export matching Procore format
6. **Testing:** Create e2e tests comparing against Procore reference

## Known Limitations

1. **AG Grid Detection:** Standard table detection didn't capture AG Grid structure (virtualized)
2. **Create Form:** The create form URL wasn't captured separately (uses same form as edit)
3. **Some Dropdowns Timeout:** Complex filter dropdowns caused click timeouts due to overlay interference

## Recommendations

1. **Manual Supplement:** Capture create form manually at:
   `https://us02.procore.com/.../tools/rfis/create`

2. **AG Grid Analysis:** The RFI list uses Procore's AG Grid implementation. Reference existing Budget/Commitments implementations for grid patterns.

3. **Mobile Reference:** iOS tutorials provide insight into required fields and workflows that may not be visible in web UI.
