"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ChevronDown,
  DollarSign,
  Download,
  FileText,
  GitBranch,
  Mail,
  MoreVertical,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AdvancedSettingsTab } from "@/components/commitments/tabs/AdvancedSettingsTab";
import { AttachmentsTab } from "@/components/commitments/tabs/AttachmentsTab";
import { ChangeHistoryTab } from "@/components/commitments/tabs/ChangeHistoryTab";
import { ChangeManagementTab } from "@/components/commitments/tabs/ChangeManagementTab";
import { EmailsTab } from "@/components/commitments/tabs/EmailsTab";
import { InvoicesTab } from "@/components/commitments/tabs/InvoicesTab";
import { PaymentsIssuedTab } from "@/components/commitments/tabs/PaymentsIssuedTab";
import { RelatedItemsTab } from "@/components/commitments/tabs/RelatedItemsTab";
import { RfqsTab } from "@/components/commitments/tabs/RfqsTab";
import { ScheduleOfValuesTab } from "@/components/commitments/tabs/ScheduleOfValuesTab";
import { SubcontractorSovTab } from "@/components/commitments/tabs/SubcontractorSovTab";
import { DocumentDeliveryDialog } from "@/components/documents/DocumentDeliveryDialog";
import { StatusBadge } from "@/components/ds/status-badge";
import { ErrorState } from "@/components/ds";
import {
  ContentSectionStack,
  DetailPanel,
  LabelValueRow,
  PageShell,
  SectionRuleHeading,
  SummaryValueRow,
} from "@/components/layout";
import { PageTabs } from "@/components/layout/PageTabs";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { apiFetch } from "@/lib/api-client";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { useConfirm } from "@/hooks/use-confirm";
import type { Commitment } from "@/types/financial";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CommitmentDetail = Commitment & {
  project_id?: number;
  type?: "subcontract" | "purchase_order" | string;
  pending_change_orders?: number;
  draft_change_orders?: number;
  payments_issued?: number;
  retainage_released_amount?: number | null;
  remaining_balance?: number;
  actual_completion_date?: string;
  issued_on_date?: string;
  invoice_contact_ids?: string[];
  invoice_contacts?: Array<{ id: string; name: string }>;
  inclusions?: string | null;
  exclusions?: string | null;
  allow_non_admin_view_sov_items?: boolean;
  executed?: boolean;
  created_by?: string | null;
  created_by_name?: string | null;
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
    accountingMethodRaw === "unit" ||
    accountingMethodRaw === "unit_quantity" ||
    accountingMethodRaw === "unit-quantity" ||
    accountingMethodRaw === "unit quantity" ||
    accountingMethodRaw === "unit/quantity"
      ? "unit"
      : accountingMethodRaw === "amount" ||
          accountingMethodRaw === "amount_based" ||
          accountingMethodRaw === "amount-based" ||
          accountingMethodRaw === "amount based"
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
    uom:
      typeof item.uom === "string"
        ? item.uom
        : typeof item.unit_of_measure === "string"
          ? item.unit_of_measure
          : null,
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
      typeof record.executed_date === "string"
        ? record.executed_date
        : typeof record.contract_date === "string"
          ? record.contract_date
          : undefined,
    start_date:
      typeof record.start_date === "string" ? record.start_date : undefined,
    substantial_completion_date:
      typeof record.substantial_completion_date === "string"
        ? record.substantial_completion_date
        : typeof record.estimated_completion_date === "string"
          ? record.estimated_completion_date
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
    payments_issued:
      typeof record.payments_issued === "number" || typeof record.payments_issued === "string"
        ? Number(record.payments_issued)
        : undefined,
    retainage_released_amount: typeof record.retainage_released_amount === "number" ? record.retainage_released_amount : 0,
    remaining_balance:
      typeof record.remaining_balance === "number" || typeof record.remaining_balance === "string"
        ? Number(record.remaining_balance)
        : undefined,
    actual_completion_date:
      typeof record.actual_completion_date === "string"
        ? record.actual_completion_date
        : undefined,
    issued_on_date:
      typeof record.issued_on_date === "string" ? record.issued_on_date : undefined,
    invoice_contact_ids: Array.isArray(record.invoice_contact_ids)
      ? (record.invoice_contact_ids as string[]).filter((v) => typeof v === "string")
      : undefined,
    invoice_contacts: Array.isArray(record.invoice_contacts)
      ? (record.invoice_contacts as Array<{ id: string; name: string }>)
      : undefined,
    change_order_totals:
      record.change_order_totals && typeof record.change_order_totals === "object"
        ? (record.change_order_totals as CommitmentDetail["change_order_totals"])
        : undefined,
    executed: typeof record.executed === "boolean" ? record.executed : undefined,
    created_by: typeof record.created_by === "string" ? record.created_by : null,
    created_by_name: typeof record.created_by_name === "string" ? record.created_by_name : null,
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

/** Uppercase the leading letter of each word while preserving existing acronym casing. */
function capitalizeWords(value: string | undefined | null): string {
  if (!value) return "";
  return value.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function parseTextLines(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|li)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .split(/[\n•]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

// ---------------------------------------------------------------------------
// Financial summary
// ---------------------------------------------------------------------------

function FinancialSummaryPanel({ commitment }: { commitment: CommitmentDetail }) {
  const approvedCOs = commitment.change_order_totals?.approved ?? commitment.approved_change_orders ?? 0;
  const pendingCOs = commitment.pending_change_orders ?? 0;
  const draftCOs = commitment.draft_change_orders ?? 0;
  const revisedContract = commitment.revised_contract_amount ?? 0;
  const pendingRevised = revisedContract + pendingCOs;
  const invoiced = commitment.billed_to_date ?? 0;
  const paymentsIssued = commitment.payments_issued ?? 0;
  const retainageReleased = commitment.retainage_released_amount ?? 0;
  const remainingBalance = commitment.remaining_balance !== undefined
    ? commitment.remaining_balance
    : revisedContract - paymentsIssued;
  const percentPaid = revisedContract > 0 ? (paymentsIssued / revisedContract) * 100 : 0;

  return (
    <DetailPanel>
      <SectionRuleHeading label="Financial Summary" className="mb-6 pb-0" />
      <dl className="space-y-3 text-sm">
        <SummaryValueRow label="Original Amount" value={formatCurrency(commitment.original_amount)} />
        <SummaryValueRow label="Revised Amount" value={formatCurrency(revisedContract)} />
        <SummaryValueRow label="Pending Amount" value={formatCurrency(pendingRevised)} />
        <SummaryValueRow label="Pending COs" value={formatCurrency(pendingCOs)} />
        <SummaryValueRow label="Approved COs" value={formatCurrency(approvedCOs)} />
        <SummaryValueRow label="Draft COs" value={formatCurrency(draftCOs)} />
        <SummaryValueRow label="Invoiced" value={formatCurrency(invoiced)} />
        <SummaryValueRow label="Payments Issued" value={formatCurrency(paymentsIssued)} />
        <SummaryValueRow label="Retainage Released" value={formatCurrency(retainageReleased)} />
        <SummaryValueRow label="Balance" value={formatCurrency(remainingBalance)} />
        <SummaryValueRow label="Percent Paid" value={formatPercent(percentPaid, 2)} bold border />
      </dl>
    </DetailPanel>
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
  const renderDateOrDash = (value?: string | null) =>
    value ? formatDate(value) : <span className="text-muted-foreground/60">—</span>;
  const inclusionLines = parseTextLines(commitment.inclusions);
  const exclusionLines = parseTextLines(commitment.exclusions);

  return (
    <ContentSectionStack className="space-y-8 pb-20">
      <section>
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
          <div className="space-y-6">
            <DetailPanel>
              <SectionRuleHeading label="General Information" className="mb-6 pb-0" />
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-x-10 gap-y-4">
                <dl className="space-y-4 text-sm">
                  <LabelValueRow label={isPO ? "PO #" : "Subcontract #"} labelClassName="w-36" missing={!safeNumber(commitment.number)}>
                    {safeNumber(commitment.number) || "—"}
                  </LabelValueRow>
                  <LabelValueRow label="Title" labelClassName="w-36" missing={!commitment.title}>
                    {capitalizeWords(commitment.title) || "—"}
                  </LabelValueRow>
                  <LabelValueRow label="Status" labelClassName="w-36">
                    <StatusBadge status={displayStatus} />
                  </LabelValueRow>
                  <LabelValueRow
                    label="Contract Company"
                    labelClassName="w-36"
                    missing={!commitment.contract_company?.name}
                  >
                    {commitment.contract_company?.name ? (
                      commitment.contract_company_id ? (
                        <Link
                          href={`/directory/companies/${encodeURIComponent(commitment.contract_company_id)}`}
                          className="text-link hover:text-link-hover hover:underline"
                        >
                          {commitment.contract_company.name}
                        </Link>
                      ) : (
                        commitment.contract_company.name
                      )
                    ) : (
                      "—"
                    )}
                  </LabelValueRow>
                  {commitment.invoice_contacts !== undefined && (
                    <LabelValueRow
                      label="Invoice Contact"
                      labelClassName="w-36"
                      missing={commitment.invoice_contacts.length === 0}
                    >
                      {commitment.invoice_contacts.length > 0
                        ? commitment.invoice_contacts.map((contact, index) => (
                            <span key={contact.id}>
                              {index > 0 ? ", " : null}
                              <Link
                                href={`/directory/contacts/${encodeURIComponent(contact.id)}`}
                                className="text-link hover:text-link-hover hover:underline"
                              >
                                {contact.name}
                              </Link>
                            </span>
                          ))
                        : "—"}
                    </LabelValueRow>
                  )}
                  <LabelValueRow label="Default Retainage" labelClassName="w-36">
                    {commitment.retention_percentage ?? 0}%
                  </LabelValueRow>
                </dl>
                <dl className="space-y-4 text-sm">
                  {!isPO && (
                    <LabelValueRow label="Start Date" labelClassName="w-40">
                      {renderDateOrDash(commitment.start_date)}
                    </LabelValueRow>
                  )}
                  <LabelValueRow label={isPO ? "Delivery Date" : "Est. Completion"} labelClassName="w-40">
                    {renderDateOrDash(commitment.substantial_completion_date)}
                  </LabelValueRow>
                  <LabelValueRow label="Contract Date" labelClassName="w-40">
                    {renderDateOrDash(commitment.executed_date)}
                  </LabelValueRow>
                  <LabelValueRow label="Signed Date" labelClassName="w-40">
                    {renderDateOrDash(commitment.signed_received_date)}
                  </LabelValueRow>
                  <LabelValueRow label="Actual Completion" labelClassName="w-40">
                    {renderDateOrDash(commitment.actual_completion_date)}
                  </LabelValueRow>
                  <LabelValueRow label="Issued On" labelClassName="w-40">
                    {renderDateOrDash(commitment.issued_on_date)}
                  </LabelValueRow>
                  <LabelValueRow label="Accounting Method" labelClassName="w-40">
                    {commitment.accounting_method === "unit"
                      ? "Unit/Quantity"
                      : commitment.accounting_method === "percent"
                        ? "Percent"
                        : "Amount Based"}
                  </LabelValueRow>
                  <LabelValueRow label="Created By" labelClassName="w-40" missing={!commitment.created_by_name && !commitment.created_by}>
                    {commitment.created_by_name || "—"}
                  </LabelValueRow>
                  <LabelValueRow label="Executed" labelClassName="w-40">
                    {commitment.executed ? "Yes" : "No"}
                  </LabelValueRow>
                </dl>
              </div>

              <LabelValueRow
                label="Description"
                labelClassName="w-36"
                className="mt-6"
                missing={!commitment.description}
                valueClassName="leading-relaxed font-normal text-foreground text-sm"
              >
                {capitalizeWords(commitment.description) || "—"}
              </LabelValueRow>

              <LabelValueRow label="Private Commitment" labelClassName="w-36" className="mt-6">
                {commitment.private ? "Yes" : "No"}
              </LabelValueRow>
              <LabelValueRow label="Non-Admin SOV" labelClassName="w-36" className="mt-4">
                {commitment.allow_non_admin_view_sov_items ? "Visible" : "Hidden"}
              </LabelValueRow>
              <LabelValueRow label="Attachments" labelClassName="w-36" className="mt-6">
                <AttachmentsTab commitmentId={commitmentId} />
              </LabelValueRow>
            </DetailPanel>

            <DetailPanel>
              <Collapsible defaultOpen>
                <div className="mb-6 flex items-center justify-between">
                  <SectionRuleHeading label="Inclusions + Exclusions" className="pb-0" />
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground">
                      <ChevronDown className="h-3.5 w-3.5 transition-transform [[data-state=closed]_&]:rotate-[-90deg]" />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="space-y-6 text-sm">
                    <div className="flex flex-col gap-1.5">
                      <dt className="text-xs text-muted-foreground">Inclusions</dt>
                      <dd className="font-normal leading-relaxed text-foreground">
                        {inclusionLines.length === 0 ? (
                          <span className="text-muted-foreground/50">—</span>
                        ) : (
                          <div className="space-y-1">
                            {inclusionLines.map((line, index) => (
                              <p key={`inclusion-${index}`}>{line}</p>
                            ))}
                          </div>
                        )}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <dt className="text-xs text-muted-foreground">Exclusions</dt>
                      <dd className="font-normal leading-relaxed text-foreground">
                        {exclusionLines.length === 0 ? (
                          <span className="text-muted-foreground/50">—</span>
                        ) : (
                          <div className="space-y-1">
                            {exclusionLines.map((line, index) => (
                              <p key={`exclusion-${index}`}>{line}</p>
                            ))}
                          </div>
                        )}
                      </dd>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </DetailPanel>
          </div>

          <aside>
            <FinancialSummaryPanel commitment={commitment} />
          </aside>
        </div>
      </section>

      {/* Schedule of Values */}
      <section>
        <SectionRuleHeading label="Schedule of Values" />
        <ScheduleOfValuesTab
          lineItems={commitment.line_items || []}
          projectId={projectId}
          commitmentId={commitmentId}
          commitmentType={commitment.type}
          accountingMethod={commitment.accounting_method}
          showHeader={false}
          onImportComplete={onImportComplete}
        />
      </section>
    </ContentSectionStack>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CommitmentDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams()! ?? new URLSearchParams();
  const params = useParams()! ?? {};
  const projectId = parseInt(params.projectId as string);
  const commitmentId = params.commitmentId as string;
  const queryClient = useQueryClient();

  const { confirm, ConfirmDialog } = useConfirm();
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [documentDialogTab, setDocumentDialogTab] = useState<
    "download" | "email"
  >("download");
  const [activeTab, setActiveTab] = useState("general");
  const [subcontractorSovCount, setSubcontractorSovCount] = useState<number>(0);

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

  const fetchSubcontractorSovCount = useCallback(async () => {
    if (!commitmentId || !projectId) return;
    try {
      const payload = await apiFetch<{
        data?: { lineItems?: Array<{ id: string }> };
      }>(
        `/api/projects/${projectId}/commitments/${commitmentId}/subcontractor-sov`,
      );
      setSubcontractorSovCount(payload.data?.lineItems?.length ?? 0);
    } catch {
      // no-op
    }
  }, [commitmentId, projectId]);

  useEffect(() => {
    if (commitment?.type === "subcontract") {
      void fetchSubcontractorSovCount();
    }
  }, [commitment?.type, fetchSubcontractorSovCount]);

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
    const tab = searchParams.get("tab");
    if (!tab) return;

    const allowedTabs = new Set([
      "general",
      "sov",
      "subcontractor-sov",
      "change-orders",
      "rfqs",
      "invoices",
      "payments",
      "emails",
      "history",
      "advanced-settings",
      "related-items",
    ]);
    if (allowedTabs.has(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleDelete = useCallback(async () => {
    if (!commitment) return;
    const ok = await confirm({
      description: `Are you sure you want to delete commitment ${commitment.number}?`,
      variant: "destructive",
      confirmLabel: "Delete",
    });
    if (!ok) return;

    try {
      await apiFetch(`/api/commitments/${commitmentId}`, {
        method: "DELETE",
      });
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
  }, [commitment, commitmentId, projectId, router, queryClient, confirm]);

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
      <PageShell variant="dashboard" title="Commitment Details" description="Loading…" onBack={() => router.back()}>
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
      <PageShell variant="dashboard" title="Commitment Details" description="Not found" onBack={() => router.back()}>
        <ErrorState error={error ?? "Commitment not found"} onRetry={() => void fetchCommitment()} />
      </PageShell>
    );
  }

  const sovLabel = isPO ? "PO SOV" : "SOV";
  const showSubcontractorSovTab = !isPO;

  const headerActions = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Create
            <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => router.push(`/${projectId}/change-events/new?commitmentId=${commitmentId}`)}
          >
            <GitBranch className="mr-2 h-4 w-4" />
            Create Change Event
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              const commitmentType =
                commitment.type === "purchase_order"
                  ? "purchase_order"
                  : "subcontract";
              router.push(
                `/${projectId}/invoicing/subcontractor/new?commitmentType=${encodeURIComponent(commitmentType)}&commitmentId=${encodeURIComponent(commitmentId)}`,
              );
            }}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Create Invoice
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleEmail}>
            <Mail className="mr-2 h-4 w-4" />
            Email Commitment
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => toast.info("Import coming soon")}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => router.push(`/${projectId}/commitments/${commitmentId}/edit`)}
          >
            <FileText className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={handleDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  const description = [
    capitalizeWords(commitment.title),
    contractType,
    commitment.contract_company?.name,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageShell
      variant="detailWide"
      title={displayNumber ? `#${displayNumber}` : capitalizeWords(commitment.title) || "Commitment"}
      description={description}
      actions={headerActions}
      onBack={() => router.back()}
      contentClassName="space-y-0"
    >

      <PageTabs
        variant="inline"
        tabs={[
          { label: "General", href: "general", isActive: activeTab === "general" },
          { label: sovLabel, href: "sov", isActive: activeTab === "sov" },
          ...(showSubcontractorSovTab
            ? [
                {
                  label: `Subcontractor SOV (${subcontractorSovCount})`,
                  href: "subcontractor-sov",
                  isActive: activeTab === "subcontractor-sov",
                },
              ]
            : []),
          { label: "Change Orders", href: "change-orders", isActive: activeTab === "change-orders" },
          { label: "RFQs", href: "rfqs", isActive: activeTab === "rfqs" },
          { label: "Invoices", href: "invoices", isActive: activeTab === "invoices" },
          { label: "Payments Issued", href: "payments", isActive: activeTab === "payments" },
          { label: "Emails", href: "emails", isActive: activeTab === "emails" },
          { label: "Change History", href: "history", isActive: activeTab === "history" },
          { label: "Related Items", href: "related-items", isActive: activeTab === "related-items" },
          { label: "Advanced Settings", href: "advanced-settings", isActive: activeTab === "advanced-settings" },
        ]}
        onTabClick={(href) => setActiveTab(href)}
      />

      <div>
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
            accountingMethod={commitment.accounting_method}
            onImportComplete={() => void fetchCommitment()}
          />
        )}

        {activeTab === "subcontractor-sov" && showSubcontractorSovTab && (
          <SubcontractorSovTab
            projectId={projectId}
            commitmentId={commitment.id}
            onSubmitted={fetchSubcontractorSovCount}
            onCountChange={setSubcontractorSovCount}
          />
        )}

        {activeTab === "change-orders" && (
          <ChangeManagementTab
            commitmentId={commitment.id}
            projectId={projectId}
          />
        )}

        {activeTab === "rfqs" && (
          <RfqsTab commitmentId={commitment.id} projectId={projectId} />
        )}

        {activeTab === "invoices" && (
          <InvoicesTab
            commitmentId={commitment.id}
            projectId={projectId}
            commitmentType={commitment.type as "subcontract" | "purchase_order"}
          />
        )}

        {activeTab === "payments" && (
          <PaymentsIssuedTab
            commitmentId={commitment.id}
            projectId={projectId}
            commitmentType={commitment.type as "subcontract" | "purchase_order"}
          />
        )}

        {activeTab === "emails" && (
          <EmailsTab commitmentId={commitment.id} projectId={projectId} />
        )}

        {activeTab === "history" && (
          <ChangeHistoryTab commitmentId={commitment.id} />
        )}

        {activeTab === "related-items" && (
          <RelatedItemsTab
            commitmentId={commitment.id}
            projectId={projectId}
            commitmentType={commitment.type}
          />
        )}

        {activeTab === "advanced-settings" && (
          <AdvancedSettingsTab
            commitmentId={commitment.id}
            commitmentType={commitment.type}
          />
        )}
      </div>

      {ConfirmDialog}

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
        title={capitalizeWords(commitment.title)}
      />
    </PageShell>
  );
}
