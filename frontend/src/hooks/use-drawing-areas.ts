"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  DrawingArea,
  DrawingAreaWithCount,
  DrawingAreaFormData,
} from "@/types/drawings.types";

/**
 * React Query hook for fetching drawing areas
 */
export function useDrawingAreas(projectId: string) {
  return useQuery<DrawingAreaWithCount[]>({
    queryKey: ["drawing-areas", projectId],
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/drawings/areas`,
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch drawing areas");
      }

      return response.json();
    },
    enabled: !!projectId,
  });
}

/**
 * React Query hook for fetching a single drawing area
 */
export function useDrawingArea(areaId: string) {
  return useQuery<DrawingArea>({
    queryKey: ["drawing-area", areaId],
    queryFn: async () => {
      const response = await fetch(`/api/drawings/areas/${areaId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch drawing area");
      }

      return response.json();
    },
    enabled: !!areaId,
  });
}

/**
 * React Query mutation for creating a drawing area
 */
export function useCreateDrawingArea(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DrawingAreaFormData) => {
      const response = await fetch(
        `/api/projects/${projectId}/drawings/areas`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create drawing area");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drawing-areas", projectId],
      });
      toast.success("Drawing area created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create drawing area", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query mutation for updating a drawing area
 */
export function useUpdateDrawingArea(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      areaId,
      data,
    }: {
      areaId: string;
      data: Partial<DrawingAreaFormData>;
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/drawings/areas/${areaId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update drawing area");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drawing-areas", projectId],
      });
      toast.success("Drawing area updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update drawing area", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query mutation for deleting a drawing area
 */
export function useDeleteDrawingArea(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (areaId: string) => {
      const response = await fetch(
        `/api/projects/${projectId}/drawings/areas/${areaId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete drawing area");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drawing-areas", projectId],
      });
      toast.success("Drawing area deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete drawing area", {
        description: error.message,
      });
    },
  });
}
