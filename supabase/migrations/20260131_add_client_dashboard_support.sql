-- Add support for client users and client dashboard

-- Add is_client flag to project_users if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'project_users'
    AND column_name = 'is_client'
  ) THEN
    ALTER TABLE project_users
    ADD COLUMN is_client BOOLEAN DEFAULT FALSE;

    COMMENT ON COLUMN project_users.is_client IS 'Indicates if this user is an external client for the project';
  END IF;
END $$;

-- Add client_company field to link to the client's company
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'project_users'
    AND column_name = 'client_company_id'
  ) THEN
    ALTER TABLE project_users
    ADD COLUMN client_company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;

    COMMENT ON COLUMN project_users.client_company_id IS 'The company this client user represents';
  END IF;
END $$;

-- Create index for faster client lookups
CREATE INDEX IF NOT EXISTS idx_project_users_is_client
ON project_users(project_id, is_client)
WHERE is_client = TRUE;

-- Add is_private flag to documents table for client visibility control
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'documents'
    AND column_name = 'is_private'
  ) THEN
    ALTER TABLE documents
    ADD COLUMN is_private BOOLEAN DEFAULT FALSE;

    COMMENT ON COLUMN documents.is_private IS 'If true, document is not visible to client users';
  END IF;
END $$;

-- Add is_private flag to photos table for client visibility control
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'photos'
    AND column_name = 'is_private'
  ) THEN
    ALTER TABLE photos
    ADD COLUMN is_private BOOLEAN DEFAULT FALSE;

    COMMENT ON COLUMN photos.is_private IS 'If true, photo is not visible to client users';
  END IF;
END $$;

-- Add status field to RFIs if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'rfis'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE rfis
    ADD COLUMN status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'pending_client_response', 'answered', 'closed'));

    COMMENT ON COLUMN rfis.status IS 'Current status of the RFI';
  END IF;
END $$;

-- Create a view for client-accessible project information
CREATE OR REPLACE VIEW client_project_overview AS
SELECT
  p.id as project_id,
  p.name as project_name,
  p."job number" as job_number,
  p.address,
  p.city,
  p.state,
  p.zip,
  p.status as project_status,
  p.project_type,
  p.total_value,
  p.start_date,
  p.end_date,
  c.name as company_name,
  c.id as company_id,
  pc.contract_number,
  pc.title as contract_title,
  pc.contract_amount,
  pc.revised_contract_amount,
  pc.percent_complete,
  pc.substantial_completion_date,
  pc.final_completion_date
FROM projects p
LEFT JOIN companies c ON p.company = c.id
LEFT JOIN prime_contracts pc ON p.id = pc.project_id AND pc.is_active = TRUE;

-- Grant select on the view to authenticated users
GRANT SELECT ON client_project_overview TO authenticated;

-- Create RLS policy for client dashboard access
CREATE POLICY "Clients can view their project overview"
  ON client_project_overview
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.project_id = client_project_overview.project_id
      AND pu.user_id = auth.uid()
      AND pu.is_client = TRUE
      AND pu.is_active = TRUE
    )
  );

-- Update RLS policies for documents to respect is_private flag for clients
CREATE POLICY "Clients can only view non-private documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    (is_private = FALSE OR is_private IS NULL)
    AND EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.project_id = documents.project_id
      AND pu.user_id = auth.uid()
      AND pu.is_client = TRUE
      AND pu.is_active = TRUE
    )
  );

-- Update RLS policies for photos to respect is_private flag for clients
CREATE POLICY "Clients can only view non-private photos"
  ON photos
  FOR SELECT
  TO authenticated
  USING (
    (is_private = FALSE OR is_private IS NULL)
    AND EXISTS (
      SELECT 1 FROM project_users pu
      WHERE pu.project_id = photos.project_id
      AND pu.user_id = auth.uid()
      AND pu.is_client = TRUE
      AND pu.is_active = TRUE
    )
  );

-- Add sample client user (commented out - uncomment and modify as needed)
/*
-- Example: Mark a user as a client for a specific project
UPDATE project_users
SET
  is_client = TRUE,
  client_company_id = (SELECT id FROM companies WHERE name = 'Client Company Name' LIMIT 1),
  role = 'client'
WHERE
  user_id = (SELECT id FROM auth.users WHERE email = 'client@example.com' LIMIT 1)
  AND project_id = YOUR_PROJECT_ID;
*/

COMMENT ON TABLE project_users IS 'Manages user access to projects, including internal team members and external clients';