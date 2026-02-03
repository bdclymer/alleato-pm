"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer, FormContainer } from "@/components/layout";
import { PageHeader } from "@/components/layout/page-header-unified";
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
      const sovItems = data.sovItems || [];
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
          owner_company_id: data.ownerCompanyId || null,
          contractor_id: data.contractorId || null,
          architect_engineer_id: data.architectEngineerId || null,
          contract_company_id: data.contractCompanyId || null,
          description: data.description,
          status: data.status || "draft",
          executed: data.executed || false,
          executed_at: data.executed ? new Date().toISOString() : null,
          original_contract_value: sovTotal,
          revised_contract_value: data.revisedAmount || sovTotal,
          start_date: data.startDate?.toISOString() || null,
          end_date: data.estimatedCompletionDate?.toISOString() || null,
          substantial_completion_date:
            data.substantialCompletionDate?.toISOString() || null,
          actual_completion_date:
            data.actualCompletionDate?.toISOString() || null,
          signed_contract_received_date:
            data.signedContractReceivedDate?.toISOString() || null,
          contract_termination_date:
            data.contractTerminationDate?.toISOString() || null,
          retention_percentage: data.defaultRetainage || 0,
          payment_terms: null,
          billing_schedule: null,
          is_private: data.isPrivate || false,
          inclusions: data.inclusions || null,
          exclusions: data.exclusions || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Contract creation failed:", errorData);
        throw new Error(errorData.error || "Failed to create contract");
      }

      const newContract = await response.json();

      if (sovItems.length > 0) {
        const lineItemResponses = await Promise.all(
          sovItems.map((item, index) => {
            const quantity =
              data.accountingMethod === "unit_quantity"
                ? item.quantity ?? 0
                : 1;
            const unitCost =
              data.accountingMethod === "unit_quantity"
                ? item.unitCost ?? 0
                : item.amount || 0;
            return fetch(
              `/api/projects/${projectId}/contracts/${newContract.id}/line-items`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  line_number: index + 1,
                  description: item.description || `Line ${index + 1}`,
                  cost_code_id: null,
                  quantity,
                  unit_cost: unitCost,
                  unit_of_measure: item.unitOfMeasure || null,
                }),
              },
            );
          }),
        );

        for (const lineItemResponse of lineItemResponses) {
          if (!lineItemResponse.ok) {
            const errorData = await lineItemResponse.json().catch(() => ({}));
            throw new Error(
              errorData.error || "Failed to create SOV line items",
            );
          }
        }
      }

      if (data.attachmentFiles && data.attachmentFiles.length > 0) {
        for (const file of data.attachmentFiles) {
          const formData = new FormData();
          formData.append("file", file);
          const attachmentResponse = await fetch(
            `/api/projects/${projectId}/contracts/${newContract.id}/attachments`,
            {
              method: "POST",
              body: formData,
            },
          );

          if (!attachmentResponse.ok) {
            const errorData = await attachmentResponse.json().catch(() => ({}));
            console.error("Attachment upload failed:", errorData);
            throw new Error(errorData.error || "Failed to upload attachment");
          }
        }
      }

      router.push(`/${projectId}/prime-contracts/${newContract.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create contract");
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
    <>
      <PageHeader
        title="New Prime Contract"
        breadcrumbs={[
          { label: "Prime Contracts", href: `/${projectId}/prime-contracts` },
          { label: "New Contract" },
        ]}
        actions={undefined}
      />

      <PageContainer className="bg-gray-50">
        <FormContainer maxWidth="xl" className="max-w-[1400px] bg-white rounded-lg border border-gray-200 p-8">
          <ContractForm
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSaving}
            mode="create"
            projectId={projectId}
          />
        </FormContainer>
      </PageContainer>
    </>
  );
}
