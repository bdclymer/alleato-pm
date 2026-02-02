# Subcontractor Invoices Database Schema - Quick Reference

**Migration File:** `supabase/migrations/20260111032127_add_subcontractor_invoices.sql`
**Status:** Created (not yet applied to database)
**Date:** 2026-01-11

---

## Tables Created

### `subcontractor_invoices`
Primary table for tracking invoices from subcontractors.

**Key Fields:**
- `commitment_id` (TEXT) - UUID reference to PO/Subcontract/Work Order
- `commitment_type` - 'purchase_order', 'subcontract', or 'work_order'
- `status` - draft, pending, approved, rejected, paid, voided
- `total_amount`, `paid_to_date`, `balance_due` - Financial tracking
- `retention_percent`, `retention_amount` - Retention tracking

**Indexes:** 8 (project_id, commitment, status, date, billing_period, created_by, composite)

**RLS Policies:** 5 (select, insert, update, delete, service_role)

### `subcontractor_invoice_line_items`
Line items with progressive billing tracking.

**Key Fields:**
- `invoice_id` - Parent invoice reference
- `this_period_quantity/amount` - Current billing period
- `previous_quantity/amount` - Cumulative before this invoice
- `total_quantity/amount` - **COMPUTED** (previous + this_period)
- `percent_complete` - **COMPUTED** (total_amount / scheduled_value)

**Indexes:** 3 (invoice_id, commitment_line_item_id, inherited)

**RLS Policies:** 5 (select, insert, update, delete, service_role)

---

## RLS Security Model

All policies follow **project-based access control**:
- Users must be members of project (via `project_members` table)
- Service role bypasses all restrictions
- Consistent with `owner_invoices` and `direct_costs` patterns

---

## Computed Columns

**Line Items use STORED generated columns:**
- `total_quantity = previous_quantity + this_period_quantity`
- `total_amount = previous_amount + this_period_amount`
- `percent_complete = (total_amount / scheduled_value) * 100` (capped at 100%)

**Benefits:** No calculation errors, better performance, data integrity

---

## Next Steps

1. **Apply Migration:**
   - Via Dashboard: https://supabase.com/dashboard/project/lgveqfnpkxvzbnnwuled/editor/sql
   - Via CLI: `npx supabase db push`

2. **Regenerate Types:**
   ```bash
   npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" \
     --schema public > frontend/src/types/database.types.ts
   ```

3. **Create API Routes:**
   - List invoices
   - Create invoice
   - Get invoice details
   - Update invoice
   - Delete invoice
   - Approve invoice
   - Mark as paid

4. **Build Frontend Components:**
   - Subcontractor invoices table
   - Invoice detail view
   - Create invoice modal
   - Line items table
   - Approval workflow UI

---

## Testing Requirements

- RLS policies (project member access)
- Computed columns (totals, percent complete)
- Constraints (commitment_type, status, amounts)
- Cascade delete (invoice → line items)
- Triggers (updated_at auto-update)

---

See `worker-done-database-schema.md` for complete details.
