"use client";

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

import { useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { TaskTable } from "@/components/scheduling/task-table";
import { GanttChart } from "@/components/scheduling/gantt-chart";
import { TaskEditModal } from "@/components/scheduling/task-edit-modal";
import { ImportExportModal } from "@/components/scheduling/import-export-modal";
import {
  TaskContextMenu,
  useTaskContextMenu,
} from "@/components/scheduling/task-context-menu";
import {
  ScheduleGridView,
  ScheduleBoardView,
  ScheduleCalendarView,
  ScheduleTimelineView,
} from "@/components/scheduling/schedule-views";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Table2,
  BarChart3,
  Columns,
  Download,
  Upload,
  MoreHorizontal,
  RefreshCw,
  Loader2,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Flag,
  LayoutGrid,
  Kanban,
  CalendarDays,
  GanttChart as GanttIcon,
  Filter,
  Share2,
  ChevronDown,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ScheduleTask,
  ScheduleTaskWithHierarchy,
  ScheduleTaskCreate,
  ScheduleTaskUpdate,
  TaskStatus,
} from "@/types/scheduling";
import { toast } from "sonner";
import { useScheduleTasks } from "@/hooks/use-schedule-tasks";

// =============================================================================
// TYPES
// =============================================================================

type ViewMode = "grid" | "board" | "schedule" | "timeline" | "calendar";

// =============================================================================
// VIEW MODE TABS (Microsoft Planner Style)
// =============================================================================

const viewModeConfig: {
  mode: ViewMode;
  label: string;
  icon: typeof LayoutGrid;
}[] = [
  { mode: "grid", label: "Grid", icon: LayoutGrid },
  { mode: "board", label: "Board", icon: Kanban },
  { mode: "schedule", label: "Schedule", icon: Columns },
  { mode: "timeline", label: "Timeline", icon: GanttIcon },
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
    <nav className="flex items-center space-x-6 border-b -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8" aria-label="View mode">
      {viewModeConfig.map(({ mode: viewMode, label, icon: Icon }) => (
        <button
          type="button"
          key={viewMode}
          onClick={() => onChange(viewMode)}
          aria-label={`Switch to ${label} view`}
          className={cn(
            "inline-flex items-center gap-2 py-4 px-1 text-sm font-medium transition-all duration-200 border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-t-sm",
            mode === viewMode
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </nav>
  );
}

// =============================================================================
// SUMMARY STRIP COMPONENT
// =============================================================================

function SummaryCards({ summary }: { summary: { total_tasks: number; completed_tasks: number; in_progress_tasks: number; not_started_tasks: number; milestones_count: number; overdue_tasks: number } }) {
  const stats = [
    { label: "Total Tasks", value: summary.total_tasks, icon: Calendar, color: "text-foreground" },
    { label: "Completed", value: summary.completed_tasks, icon: CheckCircle, color: "text-[hsl(var(--status-success))]" },
    { label: "In Progress", value: summary.in_progress_tasks, icon: Clock, color: "text-[hsl(var(--status-info))]" },
    { label: "Not Started", value: summary.not_started_tasks, icon: AlertCircle, color: "text-muted-foreground" },
    { label: "Milestones", value: summary.milestones_count, icon: Flag, color: "text-[hsl(var(--status-warning))]" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2">
      {stats.map((stat, index) => (
        <div key={stat.label} className="flex items-center gap-2">
          <stat.icon className={cn("h-4 w-4", stat.color)} />
          <p className="text-sm text-muted-foreground">
            {stat.label}
            <span className="ml-1.5 font-semibold text-foreground tabular-nums">
              {stat.value}
            </span>
          </p>
          {index < stats.length - 1 && <div className="h-4 w-px bg-border/70" />}
        </div>
      ))}
      {summary.overdue_tasks > 0 && (
        <div className="inline-flex items-center gap-2 rounded-full border border-destructive/25 bg-destructive/10 px-2.5 py-1">
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-xs font-medium text-destructive">
            Overdue {summary.overdue_tasks}
          </span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BULK ACTION BAR
// =============================================================================

function BulkActionBar({
  selectedCount,
  onUpdateStatus,
  onDelete,
  onClear,
}: {
  selectedCount: number;
  onUpdateStatus: (status: TaskStatus) => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-2.5 rounded-lg border bg-primary/5 border-primary/20 animate-reveal">
      <span className="text-sm font-medium">{selectedCount} selected</span>
      <div className="h-4 w-px bg-border" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Update Status
            <ChevronDown className="h-3 w-3 ml-1" />
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
      <Button variant="destructive" size="sm" onClick={onDelete}>
        <Trash2 className="h-4 w-4 mr-1.5" />
        Delete
      </Button>
      <Button variant="ghost" size="sm" onClick={onClear} className="ml-auto">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ProjectSchedulePage() {
  const params = useParams();
  const projectId = params.projectId as string;

  // State
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<ScheduleTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [parentTaskIdForNew, setParentTaskIdForNew] = useState<string | null>(
    null
  );
  const [copiedTask, setCopiedTask] = useState<ScheduleTask | null>(null);

  // Fetch data using the same pattern as other pages (commitments, companies, etc.)
  const { data, error, isLoading, refetch } = useScheduleTasks({
    projectId,
    enabled: true,
  });

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
  const handleAddTask = useCallback((parentId: string | null = null) => {
    setParentTaskIdForNew(parentId);
    setEditingTask(null);
    setIsModalOpen(true);
  }, []);

  const handleEditTask = useCallback((task: ScheduleTask) => {
    setEditingTask(task);
    setIsModalOpen(true);
  }, []);

  const handleTaskClick = useCallback((task: ScheduleTask) => {
    // For now, just edit on click
    setEditingTask(task);
    setIsModalOpen(true);
  }, []);

  const apiUrl = `/api/projects/${projectId}/scheduling/tasks`;

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

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

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
    const promises = Array.from(selectedIds).map((id) => handleDeleteTask(id));
    try {
      await Promise.all(promises);
      toast.success(`Deleted ${selectedIds.size} tasks`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Some tasks failed to delete");
    }
  }, [selectedIds, handleDeleteTask]);

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

  // Actions for header
  const headerActions = (
    <div className="flex items-center gap-4">
      <Button onClick={() => handleAddTask()} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Add Task
      </Button>

      <Button variant="ghost" size="sm">
        <Filter className="h-4 w-4 mr-2" />
        Filters
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsImportExportModalOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import Schedule
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsImportExportModalOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export Schedule
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw
              className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")}
            />
            Refresh
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <>
        <ProjectPageHeader
          title="Schedule"
          description="Track project schedule tasks and milestones"
          actions={headerActions}
        />
        <PageContainer className="space-y-4">
          {/* Skeleton summary strip */}
          <div className="flex flex-wrap items-center gap-4 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 animate-pulse">
                <div className="h-4 w-4 rounded-full bg-muted" />
                <div className="h-4 w-20 rounded bg-muted" />
              </div>
            ))}
          </div>
          <ViewModeTabs mode={viewMode} onChange={setViewMode} />
          {/* Skeleton table rows */}
          <div className="border rounded-lg overflow-hidden">
            <div className="h-10 bg-muted/50 border-b" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4 border-b last:border-0 animate-pulse">
                <div className="h-4 w-4 rounded bg-muted" />
                <div className="h-4 flex-1 rounded bg-muted" style={{ maxWidth: `${60 + Math.random() * 30}%` }} />
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-2 w-24 rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </PageContainer>
      </>
    );
  }

  // Error state
  if (error) {
    const isAuthError = error.message.includes("session") || error.message.includes("log in");
    const isPermissionError = error.message.includes("access") || error.message.includes("permission");

    return (
      <>
        <ProjectPageHeader
          title="Schedule"
          description="Track project schedule tasks and milestones"
          actions={headerActions}
        />
        <PageContainer>
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
                  <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </PageContainer>
      </>
    );
  }

  // Shared view props
  const viewProps = {
    tasks: data?.tasks || [],
    selectedIds,
    onSelectionChange: setSelectedIds,
    onTaskClick: handleTaskClick,
    onAddTask: handleAddTask,
    onEditTask: handleEditTask,
    onDeleteTask: handleDeleteTask,
    onUpdateTask: handleUpdateTask,
    isLoading,
  };

  return (
    <>
      <ProjectPageHeader
        title="Schedule"
        description="Track project schedule tasks and milestones"
        actions={headerActions}
      />
      <PageContainer className="space-y-4">
        {/* Summary strip shown above tabs because it applies to every view */}
        {data?.summary && data.summary.total_tasks > 0 && (
          <SummaryCards summary={data.summary} />
        )}

        <ViewModeTabs mode={viewMode} onChange={setViewMode} />

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <BulkActionBar
            selectedCount={selectedIds.size}
            onUpdateStatus={handleBulkStatusUpdate}
            onDelete={handleBulkDelete}
            onClear={() => setSelectedIds(new Set())}
          />
        )}

        {/* Empty State */}
        {data && (!data.tasks || data.tasks.length === 0) && (
          <div className="flex flex-col items-center justify-center py-20 px-4 animate-reveal">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Calendar className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No tasks scheduled</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center leading-relaxed">
              Create tasks, set milestones, and track dependencies with Gantt charts and multiple view modes.
            </p>
            <div className="flex gap-4">
              <Button size="sm" onClick={() => handleAddTask()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsImportExportModalOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import Schedule
              </Button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {data && data.tasks && data.tasks.length > 0 && (
        <div key={viewMode} className="flex-1 min-h-[600px] animate-reveal">
          {viewMode === "grid" && <ScheduleGridView {...viewProps} />}

          {viewMode === "board" && <ScheduleBoardView {...viewProps} />}

          {viewMode === "calendar" && <ScheduleCalendarView {...viewProps} />}

          {viewMode === "timeline" && <ScheduleTimelineView {...viewProps} />}

          {viewMode === "schedule" && (
            <div className="grid grid-cols-2 gap-4 min-h-[600px]">
              <div className="overflow-auto border rounded-lg">
                <TaskTable
                  tasks={data?.tasks || []}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  onTaskClick={handleTaskClick}
                  onAddSubtask={handleAddTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onIndentTask={handleIndentTask}
                  onOutdentTask={handleOutdentTask}
                  onUpdateTask={handleUpdateTask}
                  onContextMenu={openContextMenu}
                  isLoading={isLoading}
                />
              </div>
              <div className="overflow-auto border rounded-lg">
                <GanttChart
                  data={data?.ganttData || []}
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
            </div>
          )}
        </div>
        )}

        {/* Task Edit Modal */}
        <TaskEditModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          task={editingTask}
          parentTaskId={parentTaskIdForNew}
          projectId={projectId}
          availableTasks={flatTasks}
          onSave={handleSaveTask}
        />

        {/* Context Menu */}
        <TaskContextMenu
          task={contextMenu.task}
          position={contextMenu.position}
          onClose={closeContextMenu}
          onAction={handleContextMenuAction}
          hasCopiedTask={!!copiedTask}
        />

        {/* Import/Export Modal */}
        <ImportExportModal
          open={isImportExportModalOpen}
          onOpenChange={setIsImportExportModalOpen}
          projectId={projectId}
          tasks={allFlatTasks}
          onImport={handleImportTasks}
        />
      </PageContainer>
    </>
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
