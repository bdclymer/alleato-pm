"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

export interface BillingPeriod {
  id: string;
  project_id: number | null;
  name: string | null;
  start_date: string;
  end_date: string;
  due_date: string | null;
  is_closed: boolean | null;
  period_number: number;
  closed_by: string | null;
  closed_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface BillingPeriodListFilters {
  is_closed?: boolean;
}

export interface CreateBillingPeriodInput {
  start_date: string;
  end_date: string;
  name?: string;
  due_date?: string;
}

export interface UpdateBillingPeriodInput {
  periodId: string;
  name?: string;
  start_date?: string;
  end_date?: string;
  due_date?: string;
  is_closed?: boolean;
}

// =============================================================================
// Query Keys
// =============================================================================

export const billingPeriodKeys = {
  all: ["billing-periods"] as const,
  lists: () => [...billingPeriodKeys.all, "list"] as const,
  list: (projectId: string, filters?: BillingPeriodListFilters) =>
    [...billingPeriodKeys.lists(), projectId, filters] as const,
  detail: (id: string) => [...billingPeriodKeys.all, "detail", id] as const,
};

// =============================================================================
// List Query Hook
// =============================================================================

/**
 * React Query hook for fetching billing periods for a project.
 *
 * Features:
 * - Automatic caching (stale time: 30s)
 * - Deduplication of concurrent requests
 * - Background refetching
 * - Keeps previous data during filter transitions
 * - Optional is_closed filter
 */
export function useBillingPeriodsList(
  projectId: string,
  filters?: BillingPeriodListFilters,
) {
  return useQuery<BillingPeriod[]>({
    queryKey: billingPeriodKeys.list(projectId, filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.is_closed !== undefined) {
        params.set("is_closed", String(filters.is_closed));
      }
      const qs = params.toString();
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/billing-periods${qs ? `?${qs}` : ""}`,
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.error || `Server returned ${response.status} when loading billing periods`,
        );
      }
      const data = await response.json();
      return data.data ?? [];
    },
    enabled: !!projectId,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Mutation hook for creating a billing period.
 * Automatically invalidates list cache on success.
 */
export function useCreateBillingPeriod(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBillingPeriodInput) => {
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/billing-periods`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Server returned ${response.status} — the billing period could not be created`,
        );
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingPeriodKeys.lists() });
      toast.success("Billing period created successfully");
    },
    onError: (error: Error) => {
      toast.error("Could not create billing period", { description: error.message });
    },
  });
}

/**
 * Mutation hook for updating a billing period.
 * Automatically invalidates list and detail caches on success.
 */
export function useUpdateBillingPeriod(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ periodId, ...fields }: UpdateBillingPeriodInput) => {
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/billing-periods/${periodId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Server returned ${response.status} — the billing period could not be updated`,
        );
      }
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: billingPeriodKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: billingPeriodKeys.detail(variables.periodId),
      });
      toast.success("Billing period updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Could not update billing period", { description: error.message });
    },
  });
}

/**
 * Mutation hook for deleting a billing period.
 * Returns 409 if any invoices reference the period.
 * Automatically invalidates list cache on success.
 */
export function useDeleteBillingPeriod(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (periodId: string) => {
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/billing-periods/${periodId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || errorData.error || `Server returned ${response.status} — the billing period could not be deleted`,
        );
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingPeriodKeys.lists() });
      toast.success("Billing period deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Could not delete billing period", { description: error.message });
    },
  });
}
