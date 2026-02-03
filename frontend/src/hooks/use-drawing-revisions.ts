"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DrawingRevision } from "@/types/drawings.types";

/**
 * React Query hook for fetching drawing revisions
 */
export function useDrawingRevisions(drawingId: string) {
  return useQuery<DrawingRevision[]>({
    queryKey: ["drawing-revisions", drawingId],
    queryFn: async () => {
      const response = await fetch(
        `/api/drawings/${drawingId}/revisions`,
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch revisions");
      }

      return response.json();
    },
    enabled: !!drawingId,
  });
}

/**
 * React Query mutation for creating a new revision with file upload
 */
export function useCreateRevision(projectId: string, drawingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(
        `/api/projects/${projectId}/drawings/${drawingId}/revisions`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create revision");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drawing-revisions", drawingId],
      });
      queryClient.invalidateQueries({
        queryKey: ["drawing", projectId, drawingId],
      });
      queryClient.invalidateQueries({
        queryKey: ["drawings", projectId],
      });
      toast.success("Revision created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create revision", {
        description: error.message,
      });
    },
  });
}
