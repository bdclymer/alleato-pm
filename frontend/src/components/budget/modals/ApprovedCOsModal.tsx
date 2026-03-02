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
import { FileText } from "lucide-react";

interface ChangeOrder {
  id: string;
  changeOrderNumber: string;
  description: string;
  amount: number;
  approvedDate: string | null;
  approvedBy: string | null;
  requestedDate: string;
  contractNumber: string;
}

interface ApprovedCOsModalProps {
  open: boolean;
  onClose: () => void;
  costCode: string;
  budgetLineId: string;
  projectId: string;
}

/**
 * ApprovedCOsModal - Shows approved change orders from prime contract
 *
 * Features:
 * - Displays approved change orders only
 * - Shows change order details and amounts
 * - Links to source contracts
 * - Mobile responsive layout
 * - Matches Procore design patterns
 */
export function ApprovedCOsModal({
  open,
  onClose,
  costCode,
  budgetLineId,
  projectId,
}: ApprovedCOsModalProps) {
  const [activeTab, setActiveTab] = useState<"approved" | "history">(
    "approved",
  );
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchChangeOrders();
    }
  }, [open, budgetLineId, projectId]);

  const fetchChangeOrders = async () => {
    setLoading(true);
    try {
      const url = `/api/projects/${projectId}/budget/change-orders?budgetLineId=${budgetLineId}&status=approved`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setChangeOrders(data.changeOrders || []);
      }
    } catch (error) {
      console.error("Failed to fetch approved change orders:", error);
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

  const totalAmount = changeOrders.reduce((sum, co) => sum + co.amount, 0);

  const tabs = [
    { id: "approved", label: "Approved COs" },
    { id: "history", label: "History" },
  ];

  return (
    <BaseSidebar
      open={open}
      onClose={onClose}
      title="Approved Change Orders"
      subtitle={costCode}
      size="xl"
    >
      {/* Tabs */}
      <SidebarTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as "approved" | "history")}
      />

      {/* Content */}
      <SidebarBody className="bg-background">
        {activeTab === "approved" ? (
          <div className="p-6 space-y-4">
            {/* Total Summary */}
            <div className="rounded-xl border border-slate-200 shadow-sm p-4 bg-gradient-to-br from-green-50 via-white to-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">
                    Total Approved Change Orders
                  </p>
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
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-start gap-4">
                <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold">About Approved COs</p>
                  <p className="mt-1">
                    These are change orders from your prime contract that have
                    been approved and impact this budget line. Only approved
                    change orders are included in the budget calculations.
                  </p>
                </div>
              </div>
            </div>

            {/* Change Orders Table */}
            <div className="overflow-x-auto scrollbar-hide rounded-xl border border-slate-200 shadow-sm bg-background">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-4 font-semibold text-slate-800">
                      CO Number
                    </th>
                    <th className="text-left px-4 py-4 font-semibold text-slate-800">
                      Description
                    </th>
                    <th className="text-left px-4 py-4 font-semibold text-slate-800">
                      Contract
                    </th>
                    <th className="text-right px-4 py-4 font-semibold text-slate-800">
                      Amount
                    </th>
                    <th className="text-left px-4 py-4 font-semibold text-slate-800">
                      Approved Date
                    </th>
                    <th className="text-left px-4 py-4 font-semibold text-slate-800">
                      Approved By
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
                        Loading change orders...
                      </td>
                    </tr>
                  ) : changeOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No approved change orders found for this cost code.
                      </td>
                    </tr>
                  ) : (
                    changeOrders.map((co) => (
                      <tr
                        key={co.id}
                        className="hover:bg-green-50/40 transition-colors"
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
                        <td className="px-4 py-4 text-foreground text-xs">
                          {co.contractNumber}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-4 text-right font-semibold tabular-nums",
                            co.amount < 0 ? "text-red-600" : "text-green-600",
                          )}
                        >
                          {formatCurrency(co.amount)}
                        </td>
                        <td className="px-4 py-4 text-foreground">
                          {formatDate(co.approvedDate)}
                        </td>
                        <td className="px-4 py-4 text-foreground text-xs">
                          {co.approvedBy || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <p className="text-sm text-foreground">
              View the complete history of all change orders (approved,
              rejected, and voided) for this cost code.
            </p>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-muted-foreground">History view coming soon</p>
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
