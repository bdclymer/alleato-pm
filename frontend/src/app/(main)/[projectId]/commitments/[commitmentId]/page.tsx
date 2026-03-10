"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { Download, Edit, Mail, Trash2 } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AdvancedSettingsTab } from "@/components/commitments/tabs/AdvancedSettingsTab";
import { AttachmentsTab } from "@/components/commitments/tabs/AttachmentsTab";
import { ChangeOrdersTab } from "@/components/commitments/tabs/ChangeOrdersTab";
import { InvoicesTab } from "@/components/commitments/tabs/InvoicesTab";
import { ScheduleOfValuesTab } from "@/components/commitments/tabs/ScheduleOfValuesTab";
import { EmailCommitmentDialog } from "@/components/commitments/EmailCommitmentDialog";
import { ExportDialog } from "@/components/commitments/ExportDialog";
import {
  CreatePurchaseOrderForm,
  CreateSubcontractForm,
} from "@/components/domain/contracts";
import { ProjectPageHeader } from "@/components/layout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Stack } from "@/components/ui/stack";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text } from "@/components/ui/text";
import { formatCurrency } from "@/config/tables";
import {
  commitmentKeys,
  useCommitmentDetail,
} from "@/hooks/use-commitments-query";
import { useProjectTitle } from "@/hooks/useProjectTitle";
import { formatDate } from "@/lib/table-config/formatters";
import type {
  CreatePurchaseOrderInput,
  PurchaseOrderSovLineItem,
} from "@/lib/schemas/create-purchase-order-schema";
import type {
  CreateSubcontractInput,
  SovLineItem,
} from "@/lib/schemas/create-subcontract-schema";
import type { Commitment } from "@/types/financial";

type CommitmentDetail = Commitment & {
  project_id?: number;
  type?: "subcontract" | "purchase_order" | string;
  pending_change_orders?: number;
  draft_change_orders?: number;
  change_order_totals?: {
    approved: number;
    pending: number;
    draft: number;
    executed: number;
    void: number;
    total: number;
  };
  line_items?: Array<{
    id: string;
    line_number?: number | null;
    budget_code?: string | null;
    description?: string | null;
    amount?: number | null;
    quantity?: number | null;
    uom?: string | null;
    unit_cost?: number | null;
    billed_to_date?: number | null;
  }>;
};

const normalizeCommitment = (raw: unknown): CommitmentDetail | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const accountingMethodRaw =
    typeof record.accounting_method === "string"
      ? record.accounting_method.toLowerCase()
      : "";

  const accountingMethod: CommitmentDetail["accounting_method"] =
    accountingMethodRaw === "unit_quantity"
      ? "unit"
      : accountingMethodRaw === "amount_based"
        ? "amount"
        : accountingMethodRaw === "percent"
          ? "percent"
          : "amount";

  const statusValue =
    typeof record.status === "string"
      ? (record.status.toLowerCase() as CommitmentDetail["status"])
      : "draft";

  const contractCompany =
    record.contract_company && typeof record.contract_company === "object"
      ? (record.contract_company as CommitmentDetail["contract_company"])
      : undefined;

  const assignee =
    record.assignee && typeof record.assignee === "object"
      ? (record.assignee as CommitmentDetail["assignee"])
      : undefined;

  const lineItemsRaw = Array.isArray(record.line_items)
    ? (record.line_items as Array<Record<string, unknown>>)
    : [];

  const line_items = lineItemsRaw.map((item) => ({
    id: String(item.id ?? crypto.randomUUID()),
    line_number:
      typeof item.line_number === "number" || typeof item.line_number === "string"
        ? Number(item.line_number)
        : null,
    budget_code:
      typeof item.budget_code === "string"
        ? item.budget_code
        : typeof item.cost_code === "string"
          ? item.cost_code
          : null,
    description:
      typeof item.description === "string"
        ? item.description
        : typeof item.title === "string"
          ? item.title
          : null,
    amount:
      typeof item.amount === "number" || typeof item.amount === "string"
        ? Number(item.amount)
        : null,
    quantity:
      typeof item.quantity === "number" || typeof item.quantity === "string"
        ? Number(item.quantity)
        : null,
    uom: typeof item.uom === "string" ? item.uom : null,
    unit_cost:
      typeof item.unit_cost === "number" || typeof item.unit_cost === "string"
        ? Number(item.unit_cost)
        : null,
    billed_to_date:
      typeof item.billed_to_date === "number" ||
      typeof item.billed_to_date === "string"
        ? Number(item.billed_to_date)
        : null,
  }));

  return {
    id: String(record.id ?? ""),
    number: typeof record.number === "string" ? record.number : "",
    contract_company_id: String(record.contract_company_id ?? ""),
    contract_company: contractCompany,
    title: typeof record.title === "string" ? record.title : "",
    description:
      typeof record.description === "string" ? record.description : undefined,
    status: statusValue,
    original_amount: Number(record.original_amount ?? 0),
    approved_change_orders: Number(record.approved_change_orders ?? 0),
    revised_contract_amount: Number(
      record.revised_contract_amount ?? record.original_amount ?? 0,
    ),
    billed_to_date: Number(record.billed_to_date ?? 0),
    balance_to_finish: Number(record.balance_to_finish ?? 0),
    executed_date:
      typeof record.executed_date === "string"
        ? record.executed_date
        : undefined,
    start_date:
      typeof record.start_date === "string" ? record.start_date : undefined,
    substantial_completion_date:
      typeof record.substantial_completion_date === "string"
        ? record.substantial_completion_date
        : undefined,
    accounting_method: accountingMethod,
    retention_percentage: Number(record.retention_percentage ?? 0),
    vendor_invoice_number:
      typeof record.vendor_invoice_number === "string"
        ? record.vendor_invoice_number
        : undefined,
    signed_received_date:
      typeof record.signed_received_date === "string"
        ? record.signed_received_date
        : undefined,
    assignee_id: record.assignee_id ? String(record.assignee_id) : undefined,
    assignee,
    private:
      typeof record.private === "boolean"
        ? record.private
        : typeof record.is_private === "boolean"
          ? record.is_private
          : false,
    deleted_at:
      typeof record.deleted_at === "string" ? record.deleted_at : undefined,
    is_deleted:
      typeof record.is_deleted === "boolean" ? record.is_deleted : undefined,
    created_at:
      typeof record.created_at === "string"
        ? record.created_at
        : new Date().toISOString(),
    updated_at:
      typeof record.updated_at === "string"
        ? record.updated_at
        : new Date().toISOString(),
    project_id: typeof record.project_id === "number" ? record.project_id : undefined,
    type: typeof record.type === "string" ? record.type : undefined,
    pending_change_orders: Number(record.pending_change_orders ?? 0),
    draft_change_orders: Number(record.draft_change_orders ?? 0),
    change_order_totals:
      record.change_order_totals && typeof record.change_order_totals === "object"
        ? (record.change_order_totals as CommitmentDetail["change_order_totals"])
        : undefined,
    line_items,
  };
};

/**
 * Commitment Detail Page
 *
 * Displays detailed information about a specific commitment (subcontract or purchase order)
 */
export default function CommitmentDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const projectId = parseInt(params.projectId as string);
  const commitmentId = params.commitmentId as string;
  const queryClient = useQueryClient();

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Use React Query for cached, deduplicated data fetching
  const {
    data: rawData,
    isLoading,
    error: queryError,
    refetch: fetchCommitment,
  } = useCommitmentDetail(commitmentId);

  // Normalize the fetched data - memoize to avoid reprocessing on every render
  const commitment = useMemo(() => {
    if (!rawData) return null;
    return normalizeCommitment(rawData);
  }, [rawData]);

  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Failed to fetch commitment"
    : !commitment && !isLoading
      ? "Commitment not found"
      : null;

  useProjectTitle(
    commitment ? `${commitment.number} - ${commitment.title}` : "Loading...",
  );

  // Action handlers
  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (
      !commitment ||
      !confirm(
        `Are you sure you want to delete commitment ${commitment.number}?`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/commitments/${commitmentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete commitment");
      }

      // Invalidate caches after deletion
      queryClient.invalidateQueries({ queryKey: commitmentKeys.lists() });
      queryClient.removeQueries({ queryKey: commitmentKeys.detail(commitmentId) });

      toast.success("Commitment deleted successfully");
      router.push(`/${projectId}/commitments`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete commitment",
      );
    }
  }, [commitment, commitmentId, projectId, router, queryClient]);

  const handleExport = useCallback(() => {
    setIsExportDialogOpen(true);
  }, []);

  const handleEmail = useCallback(() => {
    setIsEmailDialogOpen(true);
  }, []);

  useEffect(() => {
    if (searchParams.get("edit") === "1") {
      setIsEditing(true);
    }
  }, [searchParams]);

  const normalizeStatus = (
    rawStatus: unknown,
    typeHint?: string,
  ):
    | CreatePurchaseOrderInput["status"]
    | CreateSubcontractInput["status"]
    | undefined => {
    if (typeof rawStatus !== "string") {
      return undefined;
    }

    const normalized = rawStatus
      .trim()
      .toLowerCase()
      .replace(/_/g, " ");

    if (typeHint === "purchase_order") {
      const purchaseOrderMap: Record<
        string,
        CreatePurchaseOrderInput["status"] | undefined
      > = {
        draft: "Draft",
        approved: "Approved",
        sent: "Sent",
        acknowledged: "Acknowledged",
        complete: "Completed",
        completed: "Completed",
      };
      return purchaseOrderMap[normalized];
    }

    const subcontractMap: Record<
      string,
      CreateSubcontractInput["status"] | undefined
    > = {
      draft: "Draft",
      "out for signature": "Out for Signature",
      pending: "Pending",
      approved: "Approved",
      complete: "Complete",
      void: "Void",
    };
    return subcontractMap[normalized];
  };

  const normalizeAccountingMethod = (
    rawMethod: unknown,
    typeHint?: string,
  ):
    | CreatePurchaseOrderInput["accountingMethod"]
    | CreateSubcontractInput["accountingMethod"]
    | undefined => {
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
    setIsEditing(false);
    await fetchCommitment();
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
    setIsEditing(false);
    await fetchCommitment();
  };

  const breadcrumbs = [
    { label: "Projects", href: "/" },
    { label: "Project", href: `/${projectId}` },
    { label: "Commitments", href: `/${projectId}/commitments` },
    { label: "Details" },
  ];

  if (isLoading) {
    return (
      <>
        <ProjectPageHeader
          title="Commitment Details"
          description="Loading..."
          breadcrumbs={breadcrumbs}
        />
        <PageContainer>
          <Stack>
            {/* Tab bar skeleton */}
            <Skeleton className="h-10 w-full max-w-[600px]" />
            {/* Content skeleton */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Skeleton className="h-6 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  {["title", "status", "company", "method"].map((field) => (
                    <div key={field} className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-6">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-20 w-full mt-4" />
                </div>
              </CardContent>
            </Card>
          </Stack>
        </PageContainer>
      </>
    );
  }

  if (error || !commitment) {
    return (
      <>
        <ProjectPageHeader
          title="Commitment Details"
          description="Commitment not found"
          breadcrumbs={breadcrumbs}
        />
        <PageContainer>
          <Card>
            <CardContent className="pt-6">
              <Text tone="destructive">{error || "Commitment not found"}</Text>
            </CardContent>
          </Card>
        </PageContainer>
      </>
    );
  }

  if (isEditing) {
    const commitmentType = commitment.type || "subcontract";
    const toDateOrUndefined = (value: string | null | undefined) =>
      value && value.trim() !== "" ? value : undefined;

    const normalizedStatus = normalizeStatus(commitment.status, commitmentType);
    const normalizedAccountingMethod = normalizeAccountingMethod(
      commitment.accounting_method,
      commitmentType,
    );

    const subcontractInitialData: Partial<CreateSubcontractInput> & {
      sovLines?: SovLineItem[];
    } = {
      contractNumber: commitment.number || "",
      title: commitment.title || "",
      contractCompanyId: commitment.contract_company_id || "",
      status:
        (normalizedStatus as CreateSubcontractInput["status"] | undefined) ??
        ("Draft" as const),
      executed: false,
      accountingMethod: (normalizedAccountingMethod ??
        "amount_based") as CreateSubcontractInput["accountingMethod"],
      description: commitment.description || "",
      inclusions: "",
      exclusions: "",
      defaultRetainagePercent: commitment.retention_percentage || undefined,
      dates: {
        startDate: toDateOrUndefined(commitment.start_date),
        estimatedCompletionDate: toDateOrUndefined(
          commitment.substantial_completion_date,
        ),
        actualCompletionDate: undefined,
        contractDate: toDateOrUndefined(commitment.executed_date),
        signedContractReceivedDate: undefined,
        issuedOnDate: undefined,
      },
      privacy: {
        isPrivate: commitment.private ?? true,
        nonAdminUserIds: [],
        allowNonAdminViewSovItems: false,
      },
      invoiceContactIds: [],
      sovLines: (commitment.line_items || []).map((item, index) => ({
        lineNumber: index + 1,
        budgetCode: item.budget_code || undefined,
        description: item.description || undefined,
        amount: item.amount || undefined,
        billedToDate: undefined,
        changeEventLineItem: undefined,
      })),
    };

    const purchaseOrderInitialData: Partial<CreatePurchaseOrderInput> & {
      sovLines?: PurchaseOrderSovLineItem[];
    } = {
      contractNumber: commitment.number || "",
      title: commitment.title || "",
      contractCompanyId: commitment.contract_company_id || "",
      status:
        (normalizedStatus as CreatePurchaseOrderInput["status"] | undefined) ??
        ("Draft" as const),
      executed: false,
      accountingMethod: (normalizedAccountingMethod ??
        "unit-quantity") as CreatePurchaseOrderInput["accountingMethod"],
      assignedTo: "",
      billTo: "",
      shipTo: "",
      shipVia: "",
      paymentTerms: "",
      dates: {
        contractDate: toDateOrUndefined(commitment.executed_date),
        deliveryDate: undefined,
        signedPoReceivedDate: undefined,
        issuedOnDate: undefined,
      },
      privacy: {
        isPrivate: commitment.private ?? true,
        nonAdminUserIds: [],
        allowNonAdminViewSovItems: false,
      },
      invoiceContactIds: [],
      sovLines: (commitment.line_items || []).map((item, index) => ({
        lineNumber: index + 1,
        budgetCode: item.budget_code || undefined,
        description: item.description || undefined,
        amount: item.amount || 0,
        quantity: item.quantity || undefined,
        uom: item.uom || undefined,
        unitCost: item.amount || undefined,
        billedToDate: undefined,
        changeEventLineItem: undefined,
      })),
    };

    return (
      <>
        <ProjectPageHeader
          title={`Edit ${commitment.number} — ${commitment.title}`}
          description="Update commitment details"
          breadcrumbs={breadcrumbs}
          actions={
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              Cancel Edit
            </Button>
          }
        />
        <PageContainer>
          {commitmentType === "purchase_order" ? (
            <CreatePurchaseOrderForm
              projectId={projectId}
              onSubmit={handleSubmitPurchaseOrder}
              onCancel={() => setIsEditing(false)}
              initialData={purchaseOrderInitialData}
              mode="edit"
            />
          ) : (
            <CreateSubcontractForm
              projectId={projectId}
              onSubmit={handleSubmitSubcontract}
              onCancel={() => setIsEditing(false)}
              initialData={subcontractInitialData}
              mode="edit"
            />
          )}
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <ProjectPageHeader
        title={`${commitment.number} — ${commitment.title}`}
        description={[
          commitment.status.replace(/_/g, " "),
          commitment.private ? "Private" : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleEmail}>
              <Mail className="mr-2 h-4 w-4" />
              Email
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        }
      />
      <PageContainer>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="sov">SOV</TabsTrigger>
          <TabsTrigger value="change-orders">Change Orders</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
          <TabsTrigger value="advanced-settings">Advanced Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardContent className="pt-6 divide-y divide-border">
              <div className="pb-6">
                <Text size="sm" weight="medium" className="mb-4">General Information</Text>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Title
                    </Text>
                    <Text>{commitment.title}</Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Status
                    </Text>
                    <Text transform="capitalize">
                      {commitment.status?.replace(/_/g, " ") || "—"}
                    </Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Company
                    </Text>
                    <Text>{commitment.contract_company?.name || "—"}</Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Accounting Method
                    </Text>
                    <Text transform="capitalize">
                      {commitment.accounting_method?.replace(/_/g, " ") || "—"}
                    </Text>
                  </Stack>
                </div>
              </div>

              <div className="pt-6">
                <Text size="sm" weight="medium" className="mb-4">Description</Text>
                <Text>{commitment.description || "No description provided"}</Text>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardContent className="pt-6 divide-y divide-border">
              <div className="pb-6">
                <Text size="sm" weight="medium" className="mb-4">Contract Amounts</Text>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Original Amount
                    </Text>
                    <Text size="lg" weight="medium">
                      {formatCurrency(commitment.original_amount || 0)}
                    </Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Approved Change Orders
                    </Text>
                    <Text size="lg" weight="medium" className="text-green-600">
                      {commitment.approved_change_orders
                        ? `+${formatCurrency(commitment.approved_change_orders)}`
                        : formatCurrency(0)}
                    </Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Revised Amount
                    </Text>
                    <Text size="lg" weight="bold">
                      {formatCurrency(commitment.revised_contract_amount || 0)}
                    </Text>
                  </Stack>
                </div>
              </div>

              <div className="py-6">
                <Text size="sm" weight="medium" className="mb-4">Change Order Summary</Text>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-4">
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Approved / Executed
                    </Text>
                    <Text size="lg" weight="medium" className="text-green-600">
                      {formatCurrency(commitment.approved_change_orders || 0)}
                    </Text>
                    <Text size="xs" tone="muted">
                      Included in revised amount
                    </Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Pending Approval
                    </Text>
                    <Text size="lg" weight="medium" className="text-amber-600">
                      {formatCurrency(commitment.pending_change_orders || 0)}
                    </Text>
                    <Text size="xs" tone="muted">
                      Awaiting approval
                    </Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Draft
                    </Text>
                    <Text size="lg" weight="medium" className="text-muted-foreground">
                      {formatCurrency(commitment.draft_change_orders || 0)}
                    </Text>
                    <Text size="xs" tone="muted">
                      Not yet submitted
                    </Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Potential Total
                    </Text>
                    <Text size="lg" weight="medium" className="text-blue-600">
                      {formatCurrency(
                        (commitment.approved_change_orders || 0) +
                          (commitment.pending_change_orders || 0) +
                          (commitment.draft_change_orders || 0)
                      )}
                    </Text>
                    <Text size="xs" tone="muted">
                      If all COs approved
                    </Text>
                  </Stack>
                </div>
              </div>

              <div className="py-6">
                <Text size="sm" weight="medium" className="mb-4">Invoice Progress</Text>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-4">
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Invoiced to Date
                    </Text>
                    <Text size="lg" weight="medium" className="text-green-600">
                      {formatCurrency(commitment.billed_to_date || 0)}
                    </Text>
                    <Text size="xs" tone="muted">
                      {commitment.revised_contract_amount
                        ? `${Math.round(((commitment.billed_to_date || 0) / commitment.revised_contract_amount) * 100)}% of contract`
                        : "—"}
                    </Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Retention %
                    </Text>
                    <Text size="lg" weight="medium">
                      {commitment.retention_percentage
                        ? `${commitment.retention_percentage}%`
                        : "—"}
                    </Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Retention Amount
                    </Text>
                    <Text size="lg" weight="medium" className="text-amber-600">
                      {commitment.retention_percentage && commitment.billed_to_date
                        ? formatCurrency(
                            (commitment.billed_to_date * commitment.retention_percentage) / 100
                          )
                        : formatCurrency(0)}
                    </Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Balance to Finish
                    </Text>
                    <Text size="lg" weight="medium">
                      {formatCurrency(commitment.balance_to_finish || 0)}
                    </Text>
                  </Stack>
                </div>
              </div>

              <div className="pt-6">
                <Text size="sm" weight="medium" className="mb-4">Additional Information</Text>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Private
                    </Text>
                    <Text>{commitment.private ? "Yes" : "No"}</Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Vendor Invoice Number
                    </Text>
                    <Text>{commitment.vendor_invoice_number || "—"}</Text>
                  </Stack>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardContent className="pt-6 divide-y divide-border">
              <div className="pb-6">
                <Text size="sm" weight="medium" className="mb-4">Key Dates</Text>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Start Date
                    </Text>
                    <Text>
                      {commitment.start_date
                        ? formatDate(commitment.start_date)
                        : "—"}
                    </Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Substantial Completion Date
                    </Text>
                    <Text>
                      {commitment.substantial_completion_date
                        ? formatDate(commitment.substantial_completion_date)
                        : "—"}
                    </Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Executed Date
                    </Text>
                    <Text>
                      {commitment.executed_date
                        ? formatDate(commitment.executed_date)
                        : "—"}
                    </Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Signed Received Date
                    </Text>
                    <Text>
                      {commitment.signed_received_date
                        ? formatDate(commitment.signed_received_date)
                        : "—"}
                    </Text>
                  </Stack>
                </div>
              </div>

              <div className="pt-6">
                <Text size="sm" weight="medium" className="mb-4">Timestamps</Text>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Created
                    </Text>
                    <Text>
                      {commitment.created_at
                        ? formatDate(commitment.created_at)
                        : "—"}
                    </Text>
                  </Stack>
                  <Stack gap="xs">
                    <Text size="sm" tone="muted">
                      Last Updated
                    </Text>
                    <Text>
                      {commitment.updated_at
                        ? formatDate(commitment.updated_at)
                        : "—"}
                    </Text>
                  </Stack>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sov">
          <ScheduleOfValuesTab
            lineItems={commitment.line_items || []}
            projectId={projectId}
            commitmentId={commitment.id}
            commitmentType={commitment.type}
            onImportComplete={() => void fetchCommitment()}
          />
        </TabsContent>

        <TabsContent value="change-orders">
          <ChangeOrdersTab commitmentId={commitment.id} projectId={projectId} />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesTab commitmentId={commitment.id} />
        </TabsContent>

        <TabsContent value="attachments">
          <AttachmentsTab commitmentId={commitment.id} />
        </TabsContent>

        <TabsContent value="advanced-settings">
          <AdvancedSettingsTab
            commitmentId={commitment.id}
            commitmentType={commitment.type}
          />
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <ExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        projectId={String(projectId)}
        commitmentId={commitment.id}
        commitmentNumber={commitment.number}
      />

      {/* Email Dialog */}
      <EmailCommitmentDialog
        open={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        commitmentId={commitment.id}
        commitmentNumber={commitment.number}
        commitmentTitle={commitment.title}
        companyId={commitment.contract_company_id}
        companyName={commitment.contract_company?.name}
      />
      </PageContainer>
    </>
  );
}
