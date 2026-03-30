"use client";

import { useCallback, useMemo, useState } from "react";
import type * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ChevronDown,
  Download,
  FileText,
  History,
  Mail,
  MessageSquare,
  Pencil,
  Plus,
  Receipt,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { AdvancedSettingsTab } from "@/components/commitments/tabs/AdvancedSettingsTab";
import { ChangeOrdersTab } from "@/components/commitments/tabs/ChangeOrdersTab";
import { InvoicesTab } from "@/components/commitments/tabs/InvoicesTab";
import { ScheduleOfValuesTab } from "@/components/commitments/tabs/ScheduleOfValuesTab";
import { DocumentDeliveryDialog } from "@/components/documents/DocumentDeliveryDialog";
import { EmptyState } from "@/components/ds/empty-state";
import { KpiBlock } from "@/components/ds/kpi";
import { StatusBadge } from "@/components/ds/status-badge";
import { PageShell } from "@/components/layout";
import { PageTabs } from "@/components/layout/PageTabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
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
  inclusions?: string | null;
  exclusions?: string | null;
  allow_non_admin_view_sov_items?: boolean;
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
    inclusions: typeof record.inclusions === "string" ? record.inclusions : null,
    exclusions: typeof record.exclusions === "string" ? record.exclusions : null,
    allow_non_admin_view_sov_items:
      typeof record.allow_non_admin_view_sov_items === "boolean"
        ? record.allow_non_admin_view_sov_items
        : false,
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
// Section heading helper
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// General tab — view only
// ---------------------------------------------------------------------------

interface GeneralTabProps {
  commitment: CommitmentDetail;
  projectId: number;
  commitmentId: string;
  onImportComplete: () => void | Promise<void>;
}

function GeneralTab({ commitment, projectId, commitmentId, onImportComplete }: GeneralTabProps) {
  const isPO = commitment.type === "purchase_order";
  const displayStatus = commitment.status
    ? commitment.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Draft";
  const dash = <span className="text-muted-foreground/50">—</span>;

  return (
    <div className="space-y-10">
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
        <SectionLabel>General Information</SectionLabel>
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <F label="Title">{commitment.title || dash}</F>
          <F label="Contract #">{safeNumber(commitment.number) || dash}</F>
          {!commitment.contract_company?.name && (
            <F label={isPO ? "Vendor" : "Subcontractor"}>{dash}</F>
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
        </div>
        {commitment.description && (
          <div>
            <p className="text-xs text-muted-foreground">Description</p>
            <p className="mt-0.5 text-sm leading-relaxed text-foreground">{commitment.description}</p>
          </div>
        )}
      </div>

      {/* Schedule of Values */}
      <div className="space-y-4">
        <SectionLabel>Schedule of Values</SectionLabel>
        <ScheduleOfValuesTab
          lineItems={commitment.line_items || []}
          projectId={projectId}
          commitmentId={commitmentId}
          commitmentType={commitment.type}
          onImportComplete={onImportComplete}
        />
      </div>

      {/* Inclusions & Exclusions */}
      <div className="space-y-4">
        <SectionLabel>Inclusions &amp; Exclusions</SectionLabel>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Inclusions</p>
            {commitment.inclusions ? (
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {commitment.inclusions}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground/50">—</p>
            )}
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Exclusions</p>
            {commitment.exclusions ? (
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {commitment.exclusions}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground/50">—</p>
            )}
          </div>
        </div>
      </div>

      {/* Contract Dates */}
      <div className="space-y-4">
        <SectionLabel>Contract Dates</SectionLabel>
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Contract Privacy */}
      <div className="space-y-4">
        <SectionLabel>Contract Privacy</SectionLabel>
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <F label="Visibility">{commitment.private ? "Private" : "Public"}</F>
          <F label="Non-Admin Can View SOV Items">
            {commitment.allow_non_admin_view_sov_items ? "Yes" : "No"}
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
    <div className="overflow-hidden rounded-lg bg-card">
      <div className="grid grid-cols-2 divide-x divide-border lg:grid-cols-5">
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
  const params = useParams();
  const projectId = parseInt(params.projectId as string);
  const commitmentId = params.commitmentId as string;
  const queryClient = useQueryClient();

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [documentDialogTab, setDocumentDialogTab] = useState<
    "download" | "email"
  >("download");
  const [activeTab, setActiveTab] = useState("general");

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

  // ── Loading ──
  if (isLoading) {
    return (
      <PageShell variant="detail" title="Commitment Details" description="Loading…" onBack={() => router.back()}>
        <div className="space-y-6">
          <Skeleton className="h-24 w-full rounded-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-40" />
              </div>
            ))}
          </div>
        </div>
      </PageShell>
    );
  }

  // ── Error ──
  if (error || !commitment) {
    return (
      <PageShell variant="detail" title="Commitment Details" description="Not found" onBack={() => router.back()}>
        <p className="text-sm text-destructive">{error || "Commitment not found"}</p>
      </PageShell>
    );
  }

  const sovLabel = isPO ? "PO SOV" : "SC SOV";

  const headerActions = (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={handleEmail}
        aria-label="Email"
        title="Email"
      >
        <Mail />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={handleExport}
        aria-label="Export"
        title="Export"
      >
        <Download />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => router.push(`/${projectId}/commitments/${commitmentId}/edit`)}
        aria-label="Edit Commitment"
        title="Edit Commitment"
      >
        <Pencil />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default">
            <Plus className="mr-1.5 h-4 w-4" />
            Create
            <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              setActiveTab("change-orders");
              toast.info("Navigate to Change Orders tab to create a change event");
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            Change Event
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setActiveTab("invoices");
              toast.info("Navigate to Invoices tab to create an invoice");
            }}
          >
            <Receipt className="mr-2 h-4 w-4" />
            Invoice
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setActiveTab("payments");
              toast.info("Navigate to Payments tab to create a payment");
            }}
          >
            <Mail className="mr-2 h-4 w-4" />
            Payment
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  const description = [
    displayNumber && `#${displayNumber}`,
    contractType,
    commitment.contract_company?.name,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageShell
      variant="detail"
      title={commitment.title || displayNumber || "Commitment"}
      description={description}
      actions={headerActions}
      statusBadge={<StatusBadge status={commitment.status ? commitment.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Draft"} />}
      onBack={() => router.back()}
    >

      <PageTabs
        variant="inline"
        className="border-b border-border"
        tabs={[
          { label: "General", href: "general", isActive: activeTab === "general" },
          { label: sovLabel, href: "sov", isActive: activeTab === "sov" },
          { label: "Change Orders", href: "change-orders", isActive: activeTab === "change-orders" },
          { label: "RFQs", href: "rfqs", isActive: activeTab === "rfqs" },
          { label: "Invoices", href: "invoices", isActive: activeTab === "invoices" },
          { label: "Payments Issued", href: "payments", isActive: activeTab === "payments" },
          { label: "Emails", href: "emails", isActive: activeTab === "emails" },
          { label: "Change History", href: "history", isActive: activeTab === "history" },
          { label: "Advanced Settings", href: "advanced-settings", isActive: activeTab === "advanced-settings" },
        ]}
        onTabClick={(href) => setActiveTab(href)}
      />

      <div className="pt-6">
        {activeTab === "general" && (
          <GeneralTab
            commitment={commitment}
            projectId={projectId}
            commitmentId={commitment.id}
            onImportComplete={() => void fetchCommitment()}
          />
        )}

        {activeTab === "sov" && (
          <ScheduleOfValuesTab
            lineItems={commitment.line_items || []}
            projectId={projectId}
            commitmentId={commitment.id}
            commitmentType={commitment.type}
            onImportComplete={() => void fetchCommitment()}
          />
        )}

        {activeTab === "change-orders" && (
          <ChangeOrdersTab
            commitmentId={commitment.id}
            projectId={projectId}
          />
        )}

        {activeTab === "rfqs" && (
          <ComingSoonTab
            icon={<MessageSquare className="h-5 w-5 text-muted-foreground" />}
            label="RFQs"
          />
        )}

        {activeTab === "invoices" && (
          <InvoicesTab commitmentId={commitment.id} />
        )}

        {activeTab === "payments" && (
          <ComingSoonTab
            icon={<Receipt className="h-5 w-5 text-muted-foreground" />}
            label="Payments Issued"
          />
        )}

        {activeTab === "emails" && (
          <ComingSoonTab
            icon={<Mail className="h-5 w-5 text-muted-foreground" />}
            label="Emails"
          />
        )}

        {activeTab === "history" && (
          <ComingSoonTab
            icon={<History className="h-5 w-5 text-muted-foreground" />}
            label="Change History"
          />
        )}

        {activeTab === "advanced-settings" && (
          <AdvancedSettingsTab
            commitmentId={commitment.id}
            commitmentType={commitment.type}
          />
        )}
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
    </PageShell>
  );
}
