import { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/components/misc/status-badge";
import type { SummaryCard } from "@/components/ds/summary-card-grid";
import type { FilterOption } from "@/components/templates";
import { formatCurrencyValue } from "@/components/ds/summary-card-grid";
import { formatDate } from "@/lib/format";

/**
 * Direct Costs Table Configuration
 *
 * This file contains all configuration for the direct costs table page,
 * including columns, filters, summary cards, and formatting helpers.
 */

/**
 * Direct Cost interface (from API response)
 */
export interface DirectCost {
  id: string;
  project_id: number;
  cost_type: string;
  date: string;
  description: string | null;
  employee_id: number | null;
  invoice_number: string | null;
  is_deleted: boolean | null;
  paid_date: string | null;
  received_date: string | null;
  status: string;
  terms: string | null;
  total_amount: number;
  vendor_id: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  updated_by_user_id: string;
  // View may include these joined fields
  vendor_name?: string | null;
  employee_name?: string | null;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}


/**
 * Format cost type label
 */
export function formatCostType(costType: string): string {
  return costType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Column definitions for direct costs table
 */
export function getDirectCostsColumns(
  onView?: (cost: DirectCost) => void,
): ColumnDef<DirectCost>[] {
  return [
    {
      accessorKey: "invoice_number",
      header: "Invoice #",
      cell: ({ row }) => (
        <div
          className="font-medium text-link hover:text-link-hover cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onView?.(row.original);
          }}
        >
          {row.getValue("invoice_number") || `DC-${row.original.id.slice(0, 8)}`}
        </div>
      ),
    },
    {
      accessorKey: "cost_type",
      header: "Cost Type",
      cell: ({ row }) => formatCostType(row.getValue("cost_type")),
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDate(row.getValue("date")),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const description = row.getValue("description") as string | null;
        return description || "—";
      },
    },
    {
      accessorKey: "vendor_name",
      header: "Vendor",
      cell: ({ row }) => {
        const vendorName = row.original.vendor_name;
        return vendorName || "—";
      },
    },
    {
      accessorKey: "total_amount",
      header: "Amount",
      cell: ({ row }) => formatCurrency(row.getValue("total_amount")),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge status={row.getValue("status")} type="direct-cost" />
      ),
    },
  ];
}

/**
 * Filter options for direct costs
 */
export const directCostStatusOptions: FilterOption[] = [
  {
    column: "status",
    title: "Status",
    options: [
      { label: "Draft", value: "Draft" },
      { label: "Pending", value: "Pending" },
      { label: "Revise and Resubmit", value: "Revise and Resubmit" },
      { label: "Approved", value: "Approved" },
    ],
  },
];

export const directCostTypeOptions: FilterOption[] = [
  {
    column: "cost_type",
    title: "Cost Type",
    options: [
      { label: "Expense", value: "expense" },
      { label: "Work Order", value: "work_order" },
      { label: "Miscellaneous", value: "miscellaneous" },
      { label: "Equipment", value: "equipment" },
      { label: "Material", value: "material" },
      { label: "Labor", value: "labor" },
    ],
  },
];

/**
 * Combine all filter options
 */
export const directCostFilterOptions: FilterOption[] = [
  ...directCostStatusOptions,
  ...directCostTypeOptions,
];

/**
 * Generate summary cards from direct costs data
 */
export function getDirectCostsSummaryCards(
  costs: DirectCost[],
): SummaryCard[] {
  const totals = costs.reduce(
    (acc, cost) => {
      const amount = cost.total_amount || 0;
      acc.totalCosts += amount;
      acc.count += 1;

      // Count by type
      if (cost.cost_type === "expense") {
        acc.expenses += amount;
      } else if (cost.cost_type === "work_order") {
        acc.workOrders += amount;
      } else if (cost.cost_type === "equipment") {
        acc.equipment += amount;
      } else {
        acc.other += amount;
      }

      // Count by status
      if (cost.status === "Approved") {
        acc.approved += amount;
      } else if (cost.status === "Pending") {
        acc.pending += amount;
      }

      return acc;
    },
    {
      totalCosts: 0,
      count: 0,
      expenses: 0,
      workOrders: 0,
      equipment: 0,
      other: 0,
      approved: 0,
      pending: 0,
    },
  );

  return [
    {
      id: "total-costs",
      label: "Total Direct Costs",
      value: formatCurrencyValue(totals.totalCosts),
    },
    {
      id: "pending",
      label: "Pending Approval",
      value: formatCurrencyValue(totals.pending),
    },
    {
      id: "approved",
      label: "Approved",
      value: formatCurrencyValue(totals.approved),
    },
  ];
}

/**
 * Mobile columns to show on smaller screens
 */
export const directCostsMobileColumns = [
  "invoice_number",
  "cost_type",
  "total_amount",
  "status",
];
