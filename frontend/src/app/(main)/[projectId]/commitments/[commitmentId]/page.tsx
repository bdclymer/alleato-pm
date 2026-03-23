"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type * as React from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Download,
  Edit,
  History,
  Mail,
  MessageSquare,
  Receipt,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AdvancedSettingsTab } from "@/components/commitments/tabs/AdvancedSettingsTab";
import { ChangeOrdersTab } from "@/components/commitments/tabs/ChangeOrdersTab";
import { InvoicesTab } from "@/components/commitments/tabs/InvoicesTab";
import { ScheduleOfValuesTab } from "@/components/commitments/tabs/ScheduleOfValuesTab";
import { DocumentDeliveryDialog } from "@/components/documents/DocumentDeliveryDialog";
import { EmptyState } from "@/components/ds/empty-state";
import { KpiBlock } from "@/components/ds/kpi";
import { StatusBadge } from "@/components/ds/status-badge";
import { RHFComboboxField } from "@/components/forms/fields/RHFComboboxField";
import { RHFDateField } from "@/components/forms/fields/RHFDateField";
import { RHFSelectField } from "@/components/forms/fields/RHFSelectField";
import { RHFTextareaField } from "@/components/forms/fields/RHFTextareaField";
import { RHFTextField } from "@/components/forms/fields/RHFTextField";
import { ProjectPageHeader } from "@/components/layout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  commitmentKeys,
  useCommitmentDetail,
} from "@/hooks/use-commitments-query";
import { useProjectTitle } from "@/hooks/useProjectTitle";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/table-config/formatters";
import type { Commitment } from "@/types/financial";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

type EditFormValues = {
  contractNumber: string;
  title: string;
  contractCompanyId: string;
  status: string;
  accountingMethod: string;
  description: string;
  startDate: string;
  completionDate: string;
  executedDate: string;
  signedReceivedDate: string;
};

// ---------------------------------------------------------------------------
// Data normalizer
// ---------------------------------------------------------------------------

const normalizeCommitment = (raw: unknown): CommitmentDetail | null => {
  if (!raw || typeof raw !== "object") return null;

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
    number: typeof record.contract_number === "string" ? record.contract_number : (typeof record.number === "string" ? record.number : ""),
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
      typeof record.executed_date === "string" ? record.executed_date : undefined,
    start_date:
      typeof record.start_date === "string" ? record.start_date : undefined,
    substantial_completion_date:
      typeof record.substantial_completion_date === "string"
        ? record.substantial_completion_date
        : undefined,
    accounting_method: accountingMethod,
    retention_percentage: Number(record.default_retainage_percent ?? record.retention_percentage ?? 0),
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
    project_id:
      typeof record.project_id === "number" ? record.project_id : undefined,
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if the string looks like a raw UUID (common when number isn't set) */
function isRawUuid(s: string): boolean {
  return /^[0-9a-f]{8}[-\s][0-9a-f]{4}[-\s][0-9a-f]{4}[-\s][0-9a-f]{4}[-\s][0-9a-f]{12}$/i.test(s);
}

/** Returns a display-safe contract number, or undefined if it's a UUID */
function safeNumber(n: string | undefined): string | undefined {
  if (!n || isRawUuid(n)) return undefined;
  return n;
}

// ---------------------------------------------------------------------------
// Field display (view mode) — minimal label + value
// ---------------------------------------------------------------------------

function F({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm text-foreground">{children ?? <span className="text-muted-foreground/50">—</span>}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// General tab — view + inline edit
// ---------------------------------------------------------------------------

function GeneralTab({
  commitment,
  projectId,
  isEditing,
  onSaved,
  onCancelEdit,
}: {
  commitment: CommitmentDetail;
  projectId: number;
  isEditing: boolean;
  onSaved: () => void;
  onCancelEdit: () => void;
}) {
  const isPO = commitment.type === "purchase_order";

  const normalizeStatus = (raw: string | undefined): string => {
    if (!raw) return "Draft";
    const lower = raw.toLowerCase().replace(/_/g, " ");
    const subMap: Record<string, string> = {
      draft: "Draft",
      "out for signature": "Out for Signature",
      pending: "Pending",
      approved: "Approved",
      complete: "Complete",
      void: "Void",
    };
    const poMap: Record<string, string> = {
      draft: "Draft",
      approved: "Approved",
      sent: "Sent",
      acknowledged: "Acknowledged",
      completed: "Completed",
      complete: "Completed",
    };
    return (isPO ? poMap : subMap)[lower] ?? raw;
  };

  const { data: vendorOptions = [] } = useQuery({
    queryKey: ["vendors", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/vendors`);
      if (!res.ok) return [];
      const data = (await res.json()) as
        | { vendors?: Array<{ id: string | number; name: string }> }
        | Array<{ id: string | number; name: string }>;
      const list = Array.isArray(data) ? data : (data.vendors ?? []);
      return list.map((v) => ({ value: String(v.id), label: v.name }));
    },
    enabled: isEditing,
  });

  const buildFormValues = (): EditFormValues => ({
    contractNumber: commitment.number || "",
    title: commitment.title || "",
    contractCompanyId: commitment.contract_company_id || "",
    status: normalizeStatus(commitment.status),
    accountingMethod: commitment.accounting_method || "amount",
    description: commitment.description || "",
    startDate: commitment.start_date || "",
    completionDate: commitment.substantial_completion_date || "",
    executedDate: commitment.executed_date || "",
    signedReceivedDate: commitment.signed_received_date || "",
  });

  const form = useForm<EditFormValues>({ defaultValues: buildFormValues() });

  useEffect(() => {
    if (isEditing) form.reset(buildFormValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, commitment.id]);

  const statusOptions = isPO
    ? [
        { value: "Draft", label: "Draft" },
        { value: "Approved", label: "Approved" },
        { value: "Sent", label: "Sent" },
        { value: "Acknowledged", label: "Acknowledged" },
        { value: "Completed", label: "Completed" },
      ]
    : [
        { value: "Draft", label: "Draft" },
        { value: "Out for Signature", label: "Out for Signature" },
        { value: "Pending", label: "Pending" },
        { value: "Approved", label: "Approved" },
        { value: "Complete", label: "Complete" },
        { value: "Void", label: "Void" },
      ];

  const accountingMethodOptions = isPO
    ? [
        { value: "amount", label: "Amount Based" },
        { value: "unit-quantity", label: "Unit / Quantity" },
      ]
    : [
        { value: "amount_based", label: "Amount Based" },
        { value: "unit_quantity", label: "Unit / Quantity" },
      ];

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      const body = isPO
        ? {
            contract_number: data.contractNumber,
            title: data.title,
            contract_company_id: data.contractCompanyId || null,
            status: data.status,
            description: data.description || null,
            accounting_method: data.accountingMethod || null,
            delivery_date: data.completionDate || null,
            is_private: commitment.private ?? true,
            allow_non_admin_view_sov_items: false,
          }
        : {
            contract_number: data.contractNumber,
            title: data.title,
            contract_company_id: data.contractCompanyId || null,
            status: data.status,
            description: data.description || null,
            start_date: data.startDate || null,
            estimated_completion_date: data.completionDate || null,
            contract_date: data.executedDate || null,
            is_private: commitment.private ?? true,
            allow_non_admin_view_sov_items: false,
          };

      const res = await fetch(`/api/commitments/${commitment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error || "Failed to save");
      }

      toast.success(
        `${isPO ? "Purchase order" : "Subcontract"} updated successfully`,
      );
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  });

  const displayStatus = commitment.status
    ? commitment.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Draft";

  // ── EDIT MODE ──────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <Form {...form}>
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <RHFTextField
              control={form.control}
              name="contractNumber"
              label="Contract #"
            />
            <RHFSelectField
              control={form.control}
              name="status"
              label="Status"
              options={statusOptions}
              placeholder="Select status"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <RHFTextField control={form.control} name="title" label="Title" />
            <RHFComboboxField
              control={form.control}
              name="contractCompanyId"
              label="Vendor"
              options={vendorOptions}
              placeholder="Search vendors…"
              searchPlaceholder="Type to search…"
              emptyMessage="No vendors found"
            />
          </div>
          {isPO && (
            <div className="grid grid-cols-2 gap-4">
              <RHFSelectField
                control={form.control}
                name="accountingMethod"
                label="Accounting Method"
                options={accountingMethodOptions}
                placeholder="Select method"
              />
            </div>
          )}
          <RHFTextareaField
            control={form.control}
            name="description"
            label="Description"
            placeholder="Add a description…"
          />
          <div className="grid grid-cols-2 gap-4">
            {!isPO && (
              <RHFDateField
                control={form.control}
                name="startDate"
                label="Start Date"
                nullable
              />
            )}
            <RHFDateField
              control={form.control}
              name="completionDate"
              label={isPO ? "Delivery Date" : "Completion Date"}
              nullable
            />
            <RHFDateField
              control={form.control}
              name="executedDate"
              label="Contract Date"
              nullable
            />
            <RHFDateField
              control={form.control}
              name="signedReceivedDate"
              label="Signed Received"
              nullable
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="submit"
              size="sm"
              disabled={form.formState.isSubmitting}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {form.formState.isSubmitting ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancelEdit}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    );
  }

  // ── VIEW MODE ──────────────────────────────────────────────────────────────
  const dash = <span className="text-muted-foreground/50">—</span>;

  return (
    <div className="space-y-8">
      {/* Vendor highlight card */}
      {commitment.contract_company?.name && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {isPO ? "Vendor" : "Subcontractor"}
            </p>
            <p className="text-sm font-medium text-foreground">{commitment.contract_company.name}</p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={displayStatus} />
          </div>
        </div>
      )}

      {/* General Information */}
      <div className="space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          General Information
        </p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
          <F label="Title">{commitment.title || dash}</F>
          <F label="Contract #">{safeNumber(commitment.number) || dash}</F>
          {!commitment.contract_company?.name && (
            <F label={isPO ? "Vendor" : "Subcontractor"}>
              {dash}
            </F>
          )}
          {!commitment.contract_company?.name && (
            <F label="Status"><StatusBadge status={displayStatus} /></F>
          )}
          {commitment.retention_percentage !== undefined && commitment.retention_percentage !== 0 && (
            <F label="Default Retainage %">{commitment.retention_percentage}%</F>
          )}
          {isPO && commitment.accounting_method && (
            <F label="Accounting Method">
              {commitment.accounting_method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </F>
          )}
          <F label="Visibility">{commitment.private ? "Private" : "Public"}</F>
        </div>
        {commitment.description && (
          <div>
            <p className="text-xs text-muted-foreground">Description</p>
            <p className="mt-0.5 text-sm leading-relaxed text-foreground">{commitment.description}</p>
          </div>
        )}
      </div>

      {/* Contract Dates */}
      <div className="space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Contract Dates
        </p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
          {!isPO && (
            <F label="Start Date">
              {commitment.start_date ? formatDate(commitment.start_date) : dash}
            </F>
          )}
          <F label={isPO ? "Delivery Date" : "Estimated Completion Date"}>
            {commitment.substantial_completion_date ? formatDate(commitment.substantial_completion_date) : dash}
          </F>
          <F label="Contract Date">
            {commitment.executed_date ? formatDate(commitment.executed_date) : dash}
          </F>
          <F label="Signed Contract Received">
            {commitment.signed_received_date ? formatDate(commitment.signed_received_date) : dash}
          </F>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Financial KPI strip
// ---------------------------------------------------------------------------

function FinancialKpiStrip({ commitment }: { commitment: CommitmentDetail }) {
  const approvedCOs = commitment.change_order_totals?.approved ?? commitment.approved_change_orders ?? 0;
  const percentBilled = commitment.revised_contract_amount > 0
    ? (commitment.billed_to_date / commitment.revised_contract_amount) * 100
    : 0;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-5">
        <div className="px-5 py-4">
          <KpiBlock
            label="Original Contract"
            value={formatCurrency(commitment.original_amount)}
            size="compact"
          />
        </div>
        <div className="px-5 py-4">
          <KpiBlock
            label="Approved COs"
            value={formatCurrency(approvedCOs)}
            size="compact"
            delta={approvedCOs !== 0 ? {
              value: formatCurrency(Math.abs(approvedCOs)),
              positive: approvedCOs >= 0,
            } : undefined}
          />
        </div>
        <div className="px-5 py-4">
          <KpiBlock
            label="Revised Contract"
            value={formatCurrency(commitment.revised_contract_amount)}
            size="compact"
          />
        </div>
        <div className="px-5 py-4">
          <KpiBlock
            label="Billed to Date"
            value={formatCurrency(commitment.billed_to_date)}
            size="compact"
            context={`${percentBilled.toFixed(1)}% of revised`}
          />
        </div>
        <div className="px-5 py-4">
          <KpiBlock
            label="Balance to Finish"
            value={formatCurrency(commitment.balance_to_finish)}
            size="compact"
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stub tab for features coming soon
// ---------------------------------------------------------------------------

function ComingSoonTab({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <EmptyState
      icon={icon}
      title={`${label} coming soon`}
      description="This feature is under development and will be available shortly."
    />
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CommitmentDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const projectId = parseInt(params.projectId as string);
  const commitmentId = params.commitmentId as string;
  const queryClient = useQueryClient();

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [documentDialogTab, setDocumentDialogTab] = useState<
    "download" | "email"
  >("download");
  const [isEditing, setIsEditing] = useState(false);

  const {
    data: rawData,
    isLoading,
    error: queryError,
    refetch: fetchCommitment,
  } = useCommitmentDetail(commitmentId);

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
    commitment ? `${commitment.number} — ${commitment.title}` : "Loading…",
  );

  useEffect(() => {
    if (searchParams.get("edit") === "1") setIsEditing(true);
  }, [searchParams]);

  const handleDelete = useCallback(async () => {
    if (
      !commitment ||
      !confirm(
        `Are you sure you want to delete commitment ${commitment.number}?`,
      )
    )
      return;

    try {
      const res = await fetch(`/api/commitments/${commitmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message || "Failed to delete commitment");
      }
      queryClient.invalidateQueries({ queryKey: commitmentKeys.lists() });
      queryClient.removeQueries({
        queryKey: commitmentKeys.detail(commitmentId),
      });
      toast.success("Commitment deleted successfully");
      router.push(`/${projectId}/commitments`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete commitment",
      );
    }
  }, [commitment, commitmentId, projectId, router, queryClient]);

  const handleExport = useCallback(() => {
    setDocumentDialogTab("download");
    setIsExportDialogOpen(true);
  }, []);

  const handleEmail = useCallback(() => {
    setDocumentDialogTab("email");
    setIsEmailDialogOpen(true);
  }, []);

  const isPO = commitment?.type === "purchase_order";
  const contractType = isPO ? "Purchase Order" : "Subcontract";

  const displayNumber = safeNumber(commitment?.number);

  const breadcrumbs = [
    { label: "Projects", href: "/" },
    { label: "Project", href: `/${projectId}` },
    { label: "Commitments", href: `/${projectId}/commitments` },
    { label: displayNumber || commitment?.title || "Details" },
  ];
  const headerClassName = "px-3 sm:px-5 lg:px-7";

  // ── Loading ──
  if (isLoading) {
    return (
      <>
        <ProjectPageHeader
          title="Commitment Details"
          description="Loading…"
          breadcrumbs={breadcrumbs}
          className={headerClassName}
        />
        <PageContainer>
          <div className="space-y-6">
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-40" />
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </>
    );
  }

  // ── Error ──
  if (error || !commitment) {
    return (
      <>
        <ProjectPageHeader
          title="Commitment Details"
          description="Not found"
          breadcrumbs={breadcrumbs}
          className={headerClassName}
        />
        <PageContainer>
          <p className="text-sm text-destructive">{error || "Commitment not found"}</p>
        </PageContainer>
      </>
    );
  }

  const sovLabel = isPO ? "PO SOV" : "SC SOV";

  return (
    <>
      <ProjectPageHeader
        title={commitment.title || displayNumber || "Commitment"}
        description={displayNumber ? `${displayNumber} · ${contractType}` : contractType}
        breadcrumbs={breadcrumbs}
        className={headerClassName}
      />

      <PageContainer>
        <div className="space-y-6">
          {/* Financial KPI strip */}
          <FinancialKpiStrip commitment={commitment} />

          <Tabs defaultValue="general" className="space-y-0">
            {/* Tab bar + actions */}
            <div className="mb-6 flex items-center justify-between gap-4">
              <TabsList className="h-9">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="sov">{sovLabel}</TabsTrigger>
                <TabsTrigger value="change-orders">Change Orders</TabsTrigger>
                <TabsTrigger value="rfqs">RFQs</TabsTrigger>
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                <TabsTrigger value="payments">Payments Issued</TabsTrigger>
                <TabsTrigger value="emails">Emails</TabsTrigger>
                <TabsTrigger value="history">Change History</TabsTrigger>
                <TabsTrigger value="advanced-settings">
                  Advanced Settings
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-1 shrink-0">
                {isEditing ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={handleEmail}>
                      <Mail className="h-4 w-4" />
                      Email
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleExport}>
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDelete}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* General */}
            <TabsContent value="general">
              <GeneralTab
                commitment={commitment}
                projectId={projectId}
                isEditing={isEditing}
                onSaved={() => {
                  setIsEditing(false);
                  void fetchCommitment();
                }}
                onCancelEdit={() => setIsEditing(false)}
              />
            </TabsContent>

            {/* SOV */}
            <TabsContent value="sov">
              <ScheduleOfValuesTab
                lineItems={commitment.line_items || []}
                projectId={projectId}
                commitmentId={commitment.id}
                commitmentType={commitment.type}
                onImportComplete={() => void fetchCommitment()}
              />
            </TabsContent>

            {/* Change Orders */}
            <TabsContent value="change-orders">
              <ChangeOrdersTab
                commitmentId={commitment.id}
                projectId={projectId}
              />
            </TabsContent>

            {/* RFQs */}
            <TabsContent value="rfqs">
              <ComingSoonTab
                icon={<MessageSquare className="h-5 w-5 text-muted-foreground" />}
                label="RFQs"
              />
            </TabsContent>

            {/* Invoices */}
            <TabsContent value="invoices">
              <InvoicesTab commitmentId={commitment.id} />
            </TabsContent>

            {/* Payments Issued */}
            <TabsContent value="payments">
              <ComingSoonTab
                icon={<Receipt className="h-5 w-5 text-muted-foreground" />}
                label="Payments Issued"
              />
            </TabsContent>

            {/* Emails */}
            <TabsContent value="emails">
              <ComingSoonTab
                icon={<Mail className="h-5 w-5 text-muted-foreground" />}
                label="Emails"
              />
            </TabsContent>

            {/* Change History */}
            <TabsContent value="history">
              <ComingSoonTab
                icon={<History className="h-5 w-5 text-muted-foreground" />}
                label="Change History"
              />
            </TabsContent>

            {/* Advanced Settings */}
            <TabsContent value="advanced-settings">
              <AdvancedSettingsTab
                commitmentId={commitment.id}
                commitmentType={commitment.type}
              />
            </TabsContent>
          </Tabs>
        </div>

        <DocumentDeliveryDialog
          open={isExportDialogOpen || isEmailDialogOpen}
          onOpenChange={(nextOpen) => {
            setIsExportDialogOpen(nextOpen);
            setIsEmailDialogOpen(nextOpen);
          }}
          initialTab={documentDialogTab}
          recordType="commitment"
          recordId={commitment.id}
          number={commitment.number}
          title={commitment.title}
        />
      </PageContainer>
    </>
  );
}
