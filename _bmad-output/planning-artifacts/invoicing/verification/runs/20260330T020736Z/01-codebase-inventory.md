# Invoicing Feature - Comprehensive Codebase Inventory

**Generated:** 2026-03-30T02:07:36Z  
**Project Root:** `/Users/meganharrison/Documents/alleato-pm`  
**Scope:** Complete invoicing feature implementation across frontend pages, API routes, components, hooks, services, schemas, and database types.

---

## Executive Summary

The invoicing feature implements a dual-invoice system supporting:
- **Owner Invoices**: Billing to project owners via prime contracts
- **Subcontractor Invoices**: Billing from commitments (PO, Subcontracts, Work Orders)
- **Billing Periods**: Period-based invoice organization and tracking

**Current Status:**
- Owner invoices: Fully implemented (CRUD, submit, approve workflows)
- Subcontractor invoices: Partially implemented (stubs in place, marked as "coming soon")
- Billing periods: Basic GET/POST implemented
- ERP Integration: Acumatica AR invoices sync in place

---

## 1. Pages/Routes (Next.js App Router)

### Owner Invoicing Pages

#### `frontend/src/app/(main)/[projectId]/invoicing/page.tsx`
**Purpose:** Main invoicing list and dashboard page  
**Key Exports:**
- `ProjectInvoicingPage` - Default export, main page component

**Functionality:**
- Lists owner invoices with unified table (table/card/list views)
- Supports filtering by status (draft, submitted, approved, paid, void)
- Search by invoice number or ID
- Sorting by multiple columns
- KPI metrics: Total Invoiced, Pending, Approved, Paid amounts
- Tabs for Owner Invoices, Subcontractor (coming soon), Billing Periods (coming soon)
- Create invoice dropdown with options
- ERP sync button for Acumatica AR invoices
- Inline delete confirmation dialog

**Notable Patterns:**
- Uses `useUnifiedTableState` for table state management
- Client-side supplemental filtering (API already filters)
- Pagination with configurable per-page count
- Status-based filtering via URL search params
- KPI row using pre-calculated metrics from data

**Issues/TODOs:**
- Subcontractor and Billing Periods tabs show "coming soon" toast
- No batch operations implemented
- Export functionality not visible in code

#### `frontend/src/app/(main)/[projectId]/invoicing/new/page.tsx`
**Purpose:** Create new owner invoice form  
**Key Exports:**
- `NewInvoicePage` - Default export

**Functionality:**
- Form to create new owner invoice
- Requires: prime contract selection, status
- Optional: invoice number, period start, period end
- Loads contracts from API on mount
- Auto-selects first contract if none selected
- Dev auto-fill button for development testing
- Form validation with Zod schema

**Schema:**
```typescript
createInvoiceSchema = {
  prime_contract_id: string (required),
  invoice_number?: string (optional),
  period_start?: string (optional),
  period_end?: string (optional),
  status: enum["draft" | "submitted" | "approved" | "paid" | "void"]
}
```

**Issues/TODOs:**
- No line items creation in initial form (separate flow needed)
- Auto-fill uses timestamp as invoice number (INV-{timestamp})
- No date validation beyond format parsing

#### `frontend/src/app/(main)/[projectId]/invoicing/[invoiceId]/page.tsx`
**Purpose:** Invoice detail, view, and edit page  
**Key Exports:**
- `InvoiceEditForm` - Form component for editing invoices
- (Page component name inferred as default)

**Functionality:**
- Displays invoice details with read-only view
- Inline edit form (slide-over editor)
- Edit form with fields: invoice_number, period_start, period_end, status, notes
- Edit only available for draft invoices (API enforces)
- Invoice details include contract info and line items table
- Approve/submit/delete action buttons (implementation partial)
- Line items display with calculations

**Edit Schema:**
```typescript
invoiceEditSchema = {
  invoice_number?: string | null,
  period_start?: string | null,
  period_end?: string | null,
  status: enum["draft" | "submitted" | "approved" | "paid" | "void"],
  notes?: string | null
}
```

**Issues/TODOs:**
- Form shows `onSuccess` callback but approve/submit/delete handlers not shown in code
- `notes` field in schema but not displayed in edit form
- No line item editing capability in this view
- Submit/Approve buttons presence not visible in code excerpt

#### Legacy Pages (from first glob results)
- `frontend/src/app/(main)/[projectId]/invoices/page.tsx` - May be legacy, similar to invoicing/page.tsx
- `frontend/src/app/(main)/[projectId]/invoices/new/page.tsx` - May be legacy

**Note:** Multiple invoicing route patterns suggest migration from old routes to new structure.

---

## 2. API Routes

### Owner Invoice Endpoints

#### `frontend/src/app/api/projects/[projectId]/invoicing/owner/route.ts`
**Methods:** GET, POST  
**Purpose:** List and create owner invoices

**GET Response:**
- Returns owner invoices with calculated total_amount (sum of line items)
- Includes contract number and title from prime_contracts join
- Filters by project via prime_contracts.project_id
- Order: created_at DESC

**POST Request Body:**
```typescript
{
  prime_contract_id: string (required),
  invoice_number?: string | null,
  period_start?: string | null,
  period_end?: string | null,
  billing_period_id?: string | null,
  status?: string (defaults to "draft")
}
```

**POST Response:** Created invoice with all fields

**Authentication:** Required (checks user)  
**Validation:** Verifies prime contract belongs to project

#### `frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/route.ts`
**Methods:** GET, PATCH, DELETE  
**Purpose:** Get, update, delete individual invoices

**GET Response:**
- Single invoice with line items
- Includes contract retention_percentage
- Calculates total_amount from line items
- Verifies project ownership via contracts inner join

**PATCH Request Body:**
```typescript
{
  invoice_number?: string | null,
  period_start?: string | null,
  period_end?: string | null,
  status?: string,
  notes?: string | null
}
```

**PATCH Restrictions:**
- Only draft invoices can be edited
- Returns 400 if status !== "draft"

**DELETE Restrictions:**
- Cannot delete approved or paid invoices
- Only draft, submitted, or void invoices deletable
- Cascade deletes line items

**Issues/TODOs:**
- No batch patch/delete endpoints
- PATCH allows all fields but form may only use subset
- Delete response doesn't return invoice data

#### `frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/submit/route.ts`
**Methods:** POST  
**Purpose:** Submit invoice for approval

**Functionality:**
- Changes status to "submitted"
- Sets submitted_at timestamp
- Verifies project ownership
- No additional request body needed

**Issues/TODOs:**
- No approval flow changes or notifications triggered
- No validation of required fields before submission
- No line item presence validation

#### `frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/approve/route.ts`
**Methods:** POST  
**Purpose:** Approve invoice

**Functionality:**
- Changes status to "approved"
- Sets approved_at timestamp
- Verifies project ownership
- No additional request body needed

**Issues/TODOs:**
- No permission checks (any authenticated user can approve)
- No approval workflow roles defined
- No notification system integrated

### Billing Periods Endpoints

#### `frontend/src/app/api/projects/[projectId]/billing-periods/route.ts`
**Methods:** GET, POST  
**Purpose:** Manage contract billing periods

**GET Response:**
```typescript
{
  items: Array<{
    id, contract_id, period_number, start_date, end_date,
    billing_date, status, work_completed, stored_materials,
    current_payment_due, retention_percentage, retention_amount,
    net_payment_due, notes, created_at, updated_at
  }>,
  total: number
}
```

**POST Request Body:**
```typescript
{
  contract_id: string (required),
  start_date: string (required),
  end_date: string (required),
  billing_date: string (required),
  period_number?: number (auto-generated if omitted)
}
```

**Functionality:**
- Gets billing periods for all prime contracts in project
- Auto-generates period_number if not provided
- Verifies contract belongs to project
- Order: start_date DESC

**Issues/TODOs:**
- No PUT/PATCH/DELETE endpoints for billing periods
- No status management (draft/open/closed/approved)
- Limited field validation

### Legacy Invoice Endpoints

#### `frontend/src/app/api/invoices/route.ts`
**Methods:** GET, POST  
**Purpose:** Appears to be legacy/global invoice management

**GET Response:** Maps acumatica_ar_invoices to legacy status format  
**POST Request:** Zod-validated creation with status mapping

**Status Mapping:**
- API: "Hold" → Legacy: "draft"
- API: "Open" → Legacy: "submitted" or "approved"
- API: "Closed" → Legacy: "paid"
- API: "Voided" → Legacy: "void"

**Issues/TODOs:**
- Separate from owner_invoices endpoint
- May be redundant with newer owner invoicing endpoints
- Status mapping logic complex and error-prone

#### `frontend/src/app/api/commitments/[id]/invoices/route.ts`
**Purpose:** Get invoice data for a commitment  
**Used by:** InvoicesTab component on commitment detail

### ERP Sync Endpoint

#### `frontend/src/app/api/sync/acumatica/ar-invoices/route.ts`
**Methods:** POST  
**Purpose:** Sync AR invoices from Acumatica  
**Functionality:** Syncs acumatica_ar_invoices table for project

---

## 3. Components

### Invoicing Component Library

#### `frontend/src/components/invoicing/InvoiceStatusBadge.tsx`
**Exports:** `InvoiceStatusBadge` component  
**Purpose:** Display invoice status with color-coded badge

**Props:**
```typescript
{
  status: "draft" | "submitted" | "approved" | "paid" | "void",
  className?: string
}
```

**Styling:**
- draft → secondary (gray)
- submitted → default (blue)
- approved → success (green)
- paid → success (green)
- void → destructive (red)

**Implementation Note:** Uses shadcn Badge component

#### `frontend/src/components/invoicing/InvoiceLineItemsTable.tsx`
**Exports:** `InvoiceLineItemsTable` component  
**Purpose:** Display invoice line items with totals

**Props:**
```typescript
{
  lineItems: OwnerInvoiceLineItem[],
  showRetention?: boolean (default: false)
}
```

**Functionality:**
- Shows description, category, amount for each line item
- Calculates subtotal, retention (5% hardcoded), and total
- Optionally displays retention section
- Shows "No line items found" message if empty

**Issues/TODOs:**
- Retention rate hardcoded at 5% (should be configurable)
- No editing capability (read-only)
- No line-level actions (delete, edit)
- Category formatted but may not display correctly

#### `frontend/src/components/invoicing/index.ts`
**Exports:** Re-exports all invoicing components  
- `InvoiceStatusBadge`
- `InvoiceLineItemsTable`

#### `frontend/src/components/commitments/tabs/InvoicesTab.tsx`
**Exports:** `InvoicesTab` component (memoized)  
**Purpose:** Display invoice summary on commitment detail

**Functionality:**
- Fetches invoice data from `/api/commitments/{commitmentId}/invoices`
- Shows summary card with financial metrics
- Displays line items table with billing progress
- Handles 404 (no invoices) and error states
- Shows loading skeleton during fetch

**Data Structure:**
```typescript
InvoiceSummary {
  total_contract_amount, total_invoiced, remaining_to_invoice,
  percent_invoiced, total_paid, remaining_balance
}

InvoiceLineItem {
  id, line_number, budget_code, description, scheduled_value,
  billed_to_date, remaining_amount, percent_complete
}
```

**Issues/TODOs:**
- Handles both new and legacy API response formats
- No pagination for line items
- No filtering or sorting of line items

---

## 4. Hooks

#### `frontend/src/hooks/use-invoicing.ts`
**Exports:**
- `useOwnerInvoicesList(projectId, filters?)` - Query hook
- `useDeleteOwnerInvoice(projectId)` - Mutation hook
- `invoiceKeys` - React Query key factory

**Query Key Structure:**
```
all: ["invoices"]
lists: ["invoices", "list"]
list: ["invoices", "list", projectId, filters]
detail: ["invoices", "detail", id]
```

**useOwnerInvoicesList Configuration:**
- Stale time: 30 seconds
- Placeholders: Keep previous data during transitions
- Enabled: Only when projectId provided
- Auto-deduplicates concurrent requests

**useDeleteOwnerInvoice:**
- Calls DELETE /api/projects/{projectId}/invoicing/owner/{invoiceId}
- Invalidates all lists() on success
- Shows success/error toasts
- Returns mutateAsync function

**Issues/TODOs:**
- No separate list/detail hooks for individual invoice
- Filters interface extensible but only status used
- No create/update mutation hooks visible
- Query client management centralized but limited

---

## 5. Services

**No dedicated services files found.** API calls are made directly from:
- Components (pages)
- Hooks (via React Query)
- Forms (via fetch API)

**Pattern Used:** React Query + fetch (no service abstraction layer)

---

## 6. Schemas (Zod)

### Invoicing Schemas

**Located in:** Page components and API routes  
**Not centralized in `frontend/src/lib/schemas/`**

#### CreateInvoiceSchema (page.tsx)
```typescript
{
  prime_contract_id: string (required),
  invoice_number?: string,
  period_start?: string,
  period_end?: string,
  status: enum["draft" | "submitted" | "approved" | "paid" | "void"]
}
```

#### InvoiceEditSchema (detail page.tsx)
```typescript
{
  invoice_number?: string | null,
  period_start?: string | null,
  period_end?: string | null,
  status: enum["draft" | "submitted" | "approved" | "paid" | "void"],
  notes?: string | null
}
```

#### CreateInvoiceSchema (invoices/route.ts - Legacy)
```typescript
{
  invoice_number: string (1-100 chars, required),
  project_id?: number | null,
  invoice_date: string (required, valid date),
  status?: enum["draft" | "submitted" | "approved" | "paid" | "void"],
  amount?: number,
  tax_amount?: number,
  notes?: string | null (max 2000 chars)
}
```

**Issues/TODOs:**
- Multiple schema definitions across files
- Legacy schema differs from owner invoice schema
- No shared schema utilities
- Lack of centralization makes maintenance difficult

---

## 7. Database Types

**File:** `frontend/src/types/database.types.ts` (Generated from Supabase)

### Invoicing-Related Tables

#### owner_invoices
```typescript
Row {
  id: number
  prime_contract_id: string
  billing_period_id: string | null
  invoice_number: string | null
  period_start: string | null
  period_end: string | null
  status: enum["draft" | "submitted" | "approved" | "paid" | "void"]
  notes: string | null
  submitted_at: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}
```

**Relationships:**
- prime_contract_id → prime_contracts(id)
- billing_period_id → billing_periods(id)
- created_by → user_profiles(id)

#### owner_invoice_line_items
```typescript
Row {
  id: number
  invoice_id: number
  description: string | null
  category: string | null
  approved_amount: number
  created_at: string
}
```

**Relationships:**
- invoice_id → owner_invoices(id) [CASCADE DELETE]

#### billing_periods
```typescript
Row {
  id: string
  project_id: number
  name: string | null
  start_date: string
  end_date: string
  status: enum["open" | "closed" | "approved"]
  is_active: boolean
  created_at: string
  updated_at: string
}
```

**Relationships:**
- project_id → projects(id)

#### contract_billing_periods
```typescript
Row {
  id: string
  contract_id: string
  period_number: number
  start_date: string
  end_date: string
  billing_date: string
  status: string | null
  work_completed: number | null
  stored_materials: number | null
  current_payment_due: number | null
  retention_percentage: number | null
  retention_amount: number | null
  net_payment_due: number | null
  notes: string | null
  created_at: string
  updated_at: string
}
```

**Relationships:**
- contract_id → prime_contracts(id)

#### acumatica_ar_invoices (ERP Integration)
```typescript
Row {
  id: number
  reference_nbr: string
  billing_period_id: string | null
  company_id: string | null
  customer: string | null
  amount: number | null
  balance: number | null
  status: string | null
  date: string | null
  due_date: string | null
  type: string | null
  hold: boolean | null
  project_id: number | null
  created_at: string | null
  updated_at: string | null
}
```

**Relationships:**
- billing_period_id → billing_periods(id)
- project_id → projects(id)

#### acumatica_ar_invoice_lines
```typescript
Row {
  id: number
  invoice_id: number
  line_nbr: number | null
  extended_price: number | null
  qty: number | null
  unit_price: number | null
  description: string | null
}
```

**Relationships:**
- invoice_id → acumatica_ar_invoices(id)

---

## 8. Configuration/Utilities

### Invoicing Table Config

**File:** `frontend/src/config/tables/invoicing.config.tsx`

**Exports:**
- `OwnerInvoice` interface
- `OwnerInvoiceLineItem` interface
- `SubcontractorInvoice` interface (placeholder)
- `formatCurrency(amount)` - Format to USD
- `formatDate(date)` - Format to locale string
- `getOwnerInvoicesColumns(onView?)` - TanStack table columns
- `getSubcontractorInvoicesColumns(onView?)` - TanStack table columns (placeholder)
- `invoiceStatusOptions` - Status filter options
- `getOwnerInvoicesSummaryCards(invoices)` - KPI calculation
- `getInvoicingTabs(projectId)` - Tab configuration
- `invoicingMobileColumns` - Mobile responsive columns

**Invoice Statuses:**
- draft (0) - Editable, not submitted
- submitted (1) - Awaiting approval
- approved (2) - Approved, ready for payment
- paid (3) - Payment received
- void (4) - Cancelled/invalid

**Outstanding Amount Calculation:**
- "approved" and "submitted" statuses counted as outstanding
- "paid" and "draft" excluded from outstanding

### Invoicing Table Config (New)

**File:** `frontend/src/features/invoicing/invoicing-table-config.tsx`

**Exports:**
- `OwnerInvoice` interface (same as config)
- `invoiceColumns` - Column config array
- `invoiceFilters` - Filter config array
- `buildInvoiceTableColumns(onView, onEdit)` - Dynamic columns
- `renderInvoiceRowActions(invoice, onView, onEdit, onDelete)` - Row actions menu
- `renderInvoiceCard(item)` - Card view render function
- `renderInvoiceList(item)` - List view render function

**Column Configuration:**
```typescript
[
  { id: "invoice_number", label: "Invoice #", alwaysVisible: true },
  { id: "contract_id", label: "Contract", defaultVisible: true },
  { id: "billing_period", label: "Billing Period", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "total_amount", label: "Amount", defaultVisible: true },
  { id: "created_at", label: "Created", defaultVisible: false }
]
```

**Issues/TODOs:**
- Two separate invoicing config files (duplication)
- Card and list renderers not shown in code (referenced but stub)
- Status filter only includes draft, submitted, approved, paid, void

---

## 9. Planning Artifacts & Documentation

**Directory:** `_bmad-output/planning-artifacts/invoicing/`

### Existing Documentation

#### `invoicing-crawl-status.md` (2026-01-10)
**Status:** Comprehensive requirements and implementation guide

**Key Content:**
- 47 app pages crawled from Procore invoicing tool
- 34+ support documentation pages captured
- Detailed data model recommendations (SQL schemas)
- API endpoints specification (18 owner/subcontractor/billing endpoints)
- Component architecture recommendations
- Integration points documented

**Captured Invoice Types:**
- Owner invoices (from project ownership)
- PO invoices (from Purchase Orders)
- Subcontract invoices (from Subcontracts)
- Work order invoices (from Work Orders)

#### Other Documentation Files
- `api-reference.md` - API specification
- `database-schema-summary.md` - Schema overview
- `plans.md` - Implementation planning
- `verification-report.md` - Previous verification results
- `worker-done-*.md` - Completed implementation notes

### Verification Runs

**Latest:** `verification/runs/20260330T020736Z/` (Current)

---

## 10. Key Observations & Issues

### Architecture

**Strengths:**
1. Clean separation of concerns (pages, components, hooks)
2. Type-safe with TypeScript and Zod validation
3. React Query for state management with caching
4. Tailored to owner invoicing workflow
5. Integration with prime contracts and billing periods

**Weaknesses:**
1. No dedicated service layer (direct API calls)
2. Schemas not centralized (defined in multiple locations)
3. Two duplicate invoicing config files
4. Legacy invoices endpoint may be redundant

### Feature Completeness

**Implemented:**
- ✓ Owner invoice CRUD operations
- ✓ Draft/submitted/approved/paid/void status workflow
- ✓ Line items display with totals
- ✓ Billing periods basic management
- ✓ ERP sync for Acumatica AR invoices
- ✓ Table with filtering, sorting, pagination
- ✓ Unified table views (table/card/list)
- ✓ KPI metrics and summary cards

**Partially Implemented:**
- ⚠ Submit/Approve workflows (routes exist, handlers may be incomplete)
- ⚠ Billing period management (basic GET/POST, no update/delete)
- ⚠ Line item management (read-only, no create/edit/delete UI)

**Not Implemented:**
- ✗ Subcontractor invoices (marked "coming soon", schema exists)
- ✗ Payment tracking/recording
- ✗ Invoice export (PDF, Excel)
- ✗ Approval permissions/roles
- ✗ Invoice notifications
- ✗ Batch operations
- ✗ Retention amount calculations (hardcoded 5%)
- ✗ Line item creation/editing UI

### Code Quality Issues

1. **Status Mapping Complexity:** Legacy endpoint has error-prone status mapping logic
2. **Hardcoded Values:** 5% retention rate in line items table
3. **Missing Validation:** No line item presence check before submission
4. **Permissions:** No role-based approval authorization
5. **Error Handling:** Limited error context in mutations
6. **Testing:** No visible test files in codebase

### Performance Considerations

1. **Stale Time:** 30-second stale time may be too aggressive for frequently updated invoices
2. **Pagination:** No cursor-based pagination (offset/limit for lists)
3. **Filtering:** Client-side supplemental filtering (API already filters)
4. **N+1 Queries:** Line item loading through joins rather than nested selection

### Security Observations

1. ✓ Project ownership verified on all routes
2. ✓ User authentication required
3. ✓ Input validation with Zod schemas
4. ⚠ No role-based access control (RBAC) for approval
5. ⚠ No audit logging visible
6. ⚠ No rate limiting on mutation endpoints

---

## 11. File Inventory Summary

### Total Files Related to Invoicing

| Category | Count | Files |
|----------|-------|-------|
| Pages | 3 | invoicing/page.tsx, invoicing/new/page.tsx, invoicing/[invoiceId]/page.tsx |
| API Routes | 8 | invoicing/owner/route.ts, invoicing/owner/[id]/route.ts, invoicing/owner/[id]/submit/route.ts, invoicing/owner/[id]/approve/route.ts, invoices/route.ts, commitments/[id]/invoices/route.ts, billing-periods/route.ts, sync/acumatica/ar-invoices/route.ts |
| Components | 3 | InvoiceStatusBadge.tsx, InvoiceLineItemsTable.tsx, InvoicesTab.tsx |
| Hooks | 1 | use-invoicing.ts |
| Config | 2 | invoicing.config.tsx, invoicing-table-config.tsx |
| Types/Schemas | ~6 database types | owner_invoices, owner_invoice_line_items, billing_periods, contract_billing_periods, acumatica_ar_invoices, acumatica_ar_invoice_lines |
| Documentation | 15+ | Detailed planning artifacts |

### Total Lines of Code (Approximate)

- Pages: ~800 lines
- API Routes: ~1500 lines
- Components: ~350 lines
- Hooks: ~100 lines
- Config: ~350 lines
- **Total:** ~3000 lines

---

## 12. Dependency Map

```
Invoicing Page
├── useOwnerInvoicesList (hook)
│   └── /api/projects/[projectId]/invoicing/owner (GET)
├── useDeleteOwnerInvoice (hook)
│   └── /api/projects/[projectId]/invoicing/owner/[id] (DELETE)
├── useUnifiedTableState (component)
├── InvoicingTableConfig (config)
│   └── formatCurrency, formatDate, buildInvoiceTableColumns
└── ERP Sync
    └── /api/sync/acumatica/ar-invoices (POST)

New Invoice Page
├── /api/projects/[projectId]/contracts (GET - to populate contract select)
└── /api/projects/[projectId]/invoicing/owner (POST)

Invoice Detail Page
├── /api/projects/[projectId]/invoicing/owner/[id] (GET, PATCH)
├── /api/projects/[projectId]/invoicing/owner/[id]/submit (POST)
├── /api/projects/[projectId]/invoicing/owner/[id]/approve (POST)
├── InvoiceLineItemsTable (component)
└── InvoiceStatusBadge (component)

Commitment InvoicesTab
└── /api/commitments/[id]/invoices (GET)

Billing Periods Page
└── /api/projects/[projectId]/billing-periods (GET, POST)
```

---

## 13. Recommended Next Steps

### For Gap Analysis
1. Verify subcontractor invoice implementation status
2. Check for notification/email integration points
3. Confirm approval workflow authorization rules
4. Test concurrent invoice submissions
5. Validate retention calculation logic against Procore spec

### For Implementation
1. Implement line item create/edit/delete UI
2. Consolidate duplicate config files
3. Implement missing subcontractor invoice tab
4. Add payment recording interface
5. Implement invoice export (PDF, Excel)
6. Add approval notifications
7. Implement role-based approval permissions
8. Add batch invoice operations

### For Code Quality
1. Extract API calls into service layer
2. Centralize Zod schemas in `frontend/src/lib/schemas/`
3. Remove legacy `/api/invoices/route.ts` if redundant
4. Add unit tests for config functions
5. Add integration tests for API endpoints
6. Implement error boundary components
7. Add loading/error states to forms

---

## Document Metadata

- **Scope:** Complete invoicing feature implementation
- **Coverage:** Pages, Routes, Components, Hooks, Services, Schemas, DB Types, Planning Artifacts
- **Depth:** Comprehensive with code examples and architecture analysis
- **Last Updated:** 2026-03-30T02:07:36Z
- **Generated By:** Codebase discovery worker
- **Status:** Ready for gap analysis and verification

