"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import { Plus, ChevronDown, Eye, Edit, Trash2 } from "lucide-react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/misc/status-badge";
import { DataTablePage } from "@/components/templates";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import { Link } from "@/components/ui/link";
import { MobileCard } from "@/components/ui/mobile-card";
import { useProjectTitle } from "@/hooks/useProjectTitle";
import {
  getOwnerInvoicesColumns,
  getInvoicingTabs,
  invoiceStatusOptions,
  invoicingMobileColumns,
  formatCurrency,
  getOwnerInvoicesSummaryCards,
  type OwnerInvoice,
} from "@/config/tables";

/**
 * Project Invoicing Page
 *
 * Displays and manages owner and subcontractor invoices for a project.
 * Uses the standardized DataTablePage template for consistent styling.
 */
export default function ProjectInvoicingPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = parseInt(params.projectId as string);
  const tab = searchParams.get("tab") || "owner";
  useProjectTitle("Invoicing");

  const [ownerInvoices, setOwnerInvoices] = useState<OwnerInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<OwnerInvoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch owner invoices
  const fetchOwnerInvoices = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/owner`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch owner invoices");
      }

      const data = await response.json();
      setOwnerInvoices(data.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch owner invoices",
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (tab === "owner" || !tab) {
      fetchOwnerInvoices();
    }
  }, [tab, fetchOwnerInvoices]);

  // Navigation handlers
  const handleCreateOwnerInvoice = useCallback(() => {
    router.push(`/${projectId}/invoicing/new`);
  }, [router, projectId]);

  const handleCreateSubcontractorInvoice = useCallback(() => {
    toast.info("Create subcontractor invoice coming soon");
  }, []);

  const handleView = useCallback(
    (invoice: OwnerInvoice) => {
      router.push(`/${projectId}/invoicing/${invoice.id}`);
    },
    [router, projectId],
  );

  const handleEdit = useCallback(
    (invoice: OwnerInvoice) => {
      router.push(`/${projectId}/invoicing/${invoice.id}`);
    },
    [router, projectId],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!invoiceToDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/owner/${invoiceToDelete.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete invoice");
      }

      toast.success("Invoice deleted successfully");
      fetchOwnerInvoices();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete invoice",
      );
    } finally {
      setIsDeleting(false);
      setInvoiceToDelete(null);
    }
  }, [invoiceToDelete, projectId, fetchOwnerInvoices]);

  // Column definitions with action handlers
  const columns: ColumnDef<OwnerInvoice>[] = useMemo(
    () => [
      ...getOwnerInvoicesColumns(handleView),
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const invoice = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="sr-only">Open menu</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleView(invoice)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEdit(invoice)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setInvoiceToDelete(invoice)}
                  className="text-destructive"
                  disabled={invoice.status === "approved"}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [handleView, handleEdit],
  );

  // Generate tabs
  const tabs = useMemo(() => getInvoicingTabs(projectId), [projectId]);

  // Generate summary cards
  const summaryCards = useMemo(
    () => getOwnerInvoicesSummaryCards(ownerInvoices),
    [ownerInvoices],
  );

  // Mobile card renderer
  const mobileCardRenderer = useCallback(
    (invoice: OwnerInvoice) => (
      <MobileCard>
        <MobileCard.Header>
          <Stack gap="xs">
            <Link>{invoice.invoice_number || `INV-${invoice.id}`}</Link>
            <Text size="sm" tone="muted">
              Contract #{invoice.contract_id}
            </Text>
            <Text size="sm" tone="muted">
              {invoice.period_start} - {invoice.period_end}
            </Text>
          </Stack>
          <StatusBadge status={invoice.status} type="invoice" />
        </MobileCard.Header>
        <MobileCard.Footer>
          <Text size="sm" tone="muted">
            Total Amount
          </Text>
          <Text weight="medium">
            {formatCurrency(invoice.total_amount || 0)}
          </Text>
        </MobileCard.Footer>
      </MobileCard>
    ),
    [],
  );

  // Create action button
  const createButton = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCreateOwnerInvoice}>
          <Plus className="h-4 w-4 mr-2" />
          Owner Invoice
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCreateSubcontractorInvoice}>
          <Plus className="h-4 w-4 mr-2" />
          Subcontractor Invoice
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Render based on active tab
  if (tab === "billing-periods") {
    return (
      <DataTablePage
        title="Invoicing"
        description="Manage project invoicing and billing periods"
        tabs={tabs}
        actions={createButton}
        columns={[]}
        data={[]}
        loading={false}
        emptyMessage="Billing periods coming soon"
      />
    );
  }

  if (tab === "subcontractor") {
    return (
      <DataTablePage
        title="Invoicing"
        description="Manage project invoicing and billing periods"
        tabs={tabs}
        actions={createButton}
        columns={[]}
        data={[]}
        loading={false}
        emptyMessage="Subcontractor invoices coming soon"
      />
    );
  }

  // Default: Owner invoices tab
  return (
    <DataTablePage<OwnerInvoice>
      title="Invoicing"
      description="Manage project invoicing and billing periods"
      tabs={tabs}
      actions={createButton}
      columns={columns}
      data={ownerInvoices}
      loading={isLoading}
      error={error}
      onRetry={fetchOwnerInvoices}
      emptyMessage="No owner invoices found"
      emptyAction={
        <Button onClick={handleCreateOwnerInvoice}>
          <Plus className="h-4 w-4 mr-2" />
          Create your first owner invoice
        </Button>
      }
      onRowClick={handleView}
      searchKey="invoice_number"
      searchPlaceholder="Search invoices..."
      filterOptions={invoiceStatusOptions}
      mobileColumns={invoicingMobileColumns}
      mobileCardRenderer={mobileCardRenderer}
      showExportButton={true}
      onExportCSV={() => toast.info("CSV export coming soon")}
      onExportPDF={() => toast.info("PDF export coming soon")}
      summaryCards={summaryCards}
    />
  );
}
