"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

import {
  Button,
  DetailActions,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ds";
import { useUpdateRfi, useDeleteRfi } from "@/hooks/use-rfis";
import type { RfiEditValues } from "@/lib/schemas/rfi-schema";
import type { RFI } from "@/types/database-extensions";

interface RfiHeaderActionsProps {
  rfi: Pick<RFI, "id" | "status" | "number">;
  projectId: number;
}

export function RfiHeaderActions({ rfi, projectId }: RfiHeaderActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const updateRfi = useUpdateRfi(projectId);
  const deleteRfi = useDeleteRfi(projectId);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    await updateRfi.mutateAsync({
      rfiId: rfi.id,
      data: { status: newStatus } as Record<string, unknown> & RfiEditValues,
    });
    router.refresh();
  };

  const handleDelete = async () => {
    await deleteRfi.mutateAsync(rfi.id);
    router.push(`/${projectId}/rfis`);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {rfi.status === "draft" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStatusChange("open")}
            disabled={updateRfi.isPending}
          >
            Open RFI
          </Button>
        )}
        {rfi.status === "open" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStatusChange("closed")}
            disabled={updateRfi.isPending}
          >
            Close RFI
          </Button>
        )}
        {(rfi.status === "closed" || rfi.status === "closed-draft") && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              handleStatusChange(rfi.status === "closed-draft" ? "draft" : "open")
            }
            disabled={updateRfi.isPending}
          >
            Reopen
          </Button>
        )}

        <DetailActions
          onEdit={() => router.push(`${pathname}?mode=edit`)}
          onDelete={() => setDeleteOpen(true)}
        />
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete RFI #{rfi.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This RFI will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
