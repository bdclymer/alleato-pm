"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { ChangeEventForm } from "@/components/domain/change-events/ChangeEventForm";
import type { ChangeEventFormData } from "@/components/domain/change-events/ChangeEventForm";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function NewChangeEventPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = parseInt(params.projectId as string, 10);

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (data: ChangeEventFormData) => {
    setIsSaving(true);
    try {
      const STATUS_MAP: Record<string, string> = {
        open: "Open",
        pending: "Pending Approval",
        close: "Closed",
        void: "Void",
      };
      const ORIGIN_MAP: Record<string, string> = {
        emails: "Emails",
        meetings: "Meetings",
        rfis: "RFI's",
      };
      const TYPE_MAP: Record<string, string> = {
        allowance: "Allowance",
        contingency: "Contingency",
        owner_change: "Owner Change",
        tbd: "TBD",
        transfer: "Transfer",
      };
      const REASON_MAP: Record<string, string> = {
        allowance: "Allowance",
        backcharge: "Backcharge",
        client_request: "Client Request",
        design_development: "Design Development",
        existing_condition: "Existing Condition",
      };

      const normalizedScope = data.scope && ["In Scope", "Out of Scope", "TBD", "Allowance"].includes(data.scope)
        ? data.scope
        : "TBD";

      const mergedDescription = [
        data.contractNumber ? `Contract Number: ${data.contractNumber}` : "",
        data.description || "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const newEvent = await apiFetch<{ id: string }>(`/api/projects/${projectId}/change-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          type: TYPE_MAP[data.type || ""] || "Owner Change",
          status: STATUS_MAP[data.status || "open"] || "Open",
          scope: normalizedScope,
          reason: REASON_MAP[data.changeReason || ""] || data.changeReason || undefined,
          origin: ORIGIN_MAP[data.origin || ""] || "Internal",
          originId: data.originId || undefined,
          expectingRevenue: data.expectingRevenue ?? true,
          lineItemRevenueSource: data.lineItemRevenueSource || undefined,
          primeContractId: data.primeContractId || undefined,
          description: mergedDescription || undefined,
        }),
      });

      await Promise.all(
        data.lineItems
          .filter((lineItem) => {
            return (
              lineItem.description.trim().length > 0 ||
              lineItem.budgetCode.trim().length > 0 ||
              lineItem.costUnitCost > 0 ||
              lineItem.revenueRom > 0 ||
              lineItem.costRom > 0 ||
              lineItem.nonCommittedCost > 0
            );
          })
          .map((lineItem, index) =>
            fetch(
              `/api/projects/${projectId}/change-events/${newEvent.id}/line-items`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  description:
                    lineItem.description ||
                    `${lineItem.budgetCode || "Line Item"} ${index + 1}`,
                  quantity: lineItem.costQuantity || undefined,
                  unitCost: lineItem.costUnitCost || undefined,
                  unitOfMeasure: lineItem.revenueUnitOfMeasure || undefined,
                  costRom: lineItem.costRom || undefined,
                  revenueRom:
                    data.expectingRevenue === false
                      ? undefined
                      : lineItem.revenueRom || undefined,
                  nonCommittedCost: lineItem.nonCommittedCost || undefined,
                  sortOrder: index,
                  budgetCodeId: lineItem.budgetCode || undefined,
                  vendorId: lineItem.vendor || undefined,
                  contractId: lineItem.contract
                    ? lineItem.contract.replace(/^(po-|sub-)/, "")
                    : undefined,
                  commitmentLineItemId: lineItem.commitmentLineItemId || undefined,
                }),
              },
            ),
          ),
      );

      await Promise.all(
        data.attachments.map(async (file) => {
          const formData = new FormData();
          formData.append("files", file);
          const uploadResponse = await fetch(
            `/api/projects/${projectId}/change-events/${newEvent.id}/attachments`,
            {
              method: "POST",
              body: formData,
            },
          );

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse
              .json()
              .catch(() => ({ error: "Unknown attachment upload error" }));
            throw new Error(
              `Failed to upload attachment "${file.name}": ${errorData.error || "Unknown error"}`,
            );
          }
        }),
      );

      toast.success("Change event created successfully");
      router.push(`/${projectId}/change-events/${newEvent.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create change event",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/${projectId}/change-events`);
  };

  const initialData: Partial<ChangeEventFormData> = {
    contractNumber: "",
    title: "",
    status: "open",
    attachments: [],
    lineItems: [],
  };

  const headerActions =
    process.env.NODE_ENV !== "production" ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => {
          window.dispatchEvent(
            new CustomEvent("dev-autofill-form", {
              detail: { selector: 'form[data-form-id="change-event-create"]' },
            }),
          );
        }}
      >
        <Sparkles />
        Autofill
      </Button>
    ) : undefined;

  return (
    <PageShell
      variant="form"
      title="Create Change Event"
      description="Document a potential change to project scope, schedule, or budget."
      onBack={handleCancel}
      actions={headerActions}
    >
      <ChangeEventForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSaving}
        mode="create"
        projectId={projectId}
      />
    </PageShell>
  );
}
