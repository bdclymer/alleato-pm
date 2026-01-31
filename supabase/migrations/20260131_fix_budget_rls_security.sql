-- =============================================================================
-- CRITICAL SECURITY FIX: Enable RLS on Budget Tables
-- =============================================================================
-- This migration enables Row Level Security (RLS) on all budget-related tables
-- to prevent unauthorized access to project budget data.
-- =============================================================================

-- Enable RLS on core budget tables
ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_mod_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_line_history ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- BUDGET_LINES POLICIES
-- =============================================================================

-- View policy: Can view budget lines for projects they're members of or if admin
CREATE POLICY "budget_lines_view_policy" ON budget_lines
  FOR SELECT
  USING (
    -- Admin can view all
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR
    -- Project members can view their project's budget
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = budget_lines.project_id
        AND project_users.user_id = auth.uid()
    )
  );

-- Insert policy: Can create budget lines for projects they manage or if admin
CREATE POLICY "budget_lines_insert_policy" ON budget_lines
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
      WHERE project_users.project_id = budget_lines.project_id
        AND project_users.user_id = auth.uid()
        AND project_users.role IN ('owner', 'manager')
    )
  );

-- Update policy: Can update budget lines for projects they manage or if admin
CREATE POLICY "budget_lines_update_policy" ON budget_lines
  FOR UPDATE
  USING (
    -- Admin can update all
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR
    -- Project managers can update
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = budget_lines.project_id
        AND project_users.user_id = auth.uid()
        AND project_users.role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    -- Can't change project_id
    project_id = OLD.project_id
  );

-- Delete policy: Can delete budget lines for projects they own or if admin
CREATE POLICY "budget_lines_delete_policy" ON budget_lines
  FOR DELETE
  USING (
    -- Admin can delete all
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR
    -- Project owners can delete
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = budget_lines.project_id
        AND project_users.user_id = auth.uid()
        AND project_users.role = 'owner'
    )
  );

-- =============================================================================
-- BUDGET_MODIFICATIONS POLICIES
-- =============================================================================

-- View policy: Can view modifications for projects they're members of or if admin
CREATE POLICY "budget_modifications_view_policy" ON budget_modifications
  FOR SELECT
  USING (
    -- Admin can view all
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR
    -- Project members can view
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = budget_modifications.project_id
        AND project_users.user_id = auth.uid()
    )
  );

-- Insert policy: Can create modifications for projects they manage or if admin
CREATE POLICY "budget_modifications_insert_policy" ON budget_modifications
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
      WHERE project_users.project_id = budget_modifications.project_id
        AND project_users.user_id = auth.uid()
        AND project_users.role IN ('owner', 'manager')
    )
  );

-- Update policy: Can update modifications for projects they manage or if admin
CREATE POLICY "budget_modifications_update_policy" ON budget_modifications
  FOR UPDATE
  USING (
    -- Admin can update all
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR
    -- Project managers can update their own modifications
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = budget_modifications.project_id
        AND project_users.user_id = auth.uid()
        AND project_users.role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    -- Can't change project_id
    project_id = OLD.project_id
  );

-- =============================================================================
-- BUDGET_MOD_LINES POLICIES
-- =============================================================================

-- View policy: Inherit from parent modification
CREATE POLICY "budget_mod_lines_view_policy" ON budget_mod_lines
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM budget_modifications bm
      WHERE bm.id = budget_mod_lines.budget_modification_id
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
            WHERE project_users.project_id = bm.project_id
              AND project_users.user_id = auth.uid()
          )
        )
    )
  );

-- Insert policy: Inherit from parent modification
CREATE POLICY "budget_mod_lines_insert_policy" ON budget_mod_lines
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budget_modifications bm
      WHERE bm.id = budget_mod_lines.budget_modification_id
        AND (
          -- Admin can insert
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND is_admin = true
          )
          OR
          -- Project managers can insert
          EXISTS (
            SELECT 1 FROM project_users
            WHERE project_users.project_id = bm.project_id
              AND project_users.user_id = auth.uid()
              AND project_users.role IN ('owner', 'manager')
          )
        )
    )
  );

-- =============================================================================
-- BUDGET_LINE_HISTORY POLICIES (Audit Trail - Read Only)
-- =============================================================================

-- View policy: Can view history for projects they're members of or if admin
CREATE POLICY "budget_line_history_view_policy" ON budget_line_history
  FOR SELECT
  USING (
    -- Admin can view all
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR
    -- Project members can view their project's history
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = budget_line_history.project_id
        AND project_users.user_id = auth.uid()
    )
  );

-- Note: No insert/update/delete policies for history table as it should be
-- managed by triggers only

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON budget_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE ON budget_modifications TO authenticated;
GRANT SELECT, INSERT ON budget_mod_lines TO authenticated;
GRANT SELECT ON budget_line_history TO authenticated;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- After applying this migration, verify RLS is enabled:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('budget_lines', 'budget_modifications', 'budget_mod_lines', 'budget_line_history');