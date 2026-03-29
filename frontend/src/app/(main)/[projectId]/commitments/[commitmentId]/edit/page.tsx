"use client";

import { useEffect, useMemo, useState } from "react";
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
type CommitmentAttachment = {
  fileName?: string;
  file_name?: string;
  name?: string;
  size?: number;
  fileSize?: number;
  type?: string;
  mimeType?: string;
};

export default function EditCommitmentPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.projectId);
  const commitmentId = params.commitmentId as string;

  const { data: rawData, isLoading } = useCommitmentDetail(commitmentId);
  const [attachments, setAttachments] = useState<CommitmentAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchAttachments = async () => {
      try {
        setAttachmentsLoading(true);
        const response = await fetch(`/api/commitments/${commitmentId}/attachments`);
        if (!response.ok) {
          if (isMounted) setAttachments([]);
          return;
        }
        const payload = (await response.json()) as { data?: CommitmentAttachment[] };
        if (isMounted) {
          setAttachments(payload.data || []);
        }
      } catch {
        if (isMounted) setAttachments([]);
      } finally {
        if (isMounted) setAttachmentsLoading(false);
      }
    };

    if (commitmentId) {
      fetchAttachments();
    }

    return () => {
      isMounted = false;
    };
  }, [commitmentId]);

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
          budgetCode:
            typeof item.budget_code === "string" ? item.budget_code : undefined,
          budgetCodeId:
            typeof item.budget_code === "string" ? item.budget_code : undefined,
          budgetCodeLabel:
            typeof item.budget_code === "string" ? item.budget_code : undefined,
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
      inclusions: typeof r.inclusions === "string" ? r.inclusions : undefined,
      exclusions: typeof r.exclusions === "string" ? r.exclusions : undefined,
      dates: {
        startDate: typeof r.start_date === "string" ? r.start_date : undefined,
        estimatedCompletionDate: typeof r.estimated_completion_date === "string" ? r.estimated_completion_date : undefined,
        actualCompletionDate:
          typeof r.actual_completion_date === "string"
            ? r.actual_completion_date
            : undefined,
        contractDate: typeof r.contract_date === "string" ? r.contract_date : undefined,
        signedContractReceivedDate: typeof r.signed_contract_received_date === "string" ? r.signed_contract_received_date : undefined,
        issuedOnDate:
          typeof r.issued_on_date === "string" ? r.issued_on_date : undefined,
      },
      privacy: {
        isPrivate: typeof r.is_private === "boolean" ? r.is_private : true,
        allowNonAdminViewSovItems: typeof r.allow_non_admin_view_sov_items === "boolean" ? r.allow_non_admin_view_sov_items : false,
        nonAdminUserIds: Array.isArray(r.non_admin_user_ids)
          ? (r.non_admin_user_ids as string[])
          : [],
      },
      invoiceContactIds: Array.isArray(r.invoice_contact_ids)
        ? (r.invoice_contact_ids as string[])
        : [],
      sovLines,
      attachments: attachments.map((attachment) => ({
        name:
          attachment.fileName ||
          attachment.file_name ||
          attachment.name ||
          "Attachment",
        size: attachment.fileSize ?? attachment.size ?? 0,
        type: attachment.mimeType ?? attachment.type ?? "",
      })),
    };
    return { isSubcontract: true, subcontractData: data, purchaseOrderData: undefined };
  }, [attachments, rawData]);

  const detailUrl = `/${projectId}/commitments/${commitmentId}`;
  const handleCancel = () => router.push(detailUrl);

  const uploadCommitmentAttachments = async (
    targetCommitmentId: string,
    files: File[],
  ) => {
    if (!files.length) return;

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      const uploadResponse = await fetch(
        `/api/commitments/${targetCommitmentId}/attachments`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!uploadResponse.ok) {
        const uploadError = (await uploadResponse.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(uploadError.error || "Failed to upload attachment");
      }
    }
  };

  const handleSubmitSubcontract = async (
    data: CreateSubcontractInput,
    attachmentFiles: File[] = [],
  ) => {
    const res = await fetch(`/api/commitments/${commitmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contract_number: data.contractNumber,
        title: data.title,
        contract_company_id: data.contractCompanyId || null,
        status: data.status,
        description: data.description || null,
        inclusions: data.inclusions || null,
        exclusions: data.exclusions || null,
        is_private: data.privacy?.isPrivate ?? true,
        non_admin_user_ids: data.privacy?.nonAdminUserIds || [],
        allow_non_admin_view_sov_items: data.privacy?.allowNonAdminViewSovItems ?? false,
        start_date: data.dates?.startDate || null,
        estimated_completion_date: data.dates?.estimatedCompletionDate || null,
        actual_completion_date: data.dates?.actualCompletionDate || null,
        contract_date: data.dates?.contractDate || null,
        signed_contract_received_date:
          data.dates?.signedContractReceivedDate || null,
        issued_on_date: data.dates?.issuedOnDate || null,
        default_retainage_percent: data.defaultRetainagePercent ?? null,
        invoice_contact_ids: data.invoiceContactIds || [],
      }),
    });

    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      throw new Error(err.error || "Failed to save");
    }

    if (attachmentFiles.length > 0) {
      await uploadCommitmentAttachments(commitmentId, attachmentFiles);
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

  if (isLoading || attachmentsLoading) {
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
