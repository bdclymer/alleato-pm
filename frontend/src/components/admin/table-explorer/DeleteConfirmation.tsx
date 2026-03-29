"use client";

import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteTableRow } from "@/app/(main)/actions/admin-table-actions";
import { toast } from "sonner";

interface DeleteConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: string;
  rowId: string | number;
  rowTitle?: string;
  onDeleted?: () => void;
}

export function DeleteConfirmation({
  open,
  onOpenChange,
  table,
  rowId,
  rowTitle,
  onDeleted,
}: DeleteConfirmationProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirmText !== "DELETE") return;

    startTransition(async () => {
      const result = await deleteTableRow(table, rowId);

      if (result.success) {
        toast.success("Row deleted successfully");
        onOpenChange(false);
        setConfirmText("");
        onDeleted?.();
      } else {
        toast.error(result.error ?? "Failed to delete row");
      }
    });
  };

  const handleClose = () => {
    if (!isPending) {
      onOpenChange(false);
      setConfirmText("");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Row</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Are you sure you want to delete{" "}
                {rowTitle ? (
                  <span className="font-medium text-foreground">
                    &quot;{rowTitle}&quot;
                  </span>
                ) : (
                  "this row"
                )}
                ? This action cannot be undone.
              </p>
              <p className="text-sm">
                Type{" "}
                <span className="font-mono font-bold text-destructive">
                  DELETE
                </span>{" "}
                to confirm:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="Type DELETE to confirm"
                disabled={isPending}
                className="font-mono"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmText !== "DELETE" || isPending}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
