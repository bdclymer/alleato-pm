# Change Orders - Comprehensive Documentation

**Last Updated:** 2025-12-30
**Source:** Procore Crawl + Current Implementation Analysis

---

## Table of Contents
1. [Current Implementation Status](#current-implementation-status)
2. [Procore Change Orders Overview](#procore-change-orders-overview)
3. [Implementation Gap Analysis](#implementation-gap-analysis)
4. [Database Schema Requirements](#database-schema-requirements)
5. [UI Components & Features](#ui-components--features)
6. [API Endpoints](#api-endpoints)
7. [User Workflows](#user-workflows)
8. [Integration Points](#integration-points)

---

## Current Implementation Status

### What's Implemented

#### List Page (`/[projectId]/change-orders`)
**Location:** [frontend/src/app/[projectId]/change-orders/page.tsx](frontend/src/app/[projectId]/change-orders/page.tsx)

**Features:**
- ✅ Basic table view with columns: Number, Title, Contract, Status, Amount, Due Date
- ✅ Summary cards showing pending/approved counts and totals
- ✅ Tab navigation (All, Pending, Approved, Draft)
- ✅ Export button (UI only, not functional)
- ✅ "New Change Order" button routing to `/new`
- ✅ Empty state with CTA
- ✅ Status badges with color coding
- ✅ Loading state

**Current Metrics (from screenshot):**
- 0 Pending Review / $0.00 Total Pending
- 0 Approved / $0.00 Total Approved
- Empty state showing "No change orders found"

#### New Page (`/[projectId]/change-orders/new`)
**Location:** [frontend/src/app/[projectId]/change-orders/new/page.tsx](frontend/src/app/[projectId]/change-orders/new/page.tsx)

**Features:**
- ✅ Basic page structure with header
- ✅ Back button navigation
- ⚠️ **STUB ONLY** - Form not implemented
- ⚠️ Placeholder text: "Change order creation form will be implemented here."

### What's Missing

- ❌ Complete change order creation form
- ❌ Change order detail/edit view
- ❌ Package-based organization (Procore uses packages)
- ❌ PDF generation
- ❌ Multi-tier review workflow
- ❌ Line items management
- ❌ Budget impact calculation
- ❌ Document attachments
- ❌ Change reason tracking
- ❌ Revision history
- ❌ Designated reviewer assignment
- ❌ Contract linkage (commitment vs prime)
- ❌ Export functionality
- ❌ Reports (unexecuted, overdue, by change reason)
- ❌ Email notifications
- ❌ Approval workflow

---

## Procore Change Orders Overview

### Architecture Insights (from Crawl)

**Total Pages Captured:** 46
**Key URLs Analyzed:**
- Main list view
- Individual change order packages (5 examples)
- Reports (unexecuted, overdue)
- Analytics (by change reason)
- Configuration

### Procore's Two-Tier Structure

1. **Prime Contract Change Orders**
   - Tab: "Prime" (default)
   - Associated with owner contracts
   - Tracks revenue changes
   - Example: PCO #001 through PCO #005

2. **Commitment Change Orders**
   - Tab: "Commitments"
   - Associated with subcontractor/vendor contracts
   - Tracks cost changes
   - 249 links detected in commitments tab

### Package-Based Organization

Procore organizes change orders into **packages** (not individual items):

**Example Packages from Crawl:**
- PCO #005 (IDs: 008, 009)
- PCO #004 (ID: 007 - Permit Fees)
- PCO #003 (ID: 03-06)
- PCO #002 (Phase 1 & 2 Changes Full Scope)
- PCO #001 (Phase 1 Changes & Permit Requirements)

Each package can contain:
- Multiple related change orders
- Grouped scope changes
- Consolidated budget impact
- Single PDF export

### Table Structure (from Crawl)

**Column Headers:**
1. Contract
2. Number (#)
3. Revision
4. Title
5. Date Initiated
6. Contract Company
7. Designated Reviewer
8. Due Date
9. Review Date
10. Status
11. Amount

**Notable:** Our current implementation only has 6 columns (Number, Title, Contract, Status, Amount, Due Date)

### Status Workflow

From screenshots and metadata, Procore supports:
- **Draft** - Being created
- **Pending** - Awaiting review
- **Approved** - Approved but not executed
- **Executed** - Fully executed
- **Rejected** - (implied from workflow)

### Key Interactions Detected

**Dropdowns (4 detected per page):**
1. Export options (PDF, CSV)
2. Reports menu
3. More actions per row
4. Configure menu

**Reports Available:**
1. Unexecuted Prime Contract COs
2. Overdue Prime Contract COs
3. Overdue Commitment COs
4. Prime Potential COs by Change Reason

**Analytics:**
- Prime Potential Change Orders by Change Reason (43 links, 6 dropdowns detected)

---

## Implementation Gap Analysis

### Critical Gaps

| Feature | Procore | Current | Priority | Complexity |
|---------|---------|---------|----------|------------|
| Package-based organization | ✅ | ❌ | HIGH | Medium |
| Prime vs Commitment tabs | ✅ | ❌ | HIGH | Low |
| Designated Reviewer | ✅ | ❌ | HIGH | Medium |
| Date Initiated tracking | ✅ | ❌ | MEDIUM | Low |
| Revision tracking | ✅ | ❌ | MEDIUM | Medium |
| Contract Company | ✅ | Partial | MEDIUM | Low |
| Review Date | ✅ | ❌ | MEDIUM | Low |
| PDF generation | ✅ | ❌ | HIGH | High |
| CSV export | ✅ | ❌ | MEDIUM | Low |
| Change reason tracking | ✅ | ❌ | LOW | Low |
| Multi-tier workflow | ✅ | ❌ | HIGH | High |
| Line items | ✅ | ❌ | HIGH | Medium |
| Document attachments | ✅ | ❌ | MEDIUM | Medium |
| Reports | ✅ | ❌ | LOW | Medium |

### Quick Wins (Easy Implementation)

1. **Add missing columns:**
   - Date Initiated (created_at)
   - Revision number
   - Designated Reviewer (user lookup)
   - Review Date

2. **Add tabs:**
   - Prime vs Commitments (filter by contract type)

3. **CSV Export:**
   - Simple data transformation + download

4. **Change Reason dropdown:**
   - Add to form as select field

### Medium Complexity

1. **Package grouping:**
   - Add package_id to change_orders table
   - Group view in UI
   - Package summary calculations

2. **Designated Reviewer:**
   - User assignment
   - Notification system
   - Due date tracking

3. **Line Items:**
   - Separate table: change_order_line_items
   - Budget code linkage
   - Amount calculations

### High Complexity

1. **Multi-tier Workflow:**
   - Configurable review tiers
   - Sequential approval
   - Email notifications at each stage

2. **PDF Generation:**
   - Template system
   - Company branding
   - Signature blocks
   - Line item formatting

3. **Budget Impact:**
   - Real-time calculation
   - Original vs revised budget
   - Variance tracking
   - Forecast updates

---

## Database Schema Requirements

### Current Schema (Assumed)

```sql
-- Existing table
CREATE TABLE change_orders (
  id BIGSERIAL PRIMARY KEY,
  number TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL, -- draft, pending, approved, executed
  amount DECIMAL(15,2) DEFAULT 0,
  executed_date DATE,
  project_id BIGINT REFERENCES projects(id),
  commitment_id BIGINT REFERENCES commitments(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Required Additions

```sql
-- Add package support
ALTER TABLE change_orders ADD COLUMN package_id BIGINT REFERENCES change_order_packages(id);
ALTER TABLE change_orders ADD COLUMN revision INTEGER DEFAULT 1;
ALTER TABLE change_orders ADD COLUMN date_initiated TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE change_orders ADD COLUMN contract_company TEXT;
ALTER TABLE change_orders ADD COLUMN designated_reviewer_id BIGINT REFERENCES auth.users(id);
ALTER TABLE change_orders ADD COLUMN due_date DATE;
ALTER TABLE change_orders ADD COLUMN review_date DATE;
ALTER TABLE change_orders ADD COLUMN change_reason TEXT;
ALTER TABLE change_orders ADD COLUMN description TEXT;
ALTER TABLE change_orders ADD COLUMN contract_type TEXT DEFAULT 'prime'; -- 'prime' or 'commitment'

-- New table: change_order_packages
CREATE TABLE change_order_packages (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id),
  package_number TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  total_amount DECIMAL(15,2) DEFAULT 0,
  contract_type TEXT DEFAULT 'prime',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, package_number)
);

-- New table: change_order_line_items
CREATE TABLE change_order_line_items (
  id BIGSERIAL PRIMARY KEY,
  change_order_id BIGINT NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,
  budget_code_id BIGINT REFERENCES budget_codes(id),
  description TEXT NOT NULL,
  quantity DECIMAL(15,4) DEFAULT 0,
  unit_price DECIMAL(15,2) DEFAULT 0,
  amount DECIMAL(15,2) DEFAULT 0,
  line_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- New table: change_order_reviews
CREATE TABLE change_order_reviews (
  id BIGSERIAL PRIMARY KEY,
  change_order_id BIGINT NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,
  reviewer_id BIGINT NOT NULL REFERENCES auth.users(id),
  tier INTEGER DEFAULT 1, -- For multi-tier approval
  status TEXT NOT NULL, -- pending, approved, rejected
  comments TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- New table: change_order_attachments
CREATE TABLE change_order_attachments (
  id BIGSERIAL PRIMARY KEY,
  change_order_id BIGINT NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by BIGINT REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_change_orders_project ON change_orders(project_id);
CREATE INDEX idx_change_orders_package ON change_orders(package_id);
CREATE INDEX idx_change_orders_status ON change_orders(status);
CREATE INDEX idx_change_orders_contract_type ON change_orders(contract_type);
CREATE INDEX idx_change_order_packages_project ON change_order_packages(project_id);
CREATE INDEX idx_change_order_line_items_co ON change_order_line_items(change_order_id);
CREATE INDEX idx_change_order_reviews_co ON change_order_reviews(change_order_id);
```

### Sample Data Structure

```json
{
  "package": {
    "id": 1,
    "package_number": "PCO #001",
    "title": "Phase 1 Changes & Permit Requirements",
    "status": "approved",
    "total_amount": 45000.00,
    "contract_type": "prime"
  },
  "change_orders": [
    {
      "id": 1,
      "number": "CO-001",
      "revision": 2,
      "title": "Additional Site Work",
      "status": "approved",
      "amount": 25000.00,
      "date_initiated": "2025-01-15",
      "designated_reviewer_id": 123,
      "due_date": "2025-01-30",
      "review_date": "2025-01-28",
      "change_reason": "Client Request",
      "line_items": [
        {
          "description": "Additional excavation",
          "quantity": 100,
          "unit_price": 150,
          "amount": 15000
        }
      ]
    }
  ]
}
```

---

## UI Components & Features

### List Page Enhancements

**Add to Table:**
```tsx
<TableHead>Date Initiated</TableHead>
<TableHead>Revision</TableHead>
<TableHead>Designated Reviewer</TableHead>
<TableHead>Review Date</TableHead>
<TableHead>Contract Type</TableHead>
```

**Tab Enhancement:**
```tsx
<PageTabs
  tabs={[
    { label: 'Prime', href: `/${projectId}/change-orders?type=prime`, count: primeCount },
    { label: 'Commitments', href: `/${projectId}/change-orders?type=commitment`, count: commitmentCount },
    { label: 'All', href: `/${projectId}/change-orders` },
    { label: 'Pending', href: `/${projectId}/change-orders?status=pending` },
    { label: 'Approved', href: `/${projectId}/change-orders?status=approved` },
  ]}
/>
```

**Export Dropdown:**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm">
      <Download className="h-4 w-4 mr-2" />
      Export
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={handleExportCSV}>
      <FileText className="h-4 w-4 mr-2" />
      Export to CSV
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleExportPDF}>
      <FileDown className="h-4 w-4 mr-2" />
      Export to PDF
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### New/Edit Form Components

**Required Form Fields:**
1. **Basic Information:**
   - Package Number (auto-generated or select existing)
   - Change Order Number
   - Title
   - Description (textarea)
   - Contract Type (prime/commitment radio)

2. **Contract Details:**
   - Select Contract (commitment_id)
   - Contract Company (pre-filled from contract)
   - Change Reason (dropdown)

3. **Review & Dates:**
   - Designated Reviewer (user select)
   - Due Date (date picker)
   - Date Initiated (auto-filled, read-only)

4. **Financial:**
   - Line Items Table:
     - Budget Code
     - Description
     - Quantity
     - Unit Price
     - Amount (calculated)
   - Total Amount (calculated sum)

5. **Attachments:**
   - File upload component
   - List of attached documents

6. **Actions:**
   - Save as Draft
   - Submit for Review
   - Cancel

### Package Detail Modal

```tsx
<Dialog>
  <DialogContent className="max-w-4xl">
    <DialogHeader>
      <DialogTitle>{package.package_number}: {package.title}</DialogTitle>
    </DialogHeader>

    {/* Package Summary */}
    <div className="grid grid-cols-3 gap-4 mb-4">
      <Card><StatusBadge /></Card>
      <Card>Total: ${package.total_amount}</Card>
      <Card>{package.change_orders?.length} Change Orders</Card>
    </div>

    {/* Change Orders in Package */}
    <Table>
      {/* List all COs in this package */}
    </Table>

    {/* Package Actions */}
    <DialogFooter>
      <Button onClick={handleGeneratePDF}>Generate PDF</Button>
      <Button variant="outline">Edit Package</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## API Endpoints

### Required Endpoints

```typescript
// List/Filter
GET  /api/change-orders?projectId=X&status=Y&contractType=Z
GET  /api/change-orders/:id

// CRUD
POST   /api/change-orders
PUT    /api/change-orders/:id
DELETE /api/change-orders/:id

// Packages
GET    /api/change-order-packages?projectId=X
GET    /api/change-order-packages/:id
POST   /api/change-order-packages
PUT    /api/change-order-packages/:id

// Line Items
POST   /api/change-orders/:id/line-items
PUT    /api/change-orders/:id/line-items/:itemId
DELETE /api/change-orders/:id/line-items/:itemId

// Reviews
POST   /api/change-orders/:id/submit-for-review
POST   /api/change-orders/:id/approve
POST   /api/change-orders/:id/reject
GET    /api/change-orders/:id/reviews

// Exports
GET    /api/change-orders/export/csv?projectId=X&filters=...
GET    /api/change-orders/:id/pdf

// Reports
GET    /api/reports/change-orders/unexecuted?projectId=X
GET    /api/reports/change-orders/overdue?projectId=X&type=prime|commitment
GET    /api/reports/change-orders/by-reason?projectId=X
```

### Example Response Structures

**List Response:**
```json
{
  "data": [
    {
      "id": 1,
      "number": "CO-001",
      "revision": 1,
      "title": "Additional Site Work",
      "status": "approved",
      "amount": 25000.00,
      "contract_type": "prime",
      "date_initiated": "2025-01-15T10:00:00Z",
      "due_date": "2025-01-30",
      "review_date": "2025-01-28",
      "designated_reviewer": {
        "id": 123,
        "name": "John Doe",
        "email": "john@example.com"
      },
      "commitment": {
        "id": 456,
        "title": "General Contractor Agreement",
        "company": "ABC Construction"
      },
      "package": {
        "id": 1,
        "package_number": "PCO #001",
        "title": "Phase 1 Changes"
      }
    }
  ],
  "total": 15,
  "page": 1,
  "pageSize": 20
}
```

**Detail Response:**
```json
{
  "id": 1,
  "number": "CO-001",
  "revision": 1,
  "title": "Additional Site Work",
  "description": "Client requested additional excavation and grading...",
  "status": "approved",
  "amount": 25000.00,
  "contract_type": "prime",
  "change_reason": "Client Request",
  "date_initiated": "2025-01-15T10:00:00Z",
  "due_date": "2025-01-30",
  "review_date": "2025-01-28",
  "executed_date": null,
  "designated_reviewer": { /* user object */ },
  "commitment": { /* commitment object */ },
  "package": { /* package object */ },
  "line_items": [
    {
      "id": 1,
      "description": "Additional excavation",
      "quantity": 100,
      "unit_price": 150.00,
      "amount": 15000.00,
      "budget_code": {
        "id": 789,
        "code": "01-100",
        "name": "Site Work"
      }
    }
  ],
  "attachments": [
    {
      "id": 1,
      "file_name": "scope_document.pdf",
      "file_size": 245678,
      "uploaded_by": { /* user */ },
      "created_at": "2025-01-15T11:00:00Z"
    }
  ],
  "reviews": [
    {
      "id": 1,
      "reviewer": { /* user */ },
      "tier": 1,
      "status": "approved",
      "comments": "Approved - scope looks good",
      "reviewed_at": "2025-01-28T14:30:00Z"
    }
  ]
}
```

---

## User Workflows

### Workflow 1: Create New Change Order

1. User clicks "New Change Order" button
2. Form loads at `/[projectId]/change-orders/new`
3. User fills out:
   - Select or create package
   - Enter number (auto-suggest next available)
   - Enter title and description
   - Select contract type (prime/commitment)
   - Select related contract
   - Choose change reason
   - Assign designated reviewer
   - Set due date
4. User adds line items:
   - Click "Add Line Item"
   - Select budget code
   - Enter description, quantity, unit price
   - Amount auto-calculates
5. User uploads attachments (optional)
6. User can:
   - **Save as Draft** → status = 'draft', stays on form
   - **Submit for Review** → status = 'pending', sends notification, redirects to list

### Workflow 2: Review & Approve

1. Designated reviewer receives email notification
2. Reviewer opens change order from list or email link
3. Detail view shows:
   - All CO information
   - Line items breakdown
   - Attachments
   - Budget impact
   - Review history
4. Reviewer can:
   - **Approve** → status = 'approved', review_date recorded, next tier notified (if multi-tier)
   - **Reject** → status = 'rejected', creator notified
   - **Request Changes** → status = 'draft', creator notified with comments

### Workflow 3: Execute Change Order

1. Approved change order shows "Execute" button
2. User clicks Execute
3. Modal confirms:
   - Budget will be updated
   - Contract value will change
   - This action is final
4. User confirms
5. System:
   - Sets status = 'executed'
   - Records executed_date
   - Updates budget forecasts
   - Updates contract value
   - Triggers any ERP integrations

### Workflow 4: Export & Reporting

1. User clicks "Export" dropdown
2. Options:
   - **CSV:** Downloads filtered list with all columns
   - **PDF (Single CO):** Generates formatted PDF for one CO
   - **PDF (Package):** Generates package-level PDF with all COs
3. User clicks "Reports" dropdown
4. Options:
   - **Unexecuted COs:** Shows all approved but not executed
   - **Overdue COs:** Shows COs past due date still pending
   - **By Change Reason:** Analytics view grouping by reason

---

## Integration Points

### Budget System
- Change orders impact budget forecasts
- Line items link to budget codes
- Budget variance calculated from approved COs
- Budget views show "Pending Changes" from unapproved COs

### Contract Management
- Each CO links to a commitment (subcontract) or prime contract
- Contract value updated when CO executed
- Contract detail page shows related COs

### User Management
- Designated reviewers must have project access
- Review permissions may require specific role
- Email notifications sent to reviewers

### Document Management
- CO attachments stored in same system as other docs
- May reference RFIs, submittals, drawings

### Financial/Accounting
- Executed COs trigger cost updates
- May integrate with accounting system (QuickBooks, Sage, etc.)
- Invoice line items may reference COs

### Reporting
- Change orders appear in:
  - Budget variance reports
  - Contract summary reports
  - Project financial dashboard
  - Executive summary reports

---

## Next Steps for Implementation

### Phase 1: Foundation (Week 1-2)
1. ✅ Create database migration with all new tables
2. ✅ Add TypeScript types for new entities
3. ✅ Create API endpoints for basic CRUD
4. ✅ Test with Postman/API client

### Phase 2: List Page Enhancement (Week 2-3)
1. ✅ Add missing columns to table
2. ✅ Implement Prime/Commitments tabs
3. ✅ Add real CSV export
4. ✅ Create Reports dropdown (stub pages)

### Phase 3: Creation Form (Week 3-5)
1. ✅ Build multi-step form component
2. ✅ Implement line items table editor
3. ✅ Add file upload for attachments
4. ✅ Integrate user picker for reviewer
5. ✅ Connect to API

### Phase 4: Detail & Review (Week 5-6)
1. ✅ Create detail view modal/page
2. ✅ Implement approve/reject workflow
3. ✅ Add revision tracking
4. ✅ Build notification system

### Phase 5: Packages & PDF (Week 6-8)
1. ✅ Implement package grouping
2. ✅ Create PDF template
3. ✅ Build PDF generation service
4. ✅ Add package-level exports

### Phase 6: Reports & Analytics (Week 8-9)
1. ✅ Unexecuted COs report
2. ✅ Overdue COs report
3. ✅ By Change Reason analytics
4. ✅ Budget impact dashboard

### Phase 7: Polish & Testing (Week 9-10)
1. ✅ E2E tests for all workflows
2. ✅ Mobile responsive check
3. ✅ Performance optimization
4. ✅ Documentation

---

## Files & Screenshots Reference

### Current Implementation
- List page: `/scripts/screenshot-capture/procore-change-orders-crawl/current-implementation/change-orders-list.png`
- New page: `/scripts/screenshot-capture/procore-change-orders-crawl/current-implementation/change-orders-new-initial.png`
- Metadata: `/scripts/screenshot-capture/procore-change-orders-crawl/current-implementation/metadata.json`

### Procore Reference
- All crawled pages: `/scripts/screenshot-capture/procore-change-orders-crawl/pages/`
- Sitemap: `/scripts/screenshot-capture/procore-change-orders-crawl/reports/sitemap-table.md`
- Status report: `/scripts/screenshot-capture/procore-change-orders-crawl/CHANGE-ORDERS-CRAWL-STATUS.md`

---

## Conclusion

The change orders feature is currently in a **stub/prototype** state with:
- ✅ Basic list view working
- ✅ Empty state handling
- ✅ Status badge styling
- ⚠️ No creation form
- ⚠️ No detail view
- ⚠️ No workflow implementation

To reach **parity with Procore**, we need to implement:
1. Package-based organization
2. Complete creation/edit form with line items
3. Multi-tier review workflow
4. PDF generation
5. Reports and analytics
6. Budget impact integration

**Estimated effort:** 8-10 weeks for full implementation with testing.

**Recommended approach:** Implement in phases as outlined above, releasing incremental value to users while building toward full feature parity.
