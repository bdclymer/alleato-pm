"use client";

import { useState } from "react";
import { CheckCircle2, ListPlus, MessageSquareText, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * The per-item overflow menu shown on hover for every actionable brief item
 * (decision, action item, project item). Three commands only — Compact Action
 * Menu pattern (Pattern C): Provide feedback / Mark resolved / Create a task.
 *
 * The trigger stays invisible until the row is hovered or the menu is open, so
 * it never competes with the content — but it is always keyboard-focusable.
 */
export function BriefItemMenu({
  onFeedback,
  onResolve,
  onCreateTask,
  canCreateTask = true,
  disabled,
}: {
  onFeedback: () => void;
  onResolve: () => void;
  onCreateTask: () => void;
  /** Create is only offered when the item has a linkable source document. */
  canCreateTask?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label="Item actions"
        disabled={disabled}
        className={`inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 ${
          open ? "opacity-100" : "opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100"
        }`}
      >
        <MoreVertical className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => onFeedback()}>
          <MessageSquareText className="size-4" aria-hidden />
          Provide feedback
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onResolve()}>
          <CheckCircle2 className="size-4" aria-hidden />
          Mark as resolved
        </DropdownMenuItem>
        {canCreateTask ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onCreateTask()}>
              <ListPlus className="size-4" aria-hidden />
              Create a new task
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
