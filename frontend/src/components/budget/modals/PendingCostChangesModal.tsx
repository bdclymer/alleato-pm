"use client";

import { useState, useEffect } from "react";
import {
  BaseSidebar,
  SidebarBody,
  SidebarFooter,
  SidebarTabs,
} from "./BaseSidebar";
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
  budgetLineId: string;
  projectId: string;
}

export function PendingCostChangesModal({
  open,
  onClose,
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
    const label =
      change.type === "commitment_change_order"
        ? "CO"
        : change.commitmentType === "subcontract"
          ? "SUB"
          : "PO";

    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border border-border bg-muted text-foreground">
        {label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border border-border bg-muted text-foreground">
        {status.replace(/_/g, " ").toUpperCase()}
      </span>
    );
  };

  const totalAmount = changes.reduce((sum, c) => sum + c.amount, 0);
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
      size="xl"
    >
      <SidebarTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as "pending" | "summary")}
      />

      {/* Type Filter */}
      <div className="px-4 sm:px-8 pb-2 flex-shrink-0">
        <div className="flex gap-2">
          {(["all", "commitment", "change_order"] as const).map((type) => (
            <Button
              key={type}
              type="button"
              variant={typeFilter === type ? "default" : "ghost"}
              onClick={() => setTypeFilter(type)}
              className={cn(
                "px-4 py-1.5 text-xs font-medium rounded-full transition-all h-auto",
                typeFilter === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted",
              )}
            >
              {type === "all"
                ? "All"
                : type === "commitment"
                  ? "Commitments"
                  : "COs"}
            </Button>
          ))}
        </div>
      </div>

      <SidebarBody className="bg-background">
        {activeTab === "pending" ? (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Total Summary */}
            <div className="rounded-lg border border-border p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Pending Cost Changes
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Items</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {changes.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="rounded-lg bg-muted/40 border border-border p-4">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-foreground">
                    About Pending Cost Changes
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    These include pending commitments (Out For Signature,
                    Processing, Submitted, etc.) and pending change orders on
                    commitments. They impact projected costs but not committed
                    costs until approved.
                  </p>
                </div>
              </div>
            </div>

            {/* Changes Table */}
            <div className="overflow-x-auto scrollbar-hide rounded-lg border border-border bg-background">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">
                      Number
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">
                      Description
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-foreground">
                      Amount
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">
                      Requested
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
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
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-primary">
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
                              ? "text-destructive"
                              : "text-foreground",
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
          <div className="p-4 sm:p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Summary breakdown of pending cost changes by type.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border p-4 bg-muted/30">
                <div className="mb-2">
                  <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border border-border bg-muted text-foreground">
                    PENDING COMMITMENTS
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {formatCurrency(commitmentTotal)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {commitmentChanges.length}{" "}
                  {commitmentChanges.length === 1
                    ? "commitment"
                    : "commitments"}
                </p>
              </div>

              <div className="rounded-lg border border-border p-4 bg-muted/30">
                <div className="mb-2">
                  <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border border-border bg-muted text-foreground">
                    CHANGE ORDERS
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {formatCurrency(changeOrderTotal)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
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
