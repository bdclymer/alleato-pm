-- Migration: Add missing columns to change_orders table
-- Purpose: Enable contract linking, financial tracking, approval workflow, and change event conversion
-- FK Types verified from database.types.ts on 2026-02-01:
--   contracts.id = INTEGER
--   change_events.id = UUID (string)
--   auth.users.id = UUID

-- Add new columns to change_orders
ALTER TABLE change_orders
  ADD COLUMN IF NOT EXISTS contract_id INTEGER REFERENCES contracts(id),
  ADD COLUMN IF NOT EXISTS change_event_id UUID,
  ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS designated_reviewer_id UUID,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add indexes on new FK/filter columns
CREATE INDEX IF NOT EXISTS idx_change_orders_contract_id ON change_orders(contract_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_change_event_id ON change_orders(change_event_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_designated_reviewer_id ON change_orders(designated_reviewer_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_status ON change_orders(status);
CREATE INDEX IF NOT EXISTS idx_change_orders_due_date ON change_orders(due_date);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_change_orders_project_status ON change_orders(project_id, status);
