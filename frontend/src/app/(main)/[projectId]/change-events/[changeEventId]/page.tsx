"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  FileCheck2,
  FileText,
  Mail,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  XCircle,
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Inline } from "@/components/layout/inline";
import { Text } from "@/components/ds/text";
import { PageShell } from "@/components/layout";
import { PageTabs } from "@/components/layout/PageTabs";
import { StatusBadge, EmptyState } from "@/components/ds";
import { useProjectTitle } from "@/hooks/useProjectTitle";
import { apiFetch, apiFetchBlob } from "@/lib/api-client";

import { useChangeEventDetail } from "@/hooks/use-change-event-detail";
import { useVerticalMarkup } from "@/hooks/use-vertical-markup";
import { AddToCommitmentCODialog } from "@/components/domain/change-events/AddToCommitmentCODialog";
import { AddToPrimePCODialog } from "@/components/domain/change-events/AddToPrimePCODialog";
import { AddToBudgetChangeDialog } from "@/components/domain/change-events/AddToBudgetChangeDialog";
import { ChangeEventEmailDialog } from "@/components/domain/change-events/ChangeEventEmailDialog";
import { ChangeEventGeneralInfoPanel } from "@/components/domain/change-events/ChangeEventGeneralInfoPanel";
import { ChangeEventLineagePanel } from "@/components/domain/change-events/ChangeEventLineagePanel";
import { ChangeEventLineItemsTable } from "@/components/domain/change-events/ChangeEventLineItemsTable";
import { ChangeEventHistoryTab } from "@/components/domain/change-events/ChangeEventHistoryTab";
import { ChangeEventRelatedItemsTab } from "@/components/domain/change-events/ChangeEventRelatedItemsTab";
import { RelatedItemsPanel } from "@/components/domain/related-items/RelatedItemsPanel";
import { ChangeEventRfqsTab } from "@/components/domain/change-events/ChangeEventRfqsTab";
import { ChangeEventPrimePCOsSection } from "@/components/domain/change-events/ChangeEventPrimePCOsSection";
import { ChangeEventCommitmentPCOsSection } from "@/components/domain/change-events/ChangeEventCommitmentPCOsSection";
import { EntityComments } from "@/components/comments/entity-comments";
import { EntityRoom } from "@/components/comments/entity-room";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChangeEventRfqForm } from "@/components/domain/change-events/ChangeEventRfqForm";
import type { ChangeEventRfqFormValues } from "@/components/domain/change-events/ChangeEventRfqForm";
import { useDropdownData } from "@/components/domain/change-events/change-event-form/useDropdownData";
import type { ProjectEmail } from "@/hooks/use-emails";

/* ── Helpers ──────────────────────────────────────────────────────── */


function formatEmailDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ── Page component ──────────────────────────────────────────────── */

export default function ChangeEventDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams()! ?? new URLSearchParams();
  const params = useParams()! ?? {};
  const projectId = parseInt(params.projectId as string, 10);
  const changeEventId = params.changeEventId as string;

  const {
    changeEvent,
    lineItems,
    historyEntries,
    relatedItems,
    rfqCount,
    isLoading,
    error,
    actions,
  } = useChangeEventDetail(projectId, changeEventId);

  const [showRfqSheet, setShowRfqSheet] = useState(false);
  const [isCreatingRfq, setIsCreatingRfq] = useState(false);
  const [projectContacts, setProjectContacts] = useState<
    Array<{ id: string; name: string; email?: string }>
  >([]);
  const { contracts } = useDropdownData({ projectId });

  useEffect(() => {
    let isActive = true;
    const fetchProjectContacts = async () => {
      try {
        const contacts = await apiFetch<
          Array<{ id: string; name: string; email?: string | null }>
        >(`/api/projects/${projectId}/contacts`);
        if (!isActive) return;
        setProjectContacts(
          contacts.map((contact) => ({
            id: contact.id,
            name: contact.name,
            email: contact.email ?? undefined,
          })),
        );
      } catch {
        if (isActive) setProjectContacts([]);
      }
    };

    void fetchProjectContacts();
    return () => {
      isActive = false;
    };
  }, [projectId]);

  const rfqLineItems = useMemo(
    () =>
      lineItems.map((item) => {
        const commitmentNumber = item.commitment?.contract_number ?? "";
        const inferredCommitmentType = commitmentNumber
          .trim()
          .toLowerCase()
          .startsWith("po")
          ? "po"
          : "sub";
        const linkedCommitmentId =
          item.commitmentId
            ? `${item.commitmentType === "purchase_order" ? "po" : inferredCommitmentType}-${item.commitmentId}`
            : null;
        return {
          id: item.id,
          description: item.description,
          contractId:
            linkedCommitmentId ??
            (item.contractId != null ? String(item.contractId) : null),
        };
      }),
    [lineItems],
  );

  const handleSendRfq = useCallback(async (values: ChangeEventRfqFormValues) => {
    setIsCreatingRfq(true);
    try {
      const assignedLine = values.commitmentLines.find((line) => line.contractId);
      const assignedContract = assignedLine
        ? contracts.find((contract) => contract.id === assignedLine.contractId)
        : undefined;
      await apiFetch(`/api/projects/${projectId}/change-events/rfqs`, {
        method: "POST",
        body: JSON.stringify({
          changeEventId,
          title: values.title.trim() || undefined,
          dueDate: values.dueDate || undefined,
          includeAttachments: values.includeAttachments,
          notes: values.requestDetails.trim() || undefined,
          assignedCompanyId: assignedContract?.vendorId || undefined,
          assignedContactId: values.distributionPersonId || undefined,
        }),
      });
      toast.success("RFQ created");
      setShowRfqSheet(false);
      void actions.refetch();
    } catch (err) {
      toast.error("Failed to create RFQ");
    } finally {
      setIsCreatingRfq(false);
    }
  }, [projectId, changeEventId, actions, contracts]);

  const { markupRows } = useVerticalMarkup(projectId);

  const [activeTab, setActiveTab] = useState("general");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCommitmentCODialog, setShowCommitmentCODialog] = useState(false);
  const [showPrimePCODialog, setShowPrimePCODialog] = useState(false);
  const [showBudgetChangeDialog, setShowBudgetChangeDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  const [lineageCount, setLineageCount] = useState(0);
  const [lineageRefreshSignal, setLineageRefreshSignal] = useState(0);
  const [existingPrimePCOs, setExistingPrimePCOs] = useState<Array<{id: string; pco_number: string; title: string; status: string}>>([]);
  const [hasFetchedPCOs, setHasFetchedPCOs] = useState(false);
  const [changeEventEmails, setChangeEventEmails] = useState<ProjectEmail[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);

  const fetchChangeEventEmails = useCallback(async () => {
    setIsLoadingEmails(true);
    try {
      const emails = await apiFetch<ProjectEmail[]>(
        `/api/projects/${projectId}/emails?related_tool=change-event&related_id=${encodeURIComponent(changeEventId)}`,
        { cache: "no-store" as RequestCache },
      );
      setChangeEventEmails(emails);
    } catch {
      setChangeEventEmails([]);
    } finally {
      setIsLoadingEmails(false);
    }
  }, [projectId, changeEventId]);

  useEffect(() => {
    void fetchChangeEventEmails();
  }, [fetchChangeEventEmails]);

  const handleEmailDialogOpenChange = useCallback((open: boolean) => {
    setShowEmailDialog(open);
    if (!open) void fetchChangeEventEmails();
  }, [fetchChangeEventEmails]);

  const fetchLineageSummary = useCallback(async () => {
    const payload = await apiFetch<{ summary?: { count?: number } }>(
      `/api/projects/${projectId}/change-events/${changeEventId}/lineage`,
      { cache: "no-store" as RequestCache },
    );
    setLineageCount(Number(payload.summary?.count ?? 0));
  }, [projectId, changeEventId]);

  const refreshLineage = useCallback(async () => {
    try {
      await fetchLineageSummary();
    } catch {
      setLineageCount(0);
    } finally {
      setLineageRefreshSignal((prev) => prev + 1);
    }
  }, [fetchLineageSummary]);

  useEffect(() => {
    void refreshLineage();
  }, [refreshLineage]);

  const fetchExistingPCOs = useCallback(async () => {
    if (hasFetchedPCOs) return;
    try {
      const pcos = await apiFetch<Array<{id: string; pco_number: string; title: string; status: string}>>(
        `/api/projects/${projectId}/prime-contract-pcos`,
      );
      // Show all non-void PCOs — server validates if the action is allowed
      setExistingPrimePCOs(pcos.filter((p) => p.status !== "void"));
    } catch (err) {
      toast.error("Could not load existing PCOs");
    } finally {
      setHasFetchedPCOs(true);
    }
  }, [projectId, hasFetchedPCOs]);

  const handleAddToExistingPCO = useCallback(async (pcoId: string, pcoLabel: string) => {
    try {
      await apiFetch(
        `/api/projects/${projectId}/change-events/add-to-pco`,
        {
          method: "POST",
          body: JSON.stringify({
            change_event_ids: [changeEventId],
            pco_type: "prime",
            existing_pco_id: pcoId,
          }),
        },
      );
      toast.success(`Added to ${pcoLabel}`);
      void refreshLineage();
    } catch (err) {
      toast.error("Failed to add to PCO");
    }
  }, [projectId, changeEventId, refreshLineage]);

  useEffect(() => {
    const onFocus = () => {
      void refreshLineage();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshLineage();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshLineage]);


  useProjectTitle(
    changeEvent
      ? `${changeEvent.number || `CE-${changeEvent.id}`} - ${changeEvent.title}`
      : "Loading...",
  );

  const canEdit = true;

  const normalizedStatus = (changeEvent?.status || "").toLowerCase().replace(/\s+/g, "_");

  // Auto-scroll to general tab from ?edit=1
  useEffect(() => {
    if (searchParams.get("edit") === "1") {
      setActiveTab("general");
    }
  }, [searchParams]);

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

  const handleExportPDF = useCallback(async () => {
    if (!changeEvent) return;
    try {
      toast.loading("Generating PDF...", { id: "pdf-export" });
      const blob = await apiFetchBlob(
        `/api/projects/${projectId}/change-events/${changeEventId}/pdf`,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `change-event-${changeEvent.number || changeEvent.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded", { id: "pdf-export" });
    } catch (error) {
      toast.error("Failed to generate PDF", {
        id: "pdf-export",
      });
    }
  }, [changeEvent, projectId, changeEventId]);


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

  /* ── Header actions ─────────────────────────────────────────────── */

  const ceNumber = changeEvent.number || `CE-${changeEvent.id}`;
  const ceTitle = `Change Event #${ceNumber}: ${changeEvent.title || "Untitled"}`;
  const primeContractDisplayName =
    (changeEvent.primeContract as { display_name?: string } | null)?.display_name ||
    changeEvent.primeContract?.title ||
    changeEvent.primeContract?.contract_number ||
    null;

  const headerActions = (
    <Inline gap="sm">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowPrimePCODialog(true)}
        disabled={!canEdit}
      >
        Create Prime PCO
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/${projectId}/change-events/${changeEventId}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Change Event
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Status actions */}
          {normalizedStatus === "open" && (
            <DropdownMenuItem
              onClick={() => actions.updateStatus("pending_approval")}
              data-testid="change-event-submit-approval"
            >
              <FileCheck2 className="mr-2 h-4 w-4" />
              Submit for Approval
            </DropdownMenuItem>
          )}
          {(normalizedStatus === "pending_approval" ||
            normalizedStatus === "pending") && (
            <>
              <DropdownMenuItem onClick={() => actions.updateStatus("approved")}>
                <Check className="mr-2 h-4 w-4" />
                Approve
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.updateStatus("rejected")}>
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </DropdownMenuItem>
            </>
          )}
          {normalizedStatus !== "closed" && normalizedStatus !== "converted" && (
            <DropdownMenuItem onClick={() => actions.updateStatus("closed")}>
              <X className="mr-2 h-4 w-4" />
              Close
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportPDF}>
            <FileText className="mr-2 h-4 w-4" />
            Export as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowEmailDialog(true)}>
            <Mail className="mr-2 h-4 w-4" />
            Email Change Event
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyId}>
            <Copy className="mr-2 h-4 w-4" />
            Copy ID
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              try {
                toast.loading("Cloning change event...", { id: "clone-ce" });
                const cloned = await apiFetch<{ data?: { id?: string }; id?: string }>(
                  `/api/projects/${projectId}/change-events`,
                  {
                    method: "POST",
                    body: JSON.stringify({
                      title: `${changeEvent.title} (Copy)`,
                      type: changeEvent.type,
                      scope: changeEvent.scope,
                      reason: changeEvent.reason,
                      origin: changeEvent.origin,
                      description: changeEvent.description,
                      expecting_revenue: changeEvent.expecting_revenue,
                    }),
                  },
                );
                const newId = cloned?.data?.id ?? cloned?.id;
                toast.success("Change event cloned", { id: "clone-ce" });
                if (newId) {
                  router.push(`/${projectId}/change-events/${newId}`);
                }
              } catch (err) {
                toast.error(
                  "Failed to clone",
                  { id: "clone-ce" },
);
              }
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            Clone
          </DropdownMenuItem>
          {normalizedStatus !== "void" && normalizedStatus !== "converted" && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowRight className="mr-2 h-4 w-4" />
                Add to
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Add to Commitment</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onSelect={() => router.push(`/${projectId}/commitments/new?type=purchase_order&changeEventId=${changeEventId}`)}>
                      New Purchase Order
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push(`/${projectId}/commitments/new?type=subcontract&changeEventId=${changeEventId}`)}>
                      New Subcontract
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onSelect={() => setShowCommitmentCODialog(true)}>
                  Add to Commitment Change Order
                </DropdownMenuItem>
                <DropdownMenuSub onOpenChange={(open) => { if (open) void fetchExistingPCOs(); }}>
                  <DropdownMenuSubTrigger>Add to Prime Contract PCO</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onSelect={() => setShowPrimePCODialog(true)}>
                      New Prime Contract PCO
                    </DropdownMenuItem>
                    {existingPrimePCOs.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        {existingPrimePCOs.map((pco) => (
                          <DropdownMenuItem
                            key={pco.id}
                            onSelect={() => void handleAddToExistingPCO(pco.id, `${pco.pco_number} – ${pco.title}`)}
                          >
                            {pco.pco_number} – {pco.title}
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onSelect={() => setShowBudgetChangeDialog(true)}>
                  Add to Budget Change
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
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
      actions={headerActions}
      onBack={handleBack}
    >
      <PageTabs
        variant="inline"
        tabs={[
          { label: "General", href: "general", isActive: activeTab === "general", testId: "change-event-tab-general" },
          { label: `Lineage (${lineageCount})`, href: "lineage", isActive: activeTab === "lineage" },
          { label: `RFQs (${rfqCount})`, href: "rfqs", isActive: activeTab === "rfqs" },
          { label: `Related Items (${relatedItems.length})`, href: "related-items", isActive: activeTab === "related-items" },
          { label: "Comments (0)", href: "comments", isActive: activeTab === "comments" },
          { label: `Emails (${changeEventEmails.length})`, href: "emails", isActive: activeTab === "emails" },
          { label: `Change History (${historyEntries.length})`, href: "history", isActive: activeTab === "history", testId: "change-event-tab-history" },
        ]}
        onTabClick={(href) => setActiveTab(href)}
      />

      <div className="pt-2">
        {activeTab === "general" && (
          <>
            <ChangeEventGeneralInfoPanel
              changeEvent={changeEvent}
              projectId={projectId}
              onFieldSaved={() => void actions.refetch()}
            />
            <div className="mt-10 -mr-4 sm:-mr-6 lg:-mr-8">
              <ChangeEventLineItemsTable
                projectId={projectId}
                changeEventId={changeEventId}
                lineItems={lineItems}
                markupRows={markupRows}
                expectingRevenue={(changeEvent.expectingRevenue ?? changeEvent.expecting_revenue) !== false}
                primeContractDisplayName={primeContractDisplayName}
                onDeleteLineItem={actions.deleteLineItem}
                onLineItemsChange={() => void actions.refetch()}
              />
            </div>
            <div className="mt-10">
              <ChangeEventPrimePCOsSection
                projectId={projectId}
                changeEventId={changeEventId}
              />
            </div>
            <div className="mt-10">
              <ChangeEventCommitmentPCOsSection
                projectId={projectId}
                changeEventId={changeEventId}
              />
            </div>
          </>
        )}

        {activeTab === "lineage" && (
          <ChangeEventLineagePanel
            projectId={projectId}
            changeEventId={changeEventId}
            refreshSignal={lineageRefreshSignal}
          />
        )}

        {activeTab === "rfqs" && (
          <ChangeEventRfqsTab
            projectId={projectId}
            changeEventId={changeEventId}
            lineItems={lineItems.map((item) => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
            }))}
            onSendRfq={() => setShowRfqSheet(true)}
            onResponseRecorded={() => void actions.refetch()}
          />
        )}

        {activeTab === "related-items" && (
          <div className="space-y-6">
            <RelatedItemsPanel
              entityType="change_event"
              entityId={changeEventId}
              projectId={projectId}
            />
            <ChangeEventRelatedItemsTab
              relatedItems={relatedItems}
              isLoading={false}
              onFetchOptions={actions.fetchRelatedItemOptions}
              onLink={actions.linkRelatedItem}
              onUnlink={actions.unlinkRelatedItem}
            />
          </div>
        )}

        {activeTab === "comments" && (
          <EntityRoom
            entityType="change-event"
            entityId={changeEventId}
            projectId={projectId}
          >
            <EntityComments title="Comments" />
          </EntityRoom>
        )}

        {activeTab === "emails" && (
          isLoadingEmails ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : changeEventEmails.length === 0 ? (
            <EmptyState
              icon={<Mail />}
              title="No emails"
              description="Emails related to this change event will appear here."
            />
          ) : (
            <div className="divide-y rounded-md border">
              {changeEventEmails.map((email) => (
                <div key={email.id} className="grid gap-2 p-4 md:grid-cols-[1fr_auto] md:items-start">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Text weight="medium">{email.subject}</Text>
                      <StatusBadge status={email.status} />
                      {email.has_attachments ? (
                        <span className="text-xs text-muted-foreground">Attachment</span>
                      ) : null}
                    </div>
                    <Text size="sm" tone="muted">
                      To {(email.to_list ?? []).join(", ") || "-"}
                    </Text>
                    <Text size="sm" tone="muted">
                      From {email.from_email || email.from_name || "-"}
                    </Text>
                  </div>
                  <Text size="sm" tone="muted">
                    {formatEmailDate(email.sent_at ?? email.created_at)}
                  </Text>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === "history" && (
          <ChangeEventHistoryTab entries={historyEntries} isLoading={false} />
        )}
      </div>

      {/* Dialogs */}
      <ChangeEventEmailDialog
        open={showEmailDialog}
        onOpenChange={handleEmailDialogOpenChange}
        changeEventTitle={changeEvent.title || "Untitled"}
        changeEventNumber={ceNumber}
        projectId={projectId}
        changeEventId={changeEventId}
      />

      <AddToCommitmentCODialog
        open={showCommitmentCODialog}
        onClose={() => setShowCommitmentCODialog(false)}
        selectedChangeEventIds={[changeEventId]}
        projectId={projectId}
        onSuccess={() => {
          setShowCommitmentCODialog(false);
          void refreshLineage();
        }}
      />

      <AddToPrimePCODialog
        open={showPrimePCODialog}
        onClose={() => setShowPrimePCODialog(false)}
        selectedChangeEventIds={[changeEventId]}
        projectId={projectId}
        onSuccess={() => {
          setShowPrimePCODialog(false);
          void refreshLineage();
        }}
      />

      <AddToBudgetChangeDialog
        open={showBudgetChangeDialog}
        onClose={() => setShowBudgetChangeDialog(false)}
        selectedChangeEventIds={[changeEventId]}
        projectId={projectId}
        onSuccess={() => {
          setShowBudgetChangeDialog(false);
          void refreshLineage();
        }}
      />

      <Sheet open={showRfqSheet} onOpenChange={setShowRfqSheet}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Send Request for Quote</SheetTitle>
          </SheetHeader>
          <div className="px-8 pb-8">
            {changeEvent && (
              <ChangeEventRfqForm
                changeEvent={changeEvent}
                lineItems={rfqLineItems}
                contracts={contracts}
                projectUsers={projectContacts}
                isSubmitting={isCreatingRfq}
                onSubmit={handleSendRfq}
                onCancel={() => setShowRfqSheet(false)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

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
