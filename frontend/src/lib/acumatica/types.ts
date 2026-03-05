/**
 * Acumatica ERP Integration — Type Definitions
 *
 * All raw API responses from Acumatica wrap field values in a `{"value": ...}`
 * envelope. These `Raw*` interfaces represent that wire shape. The `unwrap`
 * utility in client.ts converts them to the flat `Flat*` variants used
 * throughout the rest of the application.
 *
 * Naming convention:
 *   Raw*  — shape returned directly from the Acumatica REST API
 *   Flat* — unwrapped shape ready for use in application code
 */

// ---------------------------------------------------------------------------
// Generic Acumatica value wrapper
// ---------------------------------------------------------------------------

/** Acumatica wraps every field value in this envelope. */
export type AcuField<T> = { value: T };

/** Recursively unwrap all AcuField<T> in an object type. */
export type Unwrap<T> = T extends AcuField<infer V>
  ? V
  : T extends Array<infer Item>
    ? Array<Unwrap<Item>>
    : T extends object
      ? { [K in keyof T]: Unwrap<T[K]> }
      : T;

// ---------------------------------------------------------------------------
// OData query options (shared by all entity fetch methods)
// ---------------------------------------------------------------------------

export interface AcuQueryOptions {
  /** Maximum number of records to return (OData $top). Default varies by entity. */
  $top?: number;
  /** Number of records to skip for pagination (OData $skip). */
  $skip?: number;
  /** OData filter expression, e.g. `Status eq 'Open'`. */
  $filter?: string;
  /** Comma-separated sub-entities to expand, e.g. `Details`. */
  $expand?: string;
  /** Comma-separated field names to project. Reduces payload size. */
  $select?: string;
  /**
   * Convenience shorthand. When provided, injects a filter clause:
   * `LastModifiedDateTime gt 'ISO_STRING'`.
   * Combined with any existing `$filter` value via `and`.
   */
  modifiedAfter?: Date | string;
}

// ---------------------------------------------------------------------------
// Session / Auth
// ---------------------------------------------------------------------------

export interface AcuLoginBody {
  name: string;
  password: string;
  company: string;
  locale?: string;
  branch?: string;
}

export interface AcuSessionState {
  /** Raw cookie string forwarded on every subsequent request. */
  cookies: string;
  /** Timestamp of the last successful login (ms since epoch). */
  loginAt: number;
  /** Approximate TTL in milliseconds (default 20 min). */
  ttlMs: number;
}

// ---------------------------------------------------------------------------
// Vendor
// ---------------------------------------------------------------------------

export interface RawVendor {
  VendorID: AcuField<string>;
  VendorName: AcuField<string>;
  Status: AcuField<string>;
  CurrencyID: AcuField<string>;
  CurrencyRateType?: AcuField<string>;
  PrimaryContactID?: AcuField<number | null>;
  MainContact?: {
    Email?: AcuField<string>;
    Phone1?: AcuField<string>;
  };
  PaymentMethod?: AcuField<string>;
  CashAccount?: AcuField<string>;
  Terms?: AcuField<string>;
  TaxZone?: AcuField<string>;
  LastModifiedDateTime?: AcuField<string>;
}

export interface FlatVendor {
  VendorID: string;
  VendorName: string;
  Status: string;
  CurrencyID: string;
  CurrencyRateType?: string;
  PrimaryContactID?: number | null;
  Email?: string;
  Phone1?: string;
  PaymentMethod?: string;
  CashAccount?: string;
  Terms?: string;
  TaxZone?: string;
  LastModifiedDateTime?: string;
}

// ---------------------------------------------------------------------------
// Bill (AP Invoice)
// ---------------------------------------------------------------------------

export interface RawBillDetail {
  LineNbr?: AcuField<number>;
  BranchID?: AcuField<string>;
  AccountID?: AcuField<string>;
  /** Short alias used in some API versions. */
  Account?: AcuField<string>;
  Subaccount?: AcuField<string>;
  Description?: AcuField<string>;
  Quantity?: AcuField<number>;
  UOM?: AcuField<string>;
  UnitCost?: AcuField<number>;
  ExtendedCost?: AcuField<number>;
  TaxCategory?: AcuField<string>;
  ProjectID?: AcuField<string>;
  ProjectTaskID?: AcuField<string>;
  CostCodeID?: AcuField<string>;
}

export interface RawBill {
  ReferenceNbr: AcuField<string>;
  Type?: AcuField<string>;
  Vendor: AcuField<string>;
  VendorRef?: AcuField<string>;
  Date: AcuField<string>;
  DueDate?: AcuField<string>;
  FinancialPeriod?: AcuField<string>;
  Status: AcuField<string>;
  Amount: AcuField<number>;
  Balance: AcuField<number>;
  TaxTotal?: AcuField<number>;
  Description?: AcuField<string>;
  CurrencyID?: AcuField<string>;
  BranchID?: AcuField<string>;
  LastModifiedDateTime?: AcuField<string>;
  Details?: RawBillDetail[];
}

export interface FlatBillDetail {
  LineNbr?: number;
  BranchID?: string;
  AccountID?: string;
  Account?: string;
  Subaccount?: string;
  Description?: string;
  Quantity?: number;
  UOM?: string;
  UnitCost?: number;
  ExtendedCost?: number;
  TaxCategory?: string;
  ProjectID?: string;
  ProjectTaskID?: string;
  CostCodeID?: string;
}

export interface FlatBill {
  ReferenceNbr: string;
  Type?: string;
  Vendor: string;
  VendorRef?: string;
  Date: string;
  DueDate?: string;
  FinancialPeriod?: string;
  Status: string;
  Amount: number;
  Balance: number;
  TaxTotal?: number;
  Description?: string;
  CurrencyID?: string;
  BranchID?: string;
  LastModifiedDateTime?: string;
  Details?: FlatBillDetail[];
}

// ---------------------------------------------------------------------------
// Invoice (AR Invoice)
// ---------------------------------------------------------------------------

export interface RawInvoiceDetail {
  LineNbr?: AcuField<number>;
  BranchID?: AcuField<string>;
  AccountID?: AcuField<string>;
  Account?: AcuField<string>;
  Subaccount?: AcuField<string>;
  TransactionDescription?: AcuField<string>;
  Quantity?: AcuField<number>;
  UOM?: AcuField<string>;
  UnitPrice?: AcuField<number>;
  ExtendedPrice?: AcuField<number>;
  TaxCategory?: AcuField<string>;
  ProjectID?: AcuField<string>;
  ProjectTaskID?: AcuField<string>;
}

export interface RawInvoice {
  ReferenceNbr: AcuField<string>;
  Type?: AcuField<string>;
  Customer?: AcuField<string>;
  CustomerName?: AcuField<string>;
  CustomerRef?: AcuField<string>;
  Date: AcuField<string>;
  DueDate?: AcuField<string>;
  FinancialPeriod?: AcuField<string>;
  Status: AcuField<string>;
  Amount: AcuField<number>;
  Balance: AcuField<number>;
  TaxTotal?: AcuField<number>;
  Description?: AcuField<string>;
  CurrencyID?: AcuField<string>;
  BranchID?: AcuField<string>;
  LastModifiedDateTime?: AcuField<string>;
  Details?: RawInvoiceDetail[];
}

export interface FlatInvoiceDetail {
  LineNbr?: number;
  BranchID?: string;
  AccountID?: string;
  Account?: string;
  Subaccount?: string;
  TransactionDescription?: string;
  Quantity?: number;
  UOM?: string;
  UnitPrice?: number;
  ExtendedPrice?: number;
  TaxCategory?: string;
  ProjectID?: string;
  ProjectTaskID?: string;
}

export interface FlatInvoice {
  ReferenceNbr: string;
  Type?: string;
  Customer?: string;
  CustomerName?: string;
  CustomerRef?: string;
  Date: string;
  DueDate?: string;
  FinancialPeriod?: string;
  Status: string;
  Amount: number;
  Balance: number;
  TaxTotal?: number;
  Description?: string;
  CurrencyID?: string;
  BranchID?: string;
  LastModifiedDateTime?: string;
  Details?: FlatInvoiceDetail[];
}

// ---------------------------------------------------------------------------
// Payment (AR Payment received)
// ---------------------------------------------------------------------------

export interface RawPayment {
  ReferenceNbr: AcuField<string>;
  Type?: AcuField<string>;
  Customer?: AcuField<string>;
  CustomerName?: AcuField<string>;
  Date: AcuField<string>;
  FinancialPeriod?: AcuField<string>;
  Status: AcuField<string>;
  PaymentAmount: AcuField<number>;
  AppliedToDocuments?: AcuField<number>;
  PaymentMethod?: AcuField<string>;
  CashAccount?: AcuField<string>;
  Description?: AcuField<string>;
  CurrencyID?: AcuField<string>;
  ExternalRef?: AcuField<string>;
  LastModifiedDateTime?: AcuField<string>;
}

export interface FlatPayment {
  ReferenceNbr: string;
  Type?: string;
  Customer?: string;
  CustomerName?: string;
  Date: string;
  FinancialPeriod?: string;
  Status: string;
  PaymentAmount: number;
  AppliedToDocuments?: number;
  PaymentMethod?: string;
  CashAccount?: string;
  Description?: string;
  CurrencyID?: string;
  ExternalRef?: string;
  LastModifiedDateTime?: string;
}

// ---------------------------------------------------------------------------
// Check (AP Payment / check issued to vendor)
// ---------------------------------------------------------------------------

export interface RawCheck {
  ReferenceNbr: AcuField<string>;
  Type?: AcuField<string>;
  Vendor?: AcuField<string>;
  VendorName?: AcuField<string>;
  Date: AcuField<string>;
  FinancialPeriod?: AcuField<string>;
  Status: AcuField<string>;
  PaymentAmount: AcuField<number>;
  AppliedToDocuments?: AcuField<number>;
  PaymentMethod?: AcuField<string>;
  CashAccount?: AcuField<string>;
  Description?: AcuField<string>;
  CurrencyID?: AcuField<string>;
  ExtRefNbr?: AcuField<string>;
  LastModifiedDateTime?: AcuField<string>;
}

export interface FlatCheck {
  ReferenceNbr: string;
  Type?: string;
  Vendor?: string;
  VendorName?: string;
  Date: string;
  FinancialPeriod?: string;
  Status: string;
  PaymentAmount: number;
  AppliedToDocuments?: number;
  PaymentMethod?: string;
  CashAccount?: string;
  Description?: string;
  CurrencyID?: string;
  ExtRefNbr?: string;
  LastModifiedDateTime?: string;
}

// ---------------------------------------------------------------------------
// Journal Transaction (GL)
// ---------------------------------------------------------------------------

export interface RawJournalTransactionDetail {
  LineNbr?: AcuField<number>;
  BranchID?: AcuField<string>;
  AccountID?: AcuField<string>;
  Account?: AcuField<string>;
  Subaccount?: AcuField<string>;
  ReferenceNbr?: AcuField<string>;
  Description?: AcuField<string>;
  CreditAmount?: AcuField<number>;
  DebitAmount?: AcuField<number>;
  ProjectID?: AcuField<string>;
  ProjectTaskID?: AcuField<string>;
}

export interface RawJournalTransaction {
  BatchNbr: AcuField<string>;
  Module?: AcuField<string>;
  Date: AcuField<string>;
  FinancialPeriod?: AcuField<string>;
  Status?: AcuField<string>;
  Description?: AcuField<string>;
  CurrencyID?: AcuField<string>;
  CreditTotal?: AcuField<number>;
  DebitTotal?: AcuField<number>;
  LastModifiedDateTime?: AcuField<string>;
  Details?: RawJournalTransactionDetail[];
}

export interface FlatJournalTransactionDetail {
  LineNbr?: number;
  BranchID?: string;
  AccountID?: string;
  Account?: string;
  Subaccount?: string;
  ReferenceNbr?: string;
  Description?: string;
  CreditAmount?: number;
  DebitAmount?: number;
  ProjectID?: string;
  ProjectTaskID?: string;
}

export interface FlatJournalTransaction {
  BatchNbr: string;
  Module?: string;
  Date: string;
  FinancialPeriod?: string;
  Status?: string;
  Description?: string;
  CurrencyID?: string;
  CreditTotal?: number;
  DebitTotal?: number;
  LastModifiedDateTime?: string;
  Details?: FlatJournalTransactionDetail[];
}

// ---------------------------------------------------------------------------
// Account (GL Chart of Accounts)
// ---------------------------------------------------------------------------

export interface RawAccount {
  AccountID: AcuField<string>;
  AccountCD?: AcuField<string>;
  Description?: AcuField<string>;
  Type?: AcuField<string>;
  Active?: AcuField<boolean>;
  CurrencyID?: AcuField<string>;
  RevalCurrency?: AcuField<boolean>;
  LastModifiedDateTime?: AcuField<string>;
}

export interface FlatAccount {
  AccountID: string;
  AccountCD?: string;
  Description?: string;
  Type?: string;
  Active?: boolean;
  CurrencyID?: string;
  RevalCurrency?: boolean;
  LastModifiedDateTime?: string;
}

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

export interface RawCustomer {
  CustomerID: AcuField<string>;
  CustomerName: AcuField<string>;
  Status: AcuField<string>;
  CurrencyID?: AcuField<string>;
  Terms?: AcuField<string>;
  TaxZone?: AcuField<string>;
  MainContact?: {
    Email?: AcuField<string>;
    Phone1?: AcuField<string>;
  };
  LastModifiedDateTime?: AcuField<string>;
}

export interface FlatCustomer {
  CustomerID: string;
  CustomerName: string;
  Status: string;
  CurrencyID?: string;
  Terms?: string;
  TaxZone?: string;
  Email?: string;
  Phone1?: string;
  LastModifiedDateTime?: string;
}

// ---------------------------------------------------------------------------
// Purchase Order
// ---------------------------------------------------------------------------

export interface RawPurchaseOrderDetail {
  LineNbr?: AcuField<number>;
  InventoryID?: AcuField<string>;
  Description?: AcuField<string>;
  Quantity?: AcuField<number>;
  UOM?: AcuField<string>;
  UnitCost?: AcuField<number>;
  ExtendedCost?: AcuField<number>;
  ReceivedQty?: AcuField<number>;
  BilledQty?: AcuField<number>;
  ProjectID?: AcuField<string>;
  ProjectTaskID?: AcuField<string>;
  LineStatus?: AcuField<string>;
}

export interface RawPurchaseOrder {
  OrderNbr: AcuField<string>;
  OrderType?: AcuField<string>;
  Vendor: AcuField<string>;
  VendorRef?: AcuField<string>;
  Date: AcuField<string>;
  PromisedOn?: AcuField<string>;
  Status: AcuField<string>;
  OrderTotal?: AcuField<number>;
  BilledAmount?: AcuField<number>;
  Description?: AcuField<string>;
  CurrencyID?: AcuField<string>;
  BranchID?: AcuField<string>;
  LastModifiedDateTime?: AcuField<string>;
  Details?: RawPurchaseOrderDetail[];
}

export interface FlatPurchaseOrderDetail {
  LineNbr?: number;
  InventoryID?: string;
  Description?: string;
  Quantity?: number;
  UOM?: string;
  UnitCost?: number;
  ExtendedCost?: number;
  ReceivedQty?: number;
  BilledQty?: number;
  ProjectID?: string;
  ProjectTaskID?: string;
  LineStatus?: string;
}

export interface FlatPurchaseOrder {
  OrderNbr: string;
  OrderType?: string;
  Vendor: string;
  VendorRef?: string;
  Date: string;
  PromisedOn?: string;
  Status: string;
  OrderTotal?: number;
  BilledAmount?: number;
  Description?: string;
  CurrencyID?: string;
  BranchID?: string;
  LastModifiedDateTime?: string;
  Details?: FlatPurchaseOrderDetail[];
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export interface RawProject {
  ProjectID: AcuField<string>;
  Description: AcuField<string>;
  Status: AcuField<string>;
  Customer?: AcuField<string>;
  Hold?: AcuField<boolean>;
  Income?: AcuField<number>;
  Expenses?: AcuField<number>;
  Assets?: AcuField<number>;
  Liabilities?: AcuField<number>;
  ProjectTemplateID?: AcuField<string>;
  ExternalRefNbr?: AcuField<string>;
  LastModifiedDateTime?: AcuField<string>;
}

export interface FlatProject {
  ProjectID: string;
  Description: string;
  Status: string;
  Customer?: string;
  Hold?: boolean;
  Income?: number;
  Expenses?: number;
  Assets?: number;
  Liabilities?: number;
  ProjectTemplateID?: string;
  ExternalRefNbr?: string;
  LastModifiedDateTime?: string;
}

// ---------------------------------------------------------------------------
// Project Budget
// ---------------------------------------------------------------------------

export interface RawProjectBudget {
  ProjectID: AcuField<string>;
  ProjectTaskID: AcuField<string>;
  AccountGroup?: AcuField<string>;
  CostCode?: AcuField<string>;
  Description?: AcuField<string>;
  Type?: AcuField<string>;
  InventoryID?: AcuField<string>;
  UOM?: AcuField<string>;
  UnitRate?: AcuField<number>;
  /** Original budget */
  OriginalBudgetedAmount?: AcuField<number>;
  OriginalBudgetedQty?: AcuField<number>;
  /** Revised budget (original + change orders) */
  RevisedBudgetedAmount?: AcuField<number>;
  RevisedBudgetedQty?: AcuField<number>;
  /** Change order amounts */
  BudgetedCOAmount?: AcuField<number>;
  BudgetedCOQty?: AcuField<number>;
  /** Actuals */
  ActualAmount?: AcuField<number>;
  ActualQty?: AcuField<number>;
  ActualPlusOpenCommittedAmount?: AcuField<number>;
  /** Commitments */
  OriginalCommittedAmount?: AcuField<number>;
  OriginalCommittedQty?: AcuField<number>;
  RevisedCommittedAmount?: AcuField<number>;
  RevisedCommittedQty?: AcuField<number>;
  CommittedCOAmount?: AcuField<number>;
  CommittedCOQty?: AcuField<number>;
  CommittedInvoicedAmount?: AcuField<number>;
  CommittedInvoicedQty?: AcuField<number>;
  CommittedOpenAmount?: AcuField<number>;
  CommittedOpenQty?: AcuField<number>;
  CommittedReceivedQty?: AcuField<number>;
  /** Forecasting */
  CostAtCompletion?: AcuField<number>;
  CostToComplete?: AcuField<number>;
  LastCostAtCompletion?: AcuField<number>;
  LastCostToComplete?: AcuField<number>;
  /** Completion */
  Completed?: AcuField<number>;
  AutoCompleted?: AcuField<boolean>;
  PercentageOfCompletion?: AcuField<number>;
  LastPercentageOfCompletion?: AcuField<number>;
  Performance?: AcuField<number>;
  /** Other */
  VarianceAmount?: AcuField<number>;
  Retainage?: AcuField<number>;
  DraftInvoicesAmount?: AcuField<number>;
  PendingInvoiceAmount?: AcuField<number>;
  RevenueTask?: AcuField<string>;
  TaxCategory?: AcuField<string>;
  LastModifiedDateTime?: AcuField<string>;
}

export interface FlatProjectBudget {
  ProjectID: string;
  ProjectTaskID: string;
  AccountGroup?: string;
  CostCode?: string;
  Description?: string;
  Type?: string;
  InventoryID?: string;
  UOM?: string;
  UnitRate?: number;
  OriginalBudgetedAmount?: number;
  OriginalBudgetedQty?: number;
  RevisedBudgetedAmount?: number;
  RevisedBudgetedQty?: number;
  BudgetedCOAmount?: number;
  BudgetedCOQty?: number;
  ActualAmount?: number;
  ActualQty?: number;
  ActualPlusOpenCommittedAmount?: number;
  OriginalCommittedAmount?: number;
  OriginalCommittedQty?: number;
  RevisedCommittedAmount?: number;
  RevisedCommittedQty?: number;
  CommittedCOAmount?: number;
  CommittedCOQty?: number;
  CommittedInvoicedAmount?: number;
  CommittedInvoicedQty?: number;
  CommittedOpenAmount?: number;
  CommittedOpenQty?: number;
  CommittedReceivedQty?: number;
  CostAtCompletion?: number;
  CostToComplete?: number;
  LastCostAtCompletion?: number;
  LastCostToComplete?: number;
  Completed?: number;
  AutoCompleted?: boolean;
  PercentageOfCompletion?: number;
  LastPercentageOfCompletion?: number;
  Performance?: number;
  VarianceAmount?: number;
  Retainage?: number;
  DraftInvoicesAmount?: number;
  PendingInvoiceAmount?: number;
  RevenueTask?: string;
  TaxCategory?: string;
  LastModifiedDateTime?: string;
}

// ---------------------------------------------------------------------------
// Project Task
// ---------------------------------------------------------------------------

export interface RawProjectTask {
  ProjectID: AcuField<string>;
  ProjectTaskID: AcuField<string>;
  Description?: AcuField<string>;
  Status?: AcuField<string>;
  Default?: AcuField<boolean>;
  ExternalRefNbr?: AcuField<string>;
  LastModifiedDateTime?: AcuField<string>;
}

export interface FlatProjectTask {
  ProjectID: string;
  ProjectTaskID: string;
  Description?: string;
  Status?: string;
  Default?: boolean;
  ExternalRefNbr?: string;
  LastModifiedDateTime?: string;
}

// ---------------------------------------------------------------------------
// Project Budget Summary (computed by the client, not from the API)
// ---------------------------------------------------------------------------

export interface ProjectBudgetSummary {
  projectId: string;
  projectDescription: string;
  projectStatus: string;
  customer?: string;
  asOf: string;
  /** High-level financial totals */
  totals: {
    originalBudget: number;
    revisedBudget: number;
    budgetChangeOrders: number;
    actualCosts: number;
    committedCosts: number;
    costToComplete: number;
    costAtCompletion: number;
    variance: number;
    income: number;
    expenses: number;
  };
  /** Budget lines grouped by type (Income vs Expense) */
  linesByType: {
    income: FlatProjectBudget[];
    expense: FlatProjectBudget[];
  };
  /** Total line count */
  lineCount: number;
}

// ---------------------------------------------------------------------------
// Aggregation / summary types (computed by the client, not from the API)
// ---------------------------------------------------------------------------

export interface AgingBucket {
  /** Descriptive label for this aging tier. */
  label: "Current" | "1-30 Days" | "31-60 Days" | "61-90 Days" | "90+ Days";
  /** Total outstanding balance in this bucket. */
  totalBalance: number;
  /** Number of documents in this bucket. */
  count: number;
}

export interface AgingSummary {
  /** Computed at this UTC timestamp. */
  asOf: string;
  buckets: AgingBucket[];
  /** Grand total across all buckets. */
  totalBalance: number;
}

export interface CashPositionSummary {
  asOf: string;
  /** Sum of AR payments received in the look-back window. */
  totalInflows: number;
  /** Sum of AP checks issued in the look-back window. */
  totalOutflows: number;
  netCashFlow: number;
  /** Number of days used for the look-back window. */
  windowDays: number;
}

export interface VendorSpendSummary {
  vendorId: string;
  vendorName: string;
  asOf: string;
  /** Total invoiced (sum of all bill amounts). */
  totalInvoiced: number;
  /** Total still outstanding (sum of all bill balances). */
  totalOutstanding: number;
  /** Total paid (totalInvoiced - totalOutstanding). */
  totalPaid: number;
  billCount: number;
  bills: FlatBill[];
}

// ---------------------------------------------------------------------------
// Internal fetch result types
// ---------------------------------------------------------------------------

/** Returned from paginated entity methods. */
export interface AcuPage<T> {
  data: T[];
  /** True when fewer records than `$top` were returned (last page). */
  isLastPage: boolean;
  /** The `$skip` value to use for the next page, if not last. */
  nextSkip?: number;
}
