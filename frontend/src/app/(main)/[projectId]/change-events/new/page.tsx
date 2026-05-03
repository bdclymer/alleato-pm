"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

import { apiFetch } from "@/lib/api-client";
import { ChangeEventForm } from "@/components/domain/change-events/ChangeEventForm";
import type { ChangeEventFormData } from "@/components/domain/change-events/ChangeEventForm";
import { FormServerError } from "@/components/forms/FormServerError";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function NewChangeEventPage() {
  const router = useRouter();
  const params = useParams() ?? {};
  const projectId = parseInt(params.projectId as string, 10);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSubmit = async (data: ChangeEventFormData) => {
    setIsSaving(true);
    setSaveError(null);
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

      const lineItemResults = await Promise.allSettled(
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
          .map(async (lineItem, index) => {
            return apiFetch(
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
                  // contract stores either "po-<uuid>" / "sub-<uuid>" (commitment) or a plain UUID (prime contract).
                  // contract_id FK → prime_contracts; commitment_id FK → purchase_orders/subcontracts.
                  // Send to the correct column based on the prefix.
                  ...(lineItem.contract && /^(po|sub)-/.test(lineItem.contract)
                    ? { commitmentId: lineItem.contract.replace(/^(po-|sub-)/, "") }
                    : { contractId: lineItem.contract || undefined }),
                  commitmentLineItemId: lineItem.commitmentLineItemId || undefined,
                }),
              },
            );
          }),
      );
      const failedLineItems = lineItemResults.filter((r) => r.status === "rejected");
      if (failedLineItems.length > 0) {
        const reasons = failedLineItems
          .map((r) => (r as PromiseRejectedResult).reason?.message)
          .filter(Boolean)
          .join("; ");
        toast.warning(`Change event created but ${failedLineItems.length} line item(s) failed to save: ${reasons}`);
      }

      await Promise.all(
        data.attachments.map(async (file) => {
          const formData = new FormData();
          formData.append("files", file);
          await apiFetch(
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
      const message = error instanceof Error
        ? error.message
        : "Failed to create change event";
      setSaveError(message);
      toast.error(message);
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
      variant="dashboard"
      title="Create Change Event"
      description="Document a potential change to project scope, schedule, or budget."
      onBack={handleCancel}
      actions={headerActions}
    >
      {saveError ? <FormServerError message={saveError} /> : null}
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
