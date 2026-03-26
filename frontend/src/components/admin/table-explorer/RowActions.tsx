"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Eye, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmation } from "./DeleteConfirmation";
import { duplicateTableRow } from "@/app/(other)/actions/admin-table-actions";
import { type TableConfig } from "@/lib/table-registry";
import { toast } from "sonner";

interface RowActionsProps {
  table: string;
  rowId: string | number;
  rowTitle?: string;
  config: TableConfig;
}

export function RowActions({
  table,
  rowId,
  rowTitle,
  config,
}: RowActionsProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleView = () => {
    router.push(`/admin/tables/${table}/${rowId}`);
  };

  const handleEdit = () => {
    router.push(`/admin/tables/${table}/${rowId}?edit=true`);
  };

  const handleDuplicate = () => {
    startTransition(async () => {
      const result = await duplicateTableRow(table, rowId);

      if (result.success) {
        toast.success("Row duplicated successfully");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to duplicate row");
      }
    });
  };

  const handleDeleted = () => {
    router.refresh();
  };

  const { permissions } = config;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={isPending}>
            <MoreHorizontal />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {permissions.read && (
            <DropdownMenuItem onClick={handleView}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
          )}
          {permissions.update && (
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          {permissions.create && (
            <DropdownMenuItem onClick={handleDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
          )}
          {permissions.delete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                variant="destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmation
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        table={table}
        rowId={rowId}
        rowTitle={rowTitle}
        onDeleted={handleDeleted}
      />
    </>
  );
}
