/**
 * Contract Change Orders Type Definitions
 * Aligned with change_orders table schema
 * Updated: 2026-02-04
 */

export type ChangeOrderStatus =
  | "draft"
  | "submitted"
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "withdrawn"
  | "void";

export type ChangeOrderType = "prime" | "commitment" | "standalone";

export interface ContractChangeOrder {
  id: number;
  project_id: number;
  contract_id: number | null;
  co_number: string | null;
  title: string | null;
  description: string | null;
  amount: number | null;
  status: string | null;

  // Workflow fields
  designated_reviewer_id: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;

  // Additional spec fields
  due_date: string | null;
  is_private: boolean | null;
  apply_vertical_markup: boolean | null;
  change_event_id: string | null;

  // Timestamps
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Extended interface with Procore-aligned fields
 * For future enhancement to match full Procore spec
 */
export interface ContractChangeOrderExtended extends ContractChangeOrder {
  // Procore spec fields (to be added to schema)
  revision?: number;
  date_initiated?: string;
  review_date?: string;
  schedule_impact?: string;
  scope?: string;
  change_order_type?: ChangeOrderType;
  package_id?: string | null;
  executed?: boolean;
}

export interface CreateChangeOrderInput {
  project_id: number;
  contract_id?: number | null;
  co_number?: string | null;
  title?: string;
  description?: string;
  amount?: number;
  status?: string;
  designated_reviewer_id?: string | null;
  due_date?: string | null;
  is_private?: boolean;
  change_event_id?: string | null;
  scope?: string;
  schedule_impact?: string;
  change_order_type?: ChangeOrderType;
}

export interface UpdateChangeOrderInput {
  co_number?: string | null;
  title?: string | null;
  description?: string | null;
  amount?: number | null;
  status?: string | null;
  designated_reviewer_id?: string | null;
  due_date?: string | null;
  is_private?: boolean | null;
  rejection_reason?: string | null;
  apply_vertical_markup?: boolean | null;
}

export interface ApproveChangeOrderInput {
  approved_by: string;
  approved_date: string;
}

export interface RejectChangeOrderInput {
  approved_by: string;
  approved_date: string;
  rejection_reason: string;
}

/**
 * Change order with related user information
 */
export interface ChangeOrderWithUsers extends ContractChangeOrder {
  submitted_by_user?: {
    id: string;
    email: string;
    name?: string;
  };
  approved_by_user?: {
    id: string;
    email: string;
    name?: string;
  };
  designated_reviewer?: {
    id: string;
    email: string;
    name?: string;
  };
}

/**
 * Change order with all related entities
 */
export interface ContractChangeOrderWithRelations extends ChangeOrderWithUsers {
  contract?: {
    id: number;
    contract_number: string;
    contract_name: string;
    contract_type: string;
  };
  change_event?: {
    id: string;
    title: string;
    status: string;
  };
  line_items?: ChangeOrderLineItem[];
  attachments?: ChangeOrderAttachment[];
}

/**
 * Line item for change orders
 */
export interface ChangeOrderLineItem {
  id: string;
  change_order_id: number;
  cost_code: string | null;
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  total_price: number;
  sort_order: number;
}

/**
 * File attachment for change orders
 */
export interface ChangeOrderAttachment {
  id: string;
  change_order_id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
}

/**
 * Filter options for change orders list
 */
export interface ChangeOrderFilters {
  project_id?: number;
  contract_id?: number;
  status?: string | string[];
  designated_reviewer_id?: string;
  is_private?: boolean;
  search?: string; // Search in title, description, co_number
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
}

/**
 * Summary statistics for change orders
 */
export interface ChangeOrderSummary {
  contract_id?: number;
  project_id?: number;
  total_change_orders: number;
  draft_count: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  executed_count: number;
  total_draft_amount: number;
  total_pending_amount: number;
  total_approved_amount: number;
  total_rejected_amount: number;
  total_executed_amount: number;
}
