# Financial Pages Fix - Execution Context

**Date:** 2026-01-28
**Status:** IN PROGRESS
**Plan file:** `~/.claude/plans/mossy-dreaming-twilight.md`

---

## What We're Fixing

### 1. Invoicing Module (BROKEN - pages fail to load)
- **Frontend:** COMPLETE at `frontend/src/app/(main)/[projectId]/invoicing/page.tsx`
- **Config:** COMPLETE at `frontend/src/config/tables/invoicing.config.tsx`
- **API Routes:** MISSING - 0 of 5 endpoints exist
- **DB Tables:** `owner_invoices` and `owner_invoice_line_items` EXIST but missing `updated_at`

**Required API Routes (frontend calls these):**
```
GET  /api/projects/[projectId]/invoicing/owner          → List invoices with line items
GET  /api/projects/[projectId]/invoicing/owner/[invoiceId]  → Single invoice detail
DELETE /api/projects/[projectId]/invoicing/owner/[invoiceId] → Delete invoice
POST /api/projects/[projectId]/invoicing/owner/[invoiceId]/submit  → Set status=submitted
POST /api/projects/[projectId]/invoicing/owner/[invoiceId]/approve → Set status=approved
```

**Response shape expected by frontend:**
```typescript
{ data: OwnerInvoice[] }  // for list
{ data: OwnerInvoice }    // for single

interface OwnerInvoice {
  id: number
  contract_id: number
  invoice_number: string | null
  period_start: string | null
  period_end: string | null
  status: "draft" | "submitted" | "approved" | "paid" | "void"
  billing_period_id: number | null
  created_at: string
  updated_at: string          // MISSING FROM DB - needs migration
  total_amount?: number       // COMPUTED from SUM(line_items.approved_amount)
  owner_invoice_line_items?: OwnerInvoiceLineItem[]
}
```

**Project scoping:** `owner_invoices` has `contract_id` → join through `contracts.project_id`

### 2. Direct Costs Page (STUB - no implementation)
- **Frontend:** STUB at `frontend/src/app/(main)/[projectId]/direct-costs/page.tsx` (just shows "Direct Costs" text)
- **API Routes:** EXIST at `frontend/src/app/api/projects/[projectId]/direct-costs/route.ts` (plus [costId], bulk, export)
- **DB Table:** `direct_costs` EXISTS with full schema (id UUID, project_id INTEGER, cost_type, date, description, total_amount, status, etc.)
- **DB View:** `direct_costs_with_details` EXISTS

**Action:** Build real page using `DataTablePage` template, wire to existing API.

### 3. Budget Views Error (toast error on load)
- **Component:** `frontend/src/components/budget/BudgetViewsManager.tsx` line 72
- **API Route:** `frontend/src/app/api/projects/[projectId]/budget/views/route.ts` EXISTS and is implemented
- **Error:** `toast.error("Failed to load budget views")` fires when fetch fails
- **Likely cause:** Auth issue or RLS policy blocking the query

---

## Database Schema Facts (from database.types.ts)

### owner_invoices (line 8079)
```
id: number, contract_id: number, invoice_number: string|null,
period_start: string|null, period_end: string|null, status: string|null,
billing_period_id: string|null, created_at: string|null,
approved_at: string|null, submitted_at: string|null
MISSING: updated_at
```

### owner_invoice_line_items (line 8044)
```
id: number, invoice_id: number (FK→owner_invoices),
description: string|null, category: string|null,
approved_amount: number|null, created_at: string|null
MISSING: updated_at
```

### direct_costs (line 5182)
```
id: string (UUID), project_id: number, cost_type: string, date: string,
description: string|null, employee_id: number|null, invoice_number: string|null,
is_deleted: boolean|null, paid_date: string|null, received_date: string|null,
status: string, terms: string|null, total_amount: number,
vendor_id: string|null, created_at: string, updated_at: string,
created_by_user_id: string, updated_by_user_id: string
```

### FK Type Verification
- `owner_invoices.contract_id` = number → `contracts.id` = number ✅ MATCH
- `direct_costs.project_id` = number → `projects.id` = number ✅ MATCH
- `owner_invoice_line_items.invoice_id` = number → `owner_invoices.id` = number ✅ MATCH

---

## Execution Order

```
Phase 1 (PARALLEL):
  Task 1: DB Migration - add updated_at to owner_invoices tables (supabase-architect)
  Task 3: Direct Costs Page - build from stub (frontend-developer)
  Task 4: Budget Views Debug - find & fix toast error (debugger)

Phase 2 (AFTER Task 1):
  Task 2: Invoicing API Routes - create all 5 endpoints (backend-architect)

Phase 3 (AFTER Tasks 2, 3, 4):
  Task 5: TypeScript Verification (typescript-pro)

Phase 4 (AFTER Task 5):
  Task 6: E2E Test Verification (test-automator)
```

---

## Mandatory Rules

1. Run `npm run db:types` before writing ANY DB code
2. Read `database.types.ts` before writing queries
3. Route params: `[invoiceId]`, `[costId]` - NEVER `[id]`
4. Next.js 15: `params: Promise<{...}>` and `await params`
5. Auth check in every API route
6. `npm run quality` must pass with 0 errors
7. Reference patterns from: `frontend/src/app/api/projects/[projectId]/budget/views/route.ts`

---

## Key Reference Files

| Purpose | File |
|---------|------|
| Invoicing frontend | `frontend/src/app/(main)/[projectId]/invoicing/page.tsx` |
| Invoicing config | `frontend/src/config/tables/invoicing.config.tsx` |
| Direct costs stub | `frontend/src/app/(main)/[projectId]/direct-costs/page.tsx` |
| Direct costs API | `frontend/src/app/api/projects/[projectId]/direct-costs/route.ts` |
| Budget views component | `frontend/src/components/budget/BudgetViewsManager.tsx` |
| Budget views API | `frontend/src/app/api/projects/[projectId]/budget/views/route.ts` |
| DB types | `frontend/src/types/database.types.ts` |
| Scaffold templates | `.claude/scaffolds/crud-resource/` |
| Patterns | `.claude/PATTERNS.md` |
| Lessons learned | `PRPs/_shared/LESSONS-LEARNED.md` |
