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
 * Mutation hook for updating a subcontractor invoice (summary fields).
 */
export function useUpdateSubcontractorInvoice(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      ...fields
    }: { invoiceId: number } & Record<string, unknown>) => {
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update invoice");
      }
      return response.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: subInvoiceKeys.detail(projectId, vars.invoiceId),
      });
      queryClient.invalidateQueries({ queryKey: subInvoiceKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error("Could not update invoice", { description: error.message });
    },
  });
}

/**
 * Mutation hook for changing invoice status (submit, approve, revise, void).
 */
export function useSubcontractorInvoiceStatusChange(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      status,
      notes,
    }: {
      invoiceId: number;
      status: string;
      notes?: string;
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, ...(notes !== undefined && { notes }) }),
        },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update status");
      }
      return response.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: subInvoiceKeys.detail(projectId, vars.invoiceId),
      });
      queryClient.invalidateQueries({ queryKey: subInvoiceKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error("Status update failed", { description: error.message });
    },
  });
}

/**
 * Mutation hook for invoice workflow transitions that use dedicated endpoints
 * (approve-as-noted, pending-owner-approval).
 */
export function useSubcontractorInvoiceTransition(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      action,
    }: {
      invoiceId: number;
      action: "approve-as-noted" | "pending-owner-approval";
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceId}/${action}`,
        { method: "POST" },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update invoice");
      }
      return response.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: subInvoiceKeys.detail(projectId, vars.invoiceId),
      });
      queryClient.invalidateQueries({ queryKey: subInvoiceKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error("Transition failed", { description: error.message });
    },
  });
}

/**
 * Mutation hook for batch-updating line items (SOV edits).
 */
export function useUpdateSubcontractorLineItems(
  projectId: string,
  invoiceId: number,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      updates: Array<{
        id: number;
        work_completed_period: number;
        materials_stored: number;
        retainage_pct: number;
        materials_retainage_pct: number;
      }>,
    ) => {
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceId}/line-items`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates }),
        },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save line items");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: subInvoiceKeys.detail(projectId, invoiceId),
      });
      queryClient.invalidateQueries({ queryKey: subInvoiceKeys.lists() });
      toast.success("SOV updated");
    },
    onError: (error: Error) => {
      toast.error("Could not save line items", {
        description: error.message,
      });
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
