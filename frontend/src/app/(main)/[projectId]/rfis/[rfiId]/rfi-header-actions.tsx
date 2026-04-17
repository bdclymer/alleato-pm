"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

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
import { apiFetch } from "@/lib/api-client";
import type { RfiEditValues } from "@/lib/schemas/rfi-schema";
import type { RFI } from "@/types/database-extensions";

interface RfiHeaderActionsProps {
  rfi: Pick<RFI, "id" | "status" | "number" | "subject">;
  projectId: number;
}

export function RfiHeaderActions({ rfi, projectId }: RfiHeaderActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const updateRfi = useUpdateRfi(projectId);
  const deleteRfi = useDeleteRfi(projectId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isCreatingCE, setIsCreatingCE] = useState(false);

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

  const handleCreateChangeEvent = async () => {
    setIsCreatingCE(true);
    try {
      const result = await apiFetch<{ id?: string; data?: { id?: string } }>(
        `/api/projects/${projectId}/change-events`,
        {
          method: "POST",
          body: JSON.stringify({
            title: rfi.subject,
            origin: "rfis",
            origin_id: rfi.id,
            status: "Open",
          }),
        },
      );
      const newId = result?.data?.id ?? result?.id;
      toast.success("Change event created from RFI");
      if (newId) {
        router.push(`/${projectId}/change-events/${newId}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create change event");
    } finally {
      setIsCreatingCE(false);
    }
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

        <Button
          size="sm"
          variant="outline"
          onClick={() => void handleCreateChangeEvent()}
          disabled={isCreatingCE}
        >
          {isCreatingCE ? "Creating…" : "Create Change Event"}
        </Button>

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
