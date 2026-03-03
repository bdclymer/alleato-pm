"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { OwnerInvoice } from "@/features/invoicing/invoicing-table-config";

// =============================================================================
// Types
// =============================================================================

export interface InvoiceListFilters {
  status?: string;
  search?: string;
}

// =============================================================================
// Query Keys
// =============================================================================

export const invoiceKeys = {
  all: ["invoices"] as const,
  lists: () => [...invoiceKeys.all, "list"] as const,
  list: (projectId: string, filters?: InvoiceListFilters) =>
    [...invoiceKeys.lists(), projectId, filters] as const,
  detail: (id: number) => [...invoiceKeys.all, "detail", id] as const,
};

// =============================================================================
// List Query Hook
// =============================================================================

/**
 * React Query hook for fetching owner invoices for a project.
 *
 * Features:
 * - Automatic caching (stale time: 30s)
 * - Deduplication of concurrent requests
 * - Background refetching
 * - Keeps previous data during filter transitions
 */
export function useOwnerInvoicesList(
  projectId: string,
  filters?: InvoiceListFilters,
) {
  return useQuery<OwnerInvoice[]>({
    queryKey: invoiceKeys.list(projectId, filters),
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/owner`,
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to fetch owner invoices");
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
 * Mutation hook for deleting an owner invoice.
 * Automatically invalidates list cache on success.
 */
export function useDeleteOwnerInvoice(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/owner/${invoiceId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete invoice");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      toast.success("Invoice deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
