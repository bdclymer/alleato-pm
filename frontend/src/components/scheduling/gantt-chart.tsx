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

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  format,
  differenceInDays,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isWeekend,
  isSameMonth,
} from "date-fns";
import { GanttChartItem, DependencyType } from "@/types/scheduling";

// =============================================================================
// TYPES
// =============================================================================

type ZoomLevel = "day" | "week" | "month";

interface GanttChartProps {
  data: GanttChartItem[];
  onTaskClick?: (taskId: string) => void;
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
const HEADER_HEIGHT = 60;
const TASK_BAR_HEIGHT = 20;
const MILESTONE_SIZE = 12;
const LEFT_PANEL_WIDTH = 250;

const ZOOM_CONFIG: Record<ZoomLevel, { dayWidth: number; format: string }> = {
  day: { dayWidth: 40, format: "d" },
  week: { dayWidth: 20, format: "d" },
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

export function GanttChart({ data, onTaskClick, className }: GanttChartProps) {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("week");
  const [scrollLeft, setScrollLeft] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { dayWidth } = ZOOM_CONFIG[zoomLevel];
  const dateRange = useMemo(() => getDateRange(data), [data]);

  // Generate timeline days
  const timelineDays = useMemo(() => {
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  }, [dateRange]);

  const totalWidth = timelineDays.length * dayWidth;
  const totalHeight = HEADER_HEIGHT + data.length * ROW_HEIGHT;

  // Create task index map for dependency arrows
  const taskIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((task, index) => {
      map.set(task.id, index);
    });
    return map;
  }, [data]);

  // Scroll to today on mount
  useEffect(() => {
    const today = new Date();
    const todayOffset = differenceInDays(today, dateRange.start);
    const scrollTo = Math.max(0, todayOffset * dayWidth - 200);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollTo;
    }
  }, [dateRange.start, dayWidth]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft((e.target as HTMLDivElement).scrollLeft);
  }, []);

  const scrollToToday = useCallback(() => {
    const today = new Date();
    const todayOffset = differenceInDays(today, dateRange.start);
    const scrollTo = Math.max(0, todayOffset * dayWidth - 200);
    scrollContainerRef.current?.scrollTo({ left: scrollTo, behavior: "smooth" });
  }, [dateRange.start, dayWidth]);

  // Generate timeline header based on zoom level
  const renderTimelineHeader = useMemo(() => {
    if (zoomLevel === "day" || zoomLevel === "week") {
      // Show months row + days row
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
                    height={30}
                    fill="hsl(var(--muted))"
                    stroke="hsl(var(--border))"
                  />
                  <text
                    x={startOffset * dayWidth + (monthDays * dayWidth) / 2}
                    y={20}
                    textAnchor="middle"
                    className="text-xs font-medium fill-foreground"
                  >
                    {format(month, "MMMM yyyy")}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Days row */}
          <g className="days-header">
            {timelineDays.map((day, i) => {
              const isWknd = isWeekend(day);
              return (
                <g key={day.toISOString()}>
                  <rect
                    x={i * dayWidth}
                    y={30}
                    width={dayWidth}
                    height={30}
                    fill={isWknd ? "hsl(var(--muted))" : "transparent"}
                    stroke="hsl(var(--border))"
                  />
                  <text
                    x={i * dayWidth + dayWidth / 2}
                    y={50}
                    textAnchor="middle"
                    className={cn(
                      "text-[10px] fill-muted-foreground",
                      isWknd && "fill-muted-foreground/50"
                    )}
                  >
                    {format(day, ZOOM_CONFIG[zoomLevel].format)}
                  </text>
                </g>
              );
            })}
          </g>
        </>
      );
    }

    // Month zoom - show quarters + months
    const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });

    return (
      <g className="months-header">
        {months.map((month) => {
          const startOffset = differenceInDays(
            startOfMonth(month),
            dateRange.start
          );
          const monthDays = differenceInDays(endOfMonth(month), startOfMonth(month)) + 1;

          return (
            <g key={month.toISOString()}>
              <rect
                x={startOffset * dayWidth}
                y={0}
                width={monthDays * dayWidth}
                height={HEADER_HEIGHT}
                fill="hsl(var(--muted))"
                stroke="hsl(var(--border))"
              />
              <text
                x={startOffset * dayWidth + (monthDays * dayWidth) / 2}
                y={35}
                textAnchor="middle"
                className="text-xs font-medium fill-foreground"
              >
                {format(month, "MMM yyyy")}
              </text>
            </g>
          );
        })}
      </g>
    );
  }, [zoomLevel, dateRange, dayWidth, timelineDays]);

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
        {data.map((_, i) => (
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
  }, [timelineDays, dayWidth, totalHeight, totalWidth, data]);

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

  return (
    <div className={cn("flex flex-col border rounded-lg", className)} ref={containerRef}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={scrollToToday}>
            <Calendar className="h-4 w-4 mr-2" />
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="transition-colors duration-150"
            onClick={() =>
              setZoomLevel((prev) =>
                prev === "day" ? "day" : prev === "week" ? "day" : "week"
              )
            }
            disabled={zoomLevel === "day"}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Select value={zoomLevel} onValueChange={(v) => setZoomLevel(v as ZoomLevel)}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            className="transition-colors duration-150"
            onClick={() =>
              setZoomLevel((prev) =>
                prev === "month" ? "month" : prev === "week" ? "month" : "week"
              )
            }
            disabled={zoomLevel === "month"}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Task Names */}
        <div
          className="flex-shrink-0 border-r bg-background"
          style={{ width: LEFT_PANEL_WIDTH }}
        >
          {/* Header */}
          <div
            className="border-b bg-muted/30 px-3 flex items-center"
            style={{ height: HEADER_HEIGHT }}
          >
            <span className="text-sm font-medium">Task Name</span>
          </div>

          {/* Task List */}
          <div className="overflow-hidden">
            {data.map((task) => (
              <div
                key={task.id}
                className="border-b px-3 flex items-center gap-2 hover:bg-accent cursor-pointer transition-colors duration-150"
                style={{
                  height: ROW_HEIGHT,
                  paddingLeft: `${12 + task.level * 16}px`,
                }}
                onClick={() => onTaskClick?.(task.id)}
              >
                <span className="text-sm truncate">{task.name}</span>
              </div>
            ))}
          </div>
        </div>

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
            {data.map((task) =>
              task.dependencies?.map((dep) => {
                const predecessor = data.find((t) => t.id === dep.predecessor_id);
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
            {data.map((task, index) => (
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
      </div>
    </div>
  );
}
