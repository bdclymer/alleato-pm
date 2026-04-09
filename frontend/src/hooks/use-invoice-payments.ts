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

export type PaymentMethod =
  | "check"
  | "credit_card"
  | "electronic"
  | "wire"
  | "ach"
  | "other";

export interface InvoicePayment {
  id: number;
  project_id: number;
  owner_invoice_id: number | null;
  subcontractor_invoice_id: number | null;
  payment_number: string | null;
  payment_method: PaymentMethod | string | null;
  amount: number;
  payment_date: string | null;
  check_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Enriched fields from API join
  invoice_type: "owner" | "subcontractor" | null;
  invoice_number: string | null;
}

export interface CreateInvoicePaymentInput {
  owner_invoice_id?: number | null;
  subcontractor_invoice_id?: number | null;
  payment_number?: string;
  payment_method: PaymentMethod;
  amount: number;
  payment_date: string;
  check_number?: string;
  notes?: string;
}

export interface UpdateInvoicePaymentInput {
  paymentId: number;
  payment_number?: string | null;
  payment_method?: PaymentMethod;
  amount?: number;
  payment_date?: string;
  check_number?: string | null;
  notes?: string | null;
}

// =============================================================================
// Query Keys
// =============================================================================

export const invoicePaymentKeys = {
  all: ["invoice-payments"] as const,
  lists: () => [...invoicePaymentKeys.all, "list"] as const,
  list: (projectId: string) => [...invoicePaymentKeys.lists(), projectId] as const,
  detail: (id: number) => [...invoicePaymentKeys.all, "detail", id] as const,
};

// =============================================================================
// Queries
// =============================================================================

export function useInvoicePaymentsList(projectId: string) {
  return useQuery<InvoicePayment[]>({
    queryKey: invoicePaymentKeys.list(projectId),
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/payments`,
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          err.error || `Server returned ${response.status} when loading payments`,
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
// Mutations
// =============================================================================

export function useCreateInvoicePayment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInvoicePaymentInput) => {
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          err.error || `Server returned ${response.status} — the payment could not be created`,
        );
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoicePaymentKeys.lists() });
      toast.success("Payment recorded successfully");
    },
    onError: (error: Error) => {
      toast.error("Could not record payment", { description: error.message });
    },
  });
}

export function useUpdateInvoicePayment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId, ...fields }: UpdateInvoicePaymentInput) => {
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/payments/${paymentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        },
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          err.error || `Server returned ${response.status} — the payment could not be updated`,
        );
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoicePaymentKeys.lists() });
      toast.success("Payment updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Could not update payment", { description: error.message });
    },
  });
}

export function useDeleteInvoicePayment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: number) => {
      const response = await fetch(
        `/api/projects/${projectId}/invoicing/payments/${paymentId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          err.error || `Server returned ${response.status} — the payment could not be deleted`,
        );
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoicePaymentKeys.lists() });
      toast.success("Payment deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Could not delete payment", { description: error.message });
    },
  });
}
