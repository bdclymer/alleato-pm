"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarClock,
  GripVertical,
  Loader2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import type { UniqueIdentifier } from "@dnd-kit/core";

import { Button } from "@/components/ui/button";
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnHandle,
  KanbanItem,
  KanbanOverlay,
} from "@/components/ui/kanban";
import { StatusBadge } from "@/components/ds";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { type TasksRow, getTaskSourceLabel } from "@/features/tasks/task-utils";

type TaskKanbanStatus = "open" | "in_progress" | "blocked" | "done";

type TaskColumns = Record<TaskKanbanStatus, TasksRow[]>;

const COLUMN_DEFINITIONS: Array<{
  id: TaskKanbanStatus;
  label: string;
  emptyLabel: string;
}> = [
  { id: "open", label: "Open", emptyLabel: "No open tasks" },
  {
    id: "in_progress",
    label: "In Progress",
    emptyLabel: "Nothing in progress",
  },
  { id: "blocked", label: "Blocked", emptyLabel: "No blocked tasks" },
  { id: "done", label: "Done", emptyLabel: "Nothing done yet" },
];

const EMPTY_COLUMNS: TaskColumns = {
  open: [],
  in_progress: [],
  blocked: [],
  done: [],
};

const DONE_STATUSES = new Set(["complete", "closed", "done", "cancelled"]);
const IN_PROGRESS_STATUSES = new Set(["in_progress", "started", "active"]);
const BLOCKED_STATUSES = new Set(["blocked", "stuck", "waiting"]);

function toKanbanStatus(status: string | null): TaskKanbanStatus {
  const normalized = (status ?? "").toLowerCase();
  if (DONE_STATUSES.has(normalized)) return "done";
  if (BLOCKED_STATUSES.has(normalized)) return "blocked";
  if (IN_PROGRESS_STATUSES.has(normalized)) return "in_progress";
  return "open";
}

function findColumnForTask(
  columns: TaskColumns,
  taskId: UniqueIdentifier,
): TaskKanbanStatus | null {
  const normalizedTaskId = String(taskId);
  for (const column of COLUMN_DEFINITIONS) {
    if (columns[column.id].some((task) => task.id === normalizedTaskId)) {
      return column.id;
    }
  }
  return null;
}

function buildColumns(tasks: TasksRow[]): TaskColumns {
  const columns: TaskColumns = {
    open: [],
    in_progress: [],
    blocked: [],
    done: [],
  };

  for (const task of tasks) {
    if (!task.id) continue;
    columns[toKanbanStatus(task.status)].push(task);
  }

  for (const column of COLUMN_DEFINITIONS) {
    columns[column.id].sort((left, right) => {
      const leftDue = left.due_date
        ? new Date(left.due_date).getTime()
        : Number.POSITIVE_INFINITY;
      const rightDue = right.due_date
        ? new Date(right.due_date).getTime()
        : Number.POSITIVE_INFINITY;
      if (leftDue !== rightDue) return leftDue - rightDue;

      const leftCreated = left.created_at
        ? new Date(left.created_at).getTime()
        : Number.POSITIVE_INFINITY;
      const rightCreated = right.created_at
        ? new Date(right.created_at).getTime()
        : Number.POSITIVE_INFINITY;
      return leftCreated - rightCreated;
    });
  }

  return columns;
}

function formatShortDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function isOverdue(value: string | null, status: string | null): boolean {
  if (!value || toKanbanStatus(status) === "done") return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function getTaskTitle(task: TasksRow): string {
  return task.description || task.title || "Untitled task";
}

function TaskCard({
  task,
  overlay = false,
}: {
  task: TasksRow;
  overlay?: boolean;
}) {
  const title = getTaskTitle(task);
  const assignee = task.assignee_name || task.assignee_email || "Unassigned";
  const dueLabel = formatShortDate(task.due_date);
  const overdue = isOverdue(task.due_date, task.status);
  const sourceLabel = getTaskSourceLabel(task);

  return (
    <KanbanItem
      value={task.id ?? title}
      asHandle
      disabled={!task.id}
      aria-label={`Move task: ${title}`}
    >
      <article
        className={cn(
          "rounded-md border border-border/70 bg-background p-3 shadow-xs transition-colors",
          "hover:border-border hover:bg-muted/20",
          overlay && "w-80 shadow-md",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="line-clamp-3 text-sm font-medium leading-5 text-foreground">
            {title}
          </p>
          {task.priority ? (
            <StatusBadge
              status={task.priority}
              className="pointer-events-none h-5 shrink-0 px-1.5 text-[11px] capitalize"
            />
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{assignee}</span>
          </span>
          {dueLabel ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5",
                overdue && "font-medium text-destructive",
              )}
            >
              <CalendarClock className="h-3.5 w-3.5 shrink-0" />
              {dueLabel}
            </span>
          ) : null}
        </div>

        {sourceLabel ? (
          <p className="mt-3 truncate text-xs text-muted-foreground">
            {sourceLabel}
          </p>
        ) : null}
      </article>
    </KanbanItem>
  );
}

function TaskColumn({
  column,
  tasks,
}: {
  column: (typeof COLUMN_DEFINITIONS)[number];
  tasks: TasksRow[];
}) {
  return (
    <KanbanColumn
      value={column.id}
      className="min-h-96 w-80 shrink-0 gap-3 rounded-lg border border-border/70 bg-muted/30 p-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {column.label}
          </span>
          <span className="inline-flex min-w-6 items-center justify-center rounded-sm bg-background px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground ring-1 ring-inset ring-border/70">
            {tasks.length}
          </span>
        </div>
        <KanbanColumnHandle asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <GripVertical className="h-4 w-4" />
            <span className="sr-only">Move {column.label} column</span>
          </Button>
        </KanbanColumnHandle>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {tasks.length > 0 ? (
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        ) : (
          <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-border/70 px-4 text-center text-sm text-muted-foreground">
            {column.emptyLabel}
          </div>
        )}
      </div>
    </KanbanColumn>
  );
}

interface TasksKanbanPageProps {
  projectId: string;
}

export function TasksKanbanPage({ projectId }: TasksKanbanPageProps) {
  const [columns, setColumns] = React.useState<TaskColumns>(EMPTY_COLUMNS);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = React.useState<string | null>(null);
  const columnsRef = React.useRef(columns);
  const dragStartRef = React.useRef<{
    columns: TaskColumns;
    taskId: string;
    column: TaskKanbanStatus | null;
  } | null>(null);

  React.useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadTasks() {
      setLoading(true);
      setError(null);
      try {
        const payload = await apiFetch<{ data?: TasksRow[] }>(
          `/api/tasks?project_id=${projectId}&scope=all`,
        );
        if (cancelled) return;
        const nextColumns = buildColumns(payload.data ?? []);
        columnsRef.current = nextColumns;
        setColumns(nextColumns);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load project tasks.";
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadTasks();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  function handleColumnsChange(
    nextColumns: Record<UniqueIdentifier, TasksRow[]>,
  ) {
    const typedColumns: TaskColumns = {
      open: nextColumns.open ?? [],
      in_progress: nextColumns.in_progress ?? [],
      blocked: nextColumns.blocked ?? [],
      done: nextColumns.done ?? [],
    };
    columnsRef.current = typedColumns;
    setColumns(typedColumns);
  }

  async function persistTaskStatus(taskId: string, status: TaskKanbanStatus) {
    setSavingTaskId(taskId);
    try {
      await apiFetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success("Task status updated");
    } catch (err) {
      const previousColumns = dragStartRef.current?.columns;
      if (previousColumns) {
        columnsRef.current = previousColumns;
        setColumns(previousColumns);
      }
      const message =
        err instanceof Error ? err.message : "The task move did not save.";
      toast.error("Could not move task", { description: message });
    } finally {
      setSavingTaskId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading task board...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-center">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Could not load task board
          </p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{error}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/${projectId}/tasks`}>Open task inbox</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-3">
      {savingTaskId ? (
        <div className="text-xs text-muted-foreground">Saving task move...</div>
      ) : null}
      <Kanban
        value={columns}
        onValueChange={handleColumnsChange}
        getItemValue={(item) => item.id ?? getTaskTitle(item)}
        autoScroll
        onDragStart={(event) => {
          const taskId = String(event.active.id);
          dragStartRef.current = {
            columns: columnsRef.current,
            taskId,
            column: findColumnForTask(columnsRef.current, taskId),
          };
        }}
        onDragEnd={(event) => {
          const taskId = String(event.active.id);
          const start = dragStartRef.current;
          const nextColumn = findColumnForTask(columnsRef.current, taskId);
          if (
            start?.taskId === taskId &&
            nextColumn &&
            start.column !== nextColumn
          ) {
            void persistTaskStatus(taskId, nextColumn);
          }
          dragStartRef.current = null;
        }}
        onDragCancel={() => {
          const previousColumns = dragStartRef.current?.columns;
          if (previousColumns) {
            columnsRef.current = previousColumns;
            setColumns(previousColumns);
          }
          dragStartRef.current = null;
        }}
      >
        <div className="w-full overflow-x-auto pb-4">
          <KanbanBoard className="min-w-max items-start">
            {COLUMN_DEFINITIONS.map((column) => (
              <TaskColumn
                key={column.id}
                column={column}
                tasks={columns[column.id]}
              />
            ))}
          </KanbanBoard>
        </div>
        <KanbanOverlay>
          {({ value, variant }) => {
            if (variant === "column") {
              const column = COLUMN_DEFINITIONS.find(
                (item) => item.id === value,
              );
              if (!column) return null;
              return <TaskColumn column={column} tasks={columns[column.id]} />;
            }

            const task = Object.values(columns)
              .flat()
              .find((item) => item.id === value);
            if (!task) return null;
            return <TaskCard task={task} overlay />;
          }}
        </KanbanOverlay>
      </Kanban>
    </div>
  );
}
