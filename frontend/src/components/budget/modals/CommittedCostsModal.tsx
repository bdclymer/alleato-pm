"use client";

import { useState, useEffect } from "react";
import {
  BaseSidebar,
  SidebarBody,
  SidebarFooter,
} from "./BaseSidebar";
import { Button } from "@/components/ui/button";

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

export function CommittedCostsModal({
  open,
  onClose,
  costCode,
  budgetLineId,
  projectId,
}: CommittedCostsModalProps) {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchCommitments();
    }
  }, [open, budgetLineId, projectId]);

  const fetchCommitments = async () => {
    setLoading(true);
    try {
      const url = `/api/projects/${projectId}/budget/commitments?budgetLineId=${budgetLineId}&status=approved,complete`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCommitments(data.commitments || []);
      }
    } catch (error) {
      console.error("Failed to fetch committed costs:", error);
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

  const totalAmount = commitments.reduce((sum, c) => sum + c.amount, 0);

  return (
    <BaseSidebar
      open={open}
      onClose={onClose}
      title="Committed Costs"
      size="xl"
    >
      <SidebarBody className="bg-background">
        <div className="p-4 sm:p-6 space-y-3">
          {/* Inline stats */}
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-muted-foreground">
              {commitments.length} commitment{commitments.length !== 1 ? "s" : ""} · Approved subcontracts and purchase orders for this cost code.
            </p>
            <p className="text-sm font-semibold text-foreground tabular-nums whitespace-nowrap ml-4">
              {formatCurrency(totalAmount)}
            </p>
          </div>

          {/* Commitments Table */}
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
                    Vendor
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">
                    Description
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-foreground">
                    Amount
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-foreground">
                    COs
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">
                    Executed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
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
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-primary">
                        {commitment.commitmentNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border border-border bg-muted text-foreground">
                          {commitment.type === "subcontract" ? "SC" : "PO"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground text-xs">
                        {commitment.vendor || "-"}
                      </td>
                      <td
                        className="px-4 py-3 text-foreground max-w-xs truncate"
                        title={commitment.description}
                      >
                        {commitment.description}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                        {formatCurrency(commitment.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {commitment.changeOrders > 0 ? (
                          <span className="text-foreground text-xs font-medium">
                            {commitment.changeOrders}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {formatDate(commitment.executedDate)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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
