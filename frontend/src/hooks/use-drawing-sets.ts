"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DrawingSet } from "@/types/drawings.types";

/**
 * React Query hook for fetching drawing sets
 */
export function useDrawingSets(projectId: string) {
  return useQuery<DrawingSet[]>({
    queryKey: ["drawing-sets", projectId],
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/drawings/sets`,
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Server returned ${response.status} when loading drawing sets`);
      }

      return response.json();
    },
    enabled: !!projectId,
  });
}

/**
 * React Query mutation for creating a drawing set
 */
export function useCreateDrawingSet(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      issued_at?: string;
      description?: string;
      status?: string;
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/drawings/sets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Server returned ${response.status} — the drawing set could not be created`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drawing-sets", projectId],
      });
      toast.success("Drawing set created successfully");
    },
    onError: (error: Error) => {
      toast.error("Could not create drawing set", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query mutation for updating a drawing set
 */
export function useUpdateDrawingSet(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      setId,
      data,
    }: {
      setId: string;
      data: {
        name?: string;
        issued_at?: string;
        description?: string;
        status?: string;
      };
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/drawings/sets/${setId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Server returned ${response.status} — the drawing set could not be updated`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drawing-sets", projectId],
      });
      toast.success("Drawing set updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Could not update drawing set", {
        description: error.message,
      });
    },
  });
}
