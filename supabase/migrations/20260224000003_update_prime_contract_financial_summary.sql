-- =============================================================================
-- Update prime_contract_financial_summary view
-- Replaces 0::numeric placeholders with real aggregates from the new
-- prime_contract_payment_applications and prime_contract_payments tables.
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

  -- Invoiced amount: sum of approved payment applications
  COALESCE((
    SELECT SUM(pa.amount)
    FROM prime_contract_payment_applications pa
    WHERE pa.contract_id = pc.id
      AND pa.status = 'approved'
  ), 0)                                                             AS invoiced_amount,

  -- Payments received: sum of all recorded payments
  COALESCE((
    SELECT SUM(p.amount)
    FROM prime_contract_payments p
    WHERE p.contract_id = pc.id
  ), 0)                                                             AS payments_received,

  -- Remaining balance = revised - payments received
  (
    pc.original_contract_value +
    COALESCE(SUM(co.amount) FILTER (WHERE co.status = 'approved'), 0)
  ) - COALESCE((
    SELECT SUM(p.amount)
    FROM prime_contract_payments p
    WHERE p.contract_id = pc.id
  ), 0)                                                             AS remaining_balance,

  -- Percent paid
  CASE
    WHEN (
      pc.original_contract_value +
      COALESCE(SUM(co.amount) FILTER (WHERE co.status = 'approved'), 0)
    ) = 0 THEN 0
    ELSE ROUND(
      COALESCE((
        SELECT SUM(p.amount)
        FROM prime_contract_payments p
        WHERE p.contract_id = pc.id
      ), 0) * 100.0 /
      (
        pc.original_contract_value +
        COALESCE(SUM(co.amount) FILTER (WHERE co.status = 'approved'), 0)
      ),
      2
    )
  END                                                               AS percent_paid

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
