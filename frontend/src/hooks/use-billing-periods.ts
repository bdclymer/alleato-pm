"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

export interface BillingPeriodItem {
  id: string;
  contract_id: string;
  period_number: number;
  start_date: string;
  end_date: string;
  billing_date: string;
  status: string;
  work_completed: number;
  stored_materials: number;
  current_payment_due: number;
  retention_percentage: number;
  retention_amount: number;
  net_payment_due: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBillingPeriodPayload {
  contract_id: string;
  start_date: string;
  end_date: string;
  billing_date: string;
  period_number?: number;
}

// =============================================================================
// Query Keys
// =============================================================================

export const billingPeriodKeys = {
  all: ["billing-periods"] as const,
  lists: () => [...billingPeriodKeys.all, "list"] as const,
  list: (projectId: string) =>
    [...billingPeriodKeys.lists(), projectId] as const,
};

// =============================================================================
// List Query Hook
// =============================================================================

export function useBillingPeriodsList(projectId: string) {
  return useQuery<BillingPeriodItem[]>({
    queryKey: billingPeriodKeys.list(projectId),
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/billing-periods`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      return json.items ?? [];
    },
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}

// =============================================================================
// Create Mutation
// =============================================================================

export function useCreateBillingPeriod(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateBillingPeriodPayload) => {
      const res = await fetch(
        `/api/projects/${projectId}/billing-periods`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: billingPeriodKeys.list(projectId),
      });
      toast.success("Billing period created.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create billing period.");
    },
  });
}
