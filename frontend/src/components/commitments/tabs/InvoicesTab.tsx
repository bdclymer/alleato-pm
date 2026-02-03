"use client";

import { useEffect, useState } from "react";
import { ArrowUpDown, Receipt, TrendingUp, DollarSign, Percent } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { Progress } from "@/components/ui/progress";
import { DataTable } from "@/components/tables/DataTable";
import { formatCurrency } from "@/config/tables";

// Invoice summary data from API
interface InvoiceSummary {
  total_contract_amount: number;
  total_invoiced: number;
  remaining_to_invoice: number;
  percent_invoiced: number;
  total_paid: number;
  remaining_balance: number;
}

// SOV line item with billing progress
interface InvoiceLineItem {
  id: string;
  line_number: number | null;
  budget_code: string | null;
  description: string;
  scheduled_value: number;
  billed_to_date: number;
  remaining_amount: number;
  percent_complete: number;
}

interface InvoicesTabProps {
  commitmentId: string;
}

export function InvoicesTab({ commitmentId }: InvoicesTabProps) {
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

        // Handle new API response format
        if (payload.summary) {
          setSummary(payload.summary);
        } else {
          // Fallback for legacy format
          setSummary({
            total_contract_amount: 0,
            total_invoiced: 0,
            remaining_to_invoice: 0,
            percent_invoiced: 0,
            total_paid: 0,
            remaining_balance: 0,
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

  const columns: ColumnDef<InvoiceLineItem>[] = [
    {
      accessorKey: "line_number",
      header: "#",
      cell: ({ row }) => (
        <Text size="sm">{row.original.line_number ?? "—"}</Text>
      ),
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
        <Text size="sm" className="max-w-[300px] truncate">
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
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Text size="sm" className="text-right">
          {formatCurrency(row.original.scheduled_value)}
        </Text>
      ),
    },
    {
      accessorKey: "billed_to_date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          Billed to Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Text size="sm" className="text-right font-medium">
          {formatCurrency(row.original.billed_to_date)}
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
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice Summary</CardTitle>
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
          <CardTitle>Invoice Summary</CardTitle>
          <CardDescription>Billing progress for this commitment</CardDescription>
        </CardHeader>
        <CardContent>
          <Text tone="destructive">{error}</Text>
        </CardContent>
      </Card>
    );
  }

  const hasBillingData = summary && (summary.total_contract_amount > 0 || summary.total_invoiced > 0);

  return (
    <div className="space-y-6">
      {/* Invoice Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Invoice Summary
          </CardTitle>
          <CardDescription>
            Overall billing progress for this commitment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasBillingData ? (
            <div className="space-y-6">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Text tone="muted">Billing Progress</Text>
                  <Text weight="medium">{summary?.percent_invoiced || 0}% Invoiced</Text>
                </div>
                <Progress value={summary?.percent_invoiced || 0} className="h-3" />
              </div>

              {/* Summary Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <Text size="xs">Contract Value</Text>
                  </div>
                  <Text size="lg" weight="semibold" className="mt-1">
                    {formatCurrency(summary?.total_contract_amount || 0)}
                  </Text>
                </div>

                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <Text size="xs">Total Invoiced</Text>
                  </div>
                  <Text size="lg" weight="semibold" className="mt-1 text-green-600 dark:text-green-400">
                    {formatCurrency(summary?.total_invoiced || 0)}
                  </Text>
                </div>

                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Receipt className="h-4 w-4" />
                    <Text size="xs">Remaining to Invoice</Text>
                  </div>
                  <Text size="lg" weight="semibold" className="mt-1">
                    {formatCurrency(summary?.remaining_to_invoice || 0)}
                  </Text>
                </div>

                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Percent className="h-4 w-4" />
                    <Text size="xs">% Invoiced</Text>
                  </div>
                  <Text size="lg" weight="semibold" className="mt-1">
                    {summary?.percent_invoiced || 0}%
                  </Text>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <Text tone="muted" size="sm" className="mt-2">
                No billing data available for this commitment
              </Text>
              <Text tone="muted" size="xs" className="mt-1">
                Add SOV line items with billed amounts to see invoice progress
              </Text>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items Breakdown */}
      {lineItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Billing by Line Item</CardTitle>
            <CardDescription>
              Detailed breakdown of invoiced amounts by SOV line item
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
}
