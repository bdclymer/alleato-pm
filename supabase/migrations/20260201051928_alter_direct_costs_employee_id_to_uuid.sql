-- =============================================================================
-- ALTER direct_costs.employee_id from BIGINT to UUID
-- References people(id) so the employee dropdown can save correctly
-- =============================================================================

-- Step 1: Drop the existing column (bigint, no FK, nullable, no data to preserve)
ALTER TABLE direct_costs DROP COLUMN IF EXISTS employee_id;

-- Step 2: Re-add as UUID with FK to people
ALTER TABLE direct_costs
  ADD COLUMN employee_id UUID REFERENCES people(id) ON DELETE SET NULL;

-- Step 3: Index for query performance
CREATE INDEX IF NOT EXISTS idx_direct_costs_employee_id
  ON direct_costs(employee_id);
