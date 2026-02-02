# Worker Done: Invoicing API Routes

**Date:** 2026-01-11
**Worker:** Backend System Architect
**Task:** Fix broken API and create proper invoicing API endpoints

## Summary

Successfully fixed the broken `/api/invoices` route and created a comprehensive RESTful API structure for invoicing under `/api/projects/[projectId]/invoicing/`.

## Part 1: Fixed Broken API

### Files Modified

1. **frontend/src/app/api/invoices/route.ts**
   - FIXED: Changed from querying non-existent `invoices` table to `owner_invoices`
   - Updated field mappings to match `owner_invoices` schema
   - Added line items query with amount calculation
   - GET: List owner invoices with filtering (search, status, contract_id)
   - POST: Create owner invoice with proper schema fields

## Part 2: Created Proper API Structure

### Files Created

#### Main Invoicing Summary
1. **frontend/src/app/api/projects/[projectId]/invoicing/route.ts**
   - GET: Summary of all invoicing data (owner invoices, subcontractor invoices, billing periods)
   - Returns aggregated statistics and metrics

#### Owner Invoices
2. **frontend/src/app/api/projects/[projectId]/invoicing/owner/route.ts**
   - GET: List all owner invoices for a project (with filtering by status, contract_id)
   - POST: Create new owner invoice with line items

3. **frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/route.ts**
   - GET: Get specific owner invoice with all details
   - PUT: Update owner invoice and line items
   - DELETE: Delete owner invoice (prevents deletion of approved invoices)

4. **frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/submit/route.ts**
   - POST: Submit owner invoice for approval (draft -> submitted)
   - Sets submitted_at timestamp

5. **frontend/src/app/api/projects/[projectId]/invoicing/owner/[invoiceId]/approve/route.ts**
   - POST: Approve owner invoice (submitted -> approved)
   - Sets approved_at timestamp

#### Subcontractor Invoices (Stubs)
6. **frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/route.ts**
   - Stub: Returns 501 (Not Implemented) - awaiting table creation

7. **frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/[invoiceId]/route.ts**
   - Stub: GET, PUT, DELETE - returns 501

8. **frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/[invoiceId]/approve/route.ts**
   - Stub: POST - returns 501

9. **frontend/src/app/api/projects/[projectId]/invoicing/subcontractor/[invoiceId]/pay/route.ts**
   - Stub: POST - returns 501

#### Billing Periods
10. **frontend/src/app/api/projects/[projectId]/invoicing/billing-periods/route.ts**
    - GET: List all billing periods for a project
    - POST: Create new billing period (with overlap validation)

11. **frontend/src/app/api/projects/[projectId]/invoicing/billing-periods/[periodId]/route.ts**
    - GET: Get specific billing period
    - PUT: Update billing period
    - DELETE: Delete billing period (prevents deletion if closed or has invoices)

## Endpoints Implemented

### Owner Invoices
- `GET /api/projects/[projectId]/invoicing` - Summary of all invoicing
- `GET /api/projects/[projectId]/invoicing/owner` - List owner invoices
- `POST /api/projects/[projectId]/invoicing/owner` - Create owner invoice
- `GET /api/projects/[projectId]/invoicing/owner/[invoiceId]` - Get invoice details
- `PUT /api/projects/[projectId]/invoicing/owner/[invoiceId]` - Update invoice
- `DELETE /api/projects/[projectId]/invoicing/owner/[invoiceId]` - Delete invoice
- `POST /api/projects/[projectId]/invoicing/owner/[invoiceId]/submit` - Submit invoice
- `POST /api/projects/[projectId]/invoicing/owner/[invoiceId]/approve` - Approve invoice

### Billing Periods
- `GET /api/projects/[projectId]/invoicing/billing-periods` - List periods
- `POST /api/projects/[projectId]/invoicing/billing-periods` - Create period
- `GET /api/projects/[projectId]/invoicing/billing-periods/[periodId]` - Get period
- `PUT /api/projects/[projectId]/invoicing/billing-periods/[periodId]` - Update period
- `DELETE /api/projects/[projectId]/invoicing/billing-periods/[periodId]` - Delete period

### Subcontractor Invoices (Stubbed)
- All subcontractor routes return 501 Not Implemented

## API Patterns Used

1. **Standard Response Format**
   - Success: `{ data: ... }` or `{ data: ..., message: ... }`
   - Error: `{ error: "message" }` with appropriate status code

2. **Error Handling**
   - 400: Bad request (validation errors, business logic violations)
   - 404: Resource not found
   - 500: Internal server error
   - 501: Not implemented (subcontractor stubs)

3. **Database Queries**
   - Used `createClient` from `@/lib/supabase/server`
   - Proper async/await error handling
   - Validation of resource ownership (invoices belong to project)

4. **Business Logic**
   - Invoice status workflow: draft -> submitted -> approved
   - Prevents deletion of approved invoices
   - Prevents deletion of closed billing periods
   - Line items cascade with invoices
   - Billing period overlap validation

5. **Data Calculations**
   - Invoice totals calculated from line items `approved_amount`
   - Summary statistics aggregated in main route

## Database Tables Used

- `owner_invoices` - Owner invoice headers
- `owner_invoice_line_items` - Invoice line items
- `billing_periods` - Billing period configuration
- `prime_contracts` - For ownership validation
- `subcontractor_invoices` - (pending migration, stubbed for now)

## Route Naming Consistency

✅ All routes use `[projectId]` parameter (consistent with existing patterns)
✅ All routes use `[invoiceId]` parameter for invoice detail routes
✅ All routes use `[periodId]` parameter for billing period routes
✅ No naming conflicts detected

## Notes for Tester

1. **Broken API Fixed**: The `/api/invoices/route.ts` now queries the correct `owner_invoices` table
2. **Line Items**: All invoice amounts are calculated from line items, not stored amounts
3. **Status Workflow**: Invoices must follow draft -> submitted -> approved workflow
4. **Validation**: Routes validate that invoices/periods belong to the specified project
5. **Subcontractor**: Subcontractor invoice routes are stubbed and return 501 until table is created
6. **Billing Periods**: Overlap validation prevents creating conflicting billing periods
7. **Deletion Protection**: Cannot delete approved invoices or closed billing periods

## Testing Recommendations

1. Test the fixed `/api/invoices` route with existing invoicing page
2. Test owner invoice CRUD operations
3. Test invoice status transitions (draft -> submitted -> approved)
4. Test billing period CRUD and overlap validation
5. Verify project ownership validation works
6. Test error cases (deleting approved invoice, invalid status transitions, etc.)
7. Verify line item calculations are correct

## Quality Check Status

- TypeScript errors detected are in pre-existing code, not new API routes
- All new routes follow established patterns from direct-costs API
- Imports and structure match existing codebase conventions
- No route naming conflicts introduced

## Ready for Testing

All API routes are implemented and ready for integration testing with the test-automator agent.
