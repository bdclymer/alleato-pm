-- Script to set admin access for megan@megankharrison.com
-- =============================================================================
-- This script ensures the user has admin privileges to access all features
-- Run this script in Supabase SQL Editor to grant admin access
-- =============================================================================

-- First, check if the user exists and their current admin status
SELECT
    id,
    email,
    is_admin,
    created_at,
    updated_at
FROM users
WHERE email = 'megan@megankharrison.com';

-- Set the user as admin if not already
UPDATE users
SET
    is_admin = true,
    updated_at = NOW()
WHERE email = 'megan@megankharrison.com'
AND (is_admin IS NULL OR is_admin = false);

-- Verify the update
SELECT
    id,
    email,
    is_admin,
    'Admin access granted' as status
FROM users
WHERE email = 'megan@megankharrison.com';

-- Optional: Add user to project_users for project 67 if not already added
-- This ensures both admin access AND direct project membership
-- Note: This assumes project ID 67 exists. Adjust the project ID as needed.
DO $$
DECLARE
    user_id_var UUID;
    project_id_var TEXT := '67'; -- Change this to your actual project ID
BEGIN
    -- Get the user ID
    SELECT id INTO user_id_var FROM users WHERE email = 'megan@megankharrison.com';

    IF user_id_var IS NOT NULL THEN
        -- Check if project_users table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_users') THEN
            -- Try to add user to project (will do nothing if already exists)
            INSERT INTO project_users (project_id, user_id, created_at)
            VALUES (project_id_var, user_id_var, NOW())
            ON CONFLICT (project_id, user_id) DO NOTHING;

            RAISE NOTICE 'User added to project % (or already exists)', project_id_var;
        END IF;
    ELSE
        RAISE NOTICE 'User not found: megan@megankharrison.com';
    END IF;
END $$;

-- Verify admin access and project membership
SELECT
    u.email,
    u.is_admin,
    CASE
        WHEN u.is_admin = true THEN 'Has admin access to all projects'
        WHEN pu.user_id IS NOT NULL THEN 'Has access to project 67 only'
        ELSE 'No project access'
    END as access_status
FROM users u
LEFT JOIN project_users pu ON pu.user_id = u.id AND pu.project_id = '67'
WHERE u.email = 'megan@megankharrison.com';