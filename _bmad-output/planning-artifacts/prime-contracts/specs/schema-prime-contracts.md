---
title: SCHEMA PrimeContracts
description: SCHEMA PrimeContracts documentation
---

# Prime Contracts Database Schema

## Database Tables Overview

The Prime Contracts module uses 6 core tables with relationships for comprehensive contract management:

1. **prime_contracts** - Main contract records
2. **prime_contract_change_orders** - Change order tracking and approval workflow
3. **prime_contract_sovs** - Schedule of Values line items
4. **contract_line_items** - Individual contract line items
5. **contract_billing_periods** - Billing schedule and periods
6. **contract_payments** - Payment tracking and history

## Table Definitions

### 1. prime_contracts (Main Contract Table)

```sql
CREATE TABLE "prime_contracts" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    "project_id" bigint NOT NULL,
    "contract_number" text NOT NULL,
    "title" text NOT NULL,
    "vendor_id" uuid,                                    -- ⚠️ ISSUE: Should be client_id
    "description" text,
    "status" text DEFAULT 'draft' NOT NULL,
    "original_contract_value" numeric(15, 2) DEFAULT '0' NOT NULL,
    "revised_contract_value" numeric(15, 2) DEFAULT '0' NOT NULL,  -- ⚠️ ISSUE: Should be calculated
    "start_date" date,
    "end_date" date,
    "retention_percentage" numeric(5, 2) DEFAULT '0',
    "payment_terms" text,
    "billing_schedule" text,
    "created_by" uuid,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

    CONSTRAINT "prime_contracts_project_id_contract_number_key" UNIQUE("project_id","contract_number"),
    CONSTRAINT "prime_contracts_original_contract_value_check" CHECK (original_contract_value >= 0::numeric),
    CONSTRAINT "prime_contracts_retention_percentage_check" CHECK ((retention_percentage >= 0::numeric) AND (retention_percentage <= 100::numeric)),
    CONSTRAINT "prime_contracts_revised_contract_value_check" CHECK (revised_contract_value >= 0::numeric),
    CONSTRAINT "prime_contracts_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'completed'::text, 'cancelled'::text, 'on_hold'::text])),
    CONSTRAINT "valid_date_range" CHECK ((end_date IS NULL) OR (start_date IS NULL) OR (end_date >= start_date))
);

-- Enable Row Level Security
ALTER TABLE "prime_contracts" ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX "idx_prime_contracts_project_id" ON "prime_contracts" ("project_id");
CREATE INDEX "idx_prime_contracts_status" ON "prime_contracts" ("status");
CREATE INDEX "idx_prime_contracts_vendor_id" ON "prime_contracts" ("vendor_id");
CREATE INDEX "idx_prime_contracts_created_at" ON "prime_contracts" ("created_at");
```sql
### 2. prime_contract_change_orders (Change Orders)

```sql
CREATE TABLE "prime_contract_change_orders" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    "contract_id" uuid NOT NULL,
    "change_order_number" text NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "amount" numeric(15, 2) DEFAULT '0' NOT NULL,
    "status" text DEFAULT 'draft' NOT NULL,
    "requested_by" uuid,
    "requested_date" timestamp with time zone DEFAULT now(),
    "approved_by" uuid,
    "approved_date" timestamp with time zone,
    "rejection_reason" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

    CONSTRAINT "change_orders_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'pending'::text, 'approved'::text, 'rejected'::text])),
    CONSTRAINT "contract_change_order_number_unique" UNIQUE("contract_id", "change_order_number")
);

-- Enable Row Level Security
ALTER TABLE "prime_contract_change_orders" ENABLE ROW LEVEL SECURITY;

-- Foreign Key
ALTER TABLE "prime_contract_change_orders"
ADD CONSTRAINT "fk_change_orders_contract"
FOREIGN KEY ("contract_id") REFERENCES "prime_contracts"("id") ON DELETE CASCADE;

-- Indexes
CREATE INDEX "idx_change_orders_contract_id" ON "prime_contract_change_orders" ("contract_id");
CREATE INDEX "idx_change_orders_status" ON "prime_contract_change_orders" ("status");
CREATE INDEX "idx_change_orders_requested_date" ON "prime_contract_change_orders" ("requested_date");
```sql
### 3. prime_contract_sovs (Schedule of Values)

```sql
CREATE TABLE "prime_contract_sovs" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    "contract_id" uuid NOT NULL,
    "line_number" integer NOT NULL,
    "description" text NOT NULL,
    "cost_code_id" uuid,
    "scheduled_value" numeric(15, 2) DEFAULT '0' NOT NULL,
    "work_completed_from_previous_applications" numeric(15, 2) DEFAULT '0',
    "work_completed_this_period" numeric(15, 2) DEFAULT '0',
    "materials_stored_to_date" numeric(15, 2) DEFAULT '0',
    "total_completed_and_stored" numeric(15, 2) DEFAULT '0',
    "percentage_complete" numeric(5, 2) DEFAULT '0',
    "balance_to_finish" numeric(15, 2) DEFAULT '0',
    "retainage_rate" numeric(5, 2) DEFAULT '0',
    "retainage_amount" numeric(15, 2) DEFAULT '0',
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

    CONSTRAINT "sov_line_number_unique" UNIQUE("contract_id", "line_number"),
    CONSTRAINT "sov_scheduled_value_check" CHECK (scheduled_value >= 0::numeric),
    CONSTRAINT "sov_percentage_complete_check" CHECK ((percentage_complete >= 0::numeric) AND (percentage_complete <= 100::numeric))
);

-- Enable Row Level Security
ALTER TABLE "prime_contract_sovs" ENABLE ROW LEVEL SECURITY;

-- Foreign Key
ALTER TABLE "prime_contract_sovs"
ADD CONSTRAINT "fk_sovs_contract"
FOREIGN KEY ("contract_id") REFERENCES "prime_contracts"("id") ON DELETE CASCADE;

-- Indexes
CREATE INDEX "idx_sovs_contract_id" ON "prime_contract_sovs" ("contract_id");
CREATE INDEX "idx_sovs_line_number" ON "prime_contract_sovs" ("line_number");
CREATE INDEX "idx_sovs_cost_code_id" ON "prime_contract_sovs" ("cost_code_id");
```sql
### 4. contract_line_items (Contract Line Items)

```sql
CREATE TABLE "contract_line_items" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    "contract_id" uuid NOT NULL,
    "line_number" integer NOT NULL,
    "description" text NOT NULL,
    "cost_code_id" uuid,
    "quantity" numeric(10, 3) DEFAULT '0',
    "unit_of_measure" text,
    "unit_cost" numeric(15, 2) DEFAULT '0',
    "total_cost" numeric(15, 2) DEFAULT '0' NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

    CONSTRAINT "line_items_line_number_unique" UNIQUE("contract_id", "line_number"),
    CONSTRAINT "line_items_quantity_check" CHECK (quantity >= 0::numeric),
    CONSTRAINT "line_items_unit_cost_check" CHECK (unit_cost >= 0::numeric),
    CONSTRAINT "line_items_total_cost_check" CHECK (total_cost >= 0::numeric)
);

-- Enable Row Level Security
ALTER TABLE "contract_line_items" ENABLE ROW LEVEL SECURITY;

-- Foreign Key
ALTER TABLE "contract_line_items"
ADD CONSTRAINT "fk_line_items_contract"
FOREIGN KEY ("contract_id") REFERENCES "prime_contracts"("id") ON DELETE CASCADE;

-- Indexes
CREATE INDEX "idx_line_items_contract_id" ON "contract_line_items" ("contract_id");
CREATE INDEX "idx_line_items_cost_code_id" ON "contract_line_items" ("cost_code_id");
CREATE INDEX "idx_line_items_line_number" ON "contract_line_items" ("line_number");
```

### 5. contract_billing_periods (Billing Periods)

```sql
CREATE TABLE "contract_billing_periods" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    "contract_id" uuid NOT NULL,
    "period_number" integer NOT NULL,
    "period_start_date" date NOT NULL,
    "period_end_date" date NOT NULL,
    "billed_amount" numeric(15, 2) DEFAULT '0',
    "retention_withheld" numeric(15, 2) DEFAULT '0',
    "status" text DEFAULT 'draft' NOT NULL,
    "invoice_number" text,
    "invoice_date" date,
    "due_date" date,
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

    CONSTRAINT "billing_periods_period_number_unique" UNIQUE("contract_id", "period_number"),
    CONSTRAINT "billing_periods_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'paid'::text])),
    CONSTRAINT "billing_periods_billed_amount_check" CHECK (billed_amount >= 0::numeric),
    CONSTRAINT "billing_periods_retention_check" CHECK (retention_withheld >= 0::numeric),
    CONSTRAINT "billing_periods_date_range_check" CHECK (period_end_date >= period_start_date)
);

-- Enable Row Level Security
ALTER TABLE "contract_billing_periods" ENABLE ROW LEVEL SECURITY;

-- Foreign Key
ALTER TABLE "contract_billing_periods"
ADD CONSTRAINT "fk_billing_periods_contract"
FOREIGN KEY ("contract_id") REFERENCES "prime_contracts"("id") ON DELETE CASCADE;

-- Indexes
CREATE INDEX "idx_billing_periods_contract_id" ON "contract_billing_periods" ("contract_id");
CREATE INDEX "idx_billing_periods_status" ON "contract_billing_periods" ("status");
CREATE INDEX "idx_billing_periods_period_start" ON "contract_billing_periods" ("period_start_date");
CREATE INDEX "idx_billing_periods_due_date" ON "contract_billing_periods" ("due_date");
```sql
### 6. contract_payments (Payment Tracking)

```sql
CREATE TABLE "contract_payments" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    "contract_id" uuid NOT NULL,
    "billing_period_id" uuid,
    "payment_date" date NOT NULL,
    "amount" numeric(15, 2) NOT NULL,
    "retention_released" numeric(15, 2) DEFAULT '0',
    "check_number" text,
    "reference_number" text,
    "payment_method" text,
    "notes" text,
    "created_by" uuid,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,

    CONSTRAINT "payments_amount_check" CHECK (amount >= 0::numeric),
    CONSTRAINT "payments_retention_released_check" CHECK (retention_released >= 0::numeric)
);

-- Enable Row Level Security
ALTER TABLE "contract_payments" ENABLE ROW LEVEL SECURITY;

-- Foreign Keys
ALTER TABLE "contract_payments"
ADD CONSTRAINT "fk_payments_contract"
FOREIGN KEY ("contract_id") REFERENCES "prime_contracts"("id") ON DELETE CASCADE;

ALTER TABLE "contract_payments"
ADD CONSTRAINT "fk_payments_billing_period"
FOREIGN KEY ("billing_period_id") REFERENCES "contract_billing_periods"("id") ON DELETE SET NULL;

-- Indexes
CREATE INDEX "idx_payments_contract_id" ON "contract_payments" ("contract_id");
CREATE INDEX "idx_payments_billing_period_id" ON "contract_payments" ("billing_period_id");
CREATE INDEX "idx_payments_payment_date" ON "contract_payments" ("payment_date");
CREATE INDEX "idx_payments_created_at" ON "contract_payments" ("created_at");
```sql
## Critical Schema Issues (Must Fix for Procore Compatibility)

### ⚠️ Issue 1: Wrong Entity Type

**Current**: `vendor_id` in prime_contracts table
**Should be**: `client_id` or `owner_id`
**Problem**: Prime Contracts track relationships with clients/owners (who pay us), not vendors (who we pay)

**Fix Required**:

```sql
-- Migration to rename column
ALTER TABLE prime_contracts RENAME COLUMN vendor_id TO client_id;

-- Update all references in code
-- Update foreign key constraints if applicable
```sql
### ⚠️ Issue 2: Missing Executed Status Field
**Missing**: `executed_at` timestamp field
**Purpose**: Track when contract was fully executed/signed

**Fix Required**:
```sql
ALTER TABLE prime_contracts
ADD COLUMN executed_at timestamp with time zone;

-- Add index for performance
CREATE INDEX idx_prime_contracts_executed_at ON prime_contracts (executed_at);
```

### ⚠️ Issue 3: Revised Contract Value Should Be Calculated

**Current**: Manual entry allowed
**Should be**: Auto-calculated as `original_contract_value + SUM(approved change orders)`

**Fix Required**:

```sql
-- Make field read-only in application code
-- Add computed column or view for calculations
-- Remove manual edit capability from forms
```sql
## Data Migration Scripts

### Migration 1: Fix Entity Type (vendor_id → client_id)

```sql
-- Step 1: Add new column
ALTER TABLE prime_contracts ADD COLUMN client_id uuid;

-- Step 2: Copy data (if vendors represent clients)
UPDATE prime_contracts SET client_id = vendor_id;

-- Step 3: Update foreign key if exists
-- ALTER TABLE prime_contracts DROP CONSTRAINT IF EXISTS fk_prime_contracts_vendor;
-- ALTER TABLE prime_contracts ADD CONSTRAINT fk_prime_contracts_client
--   FOREIGN KEY (client_id) REFERENCES companies(id);

-- Step 4: Drop old column
ALTER TABLE prime_contracts DROP COLUMN vendor_id;

-- Step 5: Add index
CREATE INDEX idx_prime_contracts_client_id ON prime_contracts (client_id);
```sql
### Migration 2: Add Executed Status

```sql
ALTER TABLE prime_contracts
ADD COLUMN executed_at timestamp with time zone;

CREATE INDEX idx_prime_contracts_executed_at ON prime_contracts (executed_at);
```sql
### Migration 3: Add Missing Financial Fields

```sql
-- Add private flag
ALTER TABLE prime_contracts
ADD COLUMN is_private boolean DEFAULT false NOT NULL;

-- Add creation source tracking
ALTER TABLE prime_contracts
ADD COLUMN created_from text; -- 'manual', 'import', 'template', etc.

-- Add additional date tracking
ALTER TABLE prime_contracts
ADD COLUMN signed_date date;
```

## Views and Helper Functions

### Financial Summary View

```sql
CREATE OR REPLACE VIEW prime_contracts_financial_summary AS
SELECT
    pc.id,
    pc.contract_number,
    pc.title,
    pc.original_contract_value,

    -- Approved Change Orders
    COALESCE(SUM(CASE WHEN co.status = 'approved' THEN co.amount ELSE 0 END), 0) as approved_change_orders,

    -- Pending Change Orders
    COALESCE(SUM(CASE WHEN co.status = 'pending' THEN co.amount ELSE 0 END), 0) as pending_change_orders,

    -- Draft Change Orders
    COALESCE(SUM(CASE WHEN co.status = 'draft' THEN co.amount ELSE 0 END), 0) as draft_change_orders,

    -- Revised Contract Value (calculated)
    pc.original_contract_value + COALESCE(SUM(CASE WHEN co.status = 'approved' THEN co.amount ELSE 0 END), 0) as revised_contract_value,

    -- Billed Amount
    COALESCE(SUM(bp.billed_amount), 0) as total_billed,

    -- Payments Received
    COALESCE(SUM(p.amount), 0) as total_payments,

    -- Retention Withheld
    COALESCE(SUM(bp.retention_withheld), 0) as total_retention_withheld,

    -- Retention Released
    COALESCE(SUM(p.retention_released), 0) as total_retention_released,

    -- Calculated fields
    CASE
        WHEN (pc.original_contract_value + COALESCE(SUM(CASE WHEN co.status = 'approved' THEN co.amount ELSE 0 END), 0)) > 0
        THEN (COALESCE(SUM(p.amount), 0) / (pc.original_contract_value + COALESCE(SUM(CASE WHEN co.status = 'approved' THEN co.amount ELSE 0 END), 0))) * 100
        ELSE 0
    END as percent_paid,

    -- Remaining Balance
    (pc.original_contract_value + COALESCE(SUM(CASE WHEN co.status = 'approved' THEN co.amount ELSE 0 END), 0)) - COALESCE(SUM(p.amount), 0) as remaining_balance

FROM prime_contracts pc
LEFT JOIN prime_contract_change_orders co ON pc.id = co.contract_id
LEFT JOIN contract_billing_periods bp ON pc.id = bp.contract_id
LEFT JOIN contract_payments p ON pc.id = p.contract_id
GROUP BY pc.id, pc.contract_number, pc.title, pc.original_contract_value;
```sql
### Performance Optimization Functions

```sql
-- Function to recalculate contract totals
CREATE OR REPLACE FUNCTION recalculate_contract_totals(contract_id uuid)
RETURNS void AS $$
BEGIN
    -- Update any calculated fields that need refresh
    -- This function can be called after change order approvals
    -- or payment updates to ensure data consistency

    UPDATE prime_contracts
    SET updated_at = now()
    WHERE id = contract_id;

END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update revised contract value when change orders are approved
CREATE OR REPLACE FUNCTION auto_update_revised_contract_value()
RETURNS trigger AS $$
BEGIN
    -- Only update if change order status changed to 'approved'
    IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
        UPDATE prime_contracts
        SET
            revised_contract_value = original_contract_value + (
                SELECT COALESCE(SUM(amount), 0)
                FROM prime_contract_change_orders
                WHERE contract_id = NEW.contract_id AND status = 'approved'
            ),
            updated_at = now()
        WHERE id = NEW.contract_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
CREATE TRIGGER trigger_update_revised_contract_value
    AFTER UPDATE ON prime_contract_change_orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_revised_contract_value();
```sql
## Performance Considerations

### Indexing Strategy

- **Primary indexes**: All foreign keys indexed
- **Composite indexes**: project_id + contract_number for uniqueness
- **Date indexes**: For date range queries on billing and payment dates
- **Status indexes**: For filtering by workflow status

### Query Optimization

- Use the financial summary view for dashboard queries
- Implement pagination for large contract lists
- Cache frequently accessed calculations
- Use partial indexes for active contracts only

### Data Archival

- Consider partitioning by project_id for very large datasets
- Archive completed contracts older than 7 years
- Maintain audit trail for all financial changes

## Security and Access Control

### Row Level Security Policies

```sql
-- Example RLS policy for prime_contracts
CREATE POLICY "Users can view contracts in their projects" ON prime_contracts
    FOR SELECT
    USING (
        project_id IN (
            SELECT project_id
            FROM project_permissions
            WHERE user_id = auth.uid()
        )
    );

-- Policy for change order creation
CREATE POLICY "Users can create change orders in authorized projects" ON prime_contract_change_orders
    FOR INSERT
    WITH CHECK (
        contract_id IN (
            SELECT id
            FROM prime_contracts
            WHERE project_id IN (
                SELECT project_id
                FROM project_permissions
                WHERE user_id = auth.uid()
                AND permission_level IN ('admin', 'manager', 'editor')
            )
        )
    );
```

### Data Validation Rules

- Contract numbers must be unique within projects
- Financial amounts cannot be negative
- Date ranges must be logical (end_date >= start_date)
- Retention percentages must be between 0-100%
- Change order approvals require appropriate user permissions

## Integration Points

### Budget System Integration

- Contract line items link to budget cost codes
- Contract commitments update budget committed amounts
- Change orders affect budget variance calculations

### Project Management Integration

- Contracts linked to projects via project_id
- Contract milestones integrate with project schedules
- Contract status affects project financial health

### Accounting System Integration

- Payment records export to QuickBooks/Sage formats
- Billing periods generate invoice data
- Retention tracking for accounts receivable

This schema provides a robust foundation for prime contract management with proper relationships, constraints, and performance optimizations while maintaining data integrity and security.
