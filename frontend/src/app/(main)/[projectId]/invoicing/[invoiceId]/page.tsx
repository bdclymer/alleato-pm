"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Edit, Trash2, Download, Check, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Slideover,
  SlideoverContent,
  SlideoverHeader,
  SlideoverTitle,
} from "@/components/ui/unified-slideover";
import { StatusBadge } from "@/components/misc/status-badge";
import { PageContainer, ProjectPageHeader } from "@/components/layout";

import { useProjectTitle } from "@/hooks/useProjectTitle";
import { formatCurrency, formatDate, type OwnerInvoice } from "@/config/tables";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";

// ---------------------------------------------------------------------------
// Edit form schema
// ---------------------------------------------------------------------------

const invoiceEditSchema = z.object({
  invoice_number: z.string().trim().max(255).nullable().optional(),
  period_start: z.string().nullable().optional(),
  period_end: z.string().nullable().optional(),
  status: z.enum(["draft", "submitted", "approved", "paid", "void"]),
  notes: z.string().trim().max(2000).nullable().optional(),
});

type InvoiceEditValues = z.infer<typeof invoiceEditSchema>;

// ---------------------------------------------------------------------------
// Inline edit form
// ---------------------------------------------------------------------------

interface InvoiceEditFormProps {
  invoice: OwnerInvoice;
  projectId: number;
  invoiceId: number;
  onCancel: () => void;
  onSuccess: (updated: OwnerInvoice) => void;
}

function InvoiceEditForm({
  invoice,
  projectId,
  invoiceId,
  onCancel,
  onSuccess,
}: InvoiceEditFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<InvoiceEditValues>({
    resolver: zodResolver(invoiceEditSchema),
    defaultValues: {
      invoice_number: invoice.invoice_number ?? "",
      period_start: invoice.period_start
        ? invoice.period_start.slice(0, 10)
        : "",
      period_end: invoice.period_end ? invoice.period_end.slice(0, 10) : "",
      status: invoice.status,
      notes: "",
    },
  });

  const onSubmit = async (values: InvoiceEditValues) => {
    setIsSaving(true);
    try {
      const payload: Record<string, string | null> = {
        invoice_number: values.invoice_number || null,
        period_start: values.period_start || null,
        period_end: values.period_end || null,
        status: values.status,
        notes: values.notes || null,
      };

      const response = await fetch(
        `/api/projects/${projectId}/invoicing/owner/${invoiceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message || body.error || "Failed to update invoice");
      }

      const body = await response.json();
      toast.success("Invoice updated successfully");
      onSuccess(body.data as OwnerInvoice);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update invoice",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 p-4">
        <FormField
          control={form.control}
          name="invoice_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invoice Number</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. INV-001"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="period_start"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Period Start</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="period_end"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Period End</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Optional notes about this invoice..."
                  rows={4}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/**
 * Invoice Detail Page
 *
 * Displays detailed information about a specific owner invoice
 * including line items, totals, and action buttons.
 */
export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = parseInt(params.projectId as string);
  const invoiceId = parseInt(params.invoiceId as string);
  useProjectTitle("Invoice Details");

  const [invoice, setInvoice] = useState<OwnerInvoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Fetch invoice details
  const fetchInvoice = useCallback(async () => {
    if (!projectId || !invoiceId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/owner/${invoiceId}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch invoice");
      }

      const data = await response.json();
      setInvoice(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch invoice");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, invoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // Action handlers
  const handleBack = () => {
    router.push(`/${projectId}/invoicing`);
  };

  const handleEdit = () => {
    setIsEditOpen(true);
  };

  const handleEditSuccess = (updated: OwnerInvoice) => {
    setIsEditOpen(false);
    // Merge updated fields back, preserving line items already in state
    setInvoice((prev) =>
      prev
        ? { ...prev, ...updated, owner_invoice_line_items: prev.owner_invoice_line_items }
        : updated,
    );
  };

  const handleSubmit = async () => {
    if (!invoice) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/owner/${invoiceId}/submit`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit invoice");
      }

      toast.success("Invoice submitted successfully");
      fetchInvoice();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit invoice");
    }
  };

  const handleApprove = async () => {
    if (!invoice) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/owner/${invoiceId}/approve`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to approve invoice");
      }

      toast.success("Invoice approved successfully");
      fetchInvoice();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve invoice");
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;

    try {
      setIsDeleting(true);
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/owner/${invoiceId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete invoice");
      }

      toast.success("Invoice deleted successfully");
      router.push(`/${projectId}/invoicing`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete invoice");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleExportPDF = () => {
    toast.info("PDF export coming soon");
  };

  // Calculate totals
  const lineItems = invoice?.owner_invoice_line_items || [];
  const subtotal = lineItems.reduce(
    (sum, item) => sum + (item.approved_amount || 0),
    0,
  );
  // retention_percentage stored as a percentage (e.g. 5.0 = 5%); fall back to 0 if not set
  const retentionRate = ((invoice?.contract_retention_percentage ?? 0) / 100);
  const retention = subtotal * retentionRate;
  const totalDue = subtotal - retention;

  if (isLoading) {
    return (
      <>
        <ProjectPageHeader title="Invoice Details" description="Loading..." />
        <PageContainer>
          <div className="flex justify-center items-center h-64">
            <Text tone="muted">Loading invoice...</Text>
          </div>
        </PageContainer>
      </>
    );
  }

  if (error || !invoice) {
    return (
      <>
        <ProjectPageHeader
          title="Invoice Details"
          description="Error loading invoice"
        />
        <PageContainer>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <Text tone="destructive" className="mb-4">
                  {error || "Invoice not found"}
                </Text>
                <Button onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Invoicing
                </Button>
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <ProjectPageHeader
        title={`Invoice ${invoice.invoice_number || invoice.id}`}
        description={`Contract #${invoice.contract_id}`}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {invoice.status === "draft" && (
              <>
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button size="sm" onClick={handleSubmit}>
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Approval
                </Button>
              </>
            )}
            {invoice.status === "submitted" && (
              <Button size="sm" onClick={handleApprove}>
                <Check className="h-4 w-4 mr-2" />
                Approve
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            {invoice.status !== "approved" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        }
      />

      <PageContainer>
        <div className="space-y-6">
          {/* Invoice Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Invoice Information</CardTitle>
                </div>
                <StatusBadge status={invoice.status} type="invoice" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Text size="sm" tone="muted">Invoice Date</Text>
                  <Text weight="medium">
                    {formatDate(invoice.created_at)}
                  </Text>
                </div>
                <div>
                  <Text size="sm" tone="muted">Due Date</Text>
                  <Text weight="medium">
                    {formatDate(
                      new Date(
                        new Date(invoice.created_at).getTime() +
                          30 * 24 * 60 * 60 * 1000,
                      ).toISOString(),
                    )}
                  </Text>
                </div>
                <div>
                  <Text size="sm" tone="muted">Billing Period</Text>
                  <Text weight="medium">
                    {invoice.period_start && invoice.period_end
                      ? `${formatDate(invoice.period_start)} - ${formatDate(invoice.period_end)}`
                      : "—"}
                  </Text>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              {lineItems.length === 0 ? (
                <div className="text-center py-8">
                  <Text tone="muted">No line items found</Text>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description || "—"}</TableCell>
                        <TableCell>
                          <span className="capitalize">
                            {item.category?.replace(/_/g, " ") || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.approved_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Text tone="muted">Subtotal</Text>
                  <Text weight="medium">
                    {formatCurrency(subtotal)}
                  </Text>
                </div>
                {retentionRate > 0 && (
                  <div className="flex justify-between items-center">
                    <Text tone="muted">
                      Retention ({(retentionRate * 100).toFixed(1)}%)
                    </Text>
                    <Text weight="medium" tone="destructive">
                      -{formatCurrency(retention)}
                    </Text>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center">
                  <Text size="lg" weight="semibold">Total Due</Text>
                  <Text size="lg" weight="bold">
                    {formatCurrency(totalDue)}
                  </Text>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice{" "}
              {invoice?.invoice_number || invoice?.id}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Slideover */}
      <Slideover
        open={isEditOpen}
        onOpenChange={(open) => !open && setIsEditOpen(false)}
      >
        <SlideoverContent
          side="right"
          className="w-[92vw] sm:max-w-lg overflow-y-auto p-0"
        >
          <SlideoverHeader className="border-b p-4">
            <SlideoverTitle>Edit Invoice</SlideoverTitle>
          </SlideoverHeader>
          <InvoiceEditForm
            invoice={invoice}
            projectId={projectId}
            invoiceId={invoiceId}
            onCancel={() => setIsEditOpen(false)}
            onSuccess={handleEditSuccess}
          />
        </SlideoverContent>
      </Slideover>
    </>
  );
}
