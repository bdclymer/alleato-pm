"use client";

import { useState, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Check,
  Download,
  FileText,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableFooterCell } from "@/components/tables/DataTable";
import type { PrimeContractCO, ChangeOrderFormState } from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";

interface PrimeContractChangeOrdersTabProps {
  projectId: string;
  contractId: string;
  changeOrders: PrimeContractCO[];
  changeOrdersLoading: boolean;
  setChangeOrders: React.Dispatch<React.SetStateAction<PrimeContractCO[]>>;
  formatCurrency: (value: number | null | undefined) => string;
  onShowNewCoDialog: () => void;
  onStartEditCo: (co: PrimeContractCO) => void;
  onSetDeletingCo: (co: PrimeContractCO) => void;
  onSetRejectingCoId: (id: string) => void;
  onShowRejectCoDialog: () => void;
}

async function downloadPrimeContractChangeOrderPdf(
  changeOrder: Pick<PrimeContractCO, "id" | "change_order_number">,
) {
  try {
    const response = await fetch(
      `/api/document-center/prime-contract-change-order/${changeOrder.id}/pdf`,
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Failed to generate PDF");
    }

    const blob = await response.blob();
    const filename =
      response.headers
        .get("Content-Disposition")
        ?.match(/filename="?([^"]+)"?/)?.[1] ||
      `${changeOrder.change_order_number || "prime-contract-change-order"}.pdf`;

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
  changeOrdersLoading,
  setChangeOrders,
  formatCurrency,
  onShowNewCoDialog,
  onStartEditCo,
  onSetDeletingCo,
  onSetRejectingCoId,
  onShowRejectCoDialog,
}: PrimeContractChangeOrdersTabProps) {
  const changeOrdersCount = changeOrders.length;
  const approvedChangeOrders = useMemo(
    () => changeOrders.filter((co) => co.status === "approved"),
    [changeOrders],
  );
  const pendingChangeOrders = useMemo(
    () => changeOrders.filter((co) => co.status === "pending"),
    [changeOrders],
  );
  const rejectedChangeOrders = useMemo(
    () => changeOrders.filter((co) => co.status === "rejected"),
    [changeOrders],
  );
  const totalChangeOrderAmount = useMemo(
    () => changeOrders.reduce((sum, co) => sum + (co.amount ?? 0), 0),
    [changeOrders],
  );

  const handleApproveCo = async (coId: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/change-orders/${coId}/approve`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) },
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || "Failed to approve change order");
        return;
      }
      setChangeOrders((prev) =>
        prev.map((co) =>
          co.id === coId ? { ...co, status: "approved", approved_date: new Date().toISOString() } : co,
        ),
      );
      toast.success("Change order approved");
    } catch {
      toast.error("Failed to approve change order");
    }
  };

  const columns: ColumnDef<PrimeContractCO>[] = useMemo(
    () => [
      {
        accessorKey: "change_order_number",
        header: "CO Number",
        cell: ({ row }) => (
          <div className="font-medium">{row.original.change_order_number || "--"}</div>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
      },
      {
        accessorKey: "amount",
        header: () => <div className="text-right">Amount</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <span className={(row.original.amount ?? 0) < 0 ? "text-destructive" : ""}>
              {formatCurrency(row.original.amount ?? 0)}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "approved"
                ? "default"
                : row.original.status === "pending"
                  ? "secondary"
                  : "destructive"
            }
          >
            {row.original.status
              ? row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)
              : "--"}
          </Badge>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Requested",
        cell: ({ row }) => (
          <div className="text-sm">
            {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString() : "--"}
          </div>
        ),
      },
      {
        accessorKey: "approved_date",
        header: "Approved/Rejected",
        cell: ({ row }) => (
          <div className="text-sm">
            {row.original.approved_date
              ? new Date(row.original.approved_date).toLocaleDateString()
              : "--"}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={(event) => {
                event.stopPropagation();
                onStartEditCo(row.original);
              }}
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={(event) => {
                event.stopPropagation();
                void downloadPrimeContractChangeOrderPdf(row.original);
              }}
              title="Download PDF"
              aria-label={`Download ${row.original.change_order_number || "change order"} PDF`}
            >
              <Download />
            </Button>
            {row.original.status !== "approved" && row.original.status !== "rejected" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleApproveCo(row.original.id);
                  }}
                >
                  <Check />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs text-destructive"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSetRejectingCoId(row.original.id);
                    onShowRejectCoDialog();
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              </>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={(event) => {
                event.stopPropagation();
                onSetDeletingCo(row.original);
              }}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [
      formatCurrency,
      onSetDeletingCo,
      onSetRejectingCoId,
      onShowRejectCoDialog,
      onStartEditCo,
    ],
  );

  const footerRow = useMemo<DataTableFooterCell[]>(
    () => [
      { value: "Total Change Orders", colSpan: 2, align: "left" },
      { value: formatCurrency(totalChangeOrderAmount) },
      { value: "", colSpan: 4 },
    ],
    [formatCurrency, totalChangeOrderAmount],
  );

  return (
    <div>
      <div className="bg-background">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Change Orders</h3>
            <p className="text-sm text-muted-foreground">
              {changeOrdersCount} change order
              {changeOrdersCount === 1 ? "" : "s"} • {approvedChangeOrders.length} approved •{" "}
              {pendingChangeOrders.length} pending • {rejectedChangeOrders.length} rejected
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onShowNewCoDialog}>
            <Plus />
            New Change Order
          </Button>
        </div>
        <div>
          {changeOrdersLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Loading change orders...</p>
            </div>
          ) : changeOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-[var(--group-gap)] opacity-50" />
              <p>No change orders yet</p>
              <p className="text-xs mt-2">
                Create a change order to track contract modifications
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={changeOrders}
              showToolbar={false}
              showPagination={changeOrders.length > 25}
              footerRow={footerRow}
            />
          )}
        </div>
      </div>
    </div>
  );
}
