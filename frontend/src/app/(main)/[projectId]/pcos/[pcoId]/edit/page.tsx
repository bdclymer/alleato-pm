"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { handleFormError } from "@/lib/handle-form-error";
import { PageShell } from "@/components/layout";
import {
  PCOWorkspace,
  type GroupedCE,
  type LocalLineItem,
  type PCOFormValues,
} from "@/components/domain/pcos/PCOWorkspace";
import { useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import { useProjectChangeEvents } from "@/hooks/use-change-events";
import { usePCO } from "@/hooks/use-pcos";
import type { ChangeEvent } from "@/types/change-events";

// =============================================================================
// Page Component
// =============================================================================

export default function EditPCOPage() {
  const params = useParams<{ projectId: string; pcoId: string }>()!;
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

  const queryClient = useQueryClient();

  // Form state — initialized from loaded PCO
  const [formValues, setFormValues] = React.useState<PCOFormValues>({
    title: "",
    type: "CLIENT_REQUESTED",
    description: "",
    rfqRequired: false,
    changeReason: "",
    location: "",
    reference: "",
    requestReceivedFrom: "",
    dueDate: "",
    isPrivate: false,
    fieldChange: false,
    paidInFull: false,
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
      changeReason: pco.change_reason ?? "",
      location: pco.location ?? "",
      reference: pco.reference ?? "",
      requestReceivedFrom: pco.request_received_from ?? "",
      dueDate: pco.due_date ?? "",
      isPrivate: pco.is_private ?? false,
      fieldChange: pco.field_change ?? false,
      paidInFull: pco.paid_in_full ?? false,
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

      // Single transactional update: header + grouped change events + all line
      // items are written together by update_pco_with_lines. A mid-write failure
      // rolls everything back, so the PCO can no longer be left half-updated.
      await apiFetch(`/api/projects/${projectId}/pcos/${pcoId}/atomic`, {
        method: "PUT",
        body: JSON.stringify({
          title: formValues.title.trim(),
          type: formValues.type,
          description: formValues.description.trim() || null,
          rfq_required: formValues.rfqRequired,
          markup_percentage: markupPercentage || null,
          estimated_value: total,
          change_reason: formValues.changeReason.trim() || null,
          location: formValues.location.trim() || null,
          reference: formValues.reference.trim() || null,
          request_received_from: formValues.requestReceivedFrom.trim() || null,
          due_date: formValues.dueDate || null,
          is_private: formValues.isPrivate,
          field_change: formValues.fieldChange,
          paid_in_full: formValues.paidInFull,
          ...(submitAfter ? { status: "SUBMITTED" } : {}),
          // Full desired set of grouped change events (CE uuid ids).
          change_event_ids: groupedCEs.map((ce) => ce.id),
          // Full desired set of line items. Existing rows carry a numeric id;
          // new rows (UUID tempId) omit it. Anything not listed is deleted.
          line_items: lineItems.map((li) => ({
            ...(isNaN(Number(li.tempId)) ? {} : { id: Number(li.tempId) }),
            description: li.description,
            quantity: li.quantity,
            uom: li.uom,
            unit_cost: li.unitCost,
            category: li.category || null,
          })),
        }),
      });

      // Refresh cached PCO data so the list/detail reflect the update.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pcos", projectId] }),
        queryClient.invalidateQueries({ queryKey: ["pco", projectId, pcoId] }),
      ]);

      toast.success(
        submitAfter
          ? "PCO updated and submitted to client."
          : "PCO updated successfully",
      );

      router.push(`/${projectId}/pcos`);
    } catch (error) {
      handleFormError(error, { entity: "PCO", action: "save" });
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
