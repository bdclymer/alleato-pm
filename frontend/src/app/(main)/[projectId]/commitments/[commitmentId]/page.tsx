"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ChevronDown,
  Download,
  FileText,
  Mail,
  Pencil,
  Plus,
  Receipt,
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
import { KpiBlock } from "@/components/ds/kpi";
import { StatusBadge } from "@/components/ds/status-badge";
import {
  ContentSectionStack,
  LabelValueRow,
  PageShell,
  SectionRuleHeading,
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
import { TableHead, TableHeader } from "@/components/ui/table";
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

// ---------------------------------------------------------------------------
// Contract Summary Report
// ---------------------------------------------------------------------------

function ContractSummaryReportHorizontal({ commitment }: { commitment: CommitmentDetail }) {
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

  const cols: Array<{ label: string; value: string; bold?: boolean }> = [
    { label: "Original Contract", value: formatCurrency(commitment.original_amount) },
    { label: "Approved COs", value: formatCurrency(approvedCOs) },
    { label: "Revised Contract", value: formatCurrency(revisedContract), bold: true },
    { label: "Pending COs", value: formatCurrency(pendingCOs) },
    { label: "Pending Revised", value: formatCurrency(pendingRevised), bold: true },
    { label: "Draft COs", value: formatCurrency(draftCOs) },
    { label: "Invoiced to Date", value: formatCurrency(invoiced) },
    { label: "Payments Issued", value: formatCurrency(paymentsIssued) },
    { label: "Retainage Released", value: formatCurrency(retainageReleased) },
    { label: "% Paid", value: `${percentPaid.toFixed(1)}%` },
    { label: "Remaining Balance", value: formatCurrency(remainingBalance), bold: true },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max text-sm">
        <TableHeader>
          <tr className="border-b border-border">
            {cols.map((col) => (
              <TableHead
                key={col.label}
                className="whitespace-nowrap px-4 py-2.5 text-right first:text-left"
              >
                {col.label}
              </TableHead>
            ))}
          </tr>
        </TableHeader>
        <tbody>
          <tr>
            {cols.map((col) => (
              <td
                key={col.label}
                className={`whitespace-nowrap px-4 py-3 text-right tabular-nums first:text-left ${col.bold ? "font-semibold text-foreground" : "text-foreground"}`}
              >
                {col.value}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
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
  const [isInclusionsOpen, setIsInclusionsOpen] = useState(false);
  const [isExclusionsOpen, setIsExclusionsOpen] = useState(false);
  const displayStatus = commitment.status
    ? commitment.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Draft";
  const renderDateOrDash = (value?: string | null) =>
    value ? formatDate(value) : <span className="text-muted-foreground/60">—</span>;
  const inclusionText = commitment.inclusions?.trim() || "";
  const exclusionText = commitment.exclusions?.trim() || "";

  return (
    <ContentSectionStack className="pb-20 space-y-16">
      <section>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(340px,420px)] gap-x-16 gap-y-10">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-x-20 gap-y-8">
              <div className="space-y-6">
                <SectionRuleHeading label="Details" className="[&_span]:text-primary" />
                <dl className="space-y-4 text-sm">
                  <LabelValueRow label={isPO ? "PO #" : "Subcontract #"} missing={!safeNumber(commitment.number)}>
                    {safeNumber(commitment.number) || "Not set"}
                  </LabelValueRow>
                  <LabelValueRow label="Title" missing={!commitment.title}>
                    {commitment.title || "Not set"}
                  </LabelValueRow>
                  <LabelValueRow
                    label="Description"
                    missing={!commitment.description}
                    valueClassName="leading-relaxed font-normal text-foreground"
                  >
                    {commitment.description || "Not set"}
                  </LabelValueRow>
                  <LabelValueRow label="Status">
                    <StatusBadge status={displayStatus} />
                  </LabelValueRow>
                  <LabelValueRow
                    label="Contract Company"
                    missing={!commitment.contract_company?.name}
                  >
                    {commitment.contract_company?.name ? (
                      commitment.contract_company_id ? (
                        <Link
                          href={`/directory/vendors/${encodeURIComponent(commitment.contract_company_id)}`}
                          className="text-primary hover:underline"
                        >
                          {commitment.contract_company.name}
                        </Link>
                      ) : (
                        commitment.contract_company.name
                      )
                    ) : (
                      "Not set"
                    )}
                  </LabelValueRow>
                  {commitment.invoice_contacts !== undefined && (
                    <LabelValueRow
                      label="Invoice Contact"
                      missing={commitment.invoice_contacts.length === 0}
                    >
                      {commitment.invoice_contacts.length > 0
                        ? commitment.invoice_contacts.map((c) => c.name).join(", ")
                        : "None"}
                    </LabelValueRow>
                  )}
                </dl>
              </div>

              <div className="space-y-6">
                <SectionRuleHeading label="Contract Settings" className="[&_span]:text-primary" />
                <dl className="space-y-4 text-sm">
                  <LabelValueRow label="Default Retainage">
                    {commitment.retention_percentage ?? 0}%
                  </LabelValueRow>
                  <LabelValueRow label="Executed">
                    {commitment.executed === true ? "Yes" : commitment.executed === false ? "No" : "—"}
                  </LabelValueRow>
                  <LabelValueRow label="Visibility">
                    {commitment.private ? "Private" : "Public"}
                  </LabelValueRow>
                  <LabelValueRow label="Non-Admin Can View SOV Items">
                    {commitment.allow_non_admin_view_sov_items ? "Yes" : "No"}
                  </LabelValueRow>
                  <LabelValueRow label="Created By" missing={!commitment.created_by_name && !commitment.created_by}>
                    {commitment.created_by_name || "—"}
                  </LabelValueRow>
                </dl>
              </div>
            </div>

            <div className="space-y-4">
              <SectionRuleHeading label="Inclusions and Exclusions" className="[&_span]:text-primary" />
              <dl className="space-y-4 text-sm">
                <LabelValueRow
                  label="Inclusions"
                  missing={!inclusionText}
                  valueClassName="font-normal text-foreground"
                >
                  {inclusionText ? (
                    <Collapsible open={isInclusionsOpen} onOpenChange={setIsInclusionsOpen} className="w-full">
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="link"
                          size="xs"
                          className="h-auto p-0 text-xs font-medium"
                        >
                          {isInclusionsOpen ? "Hide inclusions" : "Show inclusions"}
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform ${isInclusionsOpen ? "rotate-180" : ""}`}
                          />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2 whitespace-pre-wrap leading-relaxed">
                        {inclusionText}
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    "Not set"
                  )}
                </LabelValueRow>
                <LabelValueRow
                  label="Exclusions"
                  missing={!exclusionText}
                  valueClassName="font-normal text-foreground"
                >
                  {exclusionText ? (
                    <Collapsible open={isExclusionsOpen} onOpenChange={setIsExclusionsOpen} className="w-full">
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="link"
                          size="xs"
                          className="h-auto p-0 text-xs font-medium"
                        >
                          {isExclusionsOpen ? "Hide exclusions" : "Show exclusions"}
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform ${isExclusionsOpen ? "rotate-180" : ""}`}
                          />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2 whitespace-pre-wrap leading-relaxed">
                        {exclusionText}
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    "Not set"
                  )}
                </LabelValueRow>
              </dl>
            </div>
          </div>

          <div className="space-y-10">
            <div className="space-y-4">
              <SectionRuleHeading label="Key Dates" className="[&_span]:text-primary" />
              <dl className="space-y-3 text-sm">
                {!isPO && (
                  <LabelValueRow label="Start Date">
                    {renderDateOrDash(commitment.start_date)}
                  </LabelValueRow>
                )}
                <LabelValueRow label={isPO ? "Delivery Date" : "Estimated Completion"}>
                  {renderDateOrDash(commitment.substantial_completion_date)}
                </LabelValueRow>
                <LabelValueRow label="Contract Date">
                  {renderDateOrDash(commitment.executed_date)}
                </LabelValueRow>
                <LabelValueRow label="Signed Contract Received">
                  {renderDateOrDash(commitment.signed_received_date)}
                </LabelValueRow>
                <LabelValueRow label="Actual Completion">
                  {renderDateOrDash(commitment.actual_completion_date)}
                </LabelValueRow>
                <LabelValueRow label="Issued On">
                  {renderDateOrDash(commitment.issued_on_date)}
                </LabelValueRow>
              </dl>
            </div>

          </div>
        </div>
      </section>

      {/* Schedule of Values */}
      <div className="space-y-6">
        <SectionRuleHeading label="Schedule of Values" className="[&_span]:text-primary" />
        <ScheduleOfValuesTab
          lineItems={commitment.line_items || []}
          projectId={projectId}
          commitmentId={commitmentId}
          commitmentType={commitment.type}
          showHeader={false}
          onImportComplete={onImportComplete}
        />
      </div>

      {/* Contract Summary Report */}
      <div className="space-y-4">
        <SectionRuleHeading label="Contract Summary" className="[&_span]:text-primary" />
        <ContractSummaryReportHorizontal commitment={commitment} />
      </div>

      {/* Attachments */}
      <div className="space-y-6">
        <SectionRuleHeading label="Attachments" className="[&_span]:text-primary" />
        <AttachmentsTab commitmentId={commitmentId} />
      </div>
    </ContentSectionStack>
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

  const pendingCOs = commitment.pending_change_orders ?? 0;
  const draftCOs = commitment.draft_change_orders ?? 0;
  const paymentsIssued = commitment.payments_issued;
  const remainingBalance = commitment.remaining_balance !== undefined
    ? commitment.remaining_balance
    : commitment.revised_contract_amount - (paymentsIssued ?? 0);
  const percentPaid =
    paymentsIssued !== undefined && commitment.revised_contract_amount > 0
      ? (paymentsIssued / commitment.revised_contract_amount) * 100
      : undefined;
  const pendingRevisedContractAmount =
    commitment.revised_contract_amount + pendingCOs;

  return (
    <div className="overflow-hidden rounded-lg bg-card">
      <div className="grid grid-cols-2 divide-x divide-y divide-border lg:grid-cols-5 lg:divide-y-0">
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
        <div className="px-5 py-4">
          <KpiBlock
            label="Pending COs"
            value={formatCurrency(pendingCOs)}
            size="compact"
          />
        </div>
        <div className="px-5 py-4">
          <KpiBlock
            label="Draft COs"
            value={formatCurrency(draftCOs)}
            size="compact"
          />
        </div>
        <div className="px-5 py-4">
          <KpiBlock
            label="Payments Issued"
            value={paymentsIssued !== undefined ? formatCurrency(paymentsIssued) : "—"}
            size="compact"
          />
        </div>
        <div className="px-5 py-4">
          <KpiBlock
            label="Remaining Balance"
            value={formatCurrency(remainingBalance)}
            size="compact"
          />
        </div>
        <div className="px-5 py-4">
          <KpiBlock
            label="% Paid"
            value={percentPaid !== undefined ? `${percentPaid.toFixed(1)}%` : "—"}
            size="compact"
          />
        </div>
        <div className="px-5 py-4 lg:col-span-1">
          <KpiBlock
            label="Pending Revised Contract"
            value={formatCurrency(pendingRevisedContractAmount)}
            size="compact"
          />
        </div>
      </div>
    </div>
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
      const response = await fetch(
        `/api/projects/${projectId}/commitments/${commitmentId}/subcontractor-sov`,
      );
      if (!response.ok) return;
      const payload = (await response.json()) as {
        data?: { lineItems?: Array<{ id: string }> };
      };
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
        <p className="text-sm text-destructive">{error || "Commitment not found"}</p>
      </PageShell>
    );
  }

  const sovLabel = isPO ? "PO SOV" : "SOV";
  const showSubcontractorSovTab = !isPO;

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
            <Receipt className="mr-2 h-4 w-4" />
            Invoice
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setActiveTab("payments");
              toast.info("Navigate to Payments tab to create a payment");
            }}
          >
            <Receipt className="mr-2 h-4 w-4" />
            Payment
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              router.push(`/${projectId}/change-events`);
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            RFQ
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEmail}>
            <Mail className="mr-2 h-4 w-4" />
            Email Contract
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
      variant="dashboard"
      title={commitment.title || displayNumber || "Commitment"}
      description={description}
      actions={headerActions}
      statusBadge={<StatusBadge status={commitment.status ? commitment.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Draft"} />}
      onBack={() => router.back()}
      contentClassName="space-y-4"
    >

      <PageTabs
        variant="inline"
        className="border-b border-border"
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

      <div className="pt-2">
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
          <PaymentsIssuedTab commitmentId={commitment.id} />
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
