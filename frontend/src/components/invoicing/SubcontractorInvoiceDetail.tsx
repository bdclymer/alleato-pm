"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  FilePlus2,
  Mail,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";

import { PageShell } from "@/components/layout";
import { PageTabs } from "@/components/layout/PageTabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { InvoiceStatusBadge } from "@/components/invoicing/InvoiceStatusBadge";
import {
  SummaryTab,
  DetailTab,
  RelatedItemsTab,
  EmailsTab,
  ChangeHistoryTab,
  type SovLineItem,
} from "@/components/invoicing/subcontractor-detail-tabs";
import {
  useSubcontractorInvoiceDetail,
  useDeleteSubcontractorInvoice,
} from "@/hooks/use-subcontractor-invoices";

async function patchStatus(
  projectId: string,
  invoiceId: string | number,
  status: string,
) {
  const res = await fetch(
    `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to update status");
  }
  return res.json();
}

async function postTransition(
  projectId: string,
  invoiceId: string | number,
  action: "approve-as-noted" | "pending-owner-approval",
) {
  const res = await fetch(
    `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceId}/${action}`,
    { method: "POST" },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to update invoice");
  }
  return res.json();
}

interface SubcontractorInvoiceDetailProps {
  projectId: string;
  invoiceId: number;
  backHref: string;
  backLabel: string;
}

export function SubcontractorInvoiceDetail({
  projectId,
  invoiceId,
  backHref,
  backLabel,
}: SubcontractorInvoiceDetailProps) {
  const router = useRouter();

  const {
    data: invoice,
    isLoading,
    error,
    refetch,
  } = useSubcontractorInvoiceDetail(projectId, invoiceId);

  const deleteInvoice = useDeleteSubcontractorInvoice(projectId);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [editing, setEditing] = useState(false);

  async function handleStatus(next: string, successMsg: string) {
    setBusy(true);
    try {
      await patchStatus(projectId, invoiceId, next);
      toast.success(successMsg);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleTransition(
    action: "approve-as-noted" | "pending-owner-approval",
    successMsg: string,
  ) {
    setBusy(true);
    try {
      await postTransition(projectId, invoiceId, action);
      toast.success(successMsg);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleExportPdf() {
    window.open(
      `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceId}/pdf`,
      "_blank",
    );
  }

  async function handleEmailInvoice() {
    const recipients = window.prompt(
      "Email invoice to (comma-separated addresses):",
    );
    if (!recipients) return;
    const to = recipients
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (to.length === 0) return;
    try {
      const res = await fetch(
        `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceId}/emails`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to_recipients: to,
            subject: `Invoice ${invoice?.invoice_number ?? ""}`.trim(),
            email_type: "invoice",
          }),
        },
      );
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success("Email logged");
      await refetch();
      setActiveTab("emails");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    }
  }

  async function handleEmailContract() {
    toast.info("Email Contract — wires to commitment email flow (pending)");
  }

  async function handleCreateInvoice() {
    router.push(
      `/${projectId}/invoicing/subcontractor/new?contract=${invoice?.subcontract_id ?? invoice?.purchase_order_id ?? ""}`,
    );
  }

  async function handleResendErp() {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceId}/erp-resend`,
        { method: "POST" },
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed");
      toast.success(body.message ?? "ERP resend queued");
      await refetch();
      setActiveTab("history");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend");
    }
  }

  if (isLoading) {
    return (
      <PageShell variant="dashboard" title="Loading invoice…">
        <div className="px-6 py-4">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </PageShell>
    );
  }

  if (error || !invoice) {
    return (
      <PageShell variant="dashboard" title="Invoice not found">
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "The requested subcontractor invoice could not be loaded."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(backHref)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> {backLabel}
          </Button>
        </div>
      </PageShell>
    );
  }

  const status = invoice.status as string;
  const isDraft = status === "draft";
  const isUnderReview = status === "under_review";
  const isReviseAndResubmit = status === "revise_and_resubmit";
  const canEdit = isDraft || isReviseAndResubmit;
  const canDelete = !["approved", "paid"].includes(status);
  const canResendErp = ["approved", "approved_as_noted", "paid"].includes(
    status,
  );

  const lineItems: SovLineItem[] =
    invoice.subcontractor_invoice_line_items ?? [];
  const tabCounts = invoice.tab_counts ?? {
    related_items: 0,
    emails: 0,
    change_history: 0,
  };

  const title = invoice.invoice_number ?? `Invoice #${invoice.id}`;

  return (
    <PageShell
      variant="dashboard"
      title={title}
      description={
        invoice.contract_number
          ? `Contract ${invoice.contract_number}${invoice.contract_title ? ` — ${invoice.contract_title}` : ""}`
          : undefined
      }
      onBack={() => router.push(backHref)}
      backLabel={backLabel}
      contentClassName="space-y-4"
      actions={
        <div className="flex items-center gap-2">
          {(isDraft || isReviseAndResubmit) && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                handleStatus("under_review", "Submitted for review")
              }
            >
              Submit for Review
            </Button>
          )}
          {isUnderReview && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => {
                setReviewStatus("");
                setReviewComment(invoice.notes ?? "");
                setReviewModalOpen(true);
              }}
            >
              Finish Review
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                Actions <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {canEdit && !editing && (
                <DropdownMenuItem
                  onClick={() => {
                    setEditing(true);
                    setActiveTab("summary");
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleExportPdf}>
                <Download className="h-4 w-4 mr-2" /> Export
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreateInvoice}>
                <FilePlus2 className="h-4 w-4 mr-2" /> Create Invoice
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEmailContract}>
                <Mail className="h-4 w-4 mr-2" /> Email Contract
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEmailInvoice}>
                <Mail className="h-4 w-4 mr-2" /> Email Invoice
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleResendErp}
                disabled={!canResendErp}
              >
                <Send className="h-4 w-4 mr-2" /> Resend to ERP
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                disabled={!canDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <PageTabs
        variant="inline"
        className="border-b border-border"
        tabs={[
          {
            label: "Summary",
            href: "summary",
            isActive: activeTab === "summary",
          },
          {
            label: "Detail",
            href: "detail",
            isActive: activeTab === "detail",
          },
          {
            label: "Related Items",
            href: "related",
            isActive: activeTab === "related",
            count:
              tabCounts.related_items > 0
                ? tabCounts.related_items
                : undefined,
          },
          {
            label: "Emails",
            href: "emails",
            isActive: activeTab === "emails",
            count: tabCounts.emails > 0 ? tabCounts.emails : undefined,
          },
          {
            label: "Change History",
            href: "history",
            isActive: activeTab === "history",
            count:
              tabCounts.change_history > 0
                ? tabCounts.change_history
                : undefined,
          },
        ]}
        onTabClick={(href) => setActiveTab(href)}
      />

      <div className="pt-2">
        {activeTab === "summary" && (
          <SummaryTab
            invoice={invoice}
            editing={editing}
            projectId={projectId}
            invoiceId={invoiceId}
            onSave={async () => {
              setEditing(false);
              await refetch();
            }}
            onCancel={() => setEditing(false)}
          />
        )}
        {activeTab === "detail" && (
          <DetailTab
            projectId={projectId}
            invoiceId={invoiceId}
            lineItems={lineItems}
            canEdit={canEdit}
            onRefetch={refetch}
          />
        )}
        {activeTab === "related" && (
          <RelatedItemsTab projectId={projectId} invoiceId={invoiceId} />
        )}
        {activeTab === "emails" && (
          <EmailsTab projectId={projectId} invoiceId={invoiceId} />
        )}
        {activeTab === "history" && (
          <ChangeHistoryTab projectId={projectId} invoiceId={invoiceId} />
        )}
      </div>

      {/* Finish Review Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finish Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={reviewStatus} onValueChange={setReviewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="approved_as_noted">
                    Approved as Noted
                  </SelectItem>
                  <SelectItem value="revise_and_resubmit">
                    Revise and Resubmit
                  </SelectItem>
                  <SelectItem value="pending_owner_approval">
                    Pending Owner Approval
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Overall Comments</label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Add comments..."
                className="min-h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!reviewStatus || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  if (
                    reviewStatus === "approved_as_noted" ||
                    reviewStatus === "pending_owner_approval"
                  ) {
                    const action =
                      reviewStatus === "approved_as_noted"
                        ? "approve-as-noted"
                        : "pending-owner-approval";
                    await postTransition(projectId, invoiceId, action);
                  } else {
                    await patchStatus(projectId, invoiceId, reviewStatus);
                  }
                  // Save comment if changed
                  if (reviewComment !== (invoice.notes ?? "")) {
                    await fetch(
                      `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceId}`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ notes: reviewComment }),
                      },
                    );
                  }
                  const statusLabels: Record<string, string> = {
                    approved: "Invoice approved",
                    approved_as_noted: "Invoice approved as noted",
                    revise_and_resubmit: "Invoice sent back for revision",
                    pending_owner_approval: "Invoice sent for owner approval",
                  };
                  toast.success(
                    statusLabels[reviewStatus] ?? "Status updated",
                  );
                  setReviewModalOpen(false);
                  await refetch();
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Update failed",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subcontractor Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await deleteInvoice.mutateAsync(invoiceId);
                setDeleteOpen(false);
                router.push(backHref);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
