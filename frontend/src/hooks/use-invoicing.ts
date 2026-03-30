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
  billing_period_id?: string;
  prime_contract_id?: string;
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
      const params = new URLSearchParams();
      if (filters?.billing_period_id) params.set("billing_period_id", filters.billing_period_id);
      if (filters?.prime_contract_id) params.set("prime_contract_id", filters.prime_contract_id);
      const qs = params.toString();
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/owner${qs ? `?${qs}` : ""}`,
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Server returned ${response.status} when loading invoices`);
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
        throw new Error(errorData.message || `Server returned ${response.status} — the invoice could not be deleted`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      toast.success("Invoice deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Could not delete invoice", { description: error.message });
    },
  });
}
