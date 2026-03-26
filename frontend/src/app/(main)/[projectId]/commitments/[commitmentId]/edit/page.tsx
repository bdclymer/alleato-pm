"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  CreatePurchaseOrderForm,
  CreateSubcontractForm,
} from "@/components/domain/contracts";
import { ProjectFormPageLayout } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommitmentDetail } from "@/hooks/use-commitments-query";
import type { CreateSubcontractInput, SovLineItem } from "@/lib/schemas/create-subcontract-schema";
import type { CreatePurchaseOrderInput, PurchaseOrderSovLineItem } from "@/lib/schemas/create-purchase-order-schema";

type SubcontractInitialData = Partial<CreateSubcontractInput> & { sovLines?: SovLineItem[] };
type PurchaseOrderInitialData = Partial<CreatePurchaseOrderInput> & { sovLines?: PurchaseOrderSovLineItem[] };

export default function EditCommitmentPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.projectId);
  const commitmentId = params.commitmentId as string;

  const { data: rawData, isLoading } = useCommitmentDetail(commitmentId);

  const { isSubcontract, subcontractData, purchaseOrderData } = useMemo(() => {
    if (!rawData) return { isSubcontract: true, subcontractData: undefined, purchaseOrderData: undefined };

    const r = rawData as Record<string, unknown>;
    const isPO = r.type === "purchase_order";

    // Normalize status to match schema enum values (Title Case)
    const rawStatus = typeof r.status === "string" ? r.status : "draft";
    const statusKey = rawStatus.toLowerCase().replace(/_/g, " ");
    const statusMap: Record<string, string> = {
      draft: "Draft",
      "out for signature": "Out for Signature",
      pending: "Pending",
      approved: "Approved",
      complete: "Complete",
      void: "Void",
      sent: "Sent",
      acknowledged: "Acknowledged",
      completed: "Completed",
    };
    const normalizedStatus = statusMap[statusKey] ?? rawStatus;

    // Map line items to SOV format
    const sovLines = Array.isArray(r.line_items)
      ? (r.line_items as Array<Record<string, unknown>>).map((item, idx) => ({
          lineNumber: typeof item.line_number === "number" ? item.line_number : idx + 1,
          budgetCode: typeof item.budget_code === "string" ? item.budget_code : undefined,
          description: typeof item.description === "string" ? item.description : undefined,
          amount: typeof item.amount === "number" ? item.amount : 0,
          billedToDate: typeof item.billed_to_date === "number" ? item.billed_to_date : undefined,
        }))
      : [];

    if (isPO) {
      const data: PurchaseOrderInitialData = {
        contractNumber: typeof r.contract_number === "string" ? r.contract_number : "",
        title: typeof r.title === "string" ? r.title : "",
        contractCompanyId: typeof r.contract_company_id === "string" ? r.contract_company_id : undefined,
        status: normalizedStatus as "Draft" | "Approved" | "Sent" | "Acknowledged" | "Completed",
        executed: typeof r.executed === "boolean" ? r.executed : false,
        defaultRetainagePercent: typeof r.default_retainage_percent === "number" ? r.default_retainage_percent : undefined,
        description: typeof r.description === "string" ? r.description : undefined,
        dates: {
          contractDate: typeof r.contract_date === "string" ? r.contract_date : undefined,
          deliveryDate: typeof r.delivery_date === "string" ? r.delivery_date : undefined,
          signedPoReceivedDate: typeof r.signed_po_received_date === "string" ? r.signed_po_received_date : undefined,
          issuedOnDate: undefined,
        },
        privacy: {
          isPrivate: typeof r.is_private === "boolean" ? r.is_private : true,
          allowNonAdminViewSovItems: typeof r.allow_non_admin_view_sov_items === "boolean" ? r.allow_non_admin_view_sov_items : false,
        },
        sovLines: sovLines as unknown as PurchaseOrderSovLineItem[],
      };
      return { isSubcontract: false, subcontractData: undefined, purchaseOrderData: data };
    }

    // Subcontract accounting method
    const rawMethod = typeof r.accounting_method === "string" ? r.accounting_method.toLowerCase() : "amount_based";
    const accountingMethod: "amount_based" | "unit_quantity" = rawMethod.includes("unit") ? "unit_quantity" : "amount_based";

    const data: SubcontractInitialData = {
      contractNumber: typeof r.contract_number === "string" ? r.contract_number : "",
      title: typeof r.title === "string" ? r.title : "",
      contractCompanyId: typeof r.contract_company_id === "string" ? r.contract_company_id : "",
      status: normalizedStatus as "Draft" | "Out for Signature" | "Pending" | "Approved" | "Complete" | "Void",
      executed: typeof r.executed === "boolean" ? r.executed : false,
      accountingMethod,
      defaultRetainagePercent: typeof r.default_retainage_percent === "number" ? r.default_retainage_percent : undefined,
      description: typeof r.description === "string" ? r.description : undefined,
      dates: {
        startDate: typeof r.start_date === "string" ? r.start_date : undefined,
        estimatedCompletionDate: typeof r.estimated_completion_date === "string" ? r.estimated_completion_date : undefined,
        actualCompletionDate: undefined,
        contractDate: typeof r.contract_date === "string" ? r.contract_date : undefined,
        signedContractReceivedDate: typeof r.signed_contract_received_date === "string" ? r.signed_contract_received_date : undefined,
        issuedOnDate: undefined,
      },
      privacy: {
        isPrivate: typeof r.is_private === "boolean" ? r.is_private : true,
        allowNonAdminViewSovItems: typeof r.allow_non_admin_view_sov_items === "boolean" ? r.allow_non_admin_view_sov_items : false,
      },
      sovLines,
    };
    return { isSubcontract: true, subcontractData: data, purchaseOrderData: undefined };
  }, [rawData]);

  const detailUrl = `/${projectId}/commitments/${commitmentId}`;
  const handleCancel = () => router.push(detailUrl);

  const handleSubmitSubcontract = async (data: CreateSubcontractInput) => {
    const res = await fetch(`/api/commitments/${commitmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contract_number: data.contractNumber,
        title: data.title,
        contract_company_id: data.contractCompanyId || null,
        status: data.status,
        description: data.description || null,
        is_private: data.privacy?.isPrivate ?? true,
        allow_non_admin_view_sov_items: data.privacy?.allowNonAdminViewSovItems ?? false,
        start_date: data.dates?.startDate || null,
        estimated_completion_date: data.dates?.estimatedCompletionDate || null,
        contract_date: data.dates?.contractDate || null,
      }),
    });

    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      throw new Error(err.error || "Failed to save");
    }

    toast.success("Subcontract updated successfully");
    router.push(detailUrl);
  };

  const handleSubmitPurchaseOrder = async (data: CreatePurchaseOrderInput) => {
    const res = await fetch(`/api/commitments/${commitmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contract_number: data.contractNumber,
        title: data.title,
        contract_company_id: data.contractCompanyId || null,
        status: data.status,
        description: data.description || null,
        is_private: data.privacy?.isPrivate ?? true,
        allow_non_admin_view_sov_items: data.privacy?.allowNonAdminViewSovItems ?? false,
        contract_date: data.dates?.contractDate || null,
        delivery_date: data.dates?.deliveryDate || null,
      }),
    });

    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      throw new Error(err.error || "Failed to save");
    }

    toast.success("Purchase order updated successfully");
    router.push(detailUrl);
  };

  const title = isSubcontract ? "Edit Subcontract" : "Edit Purchase Order";
  const description = isSubcontract ? "Update subcontract details" : "Update purchase order details";

  if (isLoading) {
    return (
      <ProjectFormPageLayout
        title={title}
        description={description}
        maxWidth="3xl"
        onBack={handleCancel}
        backLabel="Cancel"
      >
        <div className="space-y-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </ProjectFormPageLayout>
    );
  }

  return (
    <ProjectFormPageLayout
      title={title}
      description={description}
      maxWidth="3xl"
      onBack={handleCancel}
      backLabel="Cancel"
    >
      {isSubcontract ? (
        <CreateSubcontractForm
          projectId={projectId}
          onSubmit={handleSubmitSubcontract}
          onCancel={handleCancel}
          initialData={subcontractData}
          mode="edit"
        />
      ) : (
        <CreatePurchaseOrderForm
          projectId={projectId}
          onSubmit={handleSubmitPurchaseOrder}
          onCancel={handleCancel}
          initialData={purchaseOrderData}
          mode="edit"
        />
      )}
    </ProjectFormPageLayout>
  );
}
