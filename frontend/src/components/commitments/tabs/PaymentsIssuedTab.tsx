"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { Receipt } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { EmptyState } from "@/components/ds/empty-state";
import { Text } from "@/components/ds/text";
import { InvoiceStatusBadge } from "@/components/invoicing/InvoiceStatusBadge";
import { formatCurrency } from "@/config/tables";

interface PaymentRow {
  id: number;
  invoice_number: string | null;
  billing_date: string | null;
  period_start: string | null;
  period_end: string | null;
  status: string;
  net_amount: number;
  total_retainage: number;
  total_completed: number;
  original_contract_sum: number;
}

interface PaymentsIssuedTabProps {
  commitmentId: string;
  projectId: string | number;
  commitmentType: "subcontract" | "purchase_order";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const PAID_STATUSES = new Set(["paid", "approved", "approved_as_noted"]);

export const PaymentsIssuedTab = memo(function PaymentsIssuedTab({
  commitmentId,
  projectId,
  commitmentType,
}: PaymentsIssuedTabProps) {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const filterKey =
          commitmentType === "subcontract" ? "subcontract_id" : "purchase_order_id";
        const url = `/api/projects/${projectId}/invoicing/subcontractor/invoices?${filterKey}=${encodeURIComponent(commitmentId)}`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("Failed to load payment data");
        const payload = (await response.json()) as { data?: PaymentRow[] };
        const rows = (payload.data ?? []).filter((row) =>
          PAID_STATUSES.has(row.status?.toLowerCase() ?? ""),
        );
        setPayments(rows);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load payment data");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [commitmentId, commitmentType, projectId]);

  const totals = useMemo(() => {
    const sum = (key: keyof PaymentRow) =>
      payments.reduce((acc, p) => acc + (Number(p[key]) || 0), 0);
    return {
      net_amount: sum("net_amount"),
      total_retainage: sum("total_retainage"),
      total_completed: sum("total_completed"),
    };
  }, [payments]);

  const columns: ColumnDef<PaymentRow>[] = useMemo(
    () => [
      {
        accessorKey: "invoice_number",
        header: () => <span className="text-muted-foreground">Invoice #</span>,
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {row.original.invoice_number ?? `INV-${row.original.id}`}
          </span>
        ),
      },
      {
        accessorKey: "billing_date",
        header: () => <span className="text-muted-foreground">Payment Date</span>,
        cell: ({ row }) => (
          <Text size="sm" className="whitespace-nowrap">
            {formatDate(row.original.billing_date)}
          </Text>
        ),
      },
      {
        accessorKey: "status",
        header: () => <span className="text-muted-foreground">Status</span>,
        cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "total_completed",
        header: () => <div className="text-right text-muted-foreground">Total Completed</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatCurrency(row.original.total_completed)}
          </div>
        ),
      },
      {
        accessorKey: "total_retainage",
        header: () => <div className="text-right text-muted-foreground">Retainage</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatCurrency(row.original.total_retainage)}
          </div>
        ),
      },
      {
        accessorKey: "net_amount",
        header: () => <div className="text-right text-muted-foreground">Payment Amount</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums font-medium">
            {formatCurrency(row.original.net_amount)}
          </div>
        ),
      },
    ],
    [],
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
        title="No payments recorded"
        description="Approved and paid invoices against this commitment will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <DataTable
        columns={columns}
        data={payments}
        showToolbar={false}
        showPagination={payments.length > 25}
        rowHover={false}
        emptyMessage={null}
        footerRow={[
          { value: "Totals", colSpan: 3, align: "right" },
          { value: formatCurrency(totals.total_completed) },
          { value: formatCurrency(totals.total_retainage) },
          { value: formatCurrency(totals.net_amount) },
        ]}
      />
    </div>
  );
});

PaymentsIssuedTab.displayName = "PaymentsIssuedTab";
