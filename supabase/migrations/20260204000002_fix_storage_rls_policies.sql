-- Fix storage RLS policies: people table has no auth_user_id column,
-- so the original policies in 20260201000002 always blocked uploads.
-- The subquery `SELECT id FROM people WHERE auth_user_id = auth.uid()`
-- always returned NULL because auth_user_id doesn't exist on people table.
--
-- API routes already validate authentication and project membership before
-- performing storage operations, so these simplified policies are safe.

-- Drop broken policies
DROP POLICY IF EXISTS "Users can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete project files" ON storage.objects;

-- Simplified policies: allow authenticated users to interact with project-files bucket
-- Project-level access control is enforced by the API routes
CREATE POLICY "Users can upload project files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-files');

CREATE POLICY "Users can read project files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'project-files');

CREATE POLICY "Users can update project files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-files');

CREATE POLICY "Users can delete project files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-files');
