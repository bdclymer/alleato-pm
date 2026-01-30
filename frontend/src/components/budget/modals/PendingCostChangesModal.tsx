"use client";

import { useState, useEffect } from "react";
import { BaseSidebar, SidebarBody, SidebarFooter } from "./BaseSidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface PendingCostChange {
  id: string;
  number: string;
  description: string;
  amount: number;
  status: string;
  type: "commitment" | "commitment_change_order";
  commitmentType?: "subcontract" | "purchase_order";
  requestedDate: string;
}

interface PendingCostChangesModalProps {
  open: boolean;
  onClose: () => void;
  costCode: string;
  budgetLineId: string;
  projectId: string;
}

/**
 * PendingCostChangesModal - Shows pending commitments and change orders
 *
 * Features:
 * - Displays pending commitments (subcontracts, POs in Out For Signature, Processing, etc.)
 * - Shows pending commitment change orders
 * - Filter by type
 * - Mobile responsive layout
 * - Matches Procore design patterns
 */
export function PendingCostChangesModal({
  open,
  onClose,
  costCode,
  budgetLineId,
  projectId,
}: PendingCostChangesModalProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "summary">("pending");
  const [changes, setChanges] = useState<PendingCostChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<
    "all" | "commitment" | "change_order"
  >("all");

  useEffect(() => {
    if (open) {
      fetchPendingCostChanges();
    }
  }, [open, budgetLineId, projectId, typeFilter]);

  const fetchPendingCostChanges = async () => {
    setLoading(true);
    try {
      const url = `/api/projects/${projectId}/budget/pending-cost-changes?budgetLineId=${budgetLineId}${typeFilter !== "all" ? `&type=${typeFilter}` : ""}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setChanges(data.changes || []);
      }
    } catch (error) {

      console.error("Failed to fetch pending cost changes:", error);

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

  const getTypeBadge = (change: PendingCostChange) => {
    if (change.type === "commitment_change_order") {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border bg-orange-100 text-orange-800 border-orange-200">
          CO
        </span>
      );
    }

    const config =
      change.commitmentType === "subcontract"
        ? "bg-blue-100 text-blue-800 border-blue-200"
        : "bg-purple-100 text-purple-800 border-purple-200";

    return (
      <span
        className={cn(
          "inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border",
          config,
        )}
      >
        {change.commitmentType === "subcontract" ? "SUB" : "PO"}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border bg-yellow-100 text-yellow-800 border-yellow-200">
        {status.replace(/_/g, " ").toUpperCase()}
      </span>
    );
  };

  const totalAmount = changes.reduce((sum, c) => sum + c.amount, 0);

  // Summary breakdowns
  const commitmentChanges = changes.filter((c) => c.type === "commitment");
  const changeOrderChanges = changes.filter(
    (c) => c.type === "commitment_change_order",
  );
  const commitmentTotal = commitmentChanges.reduce(
    (sum, c) => sum + c.amount,
    0,
  );
  const changeOrderTotal = changeOrderChanges.reduce(
    (sum, c) => sum + c.amount,
    0,
  );

  const tabs = [
    { id: "pending", label: "Pending Changes" },
    { id: "summary", label: "Summary" },
  ];

  return (
    <BaseSidebar
      open={open}
      onClose={onClose}
      title="Pending Cost Changes"
      subtitle={costCode}
      size="xl"
    >
      {/* Tabs and Filter */}
      <div className="border-b border-border px-6 py-2 bg-muted flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as "pending" | "summary")}
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

          {/* Type Filter */}
          <div className="flex gap-2">
            {["all", "commitment", "change_order"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(type as typeof typeFilter)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-full transition-all",
                  typeFilter === type
                    ? "bg-orange-500 text-white"
                    : "bg-muted text-foreground hover:bg-muted",
                )}
              >
                {type === "all"
                  ? "All"
                  : type === "commitment"
                    ? "Commitments"
                    : "COs"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <SidebarBody className="bg-background">
        {activeTab === "pending" ? (
          <div className="p-6 space-y-5">
            {/* Total Summary */}
            <div className="rounded-xl border border-slate-200 shadow-sm p-5 bg-gradient-to-br from-orange-50 via-white to-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">
                    Total Pending Cost Changes
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-foreground">Items</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {changes.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Description Box */}
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-900">
                  <p className="font-semibold">About Pending Cost Changes</p>
                  <p className="mt-1">
                    These include pending commitments (Out For Signature,
                    Processing, Submitted, etc.) and pending change orders on
                    commitments. They impact projected costs but not committed
                    costs until approved.
                  </p>
                </div>
              </div>
            </div>

            {/* Changes Table */}
            <div className="overflow-x-auto scrollbar-hide rounded-xl border border-slate-200 shadow-sm bg-background">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-800">
                      Number
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-800">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-800">
                      Description
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-800">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-800">
                      Amount
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-800">
                      Requested
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        Loading pending cost changes...
                      </td>
                    </tr>
                  ) : changes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No pending cost changes found for this cost code.
                      </td>
                    </tr>
                  ) : (
                    changes.map((change) => (
                      <tr
                        key={change.id}
                        className="hover:bg-orange-50/40 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-blue-600">
                          {change.number}
                        </td>
                        <td className="px-4 py-3">{getTypeBadge(change)}</td>
                        <td
                          className="px-4 py-3 text-foreground max-w-xs truncate"
                          title={change.description}
                        >
                          {change.description}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(change.status)}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right font-semibold tabular-nums",
                            change.amount < 0
                              ? "text-red-600"
                              : "text-orange-600",
                          )}
                        >
                          {formatCurrency(change.amount)}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {formatDate(change.requestedDate)}
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
              Summary breakdown of pending cost changes by type.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 shadow-sm p-5 bg-background">
                <div className="mb-2">
                  <span className="inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full border bg-blue-100 text-blue-800 border-blue-200">
                    PENDING COMMITMENTS
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {formatCurrency(commitmentTotal)}
                </p>
                <p className="text-sm text-foreground mt-1">
                  {commitmentChanges.length}{" "}
                  {commitmentChanges.length === 1
                    ? "commitment"
                    : "commitments"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 shadow-sm p-5 bg-background">
                <div className="mb-2">
                  <span className="inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full border bg-orange-100 text-orange-800 border-orange-200">
                    CHANGE ORDERS
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {formatCurrency(changeOrderTotal)}
                </p>
                <p className="text-sm text-foreground mt-1">
                  {changeOrderChanges.length}{" "}
                  {changeOrderChanges.length === 1
                    ? "change order"
                    : "change orders"}
                </p>
              </div>
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
