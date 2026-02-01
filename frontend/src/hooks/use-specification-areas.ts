"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  AreaWithSectionCount,
  SpecificationAreaFormData,
} from "@/types/specifications.types";

/**
 * React Query hook for fetching specification areas
 */
export function useSpecificationAreas(projectId: string) {
  return useQuery<AreaWithSectionCount[]>({
    queryKey: ["specification-areas", projectId],
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/specifications/areas`,
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch areas");
      }

      return response.json();
    },
    enabled: !!projectId,
  });
}

/**
 * React Query hook for fetching a single area
 */
export function useSpecificationArea(projectId: string, areaId: string) {
  return useQuery<AreaWithSectionCount>({
    queryKey: ["specification-area", projectId, areaId],
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/specifications/areas/${areaId}`,
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch area");
      }

      return response.json();
    },
    enabled: !!projectId && !!areaId,
  });
}

/**
 * React Query mutation for creating an area
 */
export function useCreateArea(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SpecificationAreaFormData) => {
      const response = await fetch(
        `/api/projects/${projectId}/specifications/areas`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create area");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["specification-areas", projectId],
      });
      toast.success("Area created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create area", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query mutation for updating an area
 */
export function useUpdateArea(projectId: string, areaId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SpecificationAreaFormData) => {
      const response = await fetch(
        `/api/projects/${projectId}/specifications/areas/${areaId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update area");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["specification-areas", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["specification-area", projectId, areaId],
      });
      toast.success("Area updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update area", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query mutation for deleting an area
 */
export function useDeleteArea(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (areaId: string) => {
      const response = await fetch(
        `/api/projects/${projectId}/specifications/areas/${areaId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete area");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["specification-areas", projectId],
      });
      toast.success("Area deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete area", {
        description: error.message,
      });
    },
  });
}
