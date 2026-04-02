"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageShell } from "@/components/layout";
import {
  PCOWorkspace,
  type GroupedCE,
  type LocalLineItem,
  type PCOFormValues,
} from "@/components/domain/pcos/PCOWorkspace";
import { useProjectChangeEvents } from "@/hooks/use-change-events";
import {
  usePCO,
  useUpdatePCO,
  useGroupChangeEvent,
  useUngroupChangeEvent,
  useCreatePCOLineItem,
  useDeletePCOLineItem,
} from "@/hooks/use-pcos";
import type { ChangeEvent } from "@/types/change-events";

// =============================================================================
// Page Component
// =============================================================================

export default function EditPCOPage() {
  const params = useParams<{ projectId: string; pcoId: string }>();
  const router = useRouter();
  const projectId = params.projectId ?? "";
  const pcoId = params.pcoId ?? "";
  const projectIdNum = parseInt(projectId, 10);

  // Fetch PCO data
  const { data: pco, isLoading: isLoadingPCO, error: pcoError } = usePCO(
    projectId,
    pcoId,
  );

  // Fetch all change events for left panel
  const { changeEvents, isLoading: isLoadingCEs } = useProjectChangeEvents(
    projectIdNum,
    { limit: 500, enabled: projectIdNum > 0 },
  );

  // Mutations
  const updatePCO = useUpdatePCO(projectId, pcoId);
  const groupCE = useGroupChangeEvent(projectId, pcoId);
  const ungroupCE = useUngroupChangeEvent(projectId, pcoId);
  const createLineItem = useCreatePCOLineItem(projectId, pcoId);
  const deleteLineItem = useDeletePCOLineItem(projectId, pcoId);

  // Form state — initialized from loaded PCO
  const [formValues, setFormValues] = React.useState<PCOFormValues>({
    title: "",
    type: "CLIENT_REQUESTED",
    description: "",
    rfqRequired: false,
  });
  const [groupedCEs, setGroupedCEs] = React.useState<GroupedCE[]>([]);
  const [lineItems, setLineItems] = React.useState<LocalLineItem[]>([]);
  const [markupPercentage, setMarkupPercentage] = React.useState(0);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [initialized, setInitialized] = React.useState(false);

  // Populate form from loaded PCO (once)
  React.useEffect(() => {
    if (!pco || initialized) return;

    setFormValues({
      title: pco.title ?? "",
      type: pco.type ?? "CLIENT_REQUESTED",
      description: pco.description ?? "",
      rfqRequired: pco.rfq_required ?? false,
    });

    setMarkupPercentage(pco.markup_percentage ?? 0);

    // Map grouped change events
    if (pco.change_events) {
      setGroupedCEs(
        pco.change_events.map((ce) => ({
          id: String(ce.id),
          number: ce.number,
          title: ce.title,
          type: ce.type,
          estimatedAmount: ce.estimated_amount ?? 0,
        })),
      );
    }

    // Map existing line items
    if (pco.line_items) {
      setLineItems(
        pco.line_items.map((li) => ({
          tempId: String(li.id),
          description: li.description ?? "",
          quantity: li.quantity ?? 1,
          uom: li.uom ?? "EA",
          unitCost: li.unit_cost ?? 0,
          category: li.category ?? "",
        })),
      );
    }

    setInitialized(true);
  }, [pco, initialized]);

  // Handlers
  const handleAddCE = React.useCallback((ce: ChangeEvent) => {
    setGroupedCEs((prev) => [
      ...prev,
      {
        id: String(ce.id),
        number: ce.number ?? `CE-${ce.id}`,
        title: ce.title,
        type: ce.type,
        estimatedAmount: Number(ce.rom ?? ce.cost_rom ?? 0),
      },
    ]);
  }, []);

  const handleRemoveCE = React.useCallback((ceId: string) => {
    setGroupedCEs((prev) => prev.filter((ce) => ce.id !== ceId));
  }, []);

  const handleAddLineItem = React.useCallback(() => {
    setLineItems((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        description: "",
        quantity: 1,
        uom: "EA",
        unitCost: 0,
        category: "",
      },
    ]);
  }, []);

  const handleUpdateLineItem = React.useCallback(
    (tempId: string, field: keyof LocalLineItem, value: string | number) => {
      setLineItems((prev) =>
        prev.map((li) =>
          li.tempId === tempId ? { ...li, [field]: value } : li,
        ),
      );
    },
    [],
  );

  const handleRemoveLineItem = React.useCallback((tempId: string) => {
    setLineItems((prev) => prev.filter((li) => li.tempId !== tempId));
  }, []);

  const handleSave = async (submitAfter = false) => {
    if (!formValues.title.trim()) {
      toast.error("Please enter a title for the PCO.");
      return;
    }

    submitAfter ? setIsSubmitting(true) : setIsSaving(true);

    try {
      const subtotal = lineItems.reduce(
        (sum, li) => sum + li.quantity * li.unitCost,
        0,
      );
      const markupAmount = subtotal * (markupPercentage / 100);
      const total = subtotal + markupAmount;

      // Update main PCO data
      await updatePCO.mutateAsync({
        title: formValues.title.trim(),
        type: formValues.type,
        description: formValues.description.trim() || null,
        rfq_required: formValues.rfqRequired,
        markup_percentage: markupPercentage || null,
        estimated_value: total,
        ...(submitAfter ? { status: "SUBMITTED" as const } : {}),
      });

      // Handle CE grouping changes
      const existingCEIds = new Set(
        (pco?.change_events ?? []).map((ce) => String(ce.id)),
      );
      const currentCEIds = new Set(groupedCEs.map((ce) => ce.id));

      // Group newly added CEs
      const toGroup = groupedCEs.filter((ce) => !existingCEIds.has(ce.id));
      for (const ce of toGroup) {
        await groupCE.mutateAsync(ce.id);
      }

      // Ungroup removed CEs
      const toUngroup = [...existingCEIds].filter((id) => !currentCEIds.has(id));
      for (const ceId of toUngroup) {
        await ungroupCE.mutateAsync(ceId);
      }

      // Handle line items — simple approach: sync by creating new / keeping existing
      // For new line items (tempId is a UUID, not a numeric DB id)
      for (const li of lineItems) {
        const isNew = isNaN(Number(li.tempId));
        if (isNew) {
          await createLineItem.mutateAsync({
            description: li.description,
            quantity: li.quantity,
            uom: li.uom,
            unit_cost: li.unitCost,
            line_amount: li.quantity * li.unitCost,
            category: li.category || null,
          });
        }
      }

      // Delete removed line items
      const currentLineItemIds = new Set(lineItems.map((li) => li.tempId));
      const existingLineItemIds = (pco?.line_items ?? []).map((li) =>
        String(li.id),
      );
      for (const existingId of existingLineItemIds) {
        if (!currentLineItemIds.has(existingId)) {
          await deleteLineItem.mutateAsync(Number(existingId));
        }
      }

      if (submitAfter) {
        toast.success("PCO updated and submitted to client.");
      }

      router.push(`/${projectId}/pcos`);
    } catch {
      // Individual mutation hooks handle their own error toasts
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  };

  if (isLoadingPCO) {
    return (
      <PageShell
        variant="form"
        title="Edit Potential Change Order"
        onBack={() => router.back()}
      >
        <div className="py-16 text-center text-sm text-muted-foreground">
          Loading PCO...
        </div>
      </PageShell>
    );
  }

  if (pcoError || !pco) {
    return (
      <PageShell
        variant="form"
        title="Edit Potential Change Order"
        onBack={() => router.back()}
      >
        <div className="py-16 text-center text-sm text-destructive">
          {pcoError?.message ?? "PCO not found."}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      variant="form"
      title={`Edit PCO ${pco.number}`}
      onBack={() => router.back()}
    >
      <PCOWorkspace
        availableChangeEvents={changeEvents}
        isLoadingCEs={isLoadingCEs}
        formValues={formValues}
        onFormChange={setFormValues}
        groupedCEs={groupedCEs}
        onAddCE={handleAddCE}
        onRemoveCE={handleRemoveCE}
        lineItems={lineItems}
        onAddLineItem={handleAddLineItem}
        onUpdateLineItem={handleUpdateLineItem}
        onRemoveLineItem={handleRemoveLineItem}
        markupPercentage={markupPercentage}
        onMarkupChange={setMarkupPercentage}
        onCancel={() => router.back()}
        onSaveDraft={() => handleSave(false)}
        onSubmit={() => handleSave(true)}
        isSaving={isSaving}
        isSubmitting={isSubmitting}
      />
    </PageShell>
  );
}
