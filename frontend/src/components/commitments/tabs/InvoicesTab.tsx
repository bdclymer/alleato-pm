"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useEffect, useMemo, useState } from "react";
import { FileText, Paperclip, Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableFooterCell } from "@/components/tables/DataTable";
import { Text } from "@/components/ds/text";
import { EmptyState } from "@/components/ds";
import { InvoiceStatusBadge } from "@/components/invoicing/InvoiceStatusBadge";
import { formatCurrency } from "@/lib/format";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

interface CommitmentInvoiceRow {
  id: number;
  invoice_number: string | null;
  period_start: string | null;
  period_end: string | null;
  billing_date: string | null;
  status: string;
  is_retainage_release: boolean;
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
  const router = useRouter();
  const [invoices, setInvoices] = useState<EnrichedInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const createRetainageReleaseInvoice = async () => {
    setIsCreating(true);
    try {
      const filterKey = commitmentType === "subcontract" ? "subcontract_id" : "purchase_order_id";
      const response = await apiFetch<{ data?: { id?: number } }>(`/api/projects/${projectId}/invoicing/subcontractor/invoices`, {
        method: "POST",
        body: JSON.stringify({ [filterKey]: commitmentId, is_retainage_release: true }),
      });
      toast.success("Retainage release invoice created");
      setRefreshKey((k) => k + 1);
      if (response.data?.id) {
        router.push(`/${projectId}/commitments/${commitmentId}/invoices/${response.data.id}`);
      }
    } catch (err) {
      toast.error("Failed to create retainage release invoice");
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const filterKey =
          commitmentType === "subcontract" ? "subcontract_id" : "purchase_order_id";
        const url = `/api/projects/${projectId}/invoicing/subcontractor/invoices?${filterKey}=${encodeURIComponent(commitmentId)}`;
        const payload = await apiFetch<{ data?: CommitmentInvoiceRow[] }>(url, { signal: controller.signal });
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
  }, [commitmentId, commitmentType, projectId, refreshKey]);

  const totals = useMemo(() => {
    const sum = (key: keyof EnrichedInvoice) =>
      invoices.reduce((acc, inv) => acc + (Number(inv[key]) || 0), 0);
    const totalCompleted = sum("total_completed");
    const totalRetainage = sum("total_retainage");
    const totalEarnedLessRetainage = totalCompleted - totalRetainage;
    const revisedContractSum = sum("revised_contract_sum");
    return {
      original_contract_sum: sum("original_contract_sum"),
      net_change_by_cos: sum("net_change_by_cos"),
      revised_contract_sum: revisedContractSum,
      total_completed: totalCompleted,
      total_retainage: totalRetainage,
      total_earned_less_retainage: totalEarnedLessRetainage,
      net_amount: sum("net_amount"),
      balance_to_finish: sum("balance_to_finish"),
      percent_complete:
        revisedContractSum > 0
          ? Math.round((totalEarnedLessRetainage / revisedContractSum) * 100)
          : 0,
    };
  }, [invoices]);

  const footerRow = useMemo<DataTableFooterCell[]>(
    () => [
      { value: "Totals", colSpan: 4, align: "right" },
      { value: formatCurrency(totals.original_contract_sum) },
      { value: formatCurrency(totals.net_change_by_cos) },
      { value: formatCurrency(totals.revised_contract_sum) },
      { value: formatCurrency(totals.total_completed) },
      { value: formatCurrency(totals.total_retainage) },
      { value: formatCurrency(totals.total_earned_less_retainage) },
      { value: formatCurrency(totals.net_amount) },
      { value: formatCurrency(totals.balance_to_finish) },
      { value: `${totals.percent_complete}%` },
      { value: "", align: "center" },
    ],
    [totals],
  );

  const columns: ColumnDef<EnrichedInvoice>[] = useMemo(
    () => [
      {
        accessorKey: "invoice_number",
        header: () => <span className="text-muted-foreground">#</span>,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Link
              href={`/${projectId}/commitments/${commitmentId}/invoices/${row.original.id}`}
              className="font-medium text-primary hover:underline"
            >
              {row.original.invoice_number || `INV-${row.original.id}`}
            </Link>
            {row.original.is_retainage_release && (
              <Badge variant="outline" className="text-xs">
                Retainage Release
              </Badge>
            )}
          </div>
        ),
        size: 180,
      },
      {
        id: "invoice_dates",
        header: () => <span className="text-muted-foreground">Invoice Dates</span>,
        cell: ({ row }) => (
          <Text size="sm" className="whitespace-nowrap">
            {formatInvoiceDates(row.original.period_start, row.original.period_end)}
          </Text>
        ),
      },
      {
        accessorKey: "billing_date",
        header: () => <span className="text-muted-foreground">Billing Date</span>,
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
        accessorKey: "original_contract_sum",
        header: () => <div className="text-right text-muted-foreground">Original Contract Sum</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatCurrency(row.original.original_contract_sum)}
          </div>
        ),
      },
      {
        accessorKey: "net_change_by_cos",
        header: () => <div className="text-right text-muted-foreground">Net Change by COs</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatCurrency(row.original.net_change_by_cos)}
          </div>
        ),
      },
      {
        accessorKey: "revised_contract_sum",
        header: () => <div className="text-right text-muted-foreground">Revised Contract Sum</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums font-medium">
            {formatCurrency(row.original.revised_contract_sum)}
          </div>
        ),
      },
      {
        accessorKey: "total_completed",
        header: () => <div className="text-right text-muted-foreground">Total Completed & Stored</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatCurrency(row.original.total_completed)}
          </div>
        ),
      },
      {
        accessorKey: "total_retainage",
        header: () => <div className="text-right text-muted-foreground">Total Retainage</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatCurrency(row.original.total_retainage)}
          </div>
        ),
      },
      {
        accessorKey: "total_earned_less_retainage",
        header: () => <div className="text-right text-muted-foreground">Total Earned Less Retainage</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums font-medium">
            {formatCurrency(row.original.total_earned_less_retainage)}
          </div>
        ),
      },
      {
        accessorKey: "net_amount",
        header: () => <div className="text-right text-muted-foreground">Payment Due</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums font-medium">
            {formatCurrency(row.original.net_amount)}
          </div>
        ),
      },
      {
        accessorKey: "balance_to_finish",
        header: () => <div className="text-right text-muted-foreground">Balance to Finish</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatCurrency(row.original.balance_to_finish)}
          </div>
        ),
      },
      {
        accessorKey: "percent_complete",
        header: () => <div className="text-right text-muted-foreground">% Complete</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {`${Math.round(row.original.percent_complete || 0)}%`}
          </div>
        ),
      },
      {
        id: "attachments",
        header: () => <div className="text-center text-muted-foreground">Attachments</div>,
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
    [projectId, commitmentId],
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
    <div className="space-y-3">
      {invoices.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="No invoices yet"
          description="Invoices submitted against this contract will appear here."
          action={
            <Button size="sm" variant="outline" onClick={createRetainageReleaseInvoice}>
              <Plus />
              Create Retainage Release Invoice
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={createRetainageReleaseInvoice}
              disabled={isCreating}
            >
              <Plus className="mr-2 h-4 w-4" />
              {isCreating ? "Creating..." : "Create Retainage Release Invoice"}
            </Button>
          </div>
          <DataTable
            columns={columns}
            data={invoices}
            showToolbar={false}
            showPagination={invoices.length > 25}
            rowHover={false}
            footerRow={footerRow}
          />
        </>
      )}
    </div>
  );
});

InvoicesTab.displayName = "InvoicesTab";
