"use client";

import { useMemo, useCallback, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { Plus, Download, ChevronDown } from "lucide-react";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { TableLayout } from "@/components/layouts";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ExportDialog } from "@/components/commitments/ExportDialog";
import {
  useCommitmentsList,
  useDeleteCommitment,
  type CommitmentListItem,
} from "@/hooks/use-commitments-query";

// =============================================================================
// Table Configuration (static - defined outside component to avoid recreation)
// =============================================================================

const config: GenericTableConfig = {
  title: "Commitments",
  description: "Manage purchase orders and subcontracts",
  searchFields: ["number", "title", "description"],
  exportFilename: "commitments-export.csv",
  rowClickPath: "/{projectId}/commitments/{id}",
  enableColumnResize: true,
  stateStorageKey: "commitments-table-state",
  rowActions: [
    {
      id: "edit",
      label: "Edit",
      icon: "pencil" as const,
    },
    {
      id: "delete",
      label: "Delete",
      icon: "trash" as const,
      variant: "destructive" as const,
    },
  ],
  columns: [
    {
      id: "number",
      label: "Number",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "title",
      label: "Title",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "type",
      label: "Type",
      defaultVisible: true,
      type: "badge",
      renderConfig: {
        type: "badge",
        variantMap: {
          subcontract: "default",
          purchase_order: "secondary",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "status",
      label: "Status",
      defaultVisible: true,
      type: "badge",
      renderConfig: {
        type: "badge",
        variantMap: {
          draft: "outline",
          pending: "secondary",
          approved: "default",
          out_for_signature: "secondary",
          executed: "default",
          complete: "default",
          terminated: "destructive",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "erp_status",
      label: "ERP Status",
      defaultVisible: false,
      type: "badge",
      renderConfig: {
        type: "badge",
        variantMap: {
          synced: "success",
          pending: "secondary",
          error: "destructive",
          not_synced: "outline",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "ssov_status",
      label: "SSOV Status",
      defaultVisible: false,
      type: "badge",
      renderConfig: {
        type: "badge",
        variantMap: {
          submitted: "default",
          approved: "success",
          pending: "secondary",
          not_submitted: "outline",
          not_applicable: "outline",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "original_amount",
      label: "Original Amount",
      defaultVisible: true,
      type: "number",
      renderConfig: {
        type: "currency",
        prefix: "$",
      },
    },
    {
      id: "approved_change_orders",
      label: "Approved COs",
      defaultVisible: false,
      type: "number",
      renderConfig: {
        type: "currency",
        prefix: "$",
      },
    },
    {
      id: "pending_change_orders",
      label: "Pending COs",
      defaultVisible: false,
      type: "number",
      renderConfig: {
        type: "currency",
        prefix: "$",
      },
    },
    {
      id: "draft_change_orders",
      label: "Draft COs",
      defaultVisible: false,
      type: "number",
      renderConfig: {
        type: "currency",
        prefix: "$",
      },
    },
    {
      id: "revised_contract_amount",
      label: "Revised Amount",
      defaultVisible: true,
      type: "number",
      renderConfig: {
        type: "currency",
        prefix: "$",
      },
    },
    {
      id: "invoiced_amount",
      label: "Invoiced Amount",
      defaultVisible: false,
      type: "number",
      renderConfig: {
        type: "currency",
        prefix: "$",
      },
    },
    {
      id: "billed_to_date",
      label: "Billed to Date",
      defaultVisible: true,
      type: "number",
      renderConfig: {
        type: "currency",
        prefix: "$",
      },
    },
    {
      id: "payments_issued",
      label: "Payments Issued",
      defaultVisible: false,
      type: "number",
      renderConfig: {
        type: "currency",
        prefix: "$",
      },
    },
    {
      id: "percent_paid",
      label: "% Paid",
      defaultVisible: false,
      type: "number",
    },
    {
      id: "remaining_balance",
      label: "Remaining Balance",
      defaultVisible: false,
      type: "number",
      renderConfig: {
        type: "currency",
        prefix: "$",
      },
    },
    {
      id: "balance_to_finish",
      label: "Balance to Finish",
      defaultVisible: true,
      type: "number",
      renderConfig: {
        type: "currency",
        prefix: "$",
      },
    },
    {
      id: "executed",
      label: "Executed",
      defaultVisible: false,
      type: "boolean",
      renderConfig: {
        type: "boolean",
        trueLabel: "Yes",
        falseLabel: "No",
      },
    },
    {
      id: "is_private",
      label: "Private",
      defaultVisible: false,
      type: "boolean",
      renderConfig: {
        type: "boolean",
        trueLabel: "Yes",
        falseLabel: "No",
      },
    },
    {
      id: "created_at",
      label: "Created",
      defaultVisible: false,
      type: "date",
    },
  ],
  filters: [
    {
      id: "type",
      label: "Type",
      field: "type",
      options: [
        { value: "subcontract", label: "Subcontract" },
        { value: "purchase_order", label: "Purchase Order" },
      ],
    },
    {
      id: "status",
      label: "Status",
      field: "status",
      options: [
        { value: "draft", label: "Draft" },
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "out_for_signature", label: "Out for Signature" },
        { value: "executed", label: "Executed" },
        { value: "complete", label: "Complete" },
        { value: "terminated", label: "Terminated" },
      ],
    },
    {
      id: "contract_company_name",
      label: "Contract Company",
      field: "contract_company_name",
      options: [],
    },
    {
      id: "executed_flag",
      label: "Executed",
      field: "executed",
      options: [
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ],
    },
    {
      id: "erp_status",
      label: "ERP Status",
      field: "erp_status",
      options: [
        { value: "synced", label: "Synced" },
        { value: "pending", label: "Pending" },
        { value: "error", label: "Error" },
        { value: "not_synced", label: "Not Synced" },
      ],
    },
    {
      id: "ssov_status",
      label: "SSOV Status",
      field: "ssov_status",
      options: [
        { value: "submitted", label: "Submitted" },
        { value: "approved", label: "Approved" },
        { value: "pending", label: "Pending" },
        { value: "not_submitted", label: "Not Submitted" },
        { value: "not_applicable", label: "N/A" },
      ],
    },
    {
      id: "is_private",
      label: "Private",
      field: "is_private",
      options: [
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ],
    },
  ],
};

// Table config with title/description removed for rendering (static reference)
const tableRenderConfig = { ...config, title: undefined, description: undefined };

// =============================================================================
// Currency formatter (module-level singleton)
// =============================================================================

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

// =============================================================================
// Skeleton Loading Component
// =============================================================================

function CommitmentsListSkeleton() {
  return (
    <TableLayout>
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Skeleton className="h-9 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-32" />
          </div>
        ))}
      </div>

      {/* Tabs skeleton */}
      <div className="flex space-x-8 border-b">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Table skeleton */}
      <div className="mt-6 space-y-3">
        {/* Table header */}
        <div className="flex gap-4 px-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-28" />
        </div>
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </TableLayout>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface CommitmentRow extends CommitmentListItem {
  contract_company_name?: string | null;
  [key: string]: unknown;
}

export default function ProjectCommitmentsPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const projectId = params.projectId as string;

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Use React Query for data fetching with caching and deduplication
  const { data: response, isLoading, error } = useCommitmentsList(projectId);
  const deleteCommitment = useDeleteCommitment(projectId);

  // Memoize the row data transformation to avoid recomputing on every render
  const commitments: CommitmentRow[] = useMemo(() => {
    if (!response?.data) return [];
    return response.data.map((c) => ({
      ...c,
      contract_company_name: c.contract_company?.name || null,
    }));
  }, [response?.data]);

  // Memoize summary totals - only recalculate when commitments change
  const summaryTotals = useMemo(() => {
    const totalOriginal = commitments.reduce(
      (sum, c) => sum + (c.original_amount || 0),
      0,
    );
    const totalRevised = commitments.reduce(
      (sum, c) => sum + (c.revised_contract_amount || 0),
      0,
    );
    const totalInvoiced = commitments.reduce(
      (sum, c) => sum + (c.invoiced_amount || c.billed_to_date || 0),
      0,
    );
    const totalBalance = commitments.reduce(
      (sum, c) => sum + (c.balance_to_finish || 0),
      0,
    );
    const percentInvoiced =
      totalRevised > 0
        ? Math.round((totalInvoiced / totalRevised) * 100)
        : 0;

    return {
      totalOriginal,
      totalRevised,
      totalInvoiced,
      totalBalance,
      percentInvoiced,
    };
  }, [commitments]);

  // Memoize tabs to prevent recreation on every render
  const tabs = useMemo(
    () => [
      {
        label: "Commitments",
        href: `/${projectId}/commitments`,
        count: response?.meta?.total || commitments.length,
      },
      {
        label: "Recycle Bin",
        href: `/${projectId}/commitments/recycle-bin`,
      },
    ],
    [projectId, response?.meta?.total, commitments.length],
  );

  // Stable callback references
  const handleExport = useCallback(() => {
    setIsExportDialogOpen(true);
  }, []);

  const handleCreateSubcontract = useCallback(() => {
    router.push(`/${projectId}/commitments/new?type=subcontract`);
  }, [router, projectId]);

  const handleCreatePurchaseOrder = useCallback(() => {
    router.push(`/${projectId}/commitments/new?type=purchase_order`);
  }, [router, projectId]);

  const handleDeleteCommitment = useCallback(
    async (id: string | number) => {
      try {
        await deleteCommitment.mutateAsync(String(id));
        return {};
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete commitment";
        return { error: message };
      }
    },
    [deleteCommitment],
  );

  // Show skeleton during initial load
  if (isLoading && !response) {
    return <CommitmentsListSkeleton />;
  }

  if (error) {
    return (
      <TableLayout>
        <div className="text-center text-destructive p-6">
          Error loading commitments:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      </TableLayout>
    );
  }

  return (
    <TableLayout>
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Commitments
        </h1>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex-1 sm:flex-initial"
            >
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden xs:inline">Export</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                router.push(`/${projectId}/commitments/recycle-bin`)
              }
              className="flex-1 sm:flex-initial hidden sm:flex"
            >
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="flex-1 sm:flex-initial">
                <Plus className="h-4 w-4 mr-2" />
                Create
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCreateSubcontract}>
                Subcontract
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreatePurchaseOrder}>
                Purchase Order
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Original Amount</p>
          <p className="text-xl font-semibold mt-1">
            {formatCurrency(summaryTotals.totalOriginal)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Revised Amount</p>
          <p className="text-xl font-semibold mt-1">
            {formatCurrency(summaryTotals.totalRevised)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Invoiced to Date</p>
          <p className="text-xl font-semibold mt-1 text-green-600 dark:text-green-400">
            {formatCurrency(summaryTotals.totalInvoiced)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {summaryTotals.percentInvoiced}% of revised
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Balance to Finish</p>
          <p className="text-xl font-semibold mt-1">
            {formatCurrency(summaryTotals.totalBalance)}
          </p>
        </div>
      </div>

      {/* Underline Tabs */}
      <div className="overflow-x-auto -mb-px">
        <nav
          className="flex space-x-6 sm:space-x-8 border-b min-w-max px-1"
          aria-label="Tabs"
        >
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <button
                key={tab.href}
                type="button"
                onClick={() => router.push(tab.href)}
                className={cn(
                  "inline-flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-medium transition-smooth whitespace-nowrap touch-target",
                  isActive
                    ? "border-brand text-brand"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      isActive
                        ? "bg-brand/10 text-brand"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Table */}
      <div className="mt-6">
        <GenericDataTable
          data={commitments}
          config={tableRenderConfig}
          onDeleteRow={handleDeleteCommitment}
        />
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        projectId={projectId}
      />
    </TableLayout>
  );
}
