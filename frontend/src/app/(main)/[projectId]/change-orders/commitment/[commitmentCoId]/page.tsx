"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Edit, MoreHorizontal, Trash2, X } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { StatusBadge } from "@/components/ds";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types & schema
// ---------------------------------------------------------------------------

interface CommitmentCOData {
  id: string;
  change_order_number: string | null;
  description: string | null;
  status: string | null;
  amount: number | null;
  contract_id: string | null;
  requested_by: string | null;
  requested_date: string | null;
  approved_by: string | null;
  approved_date: string | null;
  rejection_reason: string | null;
  created_at: string | null;
}

const editSchema = z.object({
  change_order_number: z.string().min(1, "Number is required"),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["pending", "approved", "rejected"]),
  amount: z.number(),
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
  return status.charAt(0).toUpperCase() + status.slice(1);
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
  });

  // We need the contract_id to build the API URL — fetch it first from the list
  // by querying the CO directly. The existing API requires contract_id in the path.
  const [contractId, setContractId] = useState<string | null>(null);

  // Line items
  interface LineItem {
    id: string;
    description: string | null;
    amount: number;
  }
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [lineItemsLoading, setLineItemsLoading] = useState(true);

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

  // Fetch data — we use a direct Supabase query via a lightweight API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // First, find this CO and its contract_id by fetching all commitment COs
        // and filtering client-side. This is a pragmatic approach since we don't
        // have a direct lookup route without contract_id.
        const res = await fetch(`/api/projects/${projectId}/commitment-change-orders/${commitmentCoId}`);

        if (res.ok) {
          const data = await res.json();
          setCo(data);
          setContractId(data.contract_id);
          return;
        }

        // Fallback: try via the contracts path if we can determine contract_id
        // For now, show error
        throw new Error("Failed to fetch change order");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [projectId, commitmentCoId]);

  // Fetch line items from Supabase when CO loads
  useEffect(() => {
    if (!co) return;
    const fetchLineItems = async () => {
      setLineItemsLoading(true);
      try {
        const supabase = createClient();
        const { data, error: fetchErr } = await supabase
          .from("commitment_change_order_lines")
          .select("id, description, amount")
          .eq("commitment_change_order_id", commitmentCoId)
          .order("created_at", { ascending: true });

        if (fetchErr) throw fetchErr;
        setLineItems(data ?? []);
      } catch {
        // Silently fail — line items are supplementary
        setLineItems([]);
      } finally {
        setLineItemsLoading(false);
      }
    };
    fetchLineItems();
  }, [co, commitmentCoId]);

  // Fetch attachments
  const fetchAttachmentsFn = useCallback(async () => {
    setAttachmentsLoading(true);
    setAttachmentsError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/commitment-change-orders/${commitmentCoId}/attachments`);
      if (res.ok) {
        const json = await res.json();
        setAttachments(json.data ?? []);
      } else {
        const errJson = await res.json().catch(() => null);
        throw new Error((errJson as { error?: string } | null)?.error ?? "Failed to fetch attachments");
      }
    } catch (err) {
      console.error("Failed to fetch attachments:", err);
      setAttachmentsError(err instanceof Error ? err.message : "Failed to fetch attachments");
      // Keep existing attachments; don't reset to [] on transient failures
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

  useEffect(() => {
    if (!co) return;
    form.reset({
      change_order_number: co.change_order_number || "",
      description: co.description || "",
      status: (co.status as FormData["status"]) || "pending",
      amount: co.amount ?? 0,
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
        `/api/projects/${projectId}/contracts/${contractId}/change-orders/${commitmentCoId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update");
      }
      const updated = await res.json();
      setCo(updated);
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
        `/api/projects/${projectId}/contracts/${contractId}/change-orders/${commitmentCoId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
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
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/change-orders/${commitmentCoId}/approve`,
        { method: "POST" },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to approve");
      }
      const updated = await res.json();
      setCo(updated);
      toast.success("Change order approved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    }
  }, [co, contractId, projectId, commitmentCoId]);

  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const handleReject = useCallback(async () => {
    if (!co || !contractId || !rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    try {
      const res = await fetch(
        `/api/projects/${projectId}/contracts/${contractId}/change-orders/${commitmentCoId}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rejection_reason: rejectionReason }),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reject");
      }
      const updated = await res.json();
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
      <PageShell variant="detail" title="Error" description="Failed to load change order" onBack={handleBack}>
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
        title={`Edit ${co.change_order_number || `CCO`}`}
        description="Update commitment change order"
        onBack={() => setIsEditing(false)}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button size="sm" onClick={form.handleSubmit(handleSave)} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        }
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="change_order_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CO Number *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 000582" />
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
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} />
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
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
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
              </CardContent>
            </Card>
          </form>
        </Form>
      </PageShell>
    );
  }

  // --- View mode -------------------------------------------------------------
  const pageTitle = co.change_order_number
    ? `${co.change_order_number} — ${co.description || "Untitled"}`
    : co.description || "Untitled Commitment CO";

  return (
    <>
      <PageShell
        variant="detail"
        title={pageTitle}
        statusBadge={<StatusBadge status={statusLabel(co.status)} />}
        onBack={handleBack}
        actions={
          <div className="flex items-center gap-2">
            {co.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRejectDialog(true)}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={handleApprove}
                  className="bg-green-600 hover:bg-green-700 text-white"
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
        {/* KPI row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(co.amount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Requested Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">{formatDate(co.requested_date)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approved Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">{formatDate(co.approved_date)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">CO Number</span>
              <span className="text-sm font-medium">{co.change_order_number || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Description</span>
              <span className="max-w-md text-right text-sm">{co.description || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <StatusBadge status={statusLabel(co.status)} />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="text-sm font-medium">{formatCurrency(co.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Requested Date</span>
              <span className="text-sm">{formatDate(co.requested_date)}</span>
            </div>
            {co.approved_date && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Approved Date</span>
                <span className="text-sm">{formatDate(co.approved_date)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Created</span>
              <span className="text-sm">{formatDate(co.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            {lineItemsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : lineItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No line items</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Description</th>
                      <th className="pb-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2">{item.description || "—"}</td>
                        <td className="py-2 text-right">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-medium">
                      <td className="pt-2">Total</td>
                      <td className="pt-2 text-right">
                        {formatCurrency(lineItems.reduce((sum, item) => sum + (item.amount ?? 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("cco-attachment-upload")?.click()}
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
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{att.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {(att.fileSize / 1024).toFixed(0)} KB
                        {att.uploadedAt && ` — ${new Date(att.uploadedAt).toLocaleDateString()}`}
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
          </CardContent>
        </Card>

        {/* Rejection reason */}
        {co.rejection_reason && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Rejection Reason</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{co.rejection_reason}</p>
            </CardContent>
          </Card>
        )}
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
              <div className="flex justify-end gap-2">
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
