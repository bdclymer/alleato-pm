import { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/components/misc/status-badge";
import type { SummaryCard } from "@/components/ui/summary-card-grid";
import type { TabConfig, FilterOption } from "@/components/templates";
import { formatCurrencyValue } from "@/components/ui/summary-card-grid";

/**
 * Invoicing Table Configuration
 *
 * This file contains all configuration for the invoicing table pages,
 * including columns, filters, summary cards, and tabs.
 */

/**
 * Owner Invoice interface (from API response)
 */
export interface OwnerInvoice {
  id: number;
  contract_id: number;
  invoice_number: string | null;
  period_start: string | null;
  period_end: string | null;
  status: "draft" | "submitted" | "approved" | "paid" | "void";
  billing_period_id: number | null;
  created_at: string;
  updated_at: string;
  total_amount?: number;
  owner_invoice_line_items?: OwnerInvoiceLineItem[];
}

/**
 * Owner Invoice Line Item interface
 */
export interface OwnerInvoiceLineItem {
  id: number;
  invoice_id: number;
  description: string | null;
  category: string | null;
  approved_amount: number;
  created_at: string;
}

/**
 * Subcontractor Invoice interface (placeholder for future implementation)
 */
export interface SubcontractorInvoice {
  id: number;
  commitment_id: number;
  invoice_number: string | null;
  period_start: string | null;
  period_end: string | null;
  status: "draft" | "submitted" | "approved" | "paid" | "void";
  billing_period_id: number | null;
  created_at: string;
  updated_at: string;
  total_amount?: number;
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
 * Format date for display
 */
export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Column definitions for owner invoices table
 */
export function getOwnerInvoicesColumns(
  onView?: (invoice: OwnerInvoice) => void,
): ColumnDef<OwnerInvoice>[] {
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
          {row.getValue("invoice_number") || `INV-${row.original.id}`}
        </div>
      ),
    },
    {
      accessorKey: "contract_id",
      header: "Contract",
      cell: ({ row }) => `Contract #${row.getValue("contract_id")}`,
    },
    {
      accessorKey: "period_start",
      header: "Billing Period",
      cell: ({ row }) => {
        const start = row.original.period_start;
        const end = row.original.period_end;
        if (!start && !end) return "—";
        return `${formatDate(start)} - ${formatDate(end)}`;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge status={row.getValue("status")} type="invoice" />
      ),
    },
    {
      accessorKey: "total_amount",
      header: "Amount",
      cell: ({ row }) => formatCurrency(row.getValue("total_amount")),
    },
    {
      accessorKey: "created_at",
      header: "Due Date",
      cell: ({ row }) => {
        // Calculate due date as 30 days from created_at (placeholder logic)
        const createdDate = new Date(row.getValue("created_at"));
        const dueDate = new Date(createdDate);
        dueDate.setDate(dueDate.getDate() + 30);
        return formatDate(dueDate.toISOString());
      },
    },
  ];
}

/**
 * Column definitions for subcontractor invoices table
 */
export function getSubcontractorInvoicesColumns(
  onView?: (invoice: SubcontractorInvoice) => void,
): ColumnDef<SubcontractorInvoice>[] {
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
          {row.getValue("invoice_number") || `INV-${row.original.id}`}
        </div>
      ),
    },
    {
      accessorKey: "commitment_id",
      header: "Commitment",
      cell: ({ row }) => `Commitment #${row.getValue("commitment_id")}`,
    },
    {
      accessorKey: "period_start",
      header: "Billing Period",
      cell: ({ row }) => {
        const start = row.original.period_start;
        const end = row.original.period_end;
        if (!start && !end) return "—";
        return `${formatDate(start)} - ${formatDate(end)}`;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge status={row.getValue("status")} type="invoice" />
      ),
    },
    {
      accessorKey: "total_amount",
      header: "Amount",
      cell: ({ row }) => formatCurrency(row.getValue("total_amount")),
    },
    {
      accessorKey: "created_at",
      header: "Due Date",
      cell: ({ row }) => {
        // Calculate due date as 30 days from created_at (placeholder logic)
        const createdDate = new Date(row.getValue("created_at"));
        const dueDate = new Date(createdDate);
        dueDate.setDate(dueDate.getDate() + 30);
        return formatDate(dueDate.toISOString());
      },
    },
  ];
}

/**
 * Filter options for invoices
 */
export const invoiceStatusOptions: FilterOption[] = [
  {
    column: "status",
    title: "Status",
    options: [
      { label: "Draft", value: "draft" },
      { label: "Submitted", value: "submitted" },
      { label: "Approved", value: "approved" },
      { label: "Paid", value: "paid" },
      { label: "Void", value: "void" },
    ],
  },
];

/**
 * Generate summary cards from owner invoices data
 */
export function getOwnerInvoicesSummaryCards(
  invoices: OwnerInvoice[],
): SummaryCard[] {
  const totals = invoices.reduce(
    (acc, invoice) => {
      const amount = invoice.total_amount || 0;
      acc.totalBilled += amount;

      if (invoice.status === "paid") {
        acc.totalPaid += amount;
      } else if (invoice.status === "approved" || invoice.status === "submitted") {
        acc.outstanding += amount;
      }

      // Check if paid this month
      if (invoice.status === "paid" && invoice.updated_at) {
        const updatedDate = new Date(invoice.updated_at);
        const currentDate = new Date();
        const isThisMonth =
          updatedDate.getMonth() === currentDate.getMonth() &&
          updatedDate.getFullYear() === currentDate.getFullYear();
        if (isThisMonth) {
          acc.paidThisMonth += amount;
        }
      }

      return acc;
    },
    {
      totalBilled: 0,
      outstanding: 0,
      totalPaid: 0,
      paidThisMonth: 0,
    },
  );

  return [
    {
      id: "total-billed",
      label: "Total Billed",
      value: formatCurrencyValue(totals.totalBilled),
    },
    {
      id: "outstanding",
      label: "Outstanding",
      value: formatCurrencyValue(totals.outstanding),
    },
    {
      id: "paid-this-month",
      label: "Paid This Month",
      value: formatCurrencyValue(totals.paidThisMonth),
    },
    {
      id: "total-paid",
      label: "Total Paid",
      value: formatCurrencyValue(totals.totalPaid),
    },
  ];
}

/**
 * Generate tabs configuration for invoicing page
 */
export function getInvoicingTabs(projectId: number): TabConfig[] {
  return [
    {
      label: "Owner Invoices",
      href: `/${projectId}/invoicing`,
    },
    {
      label: "Subcontractor Invoices",
      href: `/${projectId}/invoicing?tab=subcontractor`,
    },
    {
      label: "Billing Periods",
      href: `/${projectId}/invoicing?tab=billing-periods`,
    },
  ];
}

/**
 * Mobile columns to show on smaller screens
 */
export const invoicingMobileColumns = [
  "invoice_number",
  "status",
  "total_amount",
  "created_at",
];
