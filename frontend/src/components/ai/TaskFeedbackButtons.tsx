"use client";

import { useState } from "react";
import { Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { useTaskFeedback } from "@/hooks/use-task-feedback";
import type { TaskSnapshot } from "@/lib/ai/services/task-training-service";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface TaskFeedbackButtonsProps {
  projectId: number;
  taskId?: string | null;
  taskSnapshot: TaskSnapshot;
  sessionId?: string | null;
  className?: string;
}

export function TaskFeedbackButtons({
  projectId,
  taskId,
  taskSnapshot,
  sessionId,
  className,
}: TaskFeedbackButtonsProps) {
  const { signal, isSubmitting, submitFeedback } = useTaskFeedback({
    projectId,
    taskId,
    taskSnapshot,
    sessionId,
  });

  const [badReasonOpen, setBadReasonOpen] = useState(false);
  const [badReason, setBadReason] = useState("");

  if (signal !== null) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {signal === "good" ? "Marked as good example" : "Feedback recorded"}
      </span>
    );
  }

  const handleGood = () => {
    void submitFeedback("good");
  };

  const handleBadConfirm = () => {
    setBadReasonOpen(false);
    void submitFeedback("bad", badReason.trim() || undefined);
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
        <PopoverContent className="w-72 p-3">
          <p className="mb-2 text-sm font-medium">
            What&apos;s wrong with this task?
          </p>
          <Textarea
            value={badReason}
            onChange={(e) => setBadReason(e.target.value)}
            placeholder="Too vague, wrong assignee, already exists... (optional)"
            className="mb-2 min-h-16 resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBadReasonOpen(false);
                setBadReason("");
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleBadConfirm}>
              Submit
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
