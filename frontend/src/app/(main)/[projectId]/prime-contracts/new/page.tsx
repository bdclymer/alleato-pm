"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageShell } from "@/components/layout";
import { ContractForm } from "@/components/domain/contracts";
import type { ContractFormData } from "@/components/domain/contracts/ContractForm";

export default function NewContractPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (data: ContractFormData) => {
    setIsSaving(true);
    try {
      const sovItems = (data.sovItems || []).filter((item) => !item.isGroup);
      const sovTotal = sovItems.reduce(
        (sum, item) =>
          sum +
          (data.accountingMethod === "unit_quantity"
            ? (item.quantity ?? 0) * (item.unitCost ?? 0)
            : item.amount || 0),
        0,
      );
      const response = await fetch(`/api/projects/${projectId}/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contract_number: data.number,
          title: data.title,
          client_id: data.ownerCompanyId || null,
          contract_company_id: data.ownerCompanyId || data.contractCompanyId || null,
          contractor_id: data.contractorId || null,
          architect_engineer_id: data.architectEngineerId || null,
          description: data.description,
          status: data.status || "draft",
          executed: data.executed || false,
          executed_at: data.executed ? new Date().toISOString() : null,
          original_contract_value: sovTotal,
          revised_contract_value: sovTotal,
          start_date: data.startDate?.toISOString().split("T")[0] || null,
          end_date: data.estimatedCompletionDate?.toISOString().split("T")[0] || null,
          substantial_completion_date:
            data.substantialCompletionDate?.toISOString().split("T")[0] || null,
          actual_completion_date:
            data.actualCompletionDate?.toISOString().split("T")[0] || null,
          signed_contract_received_date:
            data.signedContractReceivedDate?.toISOString().split("T")[0] || null,
          contract_termination_date:
            data.contractTerminationDate?.toISOString().split("T")[0] || null,
          retention_percentage: data.defaultRetainage || 0,
          payment_terms: data.paymentTerms || null,
          billing_schedule: data.billingSchedule || null,
          is_private: data.isPrivate || false,
          inclusions: data.inclusions || null,
          exclusions: data.exclusions || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Contract creation failed:", errorData);
        if (Array.isArray(errorData.details) && errorData.details.length > 0) {
          const fieldErrors = errorData.details
            .map((d: { field: string; message: string }) => `${d.field}: ${d.message}`)
            .join("; ");
          throw new Error(`Validation failed — ${fieldErrors}`);
        }
        const detail = typeof errorData.details === "string" ? ` — ${errorData.details}` : "";
        throw new Error((errorData.error || "Failed to create contract") + detail);
      }

      const newContract = await response.json();

      if (sovItems.length > 0) {
        // Sequential inserts to avoid the UNIQUE(contract_id, line_number) constraint
        // race condition that occurs when Promise.all fires all POSTs simultaneously.
        for (let index = 0; index < sovItems.length; index++) {
          const item = sovItems[index];
          const quantity =
            data.accountingMethod === "unit_quantity"
              ? item.quantity ?? 0
              : 1;
          const unitCost =
            data.accountingMethod === "unit_quantity"
              ? item.unitCost ?? 0
              : item.amount || 0;
          const lineItemResponse = await fetch(
            `/api/projects/${projectId}/contracts/${newContract.id}/line-items`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                line_number: index + 1,
                description: item.description || `Line ${index + 1}`,
                budget_code_id: item.budgetCodeId || null,
                quantity,
                unit_cost: unitCost,
                unit_of_measure: item.unitOfMeasure || null,
              }),
            },
          );
          if (!lineItemResponse.ok) {
            const errorData = await lineItemResponse.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to create SOV line item ${index + 1}`);
          }
        }
      }

      toast.success("Prime contract created");
      router.push(`/${projectId}/prime-contracts/${newContract.id}`);
    } catch (err) {
      // "Failed to fetch" means the HTTP connection dropped (e.g. dev server hot-reload)
      // even though the INSERT may have already committed. Check if it was actually saved.
      if (err instanceof TypeError && err.message.toLowerCase().includes("failed to fetch")) {
        try {
          const checkRes = await fetch(
            `/api/projects/${projectId}/contracts?search=${encodeURIComponent(data.number)}`,
          );
          if (checkRes.ok) {
            const contracts = await checkRes.json();
            const saved = Array.isArray(contracts)
              ? contracts.find(
                  (c: { contract_number: string; id: string }) =>
                    c.contract_number === data.number,
                )
              : null;
            if (saved) {
              toast.success("Prime contract created");
              router.push(`/${projectId}/prime-contracts/${saved.id}`);
              return;
            }
          }
        } catch {
          // recovery failed — fall through to the error toast
        }
      }
      toast.error(err instanceof Error ? err.message : "Failed to create contract");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/${projectId}/prime-contracts`);
  };

  const initialData: Partial<ContractFormData> = {
    number: "",
    title: "",
    status: "draft",
    executed: false,
    isPrivate: false,
    defaultRetainage: 10,
  };

  return (
    <PageShell
      variant="form"
      title="New Prime Contract"
      onBack={() => router.push(`/${projectId}/prime-contracts`)}
      backLabel="Back to Prime Contracts"
    >
      <ContractForm
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
