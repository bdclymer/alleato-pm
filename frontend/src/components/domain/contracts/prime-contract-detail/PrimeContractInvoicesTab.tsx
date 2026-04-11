"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ds";
import { DataTable, type DataTableFooterCell } from "@/components/tables/DataTable";
import { CreateInvoiceDialog } from "@/components/domain/invoices/CreateInvoiceDialog";
import type { PaymentApplication, Contract } from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";

interface PrimeContractInvoicesTabProps {
  projectId: string;
  contractId: string;
  contract: Contract;
  paymentApplications: PaymentApplication[];
  paymentsLoading: boolean;
  billingPeriods: Array<{
    id: string;
    start_date: string;
    end_date: string;
    name: string | null;
    period_number: number;
  }>;
  onCreateInvoice: (data: {
    application_number: string;
    billing_period_id?: string;
    period_from?: string;
    period_to?: string;
    billing_date?: string;
    status: string;
    notes?: string;
    amount: number;
    retention_amount: number;
  }) => Promise<void>;
  onDeleteInvoice: (applicationId: string) => Promise<void>;
  formatCurrency: (value: number | null | undefined) => string;
}

export function PrimeContractInvoicesTab({
  projectId,
  contractId,
  contract,
  paymentApplications,
  paymentsLoading,
  billingPeriods,
  onCreateInvoice,
  onDeleteInvoice,
  formatCurrency,
}: PrimeContractInvoicesTabProps) {
  const router = useRouter();
  const [showAddInvoiceDialog, setShowAddInvoiceDialog] = useState(false);
  const totalAmount = useMemo(
    () => paymentApplications.reduce((sum, app) => sum + app.amount, 0),
    [paymentApplications],
  );
  const totalRetainage = useMemo(
    () => paymentApplications.reduce((sum, app) => sum + app.retention_amount, 0),
    [paymentApplications],
  );
  const totalPaymentDue = useMemo(
    () =>
      paymentApplications.reduce(
        (sum, app) => sum + (app.net_amount ?? app.amount - app.retention_amount),
        0,
      ),
    [paymentApplications],
  );

  const columns: ColumnDef<PaymentApplication>[] = useMemo(
    () => [
      {
        accessorKey: "application_number",
        header: "Invoice #",
        cell: ({ row }) => (
          <div className="font-medium text-primary">{row.original.application_number}</div>
        ),
      },
      {
        id: "billing_period",
        header: "Billing Period",
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {row.original.period_from && row.original.period_to
              ? `${new Date(row.original.period_from).toLocaleDateString()} – ${new Date(row.original.period_to).toLocaleDateString()}`
              : row.original.period_from
                ? `From ${new Date(row.original.period_from).toLocaleDateString()}`
                : "--"}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge status={row.original.status.replace(/_/g, " ")} />
        ),
      },
      {
        accessorKey: "amount",
        header: () => <div className="text-right">Amount</div>,
        cell: ({ row }) => (
          <div className="text-right">{formatCurrency(row.original.amount)}</div>
        ),
      },
      {
        accessorKey: "retention_amount",
        header: () => <div className="text-right">Retainage</div>,
        cell: ({ row }) => (
          <div className="text-right text-muted-foreground">
            {row.original.retention_amount > 0
              ? formatCurrency(row.original.retention_amount)
              : "--"}
          </div>
        ),
      },
      {
        id: "payment_due",
        header: () => <div className="text-right">Payment Due</div>,
        cell: ({ row }) => (
          <div className="text-right">
            {formatCurrency(
              row.original.net_amount ?? row.original.amount - row.original.retention_amount,
            )}
          </div>
        ),
      },
      {
        id: "percent_complete",
        header: () => <div className="text-right">% Complete</div>,
        cell: ({ row }) => (
          <div className="text-right">
            {contract.revised_contract_value > 0
              ? `${((row.original.amount / contract.revised_contract_value) * 100).toFixed(1)}%`
              : "--"}
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                void onDeleteInvoice(row.original.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [contract.revised_contract_value, formatCurrency, onDeleteInvoice],
  );

  const footerRow = useMemo<DataTableFooterCell[]>(
    () => [
      { value: "Total", colSpan: 3, align: "left" },
      { value: formatCurrency(totalAmount) },
      { value: formatCurrency(totalRetainage) },
      { value: formatCurrency(totalPaymentDue) },
      { value: "" },
      { value: "" },
    ],
    [formatCurrency, totalAmount, totalPaymentDue, totalRetainage],
  );

  return (
    <div>
      <div className="bg-background">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">
              Invoices (Payment Applications){" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({paymentApplications.length})
              </span>
            </h3>
            <p className="text-sm text-muted-foreground">
              Total invoiced:{" "}
              {formatCurrency(
                paymentApplications
                  .filter((a) => a.status === "approved")
                  .reduce((sum, a) => sum + a.amount, 0),
              )}
            </p>
          </div>
          <Button size="sm" onClick={() => setShowAddInvoiceDialog(true)}>
            <Plus />
            Create Invoice
          </Button>
        </div>

        {paymentsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : paymentApplications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No invoices yet</p>
            <p className="text-xs mt-2">
              Create an invoice to track payment applications
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={paymentApplications}
            showToolbar={false}
            showPagination={paymentApplications.length > 25}
            onRowClick={(app) =>
              router.push(`/${projectId}/prime-contracts/${contractId}/invoices/${app.id}`)
            }
            footerRow={footerRow}
          />
        )}
      </div>

      <CreateInvoiceDialog
        open={showAddInvoiceDialog}
        onOpenChange={setShowAddInvoiceDialog}
        onSubmit={onCreateInvoice}
        nextInvoiceNumber={paymentApplications.length + 1}
        billingPeriods={billingPeriods}
      />
    </div>
  );
}
