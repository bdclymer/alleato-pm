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

export interface Meeting {
  id: string;
  title: string | null;
  date: string | null;
  duration_minutes: number | null;
  participants: string | null;
  participants_array: string[] | null;
  category: string | null;
  description: string | null;
  content: string | null;
  summary: string | null;
  status: string | null;
  access_level: string | null;
  type: string | null;
  project: string | null;
  project_id: number | null;
  source: string | null;
  url: string | null;
  fireflies_link: string | null;
  created_at: string | null;
}

export interface CreateMeetingInput {
  title: string;
  date?: string | null;
  duration_minutes?: number | null;
  participants?: string | null;
  category?: string | null;
  description?: string | null;
  access_level?: string | null;
  status?: string | null;
}

export interface UpdateMeetingInput {
  title?: string;
  date?: string | null;
  duration_minutes?: number | null;
  participants?: string | null;
  category?: string | null;
  description?: string | null;
  summary?: string | null;
  access_level?: string | null;
  status?: string | null;
}

// =============================================================================
// Query Keys
// =============================================================================

export const meetingKeys = {
  all: ["meetings"] as const,
  lists: () => [...meetingKeys.all, "list"] as const,
  list: (projectId: string) => [...meetingKeys.lists(), projectId] as const,
  details: () => [...meetingKeys.all, "detail"] as const,
  detail: (meetingId: string) => [...meetingKeys.details(), meetingId] as const,
};

// =============================================================================
// List Query Hook
// =============================================================================

export function useMeetings(projectId: string) {
  return useQuery<{ data: Meeting[] }>({
    queryKey: meetingKeys.list(projectId),
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/meetings`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to fetch meetings");
      }
      return response.json();
    },
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}

// =============================================================================
// Detail Query Hook
// =============================================================================

export function useMeeting(projectId: string, meetingId: string) {
  return useQuery<{ data: Meeting }>({
    queryKey: meetingKeys.detail(meetingId),
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/meetings/${meetingId}`
      );
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Meeting not found");
        }
        throw new Error("Failed to fetch meeting details");
      }
      return response.json();
    },
    enabled: !!projectId && !!meetingId,
    staleTime: 15 * 1000,
  });
}

// =============================================================================
// Create Mutation
// =============================================================================

export function useCreateMeeting(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMeetingInput) => {
      const response = await fetch(`/api/projects/${projectId}/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to create meeting");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: meetingKeys.list(projectId),
      });
      toast.success("Meeting created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// =============================================================================
// Update Mutation
// =============================================================================

export function useUpdateMeeting(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      meetingId,
      data,
    }: {
      meetingId: string;
      data: UpdateMeetingInput;
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/meetings/${meetingId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to update meeting");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: meetingKeys.list(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: meetingKeys.detail(variables.meetingId),
      });
      toast.success("Meeting updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// =============================================================================
// Delete Mutation
// =============================================================================

export function useDeleteMeeting(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meetingId: string) => {
      const response = await fetch(
        `/api/projects/${projectId}/meetings/${meetingId}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to delete meeting");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: meetingKeys.list(projectId),
      });
      toast.success("Meeting deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
