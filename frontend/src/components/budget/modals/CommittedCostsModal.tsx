"use client";

import { useState, useEffect } from "react";
import { BaseSidebar, SidebarBody, SidebarFooter } from "./BaseSidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileCheck } from "lucide-react";

interface Commitment {
  id: string;
  commitmentNumber: string;
  vendor: string | null;
  description: string;
  amount: number;
  status: string;
  type: "subcontract" | "purchase_order";
  executedDate: string | null;
  changeOrders: number;
}

interface CommittedCostsModalProps {
  open: boolean;
  onClose: () => void;
  costCode: string;
  budgetLineId: string;
  projectId: string;
}

/**
 * CommittedCostsModal - Shows approved subcontracts and purchase orders
 *
 * Features:
 * - Displays approved commitments (subcontracts and POs)
 * - Shows change orders included
 * - Filter by commitment type
 * - Mobile responsive layout
 * - Matches Procore design patterns
 */
export function CommittedCostsModal({
  open,
  onClose,
  costCode,
  budgetLineId,
  projectId,
}: CommittedCostsModalProps) {
  const [activeTab, setActiveTab] = useState<"commitments" | "breakdown">(
    "commitments",
  );
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<
    "all" | "subcontract" | "purchase_order"
  >("all");

  useEffect(() => {
    if (open) {
      fetchCommitments();
    }
  }, [open, budgetLineId, projectId, typeFilter]);

  const fetchCommitments = async () => {
    setLoading(true);
    try {
      const url = `/api/projects/${projectId}/budget/commitments?budgetLineId=${budgetLineId}&status=approved,complete${typeFilter !== "all" ? `&type=${typeFilter}` : ""}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCommitments(data.commitments || []);
      }
    } catch (error) {

      console.error("Failed to fetch committed costs:", error);

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

  const getTypeBadge = (type: string) => {
    const config =
      type === "subcontract"
        ? "bg-blue-100 text-blue-800 border-blue-200"
        : "bg-purple-100 text-purple-800 border-purple-200";

    return (
      <span
        className={cn(
          "inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border",
          config,
        )}
      >
        {type === "subcontract" ? "SUBCONTRACT" : "PURCHASE ORDER"}
      </span>
    );
  };

  const totalAmount = commitments.reduce((sum, c) => sum + c.amount, 0);

  // Breakdown by type
  const subcontracts = commitments.filter((c) => c.type === "subcontract");
  const purchaseOrders = commitments.filter((c) => c.type === "purchase_order");
  const subcontractTotal = subcontracts.reduce((sum, c) => sum + c.amount, 0);
  const purchaseOrderTotal = purchaseOrders.reduce(
    (sum, c) => sum + c.amount,
    0,
  );

  const tabs = [
    { id: "commitments", label: "Commitments" },
    { id: "breakdown", label: "Breakdown" },
  ];

  return (
    <BaseSidebar
      open={open}
      onClose={onClose}
      title="Committed Costs"
      subtitle={costCode}
      size="xl"
    >
      {/* Tabs and Filter */}
      <div className="border-b border-border px-6 py-2 bg-muted flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                type="button"
                variant={activeTab === tab.id ? "outline" : "ghost"}
                onClick={() =>
                  setActiveTab(tab.id as "commitments" | "breakdown")
                }
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-all h-auto",
                  activeTab === tab.id
                    ? "bg-background text-primary shadow-sm"
                    : "text-foreground hover:text-foreground hover:bg-background/50",
                )}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex gap-2">
            {["all", "subcontract", "purchase_order"].map((type) => (
              <Button
                key={type}
                type="button"
                variant={typeFilter === type ? "default" : "ghost"}
                onClick={() => setTypeFilter(type as typeof typeFilter)}
                className={cn(
                  "px-4 py-1 text-xs font-medium rounded-full transition-all h-auto",
                  typeFilter === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-muted",
                )}
              >
                {type === "all"
                  ? "All"
                  : type === "subcontract"
                    ? "Subcontracts"
                    : "POs"}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <SidebarBody className="bg-background">
        {activeTab === "commitments" ? (
          <div className="p-6 space-y-4">
            {/* Total Summary */}
            <div className="rounded-xl border border-slate-200 shadow-sm p-4 bg-gradient-to-br from-blue-50 via-white to-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Total Committed Costs</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-foreground">Commitments</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {commitments.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Description Box */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-start gap-4">
                <FileCheck className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold">About Committed Costs</p>
                  <p className="mt-1">
                    These are approved subcontracts and purchase order
                    contracts, including any approved change orders. Status
                    includes Approved and Complete commitments.
                  </p>
                </div>
              </div>
            </div>

            {/* Commitments Table */}
            <div className="overflow-x-auto scrollbar-hide rounded-xl border border-slate-200 shadow-sm bg-background">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-4 font-semibold text-slate-800">
                      Number
                    </th>
                    <th className="text-left px-4 py-4 font-semibold text-slate-800">
                      Type
                    </th>
                    <th className="text-left px-4 py-4 font-semibold text-slate-800">
                      Vendor
                    </th>
                    <th className="text-left px-4 py-4 font-semibold text-slate-800">
                      Description
                    </th>
                    <th className="text-right px-4 py-4 font-semibold text-slate-800">
                      Amount
                    </th>
                    <th className="text-center px-4 py-4 font-semibold text-slate-800">
                      COs
                    </th>
                    <th className="text-left px-4 py-4 font-semibold text-slate-800">
                      Executed
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        Loading commitments...
                      </td>
                    </tr>
                  ) : commitments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No committed costs found for this cost code.
                      </td>
                    </tr>
                  ) : (
                    commitments.map((commitment) => (
                      <tr
                        key={commitment.id}
                        className="hover:bg-blue-50/40 transition-colors"
                      >
                        <td className="px-4 py-4 font-medium text-blue-600">
                          {commitment.commitmentNumber}
                        </td>
                        <td className="px-4 py-4">
                          {getTypeBadge(commitment.type)}
                        </td>
                        <td className="px-4 py-4 text-foreground text-xs">
                          {commitment.vendor || "-"}
                        </td>
                        <td
                          className="px-4 py-4 text-foreground max-w-xs truncate"
                          title={commitment.description}
                        >
                          {commitment.description}
                        </td>
                        <td className="px-4 py-4 text-right font-semibold tabular-nums text-foreground">
                          {formatCurrency(commitment.amount)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {commitment.changeOrders > 0 ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                              {commitment.changeOrders}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-foreground">
                          {formatDate(commitment.executedDate)}
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
              Breakdown of committed costs by commitment type.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 shadow-sm p-4 bg-background">
                <div className="mb-2">{getTypeBadge("subcontract")}</div>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {formatCurrency(subcontractTotal)}
                </p>
                <p className="text-sm text-foreground mt-1">
                  {subcontracts.length}{" "}
                  {subcontracts.length === 1 ? "subcontract" : "subcontracts"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 shadow-sm p-4 bg-background">
                <div className="mb-2">{getTypeBadge("purchase_order")}</div>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {formatCurrency(purchaseOrderTotal)}
                </p>
                <p className="text-sm text-foreground mt-1">
                  {purchaseOrders.length}{" "}
                  {purchaseOrders.length === 1
                    ? "purchase order"
                    : "purchase orders"}
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
