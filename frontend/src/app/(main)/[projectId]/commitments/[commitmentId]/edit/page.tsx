"use client";

import { useMemo } from "react";
import type { ReactElement } from "react";
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
import { useCommitmentDetail } from "@/hooks/use-commitments-query";

type CommitmentLineItem = {
  budget_code?: string | null;
  description?: string | null;
  amount?: number | null;
  quantity?: number | null;
  uom?: string | null;
  unit_cost?: number | null;
};

type CommitmentDetail = {
  id: string;
  contract_number?: string | null;
  title?: string | null;
  contract_company_id?: string | null;
  status?: string | null;
  executed?: boolean | null;
  accounting_method?: string | null;
  description?: string | null;
  inclusions?: string | null;
  exclusions?: string | null;
  default_retainage_percent?: number | null;
  start_date?: string | null;
  estimated_completion_date?: string | null;
  actual_completion_date?: string | null;
  contract_date?: string | null;
  signed_contract_received_date?: string | null;
  issued_on_date?: string | null;
  is_private?: boolean | null;
  non_admin_user_ids?: string[] | null;
  allow_non_admin_view_sov_items?: boolean | null;
  invoice_contact_ids?: string[] | null;
  line_items?: CommitmentLineItem[] | null;
  assigned_to?: string | null;
  bill_to?: string | null;
  ship_to?: string | null;
  ship_via?: string | null;
  payment_terms?: string | null;
  delivery_date?: string | null;
  signed_po_received_date?: string | null;
  type?: string | null;
  commitment_type?: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const asNumber = (value: unknown): number | null =>
  typeof value === "number" ? value : null;

const asBoolean = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null;

const asStringArray = (value: unknown): string[] | null =>
  Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : null;

const toCommitmentDetail = (raw: unknown): CommitmentDetail | null => {
  if (!isRecord(raw)) return null;

  const lineItemsRaw = Array.isArray(raw.line_items)
    ? raw.line_items.filter(isRecord)
    : [];

  const line_items = lineItemsRaw.map((item) => ({
    budget_code: asString(item.budget_code),
    description: asString(item.description),
    amount: asNumber(item.amount),
    quantity: asNumber(item.quantity),
    uom: asString(item.uom),
    unit_cost: asNumber(item.unit_cost),
  }));

  const idValue = asString(raw.id);
  if (!idValue) return null;

  return {
    id: idValue,
    contract_number: asString(raw.contract_number),
    title: asString(raw.title),
    contract_company_id: asString(raw.contract_company_id),
    status: asString(raw.status),
    executed: asBoolean(raw.executed),
    accounting_method: asString(raw.accounting_method),
    description: asString(raw.description),
    inclusions: asString(raw.inclusions),
    exclusions: asString(raw.exclusions),
    default_retainage_percent: asNumber(raw.default_retainage_percent),
    start_date: asString(raw.start_date),
    estimated_completion_date: asString(raw.estimated_completion_date),
    actual_completion_date: asString(raw.actual_completion_date),
    contract_date: asString(raw.contract_date),
    signed_contract_received_date: asString(raw.signed_contract_received_date),
    issued_on_date: asString(raw.issued_on_date),
    is_private: asBoolean(raw.is_private),
    non_admin_user_ids: asStringArray(raw.non_admin_user_ids),
    allow_non_admin_view_sov_items: asBoolean(raw.allow_non_admin_view_sov_items),
    invoice_contact_ids: asStringArray(raw.invoice_contact_ids),
    line_items,
    assigned_to: asString(raw.assigned_to),
    bill_to: asString(raw.bill_to),
    ship_to: asString(raw.ship_to),
    ship_via: asString(raw.ship_via),
    payment_terms: asString(raw.payment_terms),
    delivery_date: asString(raw.delivery_date),
    signed_po_received_date: asString(raw.signed_po_received_date),
    type: asString(raw.type),
    commitment_type: asString(raw.commitment_type),
  };
};

export default function EditCommitmentPage(): ReactElement {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.projectId);
  const commitmentId = params.commitmentId as string;

  const {
    data: rawData,
    isLoading,
    error: queryError,
  } = useCommitmentDetail(commitmentId);

  const commitmentData = useMemo(
    () => toCommitmentDetail(rawData),
    [rawData],
  );

  const commitmentType =
    commitmentData?.type ||
    commitmentData?.commitment_type ||
    "subcontract";

  const error =
    queryError instanceof Error
      ? queryError.message
      : !commitmentData && !isLoading
        ? "Commitment not found"
        : null;

  const normalizeStatus = (rawStatus: unknown, typeHint?: string) => {
    if (typeof rawStatus !== "string") {
      return undefined;
    }

    const normalized = rawStatus
      .trim()
      .toLowerCase()
      .replace(/_/g, " ");

    if (typeHint === "purchase_order") {
      const purchaseOrderMap: Record<string, string> = {
        draft: "Draft",
        approved: "Approved",
        sent: "Sent",
        acknowledged: "Acknowledged",
        complete: "Completed",
        completed: "Completed",
      };
      return purchaseOrderMap[normalized] ?? undefined;
    }

    const subcontractMap: Record<string, string> = {
      draft: "Draft",
      "out for signature": "Out for Signature",
      pending: "Pending",
      approved: "Approved",
      complete: "Complete",
      void: "Void",
    };
    return subcontractMap[normalized] ?? undefined;
  };

  const normalizeAccountingMethod = (
    rawMethod: unknown,
    typeHint?: string,
  ) => {
    if (typeof rawMethod !== "string") {
      return undefined;
    }

    const normalized = rawMethod.trim().toLowerCase();

    if (typeHint === "purchase_order") {
      if (normalized === "unit_quantity" || normalized === "unit-quantity") {
        return "unit-quantity";
      }
      if (normalized === "amount_based" || normalized === "amount") {
        return "amount";
      }
      return undefined;
    }

    if (normalized === "unit-quantity" || normalized === "unit") {
      return "unit_quantity";
    }
    if (normalized === "amount") {
      return "amount_based";
    }
    return normalized === "unit_quantity" || normalized === "amount_based"
      ? normalized
      : undefined;
  };

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
  const normalizedStatus = normalizeStatus(
    commitmentData?.status,
    commitmentType,
  );
  const normalizedAccountingMethod = normalizeAccountingMethod(
    commitmentData?.accounting_method,
    commitmentType,
  );

  const subcontractInitialData = {
    contractNumber: commitmentData?.contract_number || "",
    title: commitmentData?.title || "",
    contractCompanyId: commitmentData?.contract_company_id || "",
    status: normalizedStatus || "Draft",
    executed: commitmentData?.executed ?? false,
    accountingMethod: normalizedAccountingMethod || "amount_based",
    description: commitmentData?.description || "",
    inclusions: commitmentData?.inclusions || "",
    exclusions: commitmentData?.exclusions || "",
    defaultRetainagePercent:
      commitmentData?.default_retainage_percent || undefined,
    dates: {
      startDate: toDateOrUndefined(commitmentData?.start_date),
      estimatedCompletionDate: toDateOrUndefined(
        commitmentData?.estimated_completion_date
      ),
      actualCompletionDate: toDateOrUndefined(
        commitmentData?.actual_completion_date
      ),
      contractDate: toDateOrUndefined(commitmentData?.contract_date),
      signedContractReceivedDate: toDateOrUndefined(
        commitmentData?.signed_contract_received_date
      ),
      issuedOnDate: toDateOrUndefined(commitmentData?.issued_on_date),
    },
    privacy: {
      isPrivate: commitmentData?.is_private ?? true,
      nonAdminUserIds: commitmentData?.non_admin_user_ids || [],
      allowNonAdminViewSovItems:
        commitmentData?.allow_non_admin_view_sov_items ?? false,
    },
    invoiceContactIds: commitmentData?.invoice_contact_ids || [],
    sovLines: (commitmentData?.line_items || []).map((item) => ({
      budgetCode: item.budget_code || "",
      description: item.description || "",
      amount: item.amount || 0,
    })),
  };

  const purchaseOrderInitialData = {
    ...subcontractInitialData,
    accountingMethod: normalizedAccountingMethod || "unit-quantity",
    assignedTo: commitmentData?.assigned_to || "",
    billTo: commitmentData?.bill_to || "",
    shipTo: commitmentData?.ship_to || "",
    shipVia: commitmentData?.ship_via || "",
    paymentTerms: commitmentData?.payment_terms || "",
    dates: {
      ...subcontractInitialData.dates,
      deliveryDate: toDateOrUndefined(commitmentData?.delivery_date),
      signedPoReceivedDate: toDateOrUndefined(
        commitmentData?.signed_po_received_date
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
            label: commitmentData?.contract_number || commitmentId,
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
