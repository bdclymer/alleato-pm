"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  commitmentListResponseSchema,
  type CommitmentListItem,
  type CommitmentListResponse,
} from "@/lib/validation/commitments";

// =============================================================================
// Types
// =============================================================================

export interface CommitmentListFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  companyId?: string;
  type?: string;
}

export interface CommitmentInlineUpdateInput {
  id: string;
  field: "number" | "title";
  value: string;
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
        throw new Error(error.error || `Server returned ${response.status} when loading commitments`);
      }
      const data = await response.json();
      const parsed = commitmentListResponseSchema.safeParse(data);
      if (!parsed.success) {
        throw new Error("Commitments data from the server was in an unexpected format — try refreshing the page");
      }
      return parsed.data;
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
          throw new Error("This commitment was not found — it may have been deleted");
        }
        throw new Error(`Server returned ${response.status} when loading commitment details`);
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
        throw new Error(`Server returned ${response.status} when loading change orders`);
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
        throw new Error(`Server returned ${response.status} when loading invoice data`);
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
        throw new Error(errorData.message || `Server returned ${response.status} — the commitment could not be deleted`);
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
      toast.error("Could not delete commitment", { description: error.message });
    },
  });
}

function applyInlineCommitmentUpdate(
  item: CommitmentListItem,
  input: CommitmentInlineUpdateInput,
): CommitmentListItem {
  if (item.id !== input.id) return item;

  if (input.field === "number") {
    return {
      ...item,
      number: input.value,
    };
  }

  return {
    ...item,
    title: input.value,
  };
}

/**
 * Mutation hook for inline editing commitments from list tables.
 * Uses optimistic updates for low-latency UX and invalidates detail/list queries after success.
 */
export function useUpdateCommitmentInline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CommitmentInlineUpdateInput) => {
      const payload =
        input.field === "number"
          ? { number: input.value }
          : { title: input.value };

      const response = await fetch(`/api/commitments/${input.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${response.status} — the commitment could not be updated`);
      }

      return response.json();
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: commitmentKeys.lists() });
      await queryClient.cancelQueries({
        queryKey: commitmentKeys.detail(input.id),
      });

      const previousLists = queryClient.getQueriesData<CommitmentListResponse>({
        queryKey: commitmentKeys.lists(),
      });
      const previousDetail = queryClient.getQueryData(commitmentKeys.detail(input.id));

      for (const [queryKey, data] of previousLists) {
        if (!data?.data) continue;
        queryClient.setQueryData<CommitmentListResponse>(queryKey, {
          ...data,
          data: data.data.map((item) => applyInlineCommitmentUpdate(item, input)),
        });
      }

      queryClient.setQueryData(commitmentKeys.detail(input.id), (current: any) => {
        if (!current || typeof current !== "object") return current;
        return {
          ...current,
          number:
            input.field === "number"
              ? input.value
              : (current as Record<string, unknown>).number,
          title:
            input.field === "title"
              ? input.value
              : (current as Record<string, unknown>).title,
        };
      });

      return { previousLists, previousDetail };
    },
    onError: (_error, input, context) => {
      if (!context) return;

      for (const [queryKey, data] of context.previousLists) {
        queryClient.setQueryData(queryKey, data);
      }

      queryClient.setQueryData(commitmentKeys.detail(input.id), context.previousDetail);
    },
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({
        queryKey: commitmentKeys.detail(input.id),
      });
      queryClient.invalidateQueries({
        queryKey: commitmentKeys.lists(),
      });
      toast.success("Commitment updated");
    },
    onSettled: (_result, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: commitmentKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: commitmentKeys.detail(input.id),
      });
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
        throw new Error(errorData.error || `Server returned ${response.status} — the change order could not be approved`);
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
      toast.error("Could not approve change order", { description: error.message });
    },
  });
}

// =============================================================================
// Legacy Compatibility — useCommitments (dropdown-friendly)
// =============================================================================

export interface CommitmentOption {
  value: string;
  label: string;
  commitmentNumber?: string;
  type?: string;
  amount?: number;
}

/**
 * Drop-in replacement for the old useState-based useCommitments hook.
 * Returns `options` for use in dropdown selects and `isLoading`.
 */
export function useCommitments(projectId?: string) {
  const query = useCommitmentsList(projectId || "", {
    limit: 100,
  });

  const commitments = query.data?.data || [];

  const options: CommitmentOption[] = commitments.map((c: CommitmentListItem) => {
    const typeLabel = c.type === "purchase_order" ? "PO" : "SC";
    const companyName = c.contract_company?.name || "";
    const label = c.number
      ? `${c.number} - ${c.title || companyName || "Untitled"}`
      : `${typeLabel} #${c.id}`;

    return {
      value: c.id,
      label,
      commitmentNumber: c.number || undefined,
      type: c.type || undefined,
      amount: c.revised_contract_amount ?? c.original_amount ?? undefined,
    };
  });

  return {
    commitments,
    options,
    isLoading: query.isLoading,
    error: query.error ?? null,
  };
}
