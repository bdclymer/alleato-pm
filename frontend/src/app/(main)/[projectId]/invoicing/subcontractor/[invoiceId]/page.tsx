"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  FilePlus2,
  Mail,
  Send,
  Trash2,
} from "lucide-react";

import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function SubcontractorInvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const invoiceIdParam = params.invoiceId as string;
  const invoiceIdNum = Number(invoiceIdParam);

  const {
    data: invoice,
    isLoading,
    error,
    refetch,
  } = useSubcontractorInvoiceDetail(projectId, invoiceIdNum);

  const deleteInvoice = useDeleteSubcontractorInvoice(projectId);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");

  async function handleStatus(next: string, successMsg: string) {
    setBusy(true);
    try {
      await patchStatus(projectId, invoiceIdNum, next);
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
      await postTransition(projectId, invoiceIdNum, action);
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
      `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceIdNum}/pdf`,
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
        `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceIdNum}/emails`,
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
        `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceIdNum}/erp-resend`,
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
      <PageShell variant="detail" title="Loading invoice…">
        <div className="px-6 py-4">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </PageShell>
    );
  }

  if (error || !invoice) {
    return (
      <PageShell variant="detail" title="Invoice not found">
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "The requested subcontractor invoice could not be loaded."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`/${projectId}/invoicing?tab=subcontractor`)
            }
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Invoicing
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
      variant="detail"
      title={title}
      description={
        invoice.contract_number
          ? `Contract ${invoice.contract_number}${invoice.contract_title ? ` — ${invoice.contract_title}` : ""}`
          : undefined
      }
      onBack={() => router.push(`/${projectId}/invoicing?tab=subcontractor`)}
      backLabel="Back to Invoicing"
      actions={
        <div className="flex items-center gap-2">
          <InvoiceStatusBadge status={status} />
          {(isDraft || isReviseAndResubmit) && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                handleStatus("under_review", "Submitted for approval")
              }
            >
              Submit for Approval
            </Button>
          )}
          {isUnderReview && (
            <>
              <Button
                size="sm"
                disabled={busy}
                onClick={() => handleStatus("approved", "Invoice approved")}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  handleTransition(
                    "approve-as-noted",
                    "Invoice approved as noted",
                  )
                }
              >
                Approve as Noted
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  handleTransition(
                    "pending-owner-approval",
                    "Invoice sent for owner approval",
                  )
                }
              >
                Send to Owner
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  handleStatus(
                    "revise_and_resubmit",
                    "Invoice sent back for revision",
                  )
                }
              >
                Revise & Resubmit
              </Button>
            </>
          )}
          {/* Actions dropdown — Procore-parity action menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                Actions <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
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
      <div className="px-6 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="detail">Detail</TabsTrigger>
            <TabsTrigger value="related">
              Related Items
              {tabCounts.related_items > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({tabCounts.related_items})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="emails">
              Emails
              {tabCounts.emails > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({tabCounts.emails})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">
              Change History
              {tabCounts.change_history > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({tabCounts.change_history})
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-6">
            <SummaryTab invoice={invoice} />
          </TabsContent>

          <TabsContent value="detail" className="mt-6">
            <DetailTab
              projectId={projectId}
              invoiceId={invoiceIdNum}
              lineItems={lineItems}
              canEdit={canEdit}
              onRefetch={refetch}
            />
          </TabsContent>

          <TabsContent value="related" className="mt-6">
            <RelatedItemsTab projectId={projectId} invoiceId={invoiceIdNum} />
          </TabsContent>

          <TabsContent value="emails" className="mt-6">
            <EmailsTab projectId={projectId} invoiceId={invoiceIdNum} />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <ChangeHistoryTab projectId={projectId} invoiceId={invoiceIdNum} />
          </TabsContent>
        </Tabs>
      </div>

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
                await deleteInvoice.mutateAsync(invoiceIdNum);
                setDeleteOpen(false);
                router.push(`/${projectId}/invoicing?tab=subcontractor`);
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
