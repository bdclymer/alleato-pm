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

export interface CommitmentListItem {
  id: string;
  project_id: number;
  number: string;
  title: string | null;
  type: string;
  status: string;
  executed: boolean;
  original_amount: number;
  revised_contract_amount: number;
  billed_to_date: number;
  balance_to_finish: number;
  contract_company_id: string | null;
  contract_company: {
    id: string;
    name: string;
    type?: string;
  } | null;
  description: string | null;
  start_date: string | null;
  executed_date: string | null;
  retention_percentage: number | null;
  created_at: string;
  updated_at: string;
  erp_status: string | null;
  ssov_status: string | null;
  approved_change_orders: number;
  pending_change_orders: number;
  draft_change_orders: number;
  invoiced_amount: number;
  payments_issued: number;
  percent_paid: number;
  remaining_balance: number;
  is_private: boolean;
}

export interface CommitmentListResponse {
  data: CommitmentListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CommitmentListFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  companyId?: string;
  type?: string;
}

// =============================================================================
// Query Keys - centralized for cache invalidation
// =============================================================================

export const commitmentKeys = {
  all: ["commitments"] as const,
  lists: () => [...commitmentKeys.all, "list"] as const,
  list: (projectId: string, filters?: CommitmentListFilters) =>
    [...commitmentKeys.lists(), projectId, filters] as const,
  details: () => [...commitmentKeys.all, "detail"] as const,
  detail: (id: string) => [...commitmentKeys.details(), id] as const,
  changeOrders: (commitmentId: string) =>
    [...commitmentKeys.all, "change-orders", commitmentId] as const,
  invoices: (commitmentId: string) =>
    [...commitmentKeys.all, "invoices", commitmentId] as const,
  attachments: (commitmentId: string) =>
    [...commitmentKeys.all, "attachments", commitmentId] as const,
};

// =============================================================================
// List Query Hook
// =============================================================================

/**
 * React Query hook for fetching paginated commitments list.
 *
 * Features:
 * - Automatic caching (stale time: 30s)
 * - Deduplication of concurrent requests
 * - Background refetching
 * - Keeps previous data during page transitions (no loading flash)
 * - Automatic retry on failure
 */
export function useCommitmentsList(
  projectId: string,
  filters?: CommitmentListFilters,
) {
  return useQuery<CommitmentListResponse>({
    queryKey: commitmentKeys.list(projectId, filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("projectId", projectId);
      if (filters?.page) params.set("page", String(filters.page));
      if (filters?.limit) params.set("limit", String(filters.limit));
      if (filters?.status) params.set("status", filters.status);
      if (filters?.search) params.set("search", filters.search);
      if (filters?.companyId) params.set("companyId", filters.companyId);
      if (filters?.type) params.set("type", filters.type);

      const response = await fetch(`/api/commitments?${params}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to fetch commitments");
      }
      return response.json();
    },
    enabled: !!projectId,
    staleTime: 30 * 1000, // 30 seconds - commitments change infrequently
    placeholderData: keepPreviousData, // Keep showing old data while fetching new page
  });
}

// =============================================================================
// Detail Query Hook
// =============================================================================

/**
 * React Query hook for fetching a single commitment detail.
 *
 * Features:
 * - Cached by commitment ID
 * - Deduplication prevents duplicate fetches when multiple components need same data
 * - Stale time of 15 seconds for detail views
 */
export function useCommitmentDetail(commitmentId: string) {
  return useQuery({
    queryKey: commitmentKeys.detail(commitmentId),
    queryFn: async () => {
      const response = await fetch(`/api/commitments/${commitmentId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Commitment not found");
        }
        throw new Error("Failed to fetch commitment details");
      }
      const data = await response.json();
      return data.data || data;
    },
    enabled: !!commitmentId,
    staleTime: 15 * 1000, // 15 seconds
  });
}

// =============================================================================
// Change Orders Query Hook
// =============================================================================

/**
 * React Query hook for fetching change orders for a commitment.
 * Cached and deduplicated - safe to call from multiple components.
 */
export function useCommitmentChangeOrdersQuery(commitmentId: string) {
  return useQuery({
    queryKey: commitmentKeys.changeOrders(commitmentId),
    queryFn: async () => {
      const response = await fetch(
        `/api/commitments/${commitmentId}/change-orders`,
      );
      if (!response.ok) {
        if (response.status === 404) return { data: [], meta: null };
        throw new Error("Failed to fetch change orders");
      }
      return response.json();
    },
    enabled: !!commitmentId,
    staleTime: 30 * 1000,
  });
}

// =============================================================================
// Invoices Query Hook
// =============================================================================

/**
 * React Query hook for fetching invoice data for a commitment.
 */
export function useCommitmentInvoicesQuery(commitmentId: string) {
  return useQuery({
    queryKey: commitmentKeys.invoices(commitmentId),
    queryFn: async () => {
      const response = await fetch(
        `/api/commitments/${commitmentId}/invoices`,
      );
      if (!response.ok) {
        if (response.status === 404) return { summary: null, line_items: [] };
        throw new Error("Failed to fetch invoice data");
      }
      return response.json();
    },
    enabled: !!commitmentId,
    staleTime: 30 * 1000,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Mutation hook for deleting a commitment.
 * Automatically invalidates list cache on success.
 */
export function useDeleteCommitment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commitmentId: string) => {
      const response = await fetch(`/api/commitments/${commitmentId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete commitment");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the list cache to refetch
      queryClient.invalidateQueries({
        queryKey: commitmentKeys.lists(),
      });
      toast.success("Commitment deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Mutation hook for approving a change order.
 * Invalidates both change orders and commitment detail caches.
 */
export function useApproveChangeOrder(commitmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changeOrderId: string) => {
      const response = await fetch(
        `/api/commitments/${commitmentId}/change-orders/${changeOrderId}/approve`,
        { method: "POST" },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to approve change order");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commitmentKeys.changeOrders(commitmentId),
      });
      queryClient.invalidateQueries({
        queryKey: commitmentKeys.detail(commitmentId),
      });
      toast.success("Change order approved");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
