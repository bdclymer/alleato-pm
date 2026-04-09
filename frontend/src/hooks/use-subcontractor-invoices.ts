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

export interface SubcontractorInvoiceListFilters {
  billing_period_id?: string;
  subcontract_id?: string;
  purchase_order_id?: string;
  status?: string;
}

export interface CreateSubcontractorInvoiceInput {
  subcontract_id?: string;
  purchase_order_id?: string;
  billing_period_id?: string;
  invoice_number?: string;
  period_start?: string;
  period_end?: string;
  billing_date?: string;
  notes?: string;
}

// =============================================================================
// Query Keys
// =============================================================================

export const subInvoiceKeys = {
  all: ["subcontractor-invoices"] as const,
  lists: () => [...subInvoiceKeys.all, "list"] as const,
  list: (projectId: string, filters?: SubcontractorInvoiceListFilters) =>
    [...subInvoiceKeys.lists(), projectId, filters] as const,
  detail: (projectId: string, invoiceId: number) =>
    [...subInvoiceKeys.all, "detail", projectId, invoiceId] as const,
};

// =============================================================================
// List Query Hook
// =============================================================================

/**
 * React Query hook for fetching subcontractor invoices for a project.
 *
 * Features:
 * - Automatic caching (stale time: 30s)
 * - Deduplication of concurrent requests
 * - Background refetching
 * - Keeps previous data during filter transitions
 */
export function useSubcontractorInvoicesList(
  projectId: string,
  filters?: SubcontractorInvoiceListFilters,
) {
  return useQuery({
    queryKey: subInvoiceKeys.list(projectId, filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.billing_period_id) params.set("billing_period_id", filters.billing_period_id);
      if (filters?.subcontract_id) params.set("subcontract_id", filters.subcontract_id);
      if (filters?.purchase_order_id) params.set("purchase_order_id", filters.purchase_order_id);
      if (filters?.status) params.set("status", filters.status);
      const qs = params.toString();
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/subcontractor/invoices${qs ? `?${qs}` : ""}`,
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Server returned ${response.status} when loading subcontractor invoices`);
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
// Detail Query Hook
// =============================================================================

/**
 * React Query hook for fetching a single subcontractor invoice with line items.
 */
export function useSubcontractorInvoiceDetail(
  projectId: string,
  invoiceId: number | null | undefined,
) {
  return useQuery({
    queryKey: subInvoiceKeys.detail(projectId, invoiceId ?? 0),
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceId}`,
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Server returned ${response.status} when loading invoice`);
      }
      const data = await response.json();
      return data.data ?? null;
    },
    enabled: !!projectId && !!invoiceId,
    staleTime: 30 * 1000,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Mutation hook for creating a subcontractor invoice.
 * Automatically invalidates list cache on success.
 */
export function useCreateSubcontractorInvoice(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSubcontractorInvoiceInput) => {
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/subcontractor/invoices`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${response.status} — the invoice could not be created`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subInvoiceKeys.lists() });
      toast.success("Subcontractor invoice created");
    },
    onError: (error: Error) => {
      toast.error("Could not create invoice", { description: error.message });
    },
  });
}

/**
 * Mutation hook for deleting a subcontractor invoice.
 * Automatically invalidates list cache on success.
 */
export function useDeleteSubcontractorInvoice(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server returned ${response.status} — the invoice could not be deleted`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subInvoiceKeys.lists() });
      toast.success("Invoice deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Could not delete invoice", { description: error.message });
    },
  });
}
