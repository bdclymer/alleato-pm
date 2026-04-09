"use client";

import Link from "next/link";
import { memo, useEffect, useMemo, useState } from "react";
import { Paperclip } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { Text } from "@/components/ds/text";
import { InvoiceStatusBadge } from "@/components/invoicing/InvoiceStatusBadge";
import { formatCurrency } from "@/config/tables";

interface CommitmentInvoiceRow {
  id: number;
  invoice_number: string | null;
  period_start: string | null;
  period_end: string | null;
  billing_date: string | null;
  status: string;
  total_completed: number;
  total_retainage: number;
  net_amount: number;
  total_contract_amount: number;
  original_contract_sum: number;
  net_change_by_cos: number;
  percent_complete: number;
  attachment_count?: number;
}

interface InvoicesTabProps {
  commitmentId: string;
  projectId: string | number;
  commitmentType: "subcontract" | "purchase_order";
}

interface EnrichedInvoice extends CommitmentInvoiceRow {
  revised_contract_sum: number;
  total_earned_less_retainage: number;
  balance_to_finish: number;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatInvoiceDates(start: string | null, end: string | null): string {
  if (!start && !end) return "—";
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  return formatDate(start ?? end);
}

export const InvoicesTab = memo(function InvoicesTab({
  commitmentId,
  projectId,
  commitmentType,
}: InvoicesTabProps) {
  const [invoices, setInvoices] = useState<EnrichedInvoice[]>([]);
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
        if (!response.ok) throw new Error("Failed to load invoices");
        const payload = (await response.json()) as { data?: CommitmentInvoiceRow[] };
        const rows = payload.data ?? [];

        const enriched: EnrichedInvoice[] = rows.map((row) => {
          const revised = row.total_contract_amount;
          const totalEarnedLessRetainage = row.total_completed - row.total_retainage;
          return {
            ...row,
            revised_contract_sum: revised,
            total_earned_less_retainage: totalEarnedLessRetainage,
            balance_to_finish: Math.max(revised - totalEarnedLessRetainage, 0),
          };
        });

        setInvoices(enriched);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load invoices");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [commitmentId, commitmentType, projectId]);

  const columns: ColumnDef<EnrichedInvoice>[] = useMemo(
    () => [
      {
        accessorKey: "invoice_number",
        header: "#",
        cell: ({ row }) => (
          <Link
            href={`/${projectId}/invoicing/subcontractor/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.invoice_number || `INV-${row.original.id}`}
          </Link>
        ),
        size: 120,
      },
      {
        id: "invoice_dates",
        header: "Invoice Dates",
        cell: ({ row }) => (
          <Text size="sm" className="whitespace-nowrap">
            {formatInvoiceDates(row.original.period_start, row.original.period_end)}
          </Text>
        ),
      },
      {
        accessorKey: "billing_date",
        header: "Billing Date",
        cell: ({ row }) => (
          <Text size="sm" className="whitespace-nowrap">
            {formatDate(row.original.billing_date)}
          </Text>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "original_contract_sum",
        header: () => <div className="text-right">Original Contract Sum</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatCurrency(row.original.original_contract_sum)}
          </div>
        ),
      },
      {
        accessorKey: "net_change_by_cos",
        header: () => <div className="text-right">Net Change by COs</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatCurrency(row.original.net_change_by_cos)}
          </div>
        ),
      },
      {
        accessorKey: "revised_contract_sum",
        header: () => <div className="text-right">Revised Contract Sum</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums font-medium">
            {formatCurrency(row.original.revised_contract_sum)}
          </div>
        ),
      },
      {
        accessorKey: "total_completed",
        header: () => <div className="text-right">Total Completed & Stored</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatCurrency(row.original.total_completed)}
          </div>
        ),
      },
      {
        accessorKey: "total_retainage",
        header: () => <div className="text-right">Total Retainage</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatCurrency(row.original.total_retainage)}
          </div>
        ),
      },
      {
        accessorKey: "total_earned_less_retainage",
        header: () => <div className="text-right">Total Earned Less Retainage</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums font-medium">
            {formatCurrency(row.original.total_earned_less_retainage)}
          </div>
        ),
      },
      {
        accessorKey: "net_amount",
        header: () => <div className="text-right">Payment Due</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums font-medium">
            {formatCurrency(row.original.net_amount)}
          </div>
        ),
      },
      {
        accessorKey: "balance_to_finish",
        header: () => <div className="text-right">Balance to Finish</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatCurrency(row.original.balance_to_finish)}
          </div>
        ),
      },
      {
        accessorKey: "percent_complete",
        header: () => <div className="text-right">% Complete</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {`${Math.round(row.original.percent_complete || 0)}%`}
          </div>
        ),
      },
      {
        id: "attachments",
        header: () => <div className="text-center">Attachments</div>,
        cell: ({ row }) => (
          <div className="flex items-center justify-center text-muted-foreground">
            <Paperclip className="h-4 w-4" />
            {row.original.attachment_count ? (
              <span className="ml-1 text-xs">{row.original.attachment_count}</span>
            ) : null}
          </div>
        ),
        size: 100,
      },
    ],
    [projectId],
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

  return (
    <DataTable
      columns={columns}
      data={invoices}
      showToolbar={false}
      showPagination={invoices.length > 25}
    />
  );
});

InvoicesTab.displayName = "InvoicesTab";
