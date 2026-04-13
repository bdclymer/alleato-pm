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
  budgetLineId: string;
  projectId: string;
  costCode?: string;
}

export function ApprovedCOsModal({
  open,
  onClose,
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
      size="xl"
    >
      <SidebarTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as "approved" | "history")}
      />

      <SidebarBody className="bg-background">
        {activeTab === "approved" ? (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Total Summary */}
            <div className="rounded-lg border border-border p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Approved Change Orders
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Count</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {changeOrders.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="rounded-lg bg-muted/40 border border-border p-4">
              <div className="flex items-start gap-4">
                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-foreground">
                    About Approved COs
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    These are change orders from your prime contract that have
                    been approved and impact this budget line. Only approved
                    change orders are included in the budget calculations.
                  </p>
                </div>
              </div>
            </div>

            {/* Change Orders Table */}
            <InlineTable variant="read">
              <InlineTableHeader>
                <InlineTableHeaderRow>
                  <InlineTableHeaderCell>CO Number</InlineTableHeaderCell>
                  <InlineTableHeaderCell>Description</InlineTableHeaderCell>
                  <InlineTableHeaderCell>Contract</InlineTableHeaderCell>
                  <InlineTableHeaderCell align="right">Amount</InlineTableHeaderCell>
                  <InlineTableHeaderCell>Approved Date</InlineTableHeaderCell>
                  <InlineTableHeaderCell>Approved By</InlineTableHeaderCell>
                </InlineTableHeaderRow>
              </InlineTableHeader>
              <InlineTableBody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-10 text-center text-muted-foreground"
                    >
                      Loading change orders...
                    </td>
                  </tr>
                ) : changeOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-10 text-center text-muted-foreground"
                    >
                      No approved change orders found for this cost code.
                    </td>
                  </tr>
                ) : (
                  changeOrders.map((co) => (
                    <InlineTableRow key={co.id}>
                      <InlineTableCell className="font-medium text-primary">
                        {co.changeOrderNumber}
                      </InlineTableCell>
                      <InlineTableCell
                        className="max-w-xs truncate"
                        title={co.description}
                      >
                        {co.description}
                      </InlineTableCell>
                      <InlineTableCell>
                        {co.contractNumber}
                      </InlineTableCell>
                      <InlineTableCell
                        align="right"
                        numeric
                        className={cn(
                          "font-semibold",
                          co.amount < 0
                            ? "text-destructive"
                            : "text-foreground",
                        )}
                      >
                        {formatCurrency(co.amount)}
                      </InlineTableCell>
                      <InlineTableCell>
                        {formatDate(co.approvedDate)}
                      </InlineTableCell>
                      <InlineTableCell>
                        {co.approvedBy || "-"}
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
              View the complete history of all change orders (approved,
              rejected, and voided) for this cost code.
            </p>

            <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
              <p className="text-muted-foreground">History view coming soon</p>
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
