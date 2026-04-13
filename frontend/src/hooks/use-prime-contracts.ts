"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type { CreateContractInput, UpdateContractInput } from "@/app/api/projects/[projectId]/contracts/validation";

// =============================================================================
// Types
// =============================================================================

export interface PrimeContract {
  id: string;
  project_id: number;
  contract_number: string;
  title: string;
  client_id: string | null;
  vendor_id: string | null;
  contractor_id: string | null;
  architect_engineer_id: string | null;
  description: string | null;
  status: string;
  executed: boolean;
  executed_at: string | null;
  original_contract_value: number;
  revised_contract_value: number;
  start_date: string | null;
  end_date: string | null;
  substantial_completion_date: string | null;
  actual_completion_date: string | null;
  signed_contract_received_date: string | null;
  contract_termination_date: string | null;
  retention_percentage: number | null;
  is_private: boolean;
  inclusions: string | null;
  exclusions: string | null;
  created_at: string;
  updated_at: string;
}

interface PrimeContractListResponse {
  data: PrimeContract[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

// =============================================================================
// Query Keys
// =============================================================================

export const primeContractKeys = {
  all: (projectId: number) => ["prime-contracts", projectId] as const,
  list: (projectId: number, params?: Record<string, unknown>) =>
    [...primeContractKeys.all(projectId), "list", params] as const,
  detail: (projectId: number, contractId: string) =>
    [...primeContractKeys.all(projectId), contractId] as const,
};

// =============================================================================
// List Hook
// =============================================================================

export function usePrimeContracts(
  projectId: number,
  params?: { status?: string; search?: string },
) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);

  const queryString = searchParams.toString();
  const url = `/api/projects/${projectId}/contracts${queryString ? `?${queryString}` : ""}`;

  return useQuery<PrimeContractListResponse>({
    queryKey: primeContractKeys.list(projectId, params),
    queryFn: () => apiFetch<PrimeContractListResponse>(url),
    enabled: !!projectId,
  });
}

// =============================================================================
// Detail Hook
// =============================================================================

export function usePrimeContract(projectId: number, contractId: string) {
  return useQuery<PrimeContract>({
    queryKey: primeContractKeys.detail(projectId, contractId),
    queryFn: () =>
      apiFetch<PrimeContract>(`/api/projects/${projectId}/contracts/${contractId}`),
    enabled: !!projectId && !!contractId,
  });
}

// =============================================================================
// Create Hook
// =============================================================================

export function useCreatePrimeContract(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation<PrimeContract, Error, CreateContractInput>({
    mutationFn: (data) =>
      apiFetch<PrimeContract>(`/api/projects/${projectId}/contracts`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (contract) => {
      queryClient.invalidateQueries({
        queryKey: primeContractKeys.all(projectId),
      });
      toast.success(`Contract "${contract.title}" created`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create contract");
    },
  });
}

// =============================================================================
// Update Hook
// =============================================================================

export function useUpdatePrimeContract(projectId: number, contractId: string) {
  const queryClient = useQueryClient();

  return useMutation<PrimeContract, Error, UpdateContractInput>({
    mutationFn: (data) =>
      apiFetch<PrimeContract>(
        `/api/projects/${projectId}/contracts/${contractId}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      ),
    onSuccess: (contract) => {
      queryClient.invalidateQueries({
        queryKey: primeContractKeys.all(projectId),
      });
      queryClient.setQueryData(
        primeContractKeys.detail(projectId, contractId),
        contract,
      );
      toast.success("Contract updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update contract");
    },
  });
}

// =============================================================================
// Delete Hook
// =============================================================================

export function useDeletePrimeContract(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (contractId) =>
      apiFetch<void>(
        `/api/projects/${projectId}/contracts/${contractId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: primeContractKeys.all(projectId),
      });
      toast.success("Contract deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete contract");
    },
  });
}
