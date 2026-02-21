-- Allow draft status for contract-specific change orders
ALTER TABLE public.contract_change_orders
  DROP CONSTRAINT IF EXISTS contract_change_orders_status_check;

ALTER TABLE public.contract_change_orders
  ADD CONSTRAINT contract_change_orders_status_check
  CHECK (status = ANY (ARRAY['draft'::text, 'pending'::text, 'approved'::text, 'rejected'::text]));

COMMENT ON COLUMN public.contract_change_orders.status
IS 'Change order status: draft, pending, approved, rejected';
