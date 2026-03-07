import type { ContractLineItemWithCostCode } from "@/types/contract-line-items";

export interface PrimeContractCO {
  id: string;
  contract_id: string;
  change_order_number: string;
  description: string;
  amount: number;
  status: string;
  requested_by: string | null;
  requested_date: string;
  approved_by: string | null;
  approved_date: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentApplication {
  id: string;
  contract_id: string;
  project_id: number;
  application_number: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  amount: number;
  retention_amount: number;
  net_amount: number;
  period_from: string | null;
  period_to: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  contract_id: string;
  project_id: number;
  payment_application_id: string | null;
  payment_number: string | null;
  amount: number;
  payment_date: string;
  method: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  payment_application?: {
    id: string;
    application_number: string;
    amount: number;
    status: string;
  } | null;
}

export interface VerticalMarkup {
  id: string;
  markup_type: string;
  percentage: number;
  calculation_order: number;
  compound: boolean;
  project_id: number;
}

export interface MarkupCalculationResult {
  markup_type: string;
  percentage: number;
  compound: boolean;
  baseAmount: number;
  markupAmount: number;
  runningTotal: number;
}

export interface MarkupCalculationResponse {
  baseAmount: number;
  calculations: MarkupCalculationResult[];
  totalMarkup: number;
  finalAmount: number;
}

export interface Contract {
  id: string;
  contract_number: string | null;
  title: string;
  status:
    | "draft"
    | "out_for_bid"
    | "out_for_signature"
    | "approved"
    | "complete"
    | "terminated";
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
  description: string | null;
  inclusions: string | null;
  exclusions: string | null;
  is_private: boolean;
  created_at: string;
  created_by: string | null;
  vendor_id: string | null;
  client_id: number | null;
  project_id: number;
  vendor?: { id: string; name: string } | null;
  client?: { id: number; name: string } | null;
  contractor?: { id: string; name: string } | null;
  architect_engineer?: { id: string; name: string } | null;
  approved_change_orders: number;
  pending_change_orders: number;
  draft_change_orders: number;
  pending_revised_contract_amount: number;
  invoiced_amount: number;
  payments_received: number;
  remaining_balance: number;
  percent_paid: number;
}

export interface BudgetCode {
  id: string;
  code: string;
  description: string;
  costType: string | null;
  fullLabel: string;
  costTypeId?: string | null;
}

export interface ContractAttachment {
  id: string;
  fileName: string;
  url: string;
  uploadedBy: { id: string; email: string } | null;
  uploadedAt: string;
}

export interface InvoiceFormState {
  application_number: string;
  amount: string;
  retention_amount: string;
  period_from: string;
  period_to: string;
  notes: string;
}

export interface PaymentFormState {
  amount: string;
  payment_date: string;
  payment_application_id: string;
  payment_number: string;
  method: string;
  reference_number: string;
  notes: string;
}

export interface LineItemFormState {
  lineNumber: string;
  description: string;
  quantity: string;
  unitCost: string;
  unitOfMeasure: string;
  budgetCodeId: string;
}

export interface ChangeOrderFormState {
  change_order_number: string;
  description: string;
  amount: string;
  status: "draft" | "pending";
}

export type ContractTab =
  | "overview"
  | "change-orders"
  | "invoices"
  | "payments"
  | "emails"
  | "history"
  | "financial-markup"
  | "advanced-settings";

export type ContractLineItem = ContractLineItemWithCostCode;
