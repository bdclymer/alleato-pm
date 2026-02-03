-- Performance optimization indexes for commitments module
-- Phase 9: Performance optimizations

-- Composite indexes for the _with_totals views' subquery joins
-- These help the GROUP BY aggregations in the view definitions

-- Composite index on subcontract_sov_items for aggregate queries
CREATE INDEX IF NOT EXISTS idx_subcontract_sov_items_aggregate
  ON public.subcontract_sov_items (subcontract_id, amount, billed_to_date);

-- Composite index on purchase_order_sov_items for aggregate queries
CREATE INDEX IF NOT EXISTS idx_po_sov_items_aggregate
  ON public.purchase_order_sov_items (purchase_order_id, amount, billed_to_date);

-- Index for the commitments_unified view lookups by id
-- (used in detail page to resolve commitment type)
CREATE INDEX IF NOT EXISTS idx_subcontracts_id_type_lookup
  ON public.subcontracts (id) INCLUDE (deleted_at);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_id_type_lookup
  ON public.purchase_orders (id) INCLUDE (deleted_at);

-- Composite index for list page filtering (project_id + deleted_at + status)
CREATE INDEX IF NOT EXISTS idx_subcontracts_project_active
  ON public.subcontracts (project_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_active
  ON public.purchase_orders (project_id, status)
  WHERE deleted_at IS NULL;

-- Index for change order aggregation by contract_id + status
CREATE INDEX IF NOT EXISTS idx_contract_change_orders_contract_status
  ON public.contract_change_orders (contract_id, status, amount);

-- Index for subcontract_attachments count aggregation
CREATE INDEX IF NOT EXISTS idx_subcontract_attachments_aggregate
  ON public.subcontract_attachments (subcontract_id);

-- Index for text search on contract_number and title (used by search feature)
CREATE INDEX IF NOT EXISTS idx_subcontracts_search_text
  ON public.subcontracts USING gin (
    (contract_number || ' ' || COALESCE(title, '')) gin_trgm_ops
  );

CREATE INDEX IF NOT EXISTS idx_purchase_orders_search_text
  ON public.purchase_orders USING gin (
    (contract_number || ' ' || COALESCE(title, '')) gin_trgm_ops
  );

-- Analyze tables to update statistics for query planner
ANALYZE public.subcontracts;
ANALYZE public.purchase_orders;
ANALYZE public.subcontract_sov_items;
ANALYZE public.purchase_order_sov_items;
ANALYZE public.contract_change_orders;
ANALYZE public.subcontract_attachments;
