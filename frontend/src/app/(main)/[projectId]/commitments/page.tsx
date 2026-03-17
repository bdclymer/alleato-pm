"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExportDialog } from "@/components/commitments/ExportDialog";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
} from "@/components/tables/unified";
import {
  useCommitmentsList,
  useDeleteCommitment,
  useUpdateCommitmentInline,
} from "@/hooks/use-commitments-query";
import type { CommitmentListItem } from "@/lib/validation/commitments";
import { formatCurrency } from "@/lib/utils";
import {
  buildCommitmentTableColumns,
  type CommitmentInlineEditableField,
  commitmentColumns,
  commitmentDefaultVisibleColumns,
  commitmentFilters,
  renderCommitmentCard,
  renderCommitmentList,
  renderCommitmentRowActions,
} from "@/features/commitments/commitments-table-config";

const EMPTY_FILTERS: Record<string, FilterValue> = {
  status: undefined,
  type: undefined,
};

type FilterState = Record<string, FilterValue>;

export default function ProjectCommitmentsPage(): ReactElement {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId ?? "";

  const [isExportDialogOpen, setIsExportDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
  const [commitmentToDelete, setCommitmentToDelete] = React.useState<CommitmentListItem | null>(
    null,
  );

  const initialStatus = searchParams.get("status") ?? "";
  const initialType = searchParams.get("type") ?? "";
  const initialFilters: FilterState = {
    status: initialStatus || undefined,
    type: initialType || undefined,
  };

  const tableState = useUnifiedTableState({
    entityKey: "commitments",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "card", "list"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "number",
      sortDirection: "asc",
      visibleColumns: commitmentDefaultVisibleColumns,
      filters: initialFilters,
    },
  });

  const statusParam = searchParams.get("status") ?? undefined;
  const typeParam = searchParams.get("type") ?? undefined;

  React.useEffect(() => {
    const nextStatus = searchParams.get("status") ?? "";
    const nextType = searchParams.get("type") ?? "";

    tableState.setActiveFilters((prev) => {
      const normalizedStatus = nextStatus || undefined;
      const normalizedType = nextType || undefined;
      if (prev.status === normalizedStatus && prev.type === normalizedType) {
        return prev;
      }
      return {
        status: normalizedStatus,
        type: normalizedType,
      };
    });
  }, [searchParams, tableState.setActiveFilters]);

  const activeFilters = tableState.activeFilters as FilterState;

  const {
    data: response,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useCommitmentsList(projectId, {
    page: tableState.page,
    limit: tableState.perPage,
    status:
      statusParam ||
      (typeof activeFilters.status === "string" ? activeFilters.status : undefined),
    type:
      typeParam ||
      (typeof activeFilters.type === "string" ? activeFilters.type : undefined),
    search:
      (searchParams.get("search") ?? tableState.debouncedSearch) || undefined,
  });
  const resolvedError =
    error instanceof Error
      ? error
      : error
        ? new Error("Failed to load commitments")
        : undefined;

  const deleteCommitment = useDeleteCommitment(projectId);
  const inlineUpdateMutation = useUpdateCommitmentInline();

  const commitments = response?.data ?? [];

  const totalItems = response?.meta.total ?? commitments.length;
  const totalPages = response?.meta.totalPages ?? 1;

  const financialTotals = React.useMemo(() => {
    return commitments.reduce(
      (acc, item) => ({
        original_amount: acc.original_amount + item.original_amount,
        approved_change_orders: acc.approved_change_orders + item.approved_change_orders,
        pending_change_orders: acc.pending_change_orders + item.pending_change_orders,
        draft_change_orders: acc.draft_change_orders + item.draft_change_orders,
        revised_contract_amount: acc.revised_contract_amount + item.revised_contract_amount,
        invoiced_amount: acc.invoiced_amount + item.invoiced_amount,
        billed_to_date: acc.billed_to_date + item.billed_to_date,
        payments_issued: acc.payments_issued + item.payments_issued,
        remaining_balance: acc.remaining_balance + item.remaining_balance,
        balance_to_finish: acc.balance_to_finish + item.balance_to_finish,
      }),
      {
        original_amount: 0,
        approved_change_orders: 0,
        pending_change_orders: 0,
        draft_change_orders: 0,
        revised_contract_amount: 0,
        invoiced_amount: 0,
        billed_to_date: 0,
        payments_issued: 0,
        remaining_balance: 0,
        balance_to_finish: 0,
      },
    );
  }, [commitments]);

  const handleInlineEdit = React.useCallback(
    async (
      item: CommitmentListItem,
      field: CommitmentInlineEditableField,
      value: string,
    ) => {
      const trimmed = value.trim();
      if (!trimmed) {
        throw new Error("Value cannot be empty");
      }

      await inlineUpdateMutation.mutateAsync({
        id: item.id,
        field,
        value: trimmed,
      });
    },
    [inlineUpdateMutation],
  );

  const tableColumns = React.useMemo(
    () => buildCommitmentTableColumns({ onInlineEdit: handleInlineEdit }),
    [handleInlineEdit],
  );
  const sortedCommitments = React.useMemo(() => {
    if (!tableState.sortBy) return commitments;
    const sortColumn = tableColumns.find((column) => column.id === tableState.sortBy);
    const getSortValue = sortColumn?.sortValue;
    if (!getSortValue) return commitments;

    const sorted = [...commitments].sort((a, b) => {
      const valueA = getSortValue(a);
      const valueB = getSortValue(b);

      if (valueA == null && valueB == null) return 0;
      if (valueA == null) return tableState.sortDirection === "asc" ? -1 : 1;
      if (valueB == null) return tableState.sortDirection === "asc" ? 1 : -1;

      if (typeof valueA === "number" && typeof valueB === "number") {
        return tableState.sortDirection === "asc" ? valueA - valueB : valueB - valueA;
      }

      const comparison = String(valueA).localeCompare(String(valueB));
      return tableState.sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [commitments, tableColumns, tableState.sortBy, tableState.sortDirection]);

  const handleFilterChange = (nextFilters: FilterState) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setSearchParams({
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      type: typeof nextFilters.type === "string" ? nextFilters.type : null,
      page: "1",
    });
    tableState.setPage(1);
  };

  const handleRowClick = (item: CommitmentListItem) => {
    router.push(`/${projectId}/commitments/${item.id}`);
  };

  const handleEdit = (item: CommitmentListItem) => {
    router.push(`/${projectId}/commitments/${item.id}?edit=1`);
  };

  const handleDeleteIntent = (item: CommitmentListItem) => {
    setCommitmentToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!commitmentToDelete) return;

    setIsDeleting(true);
    try {
      await deleteCommitment.mutateAsync(commitmentToDelete.id);
    } catch {
      // Error toast is handled by the delete mutation hook
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setCommitmentToDelete(null);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    const ids = tableState.selectedIds;
    if (ids.length === 0) return;

    setIsBulkDeleting(true);
    try {
      const commitmentMap = new Map(commitments.map((item) => [item.id, item]));
      const failures: string[] = [];

      for (const id of ids) {
        try {
          const response = await fetch(`/api/commitments/${id}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const item = commitmentMap.get(id);
            const label = item?.number || item?.title || id;
            failures.push(
              `${label}: ${errorData.message || errorData.error || "Failed to delete commitment"}`,
            );
          }
        } catch {
          const item = commitmentMap.get(id);
          const label = item?.number || item?.title || id;
          failures.push(`${label}: Network error`);
        }
      }

      const successCount = ids.length - failures.length;

      if (successCount > 0) {
        await refetch();
        tableState.setSelectedIds([]);
      }

      if (failures.length > 0) {
        toast.error(
          `${successCount} deleted, ${failures.length} failed.\n${failures.slice(0, 3).join("\n")}`,
        );
      } else {
        toast.success(
          `${successCount} commitment${successCount === 1 ? "" : "s"} deleted`,
        );
      }
    } finally {
      setIsBulkDeleting(false);
      setBulkDeleteDialogOpen(false);
    }
  };

  const handleExport = () => {
    setIsExportDialogOpen(true);
  };

  const handleCreateSubcontract = () => {
    router.push(`/${projectId}/commitments/new?type=subcontract`);
  };

  const handleCreatePurchaseOrder = () => {
    router.push(`/${projectId}/commitments/new?type=purchase_order`);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds(sortedCommitments.map((item) => item.id));
    } else {
      tableState.setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      tableState.setSelectedIds((prev) => [...prev, id]);
    } else {
      tableState.setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
    }
  };

  const isFiltered =
    Boolean(tableState.searchInput) ||
    Boolean(activeFilters.status) ||
    Boolean(activeFilters.type);

  const tabs = [
    {
      label: "Commitments",
      href: `/${projectId}/commitments`,
      count: totalItems,
      isActive: !activeFilters.type,
    },
    {
      label: "Subcontracts",
      href: `/${projectId}/commitments?type=subcontract`,
      isActive: activeFilters.type === "subcontract",
    },
    {
      label: "Purchase Orders",
      href: `/${projectId}/commitments?type=purchase_order`,
      isActive: activeFilters.type === "purchase_order",
    },
    {
      label: "Recycle Bin",
      href: `/${projectId}/commitments/recycle-bin`,
    },
  ];

  return (
    <>
      <UnifiedTablePage
        header={{
          title: "Commitments",
          description: "Manage purchase orders and subcontracts",
          actions: (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
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
          ),
        }}
        tabs={tabs}
        layout={{
          fullBleedTable: false,
        }}
        features={{
          enableInlineEditing: true,
        }}
        toolbar={{
          totalItems,
          filteredItems: totalItems,
          selectedCount: tableState.selectedIds.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search commitments...",
          currentView: tableState.currentView,
          onViewChange: (view) => {
            tableState.setCurrentView(view);
            tableState.setSearchParams({ view });
          },
          filters: commitmentFilters,
          activeFilters,
          onFilterChange: handleFilterChange,
          onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
          columns: commitmentColumns,
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
          onBulkDelete: tableState.selectedIds.length > 0
            ? () => setBulkDeleteDialogOpen(true)
            : undefined,
        }}
        data={{
          items: sortedCommitments,
          isLoading,
          isFetching,
          error: resolvedError,
        }}
        table={{
          columns: tableColumns,
          getRowId: (item) => item.id,
          onRowClick: handleRowClick,
          rowActions: (item) => renderCommitmentRowActions(item, handleEdit, handleDeleteIntent),
        }}
        sorting={{
          sortBy: tableState.sortBy,
          sortDirection: tableState.sortDirection,
          onSortChange: (sortBy, direction) => {
            tableState.setSortBy(sortBy);
            tableState.setSortDirection(direction);
            tableState.setSearchParams({
              sort: sortBy,
              sort_dir: direction,
              page: "1",
            });
            tableState.setPage(1);
          },
        }}
        selection={{
          selectedIds: tableState.selectedIds,
          onSelectAll: handleSelectAll,
          onSelectRow: handleSelectRow,
        }}
        views={{
          card: (item) => renderCommitmentCard(item, handleRowClick),
          list: (item) => renderCommitmentList(item, handleRowClick),
        }}
        emptyState={{
          title: "No commitments found",
          description: "You have not added any commitments yet.",
          filteredDescription: "Try adjusting your search or filters",
          isFiltered,
        }}
        footerTotals={{
          label: "Totals",
          values: {
            original_amount: <span className="font-semibold">{formatCurrency(financialTotals.original_amount)}</span>,
            approved_change_orders: <span className="font-semibold">{formatCurrency(financialTotals.approved_change_orders)}</span>,
            pending_change_orders: <span className="font-semibold">{formatCurrency(financialTotals.pending_change_orders)}</span>,
            draft_change_orders: <span className="font-semibold">{formatCurrency(financialTotals.draft_change_orders)}</span>,
            revised_contract_amount: <span className="font-semibold">{formatCurrency(financialTotals.revised_contract_amount)}</span>,
            invoiced_amount: <span className="font-semibold">{formatCurrency(financialTotals.invoiced_amount)}</span>,
            billed_to_date: <span className="font-semibold">{formatCurrency(financialTotals.billed_to_date)}</span>,
            payments_issued: <span className="font-semibold">{formatCurrency(financialTotals.payments_issued)}</span>,
            remaining_balance: <span className="font-semibold">{formatCurrency(financialTotals.remaining_balance)}</span>,
            balance_to_finish: <span className="font-semibold">{formatCurrency(financialTotals.balance_to_finish)}</span>,
          },
        }}
        pagination={{
          page: tableState.page,
          totalPages,
          perPage: tableState.perPage,
          onPageChange: (nextPage) => {
            tableState.setPage(nextPage);
            tableState.setSearchParams({ page: String(nextPage) });
          },
          onPerPageChange: (nextPerPage) => {
            const parsed = Number(nextPerPage);
            if (!Number.isFinite(parsed) || parsed <= 0) return;
            tableState.setPerPage(parsed);
            tableState.setSearchParams({ per_page: String(parsed), page: "1" });
            tableState.setPage(1);
          },
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Commitment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete commitment{" "}
              <strong>{commitmentToDelete?.number}</strong> -{" "}
              <strong>{commitmentToDelete?.title}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Commitment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {tableState.selectedIds.length} Commitment
              {tableState.selectedIds.length === 1 ? "" : "s"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{tableState.selectedIds.length}</strong> selected commitment
              {tableState.selectedIds.length === 1 ? "" : "s"}?
              <br />
              <br />
              This action moves selected commitments to the recycle bin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting
                ? "Deleting..."
                : `Delete ${tableState.selectedIds.length} Commitment${tableState.selectedIds.length === 1 ? "" : "s"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        projectId={projectId}
      />
    </>
  );
}
