# Procore Invoicing Feature - Implementation Documentation

Comprehensive capture and analysis of Procore's Invoicing tool for implementation in Alleato-Procore.

## Overview

This directory contains comprehensive documentation, screenshots, and analysis from crawling Procore's Invoicing feature, including both the application UI and support documentation.

**Crawl Date:** January 10, 2026
**Status:** App crawl complete (47 pages), Documentation crawl in progress (34+ pages)

## What is Invoicing?

Procore's Invoicing tool manages financial billing and payment tracking for construction projects:

- **Owner Invoices** - Bill project owners based on Schedule of Values (SOV)
- **Subcontractor Invoices** - Receive and approve invoices from subcontractors
- **Billing Periods** - Organize invoices by time periods
- **Payment Tracking** - Track payments issued and received
- **Financial Integration** - Connect with ERP systems and commitment tools

## Directory Structure

```
invoicing/
├── README.md                          # This file
├── INVOICING-CRAWL-STATUS.md          # Detailed crawl analysis and implementation guide
├── procore-crawl-output/              # App UI screenshots and analysis
│   ├── pages/                         # Individual page captures
│   │   ├── invoicing/                 # Main invoicing page
│   │   ├── owner/                     # Owner invoices view
│   │   ├── subcontractor/             # Subcontractor invoices view
│   │   ├── billing_periods/           # Billing period management
│   │   ├── [invoice-id]/              # Individual invoice detail pages
│   │   └── ...                        # Additional pages (47 total)
│   └── reports/                       # Crawl analysis reports
│       ├── sitemap-table.md           # Visual sitemap with links
│       ├── detailed-report.json       # Complete metadata for all pages
│       └── link-graph.json            # Page relationships and navigation
└── procore-support-crawl/             # Support documentation captures
    ├── pages/                         # Documentation article screenshots
    │   ├── invoicing_chapt2/          # Main invoicing guide
    │   ├── configure-settings-invoicing/  # Configuration tutorials
    │   └── ...                        # Additional articles (34+ captured)
    └── reports/                       # Documentation analysis (pending completion)
        ├── invoicing-documentation-sitemap.md
        ├── invoicing-documentation-detailed.json
        ├── invoicing-documentation-link-graph.json
        └── invoicing-documentation-summary.json
```

## Key Features Captured

### Owner Invoices
- Create invoices for billing project owners
- Link to Schedule of Values (SOV) line items
- Track billing periods
- Calculate retention
- Submit for approval
- Export as PDF/Excel

### Subcontractor Invoices
- Receive invoices from subcontractors
- Link to commitments (PO, Subcontract, Work Order)
- Review line items and quantities
- Approve or reject invoices
- Track payment status
- Manage period-over-period billing

### Billing Periods
- Configure billing cycles
- Associate invoices with specific periods
- Track period-based financial data
- Generate period reports

### Financial Integration
- ERP integration capabilities
- Payment tracking (Payments Issued tab)
- Budget variance analysis
- Committed costs tracking
- Job cost reporting

## How to Use This Documentation

### For Database Design
1. Review `INVOICING-CRAWL-STATUS.md` "Data Model Considerations" section
2. Examine invoice detail page screenshots for field requirements
3. Study table metadata in `detailed-report.json`
4. Reference the proposed schema (owner/subcontractor invoices, line items, billing periods)

### For API Development
1. Check `INVOICING-CRAWL-STATUS.md` "API Endpoints Needed" section
2. Review clickable elements in page metadata (buttons, dropdowns, forms)
3. Examine export dropdown options for required formats
4. Study approval workflow from status badges and buttons

### For Frontend Development
1. Browse screenshots in `procore-crawl-output/pages/*/screenshot.png`
2. Review `INVOICING-CRAWL-STATUS.md` "Frontend Components" section
3. Examine DOM structure in `pages/*/dom.html` for component hierarchy
4. Study navigation patterns in `link-graph.json`

### For Business Logic
1. Review support documentation in `procore-support-crawl/`
2. Read expanded tutorial sections for workflow rules
3. Study invoice creation forms for validation requirements
4. Examine approval workflows from status changes

## Running the Crawlers

The crawlers have already been executed, but can be re-run if needed:

### App Crawler

```bash
cd scripts/screenshot-capture
node scripts/crawl-invoicing-comprehensive.js
```

This will:
- Authenticate with Procore
- Crawl up to 50 pages starting from the invoicing tool
- Capture full-page screenshots
- Extract DOM and metadata
- Generate comprehensive reports

### Documentation Crawler

```bash
cd scripts/screenshot-capture
node scripts/crawl-invoicing-tutorials.js
```

This will:
- Crawl Procore support documentation (no authentication)
- Capture articles and tutorials
- Expand accordion/details sections
- Extract article structure and code examples
- Generate documentation sitemap and reports

## Implementation Priority

Based on the crawl analysis, suggested implementation order:

### Phase 1: Core Invoice Management
1. Owner invoice list view (read-only)
2. Subcontractor invoice list view (read-only)
3. Invoice detail pages (view mode)
4. Basic filtering and search

### Phase 2: Invoice Creation
1. Create owner invoices from SOV
2. Create subcontractor invoices from commitments
3. Line item management
4. Billing period selection

### Phase 3: Workflow & Approval
1. Invoice status management
2. Approval workflow
3. Status badges and indicators
4. Notifications

### Phase 4: Advanced Features
1. Billing period configuration
2. Payment tracking
3. Export functionality (PDF, Excel)
4. Financial reports integration
5. ERP integration

## Database Tables Required

Primary tables identified from crawl:
- `owner_invoices` - Owner billing invoices
- `owner_invoice_line_items` - SOV line items billed
- `subcontractor_invoices` - Invoices received from subs
- `subcontractor_invoice_line_items` - Invoice line items
- `billing_periods` - Billing cycle configuration
- `invoice_payments` - Payment tracking

See `INVOICING-CRAWL-STATUS.md` for complete schema definitions.

## API Endpoints Required

Minimum viable endpoints:
- Owner invoice CRUD + approval workflow
- Subcontractor invoice CRUD + approval workflow
- Billing period management
- Invoice export (PDF/Excel)
- Payment tracking
- Settings configuration

See `INVOICING-CRAWL-STATUS.md` for complete endpoint list.

## Integration Points

Invoicing integrates with:
- **Commitments** (Purchase Orders, Subcontracts, Work Orders)
- **Schedule of Values (SOV)** - Owner invoice line items
- **Budget** - Variance analysis and reporting
- **Prime Contracts** - Owner invoice association
- **Change Orders** - Approved changes reflected in billing
- **ERP Systems** - Financial data synchronization
- **Payments** - Track issued and received payments

## Key Insights from Crawl

1. **Dual Nature**: Invoicing handles both outgoing invoices (to owners) and incoming invoices (from subcontractors) in a single tool
2. **Commitment-Centric**: Subcontractor invoices are always tied to a commitment (PO, Subcontract, or Work Order)
3. **SOV Integration**: Owner invoices pull from Schedule of Values line items
4. **Period-Based**: Billing periods organize invoices chronologically
5. **Approval Workflows**: Both invoice types have multi-step approval processes
6. **Export-Heavy**: Multiple export formats (PDF, Excel) are critical functionality
7. **Payment Tracking**: Separate "Payments Issued" tab tracks financial transactions
8. **Financial Views**: Dropdown provides different perspectives (financial analyst, project manager, etc.)

## Screenshots Highlights

Key pages to review:
- `pages/invoicing/screenshot.png` - Main invoicing page with tabs
- `pages/owner/screenshot.png` - Owner invoice list view
- `pages/subcontractor/screenshot.png` - Subcontractor invoice list view
- `pages/billing_periods/screenshot.png` - Billing period management
- `pages/[invoice-id]/screenshot.png` - Invoice detail pages (multiple examples)

## Documentation Resources

- **Crawl Status Report:** `INVOICING-CRAWL-STATUS.md` - Complete analysis with implementation guidance
- **App Sitemap:** `procore-crawl-output/reports/sitemap-table.md` - Visual navigation of captured pages
- **Metadata:** `procore-crawl-output/reports/detailed-report.json` - Complete technical details
- **Support Docs:** `procore-support-crawl/` - Procore tutorials and user guides

## Next Steps

1. **Review this documentation** to understand Invoicing functionality
2. **Study INVOICING-CRAWL-STATUS.md** for detailed implementation guidance
3. **Browse screenshots** to understand UI/UX expectations
4. **Define database schema** based on captured forms and tables
5. **Design API endpoints** based on observed interactions
6. **Build frontend components** matching the captured UI
7. **Implement business logic** from documentation tutorials

## Questions or Issues?

- Check `INVOICING-CRAWL-STATUS.md` for comprehensive analysis
- Review page metadata in `pages/*/metadata.json` for technical details
- Examine DOM snapshots in `pages/*/dom.html` for HTML structure
- Review support documentation screenshots for business rules

## Crawler Scripts

The crawlers used to generate this documentation:
- **App Crawler:** `scripts/screenshot-capture/scripts/crawl-invoicing-comprehensive.js`
- **Docs Crawler:** `scripts/screenshot-capture/scripts/crawl-invoicing-tutorials.js`

Both scripts can be modified and re-run to capture additional pages or updated interfaces.

---

**Generated by:** `/feature-crawl` command
**Date:** January 10, 2026
**Tool:** Playwright-based automated crawler with comprehensive metadata extraction
