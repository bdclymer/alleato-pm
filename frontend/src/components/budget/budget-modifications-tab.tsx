"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

interface BudgetModificationsTabProps {
  projectId: string;
  onCreateClick: () => void;
  refreshTrigger?: number;
}

export function BudgetModificationsTab({
  projectId,
  onCreateClick,
  refreshTrigger = 0,
}: BudgetModificationsTabProps) {
  const [modifications, setModifications] = useState<BudgetModification[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedModId, setSelectedModId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchModifications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/budget/modifications`);
      if (!response.ok) {
        throw new Error("Failed to fetch budget modifications");
      }
      const data = await response.json();
      setModifications(data.modifications || []);
    } catch (error) {
      console.error("Failed to fetch budget modifications:", error);
      toast.error("Failed to load budget modifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModifications();
  }, [projectId, refreshTrigger]);

  const handleDelete = async () => {
    if (!selectedModId) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/budget/modifications?modificationId=${selectedModId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete modification");
      }

      toast.success("Budget modification deleted successfully");
      await fetchModifications();
      setDeleteDialogOpen(false);
      setSelectedModId(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete modification"
      );
    } finally {
      setDeleting(false);
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

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      approved: {
        className: "bg-green-100 text-green-800 border-green-200",
        label: "APPROVED",
      },
      pending: {
        className: "bg-yellow-100 text-yellow-800 border-yellow-200",
        label: "PENDING",
      },
      draft: {
        className: "bg-muted text-foreground border-border",
        label: "DRAFT",
      },
      void: {
        className: "bg-red-100 text-red-800 border-red-200",
        label: "VOID",
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

    return (
      <Badge
        variant="outline"
        className={cn("text-xs font-semibold", config.className)}
      >
        {config.label}
      </Badge>
    );
  };

  const getCostCodesDisplay = (lines: BudgetModificationLine[]): string => {
    if (lines.length === 0) return "-";
    if (lines.length === 1) return lines[0].costCodeTitle || lines[0].costCodeId;
    return `${lines[0].costCodeTitle || lines[0].costCodeId} +${lines.length - 1} more`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Budget Modifications</h3>
            <p className="text-sm text-muted-foreground">
              Manage budget adjustments, transfers, and change orders
            </p>
          </div>
          <Button onClick={onCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            New Modification
          </Button>
        </div>

        {/* Table */}
        {modifications.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/10 p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No budget modifications yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Create your first modification to track budget changes
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Number</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Cost Codes</TableHead>
                  <TableHead className="w-[140px] text-right">Amount</TableHead>
                  <TableHead className="w-[180px]">Created</TableHead>
                  <TableHead className="w-[180px]">Effective Date</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modifications.map((mod) => (
                  <TableRow key={mod.id}>
                    <TableCell className="font-medium text-blue-600">
                      {mod.number}
                    </TableCell>
                    <TableCell>{getStatusBadge(mod.status)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{mod.title}</p>
                        {mod.reason && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {mod.reason}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {getCostCodesDisplay(mod.lines)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium tabular-nums",
                        mod.amount < 0 ? "text-red-600" : "text-green-600"
                      )}
                    >
                      {formatCurrency(mod.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(mod.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {mod.effectiveDate ? formatDate(mod.effectiveDate) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {mod.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedModId(mod.id);
                              setDeleteDialogOpen(true);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget Modification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this draft modification? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
