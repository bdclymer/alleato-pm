export type ChangeEventStatus =
  | "Open"
  | "Pending"
  | "Pending Approval"
  | "Approved"
  | "Rejected"
  | "Closed"
  | "Converted"
  | string;

export interface ChangeEvent {
  id: string | number;
  project_id: number;
  number: string | null;
  title: string;
  type: string;
  reason: string | null;
  scope: string;
  status: ChangeEventStatus | null;
  origin: string | null;
  description: string | null;
  expecting_revenue: boolean;
  line_item_revenue_source: string | null;
  prime_contract_id: number | null;
  created_at: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;
  // List parity fields used by the Change Events table view
  prime_pco?: string | null;
  prime_pco_title?: string | null;
  cost_rom?: number | null;
  rfq_title?: string | null;
  commitment?: string | null;
  commitment_title?: string | null;
}

export interface ChangeEventLineItem {
  id: string;
  change_event_id: string;
  budget_code_id: string | null;
  vendor_id: string | null;
  contract_id: string | null;
  description: string | null;
  unit_of_measure: string | null;
  quantity: number | null;
  unit_cost: number | null;
  revenue_rom: number | null;
  cost_rom: number | null;
  non_committed_cost: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ChangeEventRfq {
  id: string;
  project_id: number;
  change_event_id: string;
  rfq_number: string;
  title: string;
  status: string;
  assigned_company_id?: string | null;
  assigned_contact_id?: string | null;
  include_attachments: boolean;
  due_date: string;
  sent_at?: string | null;
  response_received_at?: string | null;
  estimated_total_amount: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string | null;
}

export interface ChangeEventRfqResponse {
  id: string;
  rfq_id: string;
  line_item_id?: string | null;
  responder_company_id?: string | null;
  responder_contact_id?: string | null;
  unit_price: number;
  extended_amount: number;
  notes?: string | null;
  status: string;
  submitted_at?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface ChangeEventRfqAttachment {
  id: string;
  rfq_id?: string | null;
  rfq_response_id?: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
}
