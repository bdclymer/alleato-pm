"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmation } from "@/components/admin/table-explorer";
interface RowDetailClientProps {
  table: string;
  rowId: string;
  rowTitle: string;
  canEdit: boolean;
  canDelete: boolean;
}
export function RowDetailClient({
  table,
  rowId,
  rowTitle,
  canEdit,
  canDelete,
}: RowDetailClientProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const handleEdit = () => {
    router.push(`/admin/tables/${table}/${rowId}?edit=true`);
  };
  const handleDeleted = () => {
    router.push(`/admin/tables/${table}`);
  };
  return (
    <>
      {" "}
      <div className="flex items-center gap-2">
        {" "}
        {canEdit && (
          <Button variant="outline" onClick={handleEdit}>
            {" "}
            <Pencil className="mr-2 h-4 w-4" /> Edit{" "}
          </Button>
        )}{" "}
        {canDelete && (
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            {" "}
            <Trash2 className="mr-2 h-4 w-4" /> Delete{" "}
          </Button>
        )}{" "}
      </div>{" "}
      <DeleteConfirmation
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        table={table}
        rowId={rowId}
        rowTitle={rowTitle}
        onDeleted={handleDeleted}
      />{" "}
    </>
  );
}
