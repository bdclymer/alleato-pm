export type ChangeEventStatus = "open" | "pending" | "close" | "void";
export type ChangeEventOrigin = "emails" | "meetings" | "rfis";
export type ChangeEventType =
  | "allowance"
  | "contingency"
  | "owner_change"
  | "tbd"
  | "transfer";
export type ChangeReason =
  | "allowance"
  | "backcharge"
  | "client_request"
  | "design_development"
  | "existing_condition";

export interface ChangeEventLineItem {
  id?: string;
  budgetCode: string;
  description: string;
  vendor: string;
  contract: string;
  commitmentId?: string;
  commitmentLineItemId: string;
  revenueUnitOfMeasure: string;
  revenueQuantity: number;
  revenueUnitCost: number;
  revenueRom: number;
  costQuantity: number;
  costUnitCost: number;
  costRom: number;
  nonCommittedCost: number;
}

export interface ChangeEventFormData {
  number?: string;
  contractNumber: string;
  title: string;
  status: ChangeEventStatus | string;
  origin?: ChangeEventOrigin | string;
  originId?: string;
  type?: ChangeEventType | string;
  changeReason?: ChangeReason | string;
  scope?: string;
  expectingRevenue?: boolean;
  lineItemRevenueSource?: string;
  primeContractId?: string;
  description?: string;
  attachments: File[];
  lineItems: ChangeEventLineItem[];
}

export interface ChangeEventFormProps {
  initialData?: Partial<ChangeEventFormData>;
  onSubmit: (data: ChangeEventFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  mode?: "create" | "edit";
  projectId: number;
}

export interface PrimeContractOption {
  value: string;
  label: string;
}

export interface VendorOption {
  id: string;
  vendor_name: string;
  company?: string;
}

export interface ContractOption {
  id: string;
  label: string;
  type: "purchase_order" | "subcontract";
  vendorId?: string | null;
  vendorName?: string | null;
  title?: string | null;
}

export interface CommitmentSovLineItem {
  id: string;
  budget_code: string | null;
  description: string | null;
  line_number: number | null;
}

export interface BudgetCodeOption {
  id: string;
  code: string;
  description: string;
  costType: string | null;
  fullLabel: string;
}

export const createEmptyLineItem = (): ChangeEventLineItem => ({
  budgetCode: "",
  description: "",
  vendor: "",
  contract: "",
  commitmentId: undefined,
  commitmentLineItemId: "",
  revenueUnitOfMeasure: "",
  revenueQuantity: 1,
  revenueUnitCost: 0,
  revenueRom: 0,
  costQuantity: 1,
  costUnitCost: 0,
  costRom: 0,
  nonCommittedCost: 0,
});

export const UOM_OPTIONS = [
  "LOT",
  "EA",
  "LF",
  "SF",
  "CY",
  "SY",
  "TON",
  "GAL",
  "HR",
  "DAY",
  "WK",
  "MO",
  "LS",
];

export const STATUS_OPTIONS = [
  { value: "close", label: "Closed" },
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "void", label: "Void" },
];

export const ORIGIN_OPTIONS = [
  { value: "emails", label: "Emails" },
  { value: "meetings", label: "Meetings" },
  { value: "rfis", label: "RFI's" },
];

export const TYPE_OPTIONS = [
  { value: "allowance", label: "Allowance" },
  { value: "contingency", label: "Contingency" },
  { value: "owner_change", label: "Owner Change" },
  { value: "tbd", label: "TBD" },
  { value: "transfer", label: "Transfer" },
];

export const CHANGE_REASON_OPTIONS = [
  { value: "allowance", label: "Allowance" },
  { value: "back_charge", label: "Back Charge" },
  { value: "client_request", label: "Client Request" },
  { value: "design_development", label: "Design Development" },
  { value: "existing_condition", label: "Existing Condition" },
];

export const SCOPE_OPTIONS = [
  { value: "In Scope", label: "In Scope" },
  { value: "Out of Scope", label: "Out of Scope" },
  { value: "TBD", label: "TBD" },
  { value: "Allowance", label: "Allowance" },
];

export const REVENUE_SOURCE_OPTIONS = [
  { value: "Match Revenue to Latest Cost", label: "Match Revenue to Latest Cost" },
  { value: "Enter manually", label: "Enter manually" },
  { value: "Quantity x Unit Cost", label: "Quantity x Unit Cost" },
];
