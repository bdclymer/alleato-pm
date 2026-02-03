"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateSubcontractInput } from "@/lib/schemas/create-subcontract-schema";

interface SubcontractPayload {
  projectId: number;
  data: CreateSubcontractInput;
}

interface ApiError {
  error: string;
  details?: unknown;
}

interface SubcontractResponse {
  data: Record<string, unknown>;
  message: string;
}

/**
 * Maps form values to the API payload format.
 * This is the typed mapping layer that prevents schema mismatches.
 */
function mapFormToPayload(
  data: CreateSubcontractInput,
): Record<string, unknown> {
  return {
    contractNumber: data.contractNumber?.trim() || "",
    // contractCompanyId is already a UUID from EntitySelect
    contractCompanyId: data.contractCompanyId || null,
    title: data.title || null,
    status: data.status || "Draft",
    executed: data.executed ?? false,
    defaultRetainagePercent: data.defaultRetainagePercent ?? null,
    description: data.description || null,
    inclusions: data.inclusions || null,
    exclusions: data.exclusions || null,
    dates: data.dates,
    privacy: data.privacy,
    accountingMethod: data.accountingMethod || "amount_based",
    sov: data.sov || [],
    invoiceContactIds: data.invoiceContactIds || [],
  };
}

async function createSubcontract({
  projectId,
  data,
}: SubcontractPayload): Promise<SubcontractResponse> {
  const payload = mapFormToPayload(data);

  const response = await fetch(`/api/projects/${projectId}/subcontracts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    const apiError = result as ApiError;
    const error = new Error(apiError.error || "Failed to create subcontract");
    (error as Error & { details?: unknown }).details = apiError.details;
    throw error;
  }

  return result as SubcontractResponse;
}

/**
 * TanStack Query mutation hook for creating subcontracts.
 *
 * Provides:
 * - Loading state via `isPending`
 * - Error handling with field-level details
 * - Automatic cache invalidation
 * - Success/error callbacks
 *
 * @example
 * const { mutate, isPending, error } = useCreateSubcontract(projectId, {
 *   onSuccess: () => router.push(`/${projectId}/commitments`),
 * });
 *
 * // In form submit:
 * mutate(formData);
 */
export function useCreateSubcontract(
  projectId: number,
  options?: {
    onSuccess?: (data: SubcontractResponse) => void;
    onError?: (error: Error & { details?: unknown }) => void;
  },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSubcontractInput) =>
      createSubcontract({ projectId, data }),
    onSuccess: (data) => {
      // Invalidate relevant queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["subcontracts", projectId] });
      queryClient.invalidateQueries({ queryKey: ["commitments", projectId] });
      options?.onSuccess?.(data);
    },
    onError: (error: Error & { details?: unknown }) => {
      options?.onError?.(error);
    },
  });
}
