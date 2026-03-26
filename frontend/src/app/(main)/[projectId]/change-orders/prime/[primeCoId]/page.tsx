"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Edit, FileUp, MoreHorizontal, Paperclip, Trash2, X } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { StatusBadge } from "@/components/ds";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
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

// ---------------------------------------------------------------------------
// Types & schema
// ---------------------------------------------------------------------------

interface PrimeCO {
  id: number;
  pcco_number: string | null;
  title: string | null;
  status: string | null;
  total_amount: number | null;
  contract_id: number | null;
  prime_contract_id: string | null;
  executed: boolean;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string | null;
  project_id: number | null;
}

interface PrimeContractOption {
  id: string;
  contract_number: string;
  title: string | null;
}

const editSchema = z.object({
  pcco_number: z.string().min(1, "Number is required"),
  title: z.string().min(1, "Title is required"),
  status: z.string().min(1, "Status is required"),
  total_amount: z.number(),
  prime_contract_id: z.string().nullable().optional(),
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
  const [primeContracts, setPrimeContracts] = useState<PrimeContractOption[]>([]);

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

  const form = useForm<FormData>({
    resolver: zodResolver(editSchema),
  });

  const apiBase = `/api/projects/${projectId}/prime-contract-change-orders/${primeCoId}`;

  // Fetch attachments
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
      setAttachmentsError(err instanceof Error ? err.message : "Failed to fetch attachments");
      // Keep existing attachments; don't reset to [] on transient failures
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
      // Reset the input so the same file can be re-uploaded
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
          const err = await res.json().catch(() => ({ error: "Delete failed" }));
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

  // Fetch data
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
  }, [apiBase, projectId, fetchAttachments]);

  useEffect(() => {
    if (searchParams.get("edit") === "1") setIsEditing(true);
  }, [searchParams]);

  useEffect(() => {
    if (!co) return;
    form.reset({
      pcco_number: co.pcco_number || "",
      title: co.title || "",
      status: co.status || "Proposed",
      total_amount: co.total_amount ?? 0,
      prime_contract_id: co.prime_contract_id ?? null,
    });
  }, [co, form]);

  const handleBack = useCallback(() => {
    router.push(`/${projectId}/change-orders?tab=prime`);
  }, [router, projectId]);

  const handleSave: SubmitHandler<FormData> = async (data) => {
    setIsSaving(true);
    try {
      const res = await fetch(apiBase, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
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
    if (!co || !confirm(`Delete change order ${co.pcco_number}?`)) return;
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
      setCo(updated);
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
      setCo(updated);
      setShowRejectDialog(false);
      setRejectionReason("");
      toast.success("Change order rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    }
  }, [co, apiBase, rejectionReason]);

  // --- Loading state ---------------------------------------------------------
  if (isLoading) {
    return (
      <>
        <ProjectPageHeader title="Loading..." description="Loading change order details" />
        <PageContainer>
          <div className="space-y-6">
            <Skeleton className="h-10 w-full max-w-md" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          </div>
        </PageContainer>
      </>
    );
  }

  // --- Error state -----------------------------------------------------------
  if (error || !co) {
    return (
      <>
        <ProjectPageHeader title="Error" description="Failed to load change order" />
        <PageContainer>
          <div className="text-center text-destructive">{error || "Not found"}</div>
          <div className="mt-4 flex justify-center">
            <Button onClick={handleBack}>
              <ArrowLeft />
              Back to Change Orders
            </Button>
          </div>
        </PageContainer>
      </>
    );
  }

  // --- Edit mode -------------------------------------------------------------
  if (isEditing) {
    return (
      <>
        <ProjectPageHeader
          title={`Edit ${co.pcco_number || `PCCO #${co.id}`}`}
          description="Update prime contract change order"
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
        />
        <PageContainer className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="pcco_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PCCO Number *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. 000514" />
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
                        <FormLabel>Title *</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
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
                            <SelectItem value="Proposed">Proposed</SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="Rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="prime_contract_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prime Contract</FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(val === "__none__" ? null : val)}
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
                    name="total_amount"
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
        </PageContainer>
      </>
    );
  }

  // --- View mode -------------------------------------------------------------
  const pageTitle = co.pcco_number
    ? `${co.pcco_number} — ${co.title || "Untitled"}`
    : co.title || "Untitled Prime Contract CO";

  return (
    <>
      <ProjectPageHeader
        title={pageTitle}
        statusBadge={
          <div className="flex items-center gap-2">
            <StatusBadge status={co.status || "Unknown"} />
            {co.executed && <StatusBadge status="Executed" />}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft />
              Back
            </Button>
            {co.status === "Proposed" && (
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
      />
      <PageContainer className="space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(co.total_amount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Executed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-lg font-medium">
                {co.executed ? (
                  <>
                    <Check className="h-5 w-5 text-green-600" /> Yes
                  </>
                ) : (
                  "No"
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Created</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">{formatDate(co.created_at)}</div>
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
              <span className="text-sm text-muted-foreground">PCCO Number</span>
              <span className="text-sm font-medium">{co.pcco_number || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Title</span>
              <span className="max-w-md text-right text-sm">{co.title || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <StatusBadge status={co.status || "Unknown"} />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="text-sm font-medium">{formatCurrency(co.total_amount)}</span>
            </div>
            {co.submitted_at && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Submitted</span>
                <span className="text-sm">{formatDate(co.submitted_at)}</span>
              </div>
            )}
            {co.approved_at && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Approved</span>
                <span className="text-sm">{formatDate(co.approved_at)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              <span className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments
              </span>
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                <FileUp />
                Upload File
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  aria-label="Upload attachment"
                />
              </label>
            </Button>
          </CardHeader>
          <CardContent>
            {attachmentsLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : attachmentsError ? (
              <p className="text-sm text-destructive">{attachmentsError}</p>
            ) : attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attachments</p>
            ) : (
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between rounded-md border px-4 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{att.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {att.fileSize < 1024
                          ? `${att.fileSize} B`
                          : att.fileSize < 1024 * 1024
                            ? `${(att.fileSize / 1024).toFixed(1)} KB`
                            : `${(att.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                        {" \u00b7 "}
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
          </CardContent>
        </Card>
      </PageContainer>

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
