"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TaskRow } from "./task-row";

export interface Task {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "in_review" | "done" | "blocked";
  assignee?: string;
  due_date?: string;
}

interface EpicSectionProps {
  id: string;
  name: string;
  tasks: Task[];
  defaultOpen?: boolean;
  onTaskToggle?: (taskId: string) => void;
}

export function EpicSection({
  id,
  name,
  tasks,
  defaultOpen = true,
  onTaskToggle,
}: EpicSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const completedCount = tasks.filter((t) => t.status === "done").length;
  const totalCount = tasks.length;

  return (
    <div className="space-y-0">
      {/* Epic Header */}
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full h-10 px-4 -mx-4 rounded transition-colors duration-150 hover:bg-muted group"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={cn(
              "h-3 w-3 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-90"
            )}
          />
          <h3 className="text-base font-semibold text-foreground tracking-tight">
            {name}
          </h3>
          <span className="text-xs font-medium text-muted-foreground">
            {completedCount}/{totalCount}
          </span>
        </div>
      </Button>

      {/* Task List */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-0">
              {tasks.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-neutral-400">No tasks yet</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => onTaskToggle?.(task.id)}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
