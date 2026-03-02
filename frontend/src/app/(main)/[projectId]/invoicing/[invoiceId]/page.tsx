"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { StatusBadge } from "@/components/misc/status-badge";
import { PageContainer , ProjectPageHeader } from "@/components/layout";

import { useProjectTitle } from "@/hooks/useProjectTitle";
import { formatCurrency, formatDate, type OwnerInvoice } from "@/config/tables";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";

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
    toast.info("Edit invoice coming soon");
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

     
    const confirmed = window.confirm(
      `Are you sure you want to delete invoice ${invoice.invoice_number || invoice.id}?`,
    );
    if (!confirmed) {
      return;
    }

    try {
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
  const retentionRate = 0.05; // 5% retention (placeholder)
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
                onClick={handleDelete}
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
                <div className="flex justify-between items-center">
                  <Text tone="muted">
                    Retention ({(retentionRate * 100).toFixed(0)}%)
                  </Text>
                  <Text weight="medium" tone="destructive">
                    -{formatCurrency(retention)}
                  </Text>
                </div>
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
    </>
  );
}
