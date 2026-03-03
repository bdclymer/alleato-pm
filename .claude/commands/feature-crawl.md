---
description: Automated Procore feature crawling with comprehensive screenshot capture, DOM analysis, and documentation generation
argument-hint: "<feature-name> <app-url> [support-url] [project-id]"
---

# /feature-crawl - Procore Feature Crawler

Streamlined workflow for capturing comprehensive screenshots and analysis of Procore features. Automatically generates crawl scripts, executes them, and produces detailed documentation.

## Usage

```bash
/feature-crawl <feature-name> <app-url> [support-url] [project-id]
```

### Examples

```bash
# Crawl Submittals feature (app only)
/feature-crawl submittals https://us02.procore.com/562949954728542/project/submittals

# Crawl RFIs feature (app only)
/feature-crawl rfis https://us02.procore.com/562949954728542/project/rfis

# Crawl Change Orders with app + support documentation
/feature-crawl "Change Orders" "https://us02.procore.com/562949954728542/project/change_orders/list" "https://support.procore.com/products/online/user-guide/project-level/change-orders#chapt2"

# Crawl Punch List with custom project
/feature-crawl punch-list https://us02.procore.com/123456789/project/punch_list https://support.procore.com/products/online/user-guide/project-level/punch-list 123456789
```

## What It Does

The feature crawler automates the complete workflow:

1. **Setup Phase**
   - Creates output directory structure
   - Generates custom crawl script based on template
   - Validates Procore authentication

2. **Crawling Phase**
   - Launches Playwright browser automation
   - Captures full-page screenshots (PNG)
   - Saves complete DOM snapshots (HTML)
   - Extracts metadata (JSON):
     - Links and clickable elements
     - Dropdown menus and interactions
     - Table structures and headers
     - UI component inventory
     - Form fields and validation

3. **Analysis Phase**
   - Explores dropdowns and menus
   - Captures sort variations
   - Documents filter options
   - Analyzes table structures
   - Inventories UI components

4. **Documentation Phase**
   - Generates sitemap reports (Markdown + JSON)
   - Creates implementation status document
   - Documents database schema requirements
   - Identifies API endpoints needed
   - Lists frontend components required

5. **Output Organization**
   - Stores in project management directory
   - Creates standardized folder structure
   - Generates README with usage instructions

## Agent Instructions

You are a feature crawling specialist. Your mission is to comprehensively capture and analyze a Procore feature for implementation planning.

### Step 1: Parse User Input

Extract from the user's command:
- **Feature Name**: Sanitized name for directories (e.g., "submittals", "change-orders")
- **App URL**: Full Procore application URL to begin crawling
- **Support URL** (optional): Procore support documentation URL (e.g., https://support.procore.com/...)
- **Project ID**: Extract from URL or use provided value (default: 562949954728542)

### Step 2: Create Directory Structure

Set up organized output directories:

```
docs/project-mgmt/<feature-name>/
├── crawl-<feature-name>/
│   ├── README.md
│   ├── <FEATURE>-CRAWL-STATUS.md
│   ├── pages/
│   │   └── [captured page directories]
│   └── reports/
│       ├── sitemap-table.md
│       ├── detailed-report.json
│       └── link-graph.json
└── [other feature planning docs]
```

### Step 3: Generate Custom Crawl Scripts

#### App Crawler Script

Create a specialized app crawler script at:
`scripts/screenshot-capture/scripts/crawl-<feature-name>-comprehensive.js`

Base it on the proven pattern from `crawl-direct-costs-comprehensive.js`:

**Key Configuration:**
```javascript
const OUTPUT_DIR = "./docs/project-mgmt/<feature-name>/procore-crawl-output";
const START_URL = "<provided-app-url>";
const PROCORE_EMAIL = "bclymer@alleatogroup.com";
const PROCORE_PASSWORD = "[from auth.json or .env]";
const maxPages = 50; // Safety limit
```

**Include:**
- Login automation
- Page navigation and waiting
- Screenshot capture (full page)
- DOM extraction
- Metadata analysis (links, clickables, dropdowns, tables)
- Report generation
- Error handling

#### Support Documentation Crawler Script (if support URL provided)

Create a documentation crawler script at:
`scripts/screenshot-capture/scripts/crawl-<feature-name>-tutorials.js`

Base it on the proven pattern from `crawl-commitments-tutorials.js`:

**Key Configuration:**
```javascript
const OUTPUT_DIR = "./documentation/*project-mgmt/active/<feature-name>/procore-crawl";
const START_URL = "<provided-support-url>";
const WAIT_TIME = 2000;
const maxPages = 100; // Comprehensive documentation crawl
```

**Include:**
- No authentication needed (public docs)
- Article navigation and link extraction
- Expandable section handling (`captureExpandables()`)
- Enhanced page analysis for documentation:
  - Article headings and structure
  - Code blocks and tables
  - Breadcrumb navigation
  - Meta descriptions
- Screenshot capture (full page)
- DOM extraction
- Comprehensive sitemap report generation:
  - `commitments-documentation-sitemap.md`
  - `commitments-documentation-detailed.json`
  - `commitments-documentation-link-graph.json`
  - `commitments-documentation-summary.json`
- Category-based link filtering (prioritize feature-related docs)
- Statistics tracking (images, code blocks, interactive elements)

### Step 4: Execute the Crawls

Run the generated scripts in sequence:

**App Crawler:**
```bash
cd scripts/screenshot-capture
node scripts/crawl-<feature-name>-comprehensive.js
```

**Documentation Crawler (if support URL provided):**
```bash
cd scripts/screenshot-capture
node scripts/crawl-<feature-name>-tutorials.js
```

Monitor progress and handle any errors gracefully. The app crawler will authenticate and capture application UI, while the documentation crawler will capture public support articles without authentication.

### Step 5: Generate Status Report

Create `<FEATURE>-CRAWL-STATUS.md` with:

**Template Structure:**
```markdown
# Procore <Feature Name> Crawl - Status Report

**Generated:** [ISO timestamp]
**App URL:** [app-url]
**Documentation URL:** [support-url] (if provided)

## Summary
Successfully crawled:
- **App Pages:** X pages (Y total captures including dropdowns/tabs)
- **Documentation Pages:** Z pages (W expandable sections) (if support URL provided)

## App Crawl Results

### Core Pages Captured
1. Main list view
2. Detail views
3. Create/edit forms
4. Configuration pages

### Individual Items
List specific captured items with IDs

### Sort/Filter Variations
Document captured variations

### Structure Analysis

**Tables Detected:**
- Table headers and structure
- Row counts
- Table IDs and classes

**Dropdowns & Interactions:**
- Export options
- Create buttons
- Filters
- Action menus

**UI Components:**
Component inventory with counts

## Documentation Crawl Results (if support URL provided)

### Articles Captured
List documentation pages with categories:
- User guide articles
- Tutorial pages
- Reference documentation

### Content Analysis
- Total headings extracted
- Code examples found
- Images and diagrams
- Expandable sections captured

### Documentation Structure
- Breadcrumb paths
- Related article links
- Category organization

## Key Features Identified
1. Primary functionality
2. Export capabilities
3. Filtering & sorting
4. Configuration options
5. Detail views

## Implementation Insights

### Data Model Considerations
```sql
-- Suggested schema from app UI analysis
CREATE TABLE <feature> (
  id BIGINT PRIMARY KEY,
  project_id BIGINT,
  -- key fields observed in forms and tables
);
```

### API Endpoints Needed
- List endpoints
- CRUD operations
- Export endpoints
- Filter/sort endpoints

### Frontend Components
- Main table/list component
- Detail view component
- Filter panel
- Export menu
- Status badges

## Statistics

**App Crawl:**
- Pages captured: X
- Links extracted: Y
- Clickable elements: Z
- Dropdowns: A
- Tabs: B

**Documentation Crawl:** (if applicable)
- Pages captured: X
- Articles: Y
- Code blocks: Z
- Images: A
- Expandable sections: B

## Output Locations
- App crawl: `documentation/*project-mgmt/in-progress/<feature>/procore-crawl-output/`
- Documentation crawl: `documentation/*project-mgmt/in-progress/<feature>/procore-support-crawl/` (if applicable)

## Next Steps for Implementation
1. Review captured screenshots against requirements
2. Define database schema based on forms and tables
3. Design API endpoints from observed interactions
4. Build frontend components matching captured UI
5. Implement business logic from documentation
```

### Step 6: Generate README

Create `README.md` in the crawl directory with:
- Purpose and overview
- How to run the crawler
- Output structure
- File organization
- Usage instructions for developers

### Step 7: Summary Report

Provide the user with:
- ✅ Crawl completion status
- 📊 Statistics (pages captured, links found, components identified)
- 📁 Output location
- 🚀 Next steps for implementation
- ⚠️ Any issues or limitations encountered

## Safety Features

- **Page Limit**: Maximum 50 pages to prevent infinite crawling
- **Duplicate Prevention**: Track visited URLs
- **Error Recovery**: Continue crawling even if individual pages fail
- **Timeout Protection**: 60-second max per page
- **Authentication Check**: Verify login before crawling

## Output Files Generated

For each captured page:
- `screenshot.png` - Full-page screenshot (~1MB)
- `dom.html` - Complete DOM snapshot (~500KB)
- `metadata.json` - Extracted data and analysis (~40KB)

Reports:
- `sitemap-table.md` - Visual sitemap with links to screenshots
- `detailed-report.json` - Complete metadata for all pages
- `link-graph.json` - Link relationships and navigation map

## Integration with Implementation

The crawler output directly feeds into:
1. **Database Design**: Schema extracted from tables and forms
2. **API Planning**: Endpoints identified from interactions
3. **Frontend Development**: Components and layouts documented
4. **Testing**: User flows and workflows mapped

## Troubleshooting

If the crawler encounters issues:

**Authentication Fails:**
- Check credentials in `scripts/screenshot-capture/auth.json`
- Re-run authentication: `cd scripts/screenshot-capture && npm run auth`

**Pages Timeout:**
- Increase WAIT_TIME in generated script
- Check internet connection
- Verify Procore service availability

**Too Few/Many Pages:**
- Adjust maxPages limit
- Review URL filtering in extractLinks()
- Check if authentication succeeded

**Missing Features:**
- Manually capture complex interactions
- Add specific URL patterns to queue
- Modify extraction logic for custom elements

## Critical Success Factors

- **Comprehensive Coverage**: Capture all views, states, and interactions
- **Quality Screenshots**: Full-page, high-resolution captures
- **Accurate Metadata**: Precise extraction of elements and structure
- **Clear Documentation**: Reports that guide implementation
- **Organized Output**: Consistent directory structure

## Example Workflow

### Example 1: App Only

```bash
# User types:
/feature-crawl submittals https://us02.procore.com/562949954728542/project/submittals

# Agent performs:
1. Creates: documentation/*project-mgmt/in-progress/submittals/crawl-submittals/
2. Generates: scripts/screenshot-capture/scripts/crawl-submittals-comprehensive.js
3. Executes app crawl (captures ~50 pages)
4. Creates: SUBMITTALS-CRAWL-STATUS.md with app analysis
5. Creates: README.md with instructions
6. Reports: "App Crawl: 47 pages, 312 links, 89 clickables"
```

### Example 2: App + Documentation

```bash
# User types:
/feature-crawl "Change Orders" "https://us02.procore.com/562949954728542/project/change_orders/list" "https://support.procore.com/products/online/user-guide/project-level/change-orders#chapt2"

# Agent performs:
1. Creates: documentation/*project-mgmt/in-progress/change-orders/crawl-change-orders/
2. Generates: scripts/screenshot-capture/scripts/crawl-change-orders-comprehensive.js (app)
3. Generates: scripts/screenshot-capture/scripts/crawl-change-orders-tutorials.js (docs)
4. Executes app crawl (captures authenticated UI)
5. Executes documentation crawl (captures support articles)
6. Creates: CHANGE-ORDERS-CRAWL-STATUS.md with both crawl analyses
7. Creates: README.md with dual-crawl instructions
8. Reports:
   - "App Crawl: 52 pages, 387 links, 104 clickables"
   - "Documentation Crawl: 18 articles, 47 code blocks, 12 expandable sections"
```

## Success Criteria

A successful crawl includes:
- ✅ All main feature views captured
- ✅ Detail pages for sample items
- ✅ Dropdowns and menus documented
- ✅ Sort/filter variations captured
- ✅ Tables and forms analyzed
- ✅ Status report generated
- ✅ README created
- ✅ Output organized in standard structure

Remember: The goal is to capture enough detail to implement the feature WITHOUT accessing Procore's source code. Every screenshot, every metadata file, every analysis contributes to a complete implementation blueprint.
