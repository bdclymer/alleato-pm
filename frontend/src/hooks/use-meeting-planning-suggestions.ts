"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";

export type MeetingPlanningSuggestionKind =
  | "task"
  | "rfi"
  | "submittal"
  | "change_event"
  | "schedule"
  | "context";

export interface MeetingPlanningSuggestion {
  id: string;
  kind: MeetingPlanningSuggestionKind;
  title: string;
  description: string;
  href: string;
  sourceLabel: string;
  sourceContext?: string | null;
  priority?: "low" | "medium" | "high";
}

export interface MeetingPlanningRecap {
  id: string;
  title: string;
  date: string | null;
  summary: string;
  openThreads: string[];
  decisions: string[];
  href: string;
}

export interface MeetingPlanningSuggestionsPayload {
  suggestions: MeetingPlanningSuggestion[];
  meetingRecaps: MeetingPlanningRecap[];
  generatedBy: "ai" | "fallback";
  model?: string | null;
  fallbackReason?: string;
}

export function useMeetingPlanningSuggestions(projectId: string) {
  return useQuery({
    queryKey: ["meeting-planning-suggestions", projectId],
    queryFn: () => loadMeetingPlanningSuggestions(projectId),
    enabled: Boolean(projectId),
    staleTime: 60_000,
    retry: false,
  });
}

async function loadMeetingPlanningSuggestions(
  projectId: string,
): Promise<MeetingPlanningSuggestionsPayload> {
  try {
    return await apiFetch<MeetingPlanningSuggestionsPayload>(
      `/api/projects/${projectId}/meetings/prep-suggestions`,
      { method: "POST" },
    );
  } catch {
    return {
      suggestions: [],
      meetingRecaps: [],
      generatedBy: "fallback",
      model: null,
      fallbackReason: "Meeting prep is unavailable. You can still create a blank agenda.",
    };
  }
}
