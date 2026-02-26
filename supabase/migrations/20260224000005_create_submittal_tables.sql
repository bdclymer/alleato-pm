-- =============================================================================
-- SUBMITTALS DOMAIN SCHEMA - Extended tables + alter existing
-- Migration: 20260224000005_create_submittal_tables
-- =============================================================================

-- =============================================================================
-- 1. SUBMITTAL PACKAGES (must be created first — submittals references it)
-- =============================================================================

CREATE TABLE IF NOT EXISTS submittal_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id integer NOT NULL REFERENCES projects(id),
  name text NOT NULL,
  description text,

  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submittal_packages_project ON submittal_packages(project_id);

ALTER TABLE submittal_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submittal_packages_project_access" ON submittal_packages
  FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_directory_memberships pdm
        JOIN people p ON p.id = pdm.person_id
        WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE TRIGGER set_submittal_packages_updated_at
  BEFORE UPDATE ON submittal_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- 2. ALTER EXISTING SUBMITTALS TABLE — add missing columns
-- =============================================================================

-- Status alignment: Procore uses Draft, Open, Distributed, Closed
-- (existing table has free-form status, we just add columns, no data change)

ALTER TABLE submittals
  ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS specification_section text,
  ADD COLUMN IF NOT EXISTS submittal_type text,
  ADD COLUMN IF NOT EXISTS division text,
  ADD COLUMN IF NOT EXISTS submittal_package_id uuid REFERENCES submittal_packages(id),
  ADD COLUMN IF NOT EXISTS responsible_contractor_id integer,
  ADD COLUMN IF NOT EXISTS received_from_id uuid,
  ADD COLUMN IF NOT EXISTS submittal_manager_id uuid,
  ADD COLUMN IF NOT EXISTS final_due_date date,
  ADD COLUMN IF NOT EXISTS lead_time integer,
  ADD COLUMN IF NOT EXISTS required_on_site_date date,
  ADD COLUMN IF NOT EXISTS sent_date date,
  ADD COLUMN IF NOT EXISTS cost_code_id integer,
  ADD COLUMN IF NOT EXISTS location_id integer,
  ADD COLUMN IF NOT EXISTS ball_in_court text,
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- Indexes on new columns
CREATE INDEX IF NOT EXISTS idx_submittals_package ON submittals(submittal_package_id);
CREATE INDEX IF NOT EXISTS idx_submittals_spec_section ON submittals(specification_section);
CREATE INDEX IF NOT EXISTS idx_submittals_deleted ON submittals(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_submittals_status ON submittals(status);


-- =============================================================================
-- 3. SUBMITTAL WORKFLOW STEPS (approval chain)
-- =============================================================================

CREATE TABLE IF NOT EXISTS submittal_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id uuid NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  step_type text NOT NULL DEFAULT 'approval',

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submittal_workflow_steps_submittal ON submittal_workflow_steps(submittal_id);

ALTER TABLE submittal_workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submittal_workflow_steps_access" ON submittal_workflow_steps
  FOR ALL
  USING (
    submittal_id IN (
      SELECT id FROM submittals WHERE project_id IN (
        SELECT project_id FROM project_directory_memberships pdm
        JOIN people p ON p.id = pdm.person_id
        WHERE p.auth_user_id = auth.uid()
      )
    )
  );


-- =============================================================================
-- 4. SUBMITTAL RESPONSES (per-approver responses)
-- =============================================================================

CREATE TABLE IF NOT EXISTS submittal_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id uuid NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,
  workflow_step_id uuid REFERENCES submittal_workflow_steps(id),
  responder_id uuid NOT NULL,

  response_status text NOT NULL DEFAULT 'Pending',
  comments text,
  responded_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submittal_responses_submittal ON submittal_responses(submittal_id);
CREATE INDEX IF NOT EXISTS idx_submittal_responses_responder ON submittal_responses(responder_id);

ALTER TABLE submittal_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submittal_responses_access" ON submittal_responses
  FOR ALL
  USING (
    submittal_id IN (
      SELECT id FROM submittals WHERE project_id IN (
        SELECT project_id FROM project_directory_memberships pdm
        JOIN people p ON p.id = pdm.person_id
        WHERE p.auth_user_id = auth.uid()
      )
    )
  );

CREATE TRIGGER set_submittal_responses_updated_at
  BEFORE UPDATE ON submittal_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- 5. SUBMITTAL DISTRIBUTIONS (distribution events)
-- =============================================================================

CREATE TABLE IF NOT EXISTS submittal_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id uuid NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,
  from_id uuid NOT NULL,
  message text,

  distributed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submittal_distributions_submittal ON submittal_distributions(submittal_id);

ALTER TABLE submittal_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submittal_distributions_access" ON submittal_distributions
  FOR ALL
  USING (
    submittal_id IN (
      SELECT id FROM submittals WHERE project_id IN (
        SELECT project_id FROM project_directory_memberships pdm
        JOIN people p ON p.id = pdm.person_id
        WHERE p.auth_user_id = auth.uid()
      )
    )
  );


-- =============================================================================
-- 6. SUBMITTAL DISTRIBUTION RECIPIENTS (M2M)
-- =============================================================================

CREATE TABLE IF NOT EXISTS submittal_distribution_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id uuid NOT NULL REFERENCES submittal_distributions(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submittal_dist_recipients ON submittal_distribution_recipients(distribution_id);

ALTER TABLE submittal_distribution_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submittal_dist_recipients_access" ON submittal_distribution_recipients
  FOR ALL
  USING (
    distribution_id IN (
      SELECT id FROM submittal_distributions WHERE submittal_id IN (
        SELECT id FROM submittals WHERE project_id IN (
          SELECT project_id FROM project_directory_memberships pdm
          JOIN people p ON p.id = pdm.person_id
          WHERE p.auth_user_id = auth.uid()
        )
      )
    )
  );


-- =============================================================================
-- 7. SUBMITTAL ATTACHMENTS (files on submittals, responses, and distributions)
-- =============================================================================

CREATE TABLE IF NOT EXISTS submittal_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id uuid REFERENCES submittals(id) ON DELETE CASCADE,
  response_id uuid REFERENCES submittal_responses(id) ON DELETE CASCADE,
  distribution_id uuid REFERENCES submittal_distributions(id) ON DELETE CASCADE,

  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  content_type text,
  is_current boolean DEFAULT false,

  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),

  CONSTRAINT submittal_attachment_has_parent CHECK (
    submittal_id IS NOT NULL OR response_id IS NOT NULL OR distribution_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_submittal_attachments_submittal ON submittal_attachments(submittal_id);
CREATE INDEX IF NOT EXISTS idx_submittal_attachments_response ON submittal_attachments(response_id);

ALTER TABLE submittal_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submittal_attachments_access" ON submittal_attachments
  FOR ALL
  USING (
    submittal_id IN (
      SELECT id FROM submittals WHERE project_id IN (
        SELECT project_id FROM project_directory_memberships pdm
        JOIN people p ON p.id = pdm.person_id
        WHERE p.auth_user_id = auth.uid()
      )
    )
    OR response_id IN (
      SELECT id FROM submittal_responses WHERE submittal_id IN (
        SELECT id FROM submittals WHERE project_id IN (
          SELECT project_id FROM project_directory_memberships pdm
          JOIN people p ON p.id = pdm.person_id
          WHERE p.auth_user_id = auth.uid()
        )
      )
    )
  );


-- =============================================================================
-- 8. SUBMITTAL LINKED DRAWINGS (M2M)
-- =============================================================================

CREATE TABLE IF NOT EXISTS submittal_linked_drawings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id uuid NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,
  drawing_id uuid NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submittal_linked_drawings ON submittal_linked_drawings(submittal_id);

ALTER TABLE submittal_linked_drawings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submittal_linked_drawings_access" ON submittal_linked_drawings
  FOR ALL
  USING (
    submittal_id IN (
      SELECT id FROM submittals WHERE project_id IN (
        SELECT project_id FROM project_directory_memberships pdm
        JOIN people p ON p.id = pdm.person_id
        WHERE p.auth_user_id = auth.uid()
      )
    )
  );
