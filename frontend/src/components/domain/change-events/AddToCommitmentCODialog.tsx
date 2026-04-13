"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ds";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface Commitment {
  id: string;
  commitment_number: string;
  title: string | null;
  status: string | null;
  vendor_name: string | null;
  commitment_type: string | null;
}

interface AddToCommitmentCODialogProps {
  open: boolean;
  onClose: () => void;
  selectedChangeEventIds: string[];
  projectId: number;
  onSuccess: () => void;
  contractScope?: "all_contracts" | "matching_cost_codes";
  commitmentTypeFilter?: "any" | "subcontract" | "purchase_order";
  isBulkDraftMode?: boolean;
}

export function AddToCommitmentCODialog({
  open,
  onClose,
  selectedChangeEventIds,
  projectId,
  onSuccess,
  contractScope = "all_contracts",
  commitmentTypeFilter = "any",
  isBulkDraftMode = false,
}: AddToCommitmentCODialogProps) {
  const router = useRouter();
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [isLoadingCommitments, setIsLoadingCommitments] = useState(false);
  const [selectedCommitmentId, setSelectedCommitmentId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const count = selectedChangeEventIds.length;

  useEffect(() => {
    if (!open) {
      setSelectedCommitmentId("");
      return;
    }

    const fetchCommitments = async () => {
      setIsLoadingCommitments(true);
      try {
        const data = await apiFetch<unknown>(
          `/api/projects/${projectId}/change-events/commitment-options`,
          {
            method: "POST",
            body: JSON.stringify({
              change_event_ids: selectedChangeEventIds,
              scope: contractScope,
              commitment_type_filter: commitmentTypeFilter,
            }),
          },
        );
        const items = Array.isArray(data) ? data : (data as { data?: unknown[] }).data ?? [];
        setCommitments(
          items.map((c: Record<string, unknown>) => ({
            id: String(c.id),
            commitment_number: String(c.commitment_number ?? c.number ?? ""),
            title: (c.title as string) ?? null,
            status: (c.status as string) ?? null,
            vendor_name: (c.vendor_name as string) ?? null,
            commitment_type: (c.commitment_type as string) ?? (c.type as string) ?? null,
          })),
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not load commitments. Please try again.");
        setCommitments([]);
      } finally {
        setIsLoadingCommitments(false);
      }
    };

    fetchCommitments();
  }, [
    open,
    projectId,
    selectedChangeEventIds,
    contractScope,
    commitmentTypeFilter,
  ]);

  const handleCreatePCO = async () => {
    if (!isBulkDraftMode && !selectedCommitmentId) {
      toast.error("Select a commitment before continuing.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isBulkDraftMode) {
        if (commitments.length === 0) {
          toast.error("No matching commitments found for bulk draft creation.");
          return;
        }

        const results = await Promise.allSettled(
          commitments.map(async (commitment) => {
            const commitmentType = commitment.commitment_type === "purchase_order"
              ? "purchase_order"
              : "subcontract";
            const pcoTitle =
              `Bulk Draft PCO — ${commitment.title || commitment.commitment_number || commitment.id}`.trim();

            return apiFetch(
              `/api/projects/${projectId}/change-events/add-to-pco`,
              {
                method: "POST",
                body: JSON.stringify({
                  change_event_ids: selectedChangeEventIds,
                  pco_type: "commitment",
                  create_new: {
                    title: pcoTitle,
                    commitment_id: commitment.id,
                    commitment_type: commitmentType,
                  },
                }),
              },
            );
          }),
        );

        const successes = results.filter((result) => result.status === "fulfilled");
        const failures = results.filter((result) => result.status === "rejected");
        if (successes.length === 0) {
          throw new Error("No commitment PCOs were created");
        }

        if (failures.length > 0) {
          toast.warning(
            `Created ${successes.length} bulk draft PCO${successes.length === 1 ? "" : "s"}, ${failures.length} failed.`,
          );
        } else {
          toast.success(
            `Created ${successes.length} bulk draft PCO${successes.length === 1 ? "" : "s"}.`,
          );
        }

        onSuccess();
        onClose();
        router.push(`/${projectId}/commitment-pcos`);
        return;
      }

      const selectedCommitment = commitments.find((c) => c.id === selectedCommitmentId);
      const commitmentType = selectedCommitment?.commitment_type === "purchase_order"
        ? "purchase_order"
        : "subcontract";
      const pcoTitle =
        `PCO for ${count} change event${count === 1 ? "" : "s"} — ${selectedCommitment?.title || selectedCommitment?.commitment_number || ""}`.trim();

      const result = await apiFetch<{ pco?: { id?: string } }>(
        `/api/projects/${projectId}/change-events/add-to-pco`,
        {
          method: "POST",
          body: JSON.stringify({
            change_event_ids: selectedChangeEventIds,
            pco_type: "commitment",
            create_new: {
              title: pcoTitle,
              commitment_id: selectedCommitmentId,
              commitment_type: commitmentType,
            },
          }),
        },
      );
      toast.success(
        isBulkDraftMode
          ? "Bulk draft commitment PCO created successfully"
          : "Commitment PCO created successfully",
      );
      onSuccess();
      onClose();

      // Navigate to the newly created PCO detail page
      const pcoId = result?.pco?.id;
      if (pcoId) {
        router.push(`/${projectId}/commitment-pcos/${pcoId}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create commitment PCO");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isBulkDraftMode ? "Create Bulk Draft Commitment PCO" : "Add to Commitment PCO"}
          </DialogTitle>
          <DialogDescription>
            {isBulkDraftMode
              ? `Create one draft Commitment PCO for each matched commitment using ${count === 1 ? "1 selected change event" : `${count} selected change events`}.`
              : `Select a commitment to create a Potential Change Order for ${count === 1 ? "1 change event" : `${count} change events`}.`}
            {contractScope === "matching_cost_codes"
              ? " Showing contracts that match selected change event cost codes."
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          {isLoadingCommitments ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : commitments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {contractScope === "matching_cost_codes"
                  ? "No matching commitments found. Try 'Contracts (all)' to choose from all commitments."
                  : "No commitments found for this project. Create a subcontract or purchase order first."}
              </p>
            </div>
          ) : (
            <>
              {isBulkDraftMode ? (
                <div className="space-y-1 max-h-64 overflow-auto pr-1">
                  {commitments.map((commitment) => {
                    const typeLabel = commitment.commitment_type === "purchase_order"
                      ? "PO"
                      : commitment.commitment_type === "subcontract"
                        ? "Sub"
                        : "";
                    const label = [
                      `#${commitment.commitment_number}`,
                      commitment.title,
                      commitment.vendor_name,
                      typeLabel ? `(${typeLabel})` : "",
                    ]
                      .filter(Boolean)
                      .join(" — ");

                    return (
                      <div
                        key={commitment.id}
                        className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5"
                      >
                        <Label className="flex-1 text-sm leading-snug">{label}</Label>
                        {commitment.status ? <StatusBadge status={commitment.status} /> : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <RadioGroup
                  value={selectedCommitmentId}
                  onValueChange={setSelectedCommitmentId}
                  className="space-y-1"
                >
                  {commitments.map((commitment) => {
                    const typeLabel = commitment.commitment_type === "purchase_order"
                      ? "PO"
                      : commitment.commitment_type === "subcontract"
                        ? "Sub"
                        : "";
                    const label = [
                      `#${commitment.commitment_number}`,
                      commitment.title,
                      commitment.vendor_name,
                      typeLabel ? `(${typeLabel})` : "",
                    ]
                      .filter(Boolean)
                      .join(" — ");

                    return (
                      <div
                        key={commitment.id}
                        className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedCommitmentId(commitment.id)}
                      >
                        <RadioGroupItem
                          value={commitment.id}
                          id={`commitment-${commitment.id}`}
                        />
                        <Label
                          htmlFor={`commitment-${commitment.id}`}
                          className="flex-1 cursor-pointer text-sm leading-snug"
                        >
                          {label}
                        </Label>
                        {commitment.status && (
                          <StatusBadge status={commitment.status} />
                        )}
                      </div>
                    );
                  })}
                </RadioGroup>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreatePCO}
            disabled={
              isSubmitting ||
              isLoadingCommitments ||
              (isBulkDraftMode ? commitments.length === 0 : !selectedCommitmentId)
            }
          >
            {isSubmitting
              ? "Creating..."
              : isBulkDraftMode
                ? `Create Bulk Draft PCO`
                : `Create PCO for ${count} event${count === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
