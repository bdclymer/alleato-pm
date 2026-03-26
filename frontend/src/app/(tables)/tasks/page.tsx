"use client";

import * as React from "react";

import { format } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Calendar, CircleAlert, FolderKanban, User } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  type TasksRow,
  buildTasksTableColumns,
  tasksColumns,
  tasksDefaultVisibleColumns,
  tasksFilters,
  renderTasksCard,
  renderTasksList,
  renderTasksRowActions,
} from "@/features/tasks/tasks-table-config";

type TasksFilterState = Record<string, FilterValue>;

const EMPTY_FILTERS: TasksFilterState = {
  status: undefined,
};

function TaskPreviewPane({
  task,
  onOpenSourceMeeting,
}: {
  task: TasksRow | null;
  onOpenSourceMeeting: (task: TasksRow) => void;
}) {
  if (!task) {
    return (
      <div className="p-6 space-y-3 text-sm text-muted-foreground">
        <p>Select a task to preview details.</p>
        <p className="text-xs">Use arrow keys to move between rows.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold leading-tight">
          {task.description || "Untitled Task"}
        </p>
        {task.metadata_id ? (
          <Button
            size="icon"
            variant="ghost"
            aria-label="Open source meeting"
            title="Open source meeting"
            onClick={() => onOpenSourceMeeting(task)}
          >
            <ArrowUpRight />
          </Button>
        ) : null}
      </div>

      <dl className="space-y-3 text-xs">
        <div>
          <dt className="text-muted-foreground inline-flex items-center gap-1.5">
            <CircleAlert className="h-3.5 w-3.5" />
            Status
          </dt>
          <dd className="text-foreground mt-1">{task.status || "-"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground inline-flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            Assignee
          </dt>
          <dd className="text-foreground mt-1">{task.assignee_name || task.assignee_email || "-"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground inline-flex items-center gap-1.5">
            <FolderKanban className="h-3.5 w-3.5" />
            Project
          </dt>
          <dd className="text-foreground mt-1">{task.project_name || "-"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Created Date
          </dt>
          <dd className="text-foreground mt-1">
            {task.created_at ? format(new Date(task.created_at), "MMM d, yyyy") : "-"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Due Date
          </dt>
          <dd className="text-foreground mt-1">
            {task.due_date ? format(new Date(task.due_date), "MMM d, yyyy") : "-"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default function TasksPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = React.useState<TasksRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  const tableState = useUnifiedTableState({
    entityKey: "tasks",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table", "card", "list"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "created_at",
      sortDirection: "desc",
      visibleColumns: tasksDefaultVisibleColumns,
      filters: EMPTY_FILTERS,
    },
  });

  const { activeFilters } = tableState;

  // ── Data fetching ──────────────────────────────────────────────
  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with your API endpoint
      const resp = await fetch("/api/tasks", { cache: "no-store" });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result?.error || "Failed to load");
      setData((result.data || []) as TasksRow[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  // ── Table columns ──────────────────────────────────────────────
  const tableColumns = React.useMemo(() => buildTasksTableColumns(), []);
  const allowedColumnIds = React.useMemo(
    () => tasksColumns.map((column) => column.id),
    [],
  );
  const sanitizedVisibleColumns = React.useMemo(() => {
    const filtered = tableState.visibleColumns.filter((id) => allowedColumnIds.includes(id));
    return filtered.length > 0 ? filtered : tasksDefaultVisibleColumns;
  }, [allowedColumnIds, tableState.visibleColumns]);

  // ── Filtering ──────────────────────────────────────────────────
  const filteredData = React.useMemo(() => {
    const searchTerm = tableState.debouncedSearch.trim().toLowerCase();

    return data.filter((item) => {
      if (activeFilters.status && typeof activeFilters.status === "string" && (item.status ?? "").toLowerCase() !== (activeFilters.status as string).toLowerCase()) return false;
      if (!searchTerm) return true;
      return (
        (item.metadata_id ?? "").toLowerCase().includes(searchTerm) ||
        (item.segment_id ?? "").toLowerCase().includes(searchTerm) ||
        (item.source_chunk_id ?? "").toLowerCase().includes(searchTerm) ||
        (item.description ?? "").toLowerCase().includes(searchTerm) ||
        (item.assignee_name ?? "").toLowerCase().includes(searchTerm) ||
        (item.project_name ?? "").toLowerCase().includes(searchTerm) ||
        (item.assignee_email ?? "").toLowerCase().includes(searchTerm)
      );
    });
  }, [activeFilters.status, data, tableState.debouncedSearch]);

  const totalItems = data.length;
  const filteredItems = filteredData.length;
  const selectedTaskId = searchParams.get("detail");
  const selectedTask =
    (selectedTaskId
      ? filteredData.find((item) => item.id && item.id === selectedTaskId)
      : null) ??
    filteredData[0] ??
    null;
  const activeTaskId = selectedTask?.id ?? null;
  const selectableTaskIds = React.useMemo(
    () =>
      filteredData
        .map((item) => item.id)
        .filter((id): id is string => Boolean(id)),
    [filteredData],
  );
  const isFiltered =
    tableState.debouncedSearch.trim().length > 0 ||
    Object.values(activeFilters).some((v) => v !== undefined);

  const handleFilterChange = (filters: Record<string, FilterValue>) => {
    tableState.setActiveFilters(filters);
    tableState.setPage(1);
  };

  const handleDeleteTask = React.useCallback(
    async (item: TasksRow) => {
      if (!item.id) {
        toast.error("Task is missing an ID and cannot be deleted");
        return;
      }
      try {
        const resp = await fetch(`/api/tasks/${item.id}`, { method: "DELETE" });
        if (!resp.ok) throw new Error("Failed to delete task");
        toast.success("Task deleted");
        tableState.setSelectedIds((prev) => prev.filter((id) => id !== item.id));
        void refresh();
      } catch {
        toast.error("Failed to delete task");
      }
    },
    [refresh, tableState],
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
    const selectedIds = tableState.selectedIds;
    if (selectedIds.length === 0) return;

    setIsBulkDeleting(true);
    try {
      const resp = await fetch("/api/tasks/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_ids: selectedIds }),
      });
      const result = await resp.json();
      if (!resp.ok) {
        throw new Error(result?.error || "Failed to delete selected tasks");
      }

      toast.success(`Deleted ${selectedIds.length} tasks`);
      tableState.setSelectedIds([]);
      await refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete selected tasks";
      toast.error(message);
    } finally {
      setIsBulkDeleting(false);
      setBulkDeleteDialogOpen(false);
    }
  }, [refresh, tableState]);

  const handleView = (item: TasksRow) => {
    if (!item.id) return;
    tableState.setSearchParams({ detail: item.id });
  };

  const handleOpenSourceMeeting = (item: TasksRow) => {
    if (!item.metadata_id) return;
    router.push(`/meetings/${item.metadata_id}`);
  };

  const handleExport = () => {
    const headers = ["Task Name", "Project Name", "Assigned User", "Assignee Email", "Due Date", "Priority", "Status"];
    const rows = filteredData.map((d) => [
      d.description || "",
      d.project_name || "",
      d.assignee_name || "",
      d.assignee_email || "",
      d.due_date ? format(new Date(d.due_date), "yyyy-MM-dd") : "",
      d.priority || "",
      d.status || "",
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasks-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <UnifiedTablePage
      header={{
        title: "Tasks",
        description: "Manage tasks",
      }}
      toolbar={{
        totalItems,
        filteredItems,
        selectedCount: tableState.selectedIds.length,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search tasks...",
        currentView: tableState.currentView,
        onViewChange: (view) => {
          tableState.setCurrentView(view);
          tableState.setSearchParams({ view });
        },
        enabledViews: ["table", "card", "list"],
        filters: tasksFilters,
        activeFilters,
        onFilterChange: handleFilterChange,
        onClearFilters: () => handleFilterChange(EMPTY_FILTERS),
        columns: tasksColumns,
        visibleColumns: sanitizedVisibleColumns,
        onColumnVisibilityChange: (columns) =>
          tableState.setVisibleColumns(columns.filter((id) => allowedColumnIds.includes(id))),
        onExport: handleExport,
        onBulkDelete: () => setBulkDeleteDialogOpen(true),
      }}
      data={{
        items: filteredData,
        isLoading,
        isFetching: false,
      }}
      table={{
        columns: tableColumns,
        getRowId: (item) => item.id ?? "",
        activeRowId: activeTaskId,
        onRowClick: handleView,
        rowActions: (item) => renderTasksRowActions(item, handleView, handleDeleteTask),
      }}
      sidePanel={{
        content: (
          <TaskPreviewPane
            task={selectedTask}
            onOpenSourceMeeting={handleOpenSourceMeeting}
          />
        ),
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
      views={{
        card: (item) => renderTasksCard(item, handleView),
        list: (item) => renderTasksList(item, handleView),
      }}
      emptyState={{
        title: "No tasks found",
        description: "Get started by adding your first record.",
        filteredDescription: "Try adjusting your search or filters.",
        isFiltered,
      }}
      features={{
        enableExport: true,
        enableBulkDelete: true,
        enableRowSelection: true,
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
