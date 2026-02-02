# Procore Invoicing Crawl - Status Report

**Generated:** 2026-01-10T18:45:00Z
**App URL:** https://us02.procore.com/webclients/host/companies/562949953443325/projects/562949954728542/tools/invoicing/
**Documentation URL:** https://support.procore.com/products/online/user-guide/project-level/invoicing#chapt2
**Project ID:** 562949954728542

## Summary

Successfully crawled:
- **App Pages:** 47 pages (50 captures including dropdowns/tabs)
- **Documentation Pages:** 34+ pages captured (crawl ongoing - expandable sections included)

## App Crawl Results

### Core Pages Captured

1. **Main Invoicing Page** - Primary invoicing tool interface
2. **Owner Invoices** - Owner invoice list and management
3. **Subcontractor Invoices** - Subcontractor invoice list and management
4. **Billing Periods** - Billing period configuration and management
5. **Settings** - Invoicing configuration and settings
6. **Company Home** - Company-level navigation and overview

### Individual Invoices Captured

**Commitment Invoices (Purchase Orders):**
- 562949957274109 - PO invoice detail page
- 562949957274119 - PO invoice detail page
- 562949957643548 - PO invoice detail page
- 562949957643866 - PO invoice detail page

**Subcontract Invoices:**
- 562949957166626 - Subcontract invoice detail
- 562949957166673 - Subcontract invoice detail
- 562949957166702 - Subcontract invoice detail
- 562949957167482 - Subcontract invoice detail
- 562949957179824 - Subcontract invoice detail
- 562949957179879 - Subcontract invoice detail

**Work Order Invoices:**
- 562949957642101 - Work order invoice detail
- 562949957643666 - Work order invoice detail
- 562949957644001 - Work order invoice detail
- 562949957644081 - Work order invoice detail
- 562949957702055 - Work order invoice detail
- 562949957710151 - Work order invoice detail
- 562949957715119 - Work order invoice detail
- 562949957720215 - Work order invoice detail
- 562949957735829 - Work order invoice detail
- 562949957988967 - Work order invoice detail

### Related Captured Pages

**Financial Reports:**
- Budgeting Report
- Project Variance Report
- Job Cost Summary
- Committed Costs

**Company-Level Pages:**
- Portfolio view
- Executive Dashboard
- Health Dashboard
- My Open Items
- ERP Integrations
- Conversations

**Project Home Views:**
- List view (sorted by name)
- List view (sorted by number)
- Thumbnail view
- Map view

### Structure Analysis

**Tables Detected:**
- Invoice list tables with headers (captured in metadata)
- Billing period tables
- Line item tables in detail views
- Payment tables

**Dropdowns & Interactions:**
- **Export** dropdown (found on multiple pages)
- **Create** dropdown (invoice creation options)
- **Financial Views** dropdown
- **More options** menus (three-dot menus)
- **Filter** dropdowns
- Invoice type selectors

**UI Components:**
- Buttons: 34-41 per page average
- Forms: Invoice creation and edit forms
- Inputs: 20-35 per page (form fields, filters)
- Tables: 1-3 per page
- Navigation: Consistent top nav and sidebar
- Tabs: Owner/Subcontractor invoice tabs
- Icons: Extensive icon usage throughout

## Documentation Crawl Results

### Articles Captured (34+ pages, ongoing)

Documentation pages with categories:
- **Invoicing User Guide** - Main invoicing documentation
- **Configure Settings** - Invoicing configuration tutorials
- **Enable Payments Issued Tab** - Payment tracking setup
- **Expandable Sections** - Multiple expanded accordion sections captured

### Content Analysis (Preliminary)
- Articles with detailed headings and structure
- Code examples and configuration steps
- Images and diagrams (exact count pending completion)
- Expandable FAQ sections captured in detail

### Documentation Structure
- Breadcrumb navigation paths captured
- Related article links extracted
- User guide organization documented
- Tutorial categories identified

**Note:** Documentation crawler is still running and will generate comprehensive reports upon completion, including:
- `invoicing-documentation-sitemap.md` (full article map)
- `invoicing-documentation-detailed.json` (complete metadata)
- `invoicing-documentation-link-graph.json` (article relationships)
- `invoicing-documentation-summary.json` (final statistics)

## Key Features Identified

### 1. Dual Invoice Types
- **Owner Invoices** - Billing to project owners
- **Subcontractor Invoices** - Billing from subcontractors (PO, Subcontract, Work Order)

### 2. Invoice Management
- Create invoices from commitments
- Edit invoice details
- Approve/reject workflow
- Export capabilities (PDF, Excel, etc.)

### 3. Billing Periods
- Configure billing cycles
- Associate invoices with periods
- Period-based reporting

### 4. Integration Capabilities
- ERP integration support
- Payment tracking (Payments Issued tab)
- Commitment linkage (PO, Subcontracts, Work Orders)

### 5. Reporting & Analytics
- Invoice status tracking
- Budget vs. actual comparison
- Committed costs view
- Variance analysis

## Implementation Insights

### Data Model Considerations

```sql
-- Owner Invoices
CREATE TABLE owner_invoices (
  id BIGINT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  invoice_number VARCHAR(50),
  billing_period_id BIGINT,
  invoice_date DATE,
  due_date DATE,
  status VARCHAR(50), -- draft, submitted, approved, etc.
  subtotal DECIMAL(15,2),
  tax DECIMAL(15,2),
  total DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by BIGINT,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (billing_period_id) REFERENCES billing_periods(id)
);

-- Owner Invoice Line Items
CREATE TABLE owner_invoice_line_items (
  id BIGINT PRIMARY KEY,
  owner_invoice_id BIGINT NOT NULL,
  sov_line_item_id BIGINT,
  description TEXT,
  completed_to_date DECIMAL(15,2),
  materials_stored DECIMAL(15,2),
  total_amount DECIMAL(15,2),
  retention_percent DECIMAL(5,2),
  retention_amount DECIMAL(15,2),
  net_amount DECIMAL(15,2),
  FOREIGN KEY (owner_invoice_id) REFERENCES owner_invoices(id)
);

-- Subcontractor Invoices (from commitments)
CREATE TABLE subcontractor_invoices (
  id BIGINT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  commitment_id BIGINT NOT NULL, -- Links to PO, Subcontract, or Work Order
  commitment_type VARCHAR(50), -- 'purchase_order', 'subcontract', 'work_order'
  invoice_number VARCHAR(50),
  invoice_date DATE,
  period_covering_start DATE,
  period_covering_end DATE,
  status VARCHAR(50), -- pending, approved, paid, etc.
  subtotal DECIMAL(15,2),
  tax DECIMAL(15,2),
  retention DECIMAL(15,2),
  total DECIMAL(15,2),
  paid_to_date DECIMAL(15,2),
  balance_due DECIMAL(15,2),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (commitment_id) REFERENCES commitments_unified(id)
);

-- Subcontractor Invoice Line Items
CREATE TABLE subcontractor_invoice_line_items (
  id BIGINT PRIMARY KEY,
  invoice_id BIGINT NOT NULL,
  commitment_line_item_id BIGINT,
  description TEXT,
  this_period_quantity DECIMAL(15,2),
  this_period_amount DECIMAL(15,2),
  previous_quantity DECIMAL(15,2),
  previous_amount DECIMAL(15,2),
  total_quantity DECIMAL(15,2),
  total_amount DECIMAL(15,2),
  FOREIGN KEY (invoice_id) REFERENCES subcontractor_invoices(id)
);

-- Billing Periods
CREATE TABLE billing_periods (
  id BIGINT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  name VARCHAR(100),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Payment Tracking
CREATE TABLE invoice_payments (
  id BIGINT PRIMARY KEY,
  invoice_id BIGINT NOT NULL,
  invoice_type VARCHAR(50), -- 'owner', 'subcontractor'
  payment_date DATE,
  amount DECIMAL(15,2),
  check_number VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP,
  created_by BIGINT
);
```

### API Endpoints Needed

**Owner Invoices:**
- `GET /projects/:id/invoicing/owner` - List owner invoices
- `POST /projects/:id/invoicing/owner` - Create owner invoice
- `GET /projects/:id/invoicing/owner/:invoiceId` - Get invoice details
- `PUT /projects/:id/invoicing/owner/:invoiceId` - Update invoice
- `DELETE /projects/:id/invoicing/owner/:invoiceId` - Delete invoice
- `POST /projects/:id/invoicing/owner/:invoiceId/submit` - Submit for approval
- `POST /projects/:id/invoicing/owner/:invoiceId/approve` - Approve invoice
- `GET /projects/:id/invoicing/owner/:invoiceId/pdf` - Export as PDF

**Subcontractor Invoices:**
- `GET /projects/:id/invoicing/subcontractor` - List subcontractor invoices
- `GET /projects/:id/invoicing/subcontractor/:invoiceId` - Get invoice details
- `POST /projects/:id/invoicing/subcontractor` - Create invoice from commitment
- `PUT /projects/:id/invoicing/subcontractor/:invoiceId` - Update invoice
- `POST /projects/:id/invoicing/subcontractor/:invoiceId/approve` - Approve invoice
- `POST /projects/:id/invoicing/subcontractor/:invoiceId/pay` - Mark as paid

**Billing Periods:**
- `GET /projects/:id/invoicing/billing-periods` - List billing periods
- `POST /projects/:id/invoicing/billing-periods` - Create billing period
- `PUT /projects/:id/invoicing/billing-periods/:periodId` - Update billing period
- `DELETE /projects/:id/invoicing/billing-periods/:periodId` - Delete period

**Settings:**
- `GET /projects/:id/invoicing/settings` - Get invoicing settings
- `PUT /projects/:id/invoicing/settings` - Update settings

**Export:**
- `POST /projects/:id/invoicing/export` - Export invoices (Excel, PDF)
- `GET /projects/:id/invoicing/reports/variance` - Variance report
- `GET /projects/:id/invoicing/reports/summary` - Summary report

### Frontend Components

**Main Components:**
- `InvoicingPage` - Main invoicing tool page with tabs
- `OwnerInvoicesTable` - Owner invoice list view
- `SubcontractorInvoicesTable` - Subcontractor invoice list view
- `InvoiceDetailView` - Invoice detail page (owner or subcontractor)
- `CreateOwnerInvoiceModal` - Owner invoice creation form
- `CreateSubcontractorInvoiceModal` - Invoice from commitment
- `BillingPeriodsManager` - Billing period configuration
- `InvoiceLineItemsTable` - Line items within invoice
- `InvoiceApprovalPanel` - Approval workflow UI
- `InvoiceExportMenu` - Export dropdown with format options

**Shared Components:**
- `InvoiceStatusBadge` - Status indicator (draft, submitted, approved, paid)
- `InvoiceTypeSelector` - Owner/Subcontractor tab switcher
- `BillingPeriodSelector` - Dropdown for billing period selection
- `InvoiceFilterPanel` - Filter by status, date, commitment, etc.
- `PaymentTrackingTable` - Payments issued tab
- `InvoiceSearchBar` - Search by number, vendor, etc.

**Forms:**
- Owner invoice form fields (number, date, SOV line items, retention)
- Subcontractor invoice form fields (commitment link, line items, period)
- Billing period form (name, start date, end date)
- Payment recording form

## Statistics

**App Crawl:**
- Pages captured: 47
- Links extracted: 2,089 total
- Clickable elements: 1,248 total
- Dropdowns: 456 total
- Tables: 47+ (at least one per page)
- Forms: Multiple invoice and billing period forms captured

**Documentation Crawl:** (In Progress)
- Pages captured: 34+ (ongoing)
- Articles: User guide sections
- Expandable sections: Multiple FAQ and tutorial sections
- Images: TBD (pending completion)
- Code blocks: TBD (pending completion)

## Output Locations

- **App crawl:** `procore-crawl-output/` (symbolic link to actual location in scripts/screenshot-capture)
  - Screenshots: `pages/*/screenshot.png` (134 page directories including dropdowns)
  - DOM snapshots: `pages/*/dom.html`
  - Metadata: `pages/*/metadata.json`
  - Reports:
    - `reports/sitemap-table.md` - Visual sitemap with 47 main pages
    - `reports/detailed-report.json` - 834KB of complete metadata
    - `reports/link-graph.json` - 165KB navigation graph

- **Documentation crawl:** `procore-support-crawl/` (symbolic link, crawler still running)
  - Screenshots: `pages/*/screenshot.png` (93+ page directories captured so far)
  - DOM snapshots: `pages/*/dom.html`
  - Metadata: `pages/*/metadata.json`
  - Reports: `reports/` (will be generated upon crawl completion)

## Next Steps for Implementation

1. **Review Captured Screenshots**
   - Examine invoice list views (owner and subcontractor)
   - Study invoice detail pages for all commitment types
   - Review billing period management UI
   - Analyze export dropdown options
   - Study approval workflow indicators

2. **Database Schema Implementation**
   - Create `owner_invoices` and `owner_invoice_line_items` tables
   - Create `subcontractor_invoices` and related tables
   - Create `billing_periods` table
   - Create `invoice_payments` table for payment tracking
   - Add indexes on project_id, status, invoice_date
   - Add foreign key constraints to commitments and SOV

3. **API Endpoint Development**
   - Implement CRUD endpoints for owner invoices
   - Implement CRUD endpoints for subcontractor invoices
   - Implement billing period management endpoints
   - Implement approval workflow endpoints
   - Implement export endpoints (PDF, Excel)
   - Implement payment tracking endpoints

4. **Frontend Component Development**
   - Build main invoicing page with owner/subcontractor tabs
   - Create invoice list tables (filterable, sortable)
   - Build invoice detail views (read-only and edit modes)
   - Create invoice creation forms (owner and subcontractor)
   - Build billing period manager component
   - Implement export menu with format options
   - Build approval workflow UI components
   - Create payment tracking interface

5. **Integration Points**
   - Link to commitments (PO, Subcontracts, Work Orders)
   - Link to SOV line items (for owner invoices)
   - Integrate with payment tracking system
   - Connect to ERP integration framework
   - Link to budget variance reports
   - Integrate with notification system for approvals

6. **Documentation Review**
   - Review Procore support documentation (ongoing crawl)
   - Extract business rules from tutorials
   - Document approval workflows
   - Document retention calculation rules
   - Document payment tracking requirements

## Notable Features from Screenshots

- Dual invoice management (owner-facing and subcontractor-facing)
- Integration with commitments (PO, Subcontract, Work Order)
- Billing period association
- Multi-step approval workflows
- Export capabilities with multiple formats
- Payment tracking (Payments Issued tab)
- Financial views dropdown for different perspectives
- Status badges for workflow states
- Line-item level detail with quantities and amounts
- Retention tracking
- Integration with budget reports

## Crawler Performance

**App Crawler:**
- Execution time: ~9 minutes
- Success rate: 100% (47/47 pages)
- Average page load: ~11 seconds
- Total screenshots: 47 full-page captures
- Total DOM snapshots: 47 HTML files
- Dropdowns expanded: 14+ menus documented

**Documentation Crawler:**
- Execution time: Ongoing (25+ minutes so far)
- Pages captured: 34+ (still discovering links)
- Expandable sections: Multiple accordion/details elements expanded
- Note: Support documentation has deep linking and many expandable sections, requiring longer crawl time for comprehensive coverage
