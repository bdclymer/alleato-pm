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
  contract_number: string;
  title: string;
  vendor_id: string | null;
  description: string | null;
  status: ContractStatus;
  original_contract_value: number;
  revised_contract_value: number;
  start_date: string | null;
  end_date: string | null;
  retention_percentage: number;
  payment_terms: string | null;
  billing_schedule: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePrimeContractInput {
  project_id: number;
  contract_number: string;
  title: string;
  vendor_id?: string;
  description?: string;
  status?: ContractStatus;
  original_contract_value: number;
  revised_contract_value?: number;
  start_date?: string;
  end_date?: string;
  retention_percentage?: number;
  payment_terms?: string;
  billing_schedule?: string;
}

export interface UpdatePrimeContractInput {
  contract_number?: string;
  title?: string;
  vendor_id?: string | null;
  description?: string | null;
  status?: ContractStatus;
  original_contract_value?: number;
  revised_contract_value?: number;
  start_date?: string | null;
  end_date?: string | null;
  retention_percentage?: number;
  payment_terms?: string | null;
  billing_schedule?: string | null;
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
  contract_number: string;
  title: string;
  vendor_name: string | null;
  status: ContractStatus;
  original_contract_value: number;
  revised_contract_value: number;
  billed_to_date: number;
  remaining_value: number;
  percent_complete: number;
}
