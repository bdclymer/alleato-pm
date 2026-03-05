"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

import { ProjectFormPageLayout } from "@/components/layout";
import { ChangeEventForm } from "@/components/domain/change-events/ChangeEventForm";
import type { ChangeEventFormData } from "@/components/domain/change-events/ChangeEventForm";
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
        emails: "Internal",
        meetings: "Field",
        rfis: "RFI",
      };
      const TYPE_MAP: Record<string, string> = {
        allowance: "Allowance",
        contingency: "Scope Gap",
        owner_change: "Owner Change",
        tbd: "Owner Requested",
        transfer: "Value Engineering",
      };

      const normalizedScope =
        data.scope?.trim().toLowerCase() === "in scope"
          ? "In Scope"
          : data.scope?.trim().toLowerCase() === "out of scope"
            ? "Out of Scope"
            : data.scope?.trim().toLowerCase() === "allowance"
              ? "Allowance"
              : "TBD";

      const mergedDescription = [
        data.contractNumber ? `Contract Number: ${data.contractNumber}` : "",
        data.description || "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const response = await fetch(`/api/projects/${projectId}/change-events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: data.title,
          type: TYPE_MAP[data.type || ""] || "Owner Change",
          status: STATUS_MAP[data.status || "open"] || "Open",
          scope: normalizedScope,
          reason: data.changeReason || undefined,
          origin: ORIGIN_MAP[data.origin || ""] || "Internal",
          expectingRevenue: data.expectingRevenue ?? true,
          lineItemRevenueSource:
            data.lineItemRevenueSource === "match_latest_cost"
              ? "Match Latest Cost"
              : data.lineItemRevenueSource === "latest_cost"
                ? "Latest Cost"
                : data.lineItemRevenueSource === "latest_price"
                  ? "Latest Price"
                  : undefined,
          primeContractId: data.primeContractId
            ? Number(data.primeContractId)
            : undefined,
          description: mergedDescription || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to create change event");
      }

      const newEvent = await response.json();

      await Promise.all(
        data.lineItems
          .filter((lineItem) => {
            return (
              lineItem.description.trim().length > 0 ||
              lineItem.budgetCode.trim().length > 0 ||
              lineItem.costQuantity > 0 ||
              lineItem.revenueQuantity > 0
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
                }),
              },
            ),
          ),
      );

      await Promise.all(
        data.attachments.map(async (file) => {
          const formData = new FormData();
          formData.append("files", file);
          await fetch(
            `/api/projects/${projectId}/change-events/${newEvent.id}/attachments`,
            {
              method: "POST",
              body: formData,
            },
          );
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
        <Sparkles className="h-4 w-4" />
        Autofill
      </Button>
    ) : undefined;

  return (
    <ProjectFormPageLayout
      title="Create Change Event"
      description="Document a potential change to project scope, schedule, or budget."
      maxWidth="xl"
      headerActions={headerActions}
    >
      <ChangeEventForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSaving}
        mode="create"
        projectId={projectId}
      />
    </ProjectFormPageLayout>
  );
}
