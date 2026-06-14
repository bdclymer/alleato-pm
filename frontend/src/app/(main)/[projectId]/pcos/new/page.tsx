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
import { useProjectChangeEvents } from "@/hooks/use-change-events";
import { useCreatePCO } from "@/hooks/use-pcos";
import type { ChangeEvent } from "@/types/change-events";

// =============================================================================
// Page Component
// =============================================================================

export default function NewPCOPage() {
  const params = useParams<{ projectId: string }>()!;
  const router = useRouter();
  const projectId = params.projectId ?? "";
  const projectIdNum = parseInt(projectId, 10);

  // Fetch ungrouped change events
  const { changeEvents, isLoading: isLoadingCEs } = useProjectChangeEvents(
    projectIdNum,
    { limit: 500, enabled: projectIdNum > 0 },
  );

  const createPCO = useCreatePCO(projectId);

  // Form state
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

  const buildPayload = () => {
    const subtotal = lineItems.reduce(
      (sum, li) => sum + li.quantity * li.unitCost,
      0,
    );
    const markupAmount = subtotal * (markupPercentage / 100);
    const total = subtotal + markupAmount;

    return {
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
      // The API will handle grouping CEs and line items after creation
      change_event_ids: groupedCEs.map((ce) => ce.id),
      line_items: lineItems.map((li) => ({
        description: li.description,
        quantity: li.quantity,
        uom: li.uom,
        unit_cost: li.unitCost,
        line_amount: li.quantity * li.unitCost,
        category: li.category || null,
      })),
    };
  };

  const handleSaveDraft = async () => {
    if (!formValues.title.trim()) {
      toast.error("Please enter a title for the PCO.");
      return;
    }

    setIsSaving(true);
    try {
       
      await createPCO.mutateAsync(buildPayload() as any);
      router.push(`/${projectId}/pcos`);
    } catch (error) {
      handleFormError(error, { entity: "PCO draft", action: "save" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!formValues.title.trim()) {
      toast.error("Please enter a title for the PCO.");
      return;
    }
    if (groupedCEs.length === 0) {
      toast.error("Add at least one change event to the PCO.");
      return;
    }
    if (lineItems.length === 0) {
      toast.error("Add at least one line item to the PCO.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildPayload();
      await createPCO.mutateAsync({
        ...payload,
        status: "SUBMITTED",

      } as any);
      toast.success("PCO created and submitted to client.");
      router.push(`/${projectId}/pcos`);
    } catch (error) {
      handleFormError(error, { entity: "PCO", action: "create" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell
      variant="dashboard"
      title="New Potential Change Order"
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
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
        isSaving={isSaving}
        isSubmitting={isSubmitting}
      />
    </PageShell>
  );
}
