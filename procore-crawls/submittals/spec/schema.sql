-- SUBMITTALS DOMAIN SCHEMA
-- Auto-generated from Procore crawl data for module: submittals
-- Derived from: edit form screenshot, list table columns, filter panel, detail view
-- Review and adjust types/constraints before applying as a migration

-- =============================================================================
-- 1. SUBMITTALS (main entity)
-- =============================================================================

CREATE TABLE submittals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id integer NOT NULL REFERENCES projects(id),

  -- Core identity (Number & Revision combined field)
  number text NOT NULL,                          -- Submittal number (e.g., "08-1113-1")
  revision integer NOT NULL DEFAULT 0,           -- Revision number (e.g., 0, 1, 2)
  title text NOT NULL,                           -- Submittal title (e.g., "Doors, Frames, Hardware")

  -- Classification
  specification_section text,                    -- CSI spec code (e.g., "08-1113 - Doors, Frames, Hardware")
  submittal_type text,                           -- e.g., "Product Information"
  division text,                                 -- CSI division (filterable)

  -- Status & workflow
  status text NOT NULL DEFAULT 'Draft',          -- Draft, Open, Distributed, Closed
  ball_in_court text,                            -- Current responsible party (may be computed)

  -- References (companies & contacts)
  submittal_package_id uuid REFERENCES submittal_packages(id),
  responsible_contractor_id integer,             -- FK to companies
  received_from_id uuid,                         -- FK to contacts
  submittal_manager_id uuid,                     -- FK to contacts (required in UI)

  -- Scheduling
  final_due_date date,                           -- Deadline for submittal response
  lead_time integer,                             -- Business days for lead time
  required_on_site_date date,                    -- When materials needed on site
  sent_date date,                                -- When submittal was sent/distributed

  -- References
  cost_code_id integer,                          -- FK to cost_codes
  location_id integer,                           -- FK to locations

  -- Content
  description text,                              -- Rich text description (required in UI)
  is_private boolean NOT NULL DEFAULT false,      -- "Visible only to admins, workflow, and distribution list members"

  -- Soft delete (Recycle Bin)
  deleted_at timestamptz,                        -- NULL = active, set = in recycle bin

  -- Audit
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_submittals_project ON submittals(project_id);
CREATE INDEX idx_submittals_status ON submittals(status);
CREATE INDEX idx_submittals_number ON submittals(project_id, number);
CREATE INDEX idx_submittals_package ON submittals(submittal_package_id);
CREATE INDEX idx_submittals_spec_section ON submittals(specification_section);
CREATE INDEX idx_submittals_deleted ON submittals(deleted_at) WHERE deleted_at IS NOT NULL;

-- Enable RLS
ALTER TABLE submittals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submittals_project_access" ON submittals
  FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_directory_memberships pdm
        JOIN people p ON p.id = pdm.person_id
        WHERE p.auth_user_id = auth.uid()
    )
  );

-- updated_at trigger
CREATE TRIGGER set_submittals_updated_at
  BEFORE UPDATE ON submittals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- 2. SUBMITTAL PACKAGES (groups of submittals)
-- =============================================================================

CREATE TABLE submittal_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id integer NOT NULL REFERENCES projects(id),
  name text NOT NULL,
  description text,

  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_submittal_packages_project ON submittal_packages(project_id);

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


-- =============================================================================
-- 3. SUBMITTAL WORKFLOW STEPS (approval chain)
-- =============================================================================

CREATE TABLE submittal_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id uuid NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,
  step_order integer NOT NULL,                   -- Position in workflow chain
  step_type text NOT NULL DEFAULT 'approval',    -- approval, review, etc.

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_submittal_workflow_steps_submittal ON submittal_workflow_steps(submittal_id);

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

CREATE TABLE submittal_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id uuid NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,
  workflow_step_id uuid REFERENCES submittal_workflow_steps(id),
  responder_id uuid NOT NULL,                    -- FK to contacts/users

  response_status text NOT NULL DEFAULT 'Pending', -- Submitted, Pending, Approved, Approved as Noted
  comments text,                                 -- Free text response comments
  responded_at timestamptz,                      -- When response was given

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_submittal_responses_submittal ON submittal_responses(submittal_id);
CREATE INDEX idx_submittal_responses_responder ON submittal_responses(responder_id);

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


-- =============================================================================
-- 5. SUBMITTAL DISTRIBUTIONS (distribution events)
-- =============================================================================

CREATE TABLE submittal_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id uuid NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,
  from_id uuid NOT NULL,                         -- Submittal manager who distributed
  message text,                                  -- Optional distribution message

  distributed_at timestamptz DEFAULT now()
);

CREATE INDEX idx_submittal_distributions_submittal ON submittal_distributions(submittal_id);

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

CREATE TABLE submittal_distribution_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id uuid NOT NULL REFERENCES submittal_distributions(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL                     -- FK to contacts
);

CREATE INDEX idx_submittal_dist_recipients ON submittal_distribution_recipients(distribution_id);

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
-- 7. SUBMITTAL ATTACHMENTS (files on submittals and responses)
-- =============================================================================

CREATE TABLE submittal_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id uuid REFERENCES submittals(id) ON DELETE CASCADE,
  response_id uuid REFERENCES submittal_responses(id) ON DELETE CASCADE,
  distribution_id uuid REFERENCES submittal_distributions(id) ON DELETE CASCADE,

  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  content_type text,
  is_current boolean DEFAULT false,              -- "CURRENT" badge in Procore UI

  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),

  -- At least one parent FK must be set
  CONSTRAINT attachment_has_parent CHECK (
    submittal_id IS NOT NULL OR response_id IS NOT NULL OR distribution_id IS NOT NULL
  )
);

CREATE INDEX idx_submittal_attachments_submittal ON submittal_attachments(submittal_id);
CREATE INDEX idx_submittal_attachments_response ON submittal_attachments(response_id);

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

CREATE TABLE submittal_linked_drawings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submittal_id uuid NOT NULL REFERENCES submittals(id) ON DELETE CASCADE,
  drawing_id uuid NOT NULL                       -- FK to drawings table (when implemented)
);

CREATE INDEX idx_submittal_linked_drawings ON submittal_linked_drawings(submittal_id);
