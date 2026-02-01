"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ContractForm } from "@/components/domain/contracts";
import type { ContractFormData } from "@/components/domain/contracts/ContractForm";
import { ProjectPageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Contract {
  id: string;
  contract_number: string | null;
  title: string;
  status: "draft" | "out_for_bid" | "out_for_signature" | "approved" | "complete" | "terminated";
  executed: boolean;
  executed_at: string | null;
  original_contract_value: number;
  revised_contract_value: number;
  start_date: string | null;
  end_date: string | null;
  substantial_completion_date: string | null;
  actual_completion_date: string | null;
  signed_contract_received_date: string | null;
  contract_termination_date: string | null;
  retention_percentage: number;
  payment_terms: string | null;
  billing_schedule: string | null;
  description: string | null;
  inclusions: string | null;
  exclusions: string | null;
  is_private: boolean;
  client_id: number | null;
  vendor_id: string | null;
  contractor_id: string | null;
  architect_engineer_id: string | null;
  contract_company_id: string | null;
}

export default function EditContractPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const contractId = params.contractId as string;

  const [contract, setContract] = useState<Contract | null>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchContractAndLineItems = async () => {
      try {
        setLoading(true);

        // Fetch contract data
        const contractResponse = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}`,
        );

        if (!contractResponse.ok) {
          throw new Error("Failed to load contract");
        }

        const contractData = await contractResponse.json();
        setContract(contractData);

        // Fetch line items (SOV)
        const lineItemsResponse = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}/line-items`,
        );

        if (lineItemsResponse.ok) {
          const lineItemsData = await lineItemsResponse.json();
          setLineItems(lineItemsData || []);
        }
      } catch (err) {
        alert("Failed to load contract");
        router.push(`/${projectId}/prime-contracts`);
      } finally {
        setLoading(false);
      }
    };

    if (contractId && projectId) {
      fetchContractAndLineItems();
    }
  }, [contractId, projectId, router]);

  const handleSubmit = async (data: ContractFormData) => {
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contract_number: data.number,
            title: data.title,
            client_id: data.ownerCompanyId ? parseInt(data.ownerCompanyId) : null,
            contractor_id: data.contractorId || null,
            architect_engineer_id: data.architectEngineerId || null,
            contract_company_id: data.contractCompanyId || null,
            description: data.description,
            status: data.status || "draft",
            executed: data.executed || false,
            original_contract_value: data.originalAmount || 0,
            revised_contract_value:
              data.revisedAmount || data.originalAmount || 0,
            start_date: data.startDate?.toISOString().split("T")[0] || null,
            end_date:
              data.estimatedCompletionDate?.toISOString().split("T")[0] || null,
            substantial_completion_date:
              data.substantialCompletionDate?.toISOString().split("T")[0] || null,
            actual_completion_date:
              data.actualCompletionDate?.toISOString().split("T")[0] || null,
            signed_contract_received_date:
              data.signedContractReceivedDate?.toISOString().split("T")[0] || null,
            contract_termination_date:
              data.contractTerminationDate?.toISOString().split("T")[0] || null,
            retention_percentage: data.defaultRetainage || 0,
            is_private: data.isPrivate || false,
            inclusions: data.inclusions || null,
            exclusions: data.exclusions || null,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update contract");
      }

      router.push(`/${projectId}/prime-contracts/${contractId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update contract");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/${projectId}/prime-contracts/${contractId}`);
  };

  if (loading) {
    return (
      <>
        <ProjectPageHeader
          title="Edit Contract"
          breadcrumbs={[
            { label: "Prime Contracts", href: `/${projectId}/prime-contracts` },
            { label: "Edit Contract" },
          ]}
        />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <Card>
            <CardContent className="p-8">
              <div className="text-center py-8">Loading contract...</div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (!contract) {
    return null;
  }

  // Convert line items to SOV format
  const sovItems = lineItems.map((item) => ({
    id: item.id,
    budgetCodeId: item.cost_code_id,
    budgetCodeLabel: item.cost_code
      ? `${item.cost_code.code} ${item.cost_code.name}`
      : undefined,
    description: item.description,
    amount: item.total_cost,
    quantity: item.quantity,
    unitCost: item.unit_cost,
    unitOfMeasure: item.unit_of_measure,
    billedToDate: item.billed_to_date || 0,
    amountRemaining: item.total_cost - (item.billed_to_date || 0),
  }));

  const initialData: Partial<ContractFormData> = {
    number: contract.contract_number || "",
    title: contract.title,
    status: contract.status,
    executed: contract.executed,
    ownerCompanyId: contract.client_id?.toString() || undefined,
    contractorId: contract.contractor_id || undefined,
    architectEngineerId: contract.architect_engineer_id || undefined,
    contractCompanyId: contract.contract_company_id || undefined,
    description: contract.description || "",
    originalAmount: contract.original_contract_value,
    revisedAmount: contract.revised_contract_value,
    startDate: contract.start_date ? new Date(contract.start_date) : undefined,
    estimatedCompletionDate: contract.end_date
      ? new Date(contract.end_date)
      : undefined,
    substantialCompletionDate: contract.substantial_completion_date
      ? new Date(contract.substantial_completion_date)
      : undefined,
    actualCompletionDate: contract.actual_completion_date
      ? new Date(contract.actual_completion_date)
      : undefined,
    signedContractReceivedDate: contract.signed_contract_received_date
      ? new Date(contract.signed_contract_received_date)
      : undefined,
    contractTerminationDate: contract.contract_termination_date
      ? new Date(contract.contract_termination_date)
      : undefined,
    defaultRetainage: contract.retention_percentage,
    isPrivate: contract.is_private,
    inclusions: contract.inclusions || "",
    exclusions: contract.exclusions || "",
    sovItems: sovItems,
  };

  return (
    <>
      <ProjectPageHeader
        title="Edit Contract"
        breadcrumbs={[
          { label: "Prime Contracts", href: `/${projectId}/prime-contracts` },
          {
            label: contract.contract_number || contractId,
            href: `/${projectId}/prime-contracts/${contractId}`,
          },
          { label: "Edit" },
        ]}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Card>
          <CardContent className="p-8">
            <ContractForm
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isSaving}
              mode="edit"
              projectId={projectId}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
