-- =============================================================================
-- Add Missing Budget Components: Snapshots and Forecasts
-- =============================================================================
-- This migration adds the critical missing budget infrastructure based on
-- actual database schema verification.
-- =============================================================================

-- =============================================================================
-- 1. CREATE BUDGET_SNAPSHOTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS budget_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    snapshot_type TEXT DEFAULT 'manual' CHECK (snapshot_type IN ('manual', 'baseline', 'automatic', 'milestone')),
    description TEXT,
    is_baseline BOOLEAN DEFAULT false,
    line_items JSONB NOT NULL,
    grand_totals JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_budget_snapshots_project ON budget_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_snapshots_type ON budget_snapshots(snapshot_type);
CREATE INDEX IF NOT EXISTS idx_budget_snapshots_baseline ON budget_snapshots(is_baseline) WHERE is_baseline = true;

-- RLS Security
ALTER TABLE budget_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_snapshots_select_policy" ON budget_snapshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN people p ON p.id = pdm.person_id
            JOIN users_auth ua ON ua.person_id = p.id
            WHERE pdm.project_id = budget_snapshots.project_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "budget_snapshots_insert_policy" ON budget_snapshots
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN people p ON p.id = pdm.person_id
            JOIN users_auth ua ON ua.person_id = p.id
            WHERE pdm.project_id = budget_snapshots.project_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
            AND pdm.role IN ('admin', 'owner', 'manager')
        )
    );

CREATE POLICY "budget_snapshots_update_policy" ON budget_snapshots
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN people p ON p.id = pdm.person_id
            JOIN users_auth ua ON ua.person_id = p.id
            WHERE pdm.project_id = budget_snapshots.project_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
            AND pdm.role IN ('admin', 'owner', 'manager')
        )
    );

CREATE POLICY "budget_snapshots_delete_policy" ON budget_snapshots
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM project_directory_memberships pdm
            JOIN people p ON p.id = pdm.person_id
            JOIN users_auth ua ON ua.person_id = p.id
            WHERE pdm.project_id = budget_snapshots.project_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
            AND pdm.role IN ('admin', 'owner')
        )
    );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_budget_snapshots_updated_at ON budget_snapshots;
CREATE TRIGGER update_budget_snapshots_updated_at
    BEFORE UPDATE ON budget_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 2. CREATE BUDGET_LINE_FORECASTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS budget_line_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_line_id UUID NOT NULL REFERENCES budget_lines(id) ON DELETE CASCADE,
    forecast_date DATE NOT NULL,
    forecasted_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    forecast_to_complete DECIMAL(15,2) NOT NULL DEFAULT 0,
    projected_final_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    variance_at_completion DECIMAL(15,2) NOT NULL DEFAULT 0,
    burn_rate DECIMAL(15,4),
    percent_complete DECIMAL(5,2) CHECK (percent_complete >= 0 AND percent_complete <= 100),
    ftc_method TEXT NOT NULL DEFAULT 'manual' CHECK (ftc_method IN ('manual', 'automatic', 'lump_sum', 'monitored_resources')),
    curve_id UUID REFERENCES forecasting_curves(id),
    manual_override BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Unique constraint for one forecast per line per date
ALTER TABLE budget_line_forecasts
DROP CONSTRAINT IF EXISTS uq_budget_line_forecast_date;

ALTER TABLE budget_line_forecasts
ADD CONSTRAINT uq_budget_line_forecast_date
UNIQUE (budget_line_id, forecast_date);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_budget_line_forecasts_line ON budget_line_forecasts(budget_line_id);
CREATE INDEX IF NOT EXISTS idx_budget_line_forecasts_date ON budget_line_forecasts(forecast_date);

-- RLS Security
ALTER TABLE budget_line_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_line_forecasts_select_policy" ON budget_line_forecasts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM budget_lines bl
            JOIN project_directory_memberships pdm ON pdm.project_id = bl.project_id
            JOIN people p ON p.id = pdm.person_id
            JOIN users_auth ua ON ua.person_id = p.id
            WHERE bl.id = budget_line_forecasts.budget_line_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
        )
    );

CREATE POLICY "budget_line_forecasts_insert_policy" ON budget_line_forecasts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM budget_lines bl
            JOIN project_directory_memberships pdm ON pdm.project_id = bl.project_id
            JOIN people p ON p.id = pdm.person_id
            JOIN users_auth ua ON ua.person_id = p.id
            WHERE bl.id = budget_line_forecasts.budget_line_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
            AND pdm.role IN ('admin', 'owner', 'manager', 'member')
        )
    );

CREATE POLICY "budget_line_forecasts_update_policy" ON budget_line_forecasts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM budget_lines bl
            JOIN project_directory_memberships pdm ON pdm.project_id = bl.project_id
            JOIN people p ON p.id = pdm.person_id
            JOIN users_auth ua ON ua.person_id = p.id
            WHERE bl.id = budget_line_forecasts.budget_line_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
            AND pdm.role IN ('admin', 'owner', 'manager', 'member')
        )
    );

CREATE POLICY "budget_line_forecasts_delete_policy" ON budget_line_forecasts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM budget_lines bl
            JOIN project_directory_memberships pdm ON pdm.project_id = bl.project_id
            JOIN people p ON p.id = pdm.person_id
            JOIN users_auth ua ON ua.person_id = p.id
            WHERE bl.id = budget_line_forecasts.budget_line_id
            AND ua.auth_user_id = auth.uid()
            AND pdm.status = 'active'
            AND pdm.role IN ('admin', 'owner', 'manager')
        )
    );

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_budget_line_forecasts_updated_at ON budget_line_forecasts;
CREATE TRIGGER update_budget_line_forecasts_updated_at
    BEFORE UPDATE ON budget_line_forecasts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 3. CREATE BUDGET ROLLUP CALCULATION VIEW
-- =============================================================================

CREATE OR REPLACE VIEW v_budget_rollup AS
SELECT
    bl.id as budget_line_id,
    bl.project_id,
    bl.cost_code_id,
    bl.cost_type_id,
    bl.sub_job_id,
    bl.description,
    bl.original_amount as original_budget_amount,

    -- Budget Modifications (from existing budget_mod_lines)
    COALESCE(budget_mods.total_modifications, 0) as budget_modifications,

    -- Approved Change Orders (from existing change_event_line_items)
    COALESCE(approved_cos.total_approved_cos, 0) as approved_cos,

    -- Revised Budget = Original + Modifications + Approved COs
    bl.original_amount +
    COALESCE(budget_mods.total_modifications, 0) +
    COALESCE(approved_cos.total_approved_cos, 0) as revised_budget,

    -- Committed Costs (from existing commitment_change_order_lines)
    COALESCE(committed.total_committed, 0) as committed_costs,

    -- Direct Costs (from existing direct_costs table)
    COALESCE(direct_costs.total_direct_costs, 0) as direct_costs,

    -- Job to Date Cost = Direct Costs
    COALESCE(direct_costs.total_direct_costs, 0) as job_to_date_cost,

    -- Forecast to Complete (from new budget_line_forecasts or calculated)
    COALESCE(forecasts.forecast_to_complete,
        GREATEST(0, bl.original_amount - COALESCE(direct_costs.total_direct_costs, 0))
    ) as forecast_to_complete,

    -- Projected Costs = Job to Date + Forecast to Complete
    COALESCE(direct_costs.total_direct_costs, 0) +
    COALESCE(forecasts.forecast_to_complete,
        GREATEST(0, bl.original_amount - COALESCE(direct_costs.total_direct_costs, 0))
    ) as projected_costs,

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
        bml.sub_job_id,
        bml.cost_type_id,
        SUM(bml.amount) as total_modifications
    FROM budget_mod_lines bml
    INNER JOIN budget_modifications bm ON bml.budget_modification_id = bm.id
    WHERE bm.status = 'approved'
    GROUP BY bml.cost_code_id, bml.project_id, bml.sub_job_id, bml.cost_type_id
) budget_mods ON budget_mods.cost_code_id = bl.cost_code_id
    AND budget_mods.project_id = bl.project_id
    AND (budget_mods.sub_job_id IS NULL AND bl.sub_job_id IS NULL OR budget_mods.sub_job_id = bl.sub_job_id)
    AND (budget_mods.cost_type_id IS NULL AND bl.cost_type_id IS NULL OR budget_mods.cost_type_id = bl.cost_type_id)

-- Approved Change Orders aggregation
LEFT JOIN (
    SELECT
        cel.cost_code_id,
        ce.project_id,
        SUM(COALESCE(cel.amount, 0)) as total_approved_cos
    FROM change_event_line_items cel
    INNER JOIN change_events ce ON cel.change_event_id = ce.id
    WHERE ce.status = 'closed'
    GROUP BY cel.cost_code_id, ce.project_id
) approved_cos ON approved_cos.cost_code_id = bl.cost_code_id
    AND approved_cos.project_id = bl.project_id

-- Committed Costs aggregation
LEFT JOIN (
    SELECT
        ccol.cost_code_id,
        bl_inner.project_id,
        SUM(ccol.amount) as total_committed
    FROM commitment_change_order_lines ccol
    INNER JOIN budget_lines bl_inner ON ccol.budget_line_id = bl_inner.id
    GROUP BY ccol.cost_code_id, bl_inner.project_id
) committed ON committed.cost_code_id = bl.cost_code_id
    AND committed.project_id = bl.project_id

-- Direct Costs aggregation
LEFT JOIN (
    SELECT
        dc.project_id,
        dc.cost_type as cost_code_id,
        SUM(dc.total_amount) as total_direct_costs
    FROM direct_costs dc
    WHERE dc.status = 'approved'
    GROUP BY dc.project_id, dc.cost_type
) direct_costs ON direct_costs.cost_code_id = bl.cost_code_id
    AND direct_costs.project_id = bl.project_id

-- Latest Forecasts
LEFT JOIN (
    SELECT
        blf.budget_line_id,
        blf.forecast_to_complete,
        ROW_NUMBER() OVER (PARTITION BY blf.budget_line_id ORDER BY blf.forecast_date DESC) as rn
    FROM budget_line_forecasts blf
) forecasts ON forecasts.budget_line_id = bl.id AND forecasts.rn = 1;

-- =============================================================================
-- 4. CREATE MATERIALIZED VIEW FOR PERFORMANCE
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_budget_rollup AS
SELECT * FROM v_budget_rollup;

-- Unique index for CONCURRENTLY refresh
DROP INDEX IF EXISTS idx_mv_budget_rollup_unique;
CREATE UNIQUE INDEX idx_mv_budget_rollup_unique ON mv_budget_rollup(budget_line_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_mv_budget_rollup_project ON mv_budget_rollup(project_id);
CREATE INDEX IF NOT EXISTS idx_mv_budget_rollup_cost_code ON mv_budget_rollup(cost_code_id);

-- =============================================================================
-- 5. CREATE PROJECT-LEVEL AGGREGATION VIEW
-- =============================================================================

CREATE OR REPLACE VIEW v_budget_grand_totals AS
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
    SUM(forecast_to_complete) as total_forecast_to_complete,
    SUM(projected_costs) as total_projected_costs,
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

-- =============================================================================
-- 6. CREATE HELPER FUNCTIONS
-- =============================================================================

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_budget_rollup(p_project_id INTEGER DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    -- Refresh materialized view concurrently to avoid locking
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_budget_rollup;

EXCEPTION
    WHEN OTHERS THEN
        -- If concurrent refresh fails, try regular refresh
        REFRESH MATERIALIZED VIEW mv_budget_rollup;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create budget snapshot
CREATE OR REPLACE FUNCTION create_budget_snapshot(
    p_project_id INTEGER,
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
        COALESCE(jsonb_agg(jsonb_build_object(
            'budget_line_id', budget_line_id,
            'cost_code_id', cost_code_id,
            'description', description,
            'original_budget', original_budget_amount,
            'revised_budget', revised_budget,
            'projected_costs', projected_costs,
            'over_under', projected_over_under,
            'forecast_to_complete', forecast_to_complete
        )), '[]'::jsonb) as line_items,
        (SELECT COALESCE(jsonb_build_object(
            'total_original_budget', total_original_budget,
            'total_revised_budget', total_revised_budget,
            'total_projected_costs', total_projected_costs,
            'total_over_under', total_projected_over_under,
            'budget_utilization_percent', budget_utilization_percent,
            'budget_status', budget_status
        ), '{}'::jsonb) FROM v_budget_grand_totals WHERE project_id = p_project_id) as grand_totals,
        auth.uid()
    FROM mv_budget_rollup
    WHERE project_id = p_project_id
    RETURNING id INTO snapshot_id;

    RETURN snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. POPULATE INITIAL DATA
-- =============================================================================

-- Populate the materialized view with current data
REFRESH MATERIALIZED VIEW mv_budget_rollup;

-- Grant permissions
GRANT SELECT, INSERT ON budget_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE ON budget_line_forecasts TO authenticated;
GRANT SELECT ON v_budget_rollup TO authenticated;
GRANT SELECT ON mv_budget_rollup TO authenticated;
GRANT SELECT ON v_budget_grand_totals TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_budget_rollup TO authenticated;
GRANT EXECUTE ON FUNCTION create_budget_snapshot TO authenticated;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================