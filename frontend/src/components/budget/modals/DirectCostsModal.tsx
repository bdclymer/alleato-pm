"use client";

import { useState, useEffect } from "react";
import {
  BaseSidebar,
  SidebarBody,
  SidebarFooter,
  SidebarTabs,
} from "./BaseSidebar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { Receipt } from "lucide-react";

interface DirectCostItem {
  id: string;
  description: string;
  amount: number;
  status: "pending" | "revise_and_resubmit" | "approved";
  incurredDate: string | null;
  vendor: string | null;
  invoiceNumber: string | null;
  costType: string | null;
  payments: number;
}

interface DirectCostsModalProps {
  open: boolean;
  onClose: () => void;
  costCode: string;
  budgetLineId: string;
  projectId: string;
}

export function DirectCostsModal({
  open,
  onClose,
  costCode,
  budgetLineId,
  projectId,
}: DirectCostsModalProps) {
  const [activeTab, setActiveTab] = useState<"costs" | "summary">("costs");
  const [costs, setCosts] = useState<DirectCostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayments, setShowPayments] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved"
  >("all");

  useEffect(() => {
    if (open) {
      fetchCosts();
    }
  }, [open, budgetLineId, projectId, statusFilter]);

  const fetchCosts = async () => {
    setLoading(true);
    try {
      const url = `/api/projects/${projectId}/budget/direct-costs?budgetLineId=${budgetLineId}&costCode=${encodeURIComponent(costCode)}${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`;
      const data = await apiFetch<{ costs: DirectCostItem[] }>(url);
      setCosts(data.costs || []);
    } catch (error) {
      console.error("Failed to fetch direct costs:", error);
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

  const getStatusBadge = (status: string) => {
    const displayName: Record<string, string> = {
      approved: "APPROVED",
      pending: "PENDING",
      revise_and_resubmit: "REVISE",
    };

    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border border-border bg-muted text-foreground">
        {displayName[status] || status.toUpperCase()}
      </span>
    );
  };

  const totalAmount = costs.reduce((sum, cost) => sum + cost.amount, 0);
  const totalPayments = costs.reduce((sum, cost) => sum + cost.payments, 0);

  const tabs = [
    { id: "costs", label: "Direct Costs" },
    { id: "summary", label: "Summary" },
  ];

  return (
    <BaseSidebar
      open={open}
      onClose={onClose}
      title="Direct Costs"
      size="xl"
    >
      <SidebarTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as "costs" | "summary")}
      />

      {/* Filters */}
      <div className="px-4 sm:px-8 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(["all", "approved", "pending"] as const).map((status) => (
              <Button
                key={status}
                type="button"
                variant={statusFilter === status ? "default" : "ghost"}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-4 py-1.5 text-xs font-medium rounded-full transition-all h-auto",
                  statusFilter === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-muted",
                )}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="show-payments"
              checked={showPayments}
              onCheckedChange={setShowPayments}
            />
            <Label
              htmlFor="show-payments"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Show Payments
            </Label>
          </div>
        </div>
      </div>

      <SidebarBody className="bg-background">
        {activeTab === "costs" ? (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Total Summary */}
            <div className="rounded-lg border border-border p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Direct Costs
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                {showPayments && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Total Payments
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {formatCurrency(totalPayments)}
                    </p>
                  </div>
                )}
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Count</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {costs.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="rounded-lg bg-muted/40 border border-border p-4">
              <div className="flex items-start gap-4">
                <Receipt className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-foreground">
                    About Direct Costs
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Direct costs include invoices, expenses, and payroll in
                    pending, revise and resubmit, or approved status. These costs
                    directly impact your budget line.
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
                  <InlineTableHeaderCell>Status</InlineTableHeaderCell>
                  <InlineTableHeaderCell>Vendor</InlineTableHeaderCell>
                  <InlineTableHeaderCell align="right">Amount</InlineTableHeaderCell>
                  {showPayments && (
                    <InlineTableHeaderCell align="right">Payments</InlineTableHeaderCell>
                  )}
                  <InlineTableHeaderCell>Date</InlineTableHeaderCell>
                </InlineTableHeaderRow>
              </InlineTableHeader>
              <InlineTableBody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={showPayments ? 7 : 6}
                      className="px-3 py-10 text-center text-muted-foreground"
                    >
                      Loading costs...
                    </td>
                  </tr>
                ) : costs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={showPayments ? 7 : 6}
                      className="px-3 py-10 text-center text-muted-foreground"
                    >
                      No direct costs found for this cost code.
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
                        {cost.costType || "-"}
                      </InlineTableCell>
                      <InlineTableCell>
                        {getStatusBadge(cost.status)}
                      </InlineTableCell>
                      <InlineTableCell>
                        {cost.vendor || "-"}
                      </InlineTableCell>
                      <InlineTableCell align="right" numeric className="font-semibold">
                        {formatCurrency(cost.amount)}
                      </InlineTableCell>
                      {showPayments && (
                        <InlineTableCell align="right" numeric className="font-medium">
                          {formatCurrency(cost.payments)}
                        </InlineTableCell>
                      )}
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
              Summary breakdown of direct costs by status.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["approved", "pending", "revise_and_resubmit"] as const).map(
                (status) => {
                  const statusCosts = costs.filter((c) => c.status === status);
                  const statusTotal = statusCosts.reduce(
                    (sum, c) => sum + c.amount,
                    0,
                  );

                  return (
                    <div
                      key={status}
                      className="rounded-lg border border-border p-4 bg-muted/30"
                    >
                      <div className="mb-2">{getStatusBadge(status)}</div>
                      <p className="text-2xl font-bold text-foreground mt-2">
                        {formatCurrency(statusTotal)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {statusCosts.length}{" "}
                        {statusCosts.length === 1 ? "cost" : "costs"}
                      </p>
                    </div>
                  );
                },
              )}
            </div>
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
