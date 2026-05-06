"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";
import type { TaskSnapshot } from "@/lib/ai/services/task-training-service";

export type FeedbackSignal = "good" | "bad";

interface UseTaskFeedbackOptions {
  projectId: number;
  taskId?: string | null;
  taskSnapshot: TaskSnapshot;
  sessionId?: string | null;
}

interface UseTaskFeedbackReturn {
  signal: FeedbackSignal | null;
  isSubmitting: boolean;
  submitFeedback: (signal: FeedbackSignal, reason?: string) => Promise<void>;
}

export function useTaskFeedback(options: UseTaskFeedbackOptions): UseTaskFeedbackReturn {
  const [signal, setSignal] = useState<FeedbackSignal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFeedback = useCallback(
    async (newSignal: FeedbackSignal, reason?: string) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        await apiFetch("/api/ai-assistant/task-feedback", {
          method: "POST",
          body: JSON.stringify({
            projectId: options.projectId,
            taskId: options.taskId ?? null,
            signal: newSignal,
            reason: reason ?? null,
            taskSnapshot: options.taskSnapshot,
            sessionId: options.sessionId ?? null,
          }),
        });
        setSignal(newSignal);
      } finally {
        setIsSubmitting(false);
      }
    },
    [options, isSubmitting],
  );

  return { signal, isSubmitting, submitFeedback };
}
