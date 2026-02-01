import { ColumnDef } from "@tanstack/react-table";
import { Commitment } from "@/types/financial";
import { StatusBadge } from "@/components/misc/status-badge";
import type { SummaryCard } from "@/components/ui/summary-card-grid";
import type { TabConfig, FilterOption } from "@/components/templates";
import { formatCurrencyValue } from "@/components/ui/summary-card-grid";

/**
 * Commitments Table Configuration
 *
 * This file contains all configuration for the commitments table page,
 * including columns, filters, summary cards, and tabs.
 */

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
 * Column definitions for the commitments table
 */
export function getCommitmentsColumns(
  onView?: (commitment: Commitment) => void,
): ColumnDef<Commitment>[] {
  return [
    {
      accessorKey: "number",
      header: "Number",
      cell: ({ row }) => (
        <div
          className="font-medium text-link hover:text-link-hover cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onView?.(row.original);
          }}
        >
          {row.getValue("number")}
        </div>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
    },
    {
      accessorKey: "contract_company_name",
      header: "Company",
      cell: ({ row }) => {
        const company = row.original.contract_company;
        return (
          company?.name ||
          (row.getValue("contract_company_name") as string) ||
          "—"
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge status={row.getValue("status")} type="commitment" />
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string | undefined;
        return (
          <span className="capitalize">{type?.replace(/_/g, " ") || "—"}</span>
        );
      },
    },
    {
      accessorKey: "original_amount",
      header: "Original Amount",
      cell: ({ row }) => formatCurrency(row.getValue("original_amount")),
    },
    {
      accessorKey: "revised_contract_amount",
      header: "Revised Amount",
      cell: ({ row }) =>
        formatCurrency(row.getValue("revised_contract_amount")),
    },
    {
      accessorKey: "balance_to_finish",
      header: "Balance to Finish",
      cell: ({ row }) => formatCurrency(row.getValue("balance_to_finish")),
    },
  ];
}

/**
 * Filter options for the commitments table
 */
export const commitmentsFilterOptions: FilterOption[] = [
  {
    column: "status",
    title: "Status",
    options: [
      { label: "Draft", value: "draft" },
      { label: "Sent", value: "sent" },
      { label: "Pending", value: "pending" },
      { label: "Approved", value: "approved" },
      { label: "Executed", value: "executed" },
      { label: "Closed", value: "closed" },
      { label: "Void", value: "void" },
    ],
  },
  {
    column: "type",
    title: "Type",
    options: [
      { label: "Subcontract", value: "subcontract" },
      { label: "Purchase Order", value: "purchase_order" },
    ],
  },
];

/**
 * Generate summary cards from commitments data
 */
export function getCommitmentsSummaryCards(
  commitments: Commitment[],
): SummaryCard[] {
  const totals = commitments.reduce(
    (acc, commitment) => ({
      originalAmount: acc.originalAmount + (commitment.original_amount || 0),
      changeOrdersTotal:
        acc.changeOrdersTotal + (commitment.approved_change_orders || 0),
      revisedAmount:
        acc.revisedAmount + (commitment.revised_contract_amount || 0),
      balanceToFinish:
        acc.balanceToFinish + (commitment.balance_to_finish || 0),
    }),
    {
      originalAmount: 0,
      changeOrdersTotal: 0,
      revisedAmount: 0,
      balanceToFinish: 0,
    },
  );

  return [
    {
      id: "original",
      label: "Original Contract Amount",
      value: formatCurrencyValue(totals.originalAmount),
    },
    {
      id: "change-orders",
      label: "Approved Change Orders",
      value: formatCurrencyValue(totals.changeOrdersTotal),
    },
    {
      id: "revised",
      label: "Revised Contract Amount",
      value: formatCurrencyValue(totals.revisedAmount),
    },
    {
      id: "balance",
      label: "Balance to Finish",
      value: formatCurrencyValue(totals.balanceToFinish),
    },
  ];
}

/**
 * Generate tabs configuration for commitments page
 */
export function getCommitmentsTabs(
  projectId: number,
  totalCount: number,
): TabConfig[] {
  return [
    {
      label: "All Commitments",
      href: `/${projectId}/commitments`,
      count: totalCount,
    },
    {
      label: "Subcontracts",
      href: `/${projectId}/commitments?type=subcontract`,
    },
    {
      label: "Purchase Orders",
      href: `/${projectId}/commitments?type=purchase_order`,
    },
  ];
}

/**
 * Mobile columns to show on smaller screens
 */
export const commitmentsMobileColumns = [
  "number",
  "title",
  "status",
  "revised_contract_amount",
];

/**
 * Status counts type for the status overview
 */
export interface CommitmentStatusCounts {
  draft: number;
  sent: number;
  pending: number;
  approved: number;
  executed: number;
  closed: number;
  void: number;
}

/**
 * Calculate status counts from commitments
 */
export function getCommitmentsStatusCounts(
  commitments: Commitment[],
): CommitmentStatusCounts {
  const counts: CommitmentStatusCounts = {
    draft: 0,
    sent: 0,
    pending: 0,
    approved: 0,
    executed: 0,
    closed: 0,
    void: 0,
  };

  commitments.forEach((commitment) => {
    const status = commitment.status as keyof CommitmentStatusCounts;
    if (status in counts) {
      counts[status]++;
    }
  });

  return counts;
}
