"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageShell } from "@/components/layout";
import { ContractForm } from "@/components/domain/contracts";
import type { ContractFormData } from "@/components/domain/contracts/ContractForm";
import { fetchWithTransientRouteRetry } from "@/lib/fetch-with-transient-route-retry";
import { apiFetch } from "@/lib/api-client";

const SUBMIT_REQUEST_TIMEOUT_MS = 20_000;

// Prevent indefinite submit hangs by timing out stalled API requests.
const apiFetchWithTimeout = async <T,>(url: string, init?: RequestInit) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SUBMIT_REQUEST_TIMEOUT_MS);

  try {
    return await apiFetch<T>(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timed out while creating the prime contract");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export default function NewContractPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [isSaving, setIsSaving] = useState(false);

  const warmContractDetailSurface = async (contractId: string) => {
    router.prefetch(`/${projectId}/prime-contracts/${contractId}`);
    await Promise.allSettled([
      fetchWithTransientRouteRetry(
        `/api/projects/${projectId}/contracts/settings`,
      ),
      fetchWithTransientRouteRetry(
        `/api/projects/${projectId}/contracts/${contractId}`,
      ),
      fetchWithTransientRouteRetry(
        `/api/projects/${projectId}/contracts/${contractId}/line-items`,
      ),
    ]);
  };

  const handleSubmit = async (data: ContractFormData) => {
    setIsSaving(true);
    let createdContractId: string | null = null;
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
      const newContract = await apiFetchWithTimeout<{ id: string }>(`/api/projects/${projectId}/contracts`, {
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
          allowed_user_ids: data.allowedUsers && data.allowedUsers.length > 0 ? data.allowedUsers : [],
          allow_sov_view: data.allowedUsersCanSeeSov || false,
        }),
      });

      createdContractId = newContract.id;

      if (sovItems.length > 0) {
        // Sequential inserts to avoid the UNIQUE(contract_id, line_number) constraint
        // race condition that occurs when Promise.all fires all POSTs simultaneously.
        const sovErrors: string[] = [];
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
          try {
            await apiFetchWithTimeout(
              `/api/projects/${projectId}/contracts/${newContract.id}/line-items`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  line_number: index + 1,
                  description: item.description || `Line ${index + 1}`,
                  // budget_code_id must be a project_budget_codes UUID or null.
                  // Empty string is treated as null to avoid FK validation errors.
                  budget_code_id: item.budgetCodeId || null,
                  quantity,
                  unit_cost: unitCost,
                  unit_of_measure: item.unitOfMeasure || null,
                }),
              },
            );
          } catch (lineErr) {
            sovErrors.push(
              `Line ${index + 1} (${item.description || "untitled"}): ${lineErr instanceof Error ? lineErr.message : "Unknown error"}`,
            );
          }
        }

        void warmContractDetailSurface(newContract.id);

        if (sovErrors.length > 0) {
          // Contract was saved. Some SOV items failed — redirect to the contract
          // detail so the user can fix line items there rather than retrying the
          // whole create form (which would produce a duplicate contract).
          toast.warning(
            `Contract created, but ${sovErrors.length} line item${sovErrors.length !== 1 ? "s" : ""} failed to save. You can add them from the contract page.`,
            { duration: 8000 },
          );
          router.push(`/${projectId}/prime-contracts/${newContract.id}`);
          return;
        }
      } else {
        void warmContractDetailSurface(newContract.id);
      }

      toast.success("Prime contract created");
      router.push(`/${projectId}/prime-contracts/${newContract.id}`);
    } catch (err) {
      // If the contract was already committed before the error, redirect to it
      // instead of leaving the user on the create form where they would produce a duplicate.
      if (createdContractId) {
        toast.warning(
          "Contract was saved, but an unexpected error occurred. Redirecting to the contract page.",
          { duration: 8000 },
        );
        void warmContractDetailSurface(createdContractId);
        router.push(`/${projectId}/prime-contracts/${createdContractId}`);
        return;
      }

      // "Failed to fetch" means the HTTP connection dropped (e.g. dev server hot-reload)
      // even though the INSERT may have already committed. Check if it was actually saved.
      if (err instanceof TypeError && err.message.toLowerCase().includes("failed to fetch")) {
        try {
          const contracts = await apiFetch<Array<{ contract_number: string; id: string }>>(
            `/api/projects/${projectId}/contracts?search=${encodeURIComponent(data.number)}`,
          );
          const saved = Array.isArray(contracts)
            ? contracts.find(
                (c) => c.contract_number === data.number,
              )
            : null;
          if (saved) {
            void warmContractDetailSurface(saved.id);
            toast.success("Prime contract created");
            router.push(`/${projectId}/prime-contracts/${saved.id}`);
            return;
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
