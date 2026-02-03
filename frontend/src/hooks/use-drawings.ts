"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DrawingLogTableRow } from "@/types/drawings.types";
import { mapDrawingLogRow } from "@/types/drawings.types";
import type {
  DrawingFilters,
  DrawingListResponse,
  DrawingWithRevision,
} from "@/services/DrawingService";

// Mapped response type with camelCase drawings
interface MappedDrawingListResponse extends Omit<DrawingListResponse, 'drawings'> {
  drawings: DrawingLogTableRow[];
}

/**
 * React Query hook for fetching drawings list
 */
export function useDrawings(projectId: string, filters?: DrawingFilters) {
  return useQuery<MappedDrawingListResponse>({
    queryKey: ["drawings", projectId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.set("search", filters.search);
      if (filters?.area_id) params.set("area_id", filters.area_id);
      if (filters?.discipline) params.set("discipline", filters.discipline);
      if (filters?.status) params.set("status", filters.status);
      if (filters?.set_id) params.set("set_id", filters.set_id);
      if (filters?.page) params.set("page", filters.page.toString());
      if (filters?.page_size)
        params.set("page_size", filters.page_size.toString());

      const response = await fetch(
        `/api/projects/${projectId}/drawings?${params}`,
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch drawings");
      }

      const data = await response.json();

      // Map snake_case rows to camelCase
      return {
        ...data,
        drawings: data.drawings.map(mapDrawingLogRow),
      };
    },
    enabled: !!projectId,
  });
}

/**
 * React Query hook for fetching a single drawing with revision
 */
export function useDrawing(projectId: string, drawingId: string) {
  return useQuery<DrawingWithRevision>({
    queryKey: ["drawing", projectId, drawingId],
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/drawings/${drawingId}`,
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch drawing");
      }

      return response.json();
    },
    enabled: !!projectId && !!drawingId,
  });
}

/**
 * React Query mutation for creating a drawing with file upload
 */
export function useCreateDrawing(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(
        `/api/projects/${projectId}/drawings`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create drawing");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drawings", projectId],
      });
      toast.success("Drawing created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create drawing", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query mutation for updating a drawing
 */
export function useUpdateDrawing(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      drawingId,
      data,
    }: {
      drawingId: string;
      data: {
        drawing_number?: string;
        title?: string;
        discipline?: string;
        drawing_type?: string;
        area_id?: string;
      };
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/drawings/${drawingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update drawing");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["drawings", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["drawing", projectId, variables.drawingId],
      });
      toast.success("Drawing updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update drawing", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query mutation for deleting a drawing
 */
export function useDeleteDrawing(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (drawingId: string) => {
      const response = await fetch(
        `/api/projects/${projectId}/drawings/${drawingId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete drawing");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drawings", projectId],
      });
      toast.success("Drawing deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete drawing", {
        description: error.message,
      });
    },
  });
}
