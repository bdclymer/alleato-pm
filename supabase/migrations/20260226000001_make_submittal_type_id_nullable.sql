-- Make submittal_type_id nullable on the submittals table.
-- The form uses a free-text submittal_type field; submittal_type_id is an
-- optional FK to submittal_types and should not be required.
ALTER TABLE submittals
  ALTER COLUMN submittal_type_id DROP NOT NULL;

-- Update status check constraint to support Procore-aligned values.
-- Existing values: draft, submitted, under_review, requires_revision, approved, rejected, superseded
-- New values added: Draft, Open, Distributed, Closed (Procore UI terminology)
ALTER TABLE submittals DROP CONSTRAINT IF EXISTS submittals_status_check;
ALTER TABLE submittals ADD CONSTRAINT submittals_status_check
  CHECK (status IN (
    'Draft', 'Open', 'Distributed', 'Closed',
    'draft', 'submitted', 'under_review', 'requires_revision', 'approved', 'rejected', 'superseded'
  ));
