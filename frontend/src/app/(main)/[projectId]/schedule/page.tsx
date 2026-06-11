"use client";
/* eslint-disable design-system/no-raw-heading */

/**
 * =============================================================================
 * PROJECT SCHEDULE PAGE
 * =============================================================================
 *
 * Main scheduling page with multiple view modes inspired by Microsoft Planner:
 * - Grid: Detailed table view with all columns
 * - Board: Kanban-style grouped by status
 * - Schedule: Split view with task table + Gantt chart (original)
 * - Timeline: Enhanced Gantt chart view
 * - Calendar: Monthly calendar view
 *
 * Features:
 * - Task CRUD operations
 * - Hierarchy management (indent/outdent)
 * - Summary statistics
 * - Context menu actions
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { PageShell } from "@/components/layout";
import { GanttChart } from "@/components/scheduling/gantt-chart";
import { TaskEditModal } from "@/components/scheduling/task-edit-modal";
import { ImportExportModal } from "@/components/scheduling/import-export-modal";
import {
  TaskContextMenu,
  useTaskContextMenu,
} from "@/components/scheduling/task-context-menu";
import type { RelatedScheduleActionItem } from "@/components/scheduling/related-action-items";
import {
  ScheduleGridView,
  ScheduleBoardView,
  ScheduleCalendarView,
  ScheduleTimelineView,
} from "@/components/scheduling/schedule-views";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InfoAlert } from "@/components/ds/InfoAlert";
import { TableToolbar, type FilterConfig, type ColumnConfig } from "@/components/tables/unified";
import {
  Plus,
  Columns,
  Upload,
  RefreshCw,
  Calendar,
  AlertCircle,
  Table2,
  Kanban,
  CalendarDays,
  GanttChart as GanttIcon,
  ChevronDown,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  ScheduleTask,
  ScheduleTaskWithHierarchy,
  ScheduleTaskCreate,
  ScheduleTaskUpdate,
  TaskStatus,
} from "@/types/scheduling";
import { useScheduleTasks } from "@/hooks/use-schedule-tasks";
import { appToast as toast } from "@/lib/toast/app-toast";
import { apiFetch } from "@/lib/api-client";

// =============================================================================
// TYPES
// =============================================================================

type ViewMode = "grid" | "board" | "schedule" | "timeline" | "calendar";
type DateFilter = "all" | "today" | "this_week";
type QuickAddTaskInput = {
  name: string;
  parentId?: string | null;
  status?: TaskStatus;
  startDate?: string | null;
  finishDate?: string | null;
};

type BulkDeleteProgress = {
  phase: "deleting" | "complete";
  total: number;
  deleted: number;
  failed: number;
};

type RelatedActionItemsResponse = {
  data?: RelatedScheduleActionItem[];
};

const SCHEDULE_FILTERS: FilterConfig[] = [
  {
    id: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "not_started", label: "Not Started" },
      { value: "in_progress", label: "In Progress" },
      { value: "complete", label: "Complete" },
      { value: "on_hold", label: "On Hold" },
    ],
  },
  {
    id: "is_milestone",
    label: "Type",
    type: "select",
    options: [
      { value: "true", label: "Milestones" },
      { value: "false", label: "Tasks" },
    ],
  },
];

const SCHEDULE_COLUMNS: ColumnConfig[] = [
  { id: "name", label: "Task Name", alwaysVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "start_date", label: "Start Date", defaultVisible: true },
  { id: "finish_date", label: "Finish Date", defaultVisible: true },
  { id: "duration_days", label: "Duration", defaultVisible: true },
  { id: "percent_complete", label: "% Complete", defaultVisible: true },
  { id: "assigned_to", label: "Assigned To", defaultVisible: true },
  { id: "wbs_code", label: "WBS Code", defaultVisible: false },
  { id: "constraint_type", label: "Constraint", defaultVisible: false },
];

// =============================================================================
// DATE FILTER HELPERS
// =============================================================================

function isTaskActiveOnDate(task: ScheduleTask, range: { start: Date; end: Date }): boolean {
  const taskStart = task.start_date ? parseISO(task.start_date) : null;
  const taskEnd = task.finish_date ? parseISO(task.finish_date) : null;

  if (!taskStart && !taskEnd) return false;

  if (taskStart && taskEnd) {
    // Task overlaps the range if it starts before range end and ends after range start
    return taskStart <= range.end && taskEnd >= range.start;
  }
  if (taskStart) {
    return taskStart >= range.start && taskStart <= range.end;
  }
  if (taskEnd) {
    return taskEnd >= range.start && taskEnd <= range.end;
  }
  return false;
}

function filterTasksByDate(
  tasks: ScheduleTaskWithHierarchy[],
  dateFilter: DateFilter
): ScheduleTaskWithHierarchy[] {
  if (dateFilter === "all") return tasks;

  const now = new Date();
  const range =
    dateFilter === "today"
      ? { start: startOfDay(now), end: endOfDay(now) }
      : { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };

  function filterHierarchy(list: ScheduleTaskWithHierarchy[]): ScheduleTaskWithHierarchy[] {
    return list.flatMap((task) => {
      const filteredChildren = filterHierarchy(task.children ?? []);
      const matches = isTaskActiveOnDate(task, range);
      if (matches || filteredChildren.length > 0) {
        return [{ ...task, children: filteredChildren }];
      }
      return [];
    });
  }

  return filterHierarchy(tasks);
}

// =============================================================================
// DATE FILTER PILLS
// =============================================================================

const DATE_FILTER_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
];

function DateFilterPills({
  value,
  onChange,
}: {
  value: DateFilter;
  onChange: (v: DateFilter) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 pb-1">
      {DATE_FILTER_OPTIONS.map(({ value: v, label }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            value === v
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// VIEW MODE TABS (Microsoft Planner Style)
// =============================================================================

const viewModeConfig: {
  mode: ViewMode;
  label: string;
  icon: typeof Table2;
}[] = [
  { mode: "grid", label: "Gantt", icon: GanttIcon },
  { mode: "schedule", label: "Table", icon: Table2 },
  { mode: "board", label: "Board", icon: Kanban },
  { mode: "timeline", label: "Timeline", icon: Columns },
  { mode: "calendar", label: "Calendar", icon: CalendarDays },
];

function ViewModeTabs({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <nav className="flex overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide" aria-label="View mode">
      <div className="flex min-w-max space-x-2 sm:space-x-5">
        {viewModeConfig.map(({ mode: viewMode, label, icon: Icon }) => (
          <button
            type="button"
            key={viewMode}
            onClick={() => onChange(viewMode)}
            aria-label={`Switch to ${label} view`}
            className={cn(
              "group inline-flex min-h-11 items-center gap-2 whitespace-nowrap px-2 pb-2 pt-2 text-sm font-medium transition-colors",
              mode === viewMode
                ? "text-[hsl(var(--schedule-view-active))]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

// =============================================================================
// BULK ACTION BAR
// =============================================================================

function BulkActionBar({
  selectedCount,
  deleteProgress,
  onUpdateStatus,
  onDelete,
  onClear,
}: {
  selectedCount: number;
  deleteProgress: BulkDeleteProgress | null;
  onUpdateStatus: (status: TaskStatus) => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const isDeleting = deleteProgress?.phase === "deleting";
  const isDeleteProgressVisible = Boolean(deleteProgress);
  const progressValue = deleteProgress
    ? Math.min(100, Math.round(((deleteProgress.deleted + deleteProgress.failed) / deleteProgress.total) * 100))
    : 0;

  return (
    <InfoAlert
      variant="info"
      role="status"
      className="animate-reveal text-foreground"
      icon={
        <span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-primary" />
      }
    >
      <div className="flex w-full flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <div className="hidden h-4 w-px bg-border sm:block" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isDeleteProgressVisible}>
                Update Status
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onUpdateStatus("not_started")}>
                Not Started
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus("in_progress")}>
                In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus("complete")}>
                Complete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="destructive" size="sm" onClick={onDelete} disabled={isDeleteProgressVisible}>
            {isDeleting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-4 w-4" />
            )}
            {isDeleting ? "Deleting" : deleteProgress?.phase === "complete" ? "Deleted" : "Delete"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear} disabled={isDeleteProgressVisible} className="ml-auto">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {deleteProgress && (
          <div className="space-y-2" role="status" aria-live="polite">
            <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
              <span>
                {deleteProgress.phase === "complete"
                  ? `Deleted ${deleteProgress.deleted} of ${deleteProgress.total} tasks`
                  : `Deleting ${deleteProgress.total} tasks`}
              </span>
              <span>{progressValue}%</span>
            </div>
            <Progress value={progressValue} className="h-1.5" />
          </div>
        )}
      </div>
    </InfoAlert>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function flattenIds(tasks: ScheduleTaskWithHierarchy[]): Set<string> {
  const ids = new Set<string>();
  const walk = (list: ScheduleTaskWithHierarchy[]) => {
    for (const t of list) {
      ids.add(t.id);
      if (t.children?.length) walk(t.children);
    }
  };
  walk(tasks);
  return ids;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ProjectSchedulePage() {
  const params = useParams()!;
  const projectId = params.projectId as string;

  // State
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<ScheduleTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [parentTaskIdForNew, setParentTaskIdForNew] = useState<string | null>(
    null
  );
  const [copiedTask, setCopiedTask] = useState<ScheduleTask | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState<BulkDeleteProgress | null>(null);
  const [relatedActionItemsByTaskId, setRelatedActionItemsByTaskId] = useState<
    Record<string, RelatedScheduleActionItem[]>
  >({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const applyViewport = () => setIsMobileViewport(mediaQuery.matches);
    applyViewport();
    mediaQuery.addEventListener("change", applyViewport);
    return () => mediaQuery.removeEventListener("change", applyViewport);
  }, []);

  useEffect(() => {
    if (!isMobileViewport) return;
    if (viewMode === "grid") {
      setViewMode("board");
    }
  }, [isMobileViewport, viewMode]);

  // Fetch data using the same pattern as other pages (commitments, companies, etc.)
  const { data, error, isLoading, refetch } = useScheduleTasks({
    projectId,
    enabled: true,
  });

  const fetchRelatedActionItems = useCallback(async () => {
    try {
      const result = await apiFetch<RelatedActionItemsResponse>(
        `/api/projects/${projectId}/scheduling/related-action-items`,
        { cache: "no-store" },
      );
      const grouped: Record<string, RelatedScheduleActionItem[]> = {};
      for (const item of result.data ?? []) {
        grouped[item.schedule_task_id] = [...(grouped[item.schedule_task_id] ?? []), item];
      }
      setRelatedActionItemsByTaskId(grouped);
    } catch (err) {
      toast.error("Failed to load related action items");
    }
  }, [projectId]);

  useEffect(() => {
    void fetchRelatedActionItems();
  }, [fetchRelatedActionItems]);

  // Context menu
  const { contextMenu, openContextMenu, closeContextMenu, handleContextMenuAction } =
    useTaskContextMenu({
      add_task: () => {
        setParentTaskIdForNew(null);
        setEditingTask(null);
        setIsModalOpen(true);
      },
      edit_task: (task) => {
        if (task) {
          setEditingTask(task);
          setIsModalOpen(true);
        }
      },
      delete_task: async (task) => {
        if (task) {
          await handleDeleteTask(task.id);
        }
      },
      copy_task: (task) => {
        if (task) {
          setCopiedTask(task);
          toast.success("Task copied to clipboard");
        }
      },
      cut_task: (task) => {
        if (task) {
          setCopiedTask(task);
          toast.success("Task cut to clipboard");
        }
      },
      paste_task: async () => {
        if (copiedTask) {
          await handlePasteTask();
        }
      },
      indent_task: async (task) => {
        if (task) {
          await handleIndentTask(task.id);
        }
      },
      outdent_task: async (task) => {
        if (task) {
          await handleOutdentTask(task.id);
        }
      },
      convert_to_milestone: async (task) => {
        if (task) {
          await handleUpdateTask(task.id, { is_milestone: !task.is_milestone });
        }
      },
      scroll_to_task: (task) => {
        if (task) {
          // Scroll to task in Gantt
          const element = document.getElementById(`gantt-task-${task.id}`);
          element?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      },
    });

  // Flatten tasks for available tasks list
  const flatTasks = useMemo(() => {
    const result: Array<{ id: string; name: string }> = [];
    const flatten = (tasks: ScheduleTaskWithHierarchy[]) => {
      for (const task of tasks) {
        result.push({ id: task.id, name: task.name });
        if (task.children?.length) {
          flatten(task.children);
        }
      }
    };
    if (data?.tasks) {
      flatten(data.tasks);
    }
    return result;
  }, [data?.tasks]);

  // Flatten all tasks for export
  const allFlatTasks = useMemo(() => {
    const result: ScheduleTask[] = [];
    const flatten = (tasks: ScheduleTaskWithHierarchy[]) => {
      for (const task of tasks) {
        const { children, ...taskData } = task;
        result.push(taskData as ScheduleTask);
        if (children?.length) {
          flatten(children);
        }
      }
    };
    if (data?.tasks) {
      flatten(data.tasks);
    }
    return result;
  }, [data?.tasks]);

  // Handlers
  const apiUrl = `/api/projects/${projectId}/scheduling/tasks`;

  const handleAddTask = useCallback((parentId: string | null = null) => {
    setParentTaskIdForNew(parentId);
    setEditingTask(null);
    setIsModalOpen(true);
  }, []);

  const handleQuickAddTask = useCallback(
    async ({ name, parentId = null, status = "not_started", startDate = null, finishDate = null }: QuickAddTaskInput) => {
      const taskName = name.trim() || "New task";

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: Number(projectId),
          name: taskName,
          parent_task_id: parentId,
          status,
          start_date: startDate,
          finish_date: finishDate,
          percent_complete: status === "complete" ? 100 : status === "in_progress" ? 50 : 0,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create task");
      }

      await refetch();
    },
    [apiUrl, projectId, refetch]
  );

  const handleEditTask = useCallback((task: ScheduleTask) => {
    setEditingTask(task);
    setIsModalOpen(true);
  }, []);

  const handleTaskClick = useCallback((task: ScheduleTask) => {
    // For now, just edit on click
    setEditingTask(task);
    setIsModalOpen(true);
  }, []);

  const handleSaveTask = useCallback(
    async (taskData: ScheduleTaskCreate | ScheduleTaskUpdate) => {
      try {
        if (editingTask) {
          // Update existing task
          const res = await fetch(`${apiUrl}/${editingTask.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(taskData),
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to update task");
          }

          toast.success("Task updated successfully");
        } else {
          // Create new task
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(taskData),
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to create task");
          }

          toast.success("Task created successfully");
        }

        // Refresh data
        refetch();
        setIsModalOpen(false);
        setEditingTask(null);
      } catch (err) {
        console.error("Failed to save task:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to save task";

        // Show informative toast based on error type
        if (errorMessage.includes("permission") || errorMessage.includes("don't have")) {
          toast.error("Permission Denied", {
            description: errorMessage,
            duration: 8000,
          });
        } else if (errorMessage.includes("logged in") || errorMessage.includes("sign in")) {
          toast.error("Authentication Required", {
            description: errorMessage,
            duration: 8000,
          });
        } else {
          toast.error("Error Saving Task", {
            description: errorMessage,
            duration: 6000,
          });
        }
        throw err;
      }
    },
    [apiUrl, editingTask, refetch]
  );

  const handleUpdateTask = useCallback(
    async (taskId: string, updates: Partial<ScheduleTask>) => {
      try {
        const res = await fetch(`${apiUrl}/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to update task");
        }

        refetch();
      } catch (err) {
        console.error("Failed to update task:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to update task";
        toast.error("Error Updating Task", {
          description: errorMessage,
          duration: 6000,
        });
        throw err;
      }
    },
    [apiUrl, refetch]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      try {
        const res = await fetch(`${apiUrl}/${taskId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to delete task");
        }

        toast.success("Task deleted successfully");
        refetch();
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      } catch (err) {
        console.error("Failed to delete task:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to delete task";
        toast.error("Error Deleting Task", {
          description: errorMessage,
          duration: 6000,
        });
      }
    },
    [apiUrl, refetch]
  );

  const handleIndentTask = useCallback(
    async (taskId: string) => {
      // Find the task and its previous sibling to make parent
      const findTaskAndPrevSibling = (
        tasks: ScheduleTaskWithHierarchy[]
      ): { task: ScheduleTaskWithHierarchy | null; prevSibling: ScheduleTaskWithHierarchy | null } => {
        for (let i = 0; i < tasks.length; i++) {
          if (tasks[i].id === taskId) {
            return {
              task: tasks[i],
              prevSibling: i > 0 ? tasks[i - 1] : null,
            };
          }
          if (tasks[i].children?.length) {
            const result = findTaskAndPrevSibling(tasks[i].children);
            if (result.task) return result;
          }
        }
        return { task: null, prevSibling: null };
      };

      if (!data?.tasks) return;

      const { prevSibling } = findTaskAndPrevSibling(data.tasks);

      if (!prevSibling) {
        toast.error("Cannot indent - no previous sibling to become parent");
        return;
      }

      await handleUpdateTask(taskId, { parent_task_id: prevSibling.id });
      toast.success("Task indented");
    },
    [data?.tasks, handleUpdateTask]
  );

  const handleOutdentTask = useCallback(
    async (taskId: string) => {
      // Find the task and get its grandparent
      const findTaskParentAndGrandparent = (
        tasks: ScheduleTaskWithHierarchy[],
        parentId: string | null,
        grandparentId: string | null
      ): { task: ScheduleTaskWithHierarchy | null; parentId: string | null; grandparentId: string | null } => {
        for (const t of tasks) {
          if (t.id === taskId) {
            return { task: t, parentId, grandparentId };
          }
          if (t.children?.length) {
            const result = findTaskParentAndGrandparent(t.children, t.id, parentId);
            if (result.task) return result;
          }
        }
        return { task: null, parentId: null, grandparentId: null };
      };

      if (!data?.tasks) return;

      const { parentId, grandparentId } = findTaskParentAndGrandparent(
        data.tasks,
        null,
        null
      );

      if (!parentId) {
        toast.error("Cannot outdent - task is already at root level");
        return;
      }

      await handleUpdateTask(taskId, { parent_task_id: grandparentId });
      toast.success("Task outdented");
    },
    [data?.tasks, handleUpdateTask]
  );

  const handlePasteTask = useCallback(async () => {
    if (!copiedTask) return;

    try {
      const newTaskData: ScheduleTaskCreate = {
        project_id: Number(projectId),
        name: `${copiedTask.name} (Copy)`,
        parent_task_id: copiedTask.parent_task_id,
        start_date: copiedTask.start_date,
        finish_date: copiedTask.finish_date,
        duration_days: copiedTask.duration_days,
        percent_complete: 0,
        status: "not_started",
        is_milestone: copiedTask.is_milestone,
        constraint_type: copiedTask.constraint_type,
        constraint_date: copiedTask.constraint_date,
        wbs_code: copiedTask.wbs_code,
      };

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTaskData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to paste task");
      }

      toast.success("Task pasted successfully");
      refetch();
    } catch (err) {
      console.error("Failed to paste task:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to paste task";

      // Show informative toast based on error type
      if (errorMessage.includes("permission") || errorMessage.includes("don't have")) {
        toast.error("Permission Denied", {
          description: errorMessage,
          duration: 8000,
        });
      } else if (errorMessage.includes("logged in") || errorMessage.includes("sign in")) {
        toast.error("Authentication Required", {
          description: errorMessage,
          duration: 8000,
        });
      } else {
        toast.error("Error Pasting Task", {
          description: errorMessage,
          duration: 6000,
        });
      }
    }
  }, [projectId, copiedTask, apiUrl, refetch]);

  const handleBulkStatusUpdate = useCallback(
    async (status: TaskStatus) => {
      const percentComplete = status === "complete" ? 100 : status === "in_progress" ? 50 : 0;
      const promises = Array.from(selectedIds).map((id) =>
        handleUpdateTask(id, { status, percent_complete: percentComplete })
      );
      try {
        await Promise.all(promises);
        toast.success(`Updated ${selectedIds.size} tasks to "${status.replace("_", " ")}"`);
        setSelectedIds(new Set());
      } catch {
        toast.error("Some tasks failed to update");
      }
    },
    [selectedIds, handleUpdateTask]
  );

  const handleBulkDelete = useCallback(async () => {
    const taskIds = Array.from(selectedIds);
    if (taskIds.length === 0) return;

    setBulkDeleteProgress({
      phase: "deleting",
      total: taskIds.length,
      deleted: 0,
      failed: 0,
    });

    try {
      const res = await fetch(`${apiUrl}/bulk`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_ids: taskIds }),
      });

      const result = await res.json().catch(() => null) as {
        deleted?: number;
        failed?: number;
        error?: string;
        errors?: Array<{ taskId: string; error: string }>;
      } | null;

      if (!res.ok) {
        throw new Error(result?.error || "Failed to delete selected tasks");
      }

      const deleted = result?.deleted ?? 0;
      const failed = result?.failed ?? 0;

      setBulkDeleteProgress({
        phase: "complete",
        total: taskIds.length,
        deleted,
        failed,
      });

      if (failed > 0) {
        const firstError = result?.errors?.[0]?.error;
        toast.error(`Deleted ${deleted} tasks; ${failed} failed`, {
          description: firstError ?? "Review the remaining selected tasks and try again.",
          duration: 7000,
        });
        const failedIds = new Set(result?.errors?.map((item) => item.taskId) ?? []);
        setSelectedIds(failedIds);
      } else {
        toast.success(`Deleted ${deleted} tasks`);
      }

      await refetch();

      window.setTimeout(() => {
        if (failed === 0) {
          setSelectedIds(new Set());
        }
        setBulkDeleteProgress(null);
      }, 1800);
    } catch (err) {
      console.error("Failed to bulk delete tasks:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to delete selected tasks";
      setBulkDeleteProgress(null);
      toast.error("Error Deleting Tasks", {
        description: errorMessage,
        duration: 6000,
      });
    }
  }, [apiUrl, refetch, selectedIds]);

  const handleImportTasks = useCallback(
    async (importedTasks: Partial<ScheduleTask>[]) => {
      try {
        // Create tasks one by one
        const promises = importedTasks.map(async (taskData) => {
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project_id: Number(projectId),
              name: taskData.name,
              start_date: taskData.start_date || null,
              finish_date: taskData.finish_date || null,
              duration_days: taskData.duration_days || null,
              percent_complete: taskData.percent_complete || 0,
              status: taskData.status || "not_started",
              is_milestone: taskData.is_milestone || false,
              wbs_code: taskData.wbs_code || null,
            }),
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to create task");
          }
        });

        await Promise.all(promises);
        toast.success(`Successfully imported ${importedTasks.length} tasks`);
        refetch();
        setIsImportExportModalOpen(false);
      } catch (err) {
        console.error("Failed to import tasks:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to import tasks";
        toast.error("Import Failed", {
          description: errorMessage,
          duration: 6000,
        });
        throw err;
      }
    },
    [apiUrl, projectId, refetch]
  );

  // State for toolbar
  const [searchValue, setSearchValue] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string | number | boolean | string[] | null | undefined>>({});
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    SCHEDULE_COLUMNS.filter((c) => c.defaultVisible !== false || c.alwaysVisible).map((c) => c.id)
  );

  const totalTaskCount = useMemo(() => {
    const count = (tasks: ScheduleTaskWithHierarchy[]): number =>
      tasks.reduce((acc, t) => acc + 1 + (t.children ? count(t.children) : 0), 0);
    return data?.tasks ? count(data.tasks) : 0;
  }, [data?.tasks]);

  const dateFilteredTasks = useMemo(
    () => filterTasksByDate(data?.tasks ?? [], dateFilter),
    [data?.tasks, dateFilter]
  );

  const dateFilteredCount = useMemo(() => {
    const count = (tasks: ScheduleTaskWithHierarchy[]): number =>
      tasks.reduce((acc, t) => acc + 1 + (t.children ? count(t.children) : 0), 0);
    return count(dateFilteredTasks);
  }, [dateFilteredTasks]);

  const dateFilteredGanttData = useMemo(() => {
    if (dateFilter === "all") return data?.ganttData ?? [];
    const ids = flattenIds(dateFilteredTasks);
    return (data?.ganttData ?? []).filter((item) => ids.has(item.id));
  }, [data?.ganttData, dateFilter, dateFilteredTasks]);

  // Actions for header — just the primary action, like every other page
  const headerActions = (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <Button
        asChild
        size="sm"
        variant="outline"
        className="max-sm:min-h-11"
      >
        <Link href={`/${projectId}/schedule/import`}>
          <Upload />
          MS Project Import
        </Link>
      </Button>
      <Button
        size="sm"
        className="max-sm:min-h-11"
        onClick={() => handleAddTask()}
      >
        <Plus />
        Add Task
      </Button>
    </div>
  );

  // Shared view props — use date-filtered tasks so "Today" / "This Week" filters apply to all views
  const viewProps = {
    tasks: dateFilteredTasks,
    selectedIds,
    onSelectionChange: setSelectedIds,
    visibleColumns,
    onTaskClick: handleTaskClick,
    onAddTask: handleAddTask,
    onQuickAddTask: handleQuickAddTask,
    onEditTask: handleEditTask,
    onDeleteTask: handleDeleteTask,
    onUpdateTask: handleUpdateTask,
    isLoading,
  };

  const isAuthError = error ? error.message.includes("session") || error.message.includes("log in") : false;
  const isPermissionError = error ? error.message.includes("access") || error.message.includes("permission") : false;

  return (
    <PageShell variant="table" title="Schedule" actions={headerActions}>
      {/* Loading skeleton */}
      {isLoading && (
        <>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <ViewModeTabs mode={viewMode} onChange={setViewMode} />
            <div className="flex items-center gap-2 pb-2 animate-pulse">
              <div className="h-8 w-8 rounded bg-muted" />
              <div className="h-8 w-20 rounded bg-muted" />
              <div className="h-8 w-24 rounded bg-muted" />
              <div className="h-4 w-px bg-border mx-1" />
              <div className="h-4 w-16 rounded bg-muted" />
            </div>
          </div>
          <div className="mt-4 overflow-hidden">
            <div className="h-10 bg-muted/50 border-b" />
            {["s1","s2","s3","s4","s5","s6","s7","s8"].map((key) => (
              <div key={key} className="flex items-center gap-4 px-4 py-4 border-b last:border-0 animate-pulse">
                <div className="h-4 w-4 rounded bg-muted" />
                <div className="h-4 flex-1 rounded bg-muted" />
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-2 w-24 rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <>
          <ViewModeTabs mode={viewMode} onChange={setViewMode} />
          <div
            data-testid="error-state"
            className="flex flex-col items-center justify-center py-16 px-4 animate-reveal"
          >
            <div className="rounded-full bg-destructive/10 p-4 mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-1">
              {isAuthError
                ? "Session Expired"
                : isPermissionError
                  ? "Access Denied"
                  : "Unable to Load Schedule"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md text-center">
              {error.message}
            </p>
            <div className="flex gap-2">
              {isAuthError ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn(isLoading && "animate-spin")} />
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Main content */}
      {!isLoading && !error && (
        <>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-1">
              <DateFilterPills value={dateFilter} onChange={setDateFilter} />
              <ViewModeTabs mode={viewMode} onChange={setViewMode} />
            </div>
            <TableToolbar
              className="w-full lg:w-auto"
              totalItems={totalTaskCount}
              filteredItems={dateFilteredCount}
              selectedCount={selectedIds.size}
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              searchPlaceholder="Search tasks..."
              currentView="table"
              onViewChange={() => {}}
              enableViews={false}
              filters={SCHEDULE_FILTERS}
              activeFilters={activeFilters}
              onFilterChange={setActiveFilters}
              onClearFilters={() => setActiveFilters({})}
              columns={SCHEDULE_COLUMNS}
              visibleColumns={visibleColumns}
              onColumnVisibilityChange={setVisibleColumns}
              onExport={() => setIsImportExportModalOpen(true)}
              enableBulkDelete={false}
            />
          </div>

          {selectedIds.size > 0 && (
            <BulkActionBar
              selectedCount={selectedIds.size}
              deleteProgress={bulkDeleteProgress}
              onUpdateStatus={handleBulkStatusUpdate}
              onDelete={handleBulkDelete}
              onClear={() => {
                setBulkDeleteProgress(null);
                setSelectedIds(new Set());
              }}
            />
          )}

          {data && (!data.tasks || data.tasks.length === 0) && (
            <div className="mt-4 flex flex-col items-center justify-center py-20 px-4 animate-reveal">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Calendar className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No tasks scheduled</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center leading-relaxed">
                Create tasks, set milestones, and track dependencies with Gantt charts and multiple view modes.
              </p>
              <div className="flex gap-4">
                <Button size="sm" onClick={() => handleAddTask()}>
                  <Plus />
                  Add Task
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsImportExportModalOpen(true)}>
                  <Upload />
                  Import Schedule
                </Button>
              </div>
            </div>
          )}

          {data?.tasks && data.tasks.length > 0 && dateFilteredTasks.length === 0 && (
            <div className="mt-4 flex flex-col items-center justify-center py-16 px-4 animate-reveal">
              <div className="rounded-full bg-muted p-4 mb-4">
                <CalendarDays className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {dateFilter === "today" ? "No tasks scheduled for today" : "No tasks scheduled this week"}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center leading-relaxed">
                {dateFilter === "today"
                  ? "No tasks have a start or finish date of today. Switch to All to see the full schedule."
                  : "No tasks are active this week. Switch to All to see the full schedule."}
              </p>
              <Button size="sm" variant="outline" onClick={() => setDateFilter("all")}>
                Show All Tasks
              </Button>
            </div>
          )}

          {data?.tasks && data.tasks.length > 0 && dateFilteredTasks.length > 0 && (
            <div key={viewMode} className="flex-1 min-h-[600px] animate-reveal">
              {viewMode === "grid" && (
                <div className="-mx-4 sm:-mx-6 lg:-mx-8">
                  <GanttChart
                    data={dateFilteredGanttData}
                    visibleColumns={visibleColumns}
                    onQuickAddTask={(name) => handleQuickAddTask({ name })}
                    onUpdateTask={handleUpdateTask}
                    onTaskClick={(taskId) => {
                      const fullTask = data?.tasks
                        ? findTaskById(data.tasks, taskId)
                        : null;
                      if (fullTask) {
                        handleEditTask(fullTask);
                      }
                    }}
                  />
                </div>
              )}

              {viewMode !== "grid" && (
                <>
                  {viewMode === "board" && <ScheduleBoardView {...viewProps} />}
                  {viewMode === "calendar" && <ScheduleCalendarView {...viewProps} />}
                  {viewMode === "timeline" && <ScheduleTimelineView {...viewProps} />}
                  {viewMode === "schedule" && <ScheduleGridView {...viewProps} />}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <TaskEditModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        task={editingTask}
        parentTaskId={parentTaskIdForNew}
        projectId={projectId}
        availableTasks={flatTasks}
        relatedActionItems={
          editingTask ? relatedActionItemsByTaskId[editingTask.id] ?? [] : []
        }
        onSave={handleSaveTask}
      />
      <TaskContextMenu
        task={contextMenu.task}
        position={contextMenu.position}
        onClose={closeContextMenu}
        onAction={handleContextMenuAction}
        hasCopiedTask={!!copiedTask}
        relatedActionItems={
          contextMenu.task ? relatedActionItemsByTaskId[contextMenu.task.id] ?? [] : []
        }
      />
      <ImportExportModal
        open={isImportExportModalOpen}
        onOpenChange={setIsImportExportModalOpen}
        projectId={projectId}
        tasks={allFlatTasks}
        onImport={handleImportTasks}
      />
    </PageShell>
  );
}

// Helper to find task by ID in hierarchy
function findTaskById(
  tasks: ScheduleTaskWithHierarchy[],
  id: string
): ScheduleTask | null {
  for (const task of tasks) {
    if (task.id === id) return task;
    if (task.children?.length) {
      const found = findTaskById(task.children, id);
      if (found) return found;
    }
  }
  return null;
}
