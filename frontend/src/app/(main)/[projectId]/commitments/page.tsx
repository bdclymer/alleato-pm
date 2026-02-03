"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { Plus, Download, ChevronDown } from "lucide-react";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";
import { ExportDialog } from "@/components/commitments/ExportDialog";

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
    // Phase 5: ERP Status column
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
    // Phase 5: SSOV Status column
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
    // Phase 5: Change Order aggregation columns
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
    // Phase 5: Invoice aggregation columns
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
    // Phase 5: Payment aggregation columns
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
    // Phase 5: Calculated fields
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
    // Phase 5: Private column
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
    // Phase 5: ERP Status filter
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
    // Phase 5: SSOV Status filter
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
    // Phase 5: Private filter
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

interface CommitmentRow {
  id: string;
  number: string;
  title: string | null;
  type: string;
  status: string;
  executed: boolean;
  original_amount: number;
  revised_contract_amount: number;
  billed_to_date: number;
  balance_to_finish: number;
  contract_company_id: string | null;
  contract_company_name?: string | null;
  created_at: string;
  // Phase 5 enhancement fields
  erp_status: string | null;
  ssov_status: string | null;
  approved_change_orders: number;
  pending_change_orders: number;
  draft_change_orders: number;
  invoiced_amount: number;
  payments_issued: number;
  percent_paid: number;
  remaining_balance: number;
  is_private: boolean;
  [key: string]: unknown;
}

export default function ProjectCommitmentsPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const projectId = params.projectId as string;

  const [commitments, setCommitments] = useState<CommitmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const fetchCommitments = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/commitments?projectId=${projectId}&limit=500`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch commitments");
      }
      const result = await response.json();
      const rows: CommitmentRow[] = (result.data || []).map((c: any) => ({
        ...c,
        contract_company_name: c.contract_company?.name || null,
      }));
      setCommitments(rows);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load commitments",
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCommitments();
  }, [fetchCommitments]);

  // Compute summary totals
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
  // Calculate percent invoiced for overall progress
  const percentInvoiced = totalRevised > 0
    ? Math.round((totalInvoiced / totalRevised) * 100)
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const tabs = [
    {
      label: "Commitments",
      href: `/${projectId}/commitments`,
      count: commitments.length,
    },
    {
      label: "Recycle Bin",
      href: `/${projectId}/commitments/recycle-bin`,
    },
  ];

  const handleExport = () => {
    setIsExportDialogOpen(true);
  };

  const handleCreateSubcontract = () => {
    router.push(`/${projectId}/commitments/new?type=subcontract`);
  };

  const handleCreatePurchaseOrder = () => {
    router.push(`/${projectId}/commitments/new?type=purchase_order`);
  };

  const handleDeleteCommitment = useCallback(
    async (id: string | number) => {
      try {
        const response = await fetch(`/api/commitments/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Failed to delete commitment",
          );
        }

        toast.success("Commitment deleted successfully");
        await fetchCommitments();
        return {};
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to delete commitment";
        toast.error(message);
        return { error: message };
      }
    },
    [fetchCommitments],
  );

  if (error) {
    return (
      <TableLayout>
        <div className="text-center text-destructive p-6">
          Error loading commitments: {error}
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
            {formatCurrency(totalOriginal)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Revised Amount</p>
          <p className="text-xl font-semibold mt-1">
            {formatCurrency(totalRevised)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Invoiced to Date</p>
          <p className="text-xl font-semibold mt-1 text-green-600 dark:text-green-400">
            {formatCurrency(totalInvoiced)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {percentInvoiced}% of revised
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Balance to Finish</p>
          <p className="text-xl font-semibold mt-1">
            {formatCurrency(totalBalance)}
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
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">
              Loading commitments...
            </div>
          </div>
        ) : (
          <GenericDataTable
            data={commitments}
            config={{ ...config, title: undefined, description: undefined }}
            onDeleteRow={handleDeleteCommitment}
          />
        )}
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
