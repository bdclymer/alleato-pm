-- =============================================================================
-- CRITICAL SECURITY FIX: Budget Views RLS Policies
-- =============================================================================
-- This migration fixes the Row Level Security (RLS) policies for budget_views
-- and budget_view_columns tables to enforce proper project-based access control.
-- =============================================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS budget_views_select ON budget_views;
DROP POLICY IF EXISTS budget_views_insert ON budget_views;
DROP POLICY IF EXISTS budget_views_update ON budget_views;
DROP POLICY IF EXISTS budget_views_delete ON budget_views;

DROP POLICY IF EXISTS budget_view_columns_select ON budget_view_columns;
DROP POLICY IF EXISTS budget_view_columns_insert ON budget_view_columns;
DROP POLICY IF EXISTS budget_view_columns_update ON budget_view_columns;
DROP POLICY IF EXISTS budget_view_columns_delete ON budget_view_columns;

-- =============================================================================
-- BUDGET_VIEWS POLICIES
-- =============================================================================

-- View policy: Can view budget views for projects they're members of or if admin
CREATE POLICY "budget_views_view_policy" ON budget_views
  FOR SELECT
  USING (
    -- Admin can view all
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR
    -- Project members can view their project's budget views
    EXISTS (
      SELECT 1 FROM project_users
      WHERE project_users.project_id = budget_views.project_id
        AND project_users.user_id = auth.uid()
    )
  );

-- Insert policy: Can create budget views for projects they manage or if admin
CREATE POLICY "budget_views_insert_policy" ON budget_views
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
      WHERE project_users.project_id = budget_views.project_id
        AND project_users.user_id = auth.uid()
        AND project_users.role IN ('owner', 'manager')
    )
  );

-- Update policy: Can update budget views for projects they manage or if admin
CREATE POLICY "budget_views_update_policy" ON budget_views
  FOR UPDATE
  USING (
    -- Admin can update all
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR
    -- Project managers can update (except system views)
    (
      NOT is_system
      AND EXISTS (
        SELECT 1 FROM project_users
        WHERE project_users.project_id = budget_views.project_id
          AND project_users.user_id = auth.uid()
          AND project_users.role IN ('owner', 'manager')
      )
    )
  )
  WITH CHECK (
    -- Can't change project_id
    project_id = OLD.project_id
    -- Can't modify system views unless admin
    AND (
      NOT is_system
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND is_admin = true
      )
    )
  );

-- Delete policy: Can delete budget views for projects they manage or if admin
CREATE POLICY "budget_views_delete_policy" ON budget_views
  FOR DELETE
  USING (
    -- Admin can delete all
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR
    -- Project managers can delete non-system views
    (
      NOT is_system
      AND EXISTS (
        SELECT 1 FROM project_users
        WHERE project_users.project_id = budget_views.project_id
          AND project_users.user_id = auth.uid()
          AND project_users.role IN ('owner', 'manager')
      )
    )
  );

-- =============================================================================
-- BUDGET_VIEW_COLUMNS POLICIES
-- =============================================================================

-- View policy: Inherit from parent budget view
CREATE POLICY "budget_view_columns_view_policy" ON budget_view_columns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM budget_views bv
      WHERE bv.id = budget_view_columns.view_id
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
            WHERE project_users.project_id = bv.project_id
              AND project_users.user_id = auth.uid()
          )
        )
    )
  );

-- Insert policy: Inherit from parent budget view
CREATE POLICY "budget_view_columns_insert_policy" ON budget_view_columns
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budget_views bv
      WHERE bv.id = budget_view_columns.view_id
        AND (
          -- Admin can insert
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND is_admin = true
          )
          OR
          -- Project managers can insert to non-system views
          (
            NOT bv.is_system
            AND EXISTS (
              SELECT 1 FROM project_users
              WHERE project_users.project_id = bv.project_id
                AND project_users.user_id = auth.uid()
                AND project_users.role IN ('owner', 'manager')
            )
          )
        )
    )
  );

-- Update policy: Inherit from parent budget view
CREATE POLICY "budget_view_columns_update_policy" ON budget_view_columns
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM budget_views bv
      WHERE bv.id = budget_view_columns.view_id
        AND (
          -- Admin can update all
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND is_admin = true
          )
          OR
          -- Project managers can update non-system view columns
          (
            NOT bv.is_system
            AND EXISTS (
              SELECT 1 FROM project_users
              WHERE project_users.project_id = bv.project_id
                AND project_users.user_id = auth.uid()
                AND project_users.role IN ('owner', 'manager')
            )
          )
        )
    )
  )
  WITH CHECK (
    -- Can't change view_id
    view_id = OLD.view_id
  );

-- Delete policy: Inherit from parent budget view
CREATE POLICY "budget_view_columns_delete_policy" ON budget_view_columns
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM budget_views bv
      WHERE bv.id = budget_view_columns.view_id
        AND (
          -- Admin can delete all
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND is_admin = true
          )
          OR
          -- Project managers can delete non-system view columns
          (
            NOT bv.is_system
            AND EXISTS (
              SELECT 1 FROM project_users
              WHERE project_users.project_id = bv.project_id
                AND project_users.user_id = auth.uid()
                AND project_users.role IN ('owner', 'manager')
            )
          )
        )
    )
  );

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON budget_views TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON budget_view_columns TO authenticated;

-- =============================================================================
-- VERIFICATION COMMENTS
-- =============================================================================
-- After applying this migration, the budget views will enforce proper security:
-- 1. Users can only see budget views for projects they belong to
-- 2. Only project managers/owners can modify budget views (except system views)
-- 3. System views can only be modified by admins
-- 4. All operations require proper project membership
--
-- Test this by:
-- 1. Creating a budget view as a project member
-- 2. Trying to access budget views from a project you don't belong to
-- 3. Verifying system views are protected