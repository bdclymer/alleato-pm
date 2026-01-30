# Procore Submittals Crawl - Status Report

**Generated:** 2026-01-11T07:12:16Z
**App URL:** https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/submittals
**Project:** 24-104 - Goodwill Bart (ID: 562949954728542)
**Company:** Alleato Group (ID: 562949953443325)

---

## Summary

Successfully crawled the Procore Submittals tool with comprehensive screenshot capture:

- **Core Pages Captured:** 7 pages
- **Dropdown States Captured:** 12 dropdown menus
- **Total Captures:** 19 screenshot sets

---

## App Crawl Results

### Core Pages Captured

| Page | Description | Status |
|------|-------------|--------|
| submittals-list-view | Main list view (unfiltered) | Captured |
| submittals-list-view-filtered | List view with Ball In Court filter | Captured |
| submittals-settings-general | General settings configuration | Captured |
| submittals-settings-workflow | Workflow templates settings | Captured |
| submittals-settings-custom-fields | Custom fields configuration | Captured |
| submittals-configure | Configure page (legacy URL - 404) | Captured (404 page) |
| submittals-create-new | Create new submittal (legacy URL - 404) | Captured (404 page) |

### Dropdown Menus Captured

| Dropdown | Menu Items |
|----------|------------|
| Create | Submittal, Submittal Package |
| Export | CSV, PDF, Excel (3 options) |
| Reports | 2 report options |

---

## UI Structure Analysis

### Main Navigation Tabs
From the Submittals list view:
- **Items** - Individual submittals list
- **Packages** - Submittal packages
- **Spec Sections** - Specification sections
- **Ball In Court** - Assignments by responsibility
- **Recycle Bin** - Deleted items

### Settings Tabs
From Submittal Settings page:
- **General** - Core settings
- **Responses** - Response options
- **Workflow Templates** - Workflow configurations
- **Replace Workflow User** - User substitution
- **Imports** - Data import
- **Custom Reports** - Report customization
- **Permissions** - Access control

### Action Buttons
- **+ Create** (dropdown) - Create Submittal or Submittal Package
- **Export** (dropdown) - Export to various formats
- **Reports** (dropdown) - Generate reports

### Filter Controls
- **Search** - Text search input
- **Add Filter** - Additional filter options
- **Ball In Court** - Filter by responsible party
- **Clear All** - Reset filters

---

## Settings Configuration Options

### General Settings
From `submittals-settings-general`:

1. **Submittal Manager Assignment**
   - Default Submittal Manager dropdown
   - Link: "What is a submittal manager?"

2. **Submittals Numbering**
   - Include Spec Section Number (checkbox, enabled)
   - Example: "03-3000-Concrete will be numbered 03-3000-1"

3. **Workflows**
   - Default Number of Days to Submit/Respond: 14 days
   - Allow Approvers to add Reviewers (checkbox, enabled)
   - Mark Approvers' responses as Required by default (checkbox, enabled)
   - Enable Reject Workflow (checkbox, disabled)
   - Enable dynamic approver due dates (checkbox, disabled)

4. **Schedule Linking** (partially visible)

---

## Key Features Identified

### Core Functionality
1. **Submittal Management** - Create, track, and manage individual submittals
2. **Package Management** - Group submittals into packages
3. **Workflow System** - Multi-step approval workflows with submitters and approvers
4. **Ball In Court** - Track responsibility/accountability
5. **Spec Section Organization** - Organize by specification sections
6. **Revision Tracking** - Handle submittal revisions

### Export Capabilities
- CSV export
- PDF export
- Excel export

### Configuration Options
- Submittal numbering schemes
- Workflow templates
- Custom fields
- Permissions management
- Schedule linking

---

## Data Model Considerations

Based on UI analysis, suggested database schema:

```sql
-- Core submittals table
CREATE TABLE submittals (
  id BIGINT PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id),
  number VARCHAR(50), -- e.g., "03-3000-1"
  title VARCHAR(255) NOT NULL,
  spec_section_id BIGINT REFERENCES spec_sections(id),
  package_id BIGINT REFERENCES submittal_packages(id),
  status VARCHAR(50), -- draft, submitted, approved, rejected, etc.
  ball_in_court_id BIGINT REFERENCES users(id),
  submittal_manager_id BIGINT REFERENCES users(id),
  due_date DATE,
  received_date DATE,
  is_private BOOLEAN DEFAULT FALSE,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submittal packages
CREATE TABLE submittal_packages (
  id BIGINT PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id),
  number VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spec sections for organization
CREATE TABLE spec_sections (
  id BIGINT PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id),
  number VARCHAR(50), -- e.g., "03-3000"
  title VARCHAR(255), -- e.g., "Concrete"
  division VARCHAR(50)
);

-- Submittal revisions
CREATE TABLE submittal_revisions (
  id BIGINT PRIMARY KEY,
  submittal_id BIGINT NOT NULL REFERENCES submittals(id),
  revision_number INT NOT NULL,
  description TEXT,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow steps
CREATE TABLE submittal_workflow_steps (
  id BIGINT PRIMARY KEY,
  submittal_id BIGINT NOT NULL REFERENCES submittals(id),
  step_order INT NOT NULL,
  user_id BIGINT REFERENCES users(id),
  role VARCHAR(50), -- submitter, approver, reviewer
  status VARCHAR(50), -- pending, approved, rejected, revised
  response_required BOOLEAN DEFAULT TRUE,
  due_date DATE,
  responded_at TIMESTAMPTZ,
  response TEXT
);

-- Submittal attachments
CREATE TABLE submittal_attachments (
  id BIGINT PRIMARY KEY,
  submittal_id BIGINT REFERENCES submittals(id),
  revision_id BIGINT REFERENCES submittal_revisions(id),
  file_name VARCHAR(255),
  file_path VARCHAR(500),
  file_size BIGINT,
  mime_type VARCHAR(100),
  uploaded_by BIGINT REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submittal settings (project-level)
CREATE TABLE submittal_settings (
  id BIGINT PRIMARY KEY,
  project_id BIGINT UNIQUE NOT NULL REFERENCES projects(id),
  default_submittal_manager_id BIGINT REFERENCES users(id),
  include_spec_section_number BOOLEAN DEFAULT TRUE,
  default_days_to_respond INT DEFAULT 14,
  allow_approvers_add_reviewers BOOLEAN DEFAULT TRUE,
  mark_responses_required BOOLEAN DEFAULT TRUE,
  enable_reject_workflow BOOLEAN DEFAULT FALSE,
  enable_dynamic_due_dates BOOLEAN DEFAULT FALSE
);
```

---

## API Endpoints Needed

### List Operations
- `GET /projects/:projectId/submittals` - List all submittals
- `GET /projects/:projectId/submittals?ball_in_court_id=:userId` - Filter by BIC
- `GET /projects/:projectId/submittal_packages` - List packages
- `GET /projects/:projectId/spec_sections` - List spec sections

### CRUD Operations
- `POST /projects/:projectId/submittals` - Create submittal
- `GET /projects/:projectId/submittals/:id` - Get submittal details
- `PATCH /projects/:projectId/submittals/:id` - Update submittal
- `DELETE /projects/:projectId/submittals/:id` - Delete submittal

### Workflow Operations
- `POST /submittals/:id/workflow_steps` - Add workflow step
- `PATCH /submittals/:id/workflow_steps/:stepId/respond` - Submit response
- `POST /submittals/:id/forward` - Forward for review
- `POST /submittals/:id/distribute` - Distribute submittal

### Export Operations
- `GET /projects/:projectId/submittals/export?format=csv`
- `GET /projects/:projectId/submittals/export?format=pdf`
- `GET /projects/:projectId/submittals/export?format=xlsx`

---

## Frontend Components Required

### Pages
1. **SubmittalsListPage** - Main list view with tabs
2. **SubmittalDetailPage** - Individual submittal view
3. **SubmittalCreatePage** - Create new submittal form
4. **SubmittalSettingsPage** - Settings configuration
5. **SubmittalPackagesPage** - Package management

### Components
1. **SubmittalsTable** - Main data table with sorting/filtering
2. **SubmittalRow** - Table row component
3. **SubmittalFilters** - Filter panel (search, BIC, status)
4. **SubmittalTabs** - Navigation tabs (Items, Packages, etc.)
5. **CreateSubmittalDropdown** - Create button dropdown
6. **ExportDropdown** - Export options menu
7. **WorkflowTimeline** - Visual workflow progress
8. **BallInCourtBadge** - Responsibility indicator
9. **SubmittalStatusBadge** - Status indicator
10. **RevisionSelector** - Revision navigation

### Forms
1. **SubmittalForm** - Create/edit submittal
2. **WorkflowStepForm** - Add approvers/reviewers
3. **ResponseForm** - Submit workflow response
4. **SettingsForm** - Configure settings

---

## Statistics

### Crawl Metrics
- **Pages captured:** 7
- **Dropdown screenshots:** 12
- **Total captures:** 19
- **Links extracted:** ~50
- **Clickable elements:** ~70
- **Dropdown menus:** ~30

### File Sizes
- Screenshots: ~1-2MB each (full page)
- DOM files: ~200-500KB each
- Metadata: ~5-10KB each

---

## Output Locations

```
documentation/1-project-mgmt/in-progress/submittals/crawl-submittals/
├── pages/
│   ├── submittals-list-view/
│   │   ├── screenshot.png
│   │   ├── dom.html
│   │   └── metadata.json
│   ├── submittals-list-view_dropdown_1/
│   ├── submittals-list-view_dropdown_2/
│   ├── ... (more dropdowns)
│   ├── submittals-settings-general/
│   ├── submittals-settings-workflow/
│   ├── submittals-settings-custom-fields/
│   └── ...
├── reports/
│   ├── sitemap-table.md
│   ├── detailed-report.json
│   └── link-graph.json
├── SUBMITTALS-CRAWL-STATUS.md (this file)
└── README.md
```

---

## Next Steps for Implementation

1. **Review Screenshots** - Verify all key UI states are captured
2. **Design Database Schema** - Finalize based on observed data structures
3. **Create API Routes** - Implement REST endpoints
4. **Build Components** - Develop React components matching captured UI
5. **Implement Workflows** - Build multi-step approval system
6. **Add Export Features** - PDF, CSV, Excel generation
7. **Test Against Procore** - Compare implementation to screenshots

---

## Known Limitations

1. **Empty List View** - The test project has no submittals, so table structure wasn't captured
2. **Create Form** - Legacy URL returned 404; need to capture via Create dropdown
3. **Detail Page** - No individual submittal detail pages captured (no items exist)
4. **Workflow Editor** - Workflow template creation not captured

### Recommended Additional Captures
- Create a test submittal to capture the create form
- Capture submittal detail page with workflow timeline
- Capture workflow template editor
- Capture import functionality
- Capture custom reports builder
