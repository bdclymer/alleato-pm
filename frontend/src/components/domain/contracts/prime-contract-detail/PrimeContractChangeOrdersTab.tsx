"use client";

import { useState, useMemo } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CO Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Approved/Rejected</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changeOrders.map((co) => (
                  <TableRow key={co.id}>
                    <TableCell className="font-medium">
                      {co.change_order_number || "--"}
                    </TableCell>
                    <TableCell>{co.description}</TableCell>
                    <TableCell className="text-right">
                      <span className={(co.amount ?? 0) < 0 ? "text-destructive" : ""}>
                        {formatCurrency(co.amount ?? 0)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          co.status === "approved"
                            ? "default"
                            : co.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {co.status ? co.status.charAt(0).toUpperCase() + co.status.slice(1) : "--"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {co.created_at ? new Date(co.created_at).toLocaleDateString() : "--"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {co.approved_date
                        ? new Date(co.approved_date).toLocaleDateString()
                        : "--"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => onStartEditCo(co)}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => void downloadPrimeContractChangeOrderPdf(co)}
                          title="Download PDF"
                          aria-label={`Download ${co.change_order_number || "change order"} PDF`}
                        >
                          <Download />
                        </Button>
                        {co.status !== "approved" && co.status !== "rejected" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleApproveCo(co.id)}
                            >
                              <Check />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs text-destructive"
                              onClick={() => {
                                onSetRejectingCoId(co.id);
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
                          onClick={() => onSetDeletingCo(co)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <tfoot>
                <TableRow className="bg-muted font-medium">
                  <TableCell colSpan={2}>Total Change Orders</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(
                      changeOrders.reduce((sum, co) => sum + (co.amount ?? 0), 0),
                    )}
                  </TableCell>
                  <TableCell colSpan={4}></TableCell>
                </TableRow>
              </tfoot>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
