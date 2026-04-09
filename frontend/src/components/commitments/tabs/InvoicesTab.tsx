"use client";

import { memo, useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  DollarSign,
  Percent,
  Receipt,
  TrendingUp,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { Text } from "@/components/ds/text";
import { formatCurrency } from "@/config/tables";

interface InvoiceSummary {
  total_contract_amount: number;
  gross_billed_to_date: number;
  retainage_percentage: number;
  retainage_held: number;
  net_billed_to_date: number;
  remaining_to_invoice: number;
  net_remaining_balance: number;
  percent_invoiced: number;
}

interface InvoiceLineItem {
  id: string;
  line_number: number | null;
  budget_code: string | null;
  description: string;
  scheduled_value: number;
  gross_billed_to_date: number;
  retainage_percentage: number;
  retainage_held: number;
  net_billed_to_date: number;
  remaining_amount: number;
  percent_complete: number;
}

interface InvoicesTabProps {
  commitmentId: string;
  projectId: string | number;
}

export const InvoicesTab = memo(function InvoicesTab({
  commitmentId,
  projectId,
}: InvoicesTabProps) {
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/commitments/${commitmentId}/invoices`);

        if (!response.ok) {
          if (response.status === 404) {
            setSummary(null);
            setLineItems([]);
            return;
          }
          throw new Error("Failed to fetch invoice data");
        }

        const payload = await response.json();

        if (payload.summary) {
          setSummary(payload.summary);
        } else {
          setSummary({
            total_contract_amount: 0,
            gross_billed_to_date: 0,
            retainage_percentage: 0,
            retainage_held: 0,
            net_billed_to_date: 0,
            remaining_to_invoice: 0,
            net_remaining_balance: 0,
            percent_invoiced: 0,
          });
        }

        if (Array.isArray(payload.line_items)) {
          setLineItems(payload.line_items);
        } else {
          setLineItems([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invoice data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoiceData();
  }, [commitmentId]);

  const columns: ColumnDef<InvoiceLineItem>[] = useMemo(
    () => [
      {
        accessorKey: "line_number",
        header: "#",
        cell: ({ row }) => <Text size="sm">{row.original.line_number ?? "—"}</Text>,
        size: 60,
      },
      {
        accessorKey: "budget_code",
        header: "Cost Code",
        cell: ({ row }) => (
          <Text size="sm" className="font-mono">
            {row.original.budget_code || "—"}
          </Text>
        ),
        size: 120,
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <Text size="sm" className="max-w-72 truncate">
            {row.original.description || "—"}
          </Text>
        ),
      },
      {
        accessorKey: "scheduled_value",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Scheduled Value
            <ArrowUpDown />
          </Button>
        ),
        cell: ({ row }) => (
          <Text size="sm" className="text-right">
            {formatCurrency(row.original.scheduled_value)}
          </Text>
        ),
      },
      {
        accessorKey: "gross_billed_to_date",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Gross Billed
            <ArrowUpDown />
          </Button>
        ),
        cell: ({ row }) => (
          <Text size="sm" className="text-right font-medium">
            {formatCurrency(row.original.gross_billed_to_date)}
          </Text>
        ),
      },
      {
        accessorKey: "retainage_held",
        header: "Retainage Held",
        cell: ({ row }) => (
          <Text size="sm" className="text-right text-destructive">
            {formatCurrency(row.original.retainage_held)}
          </Text>
        ),
      },
      {
        accessorKey: "net_billed_to_date",
        header: "Net Billed",
        cell: ({ row }) => (
          <Text size="sm" className="text-right font-medium">
            {formatCurrency(row.original.net_billed_to_date)}
          </Text>
        ),
      },
      {
        accessorKey: "remaining_amount",
        header: "Remaining",
        cell: ({ row }) => (
          <Text size="sm" className="text-right text-muted-foreground">
            {formatCurrency(row.original.remaining_amount)}
          </Text>
        ),
      },
      {
        accessorKey: "percent_complete",
        header: "% Complete",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Progress value={row.original.percent_complete} className="h-2 w-16" />
            <Text size="xs" className="w-10 text-right">
              {row.original.percent_complete}%
            </Text>
          </div>
        ),
        size: 140,
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Retainage Billing Summary</CardTitle>
          <CardDescription>Billing progress for this commitment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Retainage Billing Summary</CardTitle>
          <CardDescription>Billing progress for this commitment</CardDescription>
        </CardHeader>
        <CardContent>
          <Text tone="destructive">{error}</Text>
        </CardContent>
      </Card>
    );
  }

  const hasBillingData =
    summary &&
    (summary.total_contract_amount > 0 ||
      summary.gross_billed_to_date > 0 ||
      summary.retainage_held > 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Retainage Billing Summary
          </CardTitle>
          <CardDescription>
            Gross billing, retainage held, and the remaining balance for this commitment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasBillingData ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Text tone="muted">Gross Billing Progress</Text>
                  <Text weight="medium">{summary?.percent_invoiced || 0}% Invoiced</Text>
                </div>
                <Progress value={summary?.percent_invoiced || 0} className="h-3" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <Text size="xs">Contract Value</Text>
                  </div>
                  <Text size="lg" weight="semibold" className="mt-1">
                    {formatCurrency(summary?.total_contract_amount || 0)}
                  </Text>
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <Text size="xs">Gross Billed</Text>
                  </div>
                  <Text
                    size="lg"
                    weight="semibold"
                    className="mt-1 text-green-600 dark:text-green-400"
                  >
                    {formatCurrency(summary?.gross_billed_to_date || 0)}
                  </Text>
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Receipt className="h-4 w-4" />
                    <Text size="xs">Retainage Held</Text>
                  </div>
                  <Text size="lg" weight="semibold" className="mt-1 text-destructive">
                    {formatCurrency(summary?.retainage_held || 0)}
                  </Text>
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Percent className="h-4 w-4" />
                    <Text size="xs">Net Billed</Text>
                  </div>
                  <Text size="lg" weight="semibold" className="mt-1">
                    {formatCurrency(summary?.net_billed_to_date || 0)}
                  </Text>
                </div>

                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Percent className="h-4 w-4" />
                    <Text size="xs">Remaining to Invoice</Text>
                  </div>
                  <Text size="lg" weight="semibold" className="mt-1">
                    {formatCurrency(summary?.remaining_to_invoice || 0)}
                  </Text>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <Text size="sm">Retainage rate: {summary?.retainage_percentage || 0}%</Text>
                <Text size="sm">
                  Net remaining balance: {formatCurrency(summary?.net_remaining_balance || 0)}
                </Text>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Receipt className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <Text tone="muted" size="sm" className="mt-2">
                No billing data available for this commitment
              </Text>
              <Text tone="muted" size="xs" className="mt-1">
                Add SOV line items with billed amounts to see retainage-aware invoice progress
              </Text>
            </div>
          )}
        </CardContent>
      </Card>

      {lineItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Billing by Line Item</CardTitle>
            <CardDescription>
              Detailed breakdown of gross billed amounts and retainage by SOV line item
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={lineItems}
              showToolbar={false}
              showPagination={lineItems.length > 10}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
});

InvoicesTab.displayName = "InvoicesTab";
