"use client";

import { useState, useEffect, useCallback } from "react";
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
import { toast } from "sonner";
import { Check, X, Send, Ban, Loader2 } from "lucide-react";

interface BudgetModificationLine {
  id: string;
  costCodeId: string;
  costTypeId: string;
  subJobId: string | null;
  amount: number;
  description: string | null;
  costCodeTitle: string;
}

interface BudgetModification {
  id: string;
  number: string;
  title: string;
  reason: string | null;
  amount: number;
  status: "draft" | "pending" | "approved" | "void";
  effectiveDate: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  lines: BudgetModificationLine[];
}

interface BudgetModificationsModalProps {
  open: boolean;
  onClose: () => void;
  budgetLineId: string;
  projectId: string;
  costCode?: string;
  onModificationChanged?: () => void;
}

type StatusFilter = "all" | "approved" | "pending" | "draft" | "void";

export function BudgetModificationsModal({
  open,
  onClose,
  budgetLineId,
  projectId,
  onModificationChanged,
}: BudgetModificationsModalProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "details">("summary");
  const [modifications, setModifications] = useState<BudgetModification[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchModifications = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam =
        statusFilter !== "all" ? `&status=${statusFilter}` : "";
      const url = `/api/projects/${projectId}/budget/modifications?budgetLineId=${budgetLineId}${statusParam}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setModifications(data.modifications || []);
      }
    } catch (error) {
      console.error("Failed to fetch budget modifications:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId, budgetLineId, statusFilter]);

  useEffect(() => {
    if (open) {
      fetchModifications();
    }
  }, [open, fetchModifications]);

  const handleAction = async (
    modificationId: string,
    action: "submit" | "approve" | "reject" | "void",
  ) => {
    setActionLoading(modificationId);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/budget/modifications`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modificationId, action }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${action} modification`);
      }

      const result = await response.json();
      toast.success(result.message);

      await fetchModifications();

      if (action === "approve" || action === "void") {
        onModificationChanged?.();
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to ${action} modification`,
      );
    } finally {
      setActionLoading(null);
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
      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border border-border bg-muted text-foreground">
        {status.toUpperCase()}
      </span>
    );
  };

  const getAvailableActions = (
    status: string,
  ): Array<{
    action: "submit" | "approve" | "reject" | "void";
    label: string;
    icon: React.ReactNode;
    variant: "default" | "outline" | "destructive";
  }> => {
    switch (status) {
      case "draft":
        return [
          {
            action: "submit",
            label: "Submit",
            icon: <Send className="h-3 w-3" />,
            variant: "default",
          },
        ];
      case "pending":
        return [
          {
            action: "approve",
            label: "Approve",
            icon: <Check className="h-3 w-3" />,
            variant: "default",
          },
          {
            action: "reject",
            label: "Reject",
            icon: <X className="h-3 w-3" />,
            variant: "outline",
          },
        ];
      case "approved":
        return [
          {
            action: "void",
            label: "Void",
            icon: <Ban className="h-3 w-3" />,
            variant: "destructive",
          },
        ];
      default:
        return [];
    }
  };

  const approvedTotal = modifications
    .filter((m) => m.status === "approved")
    .reduce((sum, m) => sum + m.amount, 0);

  const pendingTotal = modifications
    .filter((m) => m.status === "pending")
    .reduce((sum, m) => sum + m.amount, 0);

  const tabs = [
    { id: "summary", label: "Summary" },
    { id: "details", label: "Details" },
  ];

  return (
    <BaseSidebar
      open={open}
      onClose={onClose}
      title="Budget Modifications"
      size="xl"
    >
      <SidebarTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as "summary" | "details")}
      />

      <SidebarBody className="bg-background">
        {activeTab === "summary" ? (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Totals Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border p-4 bg-muted/30">
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatCurrency(approvedTotal)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Affects budget totals
                </p>
              </div>
              <div className="rounded-lg border border-border p-4 bg-muted/30">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatCurrency(pendingTotal)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Awaiting approval
                </p>
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
              {(
                [
                  "all",
                  "approved",
                  "pending",
                  "draft",
                  "void",
                ] as StatusFilter[]
              ).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "ghost"}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-medium rounded-full transition-all h-auto",
                    statusFilter === status
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-muted",
                  )}
                >
                  {status === "all"
                    ? "All"
                    : status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>

            {/* Modifications List */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading modifications...
                </div>
              ) : modifications.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  No budget modifications found
                  {statusFilter !== "all"
                    ? ` with status "${statusFilter}"`
                    : " for this cost code"}
                  .
                </div>
              ) : (
                modifications.map((mod) => {
                  const actions = getAvailableActions(mod.status);
                  const isLoading = actionLoading === mod.id;

                  return (
                    <div
                      key={mod.id}
                      className="rounded-lg border border-border bg-background transition-shadow"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-primary">
                                {mod.number}
                              </span>
                              {getStatusBadge(mod.status)}
                            </div>
                            <p className="text-sm text-foreground mt-1">
                              {mod.title}
                            </p>
                            {mod.reason && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                {mod.reason}
                              </p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <p
                              className={cn(
                                "text-lg font-bold tabular-nums",
                                mod.amount < 0
                                  ? "text-destructive"
                                  : "text-foreground",
                              )}
                            >
                              {formatCurrency(mod.amount)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              Effective: {formatDate(mod.effectiveDate)}
                            </span>
                            <span>Created: {formatDate(mod.createdAt)}</span>
                          </div>

                          {actions.length > 0 && (
                            <div className="flex items-center gap-2">
                              {actions.map(
                                ({ action, label, icon, variant }) => (
                                  <Button
                                    key={action}
                                    size="sm"
                                    variant={variant}
                                    onClick={() => handleAction(mod.id, action)}
                                    disabled={isLoading}
                                    className="h-7 text-xs gap-1"
                                  >
                                    {isLoading ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      icon
                                    )}
                                    {label}
                                  </Button>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Detailed line-item breakdown of budget modifications.
            </p>

            {loading ? (
              <div className="text-center py-10 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : modifications.length === 0 ? (
              <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
                <p className="text-muted-foreground">No modifications found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {modifications.map((mod) => (
                  <div
                    key={mod.id}
                    className="rounded-lg border border-border bg-background"
                  >
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary">
                            {mod.number}
                          </span>
                          {getStatusBadge(mod.status)}
                        </div>
                        <span
                          className={cn(
                            "font-bold tabular-nums",
                            mod.amount < 0
                              ? "text-destructive"
                              : "text-foreground",
                          )}
                        >
                          {formatCurrency(mod.amount)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-1">
                        {mod.title}
                      </p>
                    </div>

                    <div className="border-t border-border">
                      <InlineTable variant="read">
                        <InlineTableHeader>
                          <InlineTableHeaderRow>
                            <InlineTableHeaderCell>Cost Code</InlineTableHeaderCell>
                            <InlineTableHeaderCell>Description</InlineTableHeaderCell>
                            <InlineTableHeaderCell align="right">Amount</InlineTableHeaderCell>
                          </InlineTableHeaderRow>
                        </InlineTableHeader>
                        <InlineTableBody>
                          {mod.lines.map((line) => (
                            <InlineTableRow key={line.id}>
                              <InlineTableCell className="font-medium">
                                {line.costCodeId}
                              </InlineTableCell>
                              <InlineTableCell>
                                {line.description || line.costCodeTitle || "-"}
                              </InlineTableCell>
                              <InlineTableCell
                                align="right"
                                numeric
                                className={cn(
                                  "font-semibold",
                                  line.amount < 0
                                    ? "text-destructive"
                                    : "text-foreground",
                                )}
                              >
                                {formatCurrency(line.amount)}
                              </InlineTableCell>
                            </InlineTableRow>
                          ))}
                        </InlineTableBody>
                      </InlineTable>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
