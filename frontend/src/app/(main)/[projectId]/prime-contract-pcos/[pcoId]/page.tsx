"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Copy,
  Download,
  FileText,
  Inbox,
  Link2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Inline } from "@/components/layout/inline";
import { Text } from "@/components/ds/text";
import { PageShell } from "@/components/layout";
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
  total_amount: number;
  calculated_amount: number;
  schedule_impact: number | null;
  created_at: string;
  updated_at: string | null;
  promoted_to_co_id: number | null;
  promoted_at: string | null;
  due_date: string | null;
  line_items: PcoLineItem[];
  line_items_count: number;
  change_event_links: LinkedChangeEvent[];
  prime_contract?: {
    id: string;
    contract_number: string;
    title: string;
    status: string;
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

function formatDate(dateValue: string | null | undefined): string {
  if (!dateValue) return "--";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleDateString();
}

/* ── Page Component ─────────────────────────────────────────────── */

export default function PrimeContractPcoDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const projectId = parseInt(params.projectId as string, 10);
  const pcoId = params.pcoId as string;

  const [pco, setPco] = useState<PcoDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("line-items");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

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

  /* ── Navigation ────────────────────────────────────────────────── */

  const handleBack = useCallback(() => {
    router.push(`/${projectId}/prime-contract-pcos`);
  }, [router, projectId]);

  /* ── Edit mode redirect ────────────────────────────────────────── */

  useEffect(() => {
    if (searchParams.get("edit") === "1" && pco) {
      // For now, navigate to the detail page without edit param
      // A full edit form can be added later
      toast.info("Edit mode is not yet implemented for PCOs");
      router.replace(`/${projectId}/prime-contract-pcos/${pcoId}`);
    }
  }, [searchParams, pco, projectId, pcoId, router]);

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
      router.push(`/${projectId}/prime-contract-pcos`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete PCO");
    }
  }, [projectId, pcoId, router]);

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
      <PageShell variant="detail" title="Loading...">
        <div className="space-y-4">
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
        title="Error"
        actions={
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        }
      >
        <Text tone="destructive">{error || "PCO not found"}</Text>
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
          disabled
          title="Edit form coming soon"
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
      variant="detail"
      title={pageTitle}
      actions={headerActions}
      onBack={handleBack}
    >
      {/* Summary header */}
      <div className="flex flex-wrap items-center gap-4 pb-6 border-b border-border">
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

      {/* Description */}
      {pco.description && (
        <div className="pt-4 pb-2">
          <Text size="sm" tone="muted" className="mb-1">
            Description
          </Text>
          <Text>{pco.description}</Text>
        </div>
      )}

      {/* Metadata row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4">
        <div>
          <Text size="sm" tone="muted">
            Schedule Impact
          </Text>
          <Text>
            {pco.schedule_impact != null ? `${pco.schedule_impact} days` : "--"}
          </Text>
        </div>
        <div>
          <Text size="sm" tone="muted">
            Due Date
          </Text>
          <Text>{formatDate(pco.due_date)}</Text>
        </div>
        <div>
          <Text size="sm" tone="muted">
            Created
          </Text>
          <Text>{formatDate(pco.created_at)}</Text>
        </div>
        <div>
          <Text size="sm" tone="muted">
            Last Updated
          </Text>
          <Text>{formatDate(pco.updated_at)}</Text>
        </div>
      </div>

      {pco.promoted_to_co_id && (
        <div className="rounded-md bg-muted px-4 py-3 mb-4">
          <Text size="sm">
            Promoted to Change Order #{pco.promoted_to_co_id} on{" "}
            {formatDate(pco.promoted_at)}
          </Text>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <TabsList variant="line">
          <TabsTrigger value="line-items" data-testid="pco-tab-line-items">
            Line Items ({lineItems.length})
          </TabsTrigger>
          <TabsTrigger
            value="change-events"
            data-testid="pco-tab-change-events"
          >
            Source Change Events ({changeEventLinks.length})
          </TabsTrigger>
        </TabsList>

        <div className="pt-6">
          {/* Line Items Tab */}
          <TabsContent value="line-items">
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
                          <span className="block text-xs text-muted-foreground mt-0.5">
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
          </TabsContent>

          {/* Source Change Events Tab */}
          <TabsContent value="change-events">
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
                      className="w-full flex items-center justify-between rounded-md bg-muted/50 px-4 py-3 h-auto text-left hover:bg-muted"
                      onClick={() =>
                        router.push(
                          `/${projectId}/change-events/${ce.id}`,
                        )
                      }
                    >
                      <div className="flex-1 min-w-0">
                        <Text className="font-medium truncate">
                          {ce.number} - {ce.title}
                        </Text>
                        <div className="flex items-center gap-2 mt-1">
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
                    </Button>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>

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
