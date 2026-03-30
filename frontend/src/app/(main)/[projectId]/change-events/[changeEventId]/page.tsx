"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Download,
  Mail,
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
import { Inline } from "@/components/ui/inline";
import { Text } from "@/components/ui/text";
import { PageShell } from "@/components/layout";
import { StatusBadge, EmptyState } from "@/components/ds";
import { useProjectTitle } from "@/hooks/useProjectTitle";
import type { ChangeEventFormData } from "@/components/domain/change-events/ChangeEventForm";

import { useChangeEventDetail } from "@/hooks/use-change-event-detail";
import { useVerticalMarkup } from "@/hooks/use-vertical-markup";
import { ChangeEventConvertDialog } from "@/components/domain/change-events/ChangeEventConvertDialog";
import { ChangeEventForm } from "@/components/domain/change-events/ChangeEventForm";
import { ChangeEventStatusActions } from "@/components/domain/change-events/ChangeEventStatusActions";
import { ChangeEventGeneralInfoPanel } from "@/components/domain/change-events/ChangeEventGeneralInfoPanel";
import { ChangeEventLineItemsTable } from "@/components/domain/change-events/ChangeEventLineItemsTable";
import { ChangeEventHistoryTab } from "@/components/domain/change-events/ChangeEventHistoryTab";
import { ChangeEventRelatedItemsTab } from "@/components/domain/change-events/ChangeEventRelatedItemsTab";
import { ChangeEventPrimeContractCOsTab } from "@/components/domain/change-events/ChangeEventPrimeContractCOsTab";
import { EntityComments, EntityRoom } from "@/components/comments/entity-comments";

/* ── Helpers ──────────────────────────────────────────────────────── */

function mapApiStatusToFormStatus(status?: string | null): string {
  if (!status) return "open";
  const s = status.toLowerCase();
  if (s === "closed") return "close";
  if (s === "pending approval" || s === "pending_approval") return "pending";
  if (s === "open") return "open";
  if (s === "void") return "void";
  return status;
}

/* ── Page component ──────────────────────────────────────────────── */

export default function ChangeEventDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const projectId = parseInt(params.projectId as string, 10);
  const changeEventId = params.changeEventId as string;

  const {
    changeEvent,
    lineItems,
    attachments,
    historyEntries,
    relatedItems,
    isLoading,
    error,
    actions,
  } = useChangeEventDetail(projectId, changeEventId);

  const { markupRows } = useVerticalMarkup(projectId);

  const [activeTab, setActiveTab] = useState("general");
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);

  useProjectTitle(
    changeEvent
      ? `${changeEvent.number || `CE-${changeEvent.id}`} - ${changeEvent.title}`
      : "Loading...",
  );

  const canEdit = ["open", "rejected"].includes(
    (changeEvent?.status || "").toLowerCase(),
  );

  // Auto-enter edit mode from ?edit=1
  useEffect(() => {
    if (searchParams.get("edit") === "1" && canEdit) {
      setActiveTab("general");
      setIsEditing(true);
    }
  }, [searchParams, canEdit]);

  /* ── Navigation ─────────────────────────────────────────────────── */

  const handleBack = useCallback(() => {
    router.push(`/${projectId}/change-events`);
  }, [router, projectId]);

  /* ── Actions ────────────────────────────────────────────────────── */

  const handleDelete = useCallback(async () => {
    await actions.deleteChangeEvent();
    setShowDeleteDialog(false);
    router.push(`/${projectId}/change-events`);
  }, [actions, router, projectId]);

  const handleExport = useCallback(() => {
    if (!changeEvent) return;
    const rows = [
      ["Field", "Value"],
      ["Number", changeEvent.number || ""],
      ["Title", changeEvent.title || ""],
      ["Status", changeEvent.status || ""],
      ["Type", changeEvent.type || ""],
      ["Scope", changeEvent.scope || ""],
      ["Origin", changeEvent.origin || ""],
      ["Change Reason", changeEvent.reason || ""],
      ["Description", (changeEvent.description || "").replace(/\n/g, " ")],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `change-event-${changeEvent.number || changeEvent.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported change event");
  }, [changeEvent]);

  const handleCopyId = useCallback(() => {
    navigator.clipboard.writeText(changeEventId);
    toast.success("Change event ID copied");
  }, [changeEventId]);

  const handleEditSubmit = useCallback(
    async (data: ChangeEventFormData) => {
      await actions.submitEdit(data);
      setIsEditing(false);
    },
    [actions],
  );

  /* ── Edit mode initial data ─────────────────────────────────────── */

  const initialEditData = useMemo<Partial<ChangeEventFormData> | null>(() => {
    if (!changeEvent) return null;
    return {
      number: changeEvent.number || "",
      contractNumber: changeEvent.number || "",
      title: changeEvent.title || "",
      status: mapApiStatusToFormStatus(changeEvent.status),
      origin: changeEvent.origin || undefined,
      type: changeEvent.type || undefined,
      changeReason: changeEvent.reason || undefined,
      scope: changeEvent.scope || undefined,
      lineItemRevenueSource:
        changeEvent.lineItemRevenueSource || changeEvent.line_item_revenue_source || "",
      primeContractId:
        changeEvent.primeContractId || changeEvent.prime_contract_id || "",
      description: changeEvent.description || undefined,
      attachments: [],
      lineItems:
        lineItems.length > 0
          ? lineItems.map((item, index) => ({
              id: item.id || undefined,
              budgetCode: item.projectBudgetCodeId || item.budgetCodeId || "",
              description: item.description || "",
              vendor:
                item.formVendorId ||
                item.vendorId ||
                (typeof item.vendor === "string" ? item.vendor : item.vendor?.id) ||
                "",
              contract:
                item.commitmentId && item.commitmentType
                  ? `${item.commitmentType === "purchase_order" ? "po" : "sub"}-${item.commitmentId}`
                  : item.contractId?.toString() || "",
              commitmentLineItemId: item.commitmentLineItemId || "",
              revenueUnitOfMeasure: item.unitOfMeasure || "",
              revenueQuantity: Number(item.quantity || 1) || 1,
              revenueUnitCost: Number(item.unitCost || 0) || 0,
              revenueRom: Number(item.revenueRom || 0) || 0,
              costQuantity: Number(item.quantity || 1) || 1,
              costUnitCost: Number(item.unitCost || 0) || 0,
              costRom: Number(item.costRom || 0) || 0,
              nonCommittedCost: Number(item.nonCommittedCost || 0) || 0,
            }))
          : [],
    };
  }, [changeEvent, lineItems]);

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

  if (error || !changeEvent) {
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
        <Text tone="destructive">{error || "Change event not found"}</Text>
      </PageShell>
    );
  }

  /* ── Edit mode ──────────────────────────────────────────────────── */

  if (isEditing && initialEditData) {
    return (
      <PageShell
        variant="dashboard"
        title={`Edit ${changeEvent.title}`}
        statusBadge={<StatusBadge status={changeEvent.status ?? "Open"} />}
        actions={
          <Inline gap="sm">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              Cancel Edit
            </Button>
          </Inline>
        }
      >
        <ChangeEventForm
          initialData={initialEditData}
          onSubmit={handleEditSubmit}
          onCancel={() => setIsEditing(false)}
          mode="edit"
          projectId={projectId}
        />
      </PageShell>
    );
  }

  /* ── Header actions ─────────────────────────────────────────────── */

  const ceNumber = changeEvent.number || `CE-${changeEvent.id}`;
  const ceTitle = `Change Event #${ceNumber}: ${changeEvent.title || "Untitled"}`;

  const headerActions = (
    <Inline gap="sm">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setActiveTab("general");
          setIsEditing(true);
        }}
        disabled={!canEdit}
      >
        Edit
      </Button>
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
          {changeEvent.status?.toLowerCase() === "approved" && (
            <DropdownMenuItem onClick={() => setShowConvertDialog(true)}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Convert to Change Order
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Inline>
  );

  /* ── Main render ────────────────────────────────────────────────── */

  return (
    <PageShell
      variant="dashboard"
      title={ceTitle}
      statusBadge={<StatusBadge status={changeEvent.status ?? "Open"} />}
      actions={headerActions}
      onBack={handleBack}
    >
      <ChangeEventStatusActions
        status={changeEvent.status}
        onStatusChange={actions.updateStatus}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line">
          <TabsTrigger value="general" data-testid="change-event-tab-general">
            General
          </TabsTrigger>
          <TabsTrigger value="prime-contract-cos">
            Prime Contract Change Orders
          </TabsTrigger>
          <TabsTrigger value="related-items">
            Related Items ({relatedItems.length})
          </TabsTrigger>
          <TabsTrigger value="comments">Comments (0)</TabsTrigger>
          <TabsTrigger value="emails">Emails (0)</TabsTrigger>
          <TabsTrigger value="history" data-testid="change-event-tab-history">
            Change History ({historyEntries.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <ChangeEventGeneralInfoPanel
            changeEvent={changeEvent}
            attachments={attachments}
            projectId={projectId}
          />
          <div className="mt-8">
            <ChangeEventLineItemsTable
              lineItems={lineItems}
              markupRows={markupRows}
              expectingRevenue={changeEvent.expecting_revenue !== false}
            />
          </div>
        </TabsContent>

        <TabsContent value="prime-contract-cos">
          <ChangeEventPrimeContractCOsTab
            changeEventId={changeEventId}
            projectId={projectId}
          />
        </TabsContent>

        <TabsContent value="related-items">
          <ChangeEventRelatedItemsTab
            relatedItems={relatedItems}
            isLoading={false}
            onFetchOptions={actions.fetchRelatedItemOptions}
            onLink={actions.linkRelatedItem}
            onUnlink={actions.unlinkRelatedItem}
          />
        </TabsContent>

        <TabsContent value="comments">
          <EntityRoom entityType="change-event" entityId={changeEventId}>
            <EntityComments title="Comments" />
          </EntityRoom>
        </TabsContent>

        <TabsContent value="emails">
          <EmptyState
            icon={<Mail />}
            title="No emails"
            description="Emails related to this change event will appear here."
          />
        </TabsContent>

        <TabsContent value="history">
          <ChangeEventHistoryTab entries={historyEntries} isLoading={false} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {showConvertDialog && (
        <ChangeEventConvertDialog
          changeEvent={changeEvent}
          projectId={projectId}
          onClose={() => setShowConvertDialog(false)}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete change event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete change event #{ceNumber}. This action
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
    </PageShell>
  );
}
