"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, MoreHorizontal, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { UnifiedTablePage, useUnifiedTableState, type FilterValue } from "@/components/tables/unified";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slideover, SlideoverContent, SlideoverHeader, SlideoverTitle } from "@/components/ui/unified-slideover";
import {
  type CostCodeDetailRow,
  DEFAULT_COST_CODE_VISIBLE_COLUMNS,
  DEFAULT_VISIBLE_COLUMNS,
  DIRECT_COST_FILTERS,
  SUMMARY_COLUMNS,
  formatAmount,
  formatDate,
} from "./direct-costs-table-utils";
import { CostCodeHierarchyView } from "./cost-code-hierarchy-view";

import { DirectCostForm } from "@/components/direct-costs/DirectCostForm";
import { DirectCostsImportDialog } from "@/components/direct-costs/DirectCostsImportDialog";
import { ExportDialog } from "@/components/direct-costs/ExportDialog";
import type { DirectCostUpdate } from "@/lib/schemas/direct-costs";

export type DirectCostRow = {
  id: string;
  date: string;
  invoice_number: string | null;
  cost_type: string;
  status: string;
  description: string | null;
  total_amount: number;
  received_date: string | null;
  paid_date: string | null;
  created_at: string;
  updated_at: string;
  vendor: { name: string } | null;
  erp_status?: string | null;
};

type DirectCostFilterState = Record<string, FilterValue>;
type SummaryTab = "summary" | "cost-code";

type BulkActionType = "approve" | "revise" | "delete";

interface DirectCostsClientProps {
  projectId: string;
  projectName: string;
  directCosts: DirectCostRow[];
  costCodeDetails: CostCodeDetailRow[];
}

const STATUS_OPTIONS = ["Draft", "Pending", "Revise and Resubmit", "Approved"] as const;

const EMPTY_FILTERS: DirectCostFilterState = {
  status: undefined,
  costType: undefined,
  dateFrom: undefined,
  dateTo: undefined,
  minAmount: undefined,
  maxAmount: undefined,
};

function hasAllVisibleColumns(current: string[], required: string[]): boolean {
  return required.every((column) => current.includes(column));
}

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function statusClass(status: string): string {
  switch (status) {
    case "Approved":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Revise and Resubmit":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "Pending":
      return "bg-amber-100 text-amber-700 border-amber-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function DirectCostsClient({
  projectId,
  projectName,
  directCosts,
  costCodeDetails,
}: DirectCostsClientProps): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const summaryTab: SummaryTab = searchParams.get("summary_view") === "cost-code" ? "cost-code" : "summary";

  const tableState = useUnifiedTableState({
    entityKey: "direct-costs",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "list"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: summaryTab === "summary" ? "date" : null,
      sortDirection: summaryTab === "summary" ? "desc" : "asc",
      visibleColumns: summaryTab === "summary" ? DEFAULT_VISIBLE_COLUMNS : DEFAULT_COST_CODE_VISIBLE_COLUMNS,
      filters: {
        status: searchParams.get("status") || undefined,
        costType: searchParams.get("costType") || undefined,
        dateFrom: searchParams.get("date_from") || undefined,
        dateTo: searchParams.get("date_to") || undefined,
        minAmount: searchParams.get("amount_min") || undefined,
        maxAmount: searchParams.get("amount_max") || undefined,
      },
    },
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [directCostToDelete, setDirectCostToDelete] = React.useState<DirectCostRow | null>(null);
  const [editingCostId, setEditingCostId] = React.useState<string | null>(null);
  const [editingInitialData, setEditingInitialData] = React.useState<DirectCostUpdate | undefined>(undefined);
  const [isEditSheetOpen, setIsEditSheetOpen] = React.useState(false);
  const [isEditLoading, setIsEditLoading] = React.useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = React.useState(false);
  const [updatingStatusId, setUpdatingStatusId] = React.useState<string | null>(null);
  const [bulkAction, setBulkAction] = React.useState<BulkActionType | null>(null);

  React.useEffect(() => {
    if (summaryTab !== "summary") return;

    const nextFilters: DirectCostFilterState = {
      status: searchParams.get("status") || undefined,
      costType: searchParams.get("costType") || undefined,
      dateFrom: searchParams.get("date_from") || undefined,
      dateTo: searchParams.get("date_to") || undefined,
      minAmount: searchParams.get("amount_min") || undefined,
      maxAmount: searchParams.get("amount_max") || undefined,
    };

    tableState.setActiveFilters((prev) => {
      if (
        prev.status === nextFilters.status &&
        prev.costType === nextFilters.costType &&
        prev.dateFrom === nextFilters.dateFrom &&
        prev.dateTo === nextFilters.dateTo &&
        prev.minAmount === nextFilters.minAmount &&
        prev.maxAmount === nextFilters.maxAmount
      ) {
        return prev;
      }
      return nextFilters;
    });
  }, [searchParams, summaryTab, tableState.setActiveFilters]);

  React.useEffect(() => {
    const requiredColumns = summaryTab === "summary" ? DEFAULT_VISIBLE_COLUMNS : DEFAULT_COST_CODE_VISIBLE_COLUMNS;
    if (!hasAllVisibleColumns(tableState.visibleColumns, requiredColumns)) {
      tableState.setVisibleColumns(requiredColumns);
    }
  }, [summaryTab, tableState.visibleColumns, tableState.setVisibleColumns]);

  const buildTabHref = (tab: SummaryTab): string => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "cost-code") params.set("summary_view", "cost-code");
    if (tab === "summary") params.delete("summary_view");
    return params.toString() ? `/${projectId}/direct-costs?${params.toString()}` : `/${projectId}/direct-costs`;
  };

  const tabs = [
    { label: "Summary", href: buildTabHref("summary"), isActive: summaryTab === "summary" },
    { label: "Summary by Cost Code", href: buildTabHref("cost-code"), isActive: summaryTab === "cost-code" },
  ];

  const activeFilters = tableState.activeFilters as DirectCostFilterState;

  const filteredSummaryItems = React.useMemo(() => {
    const searchValue = tableState.debouncedSearch.trim().toLowerCase();
    const statusFilter = normalize(activeFilters.status);
    const typeFilter = normalize(activeFilters.costType);
    const dateFromFilter = typeof activeFilters.dateFrom === "string" ? activeFilters.dateFrom : "";
    const dateToFilter = typeof activeFilters.dateTo === "string" ? activeFilters.dateTo : "";
    const minAmount = activeFilters.minAmount !== undefined && activeFilters.minAmount !== "" ? Number(activeFilters.minAmount) : null;
    const maxAmount = activeFilters.maxAmount !== undefined && activeFilters.maxAmount !== "" ? Number(activeFilters.maxAmount) : null;

    return directCosts.filter((item) => {
      const normalizedItemStatus = normalize(item.status);
      const normalizedItemCostType = normalize(item.cost_type);

      if (statusFilter && statusFilter !== "all" && normalizedItemStatus !== statusFilter) return false;
      if (typeFilter && typeFilter !== "all" && normalizedItemCostType !== typeFilter) return false;

      if (dateFromFilter && item.date < dateFromFilter) return false;
      if (dateToFilter && item.date > dateToFilter) return false;
      if (Number.isFinite(minAmount) && item.total_amount < (minAmount as number)) return false;
      if (Number.isFinite(maxAmount) && item.total_amount > (maxAmount as number)) return false;

      if (!searchValue) return true;

      const dateDisplay = formatDate(item.date).toLowerCase();
      const receivedDisplay = formatDate(item.received_date).toLowerCase();
      const paidDisplay = formatDate(item.paid_date).toLowerCase();
      const amountDisplay = formatAmount(item.total_amount).toLowerCase();
      const searchable = [
        item.vendor?.name ?? "",
        item.description ?? "",
        item.invoice_number ?? "",
        item.status,
        item.erp_status ?? "",
        item.cost_type,
        item.date,
        dateDisplay,
        receivedDisplay,
        paidDisplay,
        amountDisplay,
        String(item.total_amount),
      ].join(" ").toLowerCase();

      return searchable.includes(searchValue);
    });
  }, [
    activeFilters.costType,
    activeFilters.dateFrom,
    activeFilters.dateTo,
    activeFilters.maxAmount,
    activeFilters.minAmount,
    activeFilters.status,
    directCosts,
    tableState.debouncedSearch,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredSummaryItems.length / tableState.perPage));

  React.useEffect(() => {
    if (tableState.page > totalPages) {
      tableState.setPage(totalPages);
      tableState.setSearchParams({ page: String(totalPages) });
    }
  }, [tableState.page, tableState.setPage, tableState.setSearchParams, totalPages]);

  const selectedSet = React.useMemo(() => new Set(tableState.selectedIds), [tableState.selectedIds]);

  const applyFilters = (nextFilters: DirectCostFilterState): void => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      costType: typeof nextFilters.costType === "string" ? nextFilters.costType : null,
      date_from: typeof nextFilters.dateFrom === "string" ? nextFilters.dateFrom : null,
      date_to: typeof nextFilters.dateTo === "string" ? nextFilters.dateTo : null,
      amount_min: typeof nextFilters.minAmount === "string" ? nextFilters.minAmount : null,
      amount_max: typeof nextFilters.maxAmount === "string" ? nextFilters.maxAmount : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const handleFilterChange = (nextFilters: DirectCostFilterState): void => {
    applyFilters(nextFilters);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!directCostToDelete) return;

    const response = await fetch(`/api/projects/${projectId}/direct-costs/${directCostToDelete.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { error?: string };
      toast.error(errorData.error || "Failed to delete direct cost");
      return;
    }

    toast.success("Direct cost deleted successfully");
    setDeleteDialogOpen(false);
    setDirectCostToDelete(null);
    router.refresh();
  };

  const handleOpenEdit = async (costId: string): Promise<void> => {
    setEditingCostId(costId);
    setIsEditSheetOpen(true);
    setIsEditLoading(true);
    setEditingInitialData(undefined);

    try {
      const response = await fetch(`/api/projects/${projectId}/direct-costs/${costId}`);
      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || "Failed to load direct cost for editing");
      }

      const payload = (await response.json()) as DirectCostUpdate;
      setEditingInitialData(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load direct cost";
      toast.error(message);
      setIsEditSheetOpen(false);
      setEditingCostId(null);
    } finally {
      setIsEditLoading(false);
    }
  };

  const handleCloseEditSheet = (): void => {
    setIsEditSheetOpen(false);
    setEditingCostId(null);
    setEditingInitialData(undefined);
  };

  const handleInlineStatusChange = async (costId: string, nextStatus: string): Promise<void> => {
    setUpdatingStatusId(costId);
    try {
      const response = await fetch(`/api/projects/${projectId}/direct-costs/${costId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || "Failed to update status");
      }

      toast.success(`Status updated to ${nextStatus}`);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update status";
      toast.error(message);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const runBulkStatusUpdate = async (status: "Approved" | "Revise and Resubmit"): Promise<void> => {
    if (tableState.selectedIds.length === 0) return;

    const response = await fetch(`/api/projects/${projectId}/direct-costs/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation: "status-update",
        ids: tableState.selectedIds,
        status,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      success_count?: number;
      failed_count?: number;
      total?: number;
    };

    if (!response.ok && response.status !== 207) {
      toast.error(payload.error || `Failed to ${status === "Approved" ? "approve" : "revise"} selected costs`);
      return;
    }

    if ((payload.failed_count ?? 0) > 0) {
      toast.warning(
        `Updated ${payload.success_count ?? 0} of ${payload.total ?? tableState.selectedIds.length} costs.`,
      );
    } else {
      toast.success(`${status === "Approved" ? "Approved" : "Revised"} ${payload.success_count ?? tableState.selectedIds.length} cost(s).`);
    }

    tableState.setSelectedIds([]);
    router.refresh();
  };

  const runBulkDelete = async (): Promise<void> => {
    if (tableState.selectedIds.length === 0) return;

    const response = await fetch(`/api/projects/${projectId}/direct-costs/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation: "delete",
        ids: tableState.selectedIds,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      success_count?: number;
      failed_count?: number;
      total?: number;
    };

    if (!response.ok && response.status !== 207) {
      toast.error(payload.error || "Failed to delete selected costs");
      return;
    }

    if ((payload.failed_count ?? 0) > 0) {
      toast.warning(`Deleted ${payload.success_count ?? 0} of ${payload.total ?? tableState.selectedIds.length} costs.`);
    } else {
      toast.success(`Deleted ${payload.success_count ?? tableState.selectedIds.length} cost(s).`);
    }

    tableState.setSelectedIds([]);
    router.refresh();
  };

  const executeBulkAction = async (): Promise<void> => {
    if (!bulkAction) return;

    if (bulkAction === "approve") {
      await runBulkStatusUpdate("Approved");
    }

    if (bulkAction === "revise") {
      await runBulkStatusUpdate("Revise and Resubmit");
    }

    if (bulkAction === "delete") {
      await runBulkDelete();
    }

    setBulkAction(null);
  };

  const summaryTableColumns = React.useMemo(
    () => [
      {
        id: "date",
        label: "Date",
        defaultVisible: true,
        render: (item: DirectCostRow) => <span className="font-medium text-foreground">{formatDate(item.date)}</span>,
        sortValue: (item: DirectCostRow) => item.date,
      },
      {
        id: "vendor",
        label: "Vendor",
        defaultVisible: true,
        render: (item: DirectCostRow) => item.vendor?.name ?? "Internal",
        sortValue: (item: DirectCostRow) => item.vendor?.name ?? "",
      },
      {
        id: "cost_type",
        label: "Type",
        defaultVisible: true,
        render: (item: DirectCostRow) => item.cost_type,
        sortValue: (item: DirectCostRow) => item.cost_type,
      },
      {
        id: "invoice_number",
        label: "Invoice #",
        defaultVisible: true,
        render: (item: DirectCostRow) => item.invoice_number ?? "-",
        sortValue: (item: DirectCostRow) => item.invoice_number ?? "",
      },
      {
        id: "status",
        label: "Status",
        defaultVisible: true,
        render: (item: DirectCostRow) => (
          <div onClick={(event) => event.stopPropagation()}>
            {updatingStatusId === item.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : (
              <Select
                value={STATUS_OPTIONS.includes(item.status as (typeof STATUS_OPTIONS)[number]) ? item.status : undefined}
                onValueChange={(nextStatus) => {
                  if (nextStatus !== item.status) {
                    void handleInlineStatusChange(item.id, nextStatus);
                  }
                }}
              >
                <SelectTrigger className={`h-7 w-[180px] text-xs ${statusClass(item.status)}`} aria-label="Quick edit status">
                  <SelectValue placeholder={item.status} />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ),
        sortValue: (item: DirectCostRow) => item.status,
      },
      {
        id: "erp_status",
        label: "ERP Status",
        defaultVisible: true,
        render: (item: DirectCostRow) => {
          const value = item.erp_status?.trim();
          if (!value) {
            return <span className="text-xs text-muted-foreground">Not synced</span>;
          }
          return <Badge variant="outline">{value}</Badge>;
        },
        sortValue: (item: DirectCostRow) => item.erp_status ?? "Not synced",
      },
      {
        id: "total_amount",
        label: "Amount",
        defaultVisible: true,
        render: (item: DirectCostRow) => <span className="tabular-nums text-muted-foreground">{formatAmount(item.total_amount)}</span>,
        sortValue: (item: DirectCostRow) => item.total_amount,
      },
      {
        id: "received_date",
        label: "Received",
        defaultVisible: true,
        render: (item: DirectCostRow) => formatDate(item.received_date),
        sortValue: (item: DirectCostRow) => item.received_date,
      },
      {
        id: "paid_date",
        label: "Paid",
        defaultVisible: false,
        render: (item: DirectCostRow) => formatDate(item.paid_date),
        sortValue: (item: DirectCostRow) => item.paid_date,
      },
      {
        id: "description",
        label: "Description",
        defaultVisible: false,
        render: (item: DirectCostRow) => item.description ?? "-",
        sortValue: (item: DirectCostRow) => item.description ?? "",
      },
    ],
    [updatingStatusId],
  );


  const totalAmount = React.useMemo(
    () => filteredSummaryItems.reduce((sum, item) => sum + item.total_amount, 0),
    [filteredSummaryItems],
  );

  const summaryIsFiltered =
    Boolean(tableState.searchInput) ||
    Boolean(activeFilters.status) ||
    Boolean(activeFilters.costType) ||
    Boolean(activeFilters.dateFrom) ||
    Boolean(activeFilters.dateTo) ||
    Boolean(activeFilters.minAmount) ||
    Boolean(activeFilters.maxAmount);

  if (summaryTab === "cost-code") {
    return (
      <CostCodeHierarchyView
        projectId={projectId}
        projectName={projectName}
        tabs={tabs}
        costCodeDetails={costCodeDetails}
        searchValue={tableState.searchInput}
        onSearchChange={tableState.setSearchInput}
        currentView={tableState.currentView}
        onViewChange={tableState.setCurrentView}
        visibleColumns={tableState.visibleColumns}
        onColumnVisibilityChange={tableState.setVisibleColumns}
        onEdit={handleOpenEdit}
        onView={(costId) => router.push(`/${projectId}/direct-costs/${costId}`)}
      />
    );
  }

  return (
    <>
      <UnifiedTablePage
        header={{
          title: "Direct Costs",
          description: "Track and manage direct project costs",
          actions: (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsImportDialogOpen(true)} title="Import direct costs from CSV">
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
              <Button size="sm" onClick={() => router.push(`/${projectId}/direct-costs/new`)} title="Add a new direct cost">
                <Plus className="mr-2 h-4 w-4" />
                New Direct Cost
              </Button>
            </div>
          ),
        }}
        tabs={tabs}
        toolbar={{
          totalItems: directCosts.length,
          filteredItems: filteredSummaryItems.length,
          selectedCount: tableState.selectedIds.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search vendor, invoice, date, amount, status...",
          currentView: tableState.currentView,
          onViewChange: tableState.setCurrentView,
          enabledViews: ["table", "list"],
          filters: DIRECT_COST_FILTERS,
          activeFilters,
          onFilterChange: handleFilterChange,
          onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
          columns: SUMMARY_COLUMNS,
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
          onExport: () => setIsExportDialogOpen(true),
          onBulkDelete: undefined,
        }}
        topContent={
          tableState.selectedIds.length > 0 ? (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-foreground">
                  <span className="font-medium">{tableState.selectedIds.length}</span> direct cost(s) selected
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setBulkAction("approve")}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setBulkAction("revise")}>
                    Revise
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsExportDialogOpen(true)}>
                    Export Selected
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setBulkAction("delete")}>
                    Delete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => tableState.setSelectedIds([])}>
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          ) : undefined
        }
        footerTotals={{
          label: "Totals",
          values: {
            total_amount: <span className="font-semibold tabular-nums">{formatAmount(totalAmount)}</span>,
          },
        }}
        data={{ items: filteredSummaryItems, isLoading: false, isFetching: false }}
        table={{
          columns: summaryTableColumns,
          getRowId: (item) => item.id,
          stickyHeader: true,
          onRowClick: (item) => router.push(`/${projectId}/direct-costs/${item.id}`),
          rowActions: (item) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleOpenEdit(item.id)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/${projectId}/direct-costs/${item.id}`)}>
                  View
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    setDirectCostToDelete(item);
                    setDeleteDialogOpen(true);
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ),
        }}
        sorting={{
          sortBy: tableState.sortBy,
          sortDirection: tableState.sortDirection,
          onSortChange: (sortBy, direction) => {
            tableState.setSortBy(sortBy);
            tableState.setSortDirection(direction);
            tableState.setSearchParams({ sort: sortBy, sort_dir: direction });
          },
        }}
        selection={{
          selectedIds: tableState.selectedIds,
          onSelectAll: (checked) => {
            if (checked) {
              tableState.setSelectedIds(filteredSummaryItems.map((item) => item.id));
              return;
            }
            tableState.setSelectedIds([]);
          },
          onSelectRow: (id, checked) => {
            if (checked) {
              if (selectedSet.has(id)) return;
              tableState.setSelectedIds((prev) => [...prev, id]);
              return;
            }
            tableState.setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
          },
        }}
        emptyState={{
          title: "No direct costs found",
          description: "You have not added any direct costs yet.",
          filteredDescription: "Try adjusting your search or filters.",
          isFiltered: summaryIsFiltered,
          action: (
            <Button size="sm" onClick={() => router.push(`/${projectId}/direct-costs/new`)}>
              Create your first direct cost
            </Button>
          ),
        }}
        pagination={{
          page: tableState.page,
          totalPages,
          perPage: tableState.perPage,
          clientSide: true,
          onPageChange: (page) => {
            tableState.setPage(page);
            tableState.setSearchParams({ page: String(page) });
          },
          onPerPageChange: (nextPerPage) => {
            tableState.setPerPage(Number(nextPerPage));
            tableState.setPage(1);
            tableState.setSearchParams({ per_page: nextPerPage, page: "1" });
          },
        }}
      />

      <AlertDialog open={Boolean(bulkAction)} onOpenChange={(open) => !open && setBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === "approve" && "Approve Selected Direct Costs"}
              {bulkAction === "revise" && "Revise Selected Direct Costs"}
              {bulkAction === "delete" && "Delete Selected Direct Costs"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "approve" &&
                `Approve ${tableState.selectedIds.length} selected direct cost(s)?`}
              {bulkAction === "revise" &&
                `Set ${tableState.selectedIds.length} selected direct cost(s) to Revise and Resubmit?`}
              {bulkAction === "delete" &&
                `Delete ${tableState.selectedIds.length} selected direct cost(s)? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void executeBulkAction();
              }}
              className={bulkAction === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Direct Cost</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete direct cost{" "}
              <strong>{directCostToDelete?.invoice_number ?? directCostToDelete?.id}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void handleDeleteConfirm();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Direct Cost
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Slideover open={isEditSheetOpen} onOpenChange={(open) => !open && handleCloseEditSheet()}>
        <SlideoverContent side="right" className="w-[92vw] sm:max-w-3xl overflow-y-auto p-0">
          <SlideoverHeader className="border-b p-4">
            <SlideoverTitle>
              Edit Direct Cost
              {editingCostId ? ` #${editingCostId.slice(0, 8)}` : ""}
            </SlideoverTitle>
          </SlideoverHeader>
          <div className="p-4">
            {isEditLoading || !editingInitialData ? (
              <div className="py-8 text-sm text-muted-foreground">Loading direct cost...</div>
            ) : (
              <DirectCostForm
                mode="edit"
                initialData={editingInitialData}
                projectId={Number(projectId)}
                onCancel={handleCloseEditSheet}
                onSuccess={() => {
                  handleCloseEditSheet();
                  router.refresh();
                }}
              />
            )}
          </div>
        </SlideoverContent>
      </Slideover>

      <DirectCostsImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        projectId={projectId}
        onImported={() => router.refresh()}
      />

      <ExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        projectId={Number(projectId)}
        selectedCostIds={tableState.selectedIds.length > 0 ? tableState.selectedIds : undefined}
      />
    </>
  );
}
