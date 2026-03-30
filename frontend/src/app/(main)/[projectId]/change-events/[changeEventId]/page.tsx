"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Copy,
  Download,
  FileCheck2,
  FileText,
  Link2,
  MessageSquare,
  Mail,
  MoreHorizontal,
  Paperclip,
  Search,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Stack } from "@/components/ui/stack";
import { Inline } from "@/components/ui/inline";
import { Text } from "@/components/ui/text";
import { PageShell } from "@/components/layout";
import { StatusBadge, SectionHeader, EmptyState } from "@/components/ds";
import { useProjectTitle } from "@/hooks/useProjectTitle";
import { formatCurrency } from "@/config/tables";
import { formatDate } from "@/lib/table-config/formatters";
import type { ChangeEvent } from "@/types/financial";

import { ChangeEventApprovalWorkflow } from "@/components/domain/change-events/ChangeEventApprovalWorkflow";
import { ChangeEventConvertDialog } from "@/components/domain/change-events/ChangeEventConvertDialog";
import { ChangeEventAttachmentsSection } from "@/components/domain/change-events/ChangeEventAttachmentsSection";
import { EntityComments, EntityRoom } from "@/components/comments/entity-comments";
import {
  ChangeEventForm,
  type ChangeEventFormData,
} from "@/components/domain/change-events/ChangeEventForm";
import { ChangeEventLineItemsGrid } from "@/components/domain/change-events/ChangeEventLineItemsGrid";
import { ChangeEventRfqForm } from "@/components/domain/change-events/ChangeEventRfqForm";
import { useProjectChangeEventRfqs } from "@/hooks/use-change-event-rfqs";
import { useVerticalMarkup } from "@/hooks/use-vertical-markup";

/* ── Types ────────────────────────────────────────────────────────── */

interface LineItem {
  id: string;
  description: string | null;
  unitOfMeasure: string | null;
  quantity: number | null;
  unitCost: number | null;
  costRom: number | null;
  revenueRom: number | null;
  nonCommittedCost: number | null;
  changeEventId: string;
  extendedAmount: number;
  sortOrder: number;
  contractId?: number | string | null;
  vendorId?: string | null;
  vendor?: { id: string; name: string } | null;
  budgetCodeId?: string | null;
  budgetLine?: {
    id: string;
    description: string | null;
    cost_code?: {
      id: string;
      title: string | null;
      division_id?: string | null;
      division_title?: string | null;
    } | null;
  } | null;
}

interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: unknown;
  downloadUrl: string;
}

interface HistoryEntry {
  id: string;
  changeEventId?: string;
  action: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string | { id: string; email: string } | null;
  changedAt: string;
  description?: string;
}

interface RelatedItem {
  id: string;
  relatedType: string;
  relatedId: string;
  relatedNumber: string | null;
  relatedTitle: string;
  relatedStatus: string | null;
  relatedUrl: string;
  createdAt: string;
}

interface RelatedItemOption {
  id: string;
  relatedNumber: string | null;
  relatedTitle: string;
  relatedStatus: string | null;
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function formatBudgetCode(li: LineItem): string {
  if (!li.budgetLine) return "--";
  const cc = li.budgetLine.cost_code;
  if (cc?.title) {
    return cc.division_title ? `${cc.division_title} - ${cc.title}` : cc.title;
  }
  return li.budgetLine.description || "--";
}

function computeLatestPrice(li: LineItem): number {
  return li.revenueRom ?? 0;
}

function computeLatestCost(li: LineItem): number {
  if (li.nonCommittedCost != null && li.nonCommittedCost !== 0)
    return li.nonCommittedCost;
  return li.costRom ?? 0;
}

const RELATED_ITEM_TYPE_OPTIONS = [
  { value: "change_event", label: "Change Events" },
  { value: "rfi", label: "RFIs" },
  { value: "submittal", label: "Submittals" },
  { value: "drawing", label: "Drawings" },
  { value: "specification", label: "Specifications" },
] as const;

function formatRelatedTypeLabel(type: string): string {
  const match = RELATED_ITEM_TYPE_OPTIONS.find((option) => option.value === type);
  if (match) return match.label.replace(/s$/, "");
  return type.replace(/_/g, " ");
}

/* ── Component ────────────────────────────────────────────────────── */

export default function ChangeEventDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const projectId = parseInt(params.projectId as string, 10);
  const changeEventId = params.changeEventId as string;

  const [changeEvent, setChangeEvent] = useState<ChangeEvent | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [showRfqForm, setShowRfqForm] = useState(false);
  const [isCreatingRfq, setIsCreatingRfq] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([]);
  const [isRelatedItemsLoading, setIsRelatedItemsLoading] = useState(false);
  const [showLinkRelatedItemDialog, setShowLinkRelatedItemDialog] =
    useState(false);
  const [linkRelatedType, setLinkRelatedType] = useState<string>(
    RELATED_ITEM_TYPE_OPTIONS[0].value,
  );
  const [linkSearch, setLinkSearch] = useState("");
  const [relatedItemOptions, setRelatedItemOptions] = useState<
    RelatedItemOption[]
  >([]);
  const [selectedRelatedItemId, setSelectedRelatedItemId] = useState("");
  const [isLinkingRelatedItem, setIsLinkingRelatedItem] = useState(false);

  const { rfqs, createRfq } = useProjectChangeEventRfqs(projectId);
  const { markupRows } = useVerticalMarkup(projectId);

  useProjectTitle(
    changeEvent
      ? `${changeEvent.number || `CE-${changeEvent.id}`} - ${changeEvent.title}`
      : "Loading...",
  );

  // ── Data fetching ──────────────────────────────────────────────────
  const fetchChangeEventDetails = useCallback(async () => {
    if (!projectId || !changeEventId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/change-events/${changeEventId}`,
      );
      if (!response.ok) {
        if (response.status === 404) throw new Error("Change event not found");
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.details || payload.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const eventData = await response.json();
      const event = eventData.data || eventData;
      setChangeEvent(event);

      if (event.lineItems && Array.isArray(event.lineItems)) {
        setLineItems(event.lineItems);
      } else {
        try {
          const lineItemsResponse = await fetch(
            `/api/projects/${projectId}/change-events/${changeEventId}/line-items`,
          );
          if (lineItemsResponse.ok) {
            const lineItemsData = await lineItemsResponse.json();
            setLineItems(lineItemsData.data || lineItemsData || []);
          }
        } catch {
          // Line items fetch failed silently
        }
      }

      if (event.history && Array.isArray(event.history)) {
        const mapped = event.history.map((h: any) => ({
          id: h.id,
          fieldName: h.fieldName || h.field_name || "",
          oldValue: h.oldValue || h.old_value || null,
          newValue: h.newValue || h.new_value || null,
          action: (h.changeType || h.change_type || "UPDATE").toUpperCase(),
          changedBy: h.changedBy || h.changed_by || null,
          changedAt: h.changedAt || h.changed_at || "",
          description:
            h.description ||
            `${(h.changeType || h.change_type || "update").toUpperCase()} ${h.fieldName || h.field_name || "record"}`,
        }));
        setHistoryEntries(mapped);
      }

      if (event.attachments && Array.isArray(event.attachments)) {
        setAttachments(event.attachments);
      } else {
        try {
          const attachmentsResponse = await fetch(
            `/api/projects/${projectId}/change-events/${changeEventId}/attachments`,
          );
          if (attachmentsResponse.ok) {
            const attachmentsData = await attachmentsResponse.json();
            setAttachments(attachmentsData.data || attachmentsData || []);
          }
        } catch {
          // Attachments fetch failed silently
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load change event",
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId, changeEventId]);

  const fetchRelatedItems = useCallback(async () => {
    if (!projectId || !changeEventId) return;

    setIsRelatedItemsLoading(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/change-events/${changeEventId}/related-items`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        const payload = await response
          .json()
          .catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
        const msg = payload.details || payload.error || `HTTP ${response.status}`;
        throw new Error(msg);
      }

      const payload = await response.json();
      setRelatedItems(payload.data || []);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load related items",
        { description: "Related items could not be loaded" },
      );
      setRelatedItems([]);
    } finally {
      setIsRelatedItemsLoading(false);
    }
  }, [projectId, changeEventId]);

  const fetchRelatedItemOptions = useCallback(async () => {
    if (!projectId || !changeEventId || !showLinkRelatedItemDialog) return;

    try {
      const searchParams = new URLSearchParams();
      searchParams.set("type", linkRelatedType);
      if (linkSearch.trim()) {
        searchParams.set("search", linkSearch.trim());
      }

      const response = await fetch(
        `/api/projects/${projectId}/change-events/${changeEventId}/related-items/options?${searchParams.toString()}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        const payload = await response
          .json()
          .catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
        const msg = payload.details || payload.error || `HTTP ${response.status}`;
        throw new Error(msg);
      }

      const payload = await response.json();
      setRelatedItemOptions(payload.data || []);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load linkable items",
      );
      setRelatedItemOptions([]);
    }
  }, [projectId, changeEventId, showLinkRelatedItemDialog, linkRelatedType, linkSearch]);

  const handleLinkRelatedItem = useCallback(async () => {
    if (!selectedRelatedItemId) {
      toast.error("Select an item to link");
      return;
    }

    setIsLinkingRelatedItem(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/change-events/${changeEventId}/related-items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            relatedType: linkRelatedType,
            relatedId: selectedRelatedItemId,
          }),
        },
      );

      if (!response.ok) {
        const payload = await response
          .json()
          .catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
        const msg = payload.details || payload.error || `HTTP ${response.status}`;
        throw new Error(msg);
      }

      toast.success("Related item linked");
      setShowLinkRelatedItemDialog(false);
      setSelectedRelatedItemId("");
      setLinkSearch("");
      await fetchRelatedItems();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to link related item",
      );
    } finally {
      setIsLinkingRelatedItem(false);
    }
  }, [
    projectId,
    changeEventId,
    linkRelatedType,
    selectedRelatedItemId,
    fetchRelatedItems,
  ]);

  const handleUnlinkRelatedItem = useCallback(
    async (relatedItemId: string) => {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/change-events/${changeEventId}/related-items/${relatedItemId}`,
          { method: "DELETE" },
        );

        if (!response.ok) {
          const payload = await response
            .json()
            .catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
          const msg = payload.details || payload.error || `HTTP ${response.status}`;
          throw new Error(msg);
        }

        toast.success("Related item removed");
        setRelatedItems((current) =>
          current.filter((item) => item.id !== relatedItemId),
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to unlink related item",
        );
      }
    },
    [projectId, changeEventId],
  );

  useEffect(() => {
    fetchChangeEventDetails();
  }, [fetchChangeEventDetails]);

  useEffect(() => {
    fetchRelatedItems();
  }, [fetchRelatedItems]);

  useEffect(() => {
    fetchRelatedItemOptions();
  }, [fetchRelatedItemOptions]);

  useEffect(() => {
    if (!showLinkRelatedItemDialog) {
      setSelectedRelatedItemId("");
      setRelatedItemOptions([]);
      setLinkSearch("");
      return;
    }
    setSelectedRelatedItemId("");
  }, [showLinkRelatedItemDialog, linkRelatedType]);

  // ── Action handlers ────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    router.push(`/${projectId}/change-events`);
  }, [router, projectId]);

  const handleEdit = useCallback(() => {
    setActiveTab("general");
    setIsEditing(true);
  }, []);

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

  const handleDelete = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/change-events/${changeEventId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }));
        throw new Error(payload.details || payload.error || `HTTP ${res.status}`);
      }
      toast.success("Change event deleted");
      router.push(`/${projectId}/change-events`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete change event",
      );
    } finally {
      setShowDeleteDialog(false);
    }
  }, [projectId, changeEventId, router]);

  const canEdit = ["open", "rejected"].includes(
    (changeEvent?.status || "").toLowerCase(),
  );

  useEffect(() => {
    if (searchParams.get("edit") === "1" && canEdit) {
      setActiveTab("general");
      setIsEditing(true);
    }
  }, [searchParams, canEdit]);

  // ── Status helpers ─────────────────────────────────────────────────
  const mapFormStatusToApiStatus = useCallback((status: string) => {
    if (status === "close") return "Closed";
    if (status === "pending") return "Pending Approval";
    if (status === "open") return "Open";
    if (status === "void") return "Void";
    return status;
  }, []);

  const mapApiStatusToFormStatus = useCallback((status?: string | null) => {
    if (!status) return "open";
    const s = status.toLowerCase();
    if (s === "closed") return "close";
    if (s === "pending approval" || s === "pending_approval") return "pending";
    if (s === "open") return "open";
    if (s === "void") return "void";
    return status;
  }, []);

  const normaliseStatus = useCallback((status: string): string => {
    const map: Record<string, string> = {
      open: "Open",
      closed: "Closed",
      void: "Void",
      pending: "Pending",
      pending_approval: "Pending Approval",
      approved: "Approved",
      rejected: "Rejected",
      converted: "Converted",
    };
    return map[status.toLowerCase()] ?? status;
  }, []);

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      if (!changeEvent) return;
      const normalisedStatus = normaliseStatus(newStatus);
      try {
        const response = await fetch(
          `/api/projects/${projectId}/change-events/${changeEventId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project_id: projectId,
              title: changeEvent.title,
              status: normalisedStatus,
            }),
          },
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
          throw new Error(payload.details || payload.error || `HTTP ${response.status}`);
        }
        const updatedEvent = await response.json();
        setChangeEvent(updatedEvent.data || updatedEvent);
        toast.success(`Status updated to ${normalisedStatus}`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update status",
        );
      }
    },
    [changeEvent, projectId, changeEventId, normaliseStatus],
  );

  const handleClose = useCallback(() => {
    handleStatusChange("closed");
  }, [handleStatusChange]);

  const handleInlineEditSubmit = useCallback(
    async (data: ChangeEventFormData) => {
      if (!changeEvent) return;
      try {
        const REASON_MAP: Record<string, string> = {
          allowance: "Allowance",
          backcharge: "Backcharge",
          client_request: "Client Request",
          design_development: "Design Development",
          existing_condition: "Existing Condition",
        };

        const response = await fetch(
          `/api/projects/${projectId}/change-events/${changeEventId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project_id: projectId,
              number: data.number || data.contractNumber || changeEvent.number,
              title: data.title,
              status: mapFormStatusToApiStatus(data.status),
              reason:
                REASON_MAP[data.changeReason || ""] || data.changeReason || null,
              scope: data.scope || null,
              description: data.description || null,
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({}));
          throw new Error(
            errorData.message ||
              `HTTP ${response.status}: ${response.statusText}`,
          );
        }

        toast.success("Change event updated successfully");
        setIsEditing(false);
        await fetchChangeEventDetails();
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to update change event",
        );
      }
    },
    [
      changeEvent,
      projectId,
      changeEventId,
      fetchChangeEventDetails,
      mapFormStatusToApiStatus,
    ],
  );

  const initialEditData = useMemo<Partial<ChangeEventFormData> | null>(() => {
    if (!changeEvent) return null;
    return {
      number: changeEvent.number || "",
      contractNumber: changeEvent.number || "",
      title: changeEvent.title || "",
      status: mapApiStatusToFormStatus(changeEvent.status),
      origin: (changeEvent as any).origin || undefined,
      type: (changeEvent as any).type || undefined,
      changeReason: (changeEvent as any).reason || undefined,
      scope: changeEvent.scope || undefined,
      lineItemRevenueSource:
        (changeEvent as any).line_item_revenue_source || "",
      primeContractId: (changeEvent as any).prime_contract_id || "",
      description: changeEvent.description || undefined,
      attachments: [],
      lineItems:
        lineItems.length > 0
          ? lineItems.map((item: any) => ({
              budgetCode:
                item.budgetCode ||
                item.budget_code_id ||
                item.budget_code ||
                "",
              description: item.description || "",
              vendor: item.vendor || item.vendor_id || "",
              contract: item.contract || item.contract_id || "",
              commitmentLineItemId: item.commitmentLineItemId || "",
              revenueUnitOfMeasure:
                item.revenueUnitOfMeasure || item.unitOfMeasure || "",
              revenueQuantity:
                Number(item.revenueQuantity || item.quantity || 1) || 1,
              revenueUnitCost:
                Number(item.revenueUnitCost || item.unitCost || 0) || 0,
              revenueRom: Number(item.revenueRom || 0) || 0,
              costQuantity:
                Number(item.costQuantity || item.quantity || 1) || 1,
              costUnitCost:
                Number(item.costUnitCost || item.unitCost || 0) || 0,
              costRom: Number(item.costRom || 0) || 0,
              nonCommittedCost: Number(item.nonCommittedCost || 0) || 0,
            }))
          : [],
    };
  }, [changeEvent, lineItems, mapApiStatusToFormStatus]);

  const getActionBadgeVariant = (
    action: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (action?.toUpperCase()) {
      case "CREATE":
        return "default";
      case "UPDATE":
        return "secondary";
      case "DELETE":
      case "VOID":
        return "destructive";
      default:
        return "outline";
    }
  };

  // ── Line item totals ───────────────────────────────────────────────
  const totals = lineItems.reduce(
    (acc, item) => ({
      costRom: acc.costRom + (item.costRom || 0),
      revenueRom: acc.revenueRom + (item.revenueRom || 0),
      nonCommittedCost: acc.nonCommittedCost + (item.nonCommittedCost || 0),
      latestPrice: acc.latestPrice + computeLatestPrice(item),
      latestCost: acc.latestCost + computeLatestCost(item),
    }),
    { costRom: 0, revenueRom: 0, nonCommittedCost: 0, latestPrice: 0, latestCost: 0 },
  );

  // ── Loading state ──────────────────────────────────────────────────
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

  // ── Error state ────────────────────────────────────────────────────
  if (error || !changeEvent) {
    return (
      <PageShell
        variant="detail"
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

  // ── Edit mode ──────────────────────────────────────────────────────
  if (isEditing && initialEditData) {
    return (
      <PageShell
        variant="detail"
        title={`Edit ${changeEvent.title}`}
        statusBadge={<StatusBadge status={changeEvent.status ?? "Open"} />}
        actions={
          <Inline gap="sm">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(false)}
            >
              Cancel Edit
            </Button>
          </Inline>
        }
      >
        <ChangeEventForm
          initialData={initialEditData}
          onSubmit={handleInlineEditSubmit}
          onCancel={() => setIsEditing(false)}
          mode="edit"
          projectId={projectId}
        />
      </PageShell>
    );
  }

  // ── Header actions (Procore style: Edit + Export dropdown + ⋮) ────
  const headerActions = (
    <Inline gap="sm">
      <Button
        variant="outline"
        size="sm"
        onClick={handleEdit}
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

  const ceNumber = changeEvent.number || `CE-${changeEvent.id}`;
  const ceTitle = `Change Event #${ceNumber}: ${changeEvent.title || "Untitled"}`;

  // ── Main render (Procore layout) ───────────────────────────────────
  return (
    <PageShell
      variant="dashboard"
      title={ceTitle}
      statusBadge={<StatusBadge status={changeEvent.status ?? "Open"} />}
      actions={headerActions}
      onBack={handleBack}
    >
      {/* Status actions bar */}
      <div className="flex items-center gap-2 mb-4">
        {changeEvent.status?.toLowerCase() === "open" && (
          <Button
            size="sm"
            onClick={() => handleStatusChange("pending_approval")}
            data-testid="change-event-submit-approval"
          >
            <FileCheck2 className="mr-1 h-4 w-4" />
            Submit for Approval
          </Button>
        )}
        {(changeEvent.status?.toLowerCase() === "pending_approval" ||
          changeEvent.status?.toLowerCase() === "pending approval") && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange("approved")}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleStatusChange("rejected")}
            >
              Reject
            </Button>
          </>
        )}
        {changeEvent.status?.toLowerCase() !== "closed" &&
          changeEvent.status?.toLowerCase() !== "converted" && (
            <Button size="sm" variant="outline" onClick={handleClose}>
              <X className="mr-1 h-4 w-4" />
              Close
            </Button>
          )}
      </div>

      {/* ── Tabs (Procore layout) ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line">
          <TabsTrigger value="general" data-testid="change-event-tab-general">
            General
          </TabsTrigger>
          <TabsTrigger value="related-items">
            Related Items ({relatedItems.length})
          </TabsTrigger>
          <TabsTrigger value="comments">
            Comments (0)
          </TabsTrigger>
          <TabsTrigger value="emails">
            Emails (0)
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="change-event-tab-history">
            Change History ({historyEntries.length})
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="change-event-tab-settings">
            Advanced Settings
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════════════
            GENERAL TAB — Procore layout:
            1. General Information (4-col grid)
            2. Attachments
            3. Line Items (full table with grouped columns)
           ════════════════════════════════════════════════════════════ */}
        <TabsContent value="general">
          <Stack gap="lg">
            {/* ── General Information ── */}
            <div>
              <SectionHeader title="General Information" className="mb-4" />
              <div className="grid grid-cols-4 gap-x-8 gap-y-5">
                {/* Row 1 */}
                <div>
                  <Text size="xs" tone="muted" weight="medium" className="mb-1">
                    Number
                  </Text>
                  <Text size="sm">{ceNumber}</Text>
                </div>
                <div>
                  <Text size="xs" tone="muted" weight="medium" className="mb-1">
                    Title
                  </Text>
                  <Text size="sm">{changeEvent.title || "--"}</Text>
                </div>
                <div>
                  <Text size="xs" tone="muted" weight="medium" className="mb-1">
                    Status
                  </Text>
                  <StatusBadge status={changeEvent.status ?? "Open"} />
                </div>
                <div>
                  <Text size="xs" tone="muted" weight="medium" className="mb-1">
                    Origin
                  </Text>
                  <Text size="sm">{(changeEvent as any).origin || "--"}</Text>
                </div>

                {/* Row 2 */}
                <div>
                  <Text size="xs" tone="muted" weight="medium" className="mb-1">
                    Type
                  </Text>
                  <Text size="sm">{changeEvent.type || "--"}</Text>
                </div>
                <div>
                  <Text size="xs" tone="muted" weight="medium" className="mb-1">
                    Change Reason
                  </Text>
                  <Text size="sm">{(changeEvent as any).reason || "--"}</Text>
                </div>
                <div>
                  <Text size="xs" tone="muted" weight="medium" className="mb-1">
                    Scope
                  </Text>
                  <Text size="sm">{changeEvent.scope || "--"}</Text>
                </div>
                <div />

                {/* Row 3 */}
                <div>
                  <Text size="xs" tone="muted" weight="medium" className="mb-1">
                    Expecting Revenue
                  </Text>
                  <Text size="sm">
                    {changeEvent.expecting_revenue ? "Yes" : "No"}
                  </Text>
                </div>
                <div>
                  <Text size="xs" tone="muted" weight="medium" className="mb-1">
                    Line Item Revenue Source
                  </Text>
                  <Text size="sm">
                    {(changeEvent as any).line_item_revenue_source || "--"}
                  </Text>
                </div>
                <div className="col-span-2">
                  <Text size="xs" tone="muted" weight="medium" className="mb-1">
                    Prime Contract for Markup Estimates
                  </Text>
                  <Text size="sm">
                    {(changeEvent as any).prime_contract_id
                      ? `Contract #${(changeEvent as any).prime_contract_id}`
                      : "--"}
                  </Text>
                </div>
              </div>

              {/* Description */}
              <div className="mt-5">
                <Text size="xs" tone="muted" weight="medium" className="mb-1">
                  Description
                </Text>
                <Text size="sm" className="whitespace-pre-wrap">
                  {changeEvent.description || "--"}
                </Text>
              </div>
            </div>

            {/* ── Attachments (inline on General tab, like Procore) ── */}
            <div>
              <SectionHeader title="Attachments" className="mb-3" />
              {attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-sm"
                      >
                        {attachment.fileName}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <Text size="sm" tone="muted">
                  No attachments
                </Text>
              )}
            </div>

            {/* ── Line Items (full Procore table with grouped columns) ── */}
            <div>
              <SectionHeader title="Line Items" count={lineItems.length} className="mb-4" />

              {/* Toolbar */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search"
                      className="h-8 w-48 pl-8"
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    Filters
                  </Button>
                </div>
                <Text size="xs" tone="muted">
                  {lineItems.length} items selected
                </Text>
              </div>

              {lineItems.length > 0 ? (
                <div className="border border-border rounded-md overflow-x-auto">
                  {/* ── Group headers ── */}
                  <div className="flex items-center bg-muted/50 border-b border-border text-xs font-semibold uppercase tracking-wide">
                    {/* Detail group */}
                    <div className="flex-shrink-0 border-r border-border px-3 py-1" style={{ width: 680 }}>
                      <span className="text-muted-foreground">Detail</span>
                    </div>
                    {/* Revenue group */}
                    <div className="flex-shrink-0 border-r border-border px-3 py-1" style={{ width: 450 }}>
                      <span className="text-muted-foreground">Revenue</span>
                    </div>
                    {/* Cost group */}
                    <div className="flex-shrink-0 border-r border-border px-3 py-1" style={{ width: 560 }}>
                      <span className="text-muted-foreground">Cost</span>
                    </div>
                    {/* Over/Under */}
                    <div className="flex-shrink-0 border-r border-border px-3 py-1" style={{ width: 100 }}>
                      <span className="text-muted-foreground">Over/Under</span>
                    </div>
                    {/* Budget Mod */}
                    <div className="flex-shrink-0 px-3 py-1" style={{ width: 100 }}>
                      <span className="text-muted-foreground">Budget Mod</span>
                    </div>
                  </div>

                  {/* ── Column headers ── */}
                  <div className="flex items-center bg-muted/30 border-b border-border text-xs font-medium text-muted-foreground">
                    {/* Detail columns */}
                    <div className="flex-shrink-0 w-[160px] px-3 py-2">Budget Code</div>
                    <div className="flex-shrink-0 w-[140px] px-2 py-2">Description</div>
                    <div className="flex-shrink-0 w-[100px] px-2 py-2">Vendor</div>
                    <div className="flex-shrink-0 w-[100px] px-2 py-2">Contract</div>
                    <div className="flex-shrink-0 w-[60px] px-2 py-2">UOM</div>
                    {/* Revenue columns */}
                    <div className="flex-shrink-0 w-[55px] px-2 py-2 text-right border-l border-border">Qty</div>
                    <div className="flex-shrink-0 w-[90px] px-2 py-2 text-right">Unit Cost</div>
                    <div className="flex-shrink-0 w-[100px] px-2 py-2 text-right">Revenue ROM</div>
                    <div className="flex-shrink-0 w-[100px] px-2 py-2 text-right">Prime PCO</div>
                    <div className="flex-shrink-0 w-[95px] px-2 py-2 text-right">Latest Price</div>
                    {/* Cost columns */}
                    <div className="flex-shrink-0 w-[55px] px-2 py-2 text-right border-l border-border">Qty</div>
                    <div className="flex-shrink-0 w-[90px] px-2 py-2 text-right">Unit Cost</div>
                    <div className="flex-shrink-0 w-[90px] px-2 py-2 text-right">Cost ROM</div>
                    <div className="flex-shrink-0 w-[80px] px-2 py-2 text-right">RFQ</div>
                    <div className="flex-shrink-0 w-[95px] px-2 py-2 text-right">Commitment</div>
                    <div className="flex-shrink-0 w-[100px] px-2 py-2 text-right">Non-Committed</div>
                    <div className="flex-shrink-0 w-[90px] px-2 py-2 text-right">Latest Cost</div>
                    {/* Over/Under */}
                    <div className="flex-shrink-0 w-[100px] px-2 py-2 text-right border-l border-border">Over/Under</div>
                    {/* Budget Mod */}
                    <div className="flex-shrink-0 w-[100px] px-2 py-2 text-right border-l border-border">Budget Mod</div>
                  </div>

                  {/* ── Data rows ── */}
                  {lineItems.map((li) => {
                    const lp = computeLatestPrice(li);
                    const lc = computeLatestCost(li);
                    const ou = lp - lc;

                    return (
                      <div
                        key={li.id}
                        className="flex items-center border-b border-border text-sm hover:bg-muted/30 transition-colors"
                      >
                        {/* Detail */}
                        <div className="flex-shrink-0 w-[160px] px-3 py-2 truncate">
                          {formatBudgetCode(li)}
                        </div>
                        <div className="flex-shrink-0 w-[140px] px-2 py-2 truncate">
                          {li.description || "--"}
                        </div>
                        <div className="flex-shrink-0 w-[100px] px-2 py-2 truncate">
                          {li.vendor?.name || "--"}
                        </div>
                        <div className="flex-shrink-0 w-[100px] px-2 py-2 truncate">
                          {li.contractId ? `#${li.contractId}` : "--"}
                        </div>
                        <div className="flex-shrink-0 w-[60px] px-2 py-2 truncate text-muted-foreground">
                          {li.unitOfMeasure || "--"}
                        </div>
                        {/* Revenue */}
                        <div className="flex-shrink-0 w-[55px] px-2 py-2 text-right tabular-nums border-l border-border">
                          {li.quantity ?? "--"}
                        </div>
                        <div className="flex-shrink-0 w-[90px] px-2 py-2 text-right tabular-nums">
                          {li.unitCost != null ? formatCurrency(li.unitCost) : "--"}
                        </div>
                        <div className="flex-shrink-0 w-[100px] px-2 py-2 text-right tabular-nums">
                          {formatCurrency(li.revenueRom || 0)}
                        </div>
                        <div className="flex-shrink-0 w-[100px] px-2 py-2 text-right tabular-nums text-primary">
                          {li.revenueRom ? formatCurrency(li.revenueRom) : "--"}
                        </div>
                        <div className="flex-shrink-0 w-[95px] px-2 py-2 text-right tabular-nums font-medium">
                          {lp !== 0 ? formatCurrency(lp) : "--"}
                        </div>
                        {/* Cost */}
                        <div className="flex-shrink-0 w-[55px] px-2 py-2 text-right tabular-nums border-l border-border">
                          {li.quantity ?? "--"}
                        </div>
                        <div className="flex-shrink-0 w-[90px] px-2 py-2 text-right tabular-nums">
                          {li.unitCost != null ? formatCurrency(li.unitCost) : "--"}
                        </div>
                        <div className="flex-shrink-0 w-[90px] px-2 py-2 text-right tabular-nums">
                          {formatCurrency(li.costRom || 0)}
                        </div>
                        <div className="flex-shrink-0 w-[80px] px-2 py-2 text-right tabular-nums text-muted-foreground">
                          --
                        </div>
                        <div className="flex-shrink-0 w-[95px] px-2 py-2 text-right tabular-nums text-muted-foreground">
                          --
                        </div>
                        <div className="flex-shrink-0 w-[100px] px-2 py-2 text-right tabular-nums">
                          {li.nonCommittedCost ? formatCurrency(li.nonCommittedCost) : "--"}
                        </div>
                        <div className="flex-shrink-0 w-[90px] px-2 py-2 text-right tabular-nums font-medium">
                          {lc !== 0 ? formatCurrency(lc) : "--"}
                        </div>
                        {/* Over/Under */}
                        <div
                          className={`flex-shrink-0 w-[100px] px-2 py-2 text-right tabular-nums font-medium border-l border-border ${
                            ou > 0
                              ? "text-green-600"
                              : ou < 0
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }`}
                        >
                          {ou !== 0 ? `${ou > 0 ? "+" : ""}${formatCurrency(ou)}` : "$0.00"}
                        </div>
                        {/* Budget Mod */}
                        <div className="flex-shrink-0 w-[100px] px-2 py-2 text-right tabular-nums text-muted-foreground border-l border-border">
                          --
                        </div>
                      </div>
                    );
                  })}

                  {/* ── Totals row ── */}
                  <div className="flex items-center bg-muted/30 text-sm font-semibold">
                    <div className="flex-shrink-0 w-[160px] px-3 py-2">Totals</div>
                    <div className="flex-shrink-0 w-[140px] px-2 py-2" />
                    <div className="flex-shrink-0 w-[100px] px-2 py-2" />
                    <div className="flex-shrink-0 w-[100px] px-2 py-2" />
                    <div className="flex-shrink-0 w-[60px] px-2 py-2" />
                    {/* Revenue totals */}
                    <div className="flex-shrink-0 w-[55px] px-2 py-2 border-l border-border" />
                    <div className="flex-shrink-0 w-[90px] px-2 py-2" />
                    <div className="flex-shrink-0 w-[100px] px-2 py-2 text-right tabular-nums">
                      {formatCurrency(totals.revenueRom)}
                    </div>
                    <div className="flex-shrink-0 w-[100px] px-2 py-2" />
                    <div className="flex-shrink-0 w-[95px] px-2 py-2 text-right tabular-nums">
                      {formatCurrency(totals.latestPrice)}
                    </div>
                    {/* Cost totals */}
                    <div className="flex-shrink-0 w-[55px] px-2 py-2 border-l border-border" />
                    <div className="flex-shrink-0 w-[90px] px-2 py-2" />
                    <div className="flex-shrink-0 w-[90px] px-2 py-2 text-right tabular-nums">
                      {formatCurrency(totals.costRom)}
                    </div>
                    <div className="flex-shrink-0 w-[80px] px-2 py-2" />
                    <div className="flex-shrink-0 w-[95px] px-2 py-2" />
                    <div className="flex-shrink-0 w-[100px] px-2 py-2 text-right tabular-nums">
                      {formatCurrency(totals.nonCommittedCost)}
                    </div>
                    <div className="flex-shrink-0 w-[90px] px-2 py-2 text-right tabular-nums">
                      {formatCurrency(totals.latestCost)}
                    </div>
                    {/* Over/Under total */}
                    <div
                      className={`flex-shrink-0 w-[100px] px-2 py-2 text-right tabular-nums border-l border-border ${
                        totals.latestPrice - totals.latestCost > 0
                          ? "text-green-600"
                          : totals.latestPrice - totals.latestCost < 0
                            ? "text-destructive"
                            : ""
                      }`}
                    >
                      {formatCurrency(totals.latestPrice - totals.latestCost)}
                    </div>
                    {/* Budget Mod total */}
                    <div className="flex-shrink-0 w-[100px] px-2 py-2 text-right tabular-nums text-muted-foreground border-l border-border">
                      --
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 border border-border rounded-md">
                  <Text tone="muted">No line items added yet</Text>
                </div>
              )}
            </div>
          </Stack>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════
            RELATED ITEMS TAB
           ════════════════════════════════════════════════════════════ */}
        <TabsContent value="related-items">
          <Stack gap="md">
            <div className="flex items-center justify-between">
              <SectionHeader
                title="Related Items"
                count={relatedItems.length}
                className="mb-0"
              />
              <Button
                size="sm"
                onClick={() => setShowLinkRelatedItemDialog(true)}
              >
                <Link2 className="mr-1 h-4 w-4" />
                Link Related Item
              </Button>
            </div>

            {isRelatedItemsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="size-6 text-muted-foreground" />
              </div>
            ) : relatedItems.length > 0 ? (
              <div className="border border-border rounded-md divide-y divide-border">
                {relatedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {formatRelatedTypeLabel(item.relatedType)}
                        </Badge>
                        {item.relatedStatus ? (
                          <Badge variant="outline">{item.relatedStatus}</Badge>
                        ) : null}
                      </div>
                      <a
                        href={item.relatedUrl}
                        className="mt-1 block text-sm font-medium text-primary hover:underline truncate"
                      >
                        {item.relatedNumber
                          ? `#${item.relatedNumber}: ${item.relatedTitle}`
                          : item.relatedTitle}
                      </a>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleUnlinkRelatedItem(item.id)}
                      aria-label="Remove related item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Link2 />}
                title="No related items"
                description="Use Link Related Item to connect RFIs, submittals, drawings, specifications, and other change events."
              />
            )}
          </Stack>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════
            COMMENTS TAB
           ════════════════════════════════════════════════════════════ */}
        <TabsContent value="comments">
          <EntityRoom entityType="change-event" entityId={changeEventId}>
            <EntityComments title="Comments" />
          </EntityRoom>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════
            EMAILS TAB
           ════════════════════════════════════════════════════════════ */}
        <TabsContent value="emails">
          <EmptyState
            icon={<Mail />}
            title="No emails"
            description="Emails related to this change event will appear here."
          />
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════
            CHANGE HISTORY TAB
           ════════════════════════════════════════════════════════════ */}
        <TabsContent value="history">
          <div>
            {isHistoryLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="size-6 text-muted-foreground" />
              </div>
            ) : historyEntries.length > 0 ? (
              <div className="space-y-3">
                {historyEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Text size="sm" weight="medium" className="truncate">
                          {typeof entry.changedBy === "object" &&
                          entry.changedBy?.email
                            ? entry.changedBy.email
                            : typeof entry.changedBy === "string"
                              ? "User"
                              : "System"}
                        </Text>
                        <Badge
                          variant={getActionBadgeVariant(entry.action)}
                          className="text-xs px-1.5 py-0"
                        >
                          {entry.action}
                        </Badge>
                      </div>
                      <Text size="sm">{entry.description}</Text>
                      {entry.action === "UPDATE" &&
                        entry.oldValue &&
                        entry.newValue && (
                          <div className="mt-1">
                            <Text size="xs" tone="muted">
                              <span className="font-medium">
                                {entry.fieldName}:
                              </span>{" "}
                              <span className="line-through">
                                {entry.oldValue}
                              </span>{" "}
                              &rarr; {entry.newValue}
                            </Text>
                          </div>
                        )}
                      <Text size="xs" tone="muted" className="mt-1">
                        {new Date(entry.changedAt).toLocaleString()}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Clock />}
                title="No history recorded"
                description="Changes to this event will be tracked here automatically."
              />
            )}
          </div>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════
            ADVANCED SETTINGS TAB
           ════════════════════════════════════════════════════════════ */}
        <TabsContent value="settings">
          <Stack gap="lg">
            <ChangeEventApprovalWorkflow
              changeEventId={changeEventId}
              projectId={projectId}
              currentStatus={changeEvent.status || "open"}
              onStatusChange={handleStatusChange}
              currentUserId={"1"}
            />
          </Stack>
        </TabsContent>
      </Tabs>

      <Dialog
        open={showLinkRelatedItemDialog}
        onOpenChange={setShowLinkRelatedItemDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Related Item</DialogTitle>
            <DialogDescription>
              Link existing project records to this change event.
            </DialogDescription>
          </DialogHeader>

          <Stack gap="sm">
            <div className="space-y-2">
              <Text size="sm" weight="medium">
                Item type
              </Text>
              <Select
                value={linkRelatedType}
                onValueChange={(value) => setLinkRelatedType(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item type" />
                </SelectTrigger>
                <SelectContent>
                  {RELATED_ITEM_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Text size="sm" weight="medium">
                Search
              </Text>
              <Input
                value={linkSearch}
                onChange={(event) => setLinkSearch(event.target.value)}
                placeholder="Search by number or title"
              />
            </div>

            <div className="space-y-2">
              <Text size="sm" weight="medium">
                Item
              </Text>
              <Select
                value={selectedRelatedItemId}
                onValueChange={(value) => setSelectedRelatedItemId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item to link" />
                </SelectTrigger>
                <SelectContent>
                  {relatedItemOptions.length > 0 ? (
                    relatedItemOptions.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.relatedNumber
                          ? `#${item.relatedNumber}: ${item.relatedTitle}`
                          : item.relatedTitle}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__none" disabled>
                      No matching items
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </Stack>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLinkRelatedItemDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLinkRelatedItem}
              disabled={isLinkingRelatedItem || !selectedRelatedItemId}
            >
              {isLinkingRelatedItem ? "Linking..." : "Link Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert dialog */}
      {showConvertDialog && (
        <ChangeEventConvertDialog
          changeEvent={changeEvent}
          projectId={projectId}
          onClose={() => setShowConvertDialog(false)}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete change event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete change event #{ceNumber}. This action cannot be undone.
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
