-- =============================================================================
-- prime_contract_financial_summary view
-- Aggregates change orders against prime_contracts (UUID PK)
--
-- Why this exists:
--   contract_financial_summary_mv uses the integer-PK `contracts` table.
--   Our prime_contracts uses UUID PKs and `contract_change_orders` for COs.
--   This view provides the correct aggregations for the prime_contracts system.
-- =============================================================================

CREATE OR REPLACE VIEW prime_contract_financial_summary AS
SELECT
  pc.id                                                             AS contract_id,
  pc.project_id,
  pc.contract_number,
  pc.title,
  pc.status,
  pc.client_id,
  pc.executed,
  pc.is_private                                                     AS private,
  pc.original_contract_value                                        AS original_contract_amount,

  -- Change order aggregates
  COALESCE(
    SUM(co.amount) FILTER (WHERE co.status = 'approved'),
    0
  )                                                                 AS approved_change_orders,

  COALESCE(
    SUM(co.amount) FILTER (WHERE co.status = 'pending'),
    0
  )                                                                 AS pending_change_orders,

  COALESCE(
    SUM(co.amount) FILTER (WHERE co.status = 'draft'),
    0
  )                                                                 AS draft_change_orders,

  -- Revised = original + approved COs
  pc.original_contract_value +
    COALESCE(SUM(co.amount) FILTER (WHERE co.status = 'approved'), 0)
                                                                    AS revised_contract_amount,

  -- Pending revised = revised + pending COs
  pc.original_contract_value +
    COALESCE(SUM(co.amount) FILTER (WHERE co.status = 'approved'), 0) +
    COALESCE(SUM(co.amount) FILTER (WHERE co.status = 'pending'), 0)
                                                                    AS pending_revised_contract_amount,

  -- Invoice / Payment placeholders (populated once invoice infra exists)
  0::numeric                                                        AS invoiced_amount,
  0::numeric                                                        AS payments_received,

  -- Remaining balance = revised - payments received
  pc.original_contract_value +
    COALESCE(SUM(co.amount) FILTER (WHERE co.status = 'approved'), 0)
                                                                    AS remaining_balance,

  -- Percent paid (0 until payment infrastructure is built)
  0::numeric                                                        AS percent_paid

FROM prime_contracts pc
LEFT JOIN contract_change_orders co ON co.contract_id = pc.id
GROUP BY
  pc.id,
  pc.project_id,
  pc.contract_number,
  pc.title,
  pc.status,
  pc.client_id,
  pc.executed,
  pc.is_private,
  pc.original_contract_value;

-- Comment for future: once owner_invoices and payment_transactions tables
-- exist for prime_contracts (UUID-based), replace the 0::numeric placeholders
-- with actual SUM aggregates from those tables.
