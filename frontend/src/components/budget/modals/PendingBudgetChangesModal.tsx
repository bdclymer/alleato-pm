"use client";

import { useState, useEffect } from "react";
import { BaseSidebar, SidebarBody, SidebarFooter } from "./BaseSidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface PendingChangeOrder {
  id: string;
  changeOrderNumber: string;
  description: string;
  amount: number;
  status: string;
  requestedDate: string;
  requestedBy: string | null;
  contractNumber: string;
}

interface PendingBudgetChangesModalProps {
  open: boolean;
  onClose: () => void;
  costCode: string;
  budgetLineId: string;
  projectId: string;
}

/**
 * PendingBudgetChangesModal - Shows pending change orders
 *
 * Features:
 * - Displays pending change orders from prime contract
 * - Multiple pending statuses (In Review, Pricing, Proceeding, etc.)
 * - Mobile responsive layout
 * - Matches Procore design patterns
 */
export function PendingBudgetChangesModal({
  open,
  onClose,
  costCode,
  budgetLineId,
  projectId,
}: PendingBudgetChangesModalProps) {
  const [changeOrders, setChangeOrders] = useState<PendingChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchPendingChanges();
    }
  }, [open, budgetLineId, projectId]);

  const fetchPendingChanges = async () => {
    setLoading(true);
    try {
      const url = `/api/projects/${projectId}/budget/change-orders?budgetLineId=${budgetLineId}&status=pending`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setChangeOrders(data.changeOrders || []);
      }
    } catch (error) {

      console.error("Failed to fetch pending budget changes:", error);

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
    return (
      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border bg-yellow-100 text-yellow-800 border-yellow-200">
        {status.replace("pending_", "").replace(/_/g, " ").toUpperCase()}
      </span>
    );
  };

  const totalAmount = changeOrders.reduce((sum, co) => sum + co.amount, 0);

  return (
    <BaseSidebar
      open={open}
      onClose={onClose}
      title="Pending Budget Changes"
      subtitle={costCode}
      size="xl"
    >
      {/* Content */}
      <SidebarBody className="bg-background">
        <div className="p-6 space-y-4">
          {/* Total Summary */}
          <div className="rounded-xl border border-border shadow-sm p-4 bg-gradient-to-br from-yellow-50 via-white to-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">Total Pending Changes</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-foreground">Count</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {changeOrders.length}
                </p>
              </div>
            </div>
          </div>

          {/* Description Box */}
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
            <div className="flex items-start gap-4">
              <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-900">
                <p className="font-semibold">About Pending Budget Changes</p>
                <p className="mt-1">
                  These are change orders from your prime contract that are
                  pending approval. They will be included in projected budget
                  calculations but not in the revised budget until approved.
                </p>
              </div>
            </div>
          </div>

          {/* Change Orders Table */}
          <div className="overflow-x-auto scrollbar-hide rounded-xl border border-border shadow-sm bg-background">
            <table className="w-full text-sm">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="text-left px-4 py-4 font-semibold text-foreground">
                    CO Number
                  </th>
                  <th className="text-left px-4 py-4 font-semibold text-foreground">
                    Description
                  </th>
                  <th className="text-left px-4 py-4 font-semibold text-foreground">
                    Status
                  </th>
                  <th className="text-left px-4 py-4 font-semibold text-foreground">
                    Contract
                  </th>
                  <th className="text-right px-4 py-4 font-semibold text-foreground">
                    Amount
                  </th>
                  <th className="text-left px-4 py-4 font-semibold text-foreground">
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
                      Loading pending changes...
                    </td>
                  </tr>
                ) : changeOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No pending budget changes found for this cost code.
                    </td>
                  </tr>
                ) : (
                  changeOrders.map((co) => (
                    <tr
                      key={co.id}
                      className="hover:bg-yellow-50/40 transition-colors"
                    >
                      <td className="px-4 py-4 font-medium text-blue-600">
                        {co.changeOrderNumber}
                      </td>
                      <td
                        className="px-4 py-4 text-foreground max-w-xs truncate"
                        title={co.description}
                      >
                        {co.description}
                      </td>
                      <td className="px-4 py-4">{getStatusBadge(co.status)}</td>
                      <td className="px-4 py-4 text-foreground text-xs">
                        {co.contractNumber}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-4 text-right font-semibold tabular-nums",
                          co.amount < 0 ? "text-red-600" : "text-yellow-600",
                        )}
                      >
                        {formatCurrency(co.amount)}
                      </td>
                      <td className="px-4 py-4 text-foreground">
                        {formatDate(co.requestedDate)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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
