"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Copy,
  Download,
  Inbox,
  Link2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { formatDate } from "@/lib/format";
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
import { Text } from "@/components/ds/text";
import {
  LabelValueRow,
  PageShell,
} from "@/components/layout";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { StatusBadge, EmptyState } from "@/components/ds";
import {
  InlineTable,
  InlineTableHeader,
  InlineTableHeaderRow,
  InlineTableHeaderCell,
  InlineTableBody,
  InlineTableRow,
  InlineTableCell,
  InlineTableFooter,
  InlineTableFooterRow,
  InlineTableFooterCell,
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

  const buildPcoEditPath = useCallback(
    (primeContractId: string | null | undefined) => {
      const resolvedContractId = contractIdFromRoute ?? primeContractId ?? null;
      if (resolvedContractId) {
        return `/${projectId}/prime-contracts/${resolvedContractId}/change-orders/pcos/${pcoId}/edit`;
      }
      return `/${projectId}/prime-contract-pcos/${pcoId}/edit`;
    },
    [contractIdFromRoute, projectId, pcoId],
  );

  /* ── Fetch PCO detail ──────────────────────────────────────────── */

  const fetchPco = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/prime-contract-pcos/${pcoId}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load PCO");
      }
      const data = await res.json();
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
      const response = await fetch(
        `/api/projects/${projectId}/prime-contract-pcos/${pcoId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete PCO");
      }
      toast.success("PCO deleted");
      setShowDeleteDialog(false);
      if (contractIdFromRoute) {
        router.push(`/${projectId}/prime-contracts/${contractIdFromRoute}`);
      } else {
        router.push(`/${projectId}/prime-contract-pcos`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete PCO");
    }
  }, [projectId, pcoId, router, contractIdFromRoute]);

  const handlePromote = useCallback(async () => {
    setIsPromoting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/prime-contract-pcos/${pcoId}/promote`,
        { method: "POST" },
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to promote PCO");
      }
      const result = await response.json();
      toast.success(result.message || "PCO promoted to change order");
      setShowPromoteDialog(false);
      fetchPco();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to promote PCO");
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

  /* ── Computed values ────────────────────────────────────────────── */

  const lineItems = pco?.line_items ?? [];
  const changeEventLinks = pco?.change_event_links ?? [];

  const totalAmount = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [lineItems]);

  const normalizedStatus = (pco?.status || "").toLowerCase();
  const canEdit = normalizedStatus === "draft" || normalizedStatus === "pending";
  const canDelete = normalizedStatus === "draft";
  const canPromote =
    (normalizedStatus === "pending" || normalizedStatus === "approved") &&
    !pco?.promoted_to_co_id;

  /* ── Loading state ──────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <PageShell variant="dashboard" title="Loading Prime Contract PCO">
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
        variant="dashboard"
        title="Prime Contract PCO"
        onBack={handleBack}
        backLabel="Back"
      >
        <div className="px-6 py-4">
          <Text tone="destructive">{error || "PCO not found"}</Text>
        </div>
      </PageShell>
    );
  }

  /* ── Header ────────────────────────────────────────────────────── */

  const pageTitle = `PCO #${pco.pco_number}: ${pco.title || "Untitled"}`;

  const headerActions = (
    <Inline gap="sm">
      {canEdit && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(buildPcoEditPath(pco.prime_contract_id))}
        >
          Edit
        </Button>
      )}
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
      variant="dashboard"
      title={pageTitle}
      description={
        pco.prime_contract
          ? `Contract ${pco.prime_contract.contract_number}${pco.prime_contract.title ? ` — ${pco.prime_contract.title}` : ""}`
          : undefined
      }
      onBack={handleBack}
      backLabel="Back"
      actions={headerActions}
      contentClassName="space-y-8"
    >
      {/* Summary header */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border pb-6">
        <StatusBadge status={pco.status} />
        {pco.prime_contract && (
          <Text tone="muted" size="sm">
            Prime Contract: {pco.prime_contract.contract_number} -{" "}
            {pco.prime_contract.title}
          </Text>
        )}
        <div className="ml-auto text-right">
          <Text size="sm" tone="muted">
            Total Amount
          </Text>
          <Text className="text-xl font-semibold tabular-nums">
            {formatMoney(pco.calculated_amount || totalAmount)}
          </Text>
        </div>
      </div>

      <div className="space-y-8">
        <section className="space-y-4">
          <SectionRuleHeading label="General Information" />
          <div className="grid grid-cols-1 gap-x-20 gap-y-0 lg:grid-cols-2">
            <dl className="space-y-4 text-sm">
              <LabelValueRow label="#">{pco.pco_number || "--"}</LabelValueRow>
              <LabelValueRow label="Revision">{pco.revision ?? 0}</LabelValueRow>
              <LabelValueRow label="Contract Company">
                {pco.prime_contract?.contract_company?.name ||
                  pco.prime_contract?.client?.name ||
                  pco.prime_contract?.vendor?.name ||
                  "--"}
              </LabelValueRow>
              <LabelValueRow label="Title">{pco.title || "--"}</LabelValueRow>
              <LabelValueRow label="Status">
                <StatusBadge status={pco.status} />
              </LabelValueRow>
              <LabelValueRow label="Change Reason">
                {pco.change_reason || "--"}
              </LabelValueRow>
              <LabelValueRow label="Private">
                {pco.is_private ? "Yes" : "No"}
              </LabelValueRow>
              <LabelValueRow label="Description">
                <span className="whitespace-pre-wrap">
                  {pco.description || "--"}
                </span>
              </LabelValueRow>
              <LabelValueRow label="Executed">
                {pco.executed ? "Yes" : "No"}
              </LabelValueRow>
              <LabelValueRow label="Request Received From">
                {pco.request_received_from || "--"}
              </LabelValueRow>
              <LabelValueRow label="Schedule Impact">
                {pco.schedule_impact != null ? `${pco.schedule_impact} days` : "--"}
              </LabelValueRow>
              <LabelValueRow label="Reference">
                {pco.reference || "--"}
              </LabelValueRow>
            </dl>
            <dl className="space-y-4 text-sm">
              <LabelValueRow label="Date Created">
                {formatDateTime(pco.created_at)}
              </LabelValueRow>
              <LabelValueRow label="Created By">
                {pco.created_by_name || pco.created_by || "--"}
              </LabelValueRow>
              <LabelValueRow label="Contract">
                {pco.prime_contract
                  ? `${pco.prime_contract.contract_number} - ${pco.prime_contract.title}`
                  : "--"}
              </LabelValueRow>
              <LabelValueRow label="Prime Contract Change Order">
                {pco.promoted_to_co_id ? `#${pco.promoted_to_co_id}` : "None"}
              </LabelValueRow>
              <LabelValueRow label="Signed Change Order Received Date">
                {formatDate(pco.signed_co_received_date)}
              </LabelValueRow>
              <LabelValueRow label="Location">{pco.location || "--"}</LabelValueRow>
              <LabelValueRow label="Field Change">
                {pco.field_change ? "Yes" : "No"}
              </LabelValueRow>
              <LabelValueRow label="Paid in Full">
                {pco.paid_in_full ? "Yes" : "No"}
              </LabelValueRow>
            </dl>
          </div>
        </section>

        <section className="space-y-4">
          <SectionRuleHeading label="Attachments" />
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
            <EmptyState
              title="No attachments yet"
              description="Upload files to attach them to this PCO."
            />
          )}
        </section>

        <section className="space-y-4">
          <SectionRuleHeading label="Line Items" />
          {lineItems.length === 0 ? (
            <EmptyState
              icon={<Inbox />}
              title="No line items"
              description="This PCO does not have any line items yet."
            />
          ) : (
            <InlineTable>
              <InlineTableHeader>
                <InlineTableHeaderRow>
                  <InlineTableHeaderCell>
                    Description
                  </InlineTableHeaderCell>
                  <InlineTableHeaderCell className="text-right">
                    Qty
                  </InlineTableHeaderCell>
                  <InlineTableHeaderCell>
                    UOM
                  </InlineTableHeaderCell>
                  <InlineTableHeaderCell className="text-right">
                    Unit Cost
                  </InlineTableHeaderCell>
                  <InlineTableHeaderCell className="text-right">
                    Amount
                  </InlineTableHeaderCell>
                </InlineTableHeaderRow>
              </InlineTableHeader>
              <InlineTableBody>
                {lineItems.map((item) => (
                  <InlineTableRow key={item.id}>
                    <InlineTableCell>
                      <span className="text-foreground">
                        {item.description || "--"}
                      </span>
                      {item.change_event && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          CE: {item.change_event.number} -{" "}
                          {item.change_event.title}
                        </span>
                      )}
                    </InlineTableCell>
                    <InlineTableCell className="text-right tabular-nums">
                      {item.quantity}
                    </InlineTableCell>
                    <InlineTableCell className="text-muted-foreground">
                      {item.unit_of_measure || "--"}
                    </InlineTableCell>
                    <InlineTableCell className="text-right tabular-nums">
                      {formatMoney(item.unit_cost || 0)}
                    </InlineTableCell>
                    <InlineTableCell className="text-right tabular-nums font-medium">
                      {formatMoney(item.amount || 0)}
                    </InlineTableCell>
                  </InlineTableRow>
                ))}
              </InlineTableBody>
              <InlineTableFooter>
                <InlineTableFooterRow>
                  <InlineTableFooterCell colSpan={3}>
                    Total
                  </InlineTableFooterCell>
                  <InlineTableFooterCell />
                  <InlineTableFooterCell className="text-right tabular-nums font-semibold">
                    {formatMoney(totalAmount)}
                  </InlineTableFooterCell>
                </InlineTableFooterRow>
              </InlineTableFooter>
            </InlineTable>
          )}
        </section>

        <section className="space-y-4">
          <SectionRuleHeading label="Source Change Events" />
          {changeEventLinks.length === 0 ? (
            <EmptyState
              icon={<Link2 />}
              title="No linked change events"
              description="No change events have been linked to this PCO."
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
      </div>

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
