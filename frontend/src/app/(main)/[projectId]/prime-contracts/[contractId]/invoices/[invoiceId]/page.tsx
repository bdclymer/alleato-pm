"use client";

import { use, useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Trash2,
  FileSpreadsheet,
  Download,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout";
import { StatusBadge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ds";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  usePaymentApplication,
  usePaymentApplicationLineItems,
  useUpdatePaymentApplication,
  useUpdateLineItems,
  usePopulateSOV,
  useDeletePaymentApplication,
} from "@/hooks/use-payment-applications";
import { InvoiceGeneralInfo } from "@/components/domain/invoices/InvoiceGeneralInfo";
import { InvoiceSummaryPreview } from "@/components/domain/invoices/InvoiceSummaryPreview";
import { InvoiceScheduleOfValues } from "@/components/domain/invoices/InvoiceScheduleOfValues";
import { InvoiceAttachments } from "@/components/domain/invoices/InvoiceAttachments";
import type {
  PaymentApplication,
  PaymentApplicationLineItem,
  Contract,
} from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";

interface BillingPeriod {
  id: string;
  start_date: string;
  end_date: string;
  name: string | null;
  period_number: number;
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{
    projectId: string;
    contractId: string;
    invoiceId: string;
  }>;
}) {
  const { projectId, contractId, invoiceId } = use(params);
  const router = useRouter();
  const numericProjectId = parseInt(projectId, 10);

  const [activeTab, setActiveTab] = useState("general");
  const [contract, setContract] = useState<Contract | null>(null);
  const [billingPeriods, setBillingPeriods] = useState<BillingPeriod[]>([]);
  const [previousPaymentDue, setPreviousPaymentDue] = useState(0);

  // React Query hooks
  const { data: invoice, isLoading: invoiceLoading } = usePaymentApplication(
    numericProjectId,
    contractId,
    invoiceId,
  );
  const { data: lineItems = [], isLoading: lineItemsLoading } =
    usePaymentApplicationLineItems(numericProjectId, contractId, invoiceId);

  const updateMutation = useUpdatePaymentApplication(
    numericProjectId,
    contractId,
    invoiceId,
  );
  const updateLineItemsMutation = useUpdateLineItems(
    numericProjectId,
    contractId,
    invoiceId,
  );
  const populateSOV = usePopulateSOV(numericProjectId, contractId, invoiceId);
  const deleteMutation = useDeletePaymentApplication(
    numericProjectId,
    contractId,
  );

  // Fetch contract data
  useEffect(() => {
    async function fetchContract() {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}`,
        );
        if (res.ok) {
          const data = await res.json();
          setContract(data);
        }
      } catch {
        // Contract fetch failed silently
      }
    }
    fetchContract();
  }, [projectId, contractId]);

  // Fetch billing periods
  useEffect(() => {
    async function fetchBillingPeriods() {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/billing-periods`,
        );
        if (res.ok) {
          const data = await res.json();
          const periods = Array.isArray(data) ? data : (data?.items ?? []);
          setBillingPeriods(periods);
        }
      } catch {
        // Billing periods fetch failed silently
      }
    }
    fetchBillingPeriods();
  }, [projectId]);

  // Calculate previous payment due from earlier payment applications
  useEffect(() => {
    async function fetchPreviousApplications() {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}/payment-applications`,
        );
        if (!res.ok) return;
        const applications: PaymentApplication[] = await res.json();

        const currentNumber = invoice?.application_number ?? "";
        const previousTotal = applications
          .filter(
            (app) =>
              app.id !== invoiceId &&
              app.application_number < currentNumber &&
              app.status === "approved",
          )
          .reduce((sum, app) => sum + app.net_amount, 0);

        setPreviousPaymentDue(previousTotal);
      } catch {
        // Previous applications fetch failed silently
      }
    }
    if (invoice) {
      fetchPreviousApplications();
    }
  }, [projectId, contractId, invoiceId, invoice]);

  const handleUpdate = useCallback(
    async (data: Partial<PaymentApplication>) => {
      await updateMutation.mutateAsync(data);
    },
    [updateMutation],
  );

  const handleSaveLineItems = useCallback(
    async (items: Partial<PaymentApplicationLineItem>[]) => {
      await updateLineItemsMutation.mutateAsync(items);
    },
    [updateLineItemsMutation],
  );

  const handlePopulateSOV = useCallback(async () => {
    await populateSOV.mutateAsync();
  }, [populateSOV]);

  const handleDelete = useCallback(async () => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await deleteMutation.mutateAsync(invoiceId);
      router.push(`/${projectId}/prime-contracts/${contractId}`);
    } catch {
      toast.error("Failed to delete invoice");
    }
  }, [deleteMutation, invoiceId, projectId, contractId, router]);

  // Page title
  const pageTitle = invoice
    ? `Invoice #${invoice.application_number}`
    : "Invoice";

  // Contract summary for G702
  const contractSummary = useMemo(
    () =>
      contract
        ? {
            original_contract_value: contract.original_contract_value,
            revised_contract_value: contract.revised_contract_value,
            title: contract.title,
            contract_number: contract.contract_number,
            start_date: contract.start_date,
          }
        : {
            original_contract_value: 0,
            revised_contract_value: 0,
            title: "",
            contract_number: null,
            start_date: null,
          },
    [contract],
  );

  if (invoiceLoading) {
    return (
      <PageShell variant="detail" title="Loading...">
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-muted-foreground">
            Loading invoice...
          </div>
        </div>
      </PageShell>
    );
  }

  if (!invoice) {
    return (
      <PageShell
        variant="detail"
        title="Invoice Not Found"
        onBack={() =>
          router.push(`/${projectId}/prime-contracts/${contractId}`)
        }
      >
        <EmptyState
          icon={<FileSpreadsheet className="h-10 w-10" />}
          title="Invoice not found"
          description="The requested invoice could not be found."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      variant="detail"
      title={pageTitle}
      onBack={() =>
        router.push(`/${projectId}/prime-contracts/${contractId}`)
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            status={invoice.status
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase())}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Export as PDF</DropdownMenuItem>
              <DropdownMenuItem>Export as CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete Invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
          <TabsTrigger value="change-history">Change History</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-8 mt-6">
          {/* Section 1: General Information */}
          <InvoiceGeneralInfo
            invoice={invoice}
            onUpdate={handleUpdate}
            billingPeriods={billingPeriods}
          />

          {/* Section 2: Summary Preview (Collapsible G702) */}
          <InvoiceSummaryPreview
            invoice={invoice}
            lineItems={lineItems}
            contract={contractSummary}
            previousPaymentDue={previousPaymentDue}
          />

          {/* Section 3: Schedule of Values (G703) */}
          {lineItemsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-muted-foreground">
                Loading line items...
              </div>
            </div>
          ) : lineItems.length === 0 ? (
            <EmptyState
              icon={<FileSpreadsheet className="h-10 w-10" />}
              title="No schedule of values"
              description="Populate the schedule of values from the contract line items to start billing."
              action={{
                label: populateSOV.isPending
                  ? "Populating..."
                  : "Populate SOV from Contract",
                onClick: handlePopulateSOV,
              }}
            />
          ) : (
            <InvoiceScheduleOfValues
              lineItems={lineItems}
              onSave={handleSaveLineItems}
              isReadOnly={invoice.status === "approved"}
            />
          )}

          {/* Section 4: Attachments */}
          <InvoiceAttachments />
        </TabsContent>

        <TabsContent value="emails" className="mt-6">
          <div className="py-12 text-center text-sm text-muted-foreground">
            Email tracking coming soon.
          </div>
        </TabsContent>

        <TabsContent value="change-history" className="mt-6">
          <div className="py-12 text-center text-sm text-muted-foreground">
            Change history tracking coming soon.
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
