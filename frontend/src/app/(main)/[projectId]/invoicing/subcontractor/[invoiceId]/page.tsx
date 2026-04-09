"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";

import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  useSubcontractorInvoiceDetail,
  useDeleteSubcontractorInvoice,
} from "@/hooks/use-subcontractor-invoices";

interface SovLineItem {
  id: number | string;
  line_number?: number | null;
  description?: string | null;
  scheduled_value?: number | null;
  previous_billed?: number | null;
  work_completed_this_period?: number | null;
  materials_stored?: number | null;
  total_completed_and_stored?: number | null;
  percent_complete?: number | null;
  balance_to_finish?: number | null;
  retainage_this_period?: number | null;
  net_amount_this_period?: number | null;
}

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function formatCurrency(value?: number | null) {
  return currencyFmt.format(value ?? 0);
}

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

  const lineItems: SovLineItem[] =
    invoice.subcontractor_invoice_line_items ?? [];

  const totals = lineItems.reduce(
    (acc, li) => {
      acc.scheduled += li.scheduled_value ?? 0;
      acc.thisPeriod += li.work_completed_this_period ?? 0;
      acc.stored += li.materials_stored ?? 0;
      acc.totalCompleted += li.total_completed_and_stored ?? 0;
      acc.retainage += li.retainage_this_period ?? 0;
      acc.net += li.net_amount_this_period ?? 0;
      return acc;
    },
    {
      scheduled: 0,
      thisPeriod: 0,
      stored: 0,
      totalCompleted: 0,
      retainage: 0,
      net: 0,
    },
  );

  const status = invoice.status as string;
  const isDraft = status === "draft";
  const isUnderReview = status === "under_review";
  const isReviseAndResubmit = status === "revise_and_resubmit";
  const canDelete = !["approved", "paid"].includes(status);

  const title =
    invoice.invoice_number ?? `Invoice #${invoice.id}`;

  return (
    <PageShell
      variant="detail"
      title={title}
      description={
        invoice.contract_number
          ? `Contract ${invoice.contract_number}${invoice.contract_title ? ` — ${invoice.contract_title}` : ""}`
          : undefined
      }
      onBack={() =>
        router.push(`/${projectId}/invoicing?tab=subcontractor`)
      }
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
          {canDelete && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
        </div>
      }
    >
      <div className="px-6 py-4 space-y-6">
        {/* Invoice Information */}
        <section className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Invoice Information
          </h2>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Commitment</dt>
              <dd className="font-medium text-foreground">
                {invoice.contract_number ?? "—"}
                {invoice.contract_title ? ` — ${invoice.contract_title}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Billing Period</dt>
              <dd className="font-medium text-foreground">
                {invoice.billing_period_name ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Invoice Number</dt>
              <dd className="font-medium text-foreground">
                {invoice.invoice_number ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Period Start</dt>
              <dd className="font-medium text-foreground">
                {formatDate(invoice.period_start)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Period End</dt>
              <dd className="font-medium text-foreground">
                {formatDate(invoice.period_end)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Billing Date</dt>
              <dd className="font-medium text-foreground">
                {formatDate(invoice.billing_date)}
              </dd>
            </div>
            {invoice.notes && (
              <div className="col-span-full">
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="font-medium text-foreground whitespace-pre-wrap">
                  {invoice.notes}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* SOV Line Items */}
        <section className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Schedule of Values
              </h2>
              <p className="text-xs text-muted-foreground">
                {lineItems.length} line item
                {lineItems.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {lineItems.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No line items yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Scheduled Value</TableHead>
                  <TableHead className="text-right">Previous Billed</TableHead>
                  <TableHead className="text-right">This Period</TableHead>
                  <TableHead className="text-right">Stored</TableHead>
                  <TableHead className="text-right">Total Completed</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Retainage</TableHead>
                  <TableHead className="text-right">Net This Period</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((li) => (
                  <TableRow key={li.id}>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {li.line_number ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {li.description ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(li.scheduled_value)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(li.previous_billed)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(li.work_completed_this_period)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(li.materials_stored)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(li.total_completed_and_stored)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {li.percent_complete != null
                        ? `${Number(li.percent_complete).toFixed(1)}%`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(li.balance_to_finish)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(li.retainage_this_period)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(li.net_amount_this_period)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={2}>Totals</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(totals.scheduled)}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(totals.thisPeriod)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(totals.stored)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(totals.totalCompleted)}
                  </TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(totals.retainage)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(totals.net)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </section>
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
