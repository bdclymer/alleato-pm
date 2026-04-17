"use client";

import { useState, useEffect, useCallback } from "react";
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

interface ExistingPco {
  id: string;
  pco_number: string;
  title: string | null;
  status: string | null;
  commitment_id: string | null;
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

type ActionMode = "create_new" | "link_existing";

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

  // "Link to existing" state
  const [actionMode, setActionMode] = useState<ActionMode>("create_new");
  const [existingPcos, setExistingPcos] = useState<ExistingPco[]>([]);
  const [isLoadingPcos, setIsLoadingPcos] = useState(false);
  const [selectedExistingPcoId, setSelectedExistingPcoId] = useState<string>("");

  const count = selectedChangeEventIds.length;

  // Fetch commitments when dialog opens
  useEffect(() => {
    if (!open) {
      setSelectedCommitmentId("");
      setActionMode("create_new");
      setExistingPcos([]);
      setSelectedExistingPcoId("");
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

    void fetchCommitments();
  }, [
    open,
    projectId,
    selectedChangeEventIds,
    contractScope,
    commitmentTypeFilter,
  ]);

  // Fetch existing PCOs for the selected commitment when "link_existing" mode and commitment selected
  const fetchExistingPcos = useCallback(async (commitmentId: string) => {
    if (!commitmentId) {
      setExistingPcos([]);
      setSelectedExistingPcoId("");
      return;
    }
    setIsLoadingPcos(true);
    try {
      const data = await apiFetch<unknown>(
        `/api/projects/${projectId}/commitment-pcos?commitment_id=${commitmentId}`,
      );
      const items = Array.isArray(data) ? data : (data as { data?: unknown[] }).data ?? [];
      setExistingPcos(
        (items as Record<string, unknown>[])
          .filter((p) => p.status !== "void")
          .map((p) => ({
            id: String(p.id),
            pco_number: String(p.pco_number ?? p.number ?? ""),
            title: (p.title as string) ?? null,
            status: (p.status as string) ?? null,
            commitment_id: (p.commitment_id as string) ?? null,
          })),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load existing PCOs.");
      setExistingPcos([]);
    } finally {
      setIsLoadingPcos(false);
    }
  }, [projectId]);

  // When mode switches to link_existing and a commitment is already selected, fetch PCOs
  useEffect(() => {
    if (actionMode === "link_existing" && selectedCommitmentId) {
      void fetchExistingPcos(selectedCommitmentId);
    }
  }, [actionMode, selectedCommitmentId, fetchExistingPcos]);

  // When commitment changes in link_existing mode, refresh PCOs
  const handleCommitmentChange = (id: string) => {
    setSelectedCommitmentId(id);
    setSelectedExistingPcoId("");
    if (actionMode === "link_existing") {
      void fetchExistingPcos(id);
    }
  };

  const handleSubmit = async () => {
    if (!isBulkDraftMode && !selectedCommitmentId) {
      toast.error("Select a commitment before continuing.");
      return;
    }
    if (actionMode === "link_existing" && !selectedExistingPcoId) {
      toast.error("Select an existing PCO to link to.");
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

      if (actionMode === "link_existing") {
        // Link CE(s) to existing PCO
        await apiFetch(
          `/api/projects/${projectId}/change-events/add-to-pco`,
          {
            method: "POST",
            body: JSON.stringify({
              change_event_ids: selectedChangeEventIds,
              pco_type: "commitment",
              existing_pco_id: selectedExistingPcoId,
            }),
          },
        );
        const pco = existingPcos.find((p) => p.id === selectedExistingPcoId);
        toast.success(`Linked to PCO ${pco?.pco_number ?? selectedExistingPcoId}`);
        onSuccess();
        onClose();
        router.push(`/${projectId}/commitment-pcos/${selectedExistingPcoId}`);
        return;
      }

      // Create new PCO
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
      toast.success("Commitment PCO created successfully");
      onSuccess();
      onClose();

      const pcoId = result?.pco?.id;
      if (pcoId) {
        router.push(`/${projectId}/commitment-pcos/${pcoId}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process commitment PCO");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  function commitmentLabel(commitment: Commitment): string {
    const typeLabel = commitment.commitment_type === "purchase_order"
      ? "PO"
      : commitment.commitment_type === "subcontract"
        ? "Sub"
        : "";
    return [
      `#${commitment.commitment_number}`,
      commitment.title,
      commitment.vendor_name,
      typeLabel ? `(${typeLabel})` : "",
    ]
      .filter(Boolean)
      .join(" — ");
  }

  const submitLabel = () => {
    if (isSubmitting) return "Processing...";
    if (isBulkDraftMode) return "Create Bulk Draft PCO";
    if (actionMode === "link_existing") return `Link to existing PCO`;
    return `Create PCO for ${count} event${count === 1 ? "" : "s"}`;
  };

  const isSubmitDisabled =
    isSubmitting ||
    isLoadingCommitments ||
    (isBulkDraftMode
      ? commitments.length === 0
      : !selectedCommitmentId ||
        (actionMode === "link_existing" && (!selectedExistingPcoId || isLoadingPcos)));

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
              : `Add ${count === 1 ? "1 change event" : `${count} change events`} to a commitment PCO.`}
            {contractScope === "matching_cost_codes"
              ? " Showing contracts that match selected change event cost codes."
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {/* Action mode toggle — only shown in single-select (non-bulk) mode */}
          {!isBulkDraftMode && (
            <RadioGroup
              value={actionMode}
              onValueChange={(v) => {
                setActionMode(v as ActionMode);
                setSelectedExistingPcoId("");
              }}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="create_new" id="mode-create" />
                <Label htmlFor="mode-create" className="cursor-pointer text-sm font-normal">
                  Create new PCO
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="link_existing" id="mode-link" />
                <Label htmlFor="mode-link" className="cursor-pointer text-sm font-normal">
                  Link to existing PCO
                </Label>
              </div>
            </RadioGroup>
          )}

          {/* Commitment list */}
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
                  {commitments.map((commitment) => (
                    <div
                      key={commitment.id}
                      className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5"
                    >
                      <Label className="flex-1 text-sm leading-snug">{commitmentLabel(commitment)}</Label>
                      {commitment.status ? <StatusBadge status={commitment.status} /> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Select commitment
                    </p>
                    <RadioGroup
                      value={selectedCommitmentId}
                      onValueChange={handleCommitmentChange}
                      className="space-y-1 max-h-48 overflow-y-auto pr-1"
                    >
                      {commitments.map((commitment) => (
                        <div
                          key={commitment.id}
                          className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleCommitmentChange(commitment.id)}
                        >
                          <RadioGroupItem
                            value={commitment.id}
                            id={`commitment-${commitment.id}`}
                          />
                          <Label
                            htmlFor={`commitment-${commitment.id}`}
                            className="flex-1 cursor-pointer text-sm leading-snug"
                          >
                            {commitmentLabel(commitment)}
                          </Label>
                          {commitment.status && (
                            <StatusBadge status={commitment.status} />
                          )}
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Existing PCO selector — only in link_existing mode */}
                  {actionMode === "link_existing" && selectedCommitmentId && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Select existing PCO
                      </p>
                      {isLoadingPcos ? (
                        <div className="space-y-2">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ) : existingPcos.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          No existing PCOs for this commitment. Switch to &ldquo;Create new PCO&rdquo; to create one.
                        </p>
                      ) : (
                        <RadioGroup
                          value={selectedExistingPcoId}
                          onValueChange={setSelectedExistingPcoId}
                          className="space-y-1 max-h-48 overflow-y-auto pr-1"
                        >
                          {existingPcos.map((pco) => (
                            <div
                              key={pco.id}
                              className="flex items-center gap-3 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => setSelectedExistingPcoId(pco.id)}
                            >
                              <RadioGroupItem value={pco.id} id={`pco-${pco.id}`} />
                              <Label
                                htmlFor={`pco-${pco.id}`}
                                className="flex-1 cursor-pointer text-sm leading-snug"
                              >
                                <span className="font-medium">#{pco.pco_number}</span>
                                {pco.title ? ` — ${pco.title}` : ""}
                              </Label>
                              {pco.status && <StatusBadge status={pco.status} />}
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                    </div>
                  )}
                </>
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
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
          >
            {submitLabel()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
