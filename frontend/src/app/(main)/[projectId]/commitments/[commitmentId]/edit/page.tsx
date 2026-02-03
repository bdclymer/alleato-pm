"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import {
  CreatePurchaseOrderForm,
  CreateSubcontractForm,
} from "@/components/domain/contracts";
import { FormContainer } from "@/components/layout";
import { PageHeader } from "@/components/layout/page-header-unified";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CreatePurchaseOrderInput } from "@/lib/schemas/create-purchase-order-schema";
import type { CreateSubcontractInput } from "@/lib/schemas/create-subcontract-schema";

export default function EditCommitmentPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.projectId);
  const commitmentId = params.commitmentId as string;

  const [commitmentData, setCommitmentData] = useState<any>(null);
  const [commitmentType, setCommitmentType] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCommitment() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/commitments/${commitmentId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch commitment");
        }
        const result = await response.json();
        const data = result.data || result;
        setCommitmentData(data);
        setCommitmentType(data.type || data.commitment_type || "subcontract");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load commitment",
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchCommitment();
  }, [commitmentId]);

  const handleSubmitSubcontract = async (data: CreateSubcontractInput) => {
    const response = await fetch(`/api/commitments/${commitmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contract_number: data.contractNumber,
        title: data.title,
        contract_company_id: data.contractCompanyId || null,
        status: data.status,
        executed: data.executed,
        description: data.description || null,
        inclusions: data.inclusions || null,
        exclusions: data.exclusions || null,
        default_retainage_percent: data.defaultRetainagePercent || null,
        start_date: data.dates?.startDate || null,
        estimated_completion_date: data.dates?.estimatedCompletionDate || null,
        actual_completion_date: data.dates?.actualCompletionDate || null,
        contract_date: data.dates?.contractDate || null,
        is_private: data.privacy?.isPrivate ?? true,
        allow_non_admin_view_sov_items:
          data.privacy?.allowNonAdminViewSovItems ?? false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update subcontract");
    }

    toast.success("Subcontract updated successfully");
    router.push(`/${projectId}/commitments/${commitmentId}`);
  };

  const handleSubmitPurchaseOrder = async (data: CreatePurchaseOrderInput) => {
    const response = await fetch(`/api/commitments/${commitmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contract_number: data.contractNumber,
        title: data.title,
        contract_company_id: data.contractCompanyId || null,
        status: data.status,
        executed: data.executed,
        description: data.description || null,
        accounting_method: data.accountingMethod || null,
        assigned_to: data.assignedTo || null,
        bill_to: data.billTo || null,
        ship_to: data.shipTo || null,
        ship_via: data.shipVia || null,
        payment_terms: data.paymentTerms || null,
        delivery_date: data.dates?.deliveryDate || null,
        is_private: data.privacy?.isPrivate ?? true,
        allow_non_admin_view_sov_items:
          data.privacy?.allowNonAdminViewSovItems ?? false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update purchase order");
    }

    toast.success("Purchase order updated successfully");
    router.push(`/${projectId}/commitments/${commitmentId}`);
  };

  const handleCancel = () => {
    router.push(`/${projectId}/commitments/${commitmentId}`);
  };

  const title =
    commitmentType === "subcontract"
      ? "Edit Subcontract"
      : commitmentType === "purchase_order"
        ? "Edit Purchase Order"
        : "Edit Commitment";

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Loading..."
          breadcrumbs={[
            { label: "Commitments", href: `/${projectId}/commitments` },
            { label: "Edit" },
          ]}
        />
        <FormContainer maxWidth="xl">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-3/4" />
          </div>
        </FormContainer>
      </>
    );
  }

  if (error || !commitmentData) {
    return (
      <>
        <PageHeader
          title="Error"
          breadcrumbs={[
            { label: "Commitments", href: `/${projectId}/commitments` },
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
        <FormContainer maxWidth="xl">
          <div className="text-center text-destructive p-6">
            {error || "Commitment not found"}
          </div>
        </FormContainer>
      </>
    );
  }

  // Helper to convert empty strings to undefined
  const toDateOrUndefined = (value: string | null | undefined) =>
    value && value.trim() !== "" ? value : undefined;

  // Map API response to form initial data
  const subcontractInitialData = {
    contractNumber: commitmentData.contract_number || "",
    title: commitmentData.title || "",
    contractCompanyId: commitmentData.contract_company_id || "",
    status: commitmentData.status || "Draft",
    executed: commitmentData.executed ?? false,
    accountingMethod: commitmentData.accounting_method || "amount_based",
    description: commitmentData.description || "",
    inclusions: commitmentData.inclusions || "",
    exclusions: commitmentData.exclusions || "",
    defaultRetainagePercent:
      commitmentData.default_retainage_percent || undefined,
    dates: {
      startDate: toDateOrUndefined(commitmentData.start_date),
      estimatedCompletionDate: toDateOrUndefined(
        commitmentData.estimated_completion_date
      ),
      actualCompletionDate: toDateOrUndefined(
        commitmentData.actual_completion_date
      ),
      contractDate: toDateOrUndefined(commitmentData.contract_date),
      signedContractReceivedDate: toDateOrUndefined(
        commitmentData.signed_contract_received_date
      ),
      issuedOnDate: toDateOrUndefined(commitmentData.issued_on_date),
    },
    privacy: {
      isPrivate: commitmentData.is_private ?? true,
      nonAdminUserIds: commitmentData.non_admin_user_ids || [],
      allowNonAdminViewSovItems:
        commitmentData.allow_non_admin_view_sov_items ?? false,
    },
    invoiceContactIds: commitmentData.invoice_contact_ids || [],
    sovLines: (commitmentData.line_items || []).map((item: any) => ({
      budgetCode: item.budget_code || "",
      description: item.description || "",
      amount: item.amount || 0,
    })),
  };

  const purchaseOrderInitialData = {
    ...subcontractInitialData,
    accountingMethod: commitmentData.accounting_method || "unit-quantity",
    assignedTo: commitmentData.assigned_to || "",
    billTo: commitmentData.bill_to || "",
    shipTo: commitmentData.ship_to || "",
    shipVia: commitmentData.ship_via || "",
    paymentTerms: commitmentData.payment_terms || "",
    dates: {
      ...subcontractInitialData.dates,
      deliveryDate: toDateOrUndefined(commitmentData.delivery_date),
      signedPoReceivedDate: toDateOrUndefined(
        commitmentData.signed_po_received_date
      ),
    },
    sovLines: (commitmentData.line_items || []).map((item: any) => ({
      budgetCode: item.budget_code || "",
      description: item.description || "",
      amount: item.amount || 0,
      quantity: item.quantity || 1,
      uom: item.uom || "EA",
      unitCost: item.unit_cost || 0,
    })),
  };

  return (
    <>
      <PageHeader
        title={title}
        breadcrumbs={[
          { label: "Commitments", href: `/${projectId}/commitments` },
          {
            label: commitmentData.contract_number || commitmentId,
            href: `/${projectId}/commitments/${commitmentId}`,
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

      <FormContainer maxWidth="xl">
        {commitmentType === "purchase_order" ? (
          <CreatePurchaseOrderForm
            projectId={projectId}
            onSubmit={handleSubmitPurchaseOrder}
            onCancel={handleCancel}
            initialData={purchaseOrderInitialData}
            mode="edit"
          />
        ) : (
          <CreateSubcontractForm
            projectId={projectId}
            onSubmit={handleSubmitSubcontract}
            onCancel={handleCancel}
            initialData={subcontractInitialData}
            mode="edit"
          />
        )}
      </FormContainer>
    </>
  );
}
