"use client";

import * as React from "react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Task } from "./epic-section";

interface TaskRowProps {
  task: Task;
  onToggle?: () => void;
}

const statusColors = {
  todo: "bg-neutral-400",
  in_progress: "bg-blue-500",
  in_review: "bg-purple-500",
  done: "bg-green-500",
  blocked: "bg-red-500",
};

const statusLabels = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  blocked: "Blocked",
};

export function TaskRow({ task, onToggle }: TaskRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 h-9 px-4 -mx-4 rounded border-b border-neutral-100 last:border-0",
        "transition-colors duration-150 hover:bg-neutral-50",
        "group"
      )}
    >
      {/* Checkbox */}
      <Checkbox
        checked={task.status === "done"}
        onCheckedChange={onToggle}
        className="h-4 w-4 shrink-0"
      />

      {/* Status Dot */}
      <div
        className={cn(
          "h-1.5 w-1.5 rounded-full shrink-0",
          statusColors[task.status]
        )}
        title={statusLabels[task.status]}
      />

      {/* Task Title */}
      <span
        className={cn(
          "text-sm font-medium flex-1 truncate",
          task.status === "done" ? "text-neutral-400 line-through" : "text-neutral-700"
        )}
      >
        {task.title}
      </span>

      {/* Assignee */}
      {task.assignee && (
        <span className="text-xs text-neutral-500 shrink-0">
          {task.assignee}
        </span>
      )}

      {/* Due Date */}
      {task.due_date && (
        <span className="text-xs text-neutral-500 shrink-0">
          {format(new Date(task.due_date), "MMM d")}
        </span>
      )}
    </div>
  );
}
