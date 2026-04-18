import type { GenericTableConfig } from "@/components/tables/generic-table-factory";

/**
 * Contracts Table Configuration
 *
 * Configuration for prime contracts table using GenericDataTable.
 * Prime contracts are owner agreements, distinct from commitments (subcontracts/POs).
 */

/**
 * Prime contracts table configuration
 */
export const contractsTableConfig: GenericTableConfig = {
  searchFields: ["contract_number", "title", "client_name"],
  exportFilename: "prime-contracts.csv",
  enableSorting: true,
  defaultSortColumn: "contract_number",
  defaultSortDirection: "asc",
  enableViewSwitcher: false, // Keep table view only for financial data
  columns: [
    {
      id: "contract_number",
      label: "Number",
      defaultVisible: true,
      type: "text",
      isPrimary: true,
      sortable: true,
    },
    {
      id: "client_name",
      label: "Owner/Client",
      defaultVisible: true,
      type: "text",
      sortable: true,
      renderConfig: {
        type: "nested",
        path: "client.name",
        fallback: "--",
      },
    },
    {
      id: "title",
      label: "Title",
      defaultVisible: true,
      type: "text",
      isSecondary: true,
      sortable: true,
    },
    {
      id: "status",
      label: "Status",
      defaultVisible: true,
      type: "badge",
      sortable: true,
      renderConfig: {
        type: "badge",
        variantMap: {
          draft: "secondary",
          pending: "default",
          out_for_signature: "default",
          approved: "default",
          complete: "outline",
          void: "destructive",
        },
        defaultVariant: "secondary",
      },
    },
    {
      id: "executed_at",
      label: "Executed",
      defaultVisible: true,
      type: "boolean",
      sortable: true,
      renderConfig: {
        type: "boolean",
        trueLabel: "Yes",
        falseLabel: "No",
      },
    },
    {
      id: "original_contract_value",
      label: "Original Contract Amount",
      defaultVisible: true,
      type: "number",
      sortable: true,
      renderConfig: {
        type: "currency",
        prefix: "$",
        showDecimals: true,
      },
    },
    {
      id: "approved_change_orders",
      label: "Approved Change Orders",
      defaultVisible: true,
      type: "number",
      sortable: false, // Calculated field, no DB sort
      renderConfig: {
        type: "currency",
        prefix: "$",
        showDecimals: true,
      },
    },
    {
      id: "revised_contract_value",
      label: "Revised Contract Amount",
      defaultVisible: true,
      type: "number",
      sortable: true,
      renderConfig: {
        type: "currency",
        prefix: "$",
        showDecimals: true,
      },
    },
    {
      id: "pending_change_orders",
      label: "Pending Change Orders",
      defaultVisible: true,
      type: "number",
      sortable: false, // Calculated field
      renderConfig: {
        type: "currency",
        prefix: "$",
        showDecimals: true,
      },
    },
    {
      id: "draft_change_orders",
      label: "Draft Change Orders",
      defaultVisible: true,
      type: "number",
      sortable: false, // Calculated field
      renderConfig: {
        type: "currency",
        prefix: "$",
        showDecimals: true,
      },
    },
    {
      id: "invoiced",
      label: "Invoiced",
      defaultVisible: true,
      type: "number",
      sortable: false, // Calculated field
      renderConfig: {
        type: "currency",
        prefix: "$",
        showDecimals: true,
      },
    },
    {
      id: "payments_received",
      label: "Payments",
      defaultVisible: false,
      type: "number",
      sortable: false, // Calculated field
      renderConfig: {
        type: "currency",
        prefix: "$",
        showDecimals: true,
      },
    },
    {
      id: "remaining_balance",
      label: "Balance",
      defaultVisible: false,
      type: "number",
      sortable: false, // Calculated field
      renderConfig: {
        type: "currency",
        prefix: "$",
        showDecimals: true,
      },
    },
    {
      id: "start_date",
      label: "Start Date",
      defaultVisible: false,
      type: "date",
      sortable: true,
    },
    {
      id: "end_date",
      label: "End Date",
      defaultVisible: false,
      type: "date",
      sortable: true,
    },
    {
      id: "substantial_completion_date",
      label: "Substantial Completion",
      defaultVisible: false,
      type: "date",
      sortable: true,
    },
    {
      id: "actual_completion_date",
      label: "Actual Completion",
      defaultVisible: false,
      type: "date",
      sortable: true,
    },
    {
      id: "description",
      label: "Description",
      defaultVisible: false,
      type: "text",
      renderConfig: {
        type: "truncate",
        maxLength: 100,
      },
    },
  ],
  filters: [
    {
      id: "status-filter",
      label: "Status",
      field: "status",
      options: [
        { value: "draft", label: "Draft" },
        { value: "out_for_signature", label: "Out for Signature" },
        { value: "approved", label: "Approved" },
        { value: "complete", label: "Complete" },
        { value: "terminated", label: "Terminated" },
      ],
    },
  ],
};

/**
 * Contracts status label mapping (matches prime_contract_status_v2 enum)
 */
export const contractStatusLabels: Record<string, string> = {
  draft: "Draft",
  out_for_signature: "Out for Signature",
  approved: "Approved",
  complete: "Complete",
  terminated: "Terminated",
};

/**
 * Format currency helper
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}
