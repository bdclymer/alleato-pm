---
title: SCHEMA Budget
description: SCHEMA Budget documentation
---

# Budget Database Schema

## Database Tables Overview

The budget system uses a normalized schema with 8 core tables and 5 calculation views:

**Core Tables**:

1. `sub_jobs` - Project phases and sub-divisions
2. `project_project_budget_codes` - Grouping level (project + cost code + sub-job + cost type)
3. `budget_lines` - Detail level within budget codes
4. `change_order_lines` - Change order line details
5. `direct_cost_line_items` - Direct cost tracking
6. `budget_views` - Custom budget view configurations
7. `budget_view_columns` - Column configuration for views
8. `forecasting_curves` - Forecasting methodology definitions

**Calculation Views**:

- `v_budget_rollup` - Real-time budget calculations
- `mv_budget_rollup` - Materialized view for performance
- `v_budget_grand_totals` - Project-level aggregations
- `v_budget_with_markup` - Budget with markup calculations
- `budget_snapshots` - Point-in-time budget captures

## Table Definitions

### 1. sub_jobs

**Purpose**: Project phases and work subdivisions

```sql
CREATE TABLE sub_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_subjob_code UNIQUE (project_id, code)
);

-- Indexes
CREATE INDEX idx_sub_jobs_project ON sub_jobs(project_id);
CREATE INDEX idx_sub_jobs_active ON sub_jobs(is_active) WHERE is_active = true;

-- RLS Policy
CREATE POLICY sub_jobs_policy ON sub_jobs FOR ALL USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
);
```sql
### 2. project_project_budget_codes
**Purpose**: Grouping level combining project, cost code, sub-job, and cost type
```sql
CREATE TABLE project_project_budget_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sub_job_id UUID REFERENCES sub_jobs(id) ON DELETE SET NULL,
    cost_code_id TEXT NOT NULL REFERENCES cost_codes(id),
    cost_type_id UUID REFERENCES cost_code_types(id) ON DELETE SET NULL,
    description TEXT,
    position INTEGER DEFAULT 999,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Unique constraint with nullable columns
CREATE UNIQUE INDEX idx_project_project_budget_codes_unique ON project_project_budget_codes(
    project_id,
    cost_code_id,
    COALESCE(sub_job_id::text, ''),
    COALESCE(cost_type_id::text, '')
);

-- Performance indexes
CREATE INDEX idx_project_project_budget_codes_project ON project_project_budget_codes(project_id);
CREATE INDEX idx_project_project_budget_codes_cost_code ON project_project_budget_codes(cost_code_id);
CREATE INDEX idx_project_project_budget_codes_cost_type ON project_project_budget_codes(cost_type_id);
CREATE INDEX idx_project_project_budget_codes_subjob ON project_project_budget_codes(sub_job_id);

-- RLS Policy
CREATE POLICY project_project_budget_codes_policy ON project_project_budget_codes FOR ALL USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
);
```sql
### 3. budget_lines

**Purpose**: Individual budget line details within a budget code

```sql
CREATE TABLE budget_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_budget_code_id UUID NOT NULL REFERENCES project_project_budget_codes(id) ON DELETE CASCADE,
    description TEXT,
    line_number INTEGER,
    original_amount DECIMAL(15,2) DEFAULT 0,
    unit_qty DECIMAL(15,3),
    uom VARCHAR(50),
    unit_cost DECIMAL(15,2),
    calculation_method VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    -- Forecasting columns (added in forecasting migration)
    default_ftc_method TEXT DEFAULT 'manual' CHECK (default_ftc_method IN ('manual', 'automatic', 'lump_sum', 'monitored_resources')),
    default_curve_id UUID REFERENCES forecasting_curves(id),
    forecasting_enabled BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX idx_budget_lines_project_budget_code ON budget_lines(project_budget_code_id);

-- RLS Policy (inherits from project_project_budget_codes)
CREATE POLICY budget_lines_policy ON budget_lines FOR ALL USING (
    project_budget_code_id IN (
        SELECT id FROM project_project_budget_codes
        WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
);
```sql
### 4. change_order_lines
**Purpose**: Change order line item tracking
```sql
CREATE TABLE change_order_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    change_order_id BIGINT NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,
    project_budget_code_id UUID REFERENCES project_project_budget_codes(id) ON DELETE SET NULL,
    cost_code_id TEXT REFERENCES cost_codes(id),
    description TEXT NOT NULL,
    line_number INTEGER,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    unit_qty DECIMAL(15,3),
    uom VARCHAR(50),
    unit_cost DECIMAL(15,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_change_order_lines_co ON change_order_lines(change_order_id);
CREATE INDEX idx_change_order_lines_budget ON change_order_lines(project_budget_code_id);
CREATE INDEX idx_change_order_lines_cost_code ON change_order_lines(cost_code_id);
```

### 5. direct_cost_line_items

**Purpose**: Direct cost tracking and actuals

```sql
CREATE TABLE direct_cost_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    project_budget_code_id UUID REFERENCES project_project_budget_codes(id) ON DELETE SET NULL,
    cost_code_id TEXT REFERENCES cost_codes(id),
    description TEXT NOT NULL,
    transaction_date DATE NOT NULL,
    vendor_name VARCHAR(255),
    invoice_number VARCHAR(100),
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    approved BOOLEAN DEFAULT false,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    cost_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_direct_cost_line_items_project ON direct_cost_line_items(project_id);
CREATE INDEX idx_direct_cost_line_items_budget ON direct_cost_line_items(budget_code_id);
CREATE INDEX idx_direct_cost_line_items_cost_code ON direct_cost_line_items(cost_code_id);
CREATE INDEX idx_direct_cost_line_items_approved ON direct_cost_line_items(approved);
CREATE INDEX idx_direct_cost_line_items_date ON direct_cost_line_items(transaction_date);
```sql
### 6. budget_views
**Purpose**: Custom budget view configurations
```sql
CREATE TABLE budget_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraints
ALTER TABLE budget_views ADD CONSTRAINT uq_budget_view_default
    EXCLUDE (project_id WITH =) WHERE (is_default = true);

-- Indexes
CREATE INDEX idx_budget_views_project ON budget_views(project_id);
CREATE INDEX idx_budget_views_default ON budget_views(project_id, is_default) WHERE is_default = true;

-- RLS Policy
CREATE POLICY budget_views_policy ON budget_views FOR ALL USING (
    project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
);
```sql
### 7. budget_view_columns

**Purpose**: Column configuration for budget views

```sql
CREATE TABLE budget_view_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    view_id UUID NOT NULL REFERENCES budget_views(id) ON DELETE CASCADE,
    column_key VARCHAR(100) NOT NULL,
    display_name VARCHAR(255),
    is_visible BOOLEAN DEFAULT true,
    display_order INTEGER NOT NULL,
    width_px INTEGER,
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraints
ALTER TABLE budget_view_columns ADD CONSTRAINT uq_view_column_key
    UNIQUE (view_id, column_key);
ALTER TABLE budget_view_columns ADD CONSTRAINT uq_view_column_order
    UNIQUE (view_id, display_order);

-- Indexes
CREATE INDEX idx_budget_view_columns_view ON budget_view_columns(view_id);
CREATE INDEX idx_budget_view_columns_order ON budget_view_columns(view_id, display_order);

-- RLS Policy (inherits from budget_views)
CREATE POLICY budget_view_columns_policy ON budget_view_columns FOR ALL USING (
    view_id IN (
        SELECT id FROM budget_views
        WHERE project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid())
    )
);
```sql
### 8. forecasting_curves
**Purpose**: Forecasting methodology definitions
```sql
CREATE TABLE forecasting_curves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    curve_type TEXT NOT NULL CHECK (curve_type IN ('linear', 's_curve', 'custom')),
    curve_data JSONB, -- Stores curve parameters or data points
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default curves
INSERT INTO forecasting_curves (id, name, description, curve_type, is_system) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Linear Distribution', 'Uniform cost distribution over time', 'linear', true),
    ('00000000-0000-0000-0000-000000000002', 'Standard S-Curve', 'Traditional construction S-curve pattern', 's_curve', true);
```

### 9. budget_line_forecasts

**Purpose**: Forecast to complete calculations per budget line

```sql
CREATE TABLE budget_line_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_line_id UUID NOT NULL REFERENCES budget_lines(id) ON DELETE CASCADE,
    forecast_date DATE NOT NULL,
    forecasted_cost DECIMAL(15,2) NOT NULL,
    forecast_to_complete DECIMAL(15,2) NOT NULL,
    projected_final_cost DECIMAL(15,2) NOT NULL,
    variance_at_completion DECIMAL(15,2) NOT NULL,
    burn_rate DECIMAL(15,4),
    percent_complete DECIMAL(5,2) CHECK (percent_complete >= 0 AND percent_complete <= 100),
    ftc_method TEXT NOT NULL CHECK (ftc_method IN ('manual', 'automatic', 'lump_sum', 'monitored_resources')),
    curve_id UUID REFERENCES forecasting_curves(id),
    manual_override BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Unique constraint for one forecast per line per date
ALTER TABLE budget_line_forecasts
ADD CONSTRAINT uq_budget_line_forecast_date
UNIQUE (budget_line_id, forecast_date);
```sql
## Data Migration Scripts

### Migration from budget_items to new structure
```sql
-- Add reference columns to existing budget_items
ALTER TABLE budget_items
    ADD COLUMN IF NOT EXISTS budget_code_id UUID REFERENCES project_budget_codes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sub_job_id UUID REFERENCES sub_jobs(id) ON DELETE SET NULL;

-- Migration procedure (executed in 011_migrate_existing_budget_data.sql)
DO $migration$
DECLARE
    budget_item RECORD;
    budget_code_uuid UUID;
BEGIN
    FOR budget_item IN
        SELECT id, project_id, cost_code_id, sub_job_id, cost_type_id,
               description, amount, unit_qty, uom, unit_cost,
               created_at, created_by, updated_at, updated_by
        FROM budget_items
        WHERE budget_code_id IS NULL
        ORDER BY project_id, cost_code_id
    LOOP
        -- Create or get budget_code
        INSERT INTO project_budget_codes (project_id, sub_job_id, cost_code_id, cost_type_id)
        VALUES (budget_item.project_id, budget_item.sub_job_id, budget_item.cost_code_id, budget_item.cost_type_id)
        ON CONFLICT ON CONSTRAINT idx_project_budget_codes_unique DO NOTHING
        RETURNING id INTO budget_code_uuid;

        -- Get existing budget_code if conflict
        IF budget_code_uuid IS NULL THEN
            SELECT id INTO budget_code_uuid FROM project_budget_codes
            WHERE project_id = budget_item.project_id
              AND cost_code_id = budget_item.cost_code_id
              AND COALESCE(sub_job_id::text, '') = COALESCE(budget_item.sub_job_id::text, '')
              AND COALESCE(cost_type_id::text, '') = COALESCE(budget_item.cost_type_id::text, '');
        END IF;

        -- Create budget_line_item
        INSERT INTO budget_lines (
            budget_code_id, description, original_amount,
            unit_qty, uom, unit_cost, created_at, created_by
        ) VALUES (
            budget_code_uuid, budget_item.description, budget_item.amount,
            budget_item.unit_qty, budget_item.uom, budget_item.unit_cost,
            budget_item.created_at, budget_item.created_by
        );

        -- Update budget_items with reference
        UPDATE budget_items
        SET budget_code_id = budget_code_uuid
        WHERE id = budget_item.id;

    END LOOP;
END;
$migration$;
```sql
## Views and Helper Functions

### 1. v_budget_rollup - Real-time Budget Calculations

```sql
CREATE VIEW v_budget_rollup AS
SELECT
    bc.id as budget_code_id,
    bc.project_id,
    bc.cost_code_id,
    bc.cost_type_id,
    bc.sub_job_id,
    bc.description,

    -- Original Budget (sum of line items)
    COALESCE(SUM(bli.original_amount), 0) as original_budget_amount,

    -- Budget Modifications (from budget_modifications table)
    COALESCE(budget_mods.total_modifications, 0) as budget_modifications,

    -- Approved Change Orders
    COALESCE(approved_cos.total_approved_cos, 0) as approved_cos,

    -- Revised Budget = Original + Modifications + Approved COs
    COALESCE(SUM(bli.original_amount), 0) +
    COALESCE(budget_mods.total_modifications, 0) +
    COALESCE(approved_cos.total_approved_cos, 0) as revised_budget,

    -- Committed Costs (from commitments)
    COALESCE(committed.total_committed, 0) as committed_costs,

    -- Direct Costs (approved only)
    COALESCE(direct_costs.total_direct_costs, 0) as direct_costs,

    -- Job to Date Cost = Direct Costs
    COALESCE(direct_costs.total_direct_costs, 0) as job_to_date_cost,

    -- Pending Cost Changes (from pending commitments/COs)
    COALESCE(pending_costs.total_pending, 0) as pending_cost_changes,

    -- Projected Costs = Direct Costs + Committed + Pending
    COALESCE(direct_costs.total_direct_costs, 0) +
    COALESCE(committed.total_committed, 0) +
    COALESCE(pending_costs.total_pending, 0) as projected_costs,

    -- Forecast to Complete = Projected Costs - Job to Date
    GREATEST(0,
        COALESCE(direct_costs.total_direct_costs, 0) +
        COALESCE(committed.total_committed, 0) +
        COALESCE(pending_costs.total_pending, 0) -
        COALESCE(direct_costs.total_direct_costs, 0)
    ) as forecast_to_complete,

    -- Projected Budget = Revised Budget + Pending Budget Changes
    COALESCE(SUM(bli.original_amount), 0) +
    COALESCE(budget_mods.total_modifications, 0) +
    COALESCE(approved_cos.total_approved_cos, 0) +
    COALESCE(pending_budget.total_pending_budget, 0) as projected_budget,

    -- Projected Over/Under = Projected Budget - Projected Costs
    (COALESCE(SUM(bli.original_amount), 0) +
     COALESCE(budget_mods.total_modifications, 0) +
     COALESCE(approved_cos.total_approved_cos, 0) +
     COALESCE(pending_budget.total_pending_budget, 0)) -
    (COALESCE(direct_costs.total_direct_costs, 0) +
     COALESCE(committed.total_committed, 0) +
     COALESCE(pending_costs.total_pending, 0)) as projected_over_under

FROM project_budget_codes bc
LEFT JOIN budget_lines bli ON bc.id = bli.budget_code_id
-- Additional JOINs for modifications, change orders, commitments, direct costs
GROUP BY bc.id, [all other columns];
```sql
### 2. Function: refresh_budget_rollup
```sql
CREATE OR REPLACE FUNCTION refresh_budget_rollup(p_project_id BIGINT)
RETURNS VOID AS $$
BEGIN
    -- Refresh materialized view for specific project
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_budget_rollup;

    -- Log refresh
    INSERT INTO system_logs (action, details, created_at)
    VALUES ('budget_rollup_refresh',
            jsonb_build_object('project_id', p_project_id),
            NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Function: create_budget_snapshot

```sql
CREATE OR REPLACE FUNCTION create_budget_snapshot(
    p_project_id BIGINT,
    p_name TEXT,
    p_type TEXT DEFAULT 'manual',
    p_description TEXT DEFAULT NULL,
    p_set_as_baseline BOOLEAN DEFAULT false
) RETURNS UUID AS $$
DECLARE
    snapshot_id UUID;
BEGIN
    -- Create snapshot record
    INSERT INTO budget_snapshots (
        project_id, name, snapshot_type, description,
        is_baseline, line_items, grand_totals
    )
    SELECT
        p_project_id,
        p_name,
        p_type,
        p_description,
        p_set_as_baseline,
        jsonb_agg(line_items_data) as line_items,
        (SELECT jsonb_build_object(
            'total_original_budget', SUM(original_budget_amount),
            'total_revised_budget', SUM(revised_budget),
            'total_projected_costs', SUM(projected_costs)
        ) FROM mv_budget_rollup WHERE project_id = p_project_id) as grand_totals
    FROM (
        SELECT jsonb_build_object(
            'budget_code_id', budget_code_id,
            'cost_code_id', cost_code_id,
            'description', description,
            'original_budget', original_budget_amount,
            'revised_budget', revised_budget,
            'projected_costs', projected_costs,
            'over_under', projected_over_under
        ) as line_items_data
        FROM mv_budget_rollup
        WHERE project_id = p_project_id
    ) snapshot_data
    RETURNING id INTO snapshot_id;

    RETURN snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```markdown
## Performance Considerations

### Materialized View Strategy
- `mv_budget_rollup` materialized for read performance
- Manual refresh after write operations
- CONCURRENTLY refresh to avoid locking during refresh
- Unique index on (project_id, budget_code_id) for fast refreshes

### Index Strategy
- Foreign key indexes on all reference columns
- Composite indexes for common query patterns
- Partial indexes on filtered columns (is_active, approved)
- Unique indexes with COALESCE for nullable columns

### Query Optimization
- Budget calculations performed in SQL, not application layer
- JOIN optimization for complex budget rollups
- Proper use of DECIMAL(15,2) for financial precision
- TIMESTAMPTZ for accurate audit trails

## Data Integrity Constraints

### Foreign Key Relationships
```text
projects(id) ←→ sub_jobs(project_id)
projects(id) ←→ project_budget_codes(project_id)
projects(id) ←→ direct_cost_line_items(project_id)

cost_codes(id) ←→ project_budget_codes(cost_code_id)
cost_code_types(id) ←→ project_budget_codes(cost_type_id)

project_budget_codes(id) ←→ budget_lines(budget_code_id)
project_budget_codes(id) ←→ change_order_lines(budget_code_id)
project_budget_codes(id) ←→ direct_cost_line_items(budget_code_id)

change_orders(id) ←→ change_order_lines(change_order_id)

auth.users(id) ←→ [created_by, updated_by, approved_by columns]

```

### Business Rules

1. **Budget Code Uniqueness**: One budget_code per (project, cost_code, sub_job, cost_type) combination
2. **Financial Precision**: All monetary values use DECIMAL(15,2) for accuracy
3. **Audit Trail**: All tables have created_at, updated_at, created_by tracking
4. **Soft Deletes**: Most deletes are CASCADE or SET NULL to maintain referential integrity
5. **Default View Constraint**: Only one default budget view per project
6. **RLS Security**: All budget data restricted to authorized project users
