-- Storage RLS Policies for project-files bucket

-- Enable RLS on storage.objects when permitted.
-- Some hosted roles cannot ALTER this table even though policies can still be managed.
DO $$
BEGIN
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping ENABLE ROW LEVEL SECURITY on storage.objects (insufficient privilege for current role).';
END
$$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete project files" ON storage.objects;

-- Policy: Users can upload files to their project directories
CREATE POLICY "Users can upload project files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[1] IN (
    SELECT project_id::text
    FROM project_directory_memberships pdm
    WHERE pdm.person_id = (
      SELECT id FROM people WHERE auth_user_id = auth.uid()
    )
  )
);

-- Policy: Users can read files from their projects
CREATE POLICY "Users can read project files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[1] IN (
    SELECT project_id::text
    FROM project_directory_memberships pdm
    WHERE pdm.person_id = (
      SELECT id FROM people WHERE auth_user_id = auth.uid()
    )
  )
);

-- Policy: Users can update files in their projects
CREATE POLICY "Users can update project files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[1] IN (
    SELECT project_id::text
    FROM project_directory_memberships pdm
    WHERE pdm.person_id = (
      SELECT id FROM people WHERE auth_user_id = auth.uid()
    )
  )
);

-- Policy: Users can delete files from their projects
CREATE POLICY "Users can delete project files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[1] IN (
    SELECT project_id::text
    FROM project_directory_memberships pdm
    WHERE pdm.person_id = (
      SELECT id FROM people WHERE auth_user_id = auth.uid()
    )
  )
);
