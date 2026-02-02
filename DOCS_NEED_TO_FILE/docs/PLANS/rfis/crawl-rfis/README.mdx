# Procore RFIs Feature Crawl

Comprehensive screenshot capture and analysis of Procore's RFI (Request for Information) tool.

## Purpose

This crawl captures the complete RFI feature from Procore for implementation reference in Alleato-Procore. It includes:

- Full-page screenshots of all RFI views
- DOM snapshots for component analysis
- Metadata extraction (links, buttons, forms)
- Support documentation capture

## Quick Start

### View Key Screenshots

| View | Screenshot |
|------|------------|
| RFI List | `pages/rfi_list/screenshot.png` |
| RFI Detail | `pages/rfi_562949957101832/screenshot.png` |
| RFI Edit Form | `pages/edit/screenshot.png` |
| Export Menu | `pages/rfi_list_dropdown_2/screenshot.png` |

### View Reports

| Report | Location |
|--------|----------|
| Status Report | `RFIS-CRAWL-STATUS.md` |
| Sitemap Table | `reports/sitemap-table.md` |
| Detailed JSON | `reports/detailed-report.json` |
| Link Graph | `reports/link-graph.json` |

## Directory Structure

```
crawl-rfis/
├── README.md                    # This file
├── RFIS-CRAWL-STATUS.md        # Detailed status report
├── pages/
│   ├── rfi_list/               # Main RFI list view
│   │   ├── screenshot.png
│   │   ├── dom.html
│   │   └── metadata.json
│   ├── rfi_562949957101832/    # Sample RFI detail view
│   ├── edit/                   # RFI edit form
│   ├── *_dropdown_*/           # Dropdown state captures
│   ├── view_pdf_id_*/          # PDF export views
│   └── [tutorial-pages]/       # Support documentation
└── reports/
    ├── sitemap-table.md        # Visual sitemap
    ├── detailed-report.json    # Complete metadata
    └── link-graph.json         # Navigation structure
```

## Re-running the Crawl

To update the crawl:

```bash
cd scripts/screenshot-capture
node scripts/crawl-rfis-comprehensive.js
```

### Configuration

Edit `scripts/crawl-rfis-comprehensive.js` to modify:

- `START_URLS` - Starting pages to crawl
- `WAIT_TIME` - Page load wait (ms)
- `maxPages` - Maximum pages to capture

## Key Findings

### RFI Data Fields

From the captured edit form and metadata:

| Field | Type | Notes |
|-------|------|-------|
| RFI Number | Auto-generated | Unique per project |
| Subject | Text | Required |
| Question | Rich text | Main question body |
| Official Answer | Rich text | Selected response |
| Status | Select | Draft, Open, Closed |
| Priority | Select | Low, Normal, High |
| Assignee | Contact | User assignment |
| RFI Manager | Contact | Project manager |
| Due Date | Date | Response deadline |
| Cost Impact | Boolean + Amount | Financial tracking |
| Schedule Impact | Boolean + Days | Timeline tracking |
| Location | Reference | Project location |
| Cost Code | Reference | Budget tracking |
| Drawings | Reference | Drawing links |

### UI Components

| Component | Procore Implementation |
|-----------|----------------------|
| List View | AG Grid (virtualized) |
| Filters | Left sidebar panel |
| Status Badge | Color-coded chips |
| Export | Dropdown menu |
| Form | Multi-section layout |

## Usage for Implementation

### 1. Screenshot Comparison

Compare implementation screenshots against Procore:

```bash
# Take screenshot during test
await page.screenshot({ path: 'test-rfi-list.png', fullPage: true })

# Compare with reference
# Reference: pages/rfi_list/screenshot.png
```

### 2. DOM Analysis

Examine Procore's markup structure:

```bash
# Open DOM snapshot
open pages/rfi_list/dom.html
```

### 3. Metadata Reference

Use extracted metadata for component inventory:

```javascript
const metadata = require('./pages/rfi_list/metadata.json')
console.log('Clickables:', metadata.clickableDetails)
console.log('Links:', metadata.linkDetails)
```

## Related Documentation

- [RFI Support Documentation](https://support.procore.com/products/online/user-guide/project-level/rfi)
- [Procore API - RFIs](https://developers.procore.com/reference/rest/v1/rfis)

## Crawl Timestamp

Generated: 2026-01-11T07:08:30Z
