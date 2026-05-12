"use client";

import { useState } from "react";
import { Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { useTaskFeedback } from "@/hooks/use-task-feedback";
import {
  TASK_FEEDBACK_REASON_LABELS,
  TASK_FEEDBACK_REASON_CATEGORIES,
  type TaskFeedbackReasonCategory,
  type TaskSnapshot,
} from "@/lib/ai/task-feedback-types";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface TaskFeedbackButtonsProps {
  projectId?: number | null;
  taskId?: string | null;
  taskSnapshot: TaskSnapshot;
  sessionId?: string | null;
  className?: string;
  /**
   * Called after the user submits feedback with reasonCategory="trivial".
   * Intended for the caller to delete the task — a trivial task is one that
   * should never have existed, so leaving it open clutters the inbox.
   */
  onTrivial?: () => void;
}

export function TaskFeedbackButtons({
  projectId,
  taskId,
  taskSnapshot,
  sessionId,
  className,
  onTrivial,
}: TaskFeedbackButtonsProps) {
  const { signal, isSubmitting, submitFeedback } = useTaskFeedback({
    projectId,
    taskId,
    taskSnapshot,
    sessionId,
  });

  const [badReasonOpen, setBadReasonOpen] = useState(false);
  const [badReasonCategory, setBadReasonCategory] =
    useState<TaskFeedbackReasonCategory | null>(null);
  const [badReason, setBadReason] = useState("");

  if (signal !== null) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {signal === "good" ? "Marked as good example" : "Feedback recorded"}
      </span>
    );
  }

  const handleGood = async () => {
    if (signal) return;
    try {
      await submitFeedback("good");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record feedback");
    }
  };

  const handleBadConfirm = async () => {
    if (!badReasonCategory) {
      toast.error("Choose what was wrong with this task");
      return;
    }

    setBadReasonOpen(false);
    const submittedCategory = badReasonCategory;
    try {
      await submitFeedback(
        "bad",
        badReason.trim() || undefined,
        submittedCategory,
      );
      if (submittedCategory === "trivial" && onTrivial) {
        onTrivial();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record feedback");
    }
    setBadReasonCategory(null);
    setBadReason("");
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 hover:text-foreground"
        disabled={isSubmitting}
        onClick={handleGood}
        aria-label="Mark as good example"
      >
        {isSubmitting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ThumbsUp className="h-3.5 w-3.5" />
        )}
      </Button>

      <Popover open={badReasonOpen} onOpenChange={setBadReasonOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:text-destructive"
            disabled={isSubmitting}
            aria-label="Mark as bad example"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          collisionPadding={16}
          className="w-72 p-3"
        >
          <p className="mb-2 text-sm font-medium">
            What&apos;s wrong with this task?
          </p>
          <Select
            value={badReasonCategory ?? undefined}
            onValueChange={(value) =>
              setBadReasonCategory(value as TaskFeedbackReasonCategory)
            }
          >
            <SelectTrigger className="mb-2 h-8">
              <SelectValue placeholder="Choose a reason" />
            </SelectTrigger>
            <SelectContent>
              {TASK_FEEDBACK_REASON_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {TASK_FEEDBACK_REASON_LABELS[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={badReason}
            onChange={(e) => setBadReason(e.target.value)}
            placeholder="Add detail for the next version... (optional)"
            className="mb-2 min-h-16 resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBadReasonOpen(false);
                setBadReasonCategory(null);
                setBadReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleBadConfirm}
              disabled={!badReasonCategory}
            >
              Submit
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
