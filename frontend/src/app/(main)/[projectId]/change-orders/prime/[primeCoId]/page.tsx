"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Edit,
  FileUp,
  Link2,
  List,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import {
  EmptyState,
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
import { useVerticalMarkup } from "@/hooks/use-vertical-markup";
import {
  ContentSectionStack,
  LabelValueRow,
  PageShell,
  SectionRuleHeading,
  SummaryValueRow,
} from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LineItem {
  id: number;
  pcco_id: number;
  pco_id: number | null;
  description: string | null;
  quantity: number | null;
  unit_cost: number | null;
  line_amount: number | null;
  cost_code: string | null;
  uom: string | null;
  created_at: string | null;
}

interface ContractInfo {
  id: string;
  contract_number: string;
  title: string | null;
  original_contract_value: number | null;
  revised_contract_value: number | null;
}

interface PrimeCO {
  id: number;
  pcco_number: string | null;
  title: string;
  description: string | null;
  status: string | null;
  total_amount: number | null;
  contract_id: string | null;
  prime_contract_id: string | null;
  executed: boolean | null;
  revision: number | null;
  change_reason: string | null;
  is_private: boolean | null;
  schedule_impact: number | null;
  field_change: boolean | null;
  reference: string | null;
  paid_in_full: boolean | null;
  signed_co_received_date: string | null;
  request_received_from: string | null;
  location: string | null;
  due_date: string | null;
  invoiced_date: string | null;
  created_by: string | null;
  contract_company: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string | null;
  project_id: number | null;
  rejection_reason: string | null;
  designated_reviewer: string | null;
  review_date: string | null;
  revised_substantial_completion_date: string | null;
  line_items: LineItem[];
  contract: ContractInfo | null;
}

interface PrimeContractOption {
  id: string;
  contract_number: string;
  title: string | null;
}

// ---------------------------------------------------------------------------
// Edit schema
// ---------------------------------------------------------------------------

const editSchema = z.object({
  pcco_number: z.string().min(1, "Number is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  status: z.string().min(1, "Status is required"),
  total_amount: z.number(),
  prime_contract_id: z.string().nullable().optional(),
  revision: z.number().nullable().optional(),
  change_reason: z.string().nullable().optional(),
  is_private: z.boolean().optional(),
  schedule_impact: z.number().nullable().optional(),
  field_change: z.boolean().optional(),
  reference: z.string().nullable().optional(),
  paid_in_full: z.boolean().optional(),
  signed_co_received_date: z.string().nullable().optional(),
  request_received_from: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  executed: z.boolean().optional(),
  contract_company: z.string().nullable().optional(),
  rejection_reason: z.string().nullable().optional(),
  designated_reviewer: z.string().nullable().optional(),
  review_date: z.string().nullable().optional(),
  revised_substantial_completion_date: z.string().nullable().optional(),
});

type FormData = z.infer<typeof editSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STATUS_OPTIONS = [
  "draft",
  "proposed",
  "out_for_signature",
  "approved",
  "rejected",
  "executed",
  "void",
];

function statusLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const CHANGE_REASONS = [
  "Client Request",
  "Design Error",
  "Design Omission",
  "Field Condition",
  "Owner Request",
  "Regulatory Requirement",
  "Scope Change",
  "Unforeseen Condition",
  "Value Engineering",
  "Other",
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PrimeContractCODetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const projectId = params.projectId as string;
  const primeCoId = params.primeCoId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [co, setCo] = useState<PrimeCO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [primeContracts, setPrimeContracts] = useState<PrimeContractOption[]>(
    [],
  );

  // Attachments
  interface Attachment {
    id: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
  }
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(true);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);

  // Line Items (inline CRUD)
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [lineItemsLoading, setLineItemsLoading] = useState(true);
  const [editingLineItemId, setEditingLineItemId] = useState<number | null>(null);
  const [addingLineItem, setAddingLineItem] = useState(false);
  const [lineItemForm, setLineItemForm] = useState({
    description: "",
    cost_code: "",
    quantity: "",
    uom: "",
    unit_cost: "",
  });
  const [lineItemSaving, setLineItemSaving] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      pcco_number: "",
      title: "",
      description: "",
      status: "draft",
      total_amount: 0,
      prime_contract_id: null,
      revision: 0,
      change_reason: null,
      is_private: false,
      schedule_impact: null,
      field_change: false,
      reference: null,
      paid_in_full: false,
      signed_co_received_date: null,
      request_received_from: null,
      location: null,
      due_date: null,
      executed: false,
      contract_company: null,
      rejection_reason: null,
      designated_reviewer: null,
      review_date: null,
      revised_substantial_completion_date: null,
    },
  });

  const apiBase = `/api/projects/${projectId}/prime-contract-change-orders/${primeCoId}`;

  // ---- Vertical Markup ----------------------------------------------------
  const { markupRows } = useVerticalMarkup(
    projectId ? Number(projectId) : undefined,
  );

  // ---- Line Items CRUD -----------------------------------------------------
  const fetchLineItems = useCallback(async () => {
    setLineItemsLoading(true);
    try {
      const res = await fetch(`${apiBase}/line-items`);
      if (!res.ok) throw new Error("Failed to fetch line items");
      const json = await res.json();
      setLineItems(json.data ?? []);
    } catch (err) {
      console.error("Failed to fetch line items:", err);
    } finally {
      setLineItemsLoading(false);
    }
  }, [apiBase]);

  const resetLineItemForm = useCallback(() => {
    setLineItemForm({
      description: "",
      cost_code: "",
      quantity: "",
      uom: "",
      unit_cost: "",
    });
  }, []);

  const startAddLineItem = useCallback(() => {
    setEditingLineItemId(null);
    resetLineItemForm();
    setAddingLineItem(true);
  }, [resetLineItemForm]);

  const startEditLineItem = useCallback((item: LineItem) => {
    setAddingLineItem(false);
    setEditingLineItemId(item.id);
    setLineItemForm({
      description: item.description ?? "",
      cost_code: item.cost_code ?? "",
      quantity: item.quantity != null ? String(item.quantity) : "",
      uom: item.uom ?? "",
      unit_cost: item.unit_cost != null ? String(item.unit_cost) : "",
    });
  }, []);

  const cancelLineItemEdit = useCallback(() => {
    setAddingLineItem(false);
    setEditingLineItemId(null);
    resetLineItemForm();
  }, [resetLineItemForm]);

  const handleSaveLineItem = useCallback(async () => {
    setLineItemSaving(true);
    try {
      const payload = {
        description: lineItemForm.description || null,
        cost_code: lineItemForm.cost_code || null,
        quantity: lineItemForm.quantity ? Number(lineItemForm.quantity) : 0,
        uom: lineItemForm.uom || null,
        unit_cost: lineItemForm.unit_cost ? Number(lineItemForm.unit_cost) : 0,
      };

      if (editingLineItemId) {
        // Update existing
        const res = await fetch(
          `${apiBase}/line-items/${editingLineItemId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Update failed" }));
          throw new Error(err.error || "Failed to update line item");
        }
        toast.success("Line item updated");
      } else {
        // Create new
        const res = await fetch(`${apiBase}/line-items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Create failed" }));
          throw new Error(err.error || "Failed to create line item");
        }
        toast.success("Line item added");
      }

      cancelLineItemEdit();
      fetchLineItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save line item");
    } finally {
      setLineItemSaving(false);
    }
  }, [
    apiBase,
    editingLineItemId,
    lineItemForm,
    cancelLineItemEdit,
    fetchLineItems,
  ]);

  const handleDeleteLineItem = useCallback(
    async (lineItemId: number) => {
      try {
        const res = await fetch(`${apiBase}/line-items/${lineItemId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Delete failed" }));
          throw new Error(err.error || "Failed to delete line item");
        }
        toast.success("Line item deleted");
        fetchLineItems();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete line item");
      }
    },
    [apiBase, fetchLineItems],
  );

  const computedLineItemAmount =
    (lineItemForm.quantity ? Number(lineItemForm.quantity) : 0) *
    (lineItemForm.unit_cost ? Number(lineItemForm.unit_cost) : 0);

  // ---- Fetch attachments ---------------------------------------------------
  const fetchAttachments = useCallback(async () => {
    setAttachmentsLoading(true);
    setAttachmentsError(null);
    try {
      const res = await fetch(`${apiBase}/attachments`);
      if (!res.ok) throw new Error("Failed to fetch attachments");
      const json = await res.json();
      setAttachments(json.data ?? []);
    } catch (err) {
      console.error("Failed to fetch attachments:", err);
      setAttachmentsError(
        err instanceof Error ? err.message : "Failed to fetch attachments",
      );
    } finally {
      setAttachmentsLoading(false);
    }
  }, [apiBase]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`${apiBase}/attachments`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(err.error || "Upload failed");
        }
        toast.success("File uploaded");
        fetchAttachments();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
      e.target.value = "";
    },
    [apiBase, fetchAttachments],
  );

  const handleDeleteAttachment = useCallback(
    async (attachmentId: string) => {
      try {
        const res = await fetch(`${apiBase}/attachments/${attachmentId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const err = await res
            .json()
            .catch(() => ({ error: "Delete failed" }));
          throw new Error(err.error || "Delete failed");
        }
        toast.success("Attachment deleted");
        fetchAttachments();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed");
      }
    },
    [apiBase, fetchAttachments],
  );

  // ---- Fetch data ----------------------------------------------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [coRes, contractsRes] = await Promise.all([
          fetch(apiBase),
          fetch(`/api/projects/${projectId}/contracts`),
        ]);
        if (!coRes.ok) throw new Error("Failed to fetch change order");
        const data = await coRes.json();
        setCo(data);
        if (contractsRes.ok) {
          const contractsData = await contractsRes.json();
          setPrimeContracts(
            (contractsData as PrimeContractOption[]).map((c) => ({
              id: c.id,
              contract_number: c.contract_number,
              title: c.title,
            })),
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    fetchAttachments();
    fetchLineItems();
  }, [apiBase, projectId, fetchAttachments, fetchLineItems]);

  useEffect(() => {
    if (searchParams.get("edit") === "1") setIsEditing(true);
  }, [searchParams]);

  useEffect(() => {
    if (!co) return;
    form.reset({
      pcco_number: co.pcco_number || "",
      title: co.title || "",
      description: co.description || "",
      status: (co.status || "draft") as FormData["status"],
      total_amount: co.total_amount ?? 0,
      prime_contract_id: co.prime_contract_id ?? null,
      revision: co.revision ?? 0,
      change_reason: co.change_reason ?? null,
      is_private: co.is_private ?? false,
      schedule_impact: co.schedule_impact ?? null,
      field_change: co.field_change ?? false,
      reference: co.reference ?? null,
      paid_in_full: co.paid_in_full ?? false,
      signed_co_received_date: co.signed_co_received_date ?? null,
      request_received_from: co.request_received_from ?? null,
      location: co.location ?? null,
      due_date: co.due_date ?? null,
      executed: co.executed ?? false,
      contract_company: co.contract_company ?? null,
      rejection_reason: co.rejection_reason ?? null,
      designated_reviewer: co.designated_reviewer ?? null,
      review_date: co.review_date ?? null,
      revised_substantial_completion_date: co.revised_substantial_completion_date ?? null,
    });
    // Explicitly set status after reset — shadcn Select doesn't always pick up
    // the value from form.reset() when the field was previously untouched.
    form.setValue("status", (co.status || "draft") as FormData["status"]);
  }, [co, form]);

  // ---- Handlers ------------------------------------------------------------
  const handleBack = useCallback(() => {
    router.push(`/${projectId}/change-orders?tab=prime`);
  }, [router, projectId]);

  const handleSave: SubmitHandler<FormData> = async (data) => {
    setIsSaving(true);
    try {
      // Status changes must go through approve/reject endpoints, not PUT
      const { status: _status, ...updateData } = data;
      const res = await fetch(apiBase, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error || "Failed to update",
        );
      }
      const updated = await res.json();
      // Re-fetch full data to get line_items and contract
      const fullRes = await fetch(apiBase);
      if (fullRes.ok) {
        setCo(await fullRes.json());
      } else {
        setCo({ ...co!, ...updated });
      }
      setIsEditing(false);
      toast.success("Change order updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = useCallback(async () => {
    if (!co || !confirm(`Delete change order ${co.pcco_number || co.title}?`))
      return;
    try {
      const res = await fetch(apiBase, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      toast.success("Change order deleted");
      router.push(`/${projectId}/change-orders?tab=prime`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }, [co, apiBase, router, projectId]);

  const handleApprove = useCallback(async () => {
    if (!co) return;
    try {
      const res = await fetch(`${apiBase}/approve`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to approve");
      }
      const updated = await res.json();
      setCo((prev) => (prev ? { ...prev, ...updated } : prev));
      toast.success("Change order approved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    }
  }, [co, apiBase]);

  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const handleReject = useCallback(async () => {
    if (!co || !rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    try {
      const res = await fetch(`${apiBase}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejection_reason: rejectionReason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reject");
      }
      const updated = await res.json();
      setCo((prev) => (prev ? { ...prev, ...updated } : prev));
      setShowRejectDialog(false);
      setRejectionReason("");
      toast.success("Change order rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    }
  }, [co, apiBase, rejectionReason]);

  // ---- Vertical markup (must be before early returns) ----------------------
  const lineItemsTotal =
    lineItems.reduce((sum, li) => sum + (li.line_amount ?? 0), 0);

  const MARKUP_LABELS: Record<string, string> = {
    insurance: "Insurance",
    bond: "Bond",
    fee: "Contractor Fee",
    overhead: "Overhead",
    custom: "Custom",
  };

  const computedMarkups = useMemo(() => {
    if (markupRows.length === 0) return [];
    const sorted = [...markupRows].sort(
      (a, b) => a.calculation_order - b.calculation_order,
    );
    let runningBase = lineItemsTotal;
    return sorted.map((markup) => {
      const amount = runningBase * (markup.percentage / 100);
      if (markup.compound) {
        runningBase += amount;
      }
      return { ...markup, amount };
    });
  }, [markupRows, lineItemsTotal]);

  const markupTotal = useMemo(
    () => computedMarkups.reduce((sum, m) => sum + m.amount, 0),
    [computedMarkups],
  );

  const grandTotal = lineItemsTotal + markupTotal;

  // ---- Loading state -------------------------------------------------------
  if (isLoading) {
    return (
      <PageShell variant="detail" title="Loading...">
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

  // ---- Error state ---------------------------------------------------------
  if (error || !co) {
    return (
      <PageShell variant="detail" title="Error" onBack={handleBack}>
        <div className="text-center text-destructive">
          {error || "Not found"}
        </div>
        <div className="mt-4 flex justify-center">
          <Button onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Change Orders
          </Button>
        </div>
      </PageShell>
    );
  }

  // ---- Edit mode -----------------------------------------------------------
  if (isEditing) {
    return (
      <PageShell
        variant="form"
        title={`Edit ${co.pcco_number || `PCCO #${co.id}`}`}
        onBack={() => setIsEditing(false)}
        actions={
          <div className="flex items-center gap-2">
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
          <form
            onSubmit={form.handleSubmit(handleSave)}
            className="space-y-8"
          >
            {/* General Information */}
            <section className="space-y-6">
              <SectionRuleHeading
                label="General Information"
                className="[&_span]:text-primary"
              />
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="pcco_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>#</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 002" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="revision"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Revision</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? 0}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contract_company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Company</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="e.g. Vargo, LLC"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="prime_contract_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract</FormLabel>
                      <Select
                        onValueChange={(val) =>
                          field.onChange(val === "__none__" ? null : val)
                        }
                        value={field.value ?? "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Not assigned" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Not assigned</SelectItem>
                          {primeContracts.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.contract_number} — {c.title || "Untitled"}
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
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {statusLabel(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Use Approve / Reject actions to change status.
                      </p>
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
                        onValueChange={(val) =>
                          field.onChange(val === "__none__" ? null : val)
                        }
                        value={field.value ?? "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {CHANGE_REASONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={4}
                          placeholder="Describe the change..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* Financial & Schedule */}
            <section className="space-y-6">
              <SectionRuleHeading
                label="Financial & Schedule"
                className="[&_span]:text-primary"
              />
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="total_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
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
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseInt(e.target.value)
                                : null,
                            )
                          }
                          placeholder="days"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="request_received_from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request Received From</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Person or company"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                          placeholder="Reference #"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="signed_co_received_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Signed CO Received Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                          placeholder="Name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="review_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="revised_substantial_completion_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Revised Substantial Completion Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rejection_reason"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Rejection Reason</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={3}
                          placeholder="Reason for rejection..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* Flags */}
            <section className="space-y-6">
              <SectionRuleHeading
                label="Flags"
                className="[&_span]:text-primary"
              />
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
                <FormField
                  control={form.control}
                  name="is_private"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
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
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
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
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Field Change
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paid_in_full"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Paid In Full
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </section>
          </form>
        </Form>
      </PageShell>
    );
  }

  // ---- View mode -----------------------------------------------------------
  const pageTitle = co.pcco_number
    ? `PCO for ${co.pcco_number} — ${co.title || "Untitled"}`
    : co.title || "Untitled Prime Contract CO";

  const changeOrderAmount = Number(co.total_amount) || 0;
  const changeOrderStatus = (co.status || "").toLowerCase();
  const approvedAmount = changeOrderStatus === "approved" ? changeOrderAmount : 0;
  const pendingAmount = ["draft", "proposed", "pending"].includes(changeOrderStatus)
    ? changeOrderAmount
    : 0;
  const varianceAmount = changeOrderAmount - lineItemsTotal;
  const renderDateOrDash = (value: string | null | undefined) =>
    value ? formatDate(value) : <span className="text-muted-foreground/60">—</span>;

  return (
    <>
      <PageShell
        variant="detail"
        title=""
        onBack={handleBack}
        titleContent={
          <div className="flex w-full items-center justify-between">
            <h1 className="min-w-0 truncate text-xl font-semibold">{pageTitle}</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleApprove}>
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowRejectDialog(true)}>
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a
                    href={`/api/projects/${projectId}/prime-contract-change-orders/export?status=${co.status}`}
                    download
                  >
                    <FileUp className="mr-2 h-4 w-4" />
                    Export CSV
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
        <Tabs defaultValue="general">
          <TabsList variant="line" className="-mb-px mb-2 w-full justify-start gap-0">
            <TabsTrigger value="general" className="px-3 py-1.5 text-xs">
              General
            </TabsTrigger>
            <TabsTrigger value="related" className="px-3 py-1.5 text-xs">
              Related Items (0)
            </TabsTrigger>
            <TabsTrigger value="emails" className="px-3 py-1.5 text-xs">
              Emails (0)
            </TabsTrigger>
            <TabsTrigger value="history" className="px-3 py-1.5 text-xs">
              Change History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <ContentSectionStack>
              {/* ── General Section: Three-column layout parity with prime contract detail ── */}
              <section>
                <div className="grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 gap-x-14 gap-y-8 sm:grid-cols-2">
                      <div className="space-y-6">
                        <SectionRuleHeading
                          label="Details"
                          className="[&_span]:text-primary"
                        />
                        <dl className="space-y-4 text-sm">
                          <LabelValueRow label="#">
                            {co.pcco_number || "—"}
                          </LabelValueRow>
                          <LabelValueRow label="Title">
                            {co.title || "—"}
                          </LabelValueRow>
                          <LabelValueRow label="Status">
                            <StatusBadge status={co.status || "Unknown"} />
                          </LabelValueRow>
                          <LabelValueRow label="Contract Company">
                            {co.contract_company || "—"}
                          </LabelValueRow>
                          <LabelValueRow label="Contract">
                            {co.contract ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                                onClick={() =>
                                  router.push(
                                    `/${projectId}/prime-contracts/${co.contract!.id}`,
                                  )
                                }
                              >
                                <Link2 className="h-3 w-3" />
                                {co.contract.contract_number} —{" "}
                                {co.contract.title || "Prime"}
                              </button>
                            ) : (
                              "—"
                            )}
                          </LabelValueRow>
                        </dl>
                      </div>

                      <div className="space-y-6">
                        <SectionRuleHeading
                          label="Attributes"
                          className="[&_span]:text-primary"
                        />
                        <dl className="space-y-4 text-sm">
                          <LabelValueRow label="Revision">
                            {co.revision ?? 0}
                          </LabelValueRow>
                          <LabelValueRow label="Change Reason">
                            {co.change_reason || "—"}
                          </LabelValueRow>
                          <LabelValueRow label="Executed">
                            {co.executed ? "Yes" : "No"}
                          </LabelValueRow>
                          <LabelValueRow label="Private">
                            {co.is_private ? "Yes" : "No"}
                          </LabelValueRow>
                          <LabelValueRow label="Field Change">
                            {co.field_change ? "Yes" : "No"}
                          </LabelValueRow>
                          <LabelValueRow label="Paid In Full">
                            {co.paid_in_full ? "Yes" : "No"}
                          </LabelValueRow>
                        </dl>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <dl className="space-y-4 text-sm">
                        <LabelValueRow
                          label="Description"
                          missing={!co.description}
                          valueClassName="leading-relaxed font-normal text-foreground whitespace-pre-wrap"
                        >
                          {co.description || "Not set"}
                        </LabelValueRow>
                        <LabelValueRow label="Request Received From">
                          {co.request_received_from || "—"}
                        </LabelValueRow>
                        <LabelValueRow label="Location">
                          {co.location || "—"}
                        </LabelValueRow>
                        <LabelValueRow label="Reference">
                          {co.reference || "—"}
                        </LabelValueRow>
                        {co.designated_reviewer && (
                          <LabelValueRow label="Designated Reviewer">
                            {co.designated_reviewer}
                          </LabelValueRow>
                        )}
                      </dl>
                    </div>
                    {co.status === "rejected" && co.rejection_reason && (
                      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
                        <p className="mb-1 text-xs font-medium uppercase text-destructive">
                          Rejection Reason
                        </p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {co.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-4">
                      <SectionRuleHeading
                        label="Financial Summary"
                        className="[&_span]:text-primary"
                      />
                      <div className="rounded-md border border-border bg-muted p-6">
                        <dl className="space-y-3 text-sm">
                          <SummaryValueRow
                            label="Change Order Amount"
                            value={formatCurrency(changeOrderAmount)}
                          />
                          <SummaryValueRow
                            label="Line Items Total"
                            value={formatCurrency(lineItemsTotal)}
                          />
                          <SummaryValueRow
                            label="Variance"
                            value={formatCurrency(varianceAmount)}
                          />
                          <SummaryValueRow
                            label="Approved Amount"
                            value={formatCurrency(approvedAmount)}
                          />
                          <SummaryValueRow
                            label="Pending Amount"
                            value={formatCurrency(pendingAmount)}
                          />
                          <SummaryValueRow
                            label="Schedule Impact"
                            value={
                              co.schedule_impact != null
                                ? `${co.schedule_impact} days`
                                : "—"
                            }
                            bold
                            border
                          />
                        </dl>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <SectionRuleHeading
                        label="Key Dates"
                        className="[&_span]:text-primary"
                      />
                      <div className="rounded-md border border-border bg-muted p-6">
                        <dl className="space-y-3 text-sm">
                          <LabelValueRow label="Date Created">
                            {renderDateOrDash(co.created_at)}
                          </LabelValueRow>
                          <LabelValueRow label="Created By">
                            {co.created_by || "—"}
                          </LabelValueRow>
                          <LabelValueRow label="Submitted">
                            {renderDateOrDash(co.submitted_at)}
                          </LabelValueRow>
                          <LabelValueRow label="Approved">
                            {renderDateOrDash(co.approved_at)}
                          </LabelValueRow>
                          <LabelValueRow label="Due Date">
                            {renderDateOrDash(co.due_date)}
                          </LabelValueRow>
                          <LabelValueRow label="Invoiced Date">
                            {renderDateOrDash(co.invoiced_date)}
                          </LabelValueRow>
                          <LabelValueRow label="Signed CO Received Date">
                            {renderDateOrDash(co.signed_co_received_date)}
                          </LabelValueRow>
                          <LabelValueRow label="Review Date">
                            {renderDateOrDash(co.review_date)}
                          </LabelValueRow>
                          <LabelValueRow label="Revised Substantial Completion">
                            {renderDateOrDash(co.revised_substantial_completion_date)}
                          </LabelValueRow>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Line Items (inline CRUD) ────────────────────── */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <SectionRuleHeading
                    label="Line Items"
                    className="flex-1 [&_span]:text-primary"
                  />
                  {/* Add button only shown in empty state below */}
                </div>

                {lineItemsLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : lineItems.length > 0 || addingLineItem ? (
                  <InlineTable variant="read">
                    <InlineTableHeader>
                      <InlineTableHeaderRow>
                        <InlineTableHeaderCell>#</InlineTableHeaderCell>
                        <InlineTableHeaderCell>Description</InlineTableHeaderCell>
                        <InlineTableHeaderCell>Cost Code</InlineTableHeaderCell>
                        <InlineTableHeaderCell align="right">Qty</InlineTableHeaderCell>
                        <InlineTableHeaderCell>UOM</InlineTableHeaderCell>
                        <InlineTableHeaderCell align="right">Unit Cost</InlineTableHeaderCell>
                        <InlineTableHeaderCell align="right">Amount</InlineTableHeaderCell>
                        <InlineTableHeaderCell className="w-20" />
                      </InlineTableHeaderRow>
                    </InlineTableHeader>
                    <InlineTableBody>
                      {lineItems.map((item, idx) =>
                        editingLineItemId === item.id ? (
                          <InlineTableRow key={item.id} className="bg-muted/50">
                            <InlineTableCell className="text-muted-foreground">
                              {idx + 1}
                            </InlineTableCell>
                            <InlineTableCell className="pr-2">
                              <Input
                                value={lineItemForm.description}
                                onChange={(e) =>
                                  setLineItemForm((f) => ({
                                    ...f,
                                    description: e.target.value,
                                  }))
                                }
                                placeholder="Description"
                                className="h-8"
                              />
                            </InlineTableCell>
                            <InlineTableCell className="pr-2">
                              <Input
                                value={lineItemForm.cost_code}
                                onChange={(e) =>
                                  setLineItemForm((f) => ({
                                    ...f,
                                    cost_code: e.target.value,
                                  }))
                                }
                                placeholder="Cost code"
                                className="h-8 w-28"
                              />
                            </InlineTableCell>
                            <InlineTableCell className="pr-2">
                              <Input
                                type="number"
                                value={lineItemForm.quantity}
                                onChange={(e) =>
                                  setLineItemForm((f) => ({
                                    ...f,
                                    quantity: e.target.value,
                                  }))
                                }
                                placeholder=""
                                className="h-8 w-20 text-right"
                              />
                            </InlineTableCell>
                            <InlineTableCell className="pr-2">
                              <Input
                                value={lineItemForm.uom}
                                onChange={(e) =>
                                  setLineItemForm((f) => ({
                                    ...f,
                                    uom: e.target.value,
                                  }))
                                }
                                placeholder="UOM"
                                className="h-8 w-20"
                              />
                            </InlineTableCell>
                            <InlineTableCell className="pr-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={lineItemForm.unit_cost}
                                onChange={(e) =>
                                  setLineItemForm((f) => ({
                                    ...f,
                                    unit_cost: e.target.value,
                                  }))
                                }
                                placeholder=""
                                className="h-8 w-28 text-right"
                              />
                            </InlineTableCell>
                            <InlineTableCell align="right" className="text-muted-foreground">
                              {formatCurrency(computedLineItemAmount)}
                            </InlineTableCell>
                            <InlineTableCell align="right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={handleSaveLineItem}
                                  disabled={lineItemSaving}
                                >
                                  <Check className="h-4 w-4 text-primary" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={cancelLineItemEdit}
                                  disabled={lineItemSaving}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </InlineTableCell>
                          </InlineTableRow>
                        ) : (
                          <InlineTableRow key={item.id}>
                            <InlineTableCell className="text-muted-foreground">
                              {idx + 1}
                            </InlineTableCell>
                            <InlineTableCell>
                              {item.description || "—"}
                            </InlineTableCell>
                            <InlineTableCell>
                              {item.cost_code || "—"}
                            </InlineTableCell>
                            <InlineTableCell align="right">
                              {item.quantity ?? "—"}
                            </InlineTableCell>
                            <InlineTableCell>{item.uom || "—"}</InlineTableCell>
                            <InlineTableCell align="right">
                              {item.unit_cost != null
                                ? formatCurrency(item.unit_cost)
                                : "—"}
                            </InlineTableCell>
                            <InlineTableCell align="right">
                              {formatCurrency(item.line_amount)}
                            </InlineTableCell>
                            <InlineTableCell align="right">
                              <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => startEditLineItem(item)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() =>
                                    handleDeleteLineItem(item.id)
                                  }
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
                        <InlineTableRow className="bg-muted/50">
                          <InlineTableCell className="text-muted-foreground">
                            {lineItems.length + 1}
                          </InlineTableCell>
                          <InlineTableCell className="pr-2">
                            <Input
                              value={lineItemForm.description}
                              onChange={(e) =>
                                setLineItemForm((f) => ({
                                  ...f,
                                  description: e.target.value,
                                }))
                              }
                              placeholder="Description"
                              className="h-8"
                              autoFocus
                            />
                          </InlineTableCell>
                          <InlineTableCell className="pr-2">
                            <Input
                              value={lineItemForm.cost_code}
                              onChange={(e) =>
                                setLineItemForm((f) => ({
                                  ...f,
                                  cost_code: e.target.value,
                                }))
                              }
                              placeholder="Cost code"
                              className="h-8 w-28"
                            />
                          </InlineTableCell>
                          <InlineTableCell className="pr-2">
                            <Input
                              type="number"
                              value={lineItemForm.quantity}
                              onChange={(e) =>
                                setLineItemForm((f) => ({
                                  ...f,
                                  quantity: e.target.value,
                                }))
                              }
                              placeholder=""
                              className="h-8 w-20 text-right"
                            />
                          </InlineTableCell>
                          <InlineTableCell className="pr-2">
                            <Input
                              value={lineItemForm.uom}
                              onChange={(e) =>
                                setLineItemForm((f) => ({
                                  ...f,
                                  uom: e.target.value,
                                }))
                              }
                              placeholder="UOM"
                              className="h-8 w-20"
                            />
                          </InlineTableCell>
                          <InlineTableCell className="pr-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={lineItemForm.unit_cost}
                              onChange={(e) =>
                                setLineItemForm((f) => ({
                                  ...f,
                                  unit_cost: e.target.value,
                                }))
                              }
                              placeholder=""
                              className="h-8 w-28 text-right"
                            />
                          </InlineTableCell>
                          <InlineTableCell align="right" className="text-muted-foreground">
                            {formatCurrency(computedLineItemAmount)}
                          </InlineTableCell>
                          <InlineTableCell align="right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={handleSaveLineItem}
                                disabled={lineItemSaving}
                              >
                                <Check className="h-4 w-4 text-primary" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={cancelLineItemEdit}
                                disabled={lineItemSaving}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </InlineTableCell>
                        </InlineTableRow>
                      )}
                      {/* Vertical Markup rows (read-only) */}
                      {computedMarkups.length > 0 && (
                        <>
                          {/* Subtotal separator */}
                          <InlineTableRow>
                            <InlineTableCell
                              colSpan={6}
                              align="right"
                              className="text-xs font-medium text-muted-foreground"
                            >
                              Subtotal
                            </InlineTableCell>
                            <InlineTableCell align="right" className="text-xs font-medium">
                              {formatCurrency(lineItemsTotal)}
                            </InlineTableCell>
                            <InlineTableCell />
                          </InlineTableRow>
                          {computedMarkups.map((markup) => (
                            <InlineTableRow key={markup.id} type="markup">
                              <InlineTableCell />
                              <InlineTableCell
                                colSpan={4}
                                className="text-sm text-muted-foreground"
                              >
                                {MARKUP_LABELS[markup.markup_type] ??
                                  markup.markup_type}
                              </InlineTableCell>
                              <InlineTableCell align="right" className="text-sm text-muted-foreground">
                                {markup.percentage}%
                              </InlineTableCell>
                              <InlineTableCell align="right" className="text-sm">
                                {formatCurrency(markup.amount)}
                              </InlineTableCell>
                              <InlineTableCell />
                            </InlineTableRow>
                          ))}
                        </>
                      )}
                    </InlineTableBody>
                    <InlineTableFooter>
                      <InlineTableFooterRow type="totals">
                        <InlineTableFooterCell colSpan={7}>
                          <div className="flex justify-between">
                            <span>Total</span>
                            <span>{formatCurrency(grandTotal)}</span>
                          </div>
                        </InlineTableFooterCell>
                        <InlineTableFooterCell />
                      </InlineTableFooterRow>
                    </InlineTableFooter>
                  </InlineTable>
                ) : (
                  <EmptyState
                    icon={<List />}
                    title="No line items"
                    description="Add cost line items to this change order"
                    action={{
                      label: "Add Line Item",
                      onClick: startAddLineItem,
                    }}
                  />
                )}
              </section>

              {/* ── Attachments ───────────────────────────────────── */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-1 items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <SectionRuleHeading
                      label="Attachments"
                      className="flex-1 [&_span]:text-primary"
                    />
                  </div>
                  {attachments.length > 0 && (
                    <Button variant="outline" size="sm" asChild>
                      <label className="cursor-pointer">
                        <FileUp className="mr-1 h-4 w-4" />
                        Upload File
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleFileUpload}
                          aria-label="Upload attachment"
                        />
                      </label>
                    </Button>
                  )}
                </div>
                {attachmentsLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : attachmentsError ? (
                  <p className="text-sm text-destructive">{attachmentsError}</p>
                ) : attachments.length === 0 ? (
                  <EmptyState
                    icon={<Paperclip />}
                    title="No attachments"
                    description="Upload files related to this change order"
                    action={{
                      label: "Upload File",
                      onClick: () =>
                        document
                          .getElementById("attachment-upload-empty")
                          ?.click(),
                    }}
                  />
                ) : (
                  <div className="space-y-2">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between rounded-md border border-border px-4 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {att.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {att.fileSize < 1024
                              ? `${att.fileSize} B`
                              : att.fileSize < 1024 * 1024
                                ? `${(att.fileSize / 1024).toFixed(1)} KB`
                                : `${(att.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                            {" · "}
                            {formatDate(att.uploadedAt)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete attachment ${att.fileName}`}
                          onClick={() => handleDeleteAttachment(att.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Hidden input for empty-state upload action */}
                <input
                  id="attachment-upload-empty"
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  aria-label="Upload attachment"
                />
              </section>
            </ContentSectionStack>
          </TabsContent>

          <TabsContent value="related">
            <EmptyState
              icon={<List />}
              title="No related items"
              description="Related change events and PCOs will appear here"
            />
          </TabsContent>

          <TabsContent value="emails">
            <EmptyState
              icon={<Paperclip />}
              title="No emails"
              description="Emails linked to this change order will appear here"
            />
          </TabsContent>

          <TabsContent value="history">
            <EmptyState
              icon={<List />}
              title="No change history"
              description="A log of changes to this record will appear here"
            />
          </TabsContent>
        </Tabs>
      </PageShell>

      {/* Rejection dialog */}
      <Dialog
        open={showRejectDialog}
        onOpenChange={(open) => {
          setShowRejectDialog(open);
          if (!open) setRejectionReason("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Change Order</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this change order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRejectDialog(false)}
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
