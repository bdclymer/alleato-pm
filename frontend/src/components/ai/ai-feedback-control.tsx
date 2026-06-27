"use client";

import * as React from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiFetch } from "@/lib/api-client";

/** A reason chip the user can pick when marking AI output as unhelpful. */
export interface AiFeedbackReason {
  id: string;
  label: string;
}

/** Generic reasons that fit narrative AI surfaces (briefs, reports, summaries). */
export const DEFAULT_AI_FEEDBACK_REASONS: AiFeedbackReason[] = [
  { id: "inaccurate", label: "Inaccurate" },
  { id: "missing_context", label: "Missing context" },
  { id: "not_relevant", label: "Not relevant" },
  { id: "too_vague", label: "Too vague" },
  { id: "wrong_emphasis", label: "Wrong emphasis" },
];

type Submitted = "up" | "down" | null;

/**
 * Thumbs up / down control for any AI-generated surface. Posts to the shared
 * `/api/ai-assistant/feedback` endpoint, which records an `ai_feedback_events`
 * row and, on a categorized thumbs-down, an `agent_learnings` row scoped to
 * `surface` — picked up by that surface's generator via `getSurfaceScopedLearnings`.
 *
 * Thumbs-down opens a reason picker, because a reason category is what activates
 * the learning (uncategorized negatives stay candidates and are not injected).
 */
export function AiFeedbackControl({
  surface,
  subjectType,
  subjectId = null,
  projectId = null,
  contentText,
  reasons = DEFAULT_AI_FEEDBACK_REASONS,
  className,
}: {
  surface: string;
  subjectType: string;
  subjectId?: string | null;
  projectId?: number | null;
  /** The AI text being rated — used to extract keywords for the learning. */
  contentText?: string;
  reasons?: AiFeedbackReason[];
  className?: string;
}) {
  const [submitted, setSubmitted] = React.useState<Submitted>(null);
  const [reasonOpen, setReasonOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  async function send(
    feedback: "up" | "down",
    reasonCategory?: string,
    reason?: string,
  ) {
    setSaving(true);
    try {
      await apiFetch("/api/ai-assistant/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback,
          surface,
          subjectType,
          subjectId,
          projectId,
          reasonCategory: reasonCategory ?? null,
          reason: reason ?? null,
          messageContent: contentText?.slice(0, 2000) ?? null,
        }),
      });
      setSubmitted(feedback);
      setReasonOpen(false);
      toast.success(
        feedback === "up"
          ? "Thanks — logged as helpful."
          : "Thanks — the AI will adjust next time.",
      );
    } catch (error) {
      toast.error("Couldn't record feedback.", {
        description:
          error instanceof Error ? error.message : "Unknown feedback error.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={saving}
        aria-label="Helpful"
        title="Helpful"
        className={cn(
          "size-5 text-muted-foreground hover:bg-transparent hover:text-foreground",
          submitted === "up" && "text-primary",
        )}
        onClick={() => void send("up")}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </Button>

      <Popover open={reasonOpen} onOpenChange={setReasonOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={saving}
            aria-label="Not helpful"
            title="Not helpful"
            className={cn(
              "size-5 text-muted-foreground hover:bg-transparent hover:text-foreground",
              submitted === "down" && "text-destructive",
            )}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-2" align="end">
          <p className="px-1 pb-1.5 text-[11px] font-medium text-muted-foreground">
            What was off?
          </p>
          <div className="flex flex-col gap-0.5">
            {reasons.map((r) => (
              <Button
                key={r.id}
                type="button"
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={() => void send("down", r.id, r.label)}
                className="h-auto w-full justify-start px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {r.label}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
