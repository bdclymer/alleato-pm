"use client";

import { useCallback, useMemo } from "react";

import { Check, Download, MoreVertical, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import type { PrimeContractCO } from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { StatusBadge } from "@/components/ds";
import { UnifiedTablePage, type TableColumn } from "@/components/tables/unified/unified-table-page";
import { Button } from "@/components/ui/button";
import { apiFetch, apiFetchBlob } from "@/lib/api-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PrimeContractChangeOrdersTabProps {
  projectId: string;
  contractId: string;
  changeOrders: PrimeContractCO[];
  setChangeOrders: React.Dispatch<React.SetStateAction<PrimeContractCO[]>>;
  formatCurrency: (value: number | null | undefined) => string;
  onStartEditCo: (co: PrimeContractCO) => void;
  onSetDeletingCo: (co: PrimeContractCO) => void;
  onSetRejectingCoId: (id: string) => void;
  onShowRejectCoDialog: () => void;
}

async function downloadPrimeContractChangeOrderPdf(
  changeOrder: Pick<PrimeContractCO, "id" | "change_order_number">,
) {
  try {
    const blob = await apiFetchBlob(
      `/api/document-center/prime-contract-change-order/${changeOrder.id}/pdf`,
    );
    const filename = `${changeOrder.change_order_number || "prime-contract-change-order"}.pdf`;

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Failed to download change order PDF",
    );
  }
}

export function PrimeContractChangeOrdersTab({
  projectId,
  contractId,
  changeOrders,
  setChangeOrders,
  formatCurrency,
  onStartEditCo,
  onSetDeletingCo,
  onSetRejectingCoId,
  onShowRejectCoDialog,
}: PrimeContractChangeOrdersTabProps) {
  const totalChangeOrderAmount = useMemo(
    () => changeOrders.reduce((sum, co) => sum + (co.amount ?? 0), 0),
    [changeOrders],
  );

  const handleApproveCo = useCallback(async (coId: string) => {
    try {
      await apiFetch(
        `/api/projects/${projectId}/prime-contract-change-orders/${coId}/approve`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) },
      );
      setChangeOrders((prev) =>
        prev.map((co) =>
          co.id === coId ? { ...co, status: "approved", approved_date: new Date().toISOString() } : co,
        ),
      );
      toast.success("Change order approved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve change order");
    }
  }, [contractId, projectId, setChangeOrders]);

  const columns: TableColumn<PrimeContractCO>[] = useMemo(
    () => [
      {
        id: "change_order_number",
        label: "Number",
        alwaysVisible: true,
        render: (co) => (
          <div className="font-medium">{co.change_order_number || "—"}</div>
        ),
      },
      {
        id: "revision",
        label: "Revision",
        render: (co) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {co.revision != null ? co.revision : "—"}
          </span>
        ),
      },
      {
        id: "title",
        label: "Title",
        render: (co) => (
          <span className="text-foreground">{co.title || co.description || "—"}</span>
        ),
      },
      {
        id: "status",
        label: "Status",
        render: (co) => <StatusBadge status={co.status ?? "pending"} />,
      },
      {
        id: "executed",
        label: "Executed",
        render: (co) => (
          <span className="text-sm text-muted-foreground">
            {co.executed ? "Yes" : "—"}
          </span>
        ),
      },
      {
        id: "amount",
        label: "Amount",
        render: (co) => (
          <div className="text-right tabular-nums">
            <span className={(co.amount ?? 0) < 0 ? "text-destructive" : ""}>
              {formatCurrency(co.amount ?? 0)}
            </span>
          </div>
        ),
      },
      {
        id: "requested_date",
        label: "Date Initiated",
        render: (co) => (
          <span className="text-sm text-muted-foreground">
            {co.requested_date ? new Date(co.requested_date).toLocaleDateString() : "—"}
          </span>
        ),
      },
      {
        id: "due_date",
        label: "Due Date",
        render: (co) => (
          <span className="text-sm text-muted-foreground">
            {co.due_date ? new Date(co.due_date).toLocaleDateString() : "—"}
          </span>
        ),
      },
      {
        id: "review_date",
        label: "Review Date",
        render: (co) => (
          <span className="text-sm text-muted-foreground">
            {co.review_date ? new Date(co.review_date).toLocaleDateString() : "—"}
          </span>
        ),
      },
      {
        id: "designated_reviewer",
        label: "Designated Reviewer",
        render: (co) => (
          <span className="text-sm text-muted-foreground">
            {co.designated_reviewer || "—"}
          </span>
        ),
      },
    ],
    [formatCurrency],
  );

  return (
    <div className="space-y-3">
      <SectionRuleHeading label="Change Orders" />
      <UnifiedTablePage
        header={{ title: "" }}
        toolbar={{
          totalItems: changeOrders.length,
          filteredItems: changeOrders.length,
          selectedCount: 0,
          searchValue: "",
          onSearchChange: () => {},
          currentView: "table",
          onViewChange: () => {},
        }}
        data={{ items: changeOrders, isLoading: false }}
        table={{
          columns,
          getRowId: (co) => co.id,
          rowActions: (co) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => onStartEditCo(co)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void downloadPrimeContractChangeOrderPdf(co)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </DropdownMenuItem>
                {co.status !== "approved" && co.status !== "rejected" && (
                  <>
                    <DropdownMenuItem onClick={() => void handleApproveCo(co.id)}>
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => { onSetRejectingCoId(co.id); onShowRejectCoDialog(); }}
                      className="text-destructive focus:text-destructive"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onSetDeletingCo(co)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ),
        }}
        features={{
          enableSearch: false,
          enableViews: false,
          enableFilters: false,
          enableColumnToggle: false,
          enableExport: false,
          enableBulkDelete: false,
          enableRowSelection: false,
        }}
        layout={{
          containerPadding: false,
          toolbarInlineWithHeader: true,
          containerClassName: "min-h-0 pb-0",
        }}
        emptyState={{
          title: "No change orders",
          description: "Change orders will appear here when created.",
          filteredDescription: "No change orders found.",
          isFiltered: false,
        }}
        footerTotals={{
          label: "Total",
          values: {
            amount: <span className="font-semibold">{formatCurrency(totalChangeOrderAmount)}</span>,
          },
        }}
      />
    </div>
  );
}
