"use client";

import { useState, useEffect } from "react";
import {
  BaseSidebar,
  SidebarBody,
  SidebarFooter,
  SidebarTabs,
} from "./BaseSidebar";
import { Button } from "@/components/ui/button";
import {
  InlineTable,
  InlineTableHeader,
  InlineTableHeaderRow,
  InlineTableHeaderCell,
  InlineTableBody,
  InlineTableRow,
  InlineTableCell,
} from "@/components/ds/inline-table";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { DollarSign } from "lucide-react";

interface DirectCostItem {
  id: string;
  description: string;
  amount: number;
  incurredDate: string | null;
  vendor: string | null;
  invoiceNumber: string | null;
  costType: string | null;
}

interface JobToDateCostDetailModalProps {
  open: boolean;
  onClose: () => void;
  costCode: string;
  budgetLineId: string;
  projectId: string;
}

export function JobToDateCostDetailModal({
  open,
  onClose,
  costCode,
  budgetLineId,
  projectId,
}: JobToDateCostDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"costs" | "breakdown">("costs");
  const [costs, setCosts] = useState<DirectCostItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchCosts();
    }
  }, [open, budgetLineId, projectId]);

  const fetchCosts = async () => {
    setLoading(true);
    try {
      const url = `/api/projects/${projectId}/budget/direct-costs?budgetLineId=${budgetLineId}&costCode=${encodeURIComponent(costCode)}&status=approved`;
      const data = await apiFetch<{ costs: DirectCostItem[] }>(url);
      setCosts(data.costs || []);
    } catch (error) {
      console.error("Failed to fetch job to date cost details:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    const isNegative = value < 0;
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value));

    if (isNegative) {
      return `($${formatted})`;
    }
    return `$${formatted}`;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const totalAmount = costs.reduce((sum, cost) => sum + cost.amount, 0);

  const costsByType = costs.reduce(
    (acc, cost) => {
      const type = cost.costType || "Uncategorized";
      if (!acc[type]) {
        acc[type] = { count: 0, total: 0 };
      }
      acc[type].count += 1;
      acc[type].total += cost.amount;
      return acc;
    },
    {} as Record<string, { count: number; total: number }>,
  );

  const tabs = [
    { id: "costs", label: "Direct Costs" },
    { id: "breakdown", label: "Breakdown" },
  ];

  return (
    <BaseSidebar
      open={open}
      onClose={onClose}
      title="Job to Date Cost Detail"
      size="xl"
    >
      <SidebarTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as "costs" | "breakdown")}
      />

      <SidebarBody className="bg-background">
        {activeTab === "costs" ? (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Total Summary */}
            <div className="rounded-lg border border-border p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Job to Date Costs
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Transactions</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {costs.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="rounded-lg bg-muted/40 border border-border p-4">
              <div className="flex items-start gap-4">
                <DollarSign className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-foreground">
                    About Job to Date Costs
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    These are approved direct costs including invoices, expenses,
                    payroll, and subcontractor invoices that have been incurred
                    and approved for this cost code.
                  </p>
                </div>
              </div>
            </div>

            {/* Costs Table */}
            <InlineTable variant="read">
              <InlineTableHeader>
                <InlineTableHeaderRow>
                  <InlineTableHeaderCell>Description</InlineTableHeaderCell>
                  <InlineTableHeaderCell>Type</InlineTableHeaderCell>
                  <InlineTableHeaderCell>Vendor</InlineTableHeaderCell>
                  <InlineTableHeaderCell>Invoice #</InlineTableHeaderCell>
                  <InlineTableHeaderCell align="right">Amount</InlineTableHeaderCell>
                  <InlineTableHeaderCell>Date</InlineTableHeaderCell>
                </InlineTableHeaderRow>
              </InlineTableHeader>
              <InlineTableBody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-10 text-center text-muted-foreground"
                    >
                      Loading costs...
                    </td>
                  </tr>
                ) : costs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-10 text-center text-muted-foreground"
                    >
                      No approved costs found for this cost code.
                    </td>
                  </tr>
                ) : (
                  costs.map((cost) => (
                    <InlineTableRow key={cost.id}>
                      <InlineTableCell
                        className="max-w-xs truncate"
                        title={cost.description || "-"}
                      >
                        {cost.description || "-"}
                      </InlineTableCell>
                      <InlineTableCell>
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border border-border bg-muted text-foreground">
                          {cost.costType || "Other"}
                        </span>
                      </InlineTableCell>
                      <InlineTableCell>
                        {cost.vendor || "-"}
                      </InlineTableCell>
                      <InlineTableCell className="font-mono">
                        {cost.invoiceNumber || "-"}
                      </InlineTableCell>
                      <InlineTableCell align="right" numeric className="font-semibold">
                        {formatCurrency(cost.amount)}
                      </InlineTableCell>
                      <InlineTableCell>
                        {formatDate(cost.incurredDate)}
                      </InlineTableCell>
                    </InlineTableRow>
                  ))
                )}
              </InlineTableBody>
            </InlineTable>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Cost breakdown by type for this budget line.
            </p>

            <InlineTable variant="read">
              <InlineTableHeader>
                <InlineTableHeaderRow>
                  <InlineTableHeaderCell>Cost Type</InlineTableHeaderCell>
                  <InlineTableHeaderCell align="right">Count</InlineTableHeaderCell>
                  <InlineTableHeaderCell align="right">Total Amount</InlineTableHeaderCell>
                  <InlineTableHeaderCell align="right">% of Total</InlineTableHeaderCell>
                </InlineTableHeaderRow>
              </InlineTableHeader>
              <InlineTableBody>
                {Object.entries(costsByType).map(([type, data]) => (
                  <InlineTableRow key={type}>
                    <InlineTableCell className="font-medium">
                      {type}
                    </InlineTableCell>
                    <InlineTableCell align="right">
                      {data.count}
                    </InlineTableCell>
                    <InlineTableCell align="right" numeric className="font-semibold">
                      {formatCurrency(data.total)}
                    </InlineTableCell>
                    <InlineTableCell align="right">
                      {totalAmount > 0
                        ? ((data.total / totalAmount) * 100).toFixed(1)
                        : "0.0"}
                      %
                    </InlineTableCell>
                  </InlineTableRow>
                ))}
              </InlineTableBody>
            </InlineTable>
          </div>
        )}
      </SidebarBody>

      <SidebarFooter>
        <div className="flex items-center justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </SidebarFooter>
    </BaseSidebar>
  );
}
