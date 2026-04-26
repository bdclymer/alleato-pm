"use client";

import * as React from "react";
import type { ReactElement, ReactNode } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, FileSignature, FileText, MoreHorizontal, Plus, RefreshCw, RotateCcw, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PermissionGate } from "@/components/domain/permissions/PermissionGate";
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
import { apiFetch } from "@/lib/api-client";
import {
  buildCommitmentTableColumns,
  commitmentColumns,
  commitmentDefaultVisibleColumns,
  commitmentFilters,
  renderCommitmentCard,
  renderCommitmentList,
  renderCommitmentRowActions,
} from "@/features/commitments/commitments-table-config";
import { EmptyState } from "@/components/ds";
import { Skeleton } from "@/components/ui/skeleton";

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

    apiFetch<{ data?: CommitmentChangeOrder[] }>(`/api/commitments/${commitmentId}/change-orders`)
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
            <div className="space-y-1.5 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-6">
                  <Skeleton className="h-3.5 w-8" />
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-3.5 w-20 ml-auto" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
              ))}
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
      <div className="space-y-2 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24 ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (changeOrders.length === 0) {
    return (
      <EmptyState
        icon={<FileText />}
        title="No change orders for this project"
        description="Commitment change orders will appear here once created."
      />
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

  // Derive activeFilters directly from the URL so they are always in sync with
  // the current searchParams on every render — no useEffect lag, no TDZ risk.
  const activeFilters = React.useMemo<FilterState>(
    () => ({
      status: searchParams.get("status") || undefined,
      type: searchParams.get("type") || undefined,
      tab: searchParams.get("tab") || undefined,
    }),
    [searchParams],
  );

  // Fetch project-level change orders when the Change Orders tab is active
  React.useEffect(() => {
    if (activeFilters.tab !== "change-orders") return;
    let cancelled = false;
    setIsLoadingProjectCOs(true);

    apiFetch<{ data?: CommitmentChangeOrder[] }>(`/api/projects/${projectId}/commitment-change-orders`)
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

  const isRecycleBinTab = activeFilters.tab === "recycle-bin";
  const isChangeOrdersTab = activeFilters.tab === "change-orders";

  const {
    data: response,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useCommitmentsList(projectId, {
    page: tableState.page,
    limit: tableState.perPage,
    status: typeof activeFilters.status === "string" ? activeFilters.status : undefined,
    type: typeof activeFilters.type === "string" ? activeFilters.type : undefined,
    search:
      (searchParams.get("search") ?? tableState.debouncedSearch) || undefined,
    deleted: isRecycleBinTab ? "only" : "exclude",
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
        await apiFetch(`/api/commitments/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
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
      const data = await apiFetch<{
        result: { created: number; updated: number; errors: unknown[] };
      }>("/api/sync/acumatica/commitments", {
        method: "POST",
        body: JSON.stringify({ projectId: Number(projectId) }),
      });
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

  const expandableCommitmentIds = React.useMemo(
    () => commitments.map((commitment) => commitment.id),
    [commitments],
  );
  const allRowsExpanded =
    expandableCommitmentIds.length > 0 &&
    expandableCommitmentIds.every((id) => expandedIds.has(id));
  const handleToggleAllRows = React.useCallback(() => {
    setExpandedIds((prev) => {
      const shouldCollapse =
        expandableCommitmentIds.length > 0 &&
        expandableCommitmentIds.every((id) => prev.has(id));

      if (shouldCollapse) return new Set();
      return new Set(expandableCommitmentIds);
    });
  }, [expandableCommitmentIds]);

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
    tableState.setSearchParams({
      status: typeof nextFilters.status === "string" ? nextFilters.status : null,
      type: typeof nextFilters.type === "string" ? nextFilters.type : null,
      tab: typeof nextFilters.tab === "string" ? nextFilters.tab : null,
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
  const [recycleDeleteDialogOpen, setRecycleDeleteDialogOpen] = React.useState(false);
  const [recycleCommitmentToDelete, setRecycleCommitmentToDelete] =
    React.useState<CommitmentListItem | null>(null);
  const [isPermanentlyDeleting, setIsPermanentlyDeleting] = React.useState(false);

  const handleRestoreIntent = async (item: CommitmentListItem) => {
    try {
      await apiFetch(`/api/commitments/${item.id}/restore`, { method: "POST" });
      toast.success(`"${item.number}" restored`);
      tableState.setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== item.id));
      await refetch();
    } catch (err) {
      toast.error("Could not restore commitment", {
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    }
  };

  const handlePermanentDeleteIntent = (item: CommitmentListItem) => {
    setRecycleCommitmentToDelete(item);
    setRecycleDeleteDialogOpen(true);
  };

  const handlePermanentDeleteConfirm = async () => {
    if (!recycleCommitmentToDelete) return;
    setIsPermanentlyDeleting(true);
    try {
      await apiFetch(`/api/commitments/${recycleCommitmentToDelete.id}/permanent-delete`, {
        method: "DELETE",
      });
      toast.success(`"${recycleCommitmentToDelete.number}" permanently deleted`);
      tableState.setSelectedIds((prev) =>
        prev.filter((selectedId) => selectedId !== recycleCommitmentToDelete.id),
      );
      await refetch();
    } catch (err) {
      toast.error("Could not permanently delete commitment", {
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    } finally {
      setIsPermanentlyDeleting(false);
      setRecycleDeleteDialogOpen(false);
      setRecycleCommitmentToDelete(null);
    }
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
          await apiFetch(`/api/commitments/${id}`, {
            method: "DELETE",
          });
        } catch (err) {
          const item = commitmentMap.get(id);
          const label = item?.number || item?.title || id;
          failures.push(
            `${label}: ${err instanceof Error ? err.message : "Failed to delete commitment"}`,
          );
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
      isActive: !activeFilters.type && !activeFilters.tab,
    },
    {
      label: "Subcontracts",
      href: `/${projectId}/commitments?type=subcontract`,
      isActive: activeFilters.type === "subcontract" && !activeFilters.tab,
    },
    {
      label: "Purchase Orders",
      href: `/${projectId}/commitments?type=purchase_order`,
      isActive: activeFilters.type === "purchase_order" && !activeFilters.tab,
    },
    {
      label: "Recycle Bin",
      href: `/${projectId}/commitments?tab=recycle-bin`,
      isActive: isRecycleBinTab,
    },
  ];

  return (
    <>
      <UnifiedTablePage
        header={{
          title: "Commitments",
          description: "Manage purchase orders and subcontracts",
          mobileActionsInline: true,
          actions: (
            <PermissionGate projectId={projectId} module="contracts" level="write">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="max-sm:h-11 max-sm:w-11 max-sm:p-0" aria-label="Create commitment">
                    <Plus />
                    <span className="max-sm:sr-only">Create</span>
                    <ChevronDown className="max-sm:hidden" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleCreateSubcontract}>
                    <FileSignature className="mr-2 h-4 w-4 text-muted-foreground" />
                    Subcontract
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCreatePurchaseOrder}>
                    <ShoppingCart className="mr-2 h-4 w-4 text-muted-foreground" />
                    Purchase Order
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </PermissionGate>
          ),
        }}
        tabs={tabs}
        layout={{
          fullBleedTable: true,
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
          onExport: handleExport,
          onBulkDelete: !isRecycleBinTab && tableState.selectedIds.length > 0
            ? () => setBulkDeleteDialogOpen(true)
            : undefined,
          customActions: (
            <TooltipProvider>
              {!isRecycleBinTab && !isChangeOrdersTab ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      disabled={expandableCommitmentIds.length === 0}
                      onClick={handleToggleAllRows}
                      aria-label={allRowsExpanded ? "Collapse all rows" : "Expand all rows"}
                    >
                      <ChevronDown className={allRowsExpanded ? "rotate-180 transition-transform" : "transition-transform"} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {allRowsExpanded ? "Collapse all rows" : "Expand all rows"}
                  </TooltipContent>
                </Tooltip>
              ) : null}
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
          items: isChangeOrdersTab ? [] : sortedCommitments,
          isLoading: isChangeOrdersTab ? false : isLoading,
          isFetching: isChangeOrdersTab ? false : isFetching,
          error: isChangeOrdersTab ? undefined : resolvedError,
        }}
        table={{
          columns: tableColumns,
          getRowId: (item) => item.id,
          onRowClick: isRecycleBinTab ? undefined : handleRowClick,
          rowActions: (item) =>
            isRecycleBinTab ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Row actions">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => void handleRestoreIntent(item)}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handlePermanentDeleteIntent(item)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Forever
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              renderCommitmentRowActions(item, handleEdit, handleDeleteIntent)
            ),
          renderExpandedRow: (item, colSpan) => {
            if (isRecycleBinTab || !expandedIds.has(item.id)) return null;
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
          card: (item) => renderCommitmentCard(item, isRecycleBinTab ? () => undefined : handleRowClick),
          list: (item) => renderCommitmentList(item, isRecycleBinTab ? () => undefined : handleRowClick),
        }}
        emptyState={{
          title: isRecycleBinTab ? "Recycle Bin is empty" : "No commitments found",
          description: isRecycleBinTab
            ? "Deleted commitments will appear here."
            : "You have not added any commitments yet.",
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
        pagination={isChangeOrdersTab ? undefined : {
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
          isChangeOrdersTab ? (
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

      <AlertDialog open={recycleDeleteDialogOpen} onOpenChange={setRecycleDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Commitment</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <strong>{recycleCommitmentToDelete?.number}</strong>? This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPermanentlyDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDeleteConfirm}
              disabled={isPermanentlyDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPermanentlyDeleting ? "Deleting..." : "Delete Forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        projectId={projectId}
        selectedCommitmentIds={tableState.selectedIds}
      />
    </>
  );
}
