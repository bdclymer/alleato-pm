"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

export interface MeetingPrep {
  id: string;
  meeting_id: string;
  project_id: number | null;
  content: string;
  generated_by: string;
  model_used: string | null;
  generation_time_ms: number | null;
  version: number;
  created_at: string | null;
  updated_at: string | null;
}

// =============================================================================
// Query Keys
// =============================================================================

export const meetingPrepKeys = {
  all: ["meeting-preps"] as const,
  detail: (meetingId: string) => [...meetingPrepKeys.all, meetingId] as const,
};

// =============================================================================
// Get Meeting Prep
// =============================================================================

export function useMeetingPrep(projectId: string, meetingId: string) {
  return useQuery<{ data: MeetingPrep | null }>({
    queryKey: meetingPrepKeys.detail(meetingId),
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/meetings/${meetingId}/prep`
      );
      if (response.status === 404) {
        return { data: null };
      }
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to fetch meeting prep");
      }
      return response.json();
    },
    enabled: !!projectId && !!meetingId,
    staleTime: 30 * 1000,
  });
}

// =============================================================================
// Save Meeting Prep (auto-save from editor)
// =============================================================================

export function useSaveMeetingPrep(projectId: string, meetingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(
        `/api/projects/${projectId}/meetings/${meetingId}/prep`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to save meeting prep");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: meetingPrepKeys.detail(meetingId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// =============================================================================
// Generate Meeting Prep (AI)
// =============================================================================

export function useGenerateMeetingPrep(projectId: string, meetingId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ data: MeetingPrep }>({
    mutationFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/meetings/${meetingId}/prep/generate`,
        { method: "POST" }
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to generate meeting prep");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: meetingPrepKeys.detail(meetingId),
      });
      toast.success("Meeting prep generated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
