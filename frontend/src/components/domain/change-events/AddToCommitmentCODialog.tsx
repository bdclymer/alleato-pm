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
}

export function AddToCommitmentCODialog({
  open,
  onClose,
  selectedChangeEventIds,
  projectId,
  onSuccess,
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
        const res = await fetch(`/api/projects/${projectId}/commitments/export`);
        if (!res.ok) {
          // Fallback: try the commitments API
          const fallbackRes = await fetch(`/api/commitments?project_id=${projectId}`);
          if (!fallbackRes.ok) throw new Error("Failed to load commitments");
          const data = await fallbackRes.json();
          const items = Array.isArray(data) ? data : data.data ?? [];
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
          return;
        }
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.data ?? [];
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
      } catch {
        toast.error("Could not load commitments. Please try again.");
        setCommitments([]);
      } finally {
        setIsLoadingCommitments(false);
      }
    };

    fetchCommitments();
  }, [open, projectId]);

  const handleCreateCO = async () => {
    if (!selectedCommitmentId) {
      toast.error("Select a commitment before continuing.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/change-events/${selectedChangeEventIds[0]}/convert-to-change-order`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            changeEventIds: selectedChangeEventIds,
            commitmentId: selectedCommitmentId,
            type: "commitment",
          }),
        },
      );

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String(payload.error)
            : "Failed to create commitment change order";
        throw new Error(message);
      }

      const result = await res.json();
      toast.success("Commitment change order created successfully");
      onSuccess();
      onClose();

      // Navigate to the newly created CO
      const coId = result?.id ?? result?.data?.id;
      if (coId) {
        router.push(`/${projectId}/change-orders/commitment/${coId}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create commitment CO");
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
          <DialogTitle>Add to Commitment Change Order</DialogTitle>
          <DialogDescription>
            Select a commitment to create a change order for{" "}
            {count === 1 ? "1 change event" : `${count} change events`}.
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
                No commitments found for this project. Create a subcontract or
                purchase order first.
              </p>
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
            onClick={handleCreateCO}
            disabled={isSubmitting || !selectedCommitmentId || isLoadingCommitments}
          >
            {isSubmitting
              ? "Creating..."
              : `Create CO for ${count} event${count === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
