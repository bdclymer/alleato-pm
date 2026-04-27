"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Download,
  FileText,
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
import { useProjectTitle } from "@/hooks/useProjectTitle";
import {
  formatMoney,
  statusLabel,
  commitmentTypeLabel,
  type CommitmentPcoDetail,
} from "@/features/commitment-pcos/commitment-pcos-table-config";

/* ── Page component ──────────────────────────────────────────────── */

export default function CommitmentPcoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = parseInt(params.projectId as string, 10);
  const pcoId = params.pcoId as string;

  const [pco, setPco] = useState<CommitmentPcoDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("line-items");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);

  const fetchPco = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/commitment-pcos/${pcoId}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load PCO");
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

  useProjectTitle(
    pco ? `${pco.pco_number} - ${pco.title}` : "Loading...",
  );

  /* ── Navigation ─────────────────────────────────────────────────── */

  const handleBack = useCallback(() => {
    router.push(`/${projectId}/commitment-pcos`);
  }, [router, projectId]);

  /* ── Actions ────────────────────────────────────────────────────── */

  const handleDelete = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/commitment-pcos/${pcoId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete PCO");
      }
      toast.success("PCO deleted");
      setShowDeleteDialog(false);
      router.push(`/${projectId}/commitment-pcos`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete PCO");
    }
  }, [projectId, pcoId, router]);

  const handlePromote = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/commitment-pcos/${pcoId}/promote`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to promote PCO");
      }
      toast.success("PCO promoted to Change Order");
      setShowPromoteDialog(false);
      fetchPco();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to promote PCO");
    }
  }, [projectId, pcoId, fetchPco]);

  const handleExport = useCallback(() => {
    if (!pco) return;
    const rows = [
      ["Field", "Value"],
      ["PCO Number", pco.pco_number || ""],
      ["Title", pco.title || ""],
      ["Status", pco.status || ""],
      ["Commitment Type", commitmentTypeLabel(pco.commitment_type)],
      ["Commitment", pco.commitment?.title || ""],
      ["Total Amount", String(pco.total_amount ?? 0)],
      ["Schedule Impact", String(pco.schedule_impact ?? "N/A")],
      ["Description", (pco.description || "").replace(/\n/g, " ")],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commitment-pco-${pco.pco_number || pco.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported PCO");
  }, [pco]);

  const handleCopyId = useCallback(() => {
    navigator.clipboard.writeText(pcoId);
    toast.success("PCO ID copied");
  }, [pcoId]);

  /* ── Derived state ──────────────────────────────────────────────── */

  const canEdit = pco?.status === "draft" || pco?.status === "pending";
  const canDelete = pco?.status === "draft";
  const canPromote =
    (pco?.status === "pending" || pco?.status === "approved") &&
    !pco?.promoted_to_co_id;

  const linkedCeCount = pco?.linked_change_events?.length ?? 0;

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
        <Text tone="destructive">{error || "Commitment PCO not found"}</Text>
      </PageShell>
    );
  }

  /* ── Header actions ─────────────────────────────────────────────── */

  const pcoTitle = `PCO ${pco.pco_number}: ${pco.title || "Untitled"}`;

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
          <ArrowRight className="mr-1 h-4 w-4" />
          Promote to CCO
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
      title={pcoTitle}
      actions={headerActions}
      onBack={handleBack}
    >
      {/* Summary info */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={statusLabel(pco.status)} />
        <Text tone="muted" className="text-sm">
          {commitmentTypeLabel(pco.commitment_type)}
          {pco.commitment?.title && ` — ${pco.commitment.title}`}
          {pco.commitment?.vendor_name && ` (${pco.commitment.vendor_name})`}
        </Text>
      </div>

      {/* Total amount */}
      <div className="mb-8 rounded-lg bg-muted/50 px-5 py-4">
        <Text tone="muted" className="text-xs uppercase tracking-wider">
          Total Amount
        </Text>
        <p className="text-2xl font-semibold tabular-nums text-foreground">
          {formatMoney(pco.total_amount)}
        </p>
        {pco.schedule_impact != null && pco.schedule_impact !== 0 && (
          <Text tone="muted" className="mt-1 text-sm">
            Schedule impact: {pco.schedule_impact} day
            {Math.abs(pco.schedule_impact) !== 1 ? "s" : ""}
          </Text>
        )}
      </div>

      {/* Description */}
      {pco.description && (
        <div className="mb-8">
          <Text tone="muted" className="mb-1 text-xs uppercase tracking-wider">
            Description
          </Text>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {pco.description}
          </p>
        </div>
      )}

      {/* Promoted CO banner */}
      {pco.promoted_co && (
        <div className="mb-8 rounded-lg border border-border bg-muted/30 px-5 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <Text className="text-sm font-medium">
              Promoted to CCO: {pco.promoted_co.change_order_number} —{" "}
              {pco.promoted_co.title}
            </Text>
            <StatusBadge status={pco.promoted_co.status} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line">
          <TabsTrigger value="line-items" data-testid="pco-tab-line-items">
            Line Items
          </TabsTrigger>
          <TabsTrigger value="source-ces" data-testid="pco-tab-source-ces">
            Source Change Events ({linkedCeCount})
          </TabsTrigger>
        </TabsList>

        <div className="pt-4">
          {/* Line Items tab */}
          <TabsContent value="line-items">
            <PcoLineItemsTable pco={pco} />
          </TabsContent>

          {/* Source Change Events tab */}
          <TabsContent value="source-ces">
            <PcoLinkedChangeEvents
              changeEvents={pco.linked_change_events}
              projectId={projectId}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Delete dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete PCO?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete PCO {pco.pco_number}. This action
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

      {/* Promote dialog */}
      <AlertDialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote to Change Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create an official Commitment Change Order (CCO) from PCO{" "}
              {pco.pco_number}. The CCO will be created with &quot;approved&quot;
              status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePromote}>
              Promote to CCO
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}

/* ── Line Items sub-component ─────────────────────────────────────── */

function PcoLineItemsTable({ pco }: { pco: CommitmentPcoDetail }) {
  // The detail API doesn't return line_items yet (table may not exist),
  // so we show an empty state or a basic table if data is present.
  const lineItems = (pco as any).line_items as
    | Array<{
        id: string;
        description: string;
        quantity: number;
        unit_of_measure: string;
        unit_cost: number;
        amount: number;
      }>
    | undefined;

  if (!lineItems || lineItems.length === 0) {
    return (
      <EmptyState
        icon={<FileText />}
        title="No line items"
        description="Line items for this PCO will appear here once added."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              Description
            </th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">
              Qty
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              UOM
            </th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">
              Unit Cost
            </th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item) => (
            <tr
              key={item.id}
              className="border-b border-border last:border-b-0"
            >
              <td className="px-3 py-2 text-foreground">
                {item.description || "--"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-foreground">
                {item.quantity}
              </td>
              <td className="px-3 py-2 text-foreground">
                {item.unit_of_measure || "--"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-foreground">
                {formatMoney(item.unit_cost)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-medium text-foreground">
                {formatMoney(item.amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border">
            <td
              colSpan={4}
              className="px-3 py-2 text-right font-medium text-foreground"
            >
              Total
            </td>
            <td className="px-3 py-2 text-right tabular-nums font-semibold text-foreground">
              {formatMoney(
                lineItems.reduce((sum, item) => sum + (item.amount ?? 0), 0),
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ── Linked Change Events sub-component ───────────────────────────── */

function PcoLinkedChangeEvents({
  changeEvents,
  projectId,
}: {
  changeEvents: CommitmentPcoDetail["linked_change_events"];
  projectId: number;
}) {
  const router = useRouter();

  if (!changeEvents || changeEvents.length === 0) {
    return (
      <EmptyState
        icon={<FileText />}
        title="No linked change events"
        description="Change events linked to this PCO will appear here."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              CE #
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              Title
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              Status
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              Type
            </th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">
              Revenue ROM
            </th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">
              Cost ROM
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              Linked
            </th>
          </tr>
        </thead>
        <tbody>
          {changeEvents.map((ce) => (
            <tr
              key={ce.id}
              className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
              onClick={() =>
                router.push(`/${projectId}/change-events/${ce.id}`)
              }
            >
              <td className="px-3 py-2 font-mono text-muted-foreground">
                {ce.number || `CE-${ce.id.slice(0, 8)}`}
              </td>
              <td className="px-3 py-2 font-medium text-foreground">
                {ce.title || "--"}
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={ce.status || "unknown"} />
              </td>
              <td className="px-3 py-2 text-foreground">{ce.type || "--"}</td>
              <td className="px-3 py-2 text-right tabular-nums text-foreground">
                {formatMoney(ce.total_revenue_rom)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-foreground">
                {formatMoney(ce.total_cost_rom)}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {ce.linked_at
                  ? new Date(ce.linked_at).toLocaleDateString()
                  : "--"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
