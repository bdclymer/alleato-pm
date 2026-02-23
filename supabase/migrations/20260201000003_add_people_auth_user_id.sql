-- Migration: Add auth_user_id to people table and link test user
--
-- CRITICAL: This column is REQUIRED by ALL RLS policies in the application.
-- Without it, ALL permission checks fail because they assume this relationship exists.
--
-- This migration:
-- 1. Adds auth_user_id column to people table
-- 2. Creates unique index to prevent duplicate auth accounts
-- 3. Links the test user (test1@mail.com) to their person record
-- 4. Adds foreign key constraint to auth.users

-- Step 1: Add auth_user_id column to people table
ALTER TABLE people
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Step 2: Create unique index to ensure one person per auth user
CREATE UNIQUE INDEX IF NOT EXISTS people_auth_user_id_unique
ON people(auth_user_id)
WHERE auth_user_id IS NOT NULL;

-- Step 3: Link test user to their person record (if exists)
-- Find person with email test1@mail.com and link to auth user with same email
UPDATE people
SET auth_user_id = (
    SELECT id FROM auth.users WHERE email = people.email
)
WHERE email IS NOT NULL
AND auth_user_id IS NULL
AND EXISTS (
    SELECT 1 FROM auth.users WHERE email = people.email
);

-- Step 4: Verify the test user linkage
DO $$
DECLARE
    test_user_id UUID;
    test_person_id UUID;
    person_count INT;
BEGIN
    -- Get test user auth ID
    SELECT id INTO test_user_id FROM auth.users WHERE email = 'test1@mail.com';

    -- Check if test user has person record
    SELECT id INTO test_person_id FROM people WHERE auth_user_id = test_user_id;

    IF test_person_id IS NULL THEN
        RAISE NOTICE 'WARNING: Test user test1@mail.com does not have a person record linked!';
        RAISE NOTICE 'You may need to create a person record for this user.';
    ELSE
        RAISE NOTICE 'SUCCESS: Test user test1@mail.com linked to person ID %', test_person_id;

        -- Check project memberships
        SELECT COUNT(*) INTO person_count
        FROM project_directory_memberships
        WHERE person_id = test_person_id;

        RAISE NOTICE 'Test user has % project memberships', person_count;
    END IF;
END $$;

-- Add comment explaining the column
COMMENT ON COLUMN people.auth_user_id IS 'Links person record to Supabase auth.users table. Required for all RLS policy checks.';
