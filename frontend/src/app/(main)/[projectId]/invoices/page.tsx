"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DollarSign, Download, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageContainer, PageTabs } from "@/components/layout";
import { PageHeader } from "@/components/layout/page-header-unified";

import type { Invoice } from "@/types/financial";

export default function ProjectInvoicesPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = parseInt(params.projectId as string, 10);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!projectId) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/invoices?projectId=${projectId}`);
        if (response.ok) {
          const data = await response.json();
          setInvoices(data.data || []);
        }
      } catch (error) {

        console.error("Failed to load invoices:", error);

        toast.error("Failed to load invoices", { description: "Please try again." });

      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [projectId]);

  const getStatusBadgeVariant = (
    status: string,
  ):
    | "success"
    | "default"
    | "secondary"
    | "outline"
    | "destructive"
    | "warning"
    | null
    | undefined => {
    switch (status) {
      case "paid":
        return "success";
      case "approved":
        return "default";
      case "submitted":
        return "secondary";
      case "draft":
        return "outline";
      default:
        return "destructive";
    }
  };

  // Calculate totals
  const totals = invoices.reduce(
    (acc, invoice) => {
      acc.totalBilled += invoice.total_amount || 0;
      if (invoice.status !== "paid") {
        acc.outstanding += invoice.total_amount || 0;
      }
      if (invoice.status === "paid" && invoice.billing_period_start) {
        const billingDate = new Date(invoice.billing_period_start);
        const currentDate = new Date();
        const isThisMonth =
          billingDate.getMonth() === currentDate.getMonth() &&
          billingDate.getFullYear() === currentDate.getFullYear();
        if (isThisMonth) {
          acc.paidThisMonth += invoice.total_amount || 0;
        }
      }
      // Check if overdue (simplified - would need due_date field)
      if (invoice.status !== "paid" && invoice.due_date) {
        const dueDate = new Date(invoice.due_date);
        if (dueDate < new Date()) {
          acc.overdueCount++;
        }
      }
      return acc;
    },
    { totalBilled: 0, outstanding: 0, paidThisMonth: 0, overdueCount: 0 },
  );

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Manage project invoices and billing"
        actions={
          <Button
            size="sm"
            onClick={() => router.push(`/${projectId}/invoices/new`)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        }
      />

      <PageTabs
        tabs={[
          {
            label: "All Invoices",
            href: `/${projectId}/invoices`,
            count: invoices.length,
          },
          { label: "Draft", href: `/${projectId}/invoices?status=draft` },
          {
            label: "Submitted",
            href: `/${projectId}/invoices?status=submitted`,
          },
          { label: "Approved", href: `/${projectId}/invoices?status=approved` },
          { label: "Paid", href: `/${projectId}/invoices?status=paid` },
        ]}
      />

      <PageContainer>
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="p-6">
            <div className="text-2xl font-bold">
              ${totals.totalBilled.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Total Billed</p>
          </Card>
          <Card className="p-6">
            <div className="text-2xl font-bold">
              ${totals.outstanding.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Outstanding</p>
          </Card>
          <Card className="p-6">
            <div className="text-2xl font-bold">
              ${totals.paidThisMonth.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Paid This Month</p>
          </Card>
          <Card className="p-6">
            <div className="text-2xl font-bold">{totals.overdueCount}</div>
            <p className="text-xs text-muted-foreground">Overdue Invoices</p>
          </Card>
        </div>

        {/* Invoices Table */}
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">All Invoices</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-muted-foreground">Loading invoices...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No invoices found</p>
                <Button
                  onClick={() => router.push(`/${projectId}/invoices/new`)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first invoice
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Contract</TableHead>
                    <TableHead>Billing Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer hover:bg-muted"
                    >
                      <TableCell className="font-medium">
                        {invoice.number}
                      </TableCell>
                      <TableCell>{invoice.commitment?.title || "-"}</TableCell>
                      <TableCell>
                        {invoice.billing_period_start} -{" "}
                        {invoice.billing_period_end}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        ${invoice.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{invoice.due_date || "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      </PageContainer>
    </>
  );
}
