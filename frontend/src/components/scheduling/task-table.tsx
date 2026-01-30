"use client";

/**
 * =============================================================================
 * SCHEDULE TASK TABLE COMPONENT
 * =============================================================================
 *
 * Hierarchical task table for the scheduling module.
 * Supports:
 * - Tree structure with expand/collapse
 * - Inline editing of task names
 * - Status badges
 * - Progress bars
 * - Context menu actions
 * - Row selection for bulk operations
 */

import { useState, useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Trash2,
  Pencil,
  Copy,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Flag,
  Loader2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  ScheduleTask,
  ScheduleTaskWithHierarchy,
  TaskStatus,
} from "@/types/scheduling";

// =============================================================================
// TYPES
// =============================================================================

interface TaskTableProps {
  tasks: ScheduleTaskWithHierarchy[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onTaskClick: (task: ScheduleTask) => void;
  onAddSubtask: (parentId: string | null) => void;
  onEditTask: (task: ScheduleTask) => void;
  onDeleteTask: (taskId: string) => void;
  onIndentTask: (taskId: string) => void;
  onOutdentTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<ScheduleTask>) => Promise<void>;
  onContextMenu?: (task: ScheduleTask, position: { x: number; y: number }) => void;
  isLoading?: boolean;
}

// =============================================================================
// SORT TYPES & HELPERS
// =============================================================================

type SortField = "name" | "start_date" | "finish_date" | "duration_days" | "percent_complete" | "status";
type SortDirection = "asc" | "desc";
interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

function sortTasks(
  tasks: ScheduleTaskWithHierarchy[],
  sort: SortConfig | null
): ScheduleTaskWithHierarchy[] {
  if (!sort) return tasks;
  return [...tasks].sort((a, b) => {
    const dir = sort.direction === "asc" ? 1 : -1;
    const av = a[sort.field];
    const bv = b[sort.field];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

function SortableHeader({
  label,
  field,
  sort,
  onToggle,
  className,
}: {
  label: string;
  field: SortField;
  sort: SortConfig | null;
  onToggle: (field: SortField) => void;
  className?: string;
}) {
  const isActive = sort?.field === field;
  const Icon = isActive
    ? sort.direction === "asc" ? ArrowUp : ArrowDown
    : ArrowUpDown;

  return (
    <TableHead className={className}>
      <button
        type="button"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => onToggle(field)}
      >
        {label}
        <Icon className={cn("h-3 w-3", isActive ? "text-foreground" : "text-muted-foreground/50")} />
      </button>
    </TableHead>
  );
}

// =============================================================================
// STATUS HELPERS
// =============================================================================

const statusConfig: Record<
  TaskStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "success" | "destructive" }
> = {
  not_started: { label: "Not Started", variant: "outline" },
  in_progress: { label: "In Progress", variant: "default" },
  complete: { label: "Complete", variant: "success" },
};

const formatDate = (date: string | null): string => {
  if (!date) return "-";
  try {
    return format(new Date(date), "MMM dd, yyyy");
  } catch {
    return "-";
  }
};

// =============================================================================
// TASK ROW COMPONENT
// =============================================================================

interface TaskRowProps {
  task: ScheduleTaskWithHierarchy;
  selectedIds: Set<string>;
  expandedIds: Set<string>;
  onToggleExpand: (taskId: string) => void;
  onSelectionChange: (ids: Set<string>) => void;
  onTaskClick: (task: ScheduleTask) => void;
  onAddSubtask: (parentId: string | null) => void;
  onEditTask: (task: ScheduleTask) => void;
  onDeleteTask: (taskId: string) => void;
  onIndentTask: (taskId: string) => void;
  onOutdentTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<ScheduleTask>) => Promise<void>;
  onContextMenu?: (task: ScheduleTask, position: { x: number; y: number }) => void;
}

function TaskRow({
  task,
  selectedIds,
  expandedIds,
  onToggleExpand,
  onSelectionChange,
  onTaskClick,
  onAddSubtask,
  onEditTask,
  onDeleteTask,
  onIndentTask,
  onOutdentTask,
  onUpdateTask,
  onContextMenu,
}: TaskRowProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(task.name);
  const [isSaving, setIsSaving] = useState(false);

  const isExpanded = expandedIds.has(task.id);
  const hasChildren = task.children && task.children.length > 0;
  const isSelected = selectedIds.has(task.id);
  const indentPx = task.level * 24;

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (onContextMenu) {
        onContextMenu(task, { x: e.clientX, y: e.clientY });
      }
    },
    [task, onContextMenu]
  );

  const handleToggleSelect = useCallback(
    (checked: boolean) => {
      const newSelection = new Set(selectedIds);
      if (checked) {
        newSelection.add(task.id);
      } else {
        newSelection.delete(task.id);
      }
      onSelectionChange(newSelection);
    },
    [selectedIds, task.id, onSelectionChange]
  );

  const handleNameSave = useCallback(async () => {
    if (editName.trim() && editName !== task.name) {
      setIsSaving(true);
      try {
        await onUpdateTask(task.id, { name: editName.trim() });
      } finally {
        setIsSaving(false);
      }
    }
    setIsEditingName(false);
  }, [editName, task.name, task.id, onUpdateTask]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleNameSave();
      } else if (e.key === "Escape") {
        setEditName(task.name);
        setIsEditingName(false);
      }
    },
    [handleNameSave, task.name]
  );

  return (
    <>
      <TableRow
        className={cn(
          "group hover:bg-accent cursor-pointer transition-colors duration-150",
          isSelected && "bg-primary/10",
          task.is_milestone && "bg-amber-50/50 dark:bg-amber-950/20"
        )}
        onClick={() => onTaskClick(task)}
        onContextMenu={handleContextMenu}
      >
        {/* Selection Checkbox */}
        <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleToggleSelect}
            aria-label={`Select ${task.name}`}
          />
        </TableCell>

        {/* Task Name with Hierarchy */}
        <TableCell className="min-w-[200px]">
          <div
            className="flex items-center gap-1"
            style={{ paddingLeft: `${indentPx}px` }}
          >
            {/* Expand/Collapse Button */}
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(task.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <div className="w-6" />
            )}

            {/* Milestone Icon */}
            {task.is_milestone && (
              <Flag className="h-4 w-4 text-[hsl(var(--status-warning))] mr-1" />
            )}

            {/* Task Name (Editable) */}
            {isEditingName ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={handleNameKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="h-7 text-sm"
                autoFocus
                disabled={isSaving}
              />
            ) : (
              <span
                className={cn(
                  "text-sm font-medium truncate",
                  task.is_milestone && "text-amber-700 dark:text-amber-400"
                )}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setIsEditingName(true);
                }}
              >
                {task.name}
              </span>
            )}

            {isSaving && <Loader2 className="h-3 w-3 animate-spin ml-2" />}
          </div>
        </TableCell>

        {/* Start Date */}
        <TableCell className="w-[120px]">
          <span className="text-sm text-muted-foreground">
            {formatDate(task.start_date)}
          </span>
        </TableCell>

        {/* Finish Date */}
        <TableCell className="w-[120px]">
          <span className="text-sm text-muted-foreground">
            {formatDate(task.finish_date)}
          </span>
        </TableCell>

        {/* Duration */}
        <TableCell className="w-[80px]">
          <span className="text-sm text-muted-foreground">
            {task.duration_days !== null ? `${task.duration_days}d` : "-"}
          </span>
        </TableCell>

        {/* Progress */}
        <TableCell className="w-[140px]">
          <div className="flex items-center gap-2">
            <Progress value={task.percent_complete} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground w-8">
              {task.percent_complete}%
            </span>
          </div>
        </TableCell>

        {/* Status */}
        <TableCell className="w-[120px]">
          <Badge variant={statusConfig[task.status].variant}>
            {statusConfig[task.status].label}
          </Badge>
        </TableCell>

        {/* Actions */}
        <TableCell className="w-[60px]" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditTask(task)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddSubtask(task.id)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subtask
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onIndentTask(task.id)}>
                <ArrowRight className="h-4 w-4 mr-2" />
                Indent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOutdentTask(task.id)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Outdent
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDeleteTask(task.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      {/* Render Children */}
      {hasChildren &&
        isExpanded &&
        task.children.map((child) => (
          <TaskRow
            key={child.id}
            task={child}
            selectedIds={selectedIds}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            onSelectionChange={onSelectionChange}
            onTaskClick={onTaskClick}
            onAddSubtask={onAddSubtask}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onIndentTask={onIndentTask}
            onOutdentTask={onOutdentTask}
            onUpdateTask={onUpdateTask}
            onContextMenu={onContextMenu}
          />
        ))}
    </>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TaskTable({
  tasks,
  selectedIds,
  onSelectionChange,
  onTaskClick,
  onAddSubtask,
  onEditTask,
  onDeleteTask,
  onIndentTask,
  onOutdentTask,
  onUpdateTask,
  onContextMenu,
  isLoading = false,
}: TaskTableProps) {
  const [sort, setSort] = useState<SortConfig | null>(null);

  const toggleSort = useCallback((field: SortField) => {
    setSort((prev) => {
      if (!prev || prev.field !== field) return { field, direction: "asc" };
      if (prev.direction === "asc") return { field, direction: "desc" };
      return null;
    });
  }, []);

  const sortedTasks = useMemo(() => sortTasks(tasks, sort), [tasks, sort]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Start with all tasks expanded
    const ids = new Set<string>();
    const collectIds = (taskList: ScheduleTaskWithHierarchy[]) => {
      for (const task of taskList) {
        ids.add(task.id);
        if (task.children?.length) {
          collectIds(task.children);
        }
      }
    };
    collectIds(tasks);
    return ids;
  });

  // Flatten tasks for "select all" counting
  const allTaskIds = useMemo(() => {
    const ids: string[] = [];
    const collectIds = (taskList: ScheduleTaskWithHierarchy[]) => {
      for (const task of taskList) {
        ids.push(task.id);
        if (task.children?.length) {
          collectIds(task.children);
        }
      }
    };
    collectIds(tasks);
    return ids;
  }, [tasks]);

  const handleToggleExpand = useCallback((taskId: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        onSelectionChange(new Set(allTaskIds));
      } else {
        onSelectionChange(new Set());
      }
    },
    [allTaskIds, onSelectionChange]
  );

  const isAllSelected =
    allTaskIds.length > 0 && selectedIds.size === allTaskIds.length;
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all tasks"
                ref={(el) => {
                  if (el) {
                    (
                      el as HTMLButtonElement & { indeterminate?: boolean }
                    ).indeterminate = isSomeSelected;
                  }
                }}
              />
            </TableHead>
            <SortableHeader label="Task Name" field="name" sort={sort} onToggle={toggleSort} className="min-w-[200px]" />
            <SortableHeader label="Start" field="start_date" sort={sort} onToggle={toggleSort} className="w-[120px]" />
            <SortableHeader label="Finish" field="finish_date" sort={sort} onToggle={toggleSort} className="w-[120px]" />
            <SortableHeader label="Duration" field="duration_days" sort={sort} onToggle={toggleSort} className="w-[80px]" />
            <SortableHeader label="Progress" field="percent_complete" sort={sort} onToggle={toggleSort} className="w-[140px]" />
            <SortableHeader label="Status" field="status" sort={sort} onToggle={toggleSort} className="w-[120px]" />
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    No tasks yet. Click &quot;Add Task&quot; to create one.
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            sortedTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                selectedIds={selectedIds}
                expandedIds={expandedIds}
                onToggleExpand={handleToggleExpand}
                onSelectionChange={onSelectionChange}
                onTaskClick={onTaskClick}
                onAddSubtask={onAddSubtask}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onIndentTask={onIndentTask}
                onOutdentTask={onOutdentTask}
                onUpdateTask={onUpdateTask}
                onContextMenu={onContextMenu}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
