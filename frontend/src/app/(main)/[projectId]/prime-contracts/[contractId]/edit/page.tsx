"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ContractForm } from "@/components/domain/contracts";
import type { ContractFormData } from "@/components/domain/contracts/ContractForm";
import { PageHeader } from "@/components/layout/page-header-unified";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ContractLineItemWithCostCode } from "@/types/contract-line-items";

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
  const [lineItems, setLineItems] = useState<ContractLineItemWithCostCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContractAndLineItems = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        // Fetch contract data
        const contractResponse = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}`,
          { credentials: "include" },
        );

        if (!contractResponse.ok) {
          const errorData = await contractResponse.json().catch(() => ({}));
          throw new Error(
            errorData?.error ||
              `Failed to load contract (status ${contractResponse.status})`,
          );
        }

        const contractData = await contractResponse.json();
        setContract(contractData);

        // Fetch line items (SOV)
        const lineItemsResponse = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}/line-items`,
          { credentials: "include" },
        );

        if (lineItemsResponse.ok) {
          const lineItemsData = await lineItemsResponse.json();
          setLineItems(lineItemsData || []);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load contract";
        setLoadError(message);
      } finally {
        setLoading(false);
      }
    };

    if (contractId && projectId) {
      fetchContractAndLineItems();
    }
  }, [contractId, projectId, router]);

  const existingCostCodeByLineId = useMemo(() => {
    return new Map(
      lineItems.map((item) => [item.id, item.cost_code_id ?? null]),
    );
  }, [lineItems]);

  const handleSubmit = async (data: ContractFormData) => {
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}`,
        {
          method: "PUT",
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update contract");
      }

      const budgetCodesResponse = await fetch(
        `/api/projects/${projectId}/budget-codes`,
        { credentials: "include" },
      );

      const budgetCodesPayload = budgetCodesResponse.ok
        ? await budgetCodesResponse.json().catch(() => ({ budgetCodes: [] }))
        : { budgetCodes: [] };

      const budgetCodeIdToCostCode = new Map(
        (budgetCodesPayload.budgetCodes || []).map(
          (code: { id: string; code: string }) => [code.id, code.code],
        ),
      );

      const sovItems = data.sovItems || [];
      const itemsToPersist = sovItems.map((item, index) => {
        const budgetCodeId = item.budgetCodeId || "";
        const budgetCodeValue = budgetCodeIdToCostCode.get(budgetCodeId);
        const fallbackCostCode = existingCostCodeByLineId.get(item.id) ?? null;
        const parsedCostCodeId = budgetCodeValue
          ? Number.parseInt(budgetCodeValue as string, 10)
          : fallbackCostCode;
        const costCodeId =
          parsedCostCodeId !== null && Number.isNaN(parsedCostCodeId)
            ? null
            : parsedCostCodeId;

        const quantity =
          data.accountingMethod === "unit_quantity"
            ? item.quantity ?? 0
            : 1;
        const unitCost =
          data.accountingMethod === "unit_quantity"
            ? item.unitCost ?? 0
            : item.amount || 0;

        return {
          id: item.id,
          line_number: index + 1,
          description: item.description || `Line ${index + 1}`,
          cost_code_id: costCodeId,
          quantity,
          unit_cost: unitCost,
          unit_of_measure: item.unitOfMeasure || null,
        };
      });

      const existingIds = new Set(lineItems.map((item) => item.id));
      const incomingIds = new Set(itemsToPersist.map((item) => item.id));

      const updates = itemsToPersist.filter((item) => existingIds.has(item.id));
      const creates = itemsToPersist.filter((item) => !existingIds.has(item.id));
      const deletions = lineItems
        .filter((item) => !incomingIds.has(item.id))
        .map((item) => item.id);

      const updateResponses = await Promise.all([
        ...updates.map((item) =>
          fetch(
            `/api/projects/${projectId}/contracts/${contractId}/line-items/${item.id}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                line_number: item.line_number,
                description: item.description,
                cost_code_id: item.cost_code_id,
                quantity: item.quantity,
                unit_cost: item.unit_cost,
                unit_of_measure: item.unit_of_measure,
              }),
            },
          ),
        ),
        ...creates.map((item) =>
          fetch(`/api/projects/${projectId}/contracts/${contractId}/line-items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              line_number: item.line_number,
              description: item.description,
              cost_code_id: item.cost_code_id,
              quantity: item.quantity,
              unit_cost: item.unit_cost,
              unit_of_measure: item.unit_of_measure,
            }),
          }),
        ),
        ...deletions.map((lineItemId) =>
          fetch(
            `/api/projects/${projectId}/contracts/${contractId}/line-items/${lineItemId}`,
            {
              method: "DELETE",
            },
          ),
        ),
      ]);

      const firstFailure = updateResponses.find((res) => !res.ok);
      if (firstFailure) {
        const errorData = await firstFailure.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update SOV line items");
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
        <PageHeader
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

  if (loadError) {
    return (
      <>
        <PageHeader
          title="Edit Contract"
          breadcrumbs={[
            { label: "Prime Contracts", href: `/${projectId}/prime-contracts` },
            { label: "Edit Contract" },
          ]}
        />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <Card>
            <CardContent className="p-8 space-y-4">
              <p className="text-sm text-destructive">{loadError}</p>
              <div className="flex items-center gap-2">
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/${projectId}/prime-contracts`)}
                >
                  Back to Contracts
                </Button>
              </div>
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
    budgetCodeId: "",
    budgetCodeLabel: item.cost_code
      ? `${item.cost_code.code} ${item.cost_code.name}`
      : undefined,
    description: item.description,
    amount: item.total_cost,
    quantity: item.quantity,
    unitCost: item.unit_cost,
    unitOfMeasure: item.unit_of_measure ?? undefined,
    billedToDate: 0,
    amountRemaining: item.total_cost,
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
      <PageHeader
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
