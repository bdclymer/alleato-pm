# Invoicing Feature - Codebase Research

**Generated:** 2026-01-11
**Status:** Complete
**Current Implementation:** ~35%

---

## Executive Summary

The invoicing feature has foundational elements in place but lacks comprehensive frontend UI, most API endpoints, and full database integration. Database tables exist for owner invoices and billing periods, but subcontractor invoices are not yet implemented.

---

## Files Found (Infrastructure In Place)

### Database Tables (Confirmed Existing)
| Table | Status | Columns |
|-------|--------|---------|
| `owner_invoices` | Exists | 10 columns |
| `owner_invoice_line_items` | Exists | 6 columns |
| `billing_periods` | Exists | Yes |
| `payment_transactions` | Exists | With invoice reference |

### Type Definitions
- **`frontend/src/types/financial.ts`** - Invoice and InvoiceLineItem interfaces (lines 141-162)
- **`frontend/src/types/database.types.ts`** - Full database schema

### Form Component
- **`frontend/src/app/(forms)/form-invoice/page.tsx`** - Invoice creation form with line items (31KB)

### API Routes (Minimal)
- **`frontend/src/app/api/invoices/route.ts`** - GET/POST endpoints (56 lines)
- **`frontend/src/app/api/commitments/[id]/invoices/route.ts`** - GET endpoint

### Frontend Pages
- **`frontend/src/app/[projectId]/invoices/page.tsx`** - Main invoices page (minimal)

### State Management
- **`frontend/src/lib/stores/financial-store.ts`** - Invoice state with CRUD actions
- **`frontend/src/lib/schemas/financial-schemas.ts`** - invoiceSchema validation

---

## Files Missing (Major Gaps)

### Critical Frontend Routes Missing
- `frontend/src/app/[projectId]/invoicing/` - Main invoicing tool page
- `frontend/src/app/[projectId]/invoicing/[invoiceId]/` - Invoice detail pages
- `frontend/src/app/[projectId]/invoicing/new/` - Create invoice flow
- `frontend/src/app/[projectId]/invoicing/owner/` - Owner-specific view
- `frontend/src/app/[projectId]/invoicing/subcontractor/` - Subcontractor view

### Components Missing
- `frontend/src/components/invoicing/` - No invoicing components directory
- Invoice list tables (Owner vs Subcontractor)
- Invoice detail view component
- Line items manager component
- Billing period selector component
- Invoice status badge component
- Approval workflow UI component
- Export menu component

### Hooks Missing
- `useInvoices()` hook
- `useOwnerInvoices()` hook
- `useSubcontractorInvoices()` hook
- `useBillingPeriods()` hook
- `useInvoiceLineItems()` hook

### Config Files Missing
- `frontend/src/config/tables/invoicing.config.tsx`

### Database Gaps
- **Subcontractor Invoices Table** - Not implemented
- **Subcontractor Invoice Line Items Table** - Not implemented

### API Endpoints Missing (~20+ needed, only ~3 exist)
- POST/PUT/DELETE for owner invoices
- Approval workflow endpoints
- Export endpoints (PDF, Excel)
- Payment recording endpoints
- Billing period CRUD endpoints
- Line item management endpoints

### Tests Missing
- No e2e tests for invoicing

---

## Implementation Metrics

| Area | Status | % Complete |
|------|--------|-----------|
| Database Tables | Partial | 60% |
| Type Definitions | Complete | 100% |
| Form Components | Minimal | 30% |
| API Routes | Minimal | 15% |
| Frontend Pages | Minimal | 20% |
| Hooks/Utilities | Minimal | 10% |
| Table Configs | Missing | 0% |
| Components Library | Missing | 0% |
| Tests | Missing | 0% |
| **Overall** | **Partial** | **35%** |

---

## Key Code Locations

| Purpose | Location |
|---------|----------|
| Invoice Types | `frontend/src/types/financial.ts` (line 141) |
| Invoice Schema | `frontend/src/lib/schemas/financial-schemas.ts` (line 96) |
| Financial Store | `frontend/src/lib/stores/financial-store.ts` |
| Form Component | `frontend/src/app/(forms)/form-invoice/page.tsx` |
| Basic API | `frontend/src/app/api/invoices/route.ts` |
| Current Page | `frontend/src/app/[projectId]/invoices/page.tsx` |
| Database Types | `frontend/src/types/database.types.ts` |
| Procore Research | `documentation/*project-mgmt/active/invoicing/` |

---

## Pattern References

### Commitments Pattern (Use as Reference)
```
frontend/src/app/[projectId]/commitments/
├── page.tsx                    # Main list view
├── [commitmentId]/page.tsx     # Detail view
├── new/page.tsx                # Create form
└── recycled/page.tsx           # Soft-deleted items

frontend/src/config/tables/commitments.config.tsx
frontend/src/hooks/use-commitments.ts
```

### Direct Costs Pattern (Financial Feature Reference)
```
frontend/src/app/[projectId]/direct-costs/
├── page.tsx                    # Main page with tabs
├── [costId]/page.tsx           # Detail view
└── new/page.tsx                # Create form

frontend/src/components/direct-costs/
├── DirectCostTable.tsx
├── DirectCostForm.tsx
├── CreateDirectCostForm.tsx
└── [multiple components]
```

---

## Procore Reference Insights

### Key Features to Implement
- Dual invoice management (owner-facing + subcontractor-facing)
- Commitment-centric subcontractor invoices (PO, Subcontract, Work Order)
- SOV integration for owner invoices
- Period-based organization
- Multi-step approval workflows
- Export capabilities (PDF, Excel)
- Payment tracking integration
- Status badges for workflow states

### Integration Points
- Commitments (PO, Subcontracts, Work Orders)
- Schedule of Values (SOV)
- Budget and variance analysis
- Prime Contracts
- Change Orders
- Payment tracking system
