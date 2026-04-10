"use client";

import * as React from "react";
import type { ReactElement, ReactNode } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Loader2, Plus, RefreshCw } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExportDialog } from "@/components/commitments/ExportDialog";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
} from "@/components/tables/unified";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCommitmentsList,
  useDeleteCommitment,
} from "@/hooks/use-commitments-query";
import type { CommitmentListItem } from "@/lib/validation/commitments";
import { formatCurrency } from "@/lib/utils";
import {
  buildCommitmentTableColumns,
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
  tab: undefined,
};

// ─── Commitment Change Orders expanded sub-row ───────────────────────────────

interface CommitmentChangeOrder {
  id: string;
  number: string;
  title: string;
  status: string;
  amount: number;
  requested_date: string | null;
  approved_date: string | null;
}

interface CommitmentChangeOrdersRowProps {
  commitmentId: string;
  colSpan: number;
}

function CommitmentChangeOrdersRow({
  commitmentId,
  colSpan,
}: CommitmentChangeOrdersRowProps): ReactNode {
  const [changeOrders, setChangeOrders] = React.useState<CommitmentChangeOrder[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/commitments/${commitmentId}/change-orders`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          setChangeOrders(json.data ?? []);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [commitmentId]);

  const formatAmt = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <div className="bg-muted/40 border-y border-border px-6 py-3">
          {isLoading ? (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading change orders…
            </div>
          ) : changeOrders.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">No change orders</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-1.5 pr-6 font-medium">#</th>
                  <th className="pb-1.5 pr-6 font-medium">Description</th>
                  <th className="pb-1.5 pr-6 font-medium">Status</th>
                  <th className="pb-1.5 pr-6 font-medium text-right">Amount</th>
                  <th className="pb-1.5 font-medium">Requested</th>
                </tr>
              </thead>
              <tbody>
                {changeOrders.map((co) => (
                  <tr key={co.id} className="border-t border-border/50">
                    <td className="py-1.5 pr-6 font-mono text-muted-foreground">
                      {co.number}
                    </td>
                    <td className="py-1.5 pr-6 max-w-xs truncate">{co.title}</td>
                    <td className="py-1.5 pr-6 capitalize">{co.status}</td>
                    <td className="py-1.5 pr-6 text-right tabular-nums">
                      {formatAmt(co.amount)}
                    </td>
                    <td className="py-1.5 text-muted-foreground">
                      {co.requested_date
                        ? new Date(co.requested_date).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Project-level Change Orders tab table ────────────────────────────────────

interface ProjectCORow extends CommitmentChangeOrder {
  commitment_id?: string;
  commitment_number?: string;
}

interface ProjectChangeOrdersTableProps {
  changeOrders: ProjectCORow[];
  isLoading: boolean;
}

function ProjectChangeOrdersTable({
  changeOrders,
  isLoading,
}: ProjectChangeOrdersTableProps): ReactNode {
  const formatAmt = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading change orders…
      </div>
    );
  }

  if (changeOrders.length === 0) {
    return (
      <p className="py-8 text-sm text-muted-foreground text-center">
        No change orders for this project.
      </p>
    );
  }

  return (
    <div className="rounded-md border border-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Commitment</th>
            <th className="px-4 py-3 font-medium text-right">Amount</th>
            <th className="px-4 py-3 font-medium">Requested</th>
          </tr>
        </thead>
        <tbody>
          {changeOrders.map((co, idx) => (
            <tr
              key={co.id}
              className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
            >
              <td className="px-4 py-3 font-mono text-muted-foreground text-xs">
                {co.number}
              </td>
              <td className="px-4 py-3 max-w-xs truncate">{co.title}</td>
              <td className="px-4 py-3 capitalize">{co.status}</td>
              <td className="px-4 py-3 text-muted-foreground text-xs">
                {co.commitment_number ?? "—"}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatAmt(co.amount)}
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">
                {co.requested_date
                  ? new Date(co.requested_date).toLocaleDateString()
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type FilterState = Record<string, FilterValue>;

export default function ProjectCommitmentsPage(): ReactElement {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId ?? "";
  const queryClient = useQueryClient();

  const [isExportDialogOpen, setIsExportDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
  const [commitmentToDelete, setCommitmentToDelete] = React.useState<CommitmentListItem | null>(
    null,
  );
  const [isSyncing, setIsSyncing] = React.useState(false);

  // ─── Project-level change orders (Change Orders tab) ──────────────────────
  const [projectChangeOrders, setProjectChangeOrders] = React.useState<CommitmentChangeOrder[]>([]);
  const [isLoadingProjectCOs, setIsLoadingProjectCOs] = React.useState(false);

  const initialStatus = searchParams.get("status") ?? "";
  const initialType = searchParams.get("type") ?? "";
  const initialTab = searchParams.get("tab") ?? "";
  const initialFilters: FilterState = {
    status: initialStatus || undefined,
    type: initialType || undefined,
    tab: initialTab || undefined,
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
    const nextTab = searchParams.get("tab") ?? "";

    tableState.setActiveFilters((prev) => {
      const normalizedStatus = nextStatus || undefined;
      const normalizedType = nextType || undefined;
      const normalizedTab = nextTab || undefined;
      if (
        prev.status === normalizedStatus &&
        prev.type === normalizedType &&
        prev.tab === normalizedTab
      ) {
        return prev;
      }
      return {
        status: normalizedStatus,
        type: normalizedType,
        tab: normalizedTab,
      };
    });
  }, [searchParams, tableState.setActiveFilters]);

  const activeFilters = tableState.activeFilters as FilterState;

  // Fetch project-level change orders when the Change Orders tab is active
  React.useEffect(() => {
    if (activeFilters.tab !== "change-orders") return;
    let cancelled = false;
    setIsLoadingProjectCOs(true);

    fetch(`/api/projects/${projectId}/commitment-change-orders`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          setProjectChangeOrders(json.data ?? []);
          setIsLoadingProjectCOs(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoadingProjectCOs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeFilters.tab, projectId]);

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

  // ─── Acumatica Sync ──────────────────────────────────────────────────────

  const handleStatusChange = React.useCallback(
    async (id: string, status: string) => {
      try {
        const resp = await fetch(`/api/commitments/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error ?? "Failed to update status");
        toast.success("Status updated");
        await queryClient.invalidateQueries({ queryKey: ["commitments", projectId] });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update status");
      }
    },
    [projectId, queryClient],
  );

  const handleErpSync = React.useCallback(async () => {
    setIsSyncing(true);
    try {
      const resp = await fetch("/api/sync/acumatica/commitments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: Number(projectId) }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Sync failed");
      const { result } = data;
      toast.success(
        `Commitments sync complete: ${result.created} created, ${result.updated} updated` +
          (result.errors.length > 0 ? ` (${result.errors.length} errors)` : ""),
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Commitments sync failed");
    } finally {
      setIsSyncing(false);
    }
  }, [projectId, router]);

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

  // Row expansion state — collapsed by default
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const handleToggleExpand = React.useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const tableColumns = React.useMemo(
    () => buildCommitmentTableColumns(projectId, expandedIds, handleToggleExpand, handleStatusChange),
    [projectId, expandedIds, handleToggleExpand, handleStatusChange],
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
      isActive: !activeFilters.type && activeFilters.tab !== "change-orders",
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
                  <Plus />
                  Create
                  <ChevronDown />
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
          customActions: (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    disabled={isSyncing}
                    onClick={handleErpSync}
                    aria-label="Sync from ERP"
                  >
                    <RefreshCw className={isSyncing ? "animate-spin" : undefined} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sync commitments from Acumatica</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ),
        }}
        data={{
          items: activeFilters.tab === "change-orders" ? [] : sortedCommitments,
          isLoading: activeFilters.tab === "change-orders" ? false : isLoading,
          isFetching: activeFilters.tab === "change-orders" ? false : isFetching,
          error: activeFilters.tab === "change-orders" ? undefined : resolvedError,
        }}
        table={{
          columns: tableColumns,
          getRowId: (item) => item.id,
          onRowClick: handleRowClick,
          rowActions: (item) => renderCommitmentRowActions(item, handleEdit, handleDeleteIntent),
          renderExpandedRow: (item, colSpan) => {
            if (!expandedIds.has(item.id)) return null;
            return <CommitmentChangeOrdersRow commitmentId={item.id} colSpan={colSpan} />;
          },
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
        pagination={activeFilters.tab === "change-orders" ? undefined : {
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
        topContent={
          activeFilters.tab === "change-orders" ? (
            <ProjectChangeOrdersTable
              changeOrders={projectChangeOrders}
              isLoading={isLoadingProjectCOs}
            />
          ) : undefined
        }
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
