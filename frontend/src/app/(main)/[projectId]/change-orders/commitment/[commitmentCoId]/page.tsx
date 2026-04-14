"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, Edit, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  InlineTable,
  InlineTableBody,
  InlineTableCell,
  InlineTableFooter,
  InlineTableFooterCell,
  InlineTableFooterRow,
  InlineTableHeader,
  InlineTableHeaderCell,
  InlineTableHeaderRow,
  InlineTableRow,
  StatusBadge,
} from "@/components/ds";
import { useMasterCostCodes, useCostCodeTypes } from "@/hooks/use-project-cost-codes";
import { useVerticalMarkup } from "@/hooks/use-vertical-markup";
import { ContentSectionStack, LabelValueRow, PageShell, SectionRuleHeading } from "@/components/layout";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHANGE_REASONS = [
  "Client Request",
  "Design Development",
  "Allowance",
  "Existing Condition",
  "Backcharge",
  "Scope Change",
  "Unforeseen Condition",
  "Value Engineering",
  "Other",
] as const;

const MARKUP_TYPE_LABELS: Record<string, string> = {
  insurance: "Insurance",
  bond: "Bond",
  fee: "Contractor Fee",
  overhead: "Overhead",
  custom: "Custom",
};

function getMarkupLabel(markupType: string): string {
  return MARKUP_TYPE_LABELS[markupType.toLowerCase()] || markupType;
}

// ---------------------------------------------------------------------------
// Types & schema
// ---------------------------------------------------------------------------

interface CommitmentCOData {
  id: string;
  change_order_number: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
  amount: number | null;
  contract_id: string | null;
  requested_by: string | null;
  requested_date: string | null;
  approved_by: string | null;
  approved_date: string | null;
  rejection_reason: string | null;
  change_reason: string | null;
  due_date: string | null;
  invoiced_date: string | null;
  designated_reviewer: string | null;
  schedule_impact: number | null;
  location: string | null;
  reference: string | null;
  is_private: boolean | null;
  executed: boolean | null;
  field_change: boolean | null;
  paid_in_full: boolean | null;
  created_at: string | null;
}

const editSchema = z.object({
  change_order_number: z.string().min(1, "Number is required"),
  title: z.string().trim().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(["draft", "pending", "approved", "out_for_signature", "executed", "void"]),
  amount: z.number(),
  change_reason: z.string().optional().nullable(),
  requested_by: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  invoiced_date: z.string().optional().nullable(),
  designated_reviewer: z.string().optional().nullable(),
  schedule_impact: z.number().int().optional().nullable(),
  location: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  is_private: z.boolean(),
  executed: z.boolean(),
  field_change: z.boolean(),
  paid_in_full: z.boolean(),
});

type FormData = z.infer<typeof editSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number | null): string {
  if (amount == null) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusLabel(status: string | null): string {
  if (!status) return "Unknown";
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CommitmentCODetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const projectId = params.projectId as string;
  const commitmentCoId = params.commitmentCoId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [co, setCo] = useState<CommitmentCOData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      change_order_number: "",
      title: "",
      description: "",
      status: "draft",
      amount: 0,
      change_reason: "",
      requested_by: "",
      due_date: "",
      invoiced_date: "",
      designated_reviewer: "",
      schedule_impact: undefined,
      location: "",
      reference: "",
      is_private: false,
      executed: false,
      field_change: false,
      paid_in_full: false,
    },
  });

  const [contractId, setContractId] = useState<string | null>(null);

  // Line items
  interface LineItem {
    id: string;
    description: string | null;
    amount: number;
    cost_code_id: string | null;
    cost_type_id: string | null;
    budget_line_id: string | null;
  }
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [lineItemsLoading, setLineItemsLoading] = useState(true);

  // Inline CRUD state for line items
  interface LineItemDraft {
    description: string;
    amount: string;
    cost_code_id: string;
    cost_type_id: string;
  }
  const emptyDraft: LineItemDraft = { description: "", amount: "", cost_code_id: "", cost_type_id: "" };
  const [addingLineItem, setAddingLineItem] = useState(false);
  const [editingLineItemId, setEditingLineItemId] = useState<string | null>(null);
  const [lineItemDraft, setLineItemDraft] = useState<LineItemDraft>(emptyDraft);

  // Cost code & cost type lookups
  const { data: masterCostCodes = [] } = useMasterCostCodes();
  const { data: costCodeTypes = [] } = useCostCodeTypes();
  const [lineItemSaving, setLineItemSaving] = useState(false);

  // Vertical markup
  const numericProjectId = Number(projectId);
  const { markupRows } = useVerticalMarkup(
    Number.isFinite(numericProjectId) ? numericProjectId : undefined,
  );

  const lineItemSubtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + (item.amount ?? 0), 0),
    [lineItems],
  );

  const computedMarkups = useMemo(() => {
    if (!markupRows.length) return [];
    const sorted = [...markupRows].sort(
      (a, b) => a.calculation_order - b.calculation_order,
    );
    let runningBase = lineItemSubtotal;
    return sorted.map((markup) => {
      const amount = runningBase * (markup.percentage / 100);
      if (markup.compound) {
        runningBase += amount;
      }
      return { ...markup, amount };
    });
  }, [markupRows, lineItemSubtotal]);

  const markupTotal = useMemo(
    () => computedMarkups.reduce((sum, m) => sum + m.amount, 0),
    [computedMarkups],
  );

  const grandTotal = lineItemSubtotal + markupTotal;

  // Attachments
  interface Attachment {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
  }
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(true);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);

  // Fetch CO data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(
          `/api/projects/${projectId}/commitment-change-orders/${commitmentCoId}`,
        );

        if (res.ok) {
          const data = await res.json();
          setCo(data);
          setContractId(data.contract_id);
          return;
        }

        throw new Error("Failed to fetch change order");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [projectId, commitmentCoId]);

  // Fetch line items via API
  const fetchLineItemsFn = useCallback(async () => {
    setLineItemsLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/commitment-change-orders/${commitmentCoId}/line-items`,
      );
      if (!res.ok) throw new Error("Failed to fetch line items");
      const json = await res.json();
      setLineItems(json.data ?? []);
    } catch {
      setLineItems([]);
    } finally {
      setLineItemsLoading(false);
    }
  }, [projectId, commitmentCoId]);

  useEffect(() => {
    if (co) fetchLineItemsFn();
  }, [co, fetchLineItemsFn]);

  // Line item CRUD handlers
  const lineItemApiBase = `/api/projects/${projectId}/commitment-change-orders/${commitmentCoId}/line-items`;

  const handleAddLineItem = useCallback(async () => {
    const amount = parseFloat(lineItemDraft.amount) || 0;
    setLineItemSaving(true);
    try {
      const res = await fetch(lineItemApiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: lineItemDraft.description || null,
          amount,
          cost_code_id: lineItemDraft.cost_code_id || null,
          cost_type_id: lineItemDraft.cost_type_id || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Failed to create line item");
      }
      toast.success("Line item added");
      setAddingLineItem(false);
      setLineItemDraft(emptyDraft);
      fetchLineItemsFn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add line item");
    } finally {
      setLineItemSaving(false);
    }
  }, [lineItemDraft, lineItemApiBase, fetchLineItemsFn]);

  const handleUpdateLineItem = useCallback(async () => {
    if (!editingLineItemId) return;
    const amount = parseFloat(lineItemDraft.amount) || 0;
    setLineItemSaving(true);
    try {
      const res = await fetch(`${lineItemApiBase}/${editingLineItemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: lineItemDraft.description || null,
          amount,
          cost_code_id: lineItemDraft.cost_code_id || null,
          cost_type_id: lineItemDraft.cost_type_id || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Failed to update line item");
      }
      toast.success("Line item updated");
      setEditingLineItemId(null);
      setLineItemDraft(emptyDraft);
      fetchLineItemsFn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update line item");
    } finally {
      setLineItemSaving(false);
    }
  }, [editingLineItemId, lineItemDraft, lineItemApiBase, fetchLineItemsFn]);

  const handleDeleteLineItem = useCallback(
    async (lineItemId: string) => {
      if (!confirm("Delete this line item?")) return;
      try {
        const res = await fetch(`${lineItemApiBase}/${lineItemId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete line item");
        toast.success("Line item deleted");
        fetchLineItemsFn();
      } catch {
        toast.error("Failed to delete line item");
      }
    },
    [lineItemApiBase, fetchLineItemsFn],
  );

  const startEditLineItem = useCallback(
    (item: LineItem) => {
      setEditingLineItemId(item.id);
      setAddingLineItem(false);
      setLineItemDraft({
        description: item.description || "",
        amount: String(item.amount ?? 0),
        cost_code_id: item.cost_code_id || "",
        cost_type_id: item.cost_type_id || "",
      });
    },
    [],
  );

  const cancelLineItemEdit = useCallback(() => {
    setAddingLineItem(false);
    setEditingLineItemId(null);
    setLineItemDraft(emptyDraft);
  }, []);

  // Cost code / type display helpers
  const costCodeLabel = useCallback(
    (id: string | null) => {
      if (!id) return "—";
      const cc = masterCostCodes.find((c) => c.id === id);
      return cc ? `${cc.id} - ${cc.title || ""}` : id;
    },
    [masterCostCodes],
  );

  const costTypeLabel = useCallback(
    (id: string | null) => {
      if (!id) return "—";
      const ct = costCodeTypes.find((t) => t.id === id);
      return ct ? `${ct.code} - ${ct.description}` : id;
    },
    [costCodeTypes],
  );

  // Inline cost code / cost type select fragment used in add & edit rows
  const renderCostCodeSelect = (
    <Select
      value={lineItemDraft.cost_code_id || "none"}
      onValueChange={(v) => setLineItemDraft((d) => ({ ...d, cost_code_id: v === "none" ? "" : v }))}
    >
      <SelectTrigger className="h-8 text-sm">
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {masterCostCodes.map((cc) => (
          <SelectItem key={cc.id} value={cc.id}>
            {cc.id} - {cc.title || "Untitled"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const renderCostTypeSelect = (
    <Select
      value={lineItemDraft.cost_type_id || "none"}
      onValueChange={(v) => setLineItemDraft((d) => ({ ...d, cost_type_id: v === "none" ? "" : v }))}
    >
      <SelectTrigger className="h-8 text-sm">
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {costCodeTypes.map((ct) => (
          <SelectItem key={ct.id} value={ct.id}>
            {ct.code} - {ct.description}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  // Fetch attachments
  const fetchAttachmentsFn = useCallback(async () => {
    setAttachmentsLoading(true);
    setAttachmentsError(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/commitment-change-orders/${commitmentCoId}/attachments`,
      );
      if (res.ok) {
        const json = await res.json();
        setAttachments(json.data ?? []);
      } else {
        const errJson = await res.json().catch(() => null);
        throw new Error(
          (errJson as { error?: string } | null)?.error ?? "Failed to fetch attachments",
        );
      }
    } catch (err) {
      console.error("Failed to fetch attachments:", err);
      setAttachmentsError(
        err instanceof Error ? err.message : "Failed to fetch attachments",
      );
    } finally {
      setAttachmentsLoading(false);
    }
  }, [projectId, commitmentCoId]);

  useEffect(() => {
    if (co) fetchAttachmentsFn();
  }, [co, fetchAttachmentsFn]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch(
          `/api/projects/${projectId}/commitment-change-orders/${commitmentCoId}/attachments`,
          { method: "POST", body: formData },
        );
        if (!res.ok) throw new Error("Upload failed");
        toast.success(`${file.name} uploaded`);
        fetchAttachmentsFn();
      } catch {
        toast.error("Failed to upload file");
      }
      e.target.value = "";
    },
    [projectId, commitmentCoId, fetchAttachmentsFn],
  );

  const handleDeleteAttachment = useCallback(
    async (attachmentId: string) => {
      if (!confirm("Delete this attachment?")) return;
      try {
        const res = await fetch(
          `/api/projects/${projectId}/commitment-change-orders/${commitmentCoId}/attachments/${attachmentId}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error("Delete failed");
        toast.success("Attachment deleted");
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      } catch {
        toast.error("Failed to delete attachment");
      }
    },
    [projectId, commitmentCoId],
  );

  useEffect(() => {
    if (searchParams.get("edit") === "1") setIsEditing(true);
  }, [searchParams]);

  // Populate form when CO loads
  useEffect(() => {
    if (!co) return;
    form.reset({
      change_order_number: co.change_order_number || "",
      title: co.title || "",
      description: co.description || "",
      status: (co.status as FormData["status"]) || "draft",
      amount: co.amount ?? 0,
      change_reason: co.change_reason || "",
      requested_by: co.requested_by || "",
      due_date: co.due_date ? co.due_date.split("T")[0] : "",
      invoiced_date: co.invoiced_date ? co.invoiced_date.split("T")[0] : "",
      designated_reviewer: co.designated_reviewer || "",
      schedule_impact: co.schedule_impact ?? undefined,
      location: co.location || "",
      reference: co.reference || "",
      is_private: co.is_private ?? false,
      executed: co.executed ?? false,
      field_change: co.field_change ?? false,
      paid_in_full: co.paid_in_full ?? false,
    });
  }, [co, form]);

  const handleBack = useCallback(() => {
    router.push(`/${projectId}/change-orders?tab=commitment`);
  }, [router, projectId]);

  const handleSave: SubmitHandler<FormData> = async (data) => {
    if (!contractId) {
      toast.error("Missing contract reference");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/commitments/${contractId}/change-orders/${commitmentCoId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            change_order_number: data.change_order_number,
            title: data.title || null,
            description: data.description || null,
            status: data.status,
            amount: data.amount,
            change_reason: data.change_reason || null,
            requested_by: data.requested_by || null,
            due_date: data.due_date || null,
            invoiced_date: data.invoiced_date || null,
            designated_reviewer: data.designated_reviewer || null,
            schedule_impact: data.schedule_impact ?? null,
            location: data.location || null,
            reference: data.reference || null,
            is_private: data.is_private,
            executed: data.executed,
            field_change: data.field_change,
            paid_in_full: data.paid_in_full,
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Failed to update");
      }
      const updated = await res.json();
      // The PUT route returns { data: updatedCO }
      setCo(updated.data ?? updated);
      setIsEditing(false);
      toast.success("Change order updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = useCallback(async () => {
    if (!co || !contractId) return;
    if (!confirm(`Delete change order ${co.change_order_number}?`)) return;
    try {
      const res = await fetch(
        `/api/commitments/${contractId}/change-orders/${commitmentCoId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: string }).error || "Failed to delete");
      }
      toast.success("Change order deleted");
      router.push(`/${projectId}/change-orders?tab=commitment`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }, [co, contractId, projectId, commitmentCoId, router]);

  const handleApprove = useCallback(async () => {
    if (!co || !contractId) return;
    try {
      const updated = await apiFetch<CommitmentCOData>(
        `/api/commitments/${contractId}/change-orders/${commitmentCoId}/approve`,
        { method: "POST" },
      );
      setCo(updated);
      toast.success("Change order approved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    }
  }, [co, contractId, commitmentCoId]);

  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const handleReject = useCallback(async () => {
    if (!co || !contractId || !rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    try {
      const updated = await apiFetch<CommitmentCOData>(
        `/api/projects/${projectId}/commitment-change-orders/${commitmentCoId}/reject`,
        {
          method: "POST",
          body: JSON.stringify({ rejection_reason: rejectionReason }),
        },
      );
      setCo(updated);
      setShowRejectDialog(false);
      setRejectionReason("");
      toast.success("Change order rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    }
  }, [co, contractId, projectId, commitmentCoId, rejectionReason]);

  // --- Loading state ---------------------------------------------------------
  if (isLoading) {
    return (
      <PageShell variant="detail" title="Loading..." description="Loading change order details">
        <div className="space-y-6">
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </PageShell>
    );
  }

  // --- Error state -----------------------------------------------------------
  if (error || !co) {
    return (
      <PageShell
        variant="detail"
        title="Error"
        description="Failed to load change order"
        onBack={handleBack}
      >
        <div className="text-center text-destructive">{error || "Not found"}</div>
        <div className="mt-4 flex justify-center">
          <Button onClick={handleBack}>
            <ArrowLeft />
            Back to Change Orders
          </Button>
        </div>
      </PageShell>
    );
  }

  // --- Edit mode -------------------------------------------------------------
  if (isEditing) {
    return (
      <PageShell
        variant="form"
        title={`Edit ${co.title || co.change_order_number || "CCO"}`}
        description="Update commitment change order"
        onBack={() => setIsEditing(false)}
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={form.handleSubmit(handleSave)}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        }
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            {/* Card 1: General */}
            <Card>
              <CardHeader>
                <CardTitle>General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="change_order_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CO Number *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 001" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} placeholder="Change order title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ""} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="out_for_signature">Out for Signature</SelectItem>
                          <SelectItem value="executed">Executed</SelectItem>
                          <SelectItem value="void">Void</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="change_reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Change Reason</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CHANGE_REASONS.map((reason) => (
                            <SelectItem key={reason} value={reason}>
                              {reason}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          value={field.value}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="requested_by"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request Received From</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} placeholder="Name of requester" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Card 2: Dates & Options */}
            <Card>
              <CardHeader>
                <CardTitle>Dates &amp; Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="due_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="invoiced_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoiced Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="designated_reviewer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Designated Reviewer</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder="Reviewer name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="schedule_impact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Schedule Impact (days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            placeholder=""
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? null
                                  : parseInt(e.target.value, 10),
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder="Location"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder="Reference number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Boolean flags */}
                <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
                  <FormField
                    control={form.control}
                    name="is_private"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="font-normal">Private</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="executed"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="font-normal">Executed</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="field_change"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="font-normal">Field Change</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paid_in_full"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="font-normal">Paid in Full</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </PageShell>
    );
  }

  // --- View mode -------------------------------------------------------------
  const pageTitle = co.title || co.description || "Untitled Commitment CO";

  return (
    <>
      <PageShell
        variant="detail"
        title={pageTitle}
        description={co.change_order_number ? `CO ${co.change_order_number}` : undefined}
        statusBadge={<StatusBadge status={statusLabel(co.status)} />}
        onBack={handleBack}
        actions={
          <div className="flex items-center gap-1.5">
            {co.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRejectDialog(true)}
                  className="border-destructive text-destructive hover:bg-destructive/10"
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={handleApprove}
                >
                  <Check />
                  Approve
                </Button>
              </>
            )}
            <Button variant="default" size="sm" onClick={() => setIsEditing(true)}>
              <Edit />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      >
        <ContentSectionStack>
          {/* Details + Sidebar */}
          <section>
            <div className="grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
              {/* Left: main details */}
              <div className="space-y-6">
                <SectionRuleHeading label="Details" className="[&_span]:text-primary" />
                <dl className="space-y-4 text-sm">
                  <LabelValueRow label="CO Number">
                    {co.change_order_number || "—"}
                  </LabelValueRow>
                  {co.title && (
                    <LabelValueRow label="Title">
                      {co.title}
                    </LabelValueRow>
                  )}
                  <LabelValueRow
                    label="Description"
                    valueClassName="leading-relaxed font-normal text-foreground whitespace-pre-wrap"
                  >
                    {co.description || "—"}
                  </LabelValueRow>
                  <LabelValueRow label="Status">
                    <StatusBadge status={statusLabel(co.status)} />
                  </LabelValueRow>
                  <LabelValueRow label="Amount">
                    {formatCurrency(co.amount)}
                  </LabelValueRow>
                  {co.change_reason && (
                    <LabelValueRow label="Change Reason">
                      {co.change_reason}
                    </LabelValueRow>
                  )}
                  {co.designated_reviewer && (
                    <LabelValueRow label="Designated Reviewer">
                      {co.designated_reviewer}
                    </LabelValueRow>
                  )}
                  {co.location && (
                    <LabelValueRow label="Location">
                      {co.location}
                    </LabelValueRow>
                  )}
                  {co.reference && (
                    <LabelValueRow label="Reference">
                      {co.reference}
                    </LabelValueRow>
                  )}
                  {co.schedule_impact != null && (
                    <LabelValueRow label="Schedule Impact">
                      {co.schedule_impact} {Math.abs(co.schedule_impact) === 1 ? "day" : "days"}
                    </LabelValueRow>
                  )}
                </dl>
                {/* Boolean flags — only show when true */}
                {(co.is_private || co.executed || co.field_change || co.paid_in_full) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {co.is_private && (
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                        Private
                      </span>
                    )}
                    {co.executed && (
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                        Executed
                      </span>
                    )}
                    {co.field_change && (
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                        Field Change
                      </span>
                    )}
                    {co.paid_in_full && (
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                        Paid in Full
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Right: key dates */}
              <div className="space-y-8">
                <div className="space-y-4">
                  <SectionRuleHeading label="Key Dates" className="[&_span]:text-primary" />
                  <div className="rounded-md border border-border bg-muted p-6">
                    <dl className="space-y-3 text-sm">
                      <LabelValueRow label="Created">
                        {formatDate(co.created_at)}
                      </LabelValueRow>
                      {co.requested_date && (
                        <LabelValueRow label="Requested">
                          {formatDate(co.requested_date)}
                        </LabelValueRow>
                      )}
                      {co.due_date && (
                        <LabelValueRow label="Due">
                          {formatDate(co.due_date)}
                        </LabelValueRow>
                      )}
                      {co.invoiced_date && (
                        <LabelValueRow label="Invoiced">
                          {formatDate(co.invoiced_date)}
                        </LabelValueRow>
                      )}
                      {co.approved_date && (
                        <LabelValueRow label="Approved">
                          {formatDate(co.approved_date)}
                        </LabelValueRow>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Line Items */}
          <section className="space-y-4">
            <SectionRuleHeading label="Line Items" className="[&_span]:text-primary" />
            {lineItemsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <InlineTable variant="read">
                <InlineTableHeader>
                  <InlineTableHeaderRow>
                    <InlineTableHeaderCell>Description</InlineTableHeaderCell>
                    <InlineTableHeaderCell>Cost Code</InlineTableHeaderCell>
                    <InlineTableHeaderCell>Cost Type</InlineTableHeaderCell>
                    <InlineTableHeaderCell align="right">Amount</InlineTableHeaderCell>
                    <InlineTableHeaderCell align="right" className="w-24">Actions</InlineTableHeaderCell>
                  </InlineTableHeaderRow>
                </InlineTableHeader>
                <InlineTableBody>
                  {lineItems.map((item) =>
                    editingLineItemId === item.id ? (
                      <InlineTableRow key={item.id}>
                        <InlineTableCell className="pr-2">
                          <Input
                            value={lineItemDraft.description}
                            onChange={(e) =>
                              setLineItemDraft((d) => ({ ...d, description: e.target.value }))
                            }
                            placeholder="Description"
                            className="h-8 text-sm"
                            autoFocus
                          />
                        </InlineTableCell>
                        <InlineTableCell className="px-2">{renderCostCodeSelect}</InlineTableCell>
                        <InlineTableCell className="px-2">{renderCostTypeSelect}</InlineTableCell>
                        <InlineTableCell className="px-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={lineItemDraft.amount}
                            onChange={(e) =>
                              setLineItemDraft((d) => ({ ...d, amount: e.target.value }))
                            }
                            placeholder=""
                            className="h-8 text-sm text-right"
                          />
                        </InlineTableCell>
                        <InlineTableCell align="right" className="pl-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-primary"
                              onClick={handleUpdateLineItem}
                              disabled={lineItemSaving}
                              aria-label="Save line item"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground"
                              onClick={cancelLineItemEdit}
                              disabled={lineItemSaving}
                              aria-label="Cancel edit"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </InlineTableCell>
                      </InlineTableRow>
                    ) : (
                      <InlineTableRow key={item.id}>
                        <InlineTableCell>{item.description || "—"}</InlineTableCell>
                        <InlineTableCell className="text-muted-foreground">{costCodeLabel(item.cost_code_id)}</InlineTableCell>
                        <InlineTableCell className="text-muted-foreground">{costTypeLabel(item.cost_type_id)}</InlineTableCell>
                        <InlineTableCell align="right">{formatCurrency(item.amount)}</InlineTableCell>
                        <InlineTableCell align="right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => startEditLineItem(item)}
                              aria-label={`Edit line item ${item.description || ""}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteLineItem(item.id)}
                              aria-label={`Delete line item ${item.description || ""}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </InlineTableCell>
                      </InlineTableRow>
                    ),
                  )}
                  {/* Inline add row */}
                  {addingLineItem && (
                    <InlineTableRow>
                      <InlineTableCell className="pr-2">
                        <Input
                          value={lineItemDraft.description}
                          onChange={(e) =>
                            setLineItemDraft((d) => ({ ...d, description: e.target.value }))
                          }
                          placeholder="Description"
                          className="h-8 text-sm"
                          autoFocus
                        />
                      </InlineTableCell>
                      <InlineTableCell className="px-2">{renderCostCodeSelect}</InlineTableCell>
                      <InlineTableCell className="px-2">{renderCostTypeSelect}</InlineTableCell>
                      <InlineTableCell className="px-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={lineItemDraft.amount}
                          onChange={(e) =>
                            setLineItemDraft((d) => ({ ...d, amount: e.target.value }))
                          }
                          placeholder=""
                          className="h-8 text-sm text-right"
                        />
                      </InlineTableCell>
                      <InlineTableCell align="right" className="pl-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-primary"
                            onClick={handleAddLineItem}
                            disabled={lineItemSaving}
                            aria-label="Save new line item"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground"
                            onClick={cancelLineItemEdit}
                            disabled={lineItemSaving}
                            aria-label="Cancel add"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </InlineTableCell>
                    </InlineTableRow>
                  )}
                  {/* Subtotal row when markup rows exist */}
                  {computedMarkups.length > 0 && (
                    <InlineTableRow className="border-t font-medium">
                      <InlineTableCell colSpan={3}>Subtotal</InlineTableCell>
                      <InlineTableCell align="right">{formatCurrency(lineItemSubtotal)}</InlineTableCell>
                      <InlineTableCell />
                    </InlineTableRow>
                  )}
                  {/* Vertical markup rows */}
                  {computedMarkups.map((markup) => (
                    <InlineTableRow
                      key={markup.id}
                      type="markup"
                      className="text-muted-foreground"
                    >
                      <InlineTableCell colSpan={2} className="pl-4">
                        {getMarkupLabel(markup.markup_type)}
                      </InlineTableCell>
                      <InlineTableCell align="right">
                        {markup.percentage.toFixed(2)}%
                      </InlineTableCell>
                      <InlineTableCell align="right">
                        {formatCurrency(markup.amount)}
                      </InlineTableCell>
                      <InlineTableCell />
                    </InlineTableRow>
                  ))}
                </InlineTableBody>
                <InlineTableFooter>
                  <InlineTableFooterRow type="totals">
                    <InlineTableFooterCell colSpan={3}>Total</InlineTableFooterCell>
                    <InlineTableFooterCell align="right">
                      {formatCurrency(grandTotal)}
                    </InlineTableFooterCell>
                    <InlineTableFooterCell />
                  </InlineTableFooterRow>
                </InlineTableFooter>
              </InlineTable>
            )}
            {!addingLineItem && !editingLineItemId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAddingLineItem(true);
                  setEditingLineItemId(null);
                  setLineItemDraft(emptyDraft);
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Line Item
              </Button>
            )}
          </section>

          {/* Attachments */}
          <section className="space-y-4">
            <SectionRuleHeading label="Attachments" className="[&_span]:text-primary" />
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  document.getElementById("cco-attachment-upload")?.click()
                }
              >
                Upload File
              </Button>
              <input
                id="cco-attachment-upload"
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                aria-label="Upload attachment"
              />
            </div>
            {attachmentsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : attachmentsError ? (
              <p className="text-sm text-destructive">{attachmentsError}</p>
            ) : attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attachments yet.</p>
            ) : (
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{att.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {(att.fileSize / 1024).toFixed(0)} KB
                        {att.uploadedAt &&
                          ` — ${new Date(att.uploadedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      aria-label={`Delete attachment ${att.fileName}`}
                      onClick={() => handleDeleteAttachment(att.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Rejection reason */}
          {co.rejection_reason && (
            <section className="space-y-4">
              <SectionRuleHeading
                label="Rejection Reason"
                className="[&_span]:text-destructive"
              />
              <p className="text-sm text-foreground">{co.rejection_reason}</p>
            </section>
          )}
        </ContentSectionStack>
      </PageShell>

      {/* Rejection dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Reject Change Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please provide a reason for rejecting this change order.
              </p>
              <Textarea
                placeholder="Rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectionReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleReject}
                  disabled={!rejectionReason.trim()}
                >
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
