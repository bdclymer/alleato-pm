# PLANS: Invoicing Feature Implementation

**Feature:** invoicing
**Created:** 2026-01-11
**Reference:** `documentation/*project-mgmt/active/invoicing/`

---

## Overview

Implement Procore's Invoicing tool functionality, enabling:
- **Owner Invoices** - Bill project owners based on Schedule of Values (SOV)
- **Subcontractor Invoices** - Receive and approve invoices from subcontractors linked to commitments
- **Billing Periods** - Organize invoices by configurable time periods
- **Approval Workflows** - Multi-step approval process for invoices
- **Payment Tracking** - Track payments issued and received

---

## Architecture

### Database Schema

```
owner_invoices (exists, needs expansion)
├── id, project_id, invoice_number
├── contract_id, billing_period_id
├── status (draft, submitted, approved, paid)
├── invoice_date, due_date
├── subtotal, tax, total (ADD)
├── retention_percent, retention_amount (ADD)
├── notes (ADD)
└── created_at, submitted_at, approved_at

owner_invoice_line_items (exists)
├── id, invoice_id
├── sov_line_item_id (ADD)
├── description, category
├── approved_amount
└── completed_to_date, materials_stored (ADD)

subcontractor_invoices (CREATE)
├── id, project_id
├── commitment_id, commitment_type
├── invoice_number
├── invoice_date, period_start, period_end
├── status (pending, approved, paid)
├── subtotal, tax, retention, total
├── paid_to_date, balance_due
└── created_at, updated_at

subcontractor_invoice_line_items (CREATE)
├── id, invoice_id
├── commitment_line_item_id
├── description
├── this_period_qty, this_period_amount
├── previous_qty, previous_amount
└── total_qty, total_amount

billing_periods (exists)
├── id, project_id, name
├── start_date, end_date
├── is_active
└── created_at
```

### API Structure

```
frontend/src/app/api/projects/[projectId]/invoicing/
├── route.ts                     # GET: List all invoices summary
├── owner/
│   ├── route.ts                 # GET: List, POST: Create
│   └── [invoiceId]/
│       ├── route.ts             # GET, PUT, DELETE
│       ├── submit/route.ts      # POST: Submit for approval
│       └── approve/route.ts     # POST: Approve invoice
├── subcontractor/
│   ├── route.ts                 # GET: List, POST: Create
│   └── [invoiceId]/
│       ├── route.ts             # GET, PUT
│       ├── approve/route.ts     # POST: Approve
│       └── pay/route.ts         # POST: Mark paid
└── billing-periods/
    ├── route.ts                 # GET: List, POST: Create
    └── [periodId]/route.ts      # PUT, DELETE
```

### Frontend Structure

```
frontend/src/app/[projectId]/invoicing/
├── page.tsx                     # Main invoicing page with tabs
├── [invoiceId]/
│   └── page.tsx                 # Invoice detail (owner or sub)
└── new/
    ├── owner/page.tsx           # Create owner invoice
    └── subcontractor/page.tsx   # Create subcontractor invoice

frontend/src/components/invoicing/
├── InvoiceStatusBadge.tsx
├── InvoiceLineItemsTable.tsx
├── BillingPeriodSelector.tsx
├── InvoiceApprovalPanel.tsx
├── InvoiceExportMenu.tsx
├── InvoiceFilterPanel.tsx
├── OwnerInvoiceForm.tsx
└── SubcontractorInvoiceForm.tsx

frontend/src/config/tables/
└── invoicing.config.tsx         # Table columns, filters

frontend/src/hooks/
├── use-invoices.ts
├── use-owner-invoices.ts
├── use-subcontractor-invoices.ts
└── use-billing-periods.ts
```

---

## Implementation Details

### 1. Main Invoicing Page

```typescript
// frontend/src/app/[projectId]/invoicing/page.tsx
// Follow DataTablePage pattern from commitments

Features:
- Tab navigation: Owner | Subcontractor | Billing Periods | Payments Issued
- Table with columns from invoicing.config.tsx
- Filters: Status, Date Range, Commitment Type
- Actions: Create Invoice, Export
- Row click navigates to detail page
```

### 2. Owner Invoice Detail Page

```typescript
// frontend/src/app/[projectId]/invoicing/[invoiceId]/page.tsx

Sections:
- Header: Invoice #, Status Badge, Date, Due Date
- Contract/Prime Contract info
- Billing Period selector
- Line Items Table (from SOV)
  - Description, Completed to Date, Materials Stored
  - Total, Retention %, Retention Amount, Net Amount
- Totals Summary
  - Subtotal, Tax, Retention, Total Due
- Actions: Edit, Submit, Approve, Export PDF, Delete
- Audit Trail section
```

### 3. Subcontractor Invoice Detail Page

```typescript
// Same route, different rendering based on invoice type

Sections:
- Header: Invoice #, Status, Vendor/Company
- Commitment link (PO, Subcontract, Work Order)
- Period Covering dates
- Line Items Table (from commitment line items)
  - Description, This Period Qty/Amount
  - Previous Qty/Amount, Total Qty/Amount
- Totals: Subtotal, Tax, Retention, Total, Paid to Date, Balance Due
- Actions: Approve, Mark Paid, Export
```

### 4. Create Owner Invoice Flow

```
1. Select Prime Contract or direct project billing
2. Select Billing Period
3. Pre-populate line items from SOV
4. Edit amounts (Completed to Date, Materials Stored)
5. Calculate retention based on contract terms
6. Set invoice date, due date
7. Save as Draft or Submit
```

### 5. Create Subcontractor Invoice Flow

```
1. Select Commitment (PO, Subcontract, Work Order)
2. Pre-populate line items from commitment
3. Enter period covering dates
4. Enter this period quantities/amounts
5. System calculates totals, previous amounts
6. Save as Pending for approval
```

---

## UI Components Specifications

### InvoiceStatusBadge
```typescript
type InvoiceStatus = 'draft' | 'submitted' | 'approved' | 'paid' | 'void' | 'pending'

Colors:
- draft: gray
- pending: yellow
- submitted: blue
- approved: green
- paid: purple
- void: red
```

### InvoiceLineItemsTable
```typescript
Props:
- items: InvoiceLineItem[]
- editable: boolean
- onItemChange: (id, changes) => void
- invoiceType: 'owner' | 'subcontractor'

Owner columns: Description, Completed to Date, Materials Stored, Total, Retention %, Net
Subcontractor columns: Description, This Period, Previous, Total
```

### BillingPeriodSelector
```typescript
Props:
- projectId: string
- value: string | null
- onChange: (periodId: string) => void
- allowCreate: boolean

Features:
- Dropdown with existing periods
- "Create New Period" option
- Period format: "Jan 2026" or custom name
```

---

## Approval Workflow

### Owner Invoice States
```
Draft -> Submitted -> Approved -> Paid
                  \-> Rejected -> Draft
```

### Subcontractor Invoice States
```
Pending -> Approved -> Paid
       \-> Rejected
```

### Permissions
- Create Invoice: Project Admin, Financial Manager
- Submit Invoice: Creator
- Approve Invoice: Project Admin, Financial Approver
- Mark Paid: Financial Manager

---

## Data Validation

### Owner Invoice Schema
```typescript
ownerInvoiceSchema = z.object({
  invoice_number: z.string().min(1),
  contract_id: z.string().uuid().optional(),
  billing_period_id: z.string().uuid().optional(),
  invoice_date: z.string().date(),
  due_date: z.string().date(),
  line_items: z.array(ownerLineItemSchema).min(1),
  notes: z.string().optional()
})

ownerLineItemSchema = z.object({
  sov_line_item_id: z.string().uuid().optional(),
  description: z.string(),
  completed_to_date: z.number().nonnegative(),
  materials_stored: z.number().nonnegative(),
  retention_percent: z.number().min(0).max(100)
})
```

### Subcontractor Invoice Schema
```typescript
subcontractorInvoiceSchema = z.object({
  commitment_id: z.string().uuid(),
  invoice_number: z.string(),
  invoice_date: z.string().date(),
  period_start: z.string().date(),
  period_end: z.string().date(),
  line_items: z.array(subLineItemSchema).min(1)
})

subLineItemSchema = z.object({
  commitment_line_item_id: z.string().uuid().optional(),
  description: z.string(),
  this_period_quantity: z.number().nonnegative(),
  this_period_amount: z.number()
})
```

---

## Integration Points

### Commitments
- Subcontractor invoices link to commitments via `commitment_id`
- Line items reference `commitment_line_items`
- Invoice amounts should not exceed commitment amounts

### Schedule of Values (SOV)
- Owner invoice line items link to SOV entries
- Pull descriptions and original amounts from SOV

### Prime Contracts
- Owner invoices can be associated with prime contracts
- Retention terms come from contract

### Budget
- Invoice amounts affect committed costs
- Variance reports show invoiced vs budgeted

---

## Export Functionality

### PDF Export
- Generate professional invoice PDF
- Include company letterhead (if configured)
- Show all line items with totals
- Include signature lines for approval

### Excel Export
- Export invoice list to .xlsx
- Include all columns visible in table
- Apply formatting (currency, dates)

---

## Testing Strategy

### E2E Tests
```typescript
// frontend/tests/e2e/invoicing.spec.ts

describe('Invoicing', () => {
  test('displays owner invoices list')
  test('displays subcontractor invoices list')
  test('switches between invoice tabs')
  test('navigates to invoice detail')
  test('creates owner invoice from SOV')
  test('creates subcontractor invoice from commitment')
  test('edits invoice line items')
  test('submits invoice for approval')
  test('approves invoice')
  test('marks invoice as paid')
  test('manages billing periods')
  test('filters by status and date')
  test('exports invoice to PDF')
})
```

---

## Procore Reference Screenshots

Key screenshots to match:
- `procore-crawl-output/pages/invoicing/` - Main page
- `procore-crawl-output/pages/owner/` - Owner invoices list
- `procore-crawl-output/pages/subcontractor/` - Sub invoices list
- `procore-crawl-output/pages/billing_periods/` - Period management
- `procore-crawl-output/pages/[invoice-id]/` - Detail pages

---

## Risk Mitigation

### Complexity Risks
- **Line item calculations**: Use existing financial utilities
- **Status transitions**: Implement state machine pattern
- **Permission checks**: Leverage existing RLS patterns

### Integration Risks
- **Commitment linking**: Verify commitment types support
- **SOV availability**: Check if SOV module is implemented
- **Payment tracking**: May need to stub if not ready

### Performance Risks
- **Large invoice lists**: Implement pagination, virtual scrolling
- **Complex calculations**: Server-side aggregation

---

## Success Criteria

1. Owner invoices: full CRUD + approval workflow
2. Subcontractor invoices: full CRUD + approval workflow
3. Billing periods: configurable periods
4. Line items: add/edit/remove with calculations
5. Status badges and workflow indicators
6. Export to PDF (basic format)
7. Filter by status, date, type
8. All e2e tests passing
9. Quality check: zero errors
10. Visual parity with Procore screenshots (~80%)
