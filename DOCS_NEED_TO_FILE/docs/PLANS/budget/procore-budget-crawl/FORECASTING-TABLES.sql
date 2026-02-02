-- ============================================================================
-- FORECASTING INFRASTRUCTURE - PRODUCTION SQL
-- Execute this in Supabase SQL Editor
-- ============================================================================
-- Date: 2025-12-29
-- Purpose: Add Forecast to Complete and Forecasting Tab functionality
-- Based on: Procore forecasting system documentation
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE ENUMS
-- ============================================================================

-- Forecasting calculation methods
CREATE TYPE forecast_calculation_method AS ENUM (
  'automatic',           -- Auto: Projected Budget - Projected Costs
  'manual',              -- User-entered single value
  'lump_sum',            -- Single value entered in Forecasting tab
  'monitored_resources'  -- Time-based linear drawdown
);

-- Forecasting curve types for spreading costs across time periods
CREATE TYPE forecasting_curve_type AS ENUM (
  'linear',        -- Equal distribution
  's_curve',       -- 15% start, 70% middle, 15% end
  'bell',          -- Normal distribution (peaks in middle)
  'front_loaded',  -- 80% early, 20% late
  'back_loaded',   -- 20% early, 80% late
  'custom'         -- User-defined curve
);

-- Time period types for forecasting views
CREATE TYPE time_period_type AS ENUM (
  'monthly',    -- Monthly periods
  'quarterly',  -- Quarterly periods
  'custom'      -- Custom period definitions
);

-- ============================================================================
-- STEP 2: ALTER BUDGET_LINES TABLE
-- ============================================================================

-- Add forecasting columns to existing budget_lines table
ALTER TABLE budget_lines
ADD COLUMN IF NOT EXISTS forecast_to_complete DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS forecast_calculation_method forecast_calculation_method DEFAULT 'automatic',
ADD COLUMN IF NOT EXISTS forecast_curve_type forecasting_curve_type,
ADD COLUMN IF NOT EXISTS monitored_resource_config JSONB;

-- Add calculated columns (PostgreSQL computed columns)
-- Note: These are GENERATED ALWAYS columns - they update automatically
ALTER TABLE budget_lines
ADD COLUMN IF NOT EXISTS projected_costs DECIMAL(15,2) GENERATED ALWAYS AS (
  COALESCE(committed_costs, 0) + COALESCE(actual_costs, 0)
) STORED;

ALTER TABLE budget_lines
ADD COLUMN IF NOT EXISTS projected_budget DECIMAL(15,2) GENERATED ALWAYS AS (
  COALESCE(original_budget, 0) + COALESCE(approved_budget_changes, 0)
) STORED;

ALTER TABLE budget_lines
ADD COLUMN IF NOT EXISTS estimated_cost_at_completion DECIMAL(15,2) GENERATED ALWAYS AS (
  COALESCE(committed_costs, 0) + COALESCE(actual_costs, 0) + COALESCE(forecast_to_complete, 0)
) STORED;

ALTER TABLE budget_lines
ADD COLUMN IF NOT EXISTS projected_over_under DECIMAL(15,2) GENERATED ALWAYS AS (
  (COALESCE(original_budget, 0) + COALESCE(approved_budget_changes, 0)) -
  (COALESCE(committed_costs, 0) + COALESCE(actual_costs, 0) + COALESCE(forecast_to_complete, 0))
) STORED;

-- Add column comments for documentation
COMMENT ON COLUMN budget_lines.forecast_to_complete IS 'Forecasted remaining cost - can be automatic, manual, lump sum, or monitored resource based';
COMMENT ON COLUMN budget_lines.forecast_calculation_method IS 'Method: automatic (default), manual, lump_sum, or monitored_resources';
COMMENT ON COLUMN budget_lines.forecast_curve_type IS 'Curve type for spreading forecast across time periods';
COMMENT ON COLUMN budget_lines.projected_costs IS 'Auto-calculated: committed_costs + actual_costs';
COMMENT ON COLUMN budget_lines.projected_budget IS 'Auto-calculated: original_budget + approved_budget_changes';
COMMENT ON COLUMN budget_lines.estimated_cost_at_completion IS 'Auto-calculated: projected_costs + forecast_to_complete';
COMMENT ON COLUMN budget_lines.projected_over_under IS 'Auto-calculated: projected_budget - estimated_cost_at_completion';

-- ============================================================================
-- STEP 3: CREATE FORECASTING_VIEWS TABLE (Company-level configuration)
-- ============================================================================

CREATE TABLE forecasting_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  columns_config JSONB NOT NULL DEFAULT '[]',
  spread_column TEXT DEFAULT 'forecast_to_complete',
  time_period_type time_period_type DEFAULT 'monthly',
  is_default BOOLEAN DEFAULT false,
  is_standard_view BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_company_view_name UNIQUE(company_id, name)
);

CREATE INDEX idx_forecasting_views_company ON forecasting_views(company_id);
CREATE INDEX idx_forecasting_views_default ON forecasting_views(company_id, is_default) WHERE is_default = true;

COMMENT ON TABLE forecasting_views IS 'Company-level forecasting view configurations';
COMMENT ON COLUMN forecasting_views.spread_column IS 'Which column value to spread across time periods';

-- ============================================================================
-- STEP 4: CREATE PROJECT_FORECASTING_VIEWS TABLE (Assignments)
-- ============================================================================

CREATE TABLE project_forecasting_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  forecasting_view_id UUID NOT NULL REFERENCES forecasting_views(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_project_view UNIQUE(project_id, forecasting_view_id)
);

CREATE INDEX idx_project_forecasting_views_project ON project_forecasting_views(project_id);
CREATE INDEX idx_project_forecasting_views_view ON project_forecasting_views(forecasting_view_id);
CREATE INDEX idx_project_forecasting_views_active ON project_forecasting_views(project_id, is_active) WHERE is_active = true;

COMMENT ON TABLE project_forecasting_views IS 'Assigns forecasting views to projects';

-- ============================================================================
-- STEP 5: CREATE FORECASTING_DATA TABLE (Time-phased forecast amounts)
-- ============================================================================

CREATE TABLE forecasting_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_line_id UUID NOT NULL REFERENCES budget_lines(id) ON DELETE CASCADE,
  forecasting_view_id UUID NOT NULL REFERENCES forecasting_views(id) ON DELETE CASCADE,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  forecasted_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  curve_type forecasting_curve_type,
  lump_sum_override DECIMAL(15,2),
  is_manually_adjusted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_budget_line_period UNIQUE(budget_line_id, forecasting_view_id, period_start_date),
  CONSTRAINT valid_period CHECK (period_end_date > period_start_date),
  CONSTRAINT non_negative_forecast CHECK (forecasted_amount >= 0)
);

CREATE INDEX idx_forecasting_data_budget_line ON forecasting_data(budget_line_id);
CREATE INDEX idx_forecasting_data_view ON forecasting_data(forecasting_view_id);
CREATE INDEX idx_forecasting_data_period ON forecasting_data(period_start_date, period_end_date);
CREATE INDEX idx_forecasting_data_lump_sum ON forecasting_data(budget_line_id, lump_sum_override) WHERE lump_sum_override IS NOT NULL;

COMMENT ON TABLE forecasting_data IS 'Time-phased forecast amounts for each budget line and period';
COMMENT ON COLUMN forecasting_data.lump_sum_override IS 'When set, this value overrides Budget tab forecast_to_complete';

-- ============================================================================
-- STEP 6: CREATE MONITORED_RESOURCES TABLE
-- ============================================================================

CREATE TABLE monitored_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_line_id UUID NOT NULL REFERENCES budget_lines(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  description TEXT,
  rate_per_period DECIMAL(15,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  drawdown_method TEXT DEFAULT 'linear',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_budget_line_resource UNIQUE(budget_line_id),
  CONSTRAINT valid_date_range CHECK (end_date > start_date),
  CONSTRAINT positive_rate CHECK (rate_per_period > 0)
);

CREATE INDEX idx_monitored_resources_budget_line ON monitored_resources(budget_line_id);
CREATE INDEX idx_monitored_resources_dates ON monitored_resources(start_date, end_date);
CREATE INDEX idx_monitored_resources_type ON monitored_resources(resource_type);

COMMENT ON TABLE monitored_resources IS 'Time-based monitored resources (recurring costs like payroll, rentals)';
COMMENT ON COLUMN monitored_resources.resource_type IS 'Type: payroll, equipment_rental, trailer_rental, etc.';

-- ============================================================================
-- STEP 7: CREATE FORECAST_SNAPSHOTS TABLE
-- ============================================================================

CREATE TABLE forecast_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  snapshot_date DATE NOT NULL,
  forecast_data JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_project_snapshot_name UNIQUE(project_id, name)
);

CREATE INDEX idx_forecast_snapshots_project ON forecast_snapshots(project_id);
CREATE INDEX idx_forecast_snapshots_date ON forecast_snapshots(snapshot_date);

COMMENT ON TABLE forecast_snapshots IS 'Point-in-time snapshots of forecast data';

-- ============================================================================
-- STEP 8: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE forecasting_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_forecasting_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecasting_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitored_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 9: CREATE RLS POLICIES - FORECASTING_VIEWS
-- ============================================================================

-- Users can view forecasting views for their company
CREATE POLICY "Users can view company forecasting views"
  ON forecasting_views FOR SELECT
  USING (
    company_id IN (
      SELECT p.company_id
      FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE pu.user_id = auth.uid()
    )
  );

-- Company admins can create views (simplified - enhance based on your admin logic)
CREATE POLICY "Admins can create forecasting views"
  ON forecasting_views FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE p.company_id = forecasting_views.company_id
      AND pu.user_id = auth.uid()
      AND pu.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins can update forecasting views"
  ON forecasting_views FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE p.company_id = forecasting_views.company_id
      AND pu.user_id = auth.uid()
      AND pu.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins can delete forecasting views"
  ON forecasting_views FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN project_users pu ON p.id = pu.project_id
      WHERE p.company_id = forecasting_views.company_id
      AND pu.user_id = auth.uid()
      AND pu.role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- STEP 10: CREATE RLS POLICIES - PROJECT_FORECASTING_VIEWS
-- ============================================================================

CREATE POLICY "Project users can view forecasting view assignments"
  ON project_forecasting_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_id = project_forecasting_views.project_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Project admins can assign views"
  ON project_forecasting_views FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_id = project_forecasting_views.project_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Project admins can update view assignments"
  ON project_forecasting_views FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_id = project_forecasting_views.project_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Project admins can delete view assignments"
  ON project_forecasting_views FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_id = project_forecasting_views.project_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- STEP 11: CREATE RLS POLICIES - FORECASTING_DATA
-- ============================================================================

CREATE POLICY "Users can view forecasting data for their projects"
  ON forecasting_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM budget_lines bl
      JOIN project_users pu ON bl.project_id = pu.project_id
      WHERE bl.id = forecasting_data.budget_line_id
      AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create forecasting data"
  ON forecasting_data FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budget_lines bl
      JOIN project_users pu ON bl.project_id = pu.project_id
      WHERE bl.id = forecasting_data.budget_line_id
      AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update forecasting data"
  ON forecasting_data FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM budget_lines bl
      JOIN project_users pu ON bl.project_id = pu.project_id
      WHERE bl.id = forecasting_data.budget_line_id
      AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete forecasting data"
  ON forecasting_data FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM budget_lines bl
      JOIN project_users pu ON bl.project_id = pu.project_id
      WHERE bl.id = forecasting_data.budget_line_id
      AND pu.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 12: CREATE RLS POLICIES - MONITORED_RESOURCES
-- ============================================================================

CREATE POLICY "Users can view monitored resources for their projects"
  ON monitored_resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM budget_lines bl
      JOIN project_users pu ON bl.project_id = pu.project_id
      WHERE bl.id = monitored_resources.budget_line_id
      AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create monitored resources"
  ON monitored_resources FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budget_lines bl
      JOIN project_users pu ON bl.project_id = pu.project_id
      WHERE bl.id = monitored_resources.budget_line_id
      AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update monitored resources"
  ON monitored_resources FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM budget_lines bl
      JOIN project_users pu ON bl.project_id = pu.project_id
      WHERE bl.id = monitored_resources.budget_line_id
      AND pu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete monitored resources"
  ON monitored_resources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM budget_lines bl
      JOIN project_users pu ON bl.project_id = pu.project_id
      WHERE bl.id = monitored_resources.budget_line_id
      AND pu.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 13: CREATE RLS POLICIES - FORECAST_SNAPSHOTS
-- ============================================================================

CREATE POLICY "Users can view forecast snapshots for their projects"
  ON forecast_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_id = forecast_snapshots.project_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create forecast snapshots"
  ON forecast_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_id = forecast_snapshots.project_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 14: CREATE TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Reusable function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_forecasting_views_updated_at
  BEFORE UPDATE ON forecasting_views
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_forecasting_views_updated_at
  BEFORE UPDATE ON project_forecasting_views
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forecasting_data_updated_at
  BEFORE UPDATE ON forecasting_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitored_resources_updated_at
  BEFORE UPDATE ON monitored_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 15: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Calculate automatic forecast for a budget line
CREATE OR REPLACE FUNCTION calculate_automatic_forecast(p_budget_line_id UUID)
RETURNS DECIMAL(15,2) AS $$
DECLARE
  v_forecast DECIMAL(15,2);
BEGIN
  SELECT
    GREATEST(
      0,
      (COALESCE(original_budget, 0) + COALESCE(approved_budget_changes, 0)) -
      (COALESCE(committed_costs, 0) + COALESCE(actual_costs, 0))
    )
  INTO v_forecast
  FROM budget_lines
  WHERE id = p_budget_line_id;

  RETURN COALESCE(v_forecast, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_automatic_forecast IS 'Calculates automatic forecast: MAX(0, projected_budget - projected_costs)';

-- Recalculate forecast for a budget line based on its method
CREATE OR REPLACE FUNCTION recalculate_budget_line_forecast(p_budget_line_id UUID)
RETURNS VOID AS $$
DECLARE
  v_method forecast_calculation_method;
  v_new_forecast DECIMAL(15,2);
BEGIN
  SELECT forecast_calculation_method INTO v_method
  FROM budget_lines
  WHERE id = p_budget_line_id;

  -- Only recalculate if method is 'automatic'
  IF v_method = 'automatic' THEN
    v_new_forecast := calculate_automatic_forecast(p_budget_line_id);

    UPDATE budget_lines
    SET forecast_to_complete = v_new_forecast
    WHERE id = p_budget_line_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION recalculate_budget_line_forecast IS 'Recalculates forecast if method is automatic';

-- Function to create the Procore Standard Forecast View for a company
CREATE OR REPLACE FUNCTION create_standard_forecast_view(p_company_id UUID)
RETURNS UUID AS $$
DECLARE
  v_view_id UUID;
BEGIN
  INSERT INTO forecasting_views (
    company_id,
    name,
    description,
    is_standard_view,
    is_default,
    spread_column,
    time_period_type,
    columns_config
  ) VALUES (
    p_company_id,
    'Procore Standard Forecast View',
    'Default forecasting view with 14 standard columns',
    true,
    true,
    'forecast_to_complete',
    'monthly',
    '[
      {"name": "cost_code", "display_name": "Cost Code", "type": "dimension", "visible": true, "order": 1},
      {"name": "description", "display_name": "Description", "type": "dimension", "visible": true, "order": 2},
      {"name": "original_budget", "display_name": "Original Budget", "type": "source", "visible": true, "order": 3},
      {"name": "approved_changes", "display_name": "Approved Changes", "type": "source", "visible": true, "order": 4},
      {"name": "projected_budget", "display_name": "Projected Budget", "type": "calculated", "visible": true, "order": 5},
      {"name": "committed_costs", "display_name": "Committed Costs", "type": "source", "visible": true, "order": 6},
      {"name": "actual_costs", "display_name": "Actual Costs", "type": "source", "visible": true, "order": 7},
      {"name": "projected_costs", "display_name": "Projected Costs", "type": "calculated", "visible": true, "order": 8},
      {"name": "forecast_to_complete", "display_name": "Forecast to Complete", "type": "editable", "visible": true, "order": 9},
      {"name": "estimated_cost_at_completion", "display_name": "Estimated Cost at Completion", "type": "calculated", "visible": true, "order": 10},
      {"name": "projected_over_under", "display_name": "Projected Over/Under", "type": "calculated", "visible": true, "order": 11},
      {"name": "percent_complete", "display_name": "% Complete", "type": "calculated", "visible": true, "order": 12},
      {"name": "variance", "display_name": "Variance", "type": "calculated", "visible": true, "order": 13},
      {"name": "status", "display_name": "Status", "type": "indicator", "visible": true, "order": 14}
    ]'::jsonb
  )
  RETURNING id INTO v_view_id;

  RETURN v_view_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_standard_forecast_view IS 'Creates the Procore Standard Forecast View for a company';

-- ============================================================================
-- STEP 16: BACKFILL EXISTING DATA
-- ============================================================================

-- Set default forecast calculation method and calculate initial forecast for existing budget lines
UPDATE budget_lines
SET
  forecast_calculation_method = 'automatic',
  forecast_to_complete = GREATEST(
    0,
    (COALESCE(original_budget, 0) + COALESCE(approved_budget_changes, 0)) -
    (COALESCE(committed_costs, 0) + COALESCE(actual_costs, 0))
  )
WHERE forecast_calculation_method IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify installation)
-- ============================================================================

-- Check enums were created
-- SELECT * FROM pg_type WHERE typname LIKE '%forecast%';

-- Check new columns on budget_lines
-- SELECT column_name, data_type, is_generated
-- FROM information_schema.columns
-- WHERE table_name = 'budget_lines'
-- AND column_name LIKE '%forecast%' OR column_name LIKE '%projected%';

-- Check new tables were created
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename LIKE '%forecast%';

-- Count RLS policies
-- SELECT tablename, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE tablename IN ('forecasting_views', 'project_forecasting_views', 'forecasting_data', 'monitored_resources', 'forecast_snapshots')
-- GROUP BY tablename;

-- ============================================================================
-- DONE!
-- ============================================================================
-- You can now use these functions:
-- - calculate_automatic_forecast(budget_line_id) - Returns forecast amount
-- - recalculate_budget_line_forecast(budget_line_id) - Updates forecast if automatic
-- - create_standard_forecast_view(company_id) - Creates default view for company
-- ============================================================================
