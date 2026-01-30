"use client";

import { useState, useEffect } from "react";
import { BaseSidebar, SidebarBody, SidebarFooter } from "./BaseSidebar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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

/**
 * DirectCostsModal - Shows direct costs with payments toggle
 *
 * Features:
 * - Displays all direct costs (pending, approved, revise)
 * - Toggle to show/hide payments column
 * - Filter by status
 * - Mobile responsive layout
 * - Matches Procore design patterns
 */
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
      const url = `/api/projects/${projectId}/budget/direct-costs?budgetLineId=${budgetLineId}${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCosts(data.costs || []);
      }
    } catch (error) {

      console.error("Failed to fetch direct costs:", error);

      // Intentionally swallowed: modal shows empty state on error

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
    const statusConfig = {
      approved: "bg-green-100 text-green-800 border-green-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      revise_and_resubmit: "bg-red-100 text-red-800 border-red-200",
    };

    const displayName = {
      approved: "APPROVED",
      pending: "PENDING",
      revise_and_resubmit: "REVISE",
    };

    return (
      <span
        className={cn(
          "inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border",
          statusConfig[status as keyof typeof statusConfig] ||
            statusConfig.pending,
        )}
      >
        {displayName[status as keyof typeof displayName] ||
          status.toUpperCase()}
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
      subtitle={costCode}
      size="xl"
    >
      {/* Tabs */}
      <div className="border-b border-border px-6 py-2 bg-muted flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as "costs" | "summary")}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-all",
                  activeTab === tab.id
                    ? "bg-background text-orange-600 shadow-sm border border-border"
                    : "text-foreground hover:text-foreground hover:bg-background/50",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {/* Status Filter */}
            <div className="flex gap-2">
              {["all", "approved", "pending"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status as typeof statusFilter)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-full transition-all",
                    statusFilter === status
                      ? "bg-orange-500 text-white"
                      : "bg-muted text-foreground hover:bg-muted",
                  )}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {/* Payments Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="show-payments"
                checked={showPayments}
                onCheckedChange={setShowPayments}
              />
              <Label
                htmlFor="show-payments"
                className="text-sm text-foreground cursor-pointer"
              >
                Show Payments
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <SidebarBody className="bg-background">
        {activeTab === "costs" ? (
          <div className="p-6 space-y-5">
            {/* Total Summary */}
            <div className="rounded-xl border border-slate-200 shadow-sm p-5 bg-gradient-to-br from-purple-50 via-white to-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Total Direct Costs</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                {showPayments && (
                  <div className="text-center">
                    <p className="text-sm text-foreground">Total Payments</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {formatCurrency(totalPayments)}
                    </p>
                  </div>
                )}
                <div className="text-right">
                  <p className="text-sm text-foreground">Count</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {costs.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Description Box */}
            <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
              <div className="flex items-start gap-3">
                <Receipt className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-purple-900">
                  <p className="font-semibold">About Direct Costs</p>
                  <p className="mt-1">
                    Direct costs include invoices, expenses, and payroll in
                    pending, revise and resubmit, or approved status. These
                    costs directly impact your budget line.
                  </p>
                </div>
              </div>
            </div>

            {/* Costs Table */}
            <div className="overflow-x-auto scrollbar-hide rounded-xl border border-slate-200 shadow-sm bg-background">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-800">
                      Description
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-800">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-800">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-800">
                      Vendor
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-800">
                      Amount
                    </th>
                    {showPayments && (
                      <th className="text-right px-4 py-3 font-semibold text-slate-800">
                        Payments
                      </th>
                    )}
                    <th className="text-left px-4 py-3 font-semibold text-slate-800">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={showPayments ? 7 : 6}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        Loading costs...
                      </td>
                    </tr>
                  ) : costs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={showPayments ? 7 : 6}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No direct costs found for this cost code.
                      </td>
                    </tr>
                  ) : (
                    costs.map((cost) => (
                      <tr
                        key={cost.id}
                        className="hover:bg-purple-50/40 transition-colors"
                      >
                        <td
                          className="px-4 py-3 text-foreground max-w-xs truncate"
                          title={cost.description || "-"}
                        >
                          {cost.description || "-"}
                        </td>
                        <td className="px-4 py-3 text-foreground text-xs">
                          {cost.costType || "-"}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(cost.status)}
                        </td>
                        <td className="px-4 py-3 text-foreground text-xs">
                          {cost.vendor || "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                          {formatCurrency(cost.amount)}
                        </td>
                        {showPayments && (
                          <td className="px-4 py-3 text-right font-medium tabular-nums text-green-600">
                            {formatCurrency(cost.payments)}
                          </td>
                        )}
                        <td className="px-4 py-3 text-foreground">
                          {formatDate(cost.incurredDate)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <p className="text-sm text-foreground">
              Summary breakdown of direct costs by status.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["approved", "pending", "revise_and_resubmit"].map((status) => {
                const statusCosts = costs.filter((c) => c.status === status);
                const statusTotal = statusCosts.reduce(
                  (sum, c) => sum + c.amount,
                  0,
                );

                return (
                  <div
                    key={status}
                    className="rounded-xl border border-slate-200 shadow-sm p-5 bg-background"
                  >
                    <div className="mb-2">{getStatusBadge(status)}</div>
                    <p className="text-2xl font-bold text-foreground mt-2">
                      {formatCurrency(statusTotal)}
                    </p>
                    <p className="text-sm text-foreground mt-1">
                      {statusCosts.length}{" "}
                      {statusCosts.length === 1 ? "cost" : "costs"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SidebarBody>

      {/* Footer */}
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
