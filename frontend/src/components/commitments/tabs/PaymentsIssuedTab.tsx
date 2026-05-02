"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { Receipt } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable, type DataTableFooterCell } from "@/components/tables/DataTable";
import { EmptyState } from "@/components/ds/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ds/text";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";

interface CommitmentPaymentRow {
  id: number;
  subcontractor_invoice_id: number | null;
  payment_number: string | null;
  payment_ref: string | null;
  payment_method: string | null;
  payment_date: string | null;
  vendor_name: string | null;
  amount: number;
  status: string | null;
  acumatica_sync_at: string | null;
  subcontractor_invoice?: { id: number; invoice_number: string | null } | null;
}

interface PaymentsIssuedTabProps {
  commitmentId: string;
  projectId: string | number;
  commitmentType: "subcontract" | "purchase_order";
}

function formatMethod(method: string | null): string {
  if (!method) return "--";
  return method.replace(/_/g, " ");
}

export const PaymentsIssuedTab = memo(function PaymentsIssuedTab({
  commitmentId,
  projectId,
}: PaymentsIssuedTabProps) {
  const [payments, setPayments] = useState<CommitmentPaymentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const payload = await apiFetch<{
          data?: CommitmentPaymentRow[];
        }>(
          `/api/projects/${projectId}/commitments/${commitmentId}/payments`,
          { signal: controller.signal },
        );
        setPayments(payload.data ?? []);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load payment data");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [commitmentId, projectId]);

  const totalPaid = useMemo(
    () => payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0),
    [payments],
  );

  const columns: ColumnDef<CommitmentPaymentRow>[] = useMemo(
    () => [
      {
        accessorKey: "payment_number",
        header: "Payment #",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {row.original.payment_number ?? "--"}
          </span>
        ),
      },
      {
        id: "invoice",
        header: "Invoice",
        cell: ({ row }) =>
          row.original.subcontractor_invoice?.invoice_number ??
          (row.original.subcontractor_invoice_id
            ? `INV-${row.original.subcontractor_invoice_id}`
            : "--"),
      },
      {
        accessorKey: "payment_date",
        header: "Payment Date",
        cell: ({ row }) => (
          <Text size="sm" className="whitespace-nowrap">
            {formatDate(row.original.payment_date)}
          </Text>
        ),
      },
      {
        accessorKey: "payment_method",
        header: "Method",
        cell: ({ row }) => (
          <span className="capitalize text-muted-foreground">
            {formatMethod(row.original.payment_method)}
          </span>
        ),
      },
      {
        accessorKey: "payment_ref",
        header: "Reference",
        cell: ({ row }) => row.original.payment_ref ?? "--",
      },
      {
        accessorKey: "amount",
        header: () => <div className="text-right">Amount</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums font-medium">
            {formatCurrency(row.original.amount)}
          </div>
        ),
      },
    ],
    [],
  );

  const footerRow = useMemo<DataTableFooterCell[]>(
    () => [
      { value: "Total Issued", colSpan: 5, align: "right" },
      { value: formatCurrency(totalPaid) },
    ],
    [totalPaid],
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return <Text tone="destructive">{error}</Text>;
  }

  if (payments.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="h-8 w-8" />}
        title="No Acumatica payments linked"
        description="Payments issued in Acumatica will appear here after AP check reconciliation is available."
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={payments}
      showToolbar={false}
      showPagination={payments.length > 25}
      rowHover={false}
      footerRow={footerRow}
    />
  );
});

PaymentsIssuedTab.displayName = "PaymentsIssuedTab";
