"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  SpecificationWithRevision,
  SpecificationWithAreas,
  SpecificationFilters,
  SpecificationListResponse,
} from "@/types/specifications.types";
import type {
  UploadSpecificationFormData,
  EditSpecificationFormData,
} from "@/lib/schemas/specification-schemas";

/**
 * React Query hook for fetching specifications list
 */
export function useSpecifications(
  projectId: string,
  filters?: SpecificationFilters,
) {
  return useQuery<SpecificationListResponse>({
    queryKey: ["specifications", projectId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.set("search", filters.search);
      if (filters?.area_id) params.set("area_id", filters.area_id.toString());
      if (filters?.status) params.set("status", filters.status);
      if (filters?.uploaded_after)
        params.set("uploaded_after", filters.uploaded_after);
      if (filters?.uploaded_before)
        params.set("uploaded_before", filters.uploaded_before);
      if (filters?.page) params.set("page", filters.page.toString());
      if (filters?.page_size)
        params.set("page_size", filters.page_size.toString());

      const response = await fetch(
        `/api/projects/${projectId}/specifications?${params}`,
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch specifications");
      }

      return response.json();
    },
    enabled: !!projectId,
  });
}

/**
 * React Query hook for fetching a single specification
 */
export function useSpecification(projectId: string, sectionId: string) {
  return useQuery<SpecificationWithAreas>({
    queryKey: ["specification", projectId, sectionId],
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/specifications/${sectionId}`,
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch specification");
      }

      return response.json();
    },
    enabled: !!projectId && !!sectionId,
  });
}

/**
 * React Query mutation for creating a specification
 */
export function useCreateSpecification(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UploadSpecificationFormData) => {
      const formData = new FormData();
      formData.append("section_number", data.section_number);
      formData.append("title", data.title);
      if (data.description) formData.append("description", data.description);
      formData.append("file", data.file);
      if (data.notes) formData.append("notes", data.notes);
      if (data.area_ids)
        formData.append("area_ids", JSON.stringify(data.area_ids));
      if (data.subscriber_ids)
        formData.append("subscriber_ids", JSON.stringify(data.subscriber_ids));

      const response = await fetch(
        `/api/projects/${projectId}/specifications`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create specification");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["specifications", projectId],
      });
      toast.success("Specification created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create specification", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query mutation for updating a specification
 */
export function useUpdateSpecification(projectId: string, sectionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EditSpecificationFormData) => {
      const response = await fetch(
        `/api/projects/${projectId}/specifications/${sectionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update specification");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["specifications", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["specification", projectId, sectionId],
      });
      toast.success("Specification updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update specification", {
        description: error.message,
      });
    },
  });
}

/**
 * React Query mutation for deleting a specification
 */
export function useDeleteSpecification(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sectionId: string) => {
      const response = await fetch(
        `/api/projects/${projectId}/specifications/${sectionId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete specification");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["specifications", projectId],
      });
      toast.success("Specification deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete specification", {
        description: error.message,
      });
    },
  });
}
