-- =============================================================================
-- Prime Contract Payment Infrastructure
--
-- Creates payment_applications and payments tables for prime_contracts (UUID PK).
-- Separate from owner_invoices/payment_transactions which use the integer-PK contracts table.
-- =============================================================================

-- ------------------------------------------------
-- prime_contract_payment_applications
-- Represents an invoice/payment application submitted against a prime contract
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS prime_contract_payment_applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id       UUID NOT NULL REFERENCES prime_contracts(id) ON DELETE CASCADE,
  project_id        INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Application identification
  application_number  TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),

  -- Financial
  amount              NUMERIC(15, 2) NOT NULL DEFAULT 0,
  retention_amount    NUMERIC(15, 2) NOT NULL DEFAULT 0,
  net_amount          NUMERIC(15, 2) GENERATED ALWAYS AS (amount - retention_amount) STORED,

  -- Period covered
  period_from         DATE,
  period_to           DATE,

  -- Workflow timestamps
  submitted_at        TIMESTAMPTZ,
  submitted_by        TEXT,
  approved_at         TIMESTAMPTZ,
  approved_by         TEXT,

  -- Misc
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (contract_id, application_number)
);

-- Indexes
CREATE INDEX idx_pcpa_contract_id  ON prime_contract_payment_applications(contract_id);
CREATE INDEX idx_pcpa_project_id   ON prime_contract_payment_applications(project_id);
CREATE INDEX idx_pcpa_status       ON prime_contract_payment_applications(status);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER trg_pcpa_updated_at
  BEFORE UPDATE ON prime_contract_payment_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------
-- prime_contract_payments
-- Records actual money received against a prime contract
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS prime_contract_payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id         UUID NOT NULL REFERENCES prime_contracts(id) ON DELETE CASCADE,
  project_id          INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  payment_application_id UUID REFERENCES prime_contract_payment_applications(id) ON DELETE SET NULL,

  -- Payment identification
  payment_number      TEXT,
  amount              NUMERIC(15, 2) NOT NULL,
  payment_date        DATE NOT NULL,

  -- Payment details
  method              TEXT CHECK (method IN ('check', 'wire', 'ach', 'credit_card', 'cash', 'other')),
  reference_number    TEXT,   -- check number, wire reference, etc.
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_pcp_contract_id   ON prime_contract_payments(contract_id);
CREATE INDEX idx_pcp_project_id    ON prime_contract_payments(project_id);
CREATE INDEX idx_pcp_payment_date  ON prime_contract_payments(payment_date);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER trg_pcp_updated_at
  BEFORE UPDATE ON prime_contract_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------
-- RLS Policies
-- ------------------------------------------------
ALTER TABLE prime_contract_payment_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE prime_contract_payments             ENABLE ROW LEVEL SECURITY;

-- Payment applications: users can see applications for projects they belong to
CREATE POLICY "Users can view payment applications for their projects"
  ON prime_contract_payment_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_directory_memberships pdm
      JOIN users_auth ua ON ua.person_id = pdm.person_id
      WHERE pdm.project_id = prime_contract_payment_applications.project_id
        AND ua.auth_user_id = auth.uid()
        AND pdm.status = 'active'
    )
  );

CREATE POLICY "Users can insert payment applications for their projects"
  ON prime_contract_payment_applications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_directory_memberships pdm
      JOIN users_auth ua ON ua.person_id = pdm.person_id
      WHERE pdm.project_id = prime_contract_payment_applications.project_id
        AND ua.auth_user_id = auth.uid()
        AND pdm.status = 'active'
    )
  );

CREATE POLICY "Users can update payment applications for their projects"
  ON prime_contract_payment_applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_directory_memberships pdm
      JOIN users_auth ua ON ua.person_id = pdm.person_id
      WHERE pdm.project_id = prime_contract_payment_applications.project_id
        AND ua.auth_user_id = auth.uid()
        AND pdm.status = 'active'
    )
  );

CREATE POLICY "Users can delete payment applications for their projects"
  ON prime_contract_payment_applications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_directory_memberships pdm
      JOIN users_auth ua ON ua.person_id = pdm.person_id
      WHERE pdm.project_id = prime_contract_payment_applications.project_id
        AND ua.auth_user_id = auth.uid()
        AND pdm.status = 'active'
    )
  );

-- Payments: same pattern
CREATE POLICY "Users can view payments for their projects"
  ON prime_contract_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_directory_memberships pdm
      JOIN users_auth ua ON ua.person_id = pdm.person_id
      WHERE pdm.project_id = prime_contract_payments.project_id
        AND ua.auth_user_id = auth.uid()
        AND pdm.status = 'active'
    )
  );

CREATE POLICY "Users can insert payments for their projects"
  ON prime_contract_payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_directory_memberships pdm
      JOIN users_auth ua ON ua.person_id = pdm.person_id
      WHERE pdm.project_id = prime_contract_payments.project_id
        AND ua.auth_user_id = auth.uid()
        AND pdm.status = 'active'
    )
  );

CREATE POLICY "Users can update payments for their projects"
  ON prime_contract_payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_directory_memberships pdm
      JOIN users_auth ua ON ua.person_id = pdm.person_id
      WHERE pdm.project_id = prime_contract_payments.project_id
        AND ua.auth_user_id = auth.uid()
        AND pdm.status = 'active'
    )
  );

CREATE POLICY "Users can delete payments for their projects"
  ON prime_contract_payments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_directory_memberships pdm
      JOIN users_auth ua ON ua.person_id = pdm.person_id
      WHERE pdm.project_id = prime_contract_payments.project_id
        AND ua.auth_user_id = auth.uid()
        AND pdm.status = 'active'
    )
  );
