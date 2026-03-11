"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type {
  EstimateCreate,
  EstimateLineItem,
  EstimateListParams,
  EstimateRow,
  EstimateUpdate,
  EstimateWithLineItems,
} from "@/lib/schemas/estimates";

// =============================================================================
// List Response Types
// =============================================================================

interface EstimateListResponse {
  data: EstimateRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Fetch paginated list of estimates with optional filters
 */
export function useEstimates(
  projectId: number,
  params?: Partial<EstimateListParams>,
) {
  const searchParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.set(key, String(value));
      }
    });
  }

  const queryString = searchParams.toString();
  const url = `/api/projects/${projectId}/estimates${queryString ? `?${queryString}` : ""}`;

  return useQuery<EstimateListResponse>({
    queryKey: ["estimates", projectId, params],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch estimates");
      }
      return res.json();
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch a single estimate by ID with full details (line items, alternates, allowances)
 */
export function useEstimate(projectId: number, estimateId: number) {
  return useQuery<EstimateWithLineItems>({
    queryKey: ["estimate", estimateId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/estimates/${estimateId}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch estimate");
      }
      return res.json();
    },
    enabled: !!projectId && !!estimateId,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Create a new estimate
 */
export function useCreateEstimate(projectId: number) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: EstimateCreate) => {
      const res = await fetch(`/api/projects/${projectId}/estimates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create estimate");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["estimates", projectId],
      });
      router.refresh();
      toast.success("Estimate created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create estimate: ${error.message}`);
    },
  });
}

/**
 * Update an existing estimate (uses PUT)
 */
export function useUpdateEstimate(projectId: number) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({
      estimateId,
      data,
    }: {
      estimateId: number;
      data: Omit<EstimateUpdate, "estimate_id">;
    }) => {
      const res = await fetch(
        `/api/projects/${projectId}/estimates/${estimateId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update estimate");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["estimates", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["estimate", variables.estimateId],
      });
      router.refresh();
      toast.success("Estimate updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update estimate: ${error.message}`);
    },
  });
}

/**
 * Delete an estimate
 */
export function useDeleteEstimate(projectId: number) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (estimateId: number) => {
      const res = await fetch(
        `/api/projects/${projectId}/estimates/${estimateId}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete estimate");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["estimates", projectId],
      });
      router.refresh();
      toast.success("Estimate deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete estimate: ${error.message}`);
    },
  });
}

// =============================================================================
// Line Item Mutation Hooks
// =============================================================================

/**
 * Add a line item to an estimate
 */
export function useAddLineItem(projectId: number, estimateId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EstimateLineItem) => {
      const res = await fetch(
        `/api/projects/${projectId}/estimates/${estimateId}/line-items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add line item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["estimate", estimateId],
      });
      toast.success("Line item added successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add line item: ${error.message}`);
    },
  });
}

/**
 * Update an existing line item on an estimate
 */
export function useUpdateLineItem(projectId: number, estimateId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lineItemId,
      data,
    }: {
      lineItemId: number;
      data: Partial<EstimateLineItem>;
    }) => {
      const res = await fetch(
        `/api/projects/${projectId}/estimates/${estimateId}/line-items/${lineItemId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update line item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["estimate", estimateId],
      });
      toast.success("Line item updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update line item: ${error.message}`);
    },
  });
}

/**
 * Delete a line item from an estimate
 */
export function useDeleteLineItem(projectId: number, estimateId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lineItemId: number) => {
      const res = await fetch(
        `/api/projects/${projectId}/estimates/${estimateId}/line-items/${lineItemId}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete line item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["estimate", estimateId],
      });
      toast.success("Line item deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete line item: ${error.message}`);
    },
  });
}
