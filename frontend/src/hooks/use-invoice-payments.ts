"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

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

interface InvoicePaymentsApiResponse<T> {
  data?: T;
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
      const response = await apiFetch<InvoicePaymentsApiResponse<InvoicePayment[]>>(
        `/api/projects/${projectId}/invoicing/payments`,
      );
      return response.data ?? [];
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
    mutationFn: async (input: CreateInvoicePaymentInput) =>
      apiFetch<InvoicePaymentsApiResponse<InvoicePayment>>(
        `/api/projects/${projectId}/invoicing/payments`,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      ),
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
    mutationFn: async ({ paymentId, ...fields }: UpdateInvoicePaymentInput) =>
      apiFetch<InvoicePaymentsApiResponse<InvoicePayment>>(
        `/api/projects/${projectId}/invoicing/payments/${paymentId}`,
        {
          method: "PATCH",
          body: JSON.stringify(fields),
        },
      ),
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
    mutationFn: async (paymentId: number) =>
      apiFetch(
        `/api/projects/${projectId}/invoicing/payments/${paymentId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoicePaymentKeys.lists() });
      toast.success("Payment deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Could not delete payment", { description: error.message });
    },
  });
}
