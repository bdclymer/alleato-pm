"use client";

import * as React from "react";
import type { ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  UnifiedTablePage,
  useUnifiedTableState,
} from "@/components/tables/unified";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EstimateRow } from "@/lib/schemas/estimates";
import {
  DEFAULT_VISIBLE_COLUMNS,
  ESTIMATE_FILTERS,
  formatDate,
  getEstimateSearchableText,
  getStatusColor,
  getStatusLabel,
} from "./estimates-table-utils";

interface EstimatesClientProps {
  projectId: string;
  projectName: string;
  estimates: EstimateRow[];
}

export function EstimatesClient({
  projectId,
  estimates,
}: EstimatesClientProps): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tableState = useUnifiedTableState({
    entityKey: "estimates",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "list"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "updated_at",
      sortDirection: "desc",
      visibleColumns: DEFAULT_VISIBLE_COLUMNS,
      filters: {
        status: searchParams.get("status") || undefined,
      },
    },
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [estimateToDelete, setEstimateToDelete] =
    React.useState<EstimateRow | null>(null);

  const filteredItems = React.useMemo(() => {
    const searchValue = tableState.debouncedSearch.trim().toLowerCase();
    const statusFilter =
      typeof tableState.activeFilters?.status === "string"
        ? (tableState.activeFilters.status as string).toLowerCase()
        : "";

    return estimates.filter((item) => {
      if (statusFilter && statusFilter !== "all" && item.status !== statusFilter)
        return false;

      if (searchValue) {
        return getEstimateSearchableText(item).includes(searchValue);
      }

      return true;
    });
  }, [tableState.activeFilters?.status, estimates, tableState.debouncedSearch]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / tableState.perPage)
  );

  const handleDelete = async () => {
    if (!estimateToDelete) return;
    try {
      const response = await fetch(
        `/api/projects/${projectId}/estimates/${estimateToDelete.estimate_id}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to delete estimate");
      toast.success("Estimate deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete estimate");
    } finally {
      setDeleteDialogOpen(false);
      setEstimateToDelete(null);
    }
  };

  const columns = React.useMemo(
    () => [
      {
        id: "title",
        label: "Title",
        defaultVisible: true,
        render: (item: EstimateRow) => (
          <span className="font-medium text-foreground">{item.title}</span>
        ),
        sortValue: (item: EstimateRow) => item.title,
      },
      {
        id: "estimate_number",
        label: "Estimate #",
        defaultVisible: true,
        render: (item: EstimateRow) => (
          <span className="text-muted-foreground">
            {item.estimate_number || "—"}
          </span>
        ),
        sortValue: (item: EstimateRow) => item.estimate_number ?? "",
      },
      {
        id: "revision",
        label: "Rev",
        defaultVisible: true,
        render: (item: EstimateRow) => (
          <span className="text-muted-foreground">R{item.revision}</span>
        ),
        sortValue: (item: EstimateRow) => item.revision,
      },
      {
        id: "status",
        label: "Status",
        defaultVisible: true,
        render: (item: EstimateRow) => (
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${getStatusColor(item.status)}`}
            />
            <span className="text-sm">{getStatusLabel(item.status)}</span>
          </div>
        ),
        sortValue: (item: EstimateRow) => item.status,
      },
      {
        id: "estimator",
        label: "Estimator",
        defaultVisible: true,
        render: (item: EstimateRow) => (
          <span className="text-muted-foreground">
            {item.estimator || "—"}
          </span>
        ),
        sortValue: (item: EstimateRow) => item.estimator ?? "",
      },
      {
        id: "estimate_date",
        label: "Date",
        defaultVisible: true,
        render: (item: EstimateRow) => (
          <span className="text-muted-foreground">
            {formatDate(item.estimate_date)}
          </span>
        ),
        sortValue: (item: EstimateRow) => item.estimate_date ?? "",
      },
      {
        id: "location",
        label: "Location",
        defaultVisible: false,
        render: (item: EstimateRow) => (
          <span className="text-muted-foreground">
            {item.location || "—"}
          </span>
        ),
        sortValue: (item: EstimateRow) => item.location ?? "",
      },
      {
        id: "updated_at",
        label: "Last Updated",
        defaultVisible: true,
        render: (item: EstimateRow) => (
          <span className="text-muted-foreground">
            {formatDate(item.updated_at)}
          </span>
        ),
        sortValue: (item: EstimateRow) => item.updated_at,
      },
    ],
    []
  );

  return (
    <>
      <UnifiedTablePage
        header={{
          title: "Estimates",
          description: "Manage project estimates and quantity takeoffs",
          actions: (
            <Button
              size="sm"
              onClick={() => router.push(`/${projectId}/estimates/new`)}
            >
              <Plus className="mr-1 h-4 w-4" />
              New Estimate
            </Button>
          ),
        }}
        toolbar={{
          totalItems: estimates.length,
          filteredItems: filteredItems.length,
          selectedCount: tableState.selectedIds?.length ?? 0,
          searchValue: tableState.search,
          onSearchChange: tableState.setSearch,
          searchPlaceholder: "Search estimates...",
          currentView: tableState.view,
          onViewChange: tableState.setView,
          enabledViews: ["table", "list"],
          filters: ESTIMATE_FILTERS,
          activeFilters: tableState.activeFilters,
          onFilterChange: tableState.setFilters,
          onClearFilters: tableState.clearFilters,
          columns,
          visibleColumns: tableState.visibleColumns,
          onColumnVisibilityChange: tableState.setVisibleColumns,
        }}
        data={{
          items: filteredItems,
          isLoading: false,
        }}
        table={{
          columns,
          getRowId: (item: EstimateRow) => String(item.estimate_id),
          onRowClick: (item: EstimateRow) =>
            router.push(
              `/${projectId}/estimates/${item.estimate_id}`
            ),
          rowActions: (item: EstimateRow) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(
                      `/${projectId}/estimates/${item.estimate_id}`
                    );
                  }}
                >
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(
                      `/${projectId}/estimates/${item.estimate_id}/edit`
                    );
                  }}
                >
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEstimateToDelete(item);
                    setDeleteDialogOpen(true);
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ),
        }}
        views={{
          list: (item: EstimateRow) => (
            <div className="flex items-center justify-between p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">
                  {item.title}
                </p>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{item.estimator || "No estimator"}</span>
                  <span>·</span>
                  <span>R{item.revision}</span>
                  <span>·</span>
                  <span>{formatDate(item.estimate_date)}</span>
                </div>
              </div>
              <div className="ml-4 flex items-center gap-2">
                <Badge variant="outline">{getStatusLabel(item.status)}</Badge>
              </div>
            </div>
          ),
        }}
        sorting={{
          sortBy: tableState.sortBy ?? "updated_at",
          sortDirection: tableState.sortDirection ?? "desc",
          onSortChange: tableState.setSortBy,
        }}
        selection={{
          selectedIds: tableState.selectedIds ?? [],
          onSelectAll: tableState.selectAll,
          onSelectRow: tableState.selectRow,
        }}
        emptyState={{
          title: "No estimates yet",
          description:
            "Create your first estimate to start building quantity takeoffs for this project.",
          filteredDescription: "No estimates match your current filters.",
          isFiltered: filteredItems.length < estimates.length,
          action: (
            <Button
              size="sm"
              onClick={() => router.push(`/${projectId}/estimates/new`)}
            >
              <Plus className="mr-1 h-4 w-4" />
              New Estimate
            </Button>
          ),
        }}
        pagination={{
          page: tableState.page,
          totalPages,
          perPage: tableState.perPage,
          onPageChange: tableState.setPage,
          onPerPageChange: tableState.setPerPage,
          clientSide: true,
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Estimate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{estimateToDelete?.title}
              &quot;? This action can be undone by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
