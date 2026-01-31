-- =============================================================================
-- Phase 1: Permission System Data Foundation
-- 1A: Add user_type to project_directory_memberships
-- 1B: Seed default permission templates
-- 1C: Backfill existing memberships
-- =============================================================================

-- 1A: Add user_type column
ALTER TABLE project_directory_memberships
ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT 'employee'
CHECK (user_type IN ('employee', 'client', 'subcontractor', 'developer'));

CREATE INDEX IF NOT EXISTS idx_pdm_user_type
ON project_directory_memberships(user_type);

-- 1B: Seed default permission templates (idempotent using ON CONFLICT)
INSERT INTO permission_templates (name, description, scope, is_system, rules_json)
VALUES
  (
    'Project Admin',
    'Full admin access to all project modules',
    'project',
    true,
    '{
      "directory": ["read", "write", "admin"],
      "budget": ["read", "write", "admin"],
      "contracts": ["read", "write", "admin"],
      "documents": ["read", "write", "admin"],
      "schedule": ["read", "write", "admin"],
      "submittals": ["read", "write", "admin"],
      "rfis": ["read", "write", "admin"],
      "change_orders": ["read", "write", "admin"]
    }'::jsonb
  ),
  (
    'Project Manager',
    'Write access to most modules, read-only for budget',
    'project',
    true,
    '{
      "directory": ["read", "write"],
      "budget": ["read"],
      "contracts": ["read", "write"],
      "documents": ["read", "write"],
      "schedule": ["read", "write"],
      "submittals": ["read", "write"],
      "rfis": ["read", "write"],
      "change_orders": ["read", "write"]
    }'::jsonb
  ),
  (
    'Subcontractor',
    'Limited access focused on commitments, submittals, and RFIs',
    'project',
    true,
    '{
      "directory": ["read"],
      "contracts": ["read"],
      "documents": ["read"],
      "submittals": ["read", "write"],
      "rfis": ["read", "write"]
    }'::jsonb
  ),
  (
    'Client (View Only)',
    'Read-only access to non-financial project information',
    'project',
    true,
    '{
      "directory": ["read"],
      "documents": ["read"],
      "schedule": ["read"]
    }'::jsonb
  )
ON CONFLICT (name) WHERE is_system = true DO UPDATE SET
  description = EXCLUDED.description,
  rules_json = EXCLUDED.rules_json,
  updated_at = NOW();

-- 1C: Backfill existing memberships that have no template assigned
UPDATE project_directory_memberships
SET permission_template_id = (
  SELECT id FROM permission_templates
  WHERE name = 'Project Admin' AND is_system = true
  LIMIT 1
)
WHERE permission_template_id IS NULL;
