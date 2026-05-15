"use client";

import { useMemo, useState } from "react";
import { DollarSign, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ds";
import { DataTable, type DataTableFooterCell } from "@/components/tables/DataTable";
import { apiFetch } from "@/lib/api-client";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { formatDate } from "@/lib/format";
import type {
  Payment,
  Contract,
} from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";

interface PrimeContractPaymentsTabProps {
  projectId: string;
  contractId: string;
  payments: Payment[];
  paymentsReceivedLoading: boolean;
  setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  setContract: React.Dispatch<React.SetStateAction<Contract | null>>;
  formatCurrency: (value: number | null | undefined) => string;
}

function buildAcumaticaPaymentHref(docType: string | null | undefined, refNbr: string): string {
  return `https://alleatogroup.acumatica.com/Main?ScreenId=AR302000&DocType=${encodeURIComponent(docType ?? "Payment")}&RefNbr=${encodeURIComponent(refNbr)}`;
}

export function PrimeContractPaymentsTab({
  projectId,
  contractId,
  payments,
  paymentsReceivedLoading,
  setPayments,
  setContract,
  formatCurrency,
}: PrimeContractPaymentsTabProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const totalPaymentsReceived = useMemo(
    () => payments.reduce((sum, payment) => sum + payment.amount, 0),
    [payments],
  );

  const handleSyncERP = async () => {
    try {
      setIsSyncing(true);
      const result = await apiFetch<{ payments: Payment[]; contract: Contract }>(
        `/api/projects/${projectId}/contracts/${contractId}/sync-payments`,
        { method: "POST" },
      );
      setPayments(result.payments);
      setContract(result.contract);
      toast.success("Payments synced from Acumatica");
    } catch (error) {
      console.error("Failed to sync payments from ERP:", error);
      toast.error("Failed to sync payments from Acumatica. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const syncButton = (
    <Button size="sm" onClick={handleSyncERP} disabled={isSyncing}>
      <RefreshCw className={isSyncing ? "animate-spin" : undefined} />
      {isSyncing ? "Syncing..." : "Sync with ERP"}
    </Button>
  );

  const columns: ColumnDef<Payment>[] = useMemo(
    () => [
      {
        accessorKey: "payment_number",
        header: "Payment #",
        cell: ({ row }) => (
          <div className="font-medium">{row.original.payment_number || "--"}</div>
        ),
      },
      {
        accessorKey: "payment_date",
        header: "Date",
        cell: ({ row }) => <div>{formatDate(row.original.payment_date)}</div>,
      },
      {
        accessorKey: "amount",
        header: () => <div className="text-right">Amount</div>,
        cell: ({ row }) => (
          <div className="text-right">{formatCurrency(row.original.amount)}</div>
        ),
      },
      {
        accessorKey: "method",
        header: "Method",
        cell: ({ row }) => (
          <div className="capitalize text-muted-foreground">{row.original.method || "--"}</div>
        ),
      },
      {
        accessorKey: "reference_number",
        header: "Reference",
        cell: ({ row }) => (
          <div className="text-muted-foreground">{row.original.reference_number || "--"}</div>
        ),
      },
      {
        id: "linked_invoice",
        header: "Linked Invoice",
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {row.original.payment_application
              ? `App #${row.original.payment_application.application_number}`
              : "--"}
          </div>
        ),
      },
      {
        id: "acumatica_ref",
        header: "Acumatica",
        cell: ({ row }) => {
          const refNbr = row.original.acumatica_ref_nbr;
          if (!refNbr) return <span className="text-sm text-muted-foreground">--</span>;
          return (
            <a
              href={buildAcumaticaPaymentHref(row.original.acumatica_doc_type, refNbr)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
            >
              {refNbr}
              <ExternalLink className="h-3 w-3" />
            </a>
          );
        },
      },
    ],
    [formatCurrency],
  );

  const footerRow = useMemo<DataTableFooterCell[]>(
    () => [
      { value: "Total Received", colSpan: 2, align: "left" },
      { value: formatCurrency(totalPaymentsReceived) },
      { value: "", colSpan: 4 },
    ],
    [formatCurrency, totalPaymentsReceived],
  );

  return (
    <div>
      <div className="bg-background">
        <div className="flex items-center justify-between">
          <SectionRuleHeading label="Payments Received" className="flex-1" />
          {payments.length > 0 && syncButton}
        </div>
        {payments.length > 0 ? (
          <p className="text-sm text-muted-foreground -mt-3 mb-4">
            {payments.length} payment{payments.length === 1 ? "" : "s"} •{" "}
            Total received: {formatCurrency(totalPaymentsReceived)}
          </p>
        ) : null}

        {paymentsReceivedLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Loading payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            icon={<DollarSign />}
            title="No payments synced yet"
            description="Payments are synced automatically from Acumatica. Use the button below to pull the latest data."
            action={syncButton}
          />
        ) : (
          <DataTable
            columns={columns}
            data={payments}
            showToolbar={false}
            showPagination={payments.length > 25}
            footerRow={footerRow}
          />
        )}
      </div>
    </div>
  );
}
