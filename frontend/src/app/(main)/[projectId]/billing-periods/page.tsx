"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Plus } from "lucide-react";

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
  UnifiedTablePage,
  useUnifiedTableState,
  type TableColumn,
} from "@/components/tables/unified";
import {
  useBillingPeriodsList,
  type BillingPeriodItem,
} from "@/hooks/use-billing-periods";

// =============================================================================
// Helpers
// =============================================================================

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// =============================================================================
// Column Configs
// =============================================================================

const columnConfigs = [
  { id: "name", label: "Period Name", alwaysVisible: true },
  { id: "start_date", label: "Start Date", defaultVisible: true },
  { id: "end_date", label: "End Date", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
];

const defaultVisibleColumns = columnConfigs
  .filter((c) => c.defaultVisible !== false || c.alwaysVisible)
  .map((c) => c.id);

// =============================================================================
// Page Component
// =============================================================================

export default function ProjectBillingPeriodsPage(): ReactElement {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId ?? "";

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [periodToDelete, setPeriodToDelete] = React.useState<BillingPeriodItem | null>(null);

  // ─── Table State ───────────────────────────────────────────────────────────

  const tableState = useUnifiedTableState({
    entityKey: "billing-periods",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "start_date",
      sortDirection: "desc",
      visibleColumns: defaultVisibleColumns,
      filters: {},
    },
  });

  // ─── Data ──────────────────────────────────────────────────────────────────

  const { data: rawPeriods = [], isLoading, isFetching, error } = useBillingPeriodsList(projectId);

  const resolvedError =
    error instanceof Error ? error : error ? new Error("Failed to load billing periods") : undefined;

  // ─── Client-side search ────────────────────────────────────────────────────

  const periods = React.useMemo(() => {
    let items = rawPeriods;
    const search = tableState.debouncedSearch.toLowerCase().trim();
    if (search) {
      items = items.filter((p) => p.name.toLowerCase().includes(search));
    }
    return items;
  }, [rawPeriods, tableState.debouncedSearch]);

  // ─── Table Columns ─────────────────────────────────────────────────────────

  const tableColumns: TableColumn<BillingPeriodItem>[] = React.useMemo(
    () => [
      {
        id: "name",
        label: "Period Name",
        alwaysVisible: true,
        render: (period) => (
          <span className="font-medium">{period.name}</span>
        ),
        sortable: true,
        sortValue: (period) => period.name,
      },
      {
        id: "start_date",
        label: "Start Date",
        defaultVisible: true,
        render: (period) => (
          <span className="text-sm">{formatDate(period.start_date)}</span>
        ),
        sortable: true,
        sortValue: (period) => period.start_date ?? "",
      },
      {
        id: "end_date",
        label: "End Date",
        defaultVisible: true,
        render: (period) => (
          <span className="text-sm">{formatDate(period.end_date)}</span>
        ),
        sortable: true,
        sortValue: (period) => period.end_date ?? "",
      },
      {
        id: "status",
        label: "Status",
        defaultVisible: true,
        render: (period) => (
          <span
            className={
              period.is_closed
                ? "text-xs font-medium text-muted-foreground"
                : "text-xs font-medium text-primary"
            }
          >
            {period.is_closed ? "Closed" : "Open"}
          </span>
        ),
        sortable: true,
        sortValue: (period) => (period.is_closed ? 1 : 0),
      },
    ],
    [],
  );

  // Sort
  const sortedPeriods = React.useMemo(() => {
    if (!tableState.sortBy) return periods;
    const col = tableColumns.find((c) => c.id === tableState.sortBy);
    const getSortValue = col?.sortValue;
    if (!getSortValue) return periods;
    return [...periods].sort((a, b) => {
      const va = getSortValue(a);
      const vb = getSortValue(b);
      if (va == null && vb == null) return 0;
      if (va == null) return tableState.sortDirection === "asc" ? -1 : 1;
      if (vb == null) return tableState.sortDirection === "asc" ? 1 : -1;
      if (typeof va === "number" && typeof vb === "number") {
        return tableState.sortDirection === "asc" ? va - vb : vb - va;
      }
      const cmp = String(va).localeCompare(String(vb));
      return tableState.sortDirection === "asc" ? cmp : -cmp;
    });
  }, [periods, tableColumns, tableState.sortBy, tableState.sortDirection]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function handleDeleteIntent(period: BillingPeriodItem) {
    setPeriodToDelete(period);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    setDeleteDialogOpen(false);
    setPeriodToDelete(null);
  }

  // ─── Row Actions ───────────────────────────────────────────────────────────

  function renderRowActions(period: BillingPeriodItem): ReactElement {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!period.is_closed && (
            <DropdownMenuItem
              onClick={() =>
                router.push(`/${projectId}/invoicing/new?billing_period_id=${period.id}`)
              }
            >
              Create Invoice
            </DropdownMenuItem>
          )}
          {!period.is_closed && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => handleDeleteIntent(period)}
            >
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const isFiltered = Boolean(tableState.searchInput);
  const totalItems = sortedPeriods.length;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <UnifiedTablePage
        header={{
          title: "Billing Periods",
          description: "Manage project invoice billing periods",
          actions: (
            <Button
              size="sm"
              onClick={() => router.push(`/${projectId}/billing-periods/new`)}
            >
              <Plus />
              New Billing Period
            </Button>
          ),
        }}
        toolbar={{
          totalItems,
          filteredItems: totalItems,
          selectedCount: tableState.selectedIds.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search billing periods...",
          currentView: tableState.currentView,
          onViewChange: (view) => {
            tableState.setCurrentView(view);
            tableState.setSearchParams({ view });
          },
          filters: [],
          activeFilters: tableState.activeFilters,
          onFilterChange: tableState.setActiveFilters,
          onClearFilters: () => tableState.setActiveFilters({}),
          columns: columnConfigs,
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
        }}
        data={{
          items: sortedPeriods,
          isLoading,
          isFetching,
          error: resolvedError,
        }}
        table={{
          columns: tableColumns,
          getRowId: (item) => String(item.id),
          rowActions: renderRowActions,
        }}
        sorting={{
          sortBy: tableState.sortBy,
          sortDirection: tableState.sortDirection,
          onSortChange: (sortBy, direction) => {
            tableState.setSortBy(sortBy);
            tableState.setSortDirection(direction);
            tableState.setSearchParams({ sort: sortBy, sort_dir: direction, page: "1" });
            tableState.setPage(1);
          },
        }}
        selection={{
          selectedIds: tableState.selectedIds,
          onSelectAll: (checked) => {
            tableState.setSelectedIds(
              checked ? sortedPeriods.map((p) => String(p.id)) : [],
            );
          },
          onSelectRow: (id, checked) => {
            tableState.setSelectedIds((prev) =>
              checked ? [...prev, String(id)] : prev.filter((x) => x !== String(id)),
            );
          },
        }}
        emptyState={{
          title: "No billing periods",
          description: "Create a billing period to group invoices by date range.",
          filteredDescription: "Try adjusting your search.",
          isFiltered,
          action: (
            <Button
              size="sm"
              onClick={() => router.push(`/${projectId}/billing-periods/new`)}
            >
              <Plus />
              New Billing Period
            </Button>
          ),
        }}
        pagination={{
          page: tableState.page,
          totalPages: Math.max(1, Math.ceil(totalItems / tableState.perPage)),
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
            <AlertDialogTitle>Delete Billing Period</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{periodToDelete?.name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
