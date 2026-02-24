"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Plus } from "lucide-react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  type CostCodeDetailRow,
  DEFAULT_COST_CODE_VISIBLE_COLUMNS,
  DEFAULT_VISIBLE_COLUMNS,
  DIRECT_COST_FILTERS,
  SUMMARY_COLUMNS,
  csvCell,
  formatAmount,
  formatDate,
  getStatusVariant,
} from "./direct-costs-table-utils";
import { CostCodeHierarchyView } from "./cost-code-hierarchy-view";
import { DirectCostForm } from "@/components/direct-costs/DirectCostForm";
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
};

type DirectCostFilterState = Record<string, FilterValue>;
type SummaryTab = "summary" | "cost-code";

interface DirectCostsClientProps {
  projectId: string;
  projectName: string;
  directCosts: DirectCostRow[];
  costCodeDetails: CostCodeDetailRow[];
}

const EMPTY_FILTERS: DirectCostFilterState = { status: undefined, costType: undefined };

function hasAllVisibleColumns(current: string[], required: string[]): boolean {
  return required.every((column) => current.includes(column));
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
      allowedViews: ["table"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: summaryTab === "summary" ? "date" : null,
      sortDirection: summaryTab === "summary" ? "desc" : "asc",
      visibleColumns: summaryTab === "summary" ? DEFAULT_VISIBLE_COLUMNS : DEFAULT_COST_CODE_VISIBLE_COLUMNS,
      filters: {
        status: searchParams.get("status") || undefined,
        costType: searchParams.get("costType") || undefined,
      },
    },
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [directCostToDelete, setDirectCostToDelete] = React.useState<DirectCostRow | null>(null);
  const [editingCostId, setEditingCostId] = React.useState<string | null>(null);
  const [editingInitialData, setEditingInitialData] = React.useState<DirectCostUpdate | undefined>(undefined);
  const [isEditSheetOpen, setIsEditSheetOpen] = React.useState(false);
  const [isEditLoading, setIsEditLoading] = React.useState(false);

  React.useEffect(() => {
    if (summaryTab !== "summary") return;
    const nextStatus = searchParams.get("status") ?? "";
    const nextCostType = searchParams.get("costType") ?? "";

    tableState.setActiveFilters((prev) => {
      const normalizedStatus = nextStatus || undefined;
      const normalizedCostType = nextCostType || undefined;
      if (prev.status === normalizedStatus && prev.costType === normalizedCostType) {
        return prev;
      }
      return { status: normalizedStatus, costType: normalizedCostType };
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
    const statusFilter = typeof activeFilters.status === "string" ? activeFilters.status : "";
    const typeFilter = typeof activeFilters.costType === "string" ? activeFilters.costType : "";

    return directCosts.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (typeFilter && item.cost_type !== typeFilter) return false;
      if (!searchValue) return true;

      const vendorName = item.vendor?.name ?? "";
      const description = item.description ?? "";
      const invoiceNumber = item.invoice_number ?? "";

      return (
        vendorName.toLowerCase().includes(searchValue) ||
        description.toLowerCase().includes(searchValue) ||
        invoiceNumber.toLowerCase().includes(searchValue)
      );
    });
  }, [activeFilters.costType, activeFilters.status, directCosts, tableState.debouncedSearch]);

  const summaryTableColumns = React.useMemo(
    () => [
      { id: "date", label: "Date", defaultVisible: true, render: (item: DirectCostRow) => formatDate(item.date), sortValue: (item: DirectCostRow) => item.date },
      { id: "vendor", label: "Vendor", defaultVisible: true, render: (item: DirectCostRow) => item.vendor?.name ?? "Internal", sortValue: (item: DirectCostRow) => item.vendor?.name ?? "" },
      { id: "cost_type", label: "Type", defaultVisible: true, render: (item: DirectCostRow) => item.cost_type, sortValue: (item: DirectCostRow) => item.cost_type },
      { id: "invoice_number", label: "Invoice #", defaultVisible: true, render: (item: DirectCostRow) => item.invoice_number ?? "-", sortValue: (item: DirectCostRow) => item.invoice_number ?? "" },
      { id: "status", label: "Status", defaultVisible: true, render: (item: DirectCostRow) => <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>, sortValue: (item: DirectCostRow) => item.status },
      { id: "total_amount", label: "Amount", defaultVisible: true, render: (item: DirectCostRow) => formatAmount(item.total_amount), sortValue: (item: DirectCostRow) => item.total_amount },
      { id: "received_date", label: "Received", defaultVisible: true, render: (item: DirectCostRow) => formatDate(item.received_date), sortValue: (item: DirectCostRow) => item.received_date },
      { id: "paid_date", label: "Paid", defaultVisible: false, render: (item: DirectCostRow) => formatDate(item.paid_date), sortValue: (item: DirectCostRow) => item.paid_date },
      { id: "description", label: "Description", defaultVisible: false, render: (item: DirectCostRow) => item.description ?? "-", sortValue: (item: DirectCostRow) => item.description ?? "" },
    ],
    [],
  );

  const handleFilterChange = (nextFilters: DirectCostFilterState): void => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      costType: typeof nextFilters.costType === "string" ? nextFilters.costType : null,
      page: "1",
    });
    tableState.setPage(1);
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

  const handleExportSummary = (): void => {
    if (filteredSummaryItems.length === 0) {
      toast.info("No direct costs to export");
      return;
    }

    const visibleColumns = summaryTableColumns.filter((column) => tableState.visibleColumns.includes(column.id));
    const headers = visibleColumns.map((column) => column.label);
    const rows = filteredSummaryItems.map((item) =>
      visibleColumns.map((column) => csvCell(column.sortValue ? column.sortValue(item) : "")).join(","),
    );

    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `direct-costs-${projectId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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

  const summaryIsFiltered =
    Boolean(tableState.searchInput) || Boolean(activeFilters.status) || Boolean(activeFilters.costType);

  return (
    <>
      <UnifiedTablePage
        header={{
          title: "Direct Costs",
          description: "Track and manage direct project costs",
          actions: (
            <Button size="sm" onClick={() => router.push(`/${projectId}/direct-costs/new`)}>
              <Plus className="mr-2 h-4 w-4" />
              New Direct Cost
            </Button>
          ),
        }}
        tabs={tabs}
        toolbar={{
          totalItems: directCosts.length,
          filteredItems: filteredSummaryItems.length,
          selectedCount: tableState.selectedIds.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search direct costs...",
          currentView: tableState.currentView,
          onViewChange: tableState.setCurrentView,
          enabledViews: ["table"],
          filters: DIRECT_COST_FILTERS,
          activeFilters,
          onFilterChange: handleFilterChange,
          onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
          columns: SUMMARY_COLUMNS,
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
          onExport: handleExportSummary,
          onBulkDelete: async () => {
            if (tableState.selectedIds.length === 0) return;

            const deleteResults = await Promise.all(
              tableState.selectedIds.map(async (id) => {
                const response = await fetch(`/api/projects/${projectId}/direct-costs/${id}`, { method: "DELETE" });
                return response.ok;
              }),
            );

            const failedDeletes = deleteResults.filter((success) => !success).length;
            if (failedDeletes > 0) {
              toast.error(`Failed to delete ${failedDeletes} direct cost(s)`);
              return;
            }

            toast.success(`Deleted ${tableState.selectedIds.length} direct cost(s)`);
            tableState.setSelectedIds([]);
            router.refresh();
          },
        }}
        data={{ items: filteredSummaryItems, isLoading: false, isFetching: false }}
        table={{
          columns: summaryTableColumns,
          getRowId: (item) => item.id,
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
        features={{ enableViews: false }}
      />

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
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Direct Cost
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={isEditSheetOpen} onOpenChange={(open) => !open && handleCloseEditSheet()}>
        <SheetContent side="right" className="w-[92vw] sm:max-w-3xl overflow-y-auto p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle>
              Edit Direct Cost
              {editingCostId ? ` #${editingCostId.slice(0, 8)}` : ""}
            </SheetTitle>
          </SheetHeader>
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
        </SheetContent>
      </Sheet>
    </>
  );
}
