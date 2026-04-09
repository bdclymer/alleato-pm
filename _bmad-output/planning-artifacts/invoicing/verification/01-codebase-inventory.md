# Invoicing — Codebase Inventory

**Generated:** 2026-04-09
**Tool:** invoicing

---

## Existing Planning Artifacts

| File | Content |
|------|---------|
| `plans.md` | Full architecture spec: dual invoice types, billing periods, approval workflows, SOV integration |
| `status.md` | Claims ~90% complete (last updated 2026-01-11) — contradicted by verification report |
| `verification-report.md` | Independent audit (2026-01-11): actual completion ~35% |
| `database-schema-summary.md` | Documents `subcontractor_invoices` migration — NOT applied to DB |
| `api-reference.md` | 13 endpoints documented; all 7 subcontractor endpoints return 501 |
| `research.md` | Initial gap analysis (2026-01-11) |

---

## Implementation Files

### Pages

| File | Route | Description |
|------|-------|-------------|
| `page.tsx` | `[projectId]/invoicing` | Main list; Owner tab uses `UnifiedTablePage`, Sub tab uses raw `<Table>`, Billing Periods tab renders nothing |
| `[invoiceId]/page.tsx` | `[projectId]/invoicing/[invoiceId]` | Owner invoice detail; fetches via `useEffect` not React Query; edit form in Slideover |
| `new/page.tsx` | `[projectId]/invoicing/new` | Create owner invoice form; `PageShell variant="form"` |
| `error.tsx` | — | Next.js error boundary |

### Components (`frontend/src/components/invoicing/`)

| File | Exports | Description |
|------|---------|-------------|
| `InvoiceStatusBadge.tsx` | `InvoiceStatus`, `InvoiceStatusBadge` | 8-status badge component |
| `InvoiceLineItemsTable.tsx` | `InvoiceLineItemsTable` | Read-only line items table; NOT used by detail page (renders inline instead) |
| `index.ts` | barrel | Re-exports both above |

### Hooks (`frontend/src/hooks/use-invoicing.ts`)

| Hook | Purpose |
|------|---------|
| `useOwnerInvoicesList` | GET owner invoices list with filters |
| `useDeleteOwnerInvoice` | DELETE + cache invalidation |
| `invoiceKeys` | Query key factory |

**Missing hooks:** no subcontractor invoice hooks, no billing period hooks, no invoice detail hook (detail page uses `useEffect` directly)

### API Routes

| File | Methods | Description |
|------|---------|-------------|
| `owner/route.ts` | GET, POST | List + create owner invoices |
| `owner/[invoiceId]/route.ts` | GET, PATCH, DELETE | Detail, edit, delete |
| `owner/[invoiceId]/submit/route.ts` | POST | Transitions to `under_review` |
| `owner/[invoiceId]/approve/route.ts` | POST | Transitions to `approved` |
| `owner/[invoiceId]/revise/route.ts` | POST | Transitions to `revise_and_resubmit` |
| `subcontractor/route.ts` | GET | Returns `subcontracts_with_totals` view — NOT invoice data |

**Missing routes:** billing-periods CRUD, subcontractor invoice CRUD, payments issued, settings

### Table Config Files (two conflicting definitions)

| File | Used By | Schema Version |
|------|---------|----------------|
| `frontend/src/features/invoicing/invoicing-table-config.tsx` | `page.tsx`, hooks | Current (`prime_contract_id: string`) |
| `frontend/src/config/tables/invoicing.config.tsx` | `InvoiceLineItemsTable`, `[invoiceId]/page.tsx` | Legacy (`contract_id: number`) |

### Database

| Table | Status | Key Columns |
|-------|--------|-------------|
| `owner_invoices` | ✅ Applied | id, prime_contract_id, invoice_number, period_start, period_end, billing_date, due_date, status, billing_period_id, gross_amount, net_amount, paid_amount, percent_complete, submitted_at, approved_at, acumatica fields |
| `owner_invoice_line_items` | ✅ Applied | id, invoice_id, description, category, approved_amount, acumatica_line_nbr |
| `billing_periods` | ✅ Applied | Referenced in owner_invoices; columns unknown (name column added in migration) |
| `subcontractor_invoices` | ❌ NOT APPLIED | Migration file created but never run |
| `subcontractor_invoice_line_items` | ❌ NOT APPLIED | Same migration, not run |
| `acumatica_ar_invoices` | ✅ Applied | ERP sync table, separate from owner_invoices |

### Migrations

| File | Purpose |
|------|---------|
| `20260317000007_fix_owner_invoices_contract_id.sql` | Adds prime_contract_id FK |
| `20260330000001_fix_invoice_status_enum.sql` | Adds statuses, financial columns to owner_invoices |
| `20260310000005_acumatica_ar_invoices.sql` | ERP sync tables |
| `20260408000003_seed_invoices_test_scenarios.sql` | Test case seeds |
| `20260111032127_add_subcontractor_invoices.sql` | ❌ Not found on disk (referenced in planning artifacts) |

---

## Prior Investigation Findings

None — `.claude/investigations/invoicing/` does not exist.
