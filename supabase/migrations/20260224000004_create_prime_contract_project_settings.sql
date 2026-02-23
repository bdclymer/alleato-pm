-- =============================================================================
-- prime_contract_project_settings
-- Project-level configuration for how Prime Contracts behave.
-- One row per project (UNIQUE on project_id).
-- Mirrors Procore's Configure tab for Prime Contracts.
-- =============================================================================

CREATE TABLE IF NOT EXISTS prime_contract_project_settings (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                      INTEGER NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,

  -- Change Order workflow tier (1 = single tier, 2 = PCCO + PCO two-tier workflow)
  co_tier_count                   SMALLINT NOT NULL DEFAULT 1
                                    CHECK (co_tier_count IN (1, 2)),

  -- Permissions
  allow_standard_users_create_pcco  BOOLEAN NOT NULL DEFAULT false,
  allow_standard_users_create_pco   BOOLEAN NOT NULL DEFAULT false,

  -- Schedule of Values
  sov_always_editable             BOOLEAN NOT NULL DEFAULT false,

  -- PDF/Export markup visibility
  show_markup_on_co_pdf           BOOLEAN NOT NULL DEFAULT true,
  show_markup_on_invoice_pdf      BOOLEAN NOT NULL DEFAULT true,

  -- Default email distributions (comma-separated emails or role names)
  default_distribution_prime_contract  TEXT,
  default_distribution_pcco            TEXT,
  default_distribution_pco             TEXT,

  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_pcps_project_id ON prime_contract_project_settings(project_id);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER trg_pcps_updated_at
  BEFORE UPDATE ON prime_contract_project_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------
-- RLS
-- ------------------------------------------------
ALTER TABLE prime_contract_project_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view prime contract settings"
  ON prime_contract_project_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_directory_memberships pdm
      JOIN users_auth ua ON ua.person_id = pdm.person_id
      WHERE pdm.project_id = prime_contract_project_settings.project_id
        AND ua.auth_user_id = auth.uid()
        AND pdm.status = 'active'
    )
  );

CREATE POLICY "Project members can insert prime contract settings"
  ON prime_contract_project_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_directory_memberships pdm
      JOIN users_auth ua ON ua.person_id = pdm.person_id
      WHERE pdm.project_id = prime_contract_project_settings.project_id
        AND ua.auth_user_id = auth.uid()
        AND pdm.status = 'active'
    )
  );

CREATE POLICY "Project members can update prime contract settings"
  ON prime_contract_project_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_directory_memberships pdm
      JOIN users_auth ua ON ua.person_id = pdm.person_id
      WHERE pdm.project_id = prime_contract_project_settings.project_id
        AND ua.auth_user_id = auth.uid()
        AND pdm.status = 'active'
    )
  );
