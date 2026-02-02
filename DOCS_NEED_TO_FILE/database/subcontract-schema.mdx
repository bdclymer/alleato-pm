# Subcontract Commitments Schema

This document describes the database schema for subcontract commitments, as implemented in the migration file `supabase/migrations/20251230_subcontract_schema.sql`.

## Overview

The schema consists of three main tables:
- `subcontracts` - Main commitments/subcontracts table
- `subcontract_sov_items` - Schedule of Values (SOV) line items
- `subcontract_attachments` - File attachments

## Tables

### `subcontracts`

Main table for storing subcontract commitments.

**Key Fields:**
- `id` (UUID) - Primary key
- `contract_number` (TEXT) - Auto-generated (e.g., SC-001, SC-002)
- `contract_company_id` (UUID) - FK to companies table
- `title` (TEXT) - Contract title
- `status` (TEXT) - Draft, Sent, Pending, Approved, Executed, Closed, Void
- `executed` (BOOLEAN) - Whether contract is executed
- `default_retainage_percent` (NUMERIC) - Retainage percentage (0-100)
- `description` (TEXT) - Rich text contract description
- `inclusions` (TEXT) - Rich text scope inclusions
- `exclusions` (TEXT) - Rich text scope exclusions

**Date Fields (stored as mm/dd/yyyy TEXT):**
- `start_date`
- `estimated_completion_date`
- `actual_completion_date`
- `contract_date`
- `signed_contract_received_date`
- `issued_on_date`

**Privacy Fields:**
- `is_private` (BOOLEAN) - Default true
- `non_admin_user_ids` (UUID[]) - Array of user IDs with access
- `allow_non_admin_view_sov_items` (BOOLEAN) - SOV visibility control

**Other Fields:**
- `invoice_contact_ids` (UUID[]) - Array of user IDs who can invoice
- `project_id` (INTEGER) - FK to projects table
- `created_by` (UUID) - FK to auth.users
- `created_at`, `updated_at` - Timestamps

**Constraints:**
- `contract_number_project_unique` - Contract number must be unique per project

### `subcontract_sov_items`

Schedule of Values line items linked to subcontracts.

**Fields:**
- `id` (UUID) - Primary key
- `subcontract_id` (UUID) - FK to subcontracts
- `line_number` (INTEGER) - Display line number
- `change_event_line_item` (TEXT) - Optional change event reference
- `budget_code` (TEXT) - Link to cost codes
- `description` (TEXT) - Line item description
- `amount` (NUMERIC) - Line item amount (≥ 0)
- `billed_to_date` (NUMERIC) - Amount billed so far (≥ 0)
- `sort_order` (INTEGER) - For custom ordering
- `created_at`, `updated_at` - Timestamps

**Computed Field:**
- `amount_remaining` = `amount` - `billed_to_date` (computed in views/application)

**Constraints:**
- `sov_line_number_unique` - Line number must be unique per subcontract

### `subcontract_attachments`

File attachments for subcontracts.

**Fields:**
- `id` (UUID) - Primary key
- `subcontract_id` (UUID) - FK to subcontracts
- `file_name` (TEXT) - Original filename
- `file_size` (BIGINT) - File size in bytes
- `file_type` (TEXT) - MIME type
- `storage_path` (TEXT) - Path in Supabase Storage
- `uploaded_by` (UUID) - FK to auth.users
- `uploaded_at` (TIMESTAMP) - Upload timestamp

## Views

### `subcontracts_with_totals`

Computed view that includes aggregated SOV data:

```sql
SELECT
  s.*,
  COALESCE(sov_totals.total_amount, 0) as total_sov_amount,
  COALESCE(sov_totals.total_billed, 0) as total_billed_to_date,
  COALESCE(sov_totals.total_amount, 0) - COALESCE(sov_totals.total_billed, 0) as total_amount_remaining,
  COALESCE(sov_totals.line_item_count, 0) as sov_line_count,
  COALESCE(att_count.count, 0) as attachment_count,
  c.name as company_name,
  c.type as company_type
FROM subcontracts s
LEFT JOIN ... (aggregations)
```

## Triggers

### Auto-generated Contract Numbers

The `generate_contract_number()` trigger automatically generates contract numbers in the format `SC-001`, `SC-002`, etc., if not provided during insert.

### Auto-update Timestamps

The `update_updated_at_column()` trigger automatically updates `updated_at` timestamps on both `subcontracts` and `subcontract_sov_items` tables.

## Row Level Security (RLS)

All tables have RLS enabled with the following policies:

### Subcontracts
- **SELECT**: Users can view if they're project members OR if not private OR if they're in `non_admin_user_ids`
- **INSERT**: Project members with admin/project_manager/editor role
- **UPDATE**: Project members with admin/project_manager/editor role
- **DELETE**: Project members with admin/project_manager role only

### SOV Items
- **SELECT**: Inherit from parent subcontract, respects `allow_non_admin_view_sov_items`
- **ALL**: Project members with admin/project_manager/editor role

### Attachments
- **SELECT**: Any project member who can view the parent subcontract
- **ALL**: Project members with admin/project_manager/editor role

## Indexes

Performance indexes are created on:
- `subcontracts`: project_id, company_id, status, contract_number, created_at
- `subcontract_sov_items`: subcontract_id, budget_code, (subcontract_id, sort_order)
- `subcontract_attachments`: subcontract_id

## Migration

To apply this migration:

```bash
# Using Supabase CLI
supabase db push

# Or directly via psql
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql "postgres://postgres@db.lgveqfnpkxvzbnnwuled.supabase.co:5432/postgres?sslmode=require" -f supabase/migrations/20251230_subcontract_schema.sql
```

## Drizzle ORM Integration

The schema is also defined in Drizzle ORM format at `frontend/src/lib/db/schema.ts`:

```typescript
import { db } from '@/lib/db';
import { subcontracts, subcontractSovItems, subcontractAttachments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Create a subcontract
const newSubcontract = await db
  .insert(subcontracts)
  .values({
    title: 'Electrical Installation',
    projectId: 67,
    status: 'Draft',
  })
  .returning();

// Add SOV line item
await db.insert(subcontractSovItems).values({
  subcontractId: newSubcontract[0].id,
  lineNumber: 1,
  budgetCode: '01-1000',
  description: 'Rough-in work',
  amount: '50000.00',
});

// Query with totals (use the view)
const contractsWithTotals = await db.execute(
  sql`SELECT * FROM subcontracts_with_totals WHERE project_id = ${projectId}`
);
```

## Zod Schema Validation

The form validation schema is at `frontend/src/lib/schemas/create-subcontract-schema.ts`:

```typescript
import { CreateSubcontractSchema } from '@/lib/schemas/create-subcontract-schema';

// Validate form data
const result = CreateSubcontractSchema.safeParse(formData);
if (result.success) {
  // Data is valid, use result.data
}
```

## Front-end Form Component

The DOM-faithful form component is at `frontend/src/components/domain/contracts/CreateSubcontractForm.tsx`.

All 9 sections are implemented:
1. General Information
2. Attachments
3. Schedule of Values (SOV)
4. Inclusions & Exclusions
5. Contract Dates
6. Contract Privacy
7. Invoice Contacts

## Next Steps

1. **Apply the migration** to your Supabase database
2. **Update Supabase types** (if needed):
   ```bash
   npx supabase gen types typescript --project-id "lgveqfnpkxvzbnnwuled" --schema public > frontend/src/types/database.types.ts
   ```
3. **Implement the API route** at `frontend/src/app/api/projects/[id]/subcontracts/route.ts` to handle form submissions
4. **Set up Supabase Storage bucket** for attachments (if not already exists)
5. **Test the form** at `/form-commitments?projectId=67&type=subcontract`

## Notes

- Date fields are stored as TEXT in mm/dd/yyyy format (as per Zod schema spec)
- All rich text fields (description, inclusions, exclusions) are stored as TEXT (HTML)
- Arrays (non_admin_user_ids, invoice_contact_ids) use PostgreSQL native array types
- Retainage is stored as a percentage (0-100), not a decimal (0-1)
- Contract numbers are auto-generated but can be overridden before save
- The schema matches the Procore DOM specification exactly
