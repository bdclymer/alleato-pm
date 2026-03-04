# Invoicing Tool — Triage Report
**Date:** 2026-03-03
**Score:** 5/10

## File Inventory
- **Page:** `frontend/src/app/(main)/[projectId]/invoicing/page.tsx` (316 lines) — "use client"
- **API Route:** `frontend/src/app/api/projects/[projectId]/invoicing/owner/` — only "owner" sub-route
  - Has: route.ts (POST + GET), [invoiceId]/route.ts
  - NO top-level invoicing route.ts
- **Feature Dir:** `frontend/src/features/invoicing/` — EMPTY
- **Hook:** NONE — no use-invoicing.ts in hooks directory

## Critical Issues

### Issue 1: Uses DataTablePage instead of UnifiedTablePage (CRITICAL)
- `import { DataTablePage } from "@/components/templates"` — deprecated pattern
- All other 5 functional tools use `UnifiedTablePage` from `@/components/tables/unified`
- This is the main migration needed
- DataTablePage is a different component with different props interface

### Issue 2: No ProjectPageHeader (CRITICAL)
- Invoicing page uses `DataTablePage` which provides its own header styling
- Does NOT use `ProjectPageHeader` + `PageContainer` pattern
- Visual inconsistency with all other tools

### Issue 3: No Custom Hook (HIGH)
- All other tools have a dedicated hook (use-commitments.ts, use-change-events.ts, etc.)
- Invoicing fetches data inline using `useCallback` + `useState` + `useEffect`
- This is the old pattern — should be extracted to `use-invoicing.ts`

### Issue 4: No Subcontractor Invoice Support (HIGH)
- Tab "owner" fetches from `/api/projects/${projectId}/invoicing/owner`
- Tab "subcontractor" shows: `toast.info("Create subcontractor invoice coming soon")`
- Subcontractor invoices completely unimplemented

### Issue 5: Config imports from wrong location (MEDIUM)
- `import { getOwnerInvoicesColumns, ... } from "@/config/tables"`
- Other tools import from `@/features/{tool}/{tool}-table-config`
- This import path may be non-standard

## What Works
- Owner invoice list loads via fetch
- Delete owner invoice with AlertDialog
- Navigate to create invoice (router.push to /invoicing/new)
- Navigate to edit (router.push to /invoicing/:id)
- GET + POST API routes for owner invoices exist

## DB Schema
- `owner_invoices` table exists (from database.types.ts)
- `owner_invoice_line_items` table exists
- FK: `owner_invoices.contract_id` → `contracts.id`

## Top 3 Issues
1. **DataTablePage → UnifiedTablePage migration** — must match all other tools
2. **No ProjectPageHeader** — gate violation
3. **No hook** — inline fetch pattern is inconsistent

## Migration Plan
1. Create `frontend/src/hooks/use-invoicing.ts` using React Query pattern
2. Create `frontend/src/features/invoicing/invoicing-table-config.tsx`
3. Rewrite `invoicing/page.tsx` to use `UnifiedTablePage` + `ProjectPageHeader`
4. Use Commitments as the reference pattern

## Recommendation
**CRITICAL — needs full migration.** The tool is functional but uses the wrong component system. This is a complete page rewrite, not a small fix.
