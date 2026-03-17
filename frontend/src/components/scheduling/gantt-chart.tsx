"use client";

/**
 * =============================================================================
 * GANTT CHART COMPONENT
 * =============================================================================
 *
 * Custom SVG-based Gantt chart for project scheduling visualization.
 * Supports:
 * - Task bars with progress indicators
 * - Milestone diamonds
 * - Dependency arrows
 * - Timeline grid
 * - Zoom levels (day, week, month)
 * - Deadline indicators
 */

import { useMemo, useRef, useEffect, useCallback, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Circle,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  PanelLeftOpen,
  PanelLeftClose,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  format,
  differenceInDays,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachMonthOfInterval,
  isWeekend,
} from "date-fns";
import type { TaskStatus, GanttChartItem, DependencyType } from "@/types/scheduling";
import type { ScheduleTask } from "@/types/scheduling";

// =============================================================================
// TYPES
// =============================================================================

type ZoomLevel = "day" | "week" | "month";

interface GanttChartProps {
  data: GanttChartItem[];
  onTaskClick?: (taskId: string) => void;
  onQuickAddTask?: (name: string) => Promise<void>;
  onUpdateTask?: (taskId: string, updates: Partial<ScheduleTask>) => Promise<void>;
  visibleColumns?: string[];
  className?: string;
}

interface TimelineRange {
  start: Date;
  end: Date;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ROW_HEIGHT = 36;
const HEADER_ROW_1 = 30; // Month row
const HEADER_ROW_2 = 30; // Day row
const HEADER_HEIGHT = HEADER_ROW_1 + HEADER_ROW_2;
const TASK_BAR_HEIGHT = 20;
const MILESTONE_SIZE = 12;
const LEFT_PANEL_WIDTH = 340;
const LEFT_PANEL_MIN_WIDTH = 240;
const LEFT_PANEL_MAX_WIDTH = 560;

const ganttStatusConfig: Record<TaskStatus, { label: string; icon: typeof Circle; iconColor: string }> = {
  not_started: { label: "Not started", icon: Circle, iconColor: "text-muted-foreground" },
  in_progress: { label: "In progress", icon: Clock, iconColor: "text-[hsl(var(--status-info))]" },
  complete: { label: "Complete", icon: CheckCircle2, iconColor: "text-[hsl(var(--status-success))]" },
};

const ZOOM_CONFIG: Record<ZoomLevel, { dayWidth: number; format: string }> = {
  day: { dayWidth: 40, format: "d" },
  week: { dayWidth: 36, format: "EEEEE d" },
  month: { dayWidth: 8, format: "MMM" },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getDateRange = (data: GanttChartItem[]): TimelineRange => {
  if (data.length === 0) {
    const today = new Date();
    return {
      start: startOfMonth(today),
      end: endOfMonth(addDays(today, 60)),
    };
  }

  const dates = data.flatMap((item) => {
    const itemDates: Date[] = [];
    if (item.start_date) itemDates.push(new Date(item.start_date));
    if (item.finish_date) itemDates.push(new Date(item.finish_date));
    if (item.deadline) itemDates.push(new Date(item.deadline));
    return itemDates;
  });

  if (dates.length === 0) {
    const today = new Date();
    return {
      start: startOfMonth(today),
      end: endOfMonth(addDays(today, 60)),
    };
  }

  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  // Add padding
  return {
    start: addDays(startOfMonth(minDate), -7),
    end: addDays(endOfMonth(maxDate), 14),
  };
};

const getBarColor = (percentComplete: number, isOverdue: boolean): string => {
  if (isOverdue) return "hsl(var(--destructive))";
  if (percentComplete === 100) return "hsl(var(--success, 142 71% 45%))";
  return "hsl(var(--primary))";
};

// =============================================================================
// DEPENDENCY ARROW COMPONENT
// =============================================================================

interface DependencyArrowProps {
  from: GanttChartItem;
  to: GanttChartItem;
  taskIndexMap: Map<string, number>;
  dayWidth: number;
  startDate: Date;
  dependencyType: DependencyType;
  lagDays: number;
}

function DependencyArrow({
  from,
  to,
  taskIndexMap,
  dayWidth,
  startDate,
  dependencyType,
  lagDays,
}: DependencyArrowProps) {
  const fromIndex = taskIndexMap.get(from.id);
  const toIndex = taskIndexMap.get(to.id);

  if (fromIndex === undefined || toIndex === undefined) return null;

  // Calculate positions based on dependency type
  let fromX: number;
  let toX: number;

  const getDateX = (dateStr: string) =>
    differenceInDays(new Date(dateStr), startDate) * dayWidth;

  switch (dependencyType) {
    case "finish_to_start": // Finish-to-Start
      fromX = getDateX(from.finish_date) + dayWidth;
      toX = getDateX(to.start_date);
      break;
    case "start_to_start": // Start-to-Start
      fromX = getDateX(from.start_date);
      toX = getDateX(to.start_date);
      break;
    case "finish_to_finish": // Finish-to-Finish
      fromX = getDateX(from.finish_date) + dayWidth;
      toX = getDateX(to.finish_date) + dayWidth;
      break;
    case "start_to_finish": // Start-to-Finish
      fromX = getDateX(from.start_date);
      toX = getDateX(to.finish_date) + dayWidth;
      break;
    default:
      fromX = getDateX(from.finish_date) + dayWidth;
      toX = getDateX(to.start_date);
  }

  const fromY = HEADER_HEIGHT + fromIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
  const toY = HEADER_HEIGHT + toIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

  // Create path for the arrow
  const midX = (fromX + toX) / 2;
  const path =
    fromY === toY
      ? `M ${fromX} ${fromY} L ${toX - 6} ${toY}` // Horizontal line
      : `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX - 6} ${toY}`; // Stepped line

  return (
    <g className="dependency-arrow">
      <path
        d={path}
        fill="none"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth={1.5}
        strokeDasharray={lagDays > 0 ? "4,2" : undefined}
        opacity={0.6}
      />
      {/* Arrow head */}
      <polygon
        points={`${toX - 6},${toY - 4} ${toX},${toY} ${toX - 6},${toY + 4}`}
        fill="hsl(var(--muted-foreground))"
        opacity={0.6}
      />
    </g>
  );
}

// =============================================================================
// TASK BAR COMPONENT
// =============================================================================

interface TaskBarProps {
  task: GanttChartItem;
  index: number;
  dayWidth: number;
  startDate: Date;
  onTaskClick?: (taskId: string) => void;
}

function TaskBar({ task, index, dayWidth, startDate, onTaskClick }: TaskBarProps) {
  const taskStart = new Date(task.start_date);
  const taskEnd = new Date(task.finish_date);

  const startOffset = differenceInDays(taskStart, startDate);
  const duration = Math.max(1, differenceInDays(taskEnd, taskStart) + 1);

  const x = startOffset * dayWidth;
  const y = HEADER_HEIGHT + index * ROW_HEIGHT + (ROW_HEIGHT - TASK_BAR_HEIGHT) / 2;
  const width = duration * dayWidth;

  const progressWidth = (width * task.percent_complete) / 100;
  const barColor = getBarColor(task.percent_complete, task.is_overdue);

  if (task.is_milestone) {
    // Render milestone as diamond
    const cx = x + dayWidth / 2;
    const cy = y + TASK_BAR_HEIGHT / 2;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <g
              className="cursor-pointer"
              onClick={() => onTaskClick?.(task.id)}
            >
              <polygon
                points={`${cx},${cy - MILESTONE_SIZE} ${cx + MILESTONE_SIZE},${cy} ${cx},${cy + MILESTONE_SIZE} ${cx - MILESTONE_SIZE},${cy}`}
                fill="hsl(var(--warning, 45 93% 47%))"
                stroke="hsl(var(--warning-foreground, 45 93% 27%))"
                strokeWidth={1}
              />
            </g>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <div className="font-medium">{task.name}</div>
              <div className="text-muted-foreground">
                Milestone: {format(taskStart, "MMM d, yyyy")}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <g
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onTaskClick?.(task.id)}
          >
            {/* Background bar */}
            <rect
              x={x}
              y={y}
              width={width}
              height={TASK_BAR_HEIGHT}
              rx={4}
              fill={barColor}
              opacity={0.3}
            />
            {/* Progress bar */}
            <rect
              x={x}
              y={y}
              width={progressWidth}
              height={TASK_BAR_HEIGHT}
              rx={4}
              fill={barColor}
            />
            {/* Deadline indicator */}
            {task.deadline && (
              <line
                x1={differenceInDays(new Date(task.deadline), startDate) * dayWidth}
                y1={y - 4}
                x2={differenceInDays(new Date(task.deadline), startDate) * dayWidth}
                y2={y + TASK_BAR_HEIGHT + 4}
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                strokeDasharray="4,2"
              />
            )}
          </g>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm space-y-1">
            <div className="font-medium">{task.name}</div>
            <div className="text-muted-foreground">
              {format(taskStart, "MMM d")} - {format(taskEnd, "MMM d, yyyy")}
            </div>
            <div className="flex items-center gap-2">
              <span>Progress:</span>
              <Badge variant={task.percent_complete === 100 ? "default" : "secondary"}>
                {task.percent_complete}%
              </Badge>
            </div>
            {task.deadline && (
              <div className="text-destructive">
                Deadline: {format(new Date(task.deadline), "MMM d, yyyy")}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function GanttChart({ data, onTaskClick, onQuickAddTask, onUpdateTask, visibleColumns, className }: GanttChartProps) {
  const zoomLevel: ZoomLevel = "week";
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(LEFT_PANEL_WIDTH);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [quickTaskName, setQuickTaskName] = useState("");
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetTaskId, setDropTargetTaskId] = useState<string | null>(null);

  const { dayWidth } = ZOOM_CONFIG[zoomLevel];
  const dateRange = useMemo(() => getDateRange(data), [data]);

  // Determine which tasks are parents (have children)
  const parentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const task of data) {
      if (task.parent_task_id) ids.add(task.parent_task_id);
    }
    return ids;
  }, [data]);

  // Filter out collapsed children
  const visibleData = useMemo(() => {
    if (collapsedIds.size === 0) return data;
    // Build a set of all collapsed ancestor IDs (transitive)
    const hiddenParents = new Set<string>();
    const isHidden = (task: GanttChartItem): boolean => {
      if (!task.parent_task_id) return false;
      if (collapsedIds.has(task.parent_task_id)) return true;
      if (hiddenParents.has(task.parent_task_id)) return true;
      // Check ancestors
      const parent = data.find((t) => t.id === task.parent_task_id);
      if (parent && isHidden(parent)) {
        hiddenParents.add(task.parent_task_id);
        return true;
      }
      return false;
    };
    return data.filter((task) => !isHidden(task));
  }, [data, collapsedIds]);

  const toggleCollapse = useCallback((taskId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  // Generate timeline days
  const timelineDays = useMemo(() => {
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  }, [dateRange]);

  const totalWidth = timelineDays.length * dayWidth;
  const totalHeight = HEADER_HEIGHT + visibleData.length * ROW_HEIGHT;

  // Create task index map for dependency arrows
  const taskIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    visibleData.forEach((task, index) => {
      map.set(task.id, index);
    });
    return map;
  }, [visibleData]);

  // Scroll to today on mount
  useEffect(() => {
    const today = new Date();
    const todayOffset = differenceInDays(today, dateRange.start);
    const scrollTo = Math.max(0, todayOffset * dayWidth - 200);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollTo;
    }
  }, [dateRange.start, dayWidth]);

  const handleScroll = useCallback(() => {}, []);
  const startResize = useCallback(() => {
    if (isPanelCollapsed) return;
    setIsResizing(true);
  }, [isPanelCollapsed]);

  useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (!containerRef.current) return;
      const bounds = containerRef.current.getBoundingClientRect();
      const nextWidth = event.clientX - bounds.left;
      setLeftPanelWidth(
        Math.max(LEFT_PANEL_MIN_WIDTH, Math.min(LEFT_PANEL_MAX_WIDTH, nextWidth))
      );
    };

    const stopResize = () => setIsResizing(false);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  // Generate timeline header (months + days for week zoom)
  const renderTimelineHeader = useMemo(() => {
    const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });

    return (
      <>
        {/* Months row */}
        <g className="months-header">
          {months.map((month, i) => {
            const monthStart = i === 0 ? dateRange.start : startOfMonth(month);
            const monthEnd =
              i === months.length - 1 ? dateRange.end : endOfMonth(month);
            const startOffset = differenceInDays(monthStart, dateRange.start);
            const monthDays = differenceInDays(monthEnd, monthStart) + 1;

            return (
              <g key={month.toISOString()}>
                <rect
                  x={startOffset * dayWidth}
                  y={0}
                  width={monthDays * dayWidth}
                  height={HEADER_ROW_1}
                  fill="hsl(var(--card))"
                  stroke="hsl(var(--border))"
                />
                <text
                  x={startOffset * dayWidth + (monthDays * dayWidth) / 2}
                  y={HEADER_ROW_1 - 10}
                  textAnchor="middle"
                  className="text-xs font-medium fill-foreground"
                >
                  {format(month, "MMMM yyyy")}
                </text>
              </g>
            );
          })}
        </g>

        {/* Days row — abbreviation + number (e.g., "M 3") */}
        <g className="days-header">
          {timelineDays.map((day, i) => {
            const isWknd = isWeekend(day);
            return (
              <g key={day.toISOString()}>
                <rect
                  x={i * dayWidth}
                  y={HEADER_ROW_1}
                  width={dayWidth}
                  height={HEADER_ROW_2}
                  fill="transparent"
                  stroke="hsl(var(--border))"
                />
                <text
                  x={i * dayWidth + dayWidth / 2}
                  y={HEADER_ROW_1 + HEADER_ROW_2 - 10}
                  textAnchor="middle"
                  className="text-2xs"
                  fill={isWknd ? "hsl(var(--muted-foreground) / 0.6)" : "hsl(var(--muted-foreground))"}
                >
                  {format(day, "EEEEE d")}
                </text>
              </g>
            );
          })}
        </g>
      </>
    );
  }, [dateRange, dayWidth, timelineDays]);

  // Render grid lines
  const renderGridLines = useMemo(() => {
    return (
      <g className="grid-lines" opacity={0.3}>
        {/* Weekend column highlighting */}
        {timelineDays.map((day, i) => {
          if (!isWeekend(day)) return null;
          return (
            <rect
              key={`wknd-${day.toISOString()}`}
              x={i * dayWidth}
              y={HEADER_HEIGHT}
              width={dayWidth}
              height={totalHeight - HEADER_HEIGHT}
              fill="hsl(var(--muted))"
              opacity={0.4}
            />
          );
        })}
        {/* Vertical lines */}
        {timelineDays.map((day, i) => (
          <line
            key={`v-${day.toISOString()}`}
            x1={i * dayWidth}
            y1={HEADER_HEIGHT}
            x2={i * dayWidth}
            y2={totalHeight}
            stroke="hsl(var(--border))"
            strokeWidth={isWeekend(day) ? 0.5 : 0.25}
          />
        ))}
        {/* Horizontal lines */}
        {visibleData.map((_, i) => (
          <line
            key={`h-${i}`}
            x1={0}
            y1={HEADER_HEIGHT + i * ROW_HEIGHT}
            x2={totalWidth}
            y2={HEADER_HEIGHT + i * ROW_HEIGHT}
            stroke="hsl(var(--border))"
            strokeWidth={0.25}
          />
        ))}
      </g>
    );
  }, [timelineDays, dayWidth, totalHeight, totalWidth, visibleData]);

  // Render today line
  const renderTodayLine = useMemo(() => {
    const today = new Date();
    const todayOffset = differenceInDays(today, dateRange.start);
    if (todayOffset < 0 || todayOffset > timelineDays.length) return null;

    return (
      <line
        x1={todayOffset * dayWidth}
        y1={HEADER_HEIGHT}
        x2={todayOffset * dayWidth}
        y2={totalHeight}
        stroke="hsl(var(--destructive))"
        strokeWidth={2}
        strokeDasharray="4,4"
      />
    );
  }, [dateRange.start, dayWidth, totalHeight, timelineDays.length]);

  const handleQuickAdd = useCallback(async () => {
    if (!onQuickAddTask || isQuickAdding) return;
    setIsQuickAdding(true);
    try {
      await onQuickAddTask(quickTaskName);
      setQuickTaskName("");
    } finally {
      setIsQuickAdding(false);
    }
  }, [isQuickAdding, onQuickAddTask, quickTaskName]);

  const leftColumns = useMemo(() => {
    const all = [
      { id: "name", label: "Title", width: 260 },
      { id: "start_date", label: "Start", width: 96 },
      { id: "finish_date", label: "Finish", width: 96 },
      { id: "duration_days", label: "Duration", width: 88 },
      { id: "percent_complete", label: "%", width: 72 },
      { id: "status", label: "Status", width: 90 },
      { id: "assigned_to", label: "Assigned", width: 110 },
      { id: "wbs_code", label: "WBS", width: 90 },
      { id: "constraint_type", label: "Constraint", width: 120 },
    ];
    if (!visibleColumns || visibleColumns.length === 0) return all;
    const selected = all.filter((column) => visibleColumns.includes(column.id));
    if (!selected.some((column) => column.id === "name")) selected.unshift(all[0]);
    return selected;
  }, [visibleColumns]);

  const leftMinWidth = useMemo(
    () => leftColumns.reduce((sum, column) => sum + column.width, 0),
    [leftColumns]
  );

  return (
    <div className={cn("flex flex-col", className)} ref={containerRef}>
      {/* Chart Area */}
      <div className={cn("relative flex flex-1 overflow-hidden", isResizing && "select-none")}>
        {/* Left Panel - Task List */}
        <div
          className={cn(
            "flex-shrink-0 border-r bg-muted/20 transition-[width] duration-200 ease-out",
            isPanelCollapsed && "overflow-hidden"
          )}
          style={{ width: isPanelCollapsed ? 0 : leftPanelWidth }}
        >
          {/* Two-row header aligned with SVG timeline (total = HEADER_HEIGHT) */}
          {/* Row 1: aligned with month row — light bg to match SVG */}
          <div className="flex items-center bg-muted/20 pl-1.5" style={{ height: HEADER_ROW_1 }}>
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setIsPanelCollapsed((prev) => !prev)}
              aria-label={isPanelCollapsed ? "Expand task panel" : "Collapse task panel"}
              title={isPanelCollapsed ? "Expand task panel" : "Collapse task panel"}
            >
              {isPanelCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="overflow-x-auto overflow-y-hidden">
            <div style={{ minWidth: leftMinWidth }}>
              {/* Row 2: column headers aligned with day row */}
              <div
                className="border-b border-border bg-muted/20 flex items-center text-[11px] font-normal text-muted-foreground"
                style={{ height: HEADER_ROW_2 }}
              >
                {leftColumns.map((column) => (
                  <div
                    key={column.id}
                    className={cn("truncate px-2", column.id === "name" && "pl-10")}
                    style={{ width: column.width }}
                  >
                    {column.label}
                  </div>
                ))}
              </div>

              {/* Task List */}
              <div className="overflow-hidden">
                {visibleData.map((task) => {
              const isParent = parentIds.has(task.id);
              const isCollapsed = collapsedIds.has(task.id);
              const statusInfo = ganttStatusConfig[task.status];
              const StatusIcon = statusInfo.icon;
              return (
                <div
                  key={task.id}
                  className={cn(
                    "border-b border-border/50 flex items-center hover:bg-accent/50 transition-colors duration-100 cursor-pointer",
                    dropTargetTaskId === task.id && "bg-primary/5"
                  )}
                  style={{ height: ROW_HEIGHT }}
                  draggable
                  onClick={() => onTaskClick?.(task.id)}
                  onDragStart={() => setDraggedTaskId(task.id)}
                  onDragEnd={() => {
                    setDraggedTaskId(null);
                    setDropTargetTaskId(null);
                  }}
                  onDragOver={(event) => {
                    if (!draggedTaskId || draggedTaskId === task.id || !onUpdateTask) return;
                    event.preventDefault();
                    setDropTargetTaskId(task.id);
                  }}
                  onDragLeave={() => {
                    if (dropTargetTaskId === task.id) {
                      setDropTargetTaskId(null);
                    }
                  }}
                  onDrop={async (event) => {
                    event.preventDefault();
                    if (!draggedTaskId || draggedTaskId === task.id || !onUpdateTask) return;
                    setDropTargetTaskId(null);
                    await onUpdateTask(draggedTaskId, { parent_task_id: task.id });
                  }}
                >
                  {leftColumns.map((column) => (
                    <div key={column.id} className="px-2" style={{ width: column.width }}>
                      {column.id === "name" ? (
                        <div
                          className="flex items-center gap-1 min-w-0"
                          style={{ paddingLeft: `${2 + task.level * 16}px` }}
                        >
                          {isParent ? (
                            <button
                              type="button"
                              className="flex-shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
                              onClick={(e) => { e.stopPropagation(); toggleCollapse(task.id); }}
                              aria-label={isCollapsed ? "Expand" : "Collapse"}
                            >
                              {isCollapsed ? (
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </button>
                          ) : (
                            <span className="w-[18px] flex-shrink-0" />
                          )}
                          <button
                            type="button"
                            className="flex-shrink-0 rounded-sm border border-border hover:border-foreground/40 transition-colors h-3.5 w-3.5 flex items-center justify-center"
                            onClick={() => onTaskClick?.(task.id)}
                            aria-label={`Select ${task.name}`}
                          >
                            {task.percent_complete === 100 && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-status-success" />
                            )}
                          </button>
                          <button
                            type="button"
                            className={cn(
                              "text-[13px] truncate text-left bg-transparent border-none p-0 ml-1.5 cursor-pointer hover:underline",
                              isParent ? "font-semibold text-foreground" : "font-normal text-foreground"
                            )}
                            onClick={() => onTaskClick?.(task.id)}
                          >
                            {task.name}
                          </button>
                        </div>
                      ) : column.id === "start_date" ? (
                        <span className="text-[12px] text-muted-foreground">
                          {format(new Date(task.start_date), "MMM d")}
                        </span>
                      ) : column.id === "finish_date" ? (
                        <span className="text-[12px] text-muted-foreground">
                          {format(new Date(task.finish_date), "MMM d")}
                        </span>
                      ) : column.id === "duration_days" ? (
                        <span className="text-[12px] text-muted-foreground">{task.duration_days}d</span>
                      ) : column.id === "percent_complete" ? (
                        <span className="text-[12px] text-muted-foreground">{task.percent_complete}%</span>
                      ) : column.id === "status" ? (
                        <div className="flex items-center">
                          <StatusIcon className={cn("h-4 w-4", statusInfo.iconColor)} />
                        </div>
                      ) : column.id === "assigned_to" ? (
                        <span className="text-[12px] text-muted-foreground">-</span>
                      ) : column.id === "wbs_code" ? (
                        <span className="text-[12px] text-muted-foreground">-</span>
                      ) : (
                        <span className="text-[12px] text-muted-foreground">-</span>
                      )}
                    </div>
                  ))}
                </div>
              );
                })}
                <div className="border-b border-border/50 px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={quickTaskName}
                      onChange={(event) => setQuickTaskName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleQuickAdd();
                        }
                      }}
                      placeholder="Add task and press Enter"
                      className="h-7 text-xs border-dashed"
                      disabled={!onQuickAddTask || isQuickAdding}
                    />
                    <button
                      type="button"
                      className="inline-flex h-7 items-center justify-center rounded px-2 text-xs text-primary hover:bg-muted disabled:opacity-50"
                      disabled={!onQuickAddTask || isQuickAdding}
                      onClick={() => void handleQuickAdd()}
                    >
                      {isQuickAdding ? "..." : "Add"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!isPanelCollapsed && (
          <button
            type="button"
            aria-label="Resize task panel"
            title="Drag to resize task panel"
            className="group relative hidden w-2 cursor-col-resize border-r border-border/70 bg-background/20 transition-colors hover:bg-muted/80 md:block"
            onPointerDown={startResize}
          >
            <GripVertical className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        )}

        {/* Right Panel - Gantt Chart */}
        <div
          className="flex-1 overflow-auto"
          ref={scrollContainerRef}
          onScroll={handleScroll}
        >
          <svg
            width={totalWidth}
            height={totalHeight}
            style={{ transition: 'all 250ms cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            {/* Timeline Header */}
            {renderTimelineHeader}

            {/* Grid Lines */}
            {renderGridLines}

            {/* Dependency Arrows */}
            {visibleData.map((task) =>
              task.dependencies?.map((dep) => {
                const predecessor = visibleData.find((t) => t.id === dep.predecessor_id);
                if (!predecessor) return null;
                return (
                  <DependencyArrow
                    key={`${dep.predecessor_id}-${task.id}`}
                    from={predecessor}
                    to={task}
                    taskIndexMap={taskIndexMap}
                    dayWidth={dayWidth}
                    startDate={dateRange.start}
                    dependencyType={dep.type as DependencyType}
                    lagDays={dep.lag_days}
                  />
                );
              })
            )}

            {/* Task Bars */}
            {visibleData.map((task, index) => (
              <TaskBar
                key={task.id}
                task={task}
                index={index}
                dayWidth={dayWidth}
                startDate={dateRange.start}
                onTaskClick={onTaskClick}
              />
            ))}

            {/* Today Line */}
            {renderTodayLine}
          </svg>
        </div>

        {isPanelCollapsed && (
          <button
            type="button"
            className="absolute left-2 top-1.5 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md bg-background text-muted-foreground shadow-sm ring-1 ring-border transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setIsPanelCollapsed(false)}
            aria-label="Expand task panel"
            title="Expand task panel"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
