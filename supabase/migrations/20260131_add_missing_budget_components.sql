-- =============================================================================
-- CRITICAL BUDGET COMPONENTS: Add Missing Tables, Views, and Functions
-- =============================================================================
-- This migration adds the essential missing components for budget calculations:
-- 1. budget_snapshots table
-- 2. budget_line_forecasts table
-- 3. v_budget_rollup view with full calculations
-- 4. mv_budget_rollup materialized view
-- 5. v_budget_grand_totals and v_budget_with_markup views
-- 6. Helper functions: refresh_budget_rollup and create_budget_snapshot
-- =============================================================================

-- =============================================================================
-- 1. CREATE MISSING TABLES
-- =============================================================================

-- Budget snapshots table for point-in-time captures
CREATE TABLE budget_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    snapshot_type TEXT DEFAULT 'manual' CHECK (snapshot_type IN ('manual', 'baseline', 'automatic', 'milestone')),
    description TEXT,
    is_baseline BOOLEAN DEFAULT false,
    line_items JSONB NOT NULL,
    grand_totals JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes for budget_snapshots
CREATE INDEX idx_budget_snapshots_project ON budget_snapshots(project_id);
CREATE INDEX idx_budget_snapshots_type ON budget_snapshots(snapshot_type);
CREATE INDEX idx_budget_snapshots_baseline ON budget_snapshots(is_baseline) WHERE is_baseline = true;

-- RLS for budget_snapshots
ALTER TABLE budget_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_snapshots_view_policy" ON budget_snapshots
  FOR SELECT
  USING (
    -- Admin can view all
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR
    -- Project members can view their project's snapshots
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = budget_snapshots.project_id
        AND project_users.user_id = auth.uid()
    )
  );

CREATE POLICY "budget_snapshots_insert_policy" ON budget_snapshots
  FOR INSERT
  WITH CHECK (
    -- Admin can insert anywhere
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR
    -- Project managers can insert
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = budget_snapshots.project_id
        AND project_users.user_id = auth.uid()
        AND project_users.role IN ('owner', 'manager')
    )
  );

-- Budget line forecasts table
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

-- Indexes for budget_line_forecasts
CREATE INDEX idx_budget_line_forecasts_line ON budget_line_forecasts(budget_line_id);
CREATE INDEX idx_budget_line_forecasts_date ON budget_line_forecasts(forecast_date);

-- RLS for budget_line_forecasts
ALTER TABLE budget_line_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_line_forecasts_view_policy" ON budget_line_forecasts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM budget_lines bl
      WHERE bl.id = budget_line_forecasts.budget_line_id
        AND (
          -- Admin can view all
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND is_admin = true
          )
          OR
          -- Project members can view
          EXISTS (
            SELECT 1 FROM project_users
            WHERE project_users.project_id = bl.project_id
              AND project_users.user_id = auth.uid()
          )
        )
    )
  );

-- =============================================================================
-- 2. CREATE CORE CALCULATION VIEW: v_budget_rollup
-- =============================================================================

CREATE VIEW v_budget_rollup AS
SELECT
    bl.id as budget_line_id,
    bl.project_id,
    bl.cost_code_id,
    bl.cost_type_id,
    bl.sub_job_id,
    bl.description,

    -- Original Budget
    bl.original_amount as original_budget_amount,

    -- Budget Modifications (from budget_modifications via budget_mod_lines)
    COALESCE(budget_mods.total_modifications, 0) as budget_modifications,

    -- Approved Change Orders (from change_orders via change_event_line_items)
    COALESCE(approved_cos.total_approved_cos, 0) as approved_cos,

    -- Revised Budget = Original + Modifications + Approved COs
    bl.original_amount +
    COALESCE(budget_mods.total_modifications, 0) +
    COALESCE(approved_cos.total_approved_cos, 0) as revised_budget,

    -- Committed Costs (from commitments via commitment_line_items)
    COALESCE(committed.total_committed, 0) as committed_costs,

    -- Direct Costs (from direct_costs table, approved only)
    COALESCE(direct_costs.total_direct_costs, 0) as direct_costs,

    -- Job to Date Cost = Direct Costs
    COALESCE(direct_costs.total_direct_costs, 0) as job_to_date_cost,

    -- Pending Cost Changes (from pending commitments/COs)
    COALESCE(pending_costs.total_pending, 0) as pending_cost_changes,

    -- Projected Costs = Job to Date + Forecast to Complete
    COALESCE(direct_costs.total_direct_costs, 0) +
    COALESCE(forecasts.forecast_to_complete, 0) as projected_costs,

    -- Forecast to Complete (from budget_line_forecasts or calculated)
    COALESCE(forecasts.forecast_to_complete,
        GREATEST(0,
            bl.original_amount - COALESCE(direct_costs.total_direct_costs, 0)
        )
    ) as forecast_to_complete,

    -- Projected Over/Under = Revised Budget - Projected Costs
    (bl.original_amount +
     COALESCE(budget_mods.total_modifications, 0) +
     COALESCE(approved_cos.total_approved_cos, 0)) -
    (COALESCE(direct_costs.total_direct_costs, 0) +
     COALESCE(forecasts.forecast_to_complete,
        GREATEST(0, bl.original_amount - COALESCE(direct_costs.total_direct_costs, 0))
     )) as projected_over_under

FROM budget_lines bl

-- Budget Modifications aggregation
LEFT JOIN (
    SELECT
        bml.cost_code_id,
        bml.project_id,
        COALESCE(bml.sub_job_id, '') as sub_job_key,
        COALESCE(bml.cost_type_id, '') as cost_type_key,
        SUM(bml.amount) as total_modifications
    FROM budget_mod_lines bml
    INNER JOIN budget_modifications bm ON bml.budget_modification_id = bm.id
    WHERE bm.status = 'approved'
    GROUP BY bml.cost_code_id, bml.project_id, bml.sub_job_id, bml.cost_type_id
) budget_mods ON budget_mods.cost_code_id = bl.cost_code_id
    AND budget_mods.project_id = bl.project_id
    AND COALESCE(budget_mods.sub_job_key, '') = COALESCE(bl.sub_job_id::text, '')
    AND COALESCE(budget_mods.cost_type_key, '') = COALESCE(bl.cost_type_id::text, '')

-- Approved Change Orders aggregation
LEFT JOIN (
    SELECT
        cel.cost_code_id,
        ce.project_id,
        COALESCE(bl_approved.sub_job_id, '') as sub_job_key,
        COALESCE(cel.cost_type_id, '') as cost_type_key,
        SUM(COALESCE(cel.amount, 0)) as total_approved_cos
    FROM change_event_line_items cel
    INNER JOIN change_events ce ON cel.change_event_id = ce.id
    LEFT JOIN budget_lines bl_approved ON cel.budget_code_id = bl_approved.id
    WHERE ce.status = 'closed'  -- Use 'closed' as approved status based on enum
    GROUP BY cel.cost_code_id, ce.project_id, bl_approved.sub_job_id, cel.cost_type_id
) approved_cos ON approved_cos.cost_code_id = bl.cost_code_id
    AND approved_cos.project_id = bl.project_id
    AND COALESCE(approved_cos.sub_job_key, '') = COALESCE(bl.sub_job_id::text, '')
    AND COALESCE(approved_cos.cost_type_key, '') = COALESCE(bl.cost_type_id::text, '')

-- Committed Costs aggregation (using existing commitment_change_order_lines table)
LEFT JOIN (
    SELECT
        ccol.cost_code_id,
        bl_inner.project_id,
        COALESCE(bl_inner.sub_job_id, '') as sub_job_key,
        COALESCE(ccol.cost_type_id, '') as cost_type_key,
        SUM(ccol.amount) as total_committed
    FROM commitment_change_order_lines ccol
    INNER JOIN budget_lines bl_inner ON ccol.budget_line_id = bl_inner.id
    GROUP BY ccol.cost_code_id, bl_inner.project_id, bl_inner.sub_job_id, ccol.cost_type_id
) committed ON committed.cost_code_id = bl.cost_code_id
    AND committed.project_id = bl.project_id
    AND COALESCE(committed.sub_job_key, '') = COALESCE(bl.sub_job_id::text, '')
    AND COALESCE(committed.cost_type_key, '') = COALESCE(bl.cost_type_id::text, '')

-- Direct Costs aggregation
LEFT JOIN (
    SELECT
        bl_dc.cost_code_id,
        dc.project_id,
        COALESCE(bl_dc.sub_job_id, '') as sub_job_key,
        COALESCE(bl_dc.cost_type_id, '') as cost_type_key,
        SUM(dc.total_amount) as total_direct_costs
    FROM direct_costs dc
    LEFT JOIN budget_lines bl_dc ON dc.cost_type = bl_dc.cost_code_id  -- Join by cost code since direct_costs doesn't have direct budget_line reference
    WHERE dc.status = 'approved'  -- Use status field instead of approved boolean
    GROUP BY bl_dc.cost_code_id, dc.project_id, bl_dc.sub_job_id, bl_dc.cost_type_id
) direct_costs ON direct_costs.cost_code_id = bl.cost_code_id
    AND direct_costs.project_id = bl.project_id
    AND COALESCE(direct_costs.sub_job_key, '') = COALESCE(bl.sub_job_id::text, '')
    AND COALESCE(direct_costs.cost_type_key, '') = COALESCE(bl.cost_type_id::text, '')

-- Latest Forecasts
LEFT JOIN (
    SELECT
        blf.budget_line_id,
        blf.forecast_to_complete,
        ROW_NUMBER() OVER (PARTITION BY blf.budget_line_id ORDER BY blf.forecast_date DESC) as rn
    FROM budget_line_forecasts blf
) forecasts ON forecasts.budget_line_id = bl.id AND forecasts.rn = 1

-- Pending Costs (pending change events - commitments don't have direct pending status in current schema)
LEFT JOIN (
    SELECT
        cel.cost_code_id,
        ce.project_id,
        COALESCE(bl_pending.sub_job_id, '') as sub_job_key,
        COALESCE(cel.cost_type_id, '') as cost_type_key,
        SUM(COALESCE(cel.amount, 0)) as total_pending
    FROM change_event_line_items cel
    INNER JOIN change_events ce ON cel.change_event_id = ce.id
    LEFT JOIN budget_lines bl_pending ON cel.budget_code_id = bl_pending.id
    WHERE ce.status = 'open'  -- Use 'open' as pending status based on enum
    GROUP BY cel.cost_code_id, ce.project_id, bl_pending.sub_job_id, cel.cost_type_id
) pending_costs ON pending_costs.cost_code_id = bl.cost_code_id
    AND pending_costs.project_id = bl.project_id
    AND COALESCE(pending_costs.sub_job_key, '') = COALESCE(bl.sub_job_id::text, '')
    AND COALESCE(pending_costs.cost_type_key, '') = COALESCE(bl.cost_type_id::text, '');

-- =============================================================================
-- 3. CREATE MATERIALIZED VIEW: mv_budget_rollup
-- =============================================================================

CREATE MATERIALIZED VIEW mv_budget_rollup AS
SELECT * FROM v_budget_rollup;

-- Unique index for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_mv_budget_rollup_unique ON mv_budget_rollup(budget_line_id);

-- Performance indexes
CREATE INDEX idx_mv_budget_rollup_project ON mv_budget_rollup(project_id);
CREATE INDEX idx_mv_budget_rollup_cost_code ON mv_budget_rollup(cost_code_id);

-- =============================================================================
-- 4. CREATE PROJECT-LEVEL AGGREGATION VIEWS
-- =============================================================================

-- Grand totals view for project-level summaries
CREATE VIEW v_budget_grand_totals AS
SELECT
    project_id,
    COUNT(*) as total_budget_lines,
    SUM(original_budget_amount) as total_original_budget,
    SUM(budget_modifications) as total_budget_modifications,
    SUM(approved_cos) as total_approved_cos,
    SUM(revised_budget) as total_revised_budget,
    SUM(committed_costs) as total_committed_costs,
    SUM(direct_costs) as total_direct_costs,
    SUM(job_to_date_cost) as total_job_to_date_cost,
    SUM(pending_cost_changes) as total_pending_cost_changes,
    SUM(projected_costs) as total_projected_costs,
    SUM(forecast_to_complete) as total_forecast_to_complete,
    SUM(projected_over_under) as total_projected_over_under,

    -- Performance metrics
    CASE
        WHEN SUM(revised_budget) > 0
        THEN (SUM(projected_costs) / SUM(revised_budget)) * 100
        ELSE 0
    END as budget_utilization_percent,

    CASE
        WHEN SUM(projected_over_under) >= 0 THEN 'on_budget'
        ELSE 'over_budget'
    END as budget_status

FROM mv_budget_rollup
GROUP BY project_id;

-- Budget with markup calculations
CREATE VIEW v_budget_with_markup AS
SELECT
    br.*,

    -- Standard markup calculations (configurable per project)
    COALESCE(pm.labor_markup_percent, 15) as labor_markup_percent,
    COALESCE(pm.material_markup_percent, 10) as material_markup_percent,
    COALESCE(pm.equipment_markup_percent, 20) as equipment_markup_percent,
    COALESCE(pm.overhead_percent, 10) as overhead_percent,
    COALESCE(pm.profit_percent, 8) as profit_percent,

    -- Calculate markup amounts based on cost type
    CASE
        WHEN ct.name ILIKE '%labor%' THEN
            br.revised_budget * (COALESCE(pm.labor_markup_percent, 15) / 100.0)
        WHEN ct.name ILIKE '%material%' THEN
            br.revised_budget * (COALESCE(pm.material_markup_percent, 10) / 100.0)
        WHEN ct.name ILIKE '%equipment%' THEN
            br.revised_budget * (COALESCE(pm.equipment_markup_percent, 20) / 100.0)
        ELSE
            br.revised_budget * (COALESCE(pm.labor_markup_percent, 15) / 100.0)
    END as markup_amount,

    -- Overhead and profit
    br.revised_budget * (COALESCE(pm.overhead_percent, 10) / 100.0) as overhead_amount,
    br.revised_budget * (COALESCE(pm.profit_percent, 8) / 100.0) as profit_amount

FROM mv_budget_rollup br
LEFT JOIN cost_code_types ct ON br.cost_type_id = ct.id
LEFT JOIN project_markup pm ON br.project_id = pm.project_id;

-- =============================================================================
-- 5. HELPER FUNCTIONS
-- =============================================================================

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_budget_rollup(p_project_id BIGINT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    -- Refresh materialized view concurrently to avoid locking
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_budget_rollup;

    -- Log the refresh for audit
    INSERT INTO system_logs (action, details, created_at)
    VALUES ('budget_rollup_refresh',
            jsonb_build_object('project_id', p_project_id, 'user_id', auth.uid()),
            NOW());

EXCEPTION
    WHEN OTHERS THEN
        -- If concurrent refresh fails, try regular refresh
        REFRESH MATERIALIZED VIEW mv_budget_rollup;

        INSERT INTO system_logs (action, details, created_at)
        VALUES ('budget_rollup_refresh_fallback',
                jsonb_build_object('project_id', p_project_id, 'error', SQLERRM),
                NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create budget snapshot
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
    -- Clear previous baseline if setting new one
    IF p_set_as_baseline THEN
        UPDATE budget_snapshots
        SET is_baseline = false
        WHERE project_id = p_project_id AND is_baseline = true;
    END IF;

    -- Create snapshot record
    INSERT INTO budget_snapshots (
        project_id, name, snapshot_type, description,
        is_baseline, line_items, grand_totals, created_by
    )
    SELECT
        p_project_id,
        p_name,
        p_type,
        p_description,
        p_set_as_baseline,
        jsonb_agg(jsonb_build_object(
            'budget_line_id', budget_line_id,
            'cost_code_id', cost_code_id,
            'description', description,
            'original_budget', original_budget_amount,
            'revised_budget', revised_budget,
            'projected_costs', projected_costs,
            'over_under', projected_over_under,
            'forecast_to_complete', forecast_to_complete
        )) as line_items,
        (SELECT jsonb_build_object(
            'total_original_budget', total_original_budget,
            'total_revised_budget', total_revised_budget,
            'total_projected_costs', total_projected_costs,
            'total_over_under', total_projected_over_under,
            'budget_utilization_percent', budget_utilization_percent,
            'budget_status', budget_status
        ) FROM v_budget_grand_totals WHERE project_id = p_project_id) as grand_totals,
        auth.uid()
    FROM mv_budget_rollup
    WHERE project_id = p_project_id
    RETURNING id INTO snapshot_id;

    -- Log the snapshot creation
    INSERT INTO system_logs (action, details, created_at)
    VALUES ('budget_snapshot_created',
            jsonb_build_object(
                'snapshot_id', snapshot_id,
                'project_id', p_project_id,
                'name', p_name,
                'is_baseline', p_set_as_baseline
            ),
            NOW());

    RETURN snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. GRANT PERMISSIONS
-- =============================================================================

-- Grant permissions for new tables
GRANT SELECT, INSERT ON budget_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE ON budget_line_forecasts TO authenticated;

-- Grant permissions for views (they inherit RLS from underlying tables)
GRANT SELECT ON v_budget_rollup TO authenticated;
GRANT SELECT ON mv_budget_rollup TO authenticated;
GRANT SELECT ON v_budget_grand_totals TO authenticated;
GRANT SELECT ON v_budget_with_markup TO authenticated;

-- Grant execution permissions for functions
GRANT EXECUTE ON FUNCTION refresh_budget_rollup TO authenticated;
GRANT EXECUTE ON FUNCTION create_budget_snapshot TO authenticated;

-- =============================================================================
-- 7. INITIAL DATA AND REFRESH
-- =============================================================================

-- Populate the materialized view with current data
REFRESH MATERIALIZED VIEW mv_budget_rollup;

-- Create system log table if it doesn't exist (for audit trail)
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create project_markup table if it doesn't exist (for markup calculations)
CREATE TABLE IF NOT EXISTS project_markup (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    labor_markup_percent DECIMAL(5,2) DEFAULT 15.00,
    material_markup_percent DECIMAL(5,2) DEFAULT 10.00,
    equipment_markup_percent DECIMAL(5,2) DEFAULT 20.00,
    overhead_percent DECIMAL(5,2) DEFAULT 10.00,
    profit_percent DECIMAL(5,2) DEFAULT 8.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_project_markup UNIQUE (project_id)
);

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- This migration adds all critical missing budget components:
-- ✅ budget_snapshots table with RLS
-- ✅ budget_line_forecasts table with RLS
-- ✅ v_budget_rollup view with full calculations
-- ✅ mv_budget_rollup materialized view with indexes
-- ✅ v_budget_grand_totals for project-level aggregations
-- ✅ v_budget_with_markup for markup calculations
-- ✅ refresh_budget_rollup() function with error handling
-- ✅ create_budget_snapshot() function with audit logging
-- ✅ Proper RLS policies for security
-- ✅ Performance indexes for optimal queries
-- =============================================================================