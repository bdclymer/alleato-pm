"use client";

import * as React from "react";

import { format } from "date-fns";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
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
import {
  buildTasksFilters,
  buildTasksTableColumns,
  renderTasksCard,
  renderTasksList,
  renderTasksRowActions,
  tasksColumns,
  tasksDefaultVisibleColumns,
} from "@/features/tasks/tasks-table-config";
import {
  type TasksRow,
  getTaskSourceLabel,
  getTaskSourceTarget,
  getTaskSourceTitle,
} from "@/features/tasks/task-utils";
import { apiFetch } from "@/lib/api-client";

type TasksFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: TasksFilterState = {
  status: undefined,
  source_system: undefined,
};

interface TasksTableClientProps {
  title: string;
  description: string;
  initialData?: TasksRow[];
  fetchPath?: string | null;
  projectId?: string | null;
  allowDelete?: boolean;
}

export function TasksTableClient({
  title,
  description,
  initialData = [],
  fetchPath = null,
  projectId = null,
  allowDelete = true,
}: TasksTableClientProps) {
  const router = useRouter();
  const pathname = usePathname() ?? (projectId ? `/${projectId}/tasks` : "/tasks");
  const searchParamsRaw = useSearchParams();
  const searchParams =
    (searchParamsRaw ?? new URLSearchParams()) as ReadonlyURLSearchParams;

  const [data, setData] = React.useState<TasksRow[]>(initialData);
  const [isLoading, setIsLoading] = React.useState(Boolean(fetchPath));
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  const rawTab = searchParams.get("tab");
  const activeTab: "all" | "open" | "closed" =
    rawTab === "open" ? "open" : rawTab === "closed" ? "closed" : "all";

  const tableState = useUnifiedTableState({
    entityKey: projectId ? `project-tasks-${projectId}` : "tasks",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "created_at",
      sortDirection: "desc",
      visibleColumns: tasksDefaultVisibleColumns,
      filters: EMPTY_FILTERS,
    },
  });

  const refresh = React.useCallback(async () => {
    if (!fetchPath) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiFetch<{ data?: TasksRow[] }>(fetchPath, {
        cache: "no-store",
      });
      setData(result.data ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load tasks";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPath]);

  React.useEffect(() => {
    if (!fetchPath) {
      setData(initialData);
      return;
    }
    void refresh();
  }, [fetchPath, initialData, refresh]);

  const filters = React.useMemo(() => buildTasksFilters(data), [data]);
  const tableColumns = React.useMemo(
    () => buildTasksTableColumns(projectId),
    [projectId],
  );
  const allowedColumnIds = React.useMemo(
    () => tasksColumns.map((column) => column.id),
    [],
  );
  const sanitizedVisibleColumns = React.useMemo(() => {
    const filtered = tableState.visibleColumns.filter((id) => allowedColumnIds.includes(id));
    return filtered.length > 0 ? filtered : tasksDefaultVisibleColumns;
  }, [allowedColumnIds, tableState.visibleColumns]);

  const openCount = React.useMemo(
    () => data.filter((item) => !["complete", "closed", "done", "cancelled"].includes((item.status ?? "").toLowerCase())).length,
    [data],
  );
  const closedCount = React.useMemo(
    () => data.filter((item) => ["complete", "closed", "done", "cancelled"].includes((item.status ?? "").toLowerCase())).length,
    [data],
  );

  const filteredData = React.useMemo(() => {
    const searchTerm = tableState.debouncedSearch.trim().toLowerCase();

    return data.filter((item) => {
      // Tab filter
      if (activeTab === "open") {
        if (["complete", "closed", "done", "cancelled"].includes((item.status ?? "").toLowerCase())) return false;
      } else if (activeTab === "closed") {
        if (!["complete", "closed", "done", "cancelled"].includes((item.status ?? "").toLowerCase())) return false;
      }

      if (
        tableState.activeFilters.status &&
        typeof tableState.activeFilters.status === "string" &&
        (item.status ?? "").toLowerCase() !== tableState.activeFilters.status.toLowerCase()
      ) {
        return false;
      }

      if (
        tableState.activeFilters.source_system &&
        typeof tableState.activeFilters.source_system === "string" &&
        getTaskSourceLabel(item).toLowerCase() !== tableState.activeFilters.source_system.toLowerCase()
      ) {
        return false;
      }

      if (!searchTerm) return true;

      return (
        (item.metadata_id ?? "").toLowerCase().includes(searchTerm) ||
        (item.segment_id ?? "").toLowerCase().includes(searchTerm) ||
        (item.source_chunk_id ?? "").toLowerCase().includes(searchTerm) ||
        (item.description ?? "").toLowerCase().includes(searchTerm) ||
        (item.assignee_name ?? "").toLowerCase().includes(searchTerm) ||
        (item.project_name ?? "").toLowerCase().includes(searchTerm) ||
        (item.assignee_email ?? "").toLowerCase().includes(searchTerm) ||
        (item.source_date ?? "").toLowerCase().includes(searchTerm) ||
        getTaskSourceLabel(item).toLowerCase().includes(searchTerm) ||
        getTaskSourceTitle(item).toLowerCase().includes(searchTerm)
      );
    });
  }, [activeTab, data, tableState.activeFilters.source_system, tableState.activeFilters.status, tableState.debouncedSearch]);

  const selectableTaskIds = React.useMemo(
    () =>
      filteredData
        .map((item) => item.id)
        .filter((id): id is string => Boolean(id)),
    [filteredData],
  );

  const isFiltered =
    tableState.debouncedSearch.trim().length > 0 ||
    Object.values(tableState.activeFilters).some((value) => value !== undefined);

  const handleFilterChange = (nextFilters: Record<string, FilterValue>) => {
    tableState.setActiveFilters(nextFilters);
    tableState.setPage(1);
  };

  const handleDeleteTask = React.useCallback(
    async (item: TasksRow) => {
      if (!allowDelete) return;
      if (!item.id) {
        toast.error("Task is missing an ID and cannot be deleted");
        return;
      }

      try {
        await apiFetch(`/api/tasks/${item.id}`, { method: "DELETE" });
        toast.success("Task deleted");
        tableState.setSelectedIds((prev) => prev.filter((id) => id !== item.id));

        if (fetchPath) {
          await refresh();
        } else {
          setData((prev) => prev.filter((task) => task.id !== item.id));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete task");
      }
    },
    [allowDelete, fetchPath, refresh, tableState],
  );

  const handleSelectAll = React.useCallback(
    (checked: boolean) => {
      tableState.setSelectedIds(checked ? selectableTaskIds : []);
    },
    [selectableTaskIds, tableState],
  );

  const handleSelectRow = React.useCallback(
    (id: string, checked: boolean) => {
      tableState.setSelectedIds((prev) => {
        if (checked) {
          if (prev.includes(id)) return prev;
          return [...prev, id];
        }
        return prev.filter((itemId) => itemId !== id);
      });
    },
    [tableState],
  );

  const handleBulkDelete = React.useCallback(async () => {
    if (!allowDelete) return;
    const selectedIds = tableState.selectedIds;
    if (selectedIds.length === 0) return;

    setIsBulkDeleting(true);
    try {
      await apiFetch("/api/tasks/bulk", {
        method: "DELETE",
        body: JSON.stringify({ task_ids: selectedIds }),
      });

      toast.success(`Deleted ${selectedIds.length} tasks`);
      tableState.setSelectedIds([]);

      if (fetchPath) {
        await refresh();
      } else {
        setData((prev) => prev.filter((task) => !selectedIds.includes(task.id ?? "")));
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete selected tasks";
      toast.error(message);
    } finally {
      setIsBulkDeleting(false);
      setBulkDeleteDialogOpen(false);
    }
  }, [allowDelete, fetchPath, refresh, tableState]);

  const handleOpenSource = React.useCallback(
    (item: TasksRow) => {
      const target = getTaskSourceTarget(item, projectId);
      if (!target) {
        toast.error("This task does not have a linked source record yet");
        return;
      }

      if (target.external) {
        window.open(target.href, "_blank", "noopener,noreferrer");
        return;
      }

      router.push(target.href);
    },
    [projectId, router],
  );

  const handleExport = React.useCallback(() => {
    const headers = [
      "Task Name",
      "Project Name",
      "Assigned User",
      "Source",
      "Created From",
      "Source Date",
      "Assignee Email",
      "Due Date",
      "Priority",
      "Status",
    ];
    const rows = filteredData.map((task) => [
      task.description || "",
      task.project_name || "",
      task.assignee_name || "",
      getTaskSourceLabel(task),
      getTaskSourceTitle(task),
      task.source_date ? format(new Date(task.source_date), "yyyy-MM-dd") : "",
      task.assignee_email || "",
      task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd") : "",
      task.priority || "",
      task.status || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tasks-${format(new Date(), "yyyy-MM-dd")}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }, [filteredData]);

  return (
    <>
      <UnifiedTablePage
        header={{
          title,
          description,
        }}
        tabs={[
          { label: "All", href: `${pathname}?tab=all`, count: data.length, isActive: activeTab === "all" },
          { label: "Open", href: `${pathname}?tab=open`, count: openCount, isActive: activeTab === "open" },
          { label: "Closed", href: `${pathname}?tab=closed`, count: closedCount, isActive: activeTab === "closed" },
        ]}
        toolbar={{
          totalItems: data.length,
          filteredItems: filteredData.length,
          selectedCount: tableState.selectedIds.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search tasks...",
          currentView: tableState.currentView,
          onViewChange: (view) => {
            tableState.setCurrentView(view);
            tableState.setSearchParams({ view });
          },
          filters,
          activeFilters: tableState.activeFilters,
          onFilterChange: handleFilterChange,
          onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
          columns: tasksColumns,
          visibleColumns: sanitizedVisibleColumns,
          onColumnVisibilityChange: (columns) =>
            tableState.setVisibleColumns(columns.filter((id) => allowedColumnIds.includes(id))),
          onExport: handleExport,
          onBulkDelete: allowDelete ? () => setBulkDeleteDialogOpen(true) : undefined,
        }}
        data={{
          items: filteredData,
          isLoading,
          isFetching: false,
        }}
        table={{
          columns: tableColumns,
          getRowId: (item) => item.id ?? "",
          onRowClick: handleOpenSource,
          rowActions: (item) =>
            renderTasksRowActions(
              item,
              handleOpenSource,
              allowDelete ? handleDeleteTask : undefined,
              projectId,
            ),
        }}
        views={{
          card: (item) => renderTasksCard(item, handleOpenSource),
          list: (item) => renderTasksList(item, handleOpenSource),
        }}
        selection={{
          selectedIds: tableState.selectedIds,
          onSelectAll: handleSelectAll,
          onSelectRow: handleSelectRow,
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
        emptyState={{
          title: "No tasks found",
          description: "Tasks appear here when they are linked to a source record.",
          filteredDescription: "Try adjusting your search or filters.",
          isFiltered,
        }}
        features={{
          enableExport: true,
          enableBulkDelete: allowDelete,
          enableRowSelection: allowDelete,
        }}
        layout={{
          fullBleedTable: false,
          toolbarInlineWithHeader: true,
          containerClassName: "pt-0",
        }}
      />

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected tasks</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {tableState.selectedIds.length} selected task
              {tableState.selectedIds.length === 1 ? "" : "s"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isBulkDeleting || tableState.selectedIds.length === 0}
            >
              {isBulkDeleting ? "Deleting..." : "Delete selected"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
