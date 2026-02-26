/**
 * Prime Contracts Type Definitions
 * Generated from database schema
 */

export type ContractStatus =
  | "draft"
  | "out_for_bid"
  | "out_for_signature"
  | "approved"
  | "complete"
  | "terminated";

export interface PrimeContract {
  id: string;
  project_id: number;
  contract_number: string | null;
  title: string;
  vendor_id: string | null;
  client_id: number | null;
  description: string | null;
  status: ContractStatus;
  executed: boolean;
  executed_at: string | null;
  original_contract_value: number;
  revised_contract_value: number;
  start_date: string | null;
  end_date: string | null;
  substantial_completion_date: string | null;
  actual_completion_date: string | null;
  signed_contract_received_date: string | null;
  contract_termination_date: string | null;
  retention_percentage: number;
  payment_terms: string | null;
  billing_schedule: string | null;
  inclusions: string | null;
  exclusions: string | null;
  is_private: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  vendor?: { id: string; name: string } | null;
  client?: { id: number; name: string } | null;
  // Calculated financial fields from contract_financial_summary_mv
  approved_change_orders: number;
  pending_change_orders: number;
  draft_change_orders: number;
  pending_revised_contract_amount: number;
  invoiced_amount: number;
  payments_received: number;
  remaining_balance: number;
  percent_paid: number;
}

export interface CreatePrimeContractInput {
  project_id: number;
  contract_number?: string;
  title: string;
  vendor_id?: string | null;
  client_id?: number | null;
  description?: string | null;
  status?: ContractStatus;
  executed?: boolean;
  executed_at?: string | null;
  original_contract_value?: number;
  revised_contract_value?: number;
  start_date?: string | null;
  end_date?: string | null;
  substantial_completion_date?: string | null;
  actual_completion_date?: string | null;
  signed_contract_received_date?: string | null;
  contract_termination_date?: string | null;
  retention_percentage?: number;
  payment_terms?: string | null;
  billing_schedule?: string | null;
  inclusions?: string | null;
  exclusions?: string | null;
  is_private?: boolean;
}

export interface UpdatePrimeContractInput {
  contract_number?: string | null;
  title?: string;
  vendor_id?: string | null;
  client_id?: number | null;
  description?: string | null;
  status?: ContractStatus;
  executed?: boolean;
  executed_at?: string | null;
  original_contract_value?: number;
  revised_contract_value?: number;
  start_date?: string | null;
  end_date?: string | null;
  substantial_completion_date?: string | null;
  actual_completion_date?: string | null;
  signed_contract_received_date?: string | null;
  contract_termination_date?: string | null;
  retention_percentage?: number;
  payment_terms?: string | null;
  billing_schedule?: string | null;
  inclusions?: string | null;
  exclusions?: string | null;
  is_private?: boolean;
}

export interface PrimeContractWithVendor extends PrimeContract {
  vendor?: {
    id: string;
    name: string;
    company_name?: string;
  };
}

export interface PrimeContractSummary {
  id: string;
  contract_number: string | null;
  title: string;
  vendor_name: string | null;
  status: ContractStatus;
  original_contract_value: number;
  revised_contract_value: number;
  billed_to_date: number;
  remaining_value: number;
  percent_complete: number;
}
