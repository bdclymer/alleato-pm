"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, StatusBadge } from "@/components/ds";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { DataTable } from "@/components/tables/DataTable";
import type {
  Contract,
  OwnerInvoiceSummary,
  PaymentApplication,
  PrimeContractCO,
} from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";
import { formatDate, formatPercent } from "@/lib/format";

interface PrimeContractInvoicesTabProps {
  projectId: string;
  contractId: string;
  contract: Contract;
  changeOrders: PrimeContractCO[];
  paymentApplications: PaymentApplication[];
  ownerInvoices: OwnerInvoiceSummary[];
  paymentsLoading: boolean;
  ownerInvoicesLoading: boolean;
  onDeleteInvoice: (applicationId: string) => Promise<void>;
  formatCurrency: (value: number | null | undefined) => string;
}

type InvoiceRow =
  | { source: "payment_application"; paymentApplication: PaymentApplication }
  | { source: "owner_invoice"; ownerInvoice: OwnerInvoiceSummary };

interface InvoiceMetrics {
  invoiceLabel: string;
  periodStart: string | null;
  periodEnd: string | null;
  billingDate: string | null;
  status: string;
  originalContract: number;
  netChangeByCOs: number;
  revisedContract: number;
  totalCompletedAndStoredToDate: number;
  totalRetainage: number;
  totalEarnedLessRetainage: number;
  paymentDue: number;
  balance: number;
  percentComplete: number | null;
}

function getOwnerInvoiceCompletedToDate(invoice: OwnerInvoiceSummary): number {
  const candidates = [
    invoice.gross_amount,
    invoice.total_amount,
    invoice.net_amount,
    invoice.paid_amount,
  ];
  return candidates.find((value) => value !== null && value !== undefined && Number(value) > 0) ?? 0;
}

function getInvoiceCutoffDate(row: InvoiceRow): string | null {
  if (row.source === "payment_application") {
    return (
      row.paymentApplication.period_to ??
      row.paymentApplication.period_from ??
      row.paymentApplication.billing_date ??
      null
    );
  }

  return (
    row.ownerInvoice.period_end ??
    row.ownerInvoice.period_start ??
    row.ownerInvoice.billing_date ??
    null
  );
}

function getChangeOrderEffectiveDate(changeOrder: PrimeContractCO): string | null {
  return changeOrder.approved_date ?? changeOrder.due_date ?? changeOrder.requested_date ?? null;
}

function getNetChangeByCOs(
  row: InvoiceRow,
  changeOrders: PrimeContractCO[],
): number {
  if (row.source === "owner_invoice") {
    const previousChanges = row.ownerInvoice.previous_changes ?? 0;
    const currentChanges = row.ownerInvoice.current_changes ?? 0;
    if (previousChanges !== 0 || currentChanges !== 0) {
      return previousChanges + currentChanges;
    }
  }

  const cutoffDate = getInvoiceCutoffDate(row);
  const approvedChangeOrders = changeOrders.filter((changeOrder) =>
    changeOrder.status.toLowerCase().startsWith("approved"),
  );

  if (!cutoffDate) {
    return approvedChangeOrders.reduce(
      (sum, changeOrder) => sum + (changeOrder.amount || 0),
      0,
    );
  }

  return approvedChangeOrders.reduce((sum, changeOrder) => {
    const effectiveDate = getChangeOrderEffectiveDate(changeOrder);
    if (!effectiveDate || effectiveDate > cutoffDate) return sum;
    return sum + (changeOrder.amount || 0);
  }, 0);
}

function getInvoiceMetrics(
  row: InvoiceRow,
  contract: Contract,
  changeOrders: PrimeContractCO[],
): InvoiceMetrics {
  const originalContract = contract.original_contract_value ?? 0;
  const netChangeByCOs = getNetChangeByCOs(row, changeOrders);
  const revisedContract = originalContract + netChangeByCOs;

  const totalCompletedAndStoredToDate =
    row.source === "payment_application"
      ? row.paymentApplication.amount ?? 0
      : getOwnerInvoiceCompletedToDate(row.ownerInvoice);

  const totalRetainage =
    row.source === "payment_application"
      ? row.paymentApplication.retention_amount ?? 0
      : row.ownerInvoice.retention_amount ?? 0;

  const totalEarnedLessRetainage = totalCompletedAndStoredToDate - totalRetainage;

  const paymentDue =
    row.source === "payment_application"
      ? row.paymentApplication.net_amount ??
        totalEarnedLessRetainage
      : row.ownerInvoice.net_amount ??
        row.ownerInvoice.total_amount ??
        totalEarnedLessRetainage;

  const percentComplete =
    row.source === "owner_invoice"
      ? row.ownerInvoice.percent_complete ??
        (revisedContract > 0
          ? (totalCompletedAndStoredToDate / revisedContract) * 100
          : null)
      : revisedContract > 0
        ? (totalCompletedAndStoredToDate / revisedContract) * 100
        : null;

  return {
    invoiceLabel:
      row.source === "payment_application"
        ? row.paymentApplication.application_number
        : row.ownerInvoice.invoice_number ?? `INV-${row.ownerInvoice.id}`,
    periodStart:
      row.source === "payment_application"
        ? row.paymentApplication.period_from
        : row.ownerInvoice.period_start,
    periodEnd:
      row.source === "payment_application"
        ? row.paymentApplication.period_to
        : row.ownerInvoice.period_end,
    billingDate:
      row.source === "payment_application"
        ? row.paymentApplication.billing_date
        : row.ownerInvoice.billing_date,
    status:
      row.source === "payment_application"
        ? row.paymentApplication.status
        : row.ownerInvoice.status,
    originalContract,
    netChangeByCOs,
    revisedContract,
    totalCompletedAndStoredToDate,
    totalRetainage,
    totalEarnedLessRetainage,
    paymentDue,
    balance: revisedContract - totalEarnedLessRetainage,
    percentComplete,
  };
}

export function PrimeContractInvoicesTab({
  projectId,
  contractId,
  contract,
  changeOrders,
  paymentApplications,
  ownerInvoices,
  paymentsLoading,
  ownerInvoicesLoading,
  onDeleteInvoice,
  formatCurrency,
}: PrimeContractInvoicesTabProps) {
  const router = useRouter();
  const invoiceRows = useMemo<InvoiceRow[]>(
    () => [
      ...paymentApplications.map((paymentApplication) => ({
        source: "payment_application" as const,
        paymentApplication,
      })),
      ...ownerInvoices
        .filter((invoice) => !invoice.payment_application_id)
        .map((ownerInvoice) => ({
          source: "owner_invoice" as const,
          ownerInvoice,
        })),
    ],
    [ownerInvoices, paymentApplications],
  );
  const columns: ColumnDef<InvoiceRow>[] = useMemo(
    () => [
      {
        header: "Invoice #",
        cell: ({ row }) => {
          const metrics = getInvoiceMetrics(row.original, contract, changeOrders);
          return <div className="font-medium text-primary">{metrics.invoiceLabel}</div>;
        },
      },
      {
        id: "invoice_dates",
        header: "Invoice Dates",
        cell: ({ row }) => {
          const metrics = getInvoiceMetrics(row.original, contract, changeOrders);
          return (
            <div className="text-sm text-muted-foreground">
              {metrics.periodStart && metrics.periodEnd
                ? `${formatDate(metrics.periodStart)} - ${formatDate(metrics.periodEnd)}`
                : metrics.periodStart
                  ? `From ${formatDate(metrics.periodStart)}`
                  : "--"}
            </div>
          );
        },
      },
      {
        id: "billing_date",
        header: "Billing Date",
        cell: ({ row }) => {
          const metrics = getInvoiceMetrics(row.original, contract, changeOrders);
          return (
            <div className="text-sm text-muted-foreground">
              {metrics.billingDate ? formatDate(metrics.billingDate) : "--"}
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const metrics = getInvoiceMetrics(row.original, contract, changeOrders);
          return <StatusBadge status={metrics.status.replace(/_/g, " ")} />;
        },
      },
      {
        id: "original_contract",
        header: () => <div className="text-right">Original Contract</div>,
        cell: ({ row }) => {
          const metrics = getInvoiceMetrics(row.original, contract, changeOrders);
          return <div className="text-right">{formatCurrency(metrics.originalContract)}</div>;
        },
      },
      {
        id: "net_change_by_cos",
        header: () => <div className="text-right">Net Change by COs</div>,
        cell: ({ row }) => {
          const metrics = getInvoiceMetrics(row.original, contract, changeOrders);
          return <div className="text-right">{formatCurrency(metrics.netChangeByCOs)}</div>;
        },
      },
      {
        id: "revised_contract",
        header: () => <div className="text-right">Revised Contract</div>,
        cell: ({ row }) => {
          const metrics = getInvoiceMetrics(row.original, contract, changeOrders);
          return <div className="text-right">{formatCurrency(metrics.revisedContract)}</div>;
        },
      },
      {
        id: "total_completed_and_stored",
        header: () => <div className="text-right">Total Completed and Stored to Date</div>,
        cell: ({ row }) => {
          const metrics = getInvoiceMetrics(row.original, contract, changeOrders);
          return (
            <div className="text-right">
              {formatCurrency(metrics.totalCompletedAndStoredToDate)}
            </div>
          );
        },
      },
      {
        id: "total_retainage",
        header: () => <div className="text-right">Total Retainage</div>,
        cell: ({ row }) => {
          return (
            <div className="text-right">
              {formatCurrency(getInvoiceMetrics(row.original, contract, changeOrders).totalRetainage)}
            </div>
          );
        },
      },
      {
        id: "total_earned_less_retainage",
        header: () => <div className="text-right">Total Earned Less Retainage</div>,
        cell: ({ row }) => {
          const metrics = getInvoiceMetrics(row.original, contract, changeOrders);
          return (
            <div className="text-right">
              {formatCurrency(metrics.totalEarnedLessRetainage)}
            </div>
          );
        },
      },
      {
        id: "payment_due",
        header: () => <div className="text-right">Payment Due</div>,
        cell: ({ row }) => {
          const metrics = getInvoiceMetrics(row.original, contract, changeOrders);
          return <div className="text-right">{formatCurrency(metrics.paymentDue)}</div>;
        },
      },
      {
        id: "balance",
        header: () => <div className="text-right">Balance</div>,
        cell: ({ row }) => {
          const metrics = getInvoiceMetrics(row.original, contract, changeOrders);
          return <div className="text-right">{formatCurrency(metrics.balance)}</div>;
        },
      },
      {
        id: "percent_complete",
        header: () => <div className="text-right">% Complete</div>,
        cell: ({ row }) => {
          const metrics = getInvoiceMetrics(row.original, contract, changeOrders);
          return (
            <div className="text-right">
              {metrics.percentComplete !== null
                ? formatPercent(metrics.percentComplete)
                : "--"}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const original = row.original;
          return (
            <div className="flex justify-end">
              {original.source === "payment_application" ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  void onDeleteInvoice(original.paymentApplication.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [changeOrders, contract, formatCurrency, onDeleteInvoice],
  );

  const createButton = (
    <Button
      size="sm"
      disabled={contract.status !== "approved"}
      onClick={() =>
        router.push(
          `/${projectId}/prime-contracts/${contractId}/invoices/new`,
        )
      }
    >
      <Plus />
      Create Invoice
    </Button>
  );

  const isLoading = paymentsLoading || ownerInvoicesLoading;

  return (
    <div>
      <div className="bg-background">
        <div className="flex items-center justify-between">
          <SectionRuleHeading
            label={`Invoices (${invoiceRows.length})`}
            className="flex-1"
          />
          {invoiceRows.length > 0 && createButton}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : invoiceRows.length === 0 ? (
          <EmptyState
            icon={<FileText />}
            title="No invoices yet"
            description="Create an invoice or sync AR invoices from Acumatica."
            action={createButton}
          />
        ) : (
          <DataTable
            columns={columns}
            data={invoiceRows}
            showToolbar={false}
            showPagination={invoiceRows.length > 25}
            onRowClick={(row) =>
              row.source === "payment_application"
                ? router.push(`/${projectId}/prime-contracts/${contractId}/invoices/${row.paymentApplication.id}`)
                : router.push(`/${projectId}/invoicing/${row.ownerInvoice.id}`)
            }
          />
        )}
      </div>
    </div>
  );
}
