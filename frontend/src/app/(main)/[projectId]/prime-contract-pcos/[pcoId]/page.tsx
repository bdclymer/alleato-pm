"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Clock,
  Copy,
  Download,
  Inbox,
  Link2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { formatDate } from "@/lib/format";
import { apiFetch } from "@/lib/api-client";
import { handleFormError } from "@/lib/handle-form-error";
import {
  PRIME_CONTRACT_CHANGE_ORDER_STATUSES,
} from "@/lib/change-orders/prime-contract-change-order-statuses";
import { FileUploadField } from "@/components/forms";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Inline } from "@/components/layout/inline";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  DetailField,
  DetailFieldGrid,
  EditableDetailField,
  EmptyState,
  Text,
} from "@/components/ds";
import {
  ContentSectionStack,
  PageTabs,
  PageShell,
} from "@/components/layout";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { ErrorState, StatusBadge } from "@/components/ds";
import { PrimeContractFinancialMarkupTab } from "@/components/domain/contracts/prime-contract-detail";
import type { BudgetCode, VerticalMarkup } from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";
import {
  InlineTable,
  InlineTableHeader,
  InlineTableHeaderRow,
  InlineTableHeaderCell,
  InlineTableBody,
  InlineTableRow,
  InlineTableCell,
} from "@/components/ds";

/* ── Types ──────────────────────────────────────────────────────── */

interface PcoLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_of_measure: string;
  unit_cost: number;
  amount: number;
  change_event_id: string | null;
  change_event?: {
    id: string;
    number: string;
    title: string;
  } | null;
}

interface LinkedChangeEvent {
  change_event_id: string;
  linked_at: string;
  change_event?: {
    id: string;
    number: string;
    title: string;
    status: string;
    scope: string | null;
    type: string | null;
  } | null;
}

interface PcoDetail {
  id: string;
  project_id: number;
  prime_contract_id: string;
  pco_number: string;
  title: string;
  status: "draft" | "pending" | "approved" | "void";
  description: string | null;
  change_reason: string | null;
  revision: number | null;
  is_private: boolean;
  executed: boolean;
  signed_co_received_date: string | null;
  request_received_from: string | null;
  location: string | null;
  field_change: boolean;
  reference: string | null;
  paid_in_full: boolean;
  total_amount: number;
  calculated_amount: number;
  schedule_impact: number | null;
  created_at: string;
  created_by: string | null;
  created_by_name: string | null;
  updated_at: string | null;
  promoted_to_co_id: number | null;
  promoted_at: string | null;
  due_date: string | null;
  line_items: PcoLineItem[];
  line_items_count: number;
  change_event_links: LinkedChangeEvent[];
  attachments: Array<{
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    uploaded_at: string;
    uploaded_by: string | null;
  }>;
  prime_contract?: {
    id: string;
    contract_number: string;
    title: string;
    status: string;
    contract_company?: { id: string; name: string } | null;
    client?: { id: string; name: string } | null;
    vendor?: { id: string; name: string } | null;
  } | null;
}

type PcoTab = "general" | "schedule-of-values" | "related-items" | "emails" | "financial-markup" | "history";

/* ── Helpers ────────────────────────────────────────────────────── */

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}


function formatDateTime(dateValue: string | null | undefined): string {
  if (!dateValue) return "--";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleString();
}

function formatPcoHeadingNumber(pcoNumber: string | null | undefined): string {
  if (!pcoNumber) return "";
  return pcoNumber.startsWith("#") ? pcoNumber : `#${pcoNumber}`;
}

const CHANGE_REASONS = [
  "Allowance",
  "Backcharge",
  "Client Request",
  "Design Development",
  "Design Error",
  "Design Omission",
  "Existing Condition",
  "Field Condition",
  "Owner Request",
  "Regulatory Requirement",
  "Scope Change",
  "Unforeseen Condition",
  "Value Engineering",
  "Other",
].map((value) => ({ value, label: value }));

/* ── Page Component ─────────────────────────────────────────────── */

export default function PrimeContractPcoDetailPage() {
  const router = useRouter();
  const params = useParams()!;
  const projectId = parseInt(params.projectId as string, 10);
  const pcoId = params.pcoId as string;
  const contractIdFromRoute =
    typeof params.contractId === "string" ? params.contractId : null;

  const [pco, setPco] = useState<PcoDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [activeTab, setActiveTab] = useState<PcoTab>("general");
  const [budgetCodes, setBudgetCodes] = useState<BudgetCode[]>([]);
  const [verticalMarkups, setVerticalMarkups] = useState<VerticalMarkup[]>([]);
  const [savedVerticalMarkups, setSavedVerticalMarkups] = useState<VerticalMarkup[]>([]);
  const [markupsLoading, setMarkupsLoading] = useState(false);

  const buildPcoDetailPath = useCallback(
    (primeContractId: string | null | undefined) => {
      const resolvedContractId = contractIdFromRoute ?? primeContractId ?? null;
      if (resolvedContractId) {
        return `/${projectId}/prime-contracts/${resolvedContractId}/change-orders/pcos/${pcoId}`;
      }
      return `/${projectId}/prime-contract-pcos/${pcoId}`;
    },
    [contractIdFromRoute, projectId, pcoId],
  );

  /* ── Fetch PCO detail ──────────────────────────────────────────── */

  const fetchPco = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<PcoDetail>(
        `/api/projects/${projectId}/prime-contract-pcos/${pcoId}`,
      );
      setPco(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load PCO");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, pcoId]);

  useEffect(() => {
    fetchPco();
  }, [fetchPco]);

  useEffect(() => {
    if (contractIdFromRoute || !pco?.prime_contract_id) return;
    router.replace(buildPcoDetailPath(pco.prime_contract_id));
  }, [contractIdFromRoute, pco?.prime_contract_id, router, buildPcoDetailPath]);

  useEffect(() => {
    if (!projectId) return;

    let active = true;
    const fetchBudgetCodes = async () => {
      try {
        const response = await apiFetch<{ budgetCodes: BudgetCode[] }>(
          `/api/projects/${projectId}/budget-codes`,
        );
        if (active) {
          setBudgetCodes(response.budgetCodes || []);
        }
      } catch {
        if (active) {
          setBudgetCodes([]);
        }
      }
    };

    void fetchBudgetCodes();
    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    let active = true;
    const fetchVerticalMarkups = async () => {
      setMarkupsLoading(true);
      try {
        const data = await apiFetch<{ markups?: VerticalMarkup[] }>(
          `/api/projects/${projectId}/vertical-markup`,
        );
        if (!active) return;
        const fetched = data.markups || [];
        setVerticalMarkups(fetched);
        setSavedVerticalMarkups(fetched);
      } catch {
        if (active) {
          setVerticalMarkups([]);
          setSavedVerticalMarkups([]);
        }
      } finally {
        if (active) {
          setMarkupsLoading(false);
        }
      }
    };

    void fetchVerticalMarkups();
    return () => {
      active = false;
    };
  }, [projectId]);

  /* ── Navigation ────────────────────────────────────────────────── */

  const handleBack = useCallback(() => {
    if (contractIdFromRoute) {
      router.push(`/${projectId}/prime-contracts/${contractIdFromRoute}`);
      return;
    }
    router.push(`/${projectId}/prime-contract-pcos`);
  }, [router, projectId, contractIdFromRoute]);

  /* ── Actions ───────────────────────────────────────────────────── */

  const handleDelete = useCallback(async () => {
    try {
      await apiFetch(
        `/api/projects/${projectId}/prime-contract-pcos/${pcoId}`,
        { method: "DELETE" },
      );
      toast.success("PCO deleted");
      setShowDeleteDialog(false);
      if (contractIdFromRoute) {
        router.push(`/${projectId}/prime-contracts/${contractIdFromRoute}`);
      } else {
        router.push(`/${projectId}/prime-contract-pcos`);
      }
    } catch (err) {
      handleFormError(err, { entity: "prime contract PCO", action: "delete" });
    }
  }, [projectId, pcoId, router, contractIdFromRoute]);

  const handlePromote = useCallback(async () => {
    setIsPromoting(true);
    try {
      const result = await apiFetch<{ message?: string }>(
        `/api/projects/${projectId}/prime-contract-pcos/${pcoId}/promote`,
        { method: "POST" },
      );
      toast.success(result?.message || "PCO promoted to change order");
      setShowPromoteDialog(false);
      fetchPco();
    } catch (err) {
      handleFormError(err, { entity: "prime contract PCO", action: "promote" });
    } finally {
      setIsPromoting(false);
    }
  }, [projectId, pcoId, fetchPco]);

  const handleExport = useCallback(() => {
    if (!pco) return;
    const rows = [
      ["Field", "Value"],
      ["PCO Number", pco.pco_number],
      ["Title", pco.title],
      ["Status", pco.status],
      ["Description", (pco.description || "").replace(/\n/g, " ")],
      ["Amount", String(pco.calculated_amount || pco.total_amount || 0)],
      ["Schedule Impact", pco.schedule_impact != null ? `${pco.schedule_impact} days` : ""],
      ["Created", formatDate(pco.created_at)],
      [
        "Prime Contract",
        pco.prime_contract
          ? `${pco.prime_contract.contract_number} - ${pco.prime_contract.title}`
          : "",
      ],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pco-${pco.pco_number || pco.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported PCO");
  }, [pco]);

  const handleCopyId = useCallback(() => {
    navigator.clipboard.writeText(pcoId);
    toast.success("PCO ID copied");
  }, [pcoId]);

  const saveField = useCallback(
    async (field: string, rawValue: string) => {
      const trimToNull = (value: string) => {
        const trimmed = value.trim();
        return trimmed.length === 0 ? null : trimmed;
      };

      let value: string | number | boolean | null = rawValue;
      switch (field) {
        case "title": {
          const trimmed = rawValue.trim();
          if (!trimmed) {
            throw new Error("Title is required");
          }
          value = trimmed;
          break;
        }
        case "revision":
        case "schedule_impact":
          value = rawValue === "" ? null : Number.parseInt(rawValue, 10);
          break;
        case "is_private":
        case "executed":
        case "field_change":
        case "paid_in_full":
          value = rawValue === "true";
          break;
        case "signed_co_received_date":
          value = rawValue || null;
          break;
        case "change_reason":
          value = rawValue === "__none__" ? null : rawValue;
          break;
        case "description":
        case "request_received_from":
        case "location":
        case "reference":
          value = trimToNull(rawValue);
          break;
        default:
          value = rawValue;
      }

      await apiFetch(`/api/projects/${projectId}/prime-contract-pcos/${pcoId}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value }),
      });
      await fetchPco();
    },
    [fetchPco, pcoId, projectId],
  );

  const handleAttachmentFilesSelected = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      setIsUploadingAttachment(true);
      try {
        await Promise.all(
          files.map(async (file) => {
            const formData = new FormData();
            formData.append("file", file);
            await apiFetch(
              `/api/projects/${projectId}/prime-contract-pcos/${pcoId}/attachments`,
              {
                method: "POST",
                body: formData,
              },
            );
          }),
        );
        toast.success(
          files.length === 1
            ? "Attachment uploaded"
            : `${files.length} attachments uploaded`,
        );
        await fetchPco();
      } catch (err) {
        handleFormError(err, { entity: "attachment", action: "create" });
      } finally {
        setIsUploadingAttachment(false);
      }
    },
    [fetchPco, pcoId, projectId],
  );

  /* ── Computed values ────────────────────────────────────────────── */

  const lineItems = pco?.line_items ?? [];
  const changeEventLinks = pco?.change_event_links ?? [];

  const totalAmount = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [lineItems]);

  const historyEntries = useMemo(() => {
    if (!pco) {
      return [];
    }

    const entries: Array<{ id: string; label: string; details: string; at: string }> = [
      {
        id: "created",
        label: "Potential change order created",
        details: "Initial potential change order record was created.",
        at: pco.created_at,
      },
    ];

    const createdAt = new Date(pco.created_at).getTime();
    const updatedAt = pco.updated_at ? new Date(pco.updated_at).getTime() : Number.NaN;
    if (Number.isFinite(createdAt) && Number.isFinite(updatedAt) && updatedAt - createdAt > 1000) {
      entries.push({
        id: "updated",
        label: "Potential change order updated",
        details: "Potential change order details were updated.",
        at: pco.updated_at as string,
      });
    }

    if (pco.promoted_at) {
      entries.push({
        id: "promoted",
        label: "Promoted to prime contract change order",
        details: pco.promoted_to_co_id
          ? `Promoted into change order #${pco.promoted_to_co_id}.`
          : "Promoted into a prime contract change order.",
        at: pco.promoted_at,
      });
    }

    return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [pco]);

  const normalizedStatus = (pco?.status || "").toLowerCase();
  const canEdit = normalizedStatus !== "void";
  const canDelete = normalizedStatus === "draft";
  const canPromote =
    (normalizedStatus === "pending" || normalizedStatus === "approved") &&
    !pco?.promoted_to_co_id;

  /* ── Loading state ──────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <PageShell variant="detailWide" title="Loading Prime Contract PCO">
        <div className="space-y-4 px-6 py-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </PageShell>
    );
  }

  /* ── Error state ────────────────────────────────────────────────── */

  if (error || !pco) {
    return (
      <PageShell
        variant="detailWide"
        title="Prime Contract PCO"
        onBack={handleBack}
        backLabel="Back"
      >
        <ErrorState error={error || "PCO not found"} onRetry={handleBack} />
      </PageShell>
    );
  }

  /* ── Header ────────────────────────────────────────────────────── */

  const pageTitle = [
    "Potential Change Order",
    formatPcoHeadingNumber(pco.pco_number),
  ]
    .filter(Boolean)
    .join(" ")
    .concat(pco.title ? `: ${pco.title}` : "");

  const resolvedContractId = contractIdFromRoute ?? pco.prime_contract_id;
  const contractDisplayName = pco.prime_contract
    ? [pco.prime_contract.contract_number, pco.prime_contract.title].filter(Boolean).join(" - ")
    : "Prime Contract";

  const headerActions = (
    <Inline gap="sm">
      {canPromote && (
        <Button size="sm" onClick={() => setShowPromoteDialog(true)}>
          <ArrowUpRight className="mr-1 h-4 w-4" />
          Promote to PCCO
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyId}>
            <Copy className="mr-2 h-4 w-4" />
            Copy ID
          </DropdownMenuItem>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </Inline>
  );

  /* ── Main render ────────────────────────────────────────────────── */

  return (
    <PageShell
      variant="detailWide"
      title={pageTitle}
      onBack={handleBack}
      backLabel="Back"
      actions={headerActions}
      contentClassName="space-y-8"
    >
      <div className="space-y-4 border-b border-border pb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/${projectId}/prime-contracts`}>Prime Contracts</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/${projectId}/prime-contracts/${resolvedContractId}`}>
                  {contractDisplayName}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Change Orders</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {formatPcoHeadingNumber(pco.pco_number) || "Potential Change Order"}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <PageTabs
          variant="inline"
          tabs={[
            { label: "General", href: "general", isActive: activeTab === "general" },
            {
              label: "Schedule of Values",
              href: "schedule-of-values",
              isActive: activeTab === "schedule-of-values",
              count: lineItems.length || undefined,
            },
            {
              label: "Related Items",
              href: "related-items",
              isActive: activeTab === "related-items",
              count: changeEventLinks.length || undefined,
            },
            { label: "Emails", href: "emails", isActive: activeTab === "emails" },
            {
              label: "Financial Markup",
              href: "financial-markup",
              isActive: activeTab === "financial-markup",
            },
            {
              label: "Change History",
              href: "history",
              isActive: activeTab === "history",
              count: historyEntries.length || undefined,
            },
          ]}
          onTabClick={(href) => setActiveTab(href as PcoTab)}
        />

        <div className="flex flex-wrap items-start gap-4">
        <div className="space-y-2">
          <StatusBadge status={pco.status} />
          {pco.prime_contract && (
            <Text tone="muted" size="sm">
              Related Contract:{" "}
              <Link
                href={`/${projectId}/prime-contracts/${pco.prime_contract.id}`}
                className="underline underline-offset-4 transition-colors hover:text-foreground"
              >
                {pco.prime_contract.contract_number} - {pco.prime_contract.title}
              </Link>
            </Text>
          )}
        </div>
        <div className="ml-auto text-right">
          <Text size="sm" tone="muted">
            Total Amount
          </Text>
          <Text className="text-xl font-semibold tabular-nums">
            {formatMoney(pco.calculated_amount || totalAmount)}
          </Text>
        </div>
      </div>
      </div>

      <ContentSectionStack className="pt-1">
        {activeTab === "general" && (
        <section className="space-y-8">
          <section className="space-y-4">
          <SectionRuleHeading
            label="General Information"
            className="[&_span]:text-primary"
          />
          <DetailFieldGrid columns={2}>
            <DetailField label="#">
              {pco.pco_number || "--"}
            </DetailField>
            <DetailField label="Date Created">
              {formatDateTime(pco.created_at)}
            </DetailField>
            <DetailField label="Revision">
              <EditableDetailField
                label="Revision"
                type="number"
                value={pco.revision != null ? String(pco.revision) : ""}
                emptyPlaceholder="0"
                disabled={!canEdit}
                onSave={(value) => saveField("revision", value)}
              />
            </DetailField>
            <DetailField label="Created By">
              {pco.created_by_name || pco.created_by || "--"}
            </DetailField>
            <DetailField label="Company">
              {(() => {
                const company =
                  pco.prime_contract?.contract_company ||
                  pco.prime_contract?.client ||
                  pco.prime_contract?.vendor ||
                  null;
                const companyName = company?.name || "--";

                if (!company?.id) {
                  return companyName;
                }

                return (
                  <Link
                    href={`/directory/companies/${company.id}`}
                    className="underline underline-offset-4 transition-colors hover:text-foreground"
                  >
                    {companyName}
                  </Link>
                );
              })()}
            </DetailField>
            <DetailField label="Prime Contract">
              {pco.prime_contract ? (
                <Link
                  href={`/${projectId}/prime-contracts/${pco.prime_contract.id}`}
                  className="underline underline-offset-4 transition-colors hover:text-foreground"
                >
                  {pco.prime_contract.contract_number} - {pco.prime_contract.title}
                </Link>
              ) : (
                "--"
              )}
            </DetailField>
            <DetailField label="Title">
              <EditableDetailField
                label="Title"
                value={pco.title ?? ""}
                emptyPlaceholder="Set title"
                disabled={!canEdit}
                onSave={(value) => saveField("title", value)}
              />
            </DetailField>
            <DetailField label="Linked PCO">
              {pco.promoted_to_co_id ? `#${pco.promoted_to_co_id}` : "None"}
            </DetailField>
            <DetailField label="Status">
              <EditableDetailField
                label="Status"
                type="select"
                value={pco.status ?? ""}
                display={<StatusBadge status={pco.status} />}
                options={PRIME_CONTRACT_CHANGE_ORDER_STATUSES.map((statusOption) => ({
                  value: statusOption.value,
                  label: statusOption.label,
                }))}
                disabled={!canEdit}
                onSave={(value) => saveField("status", value)}
              />
            </DetailField>
            <DetailField label="PCO Signed">
              <EditableDetailField
                label="PCO Signed"
                type="date"
                value={pco.signed_co_received_date ?? ""}
                display={formatDate(pco.signed_co_received_date)}
                emptyPlaceholder="Not set"
                disabled={!canEdit}
                onSave={(value) => saveField("signed_co_received_date", value)}
              />
            </DetailField>
            <DetailField label="Change Reason">
              <EditableDetailField
                label="Change Reason"
                type="select"
                value={pco.change_reason ?? "__none__"}
                display={pco.change_reason || "--"}
                options={[{ value: "__none__", label: "None" }, ...CHANGE_REASONS]}
                disabled={!canEdit}
                onSave={(value) => saveField("change_reason", value)}
              />
            </DetailField>
            <DetailField label="Location">
              <EditableDetailField
                label="Location"
                value={pco.location ?? ""}
                emptyPlaceholder="Not set"
                disabled={!canEdit}
                onSave={(value) => saveField("location", value)}
              />
            </DetailField>
            <DetailField label="Private">
              <EditableDetailField
                label="Private"
                type="boolean"
                value={String(pco.is_private)}
                display={pco.is_private ? "Yes" : "No"}
                disabled={!canEdit}
                onSave={(value) => saveField("is_private", value)}
              />
            </DetailField>
            <DetailField label="Field Change">
              <EditableDetailField
                label="Field Change"
                type="boolean"
                value={String(pco.field_change)}
                display={pco.field_change ? "Yes" : "No"}
                disabled={!canEdit}
                onSave={(value) => saveField("field_change", value)}
              />
            </DetailField>
            <DetailField label="Executed">
              <EditableDetailField
                label="Executed"
                type="boolean"
                value={String(pco.executed)}
                display={pco.executed ? "Yes" : "No"}
                disabled={!canEdit}
                onSave={(value) => saveField("executed", value)}
              />
            </DetailField>
            <DetailField label="Paid in Full">
              <EditableDetailField
                label="Paid in Full"
                type="boolean"
                value={String(pco.paid_in_full)}
                display={pco.paid_in_full ? "Yes" : "No"}
                disabled={!canEdit}
                onSave={(value) => saveField("paid_in_full", value)}
              />
            </DetailField>
            <DetailField label="Requested By">
              <EditableDetailField
                label="Requested By"
                value={pco.request_received_from ?? ""}
                emptyPlaceholder="Not set"
                disabled={!canEdit}
                onSave={(value) => saveField("request_received_from", value)}
              />
            </DetailField>
            <DetailField label="Schedule Impact">
              <EditableDetailField
                label="Schedule Impact"
                type="number"
                value={pco.schedule_impact != null ? String(pco.schedule_impact) : ""}
                display={
                  pco.schedule_impact != null ? `${pco.schedule_impact} days` : "--"
                }
                emptyPlaceholder="Not set"
                disabled={!canEdit}
                onSave={(value) => saveField("schedule_impact", value)}
              />
            </DetailField>
            <DetailField label="Reference">
              <EditableDetailField
                label="Reference"
                value={pco.reference ?? ""}
                emptyPlaceholder="Not set"
                disabled={!canEdit}
                onSave={(value) => saveField("reference", value)}
              />
            </DetailField>
            <DetailField label="Description" span={2}>
              <EditableDetailField
                label="Description"
                type="textarea"
                value={pco.description ?? ""}
                display={
                  <span className="whitespace-pre-wrap">
                    {pco.description || "--"}
                  </span>
                }
                emptyPlaceholder="Add a description"
                disabled={!canEdit}
                onSave={(value) => saveField("description", value)}
              />
            </DetailField>
          </DetailFieldGrid>
        </section>

        <section className="space-y-4">
          <SectionRuleHeading
            label="Attachments"
            className="[&_span]:text-primary"
          />
          <div className="max-w-3xl">
            <FileUploadField
              multiple
              variant="minimal"
              disabled={isUploadingAttachment}
              onFilesSelected={(files) => {
                void handleAttachmentFilesSelected(files);
              }}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.heic,.csv,.dwg"
              maxSize={25 * 1024 * 1024}
            />
          </div>
          {pco.attachments?.length ? (
            <div className="space-y-2">
              {pco.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.file_path}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/50"
                >
                  <span className="truncate">{attachment.file_name}</span>
                  <span className="text-muted-foreground">
                    {Math.max(1, Math.round(attachment.file_size / 1024))} KB
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No attachments yet. Upload files to attach them to this PCO.
            </p>
          )}
        </section>
        </section>
        )}

        {activeTab === "schedule-of-values" && (
        <section className="space-y-4">
          <SectionRuleHeading
            label="Schedule of Values"
            className="[&_span]:text-primary"
          />
          {lineItems.length === 0 ? (
            <EmptyState
              icon={<Inbox />}
              title="No schedule of values"
              description="This potential change order does not have any line items yet."
            />
          ) : (
            <div className="line-items-scroll-shell relative rounded-lg">
              <InlineTable variant="edit" tableClassName="min-w-[62rem] table-fixed">
                <colgroup>
                  <col className="w-176" />
                  <col className="w-24" />
                  <col className="w-24" />
                  <col className="w-40" />
                  <col className="w-40" />
                </colgroup>
                <InlineTableHeader className="border-y-0 [&_tr]:border-b-0">
                  <InlineTableHeaderRow className="border-b border-border/60 hover:bg-transparent">
                    <InlineTableHeaderCell
                      colSpan={1}
                      className="line-item-group-end border-b border-border/60 px-2 py-1 text-xs font-semibold normal-case tracking-normal text-muted-foreground"
                    >
                      Detail
                    </InlineTableHeaderCell>
                    <InlineTableHeaderCell
                      colSpan={4}
                      className="line-item-group-start border-b border-l border-border/60 px-2 py-1 text-right text-xs font-semibold normal-case tracking-normal text-muted-foreground"
                    >
                      Pricing
                    </InlineTableHeaderCell>
                  </InlineTableHeaderRow>
                  <InlineTableHeaderRow className="border-b-0 hover:bg-transparent">
                    <InlineTableHeaderCell className="w-176 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                      Description
                    </InlineTableHeaderCell>
                    <InlineTableHeaderCell className="line-item-group-start w-24 border-l border-border/60 px-2 py-1.5 text-right text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                      Qty
                    </InlineTableHeaderCell>
                    <InlineTableHeaderCell className="w-24 px-2 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                      UOM
                    </InlineTableHeaderCell>
                    <InlineTableHeaderCell className="w-40 px-1 py-1.5 text-right text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                      Unit Cost
                    </InlineTableHeaderCell>
                    <InlineTableHeaderCell className="w-40 px-1 py-1.5 text-right text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                      Amount
                    </InlineTableHeaderCell>
                  </InlineTableHeaderRow>
                </InlineTableHeader>
                <InlineTableBody>
                  {lineItems.map((item) => (
                    <InlineTableRow
                      key={item.id}
                      className="group border-b-0 bg-background transition-colors hover:bg-transparent"
                    >
                      <InlineTableCell
                        className="w-176 px-1 py-1.5 align-top text-[13px]"
                        title={item.description || undefined}
                      >
                        <span className="block whitespace-normal text-foreground">
                          {item.description || "--"}
                        </span>
                        {item.change_event && (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            CE: {item.change_event.number} - {item.change_event.title}
                          </span>
                        )}
                      </InlineTableCell>
                      <InlineTableCell className="line-item-group-start w-24 border-l border-border/60 px-2 py-1.5 align-top text-right text-[13px] tabular-nums">
                        {item.quantity}
                      </InlineTableCell>
                      <InlineTableCell className="w-24 px-2 py-1.5 align-top text-[13px] text-muted-foreground">
                        {item.unit_of_measure || "--"}
                      </InlineTableCell>
                      <InlineTableCell className="w-40 px-1 py-1.5 align-top text-right text-[13px] tabular-nums">
                        {formatMoney(item.unit_cost || 0)}
                      </InlineTableCell>
                      <InlineTableCell className="w-40 px-1 py-1.5 align-top text-right text-[13px] font-semibold tabular-nums">
                        {formatMoney(item.amount || 0)}
                      </InlineTableCell>
                    </InlineTableRow>
                  ))}
                  <InlineTableRow className="bg-muted/35 hover:bg-muted/35">
                    <InlineTableCell className="border-t border-border px-1.5 pb-3 pt-4 text-sm font-semibold text-foreground">
                      Total
                    </InlineTableCell>
                    <InlineTableCell className="border-t border-border px-1.5 pb-2.5 pt-4" />
                    <InlineTableCell className="border-t border-border px-1.5 pb-2.5 pt-4" />
                    <InlineTableCell className="border-t border-border px-1.5 pb-2.5 pt-4" />
                    <InlineTableCell className="border-t border-border px-1.5 pb-2.5 pt-4 text-right text-sm font-semibold text-foreground tabular-nums">
                      {formatMoney(totalAmount)}
                    </InlineTableCell>
                  </InlineTableRow>
                </InlineTableBody>
              </InlineTable>
            </div>
          )}
        </section>
        )}

        {activeTab === "related-items" && (
        <section className="space-y-4">
          <SectionRuleHeading
            label="Related Items"
            className="[&_span]:text-primary"
          />
          {changeEventLinks.length === 0 ? (
            <EmptyState
              icon={<Link2 />}
              title="No related items"
              description="No source change events have been linked to this potential change order."
            />
          ) : (
            <div className="space-y-2">
              {changeEventLinks.map((link) => {
                const ce = link.change_event;
                if (!ce) return null;

                return (
                  <Button
                    key={link.change_event_id}
                    variant="ghost"
                    className="h-auto w-full rounded-md bg-muted/50 px-4 py-3 text-left hover:bg-muted"
                    onClick={() =>
                      router.push(
                        `/${projectId}/change-events/${ce.id}`,
                      )
                    }
                  >
                    <div className="flex min-w-0 flex-1 items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <Text className="truncate font-medium">
                          {ce.number} - {ce.title}
                        </Text>
                        <div className="mt-1 flex items-center gap-2">
                          <StatusBadge status={ce.status} />
                          {ce.scope && (
                            <Text size="sm" tone="muted">
                              {ce.scope}
                            </Text>
                          )}
                          {ce.type && (
                            <Text size="sm" tone="muted">
                              {ce.type}
                            </Text>
                          )}
                        </div>
                      </div>
                      <Text size="sm" tone="muted" className="ml-4 shrink-0">
                        Linked {formatDate(link.linked_at)}
                      </Text>
                    </div>
                  </Button>
                );
              })}
            </div>
          )}
        </section>
        )}

        {activeTab === "emails" && (
          <section className="space-y-4">
            <SectionRuleHeading
              label="Emails"
              className="[&_span]:text-primary"
            />
            <EmptyState
              title="PCO email threading is not available yet"
              description="This page now has the email tab for parity, but prime contract PCO-specific email routing is not wired in the current data model yet."
            />
          </section>
        )}

        {activeTab === "financial-markup" && (
          <PrimeContractFinancialMarkupTab
            projectId={String(projectId)}
            budgetCodes={budgetCodes}
            verticalMarkups={verticalMarkups}
            setVerticalMarkups={setVerticalMarkups}
            savedVerticalMarkups={savedVerticalMarkups}
            setSavedVerticalMarkups={setSavedVerticalMarkups}
            markupsLoading={markupsLoading}
          />
        )}

        {activeTab === "history" && (
          <section className="space-y-4">
            <SectionRuleHeading
              label="Change History"
              className="[&_span]:text-primary"
            />
            {historyEntries.length === 0 ? (
              <EmptyState
                icon={<Clock className="h-8 w-8 text-muted-foreground" />}
                title="No change history"
                description="Changes to this potential change order will appear here."
              />
            ) : (
              <div className="divide-y divide-border rounded-md border border-border">
                {historyEntries.map((entry) => (
                  <div key={entry.id} className="space-y-1 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{entry.label}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(entry.at)}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.details}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </ContentSectionStack>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete PCO?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete PCO #{pco.pco_number}. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promote Dialog */}
      <AlertDialog
        open={showPromoteDialog}
        onOpenChange={setShowPromoteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote to Change Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create an official Prime Contract Change Order (PCCO)
              from PCO #{pco.pco_number} with amount{" "}
              {formatMoney(pco.calculated_amount || totalAmount)}. This action
              cannot be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPromoting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePromote} disabled={isPromoting}>
              {isPromoting ? "Promoting..." : "Promote"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
