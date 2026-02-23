"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  DirectCostWithLineItems,
  DirectCostCreate,
  DirectCostUpdate,
  DirectCostListParams,
  DirectCostSummary,
  DirectCostSummaryByCostCode,
  DirectCostExport,
  DirectCostBulkStatusUpdate,
  DirectCostBulkDelete,
} from "@/lib/schemas/direct-costs";

// =============================================================================
// List Response Types
// =============================================================================

interface DirectCostListResponse {
  data: DirectCostWithLineItems[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary?: DirectCostSummary;
}

interface BulkOperationResult {
  operation: string;
  total: number;
  success_count: number;
  failed_count: number;
  success: string[];
  failed: { id: string; error: string }[];
}

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Fetch paginated list of direct costs with optional filters
 */
export function useDirectCosts(
  projectId: number,
  params?: Partial<DirectCostListParams>,
) {
  const searchParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        if (value instanceof Date) {
          searchParams.set(key, value.toISOString());
        } else {
          searchParams.set(key, String(value));
        }
      }
    });
  }

  const queryString = searchParams.toString();
  const url = `/api/projects/${projectId}/direct-costs${queryString ? `?${queryString}` : ""}`;

  return useQuery<DirectCostListResponse>({
    queryKey: ["direct-costs", projectId, params],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch direct costs");
      }
      return res.json();
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch a single direct cost by ID with full details
 */
export function useDirectCost(projectId: number, costId: string) {
  return useQuery<DirectCostWithLineItems>({
    queryKey: ["direct-cost", costId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/direct-costs/${costId}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch direct cost");
      }
      return res.json();
    },
    enabled: !!projectId && !!costId,
  });
}

/**
 * Fetch direct cost summary by cost code
 */
export function useDirectCostSummaryByCostCode(projectId: number) {
  return useQuery<DirectCostSummaryByCostCode[]>({
    queryKey: ["direct-costs-summary-by-cost-code", projectId],
    queryFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/direct-costs?view=summary-by-cost-code`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.error || "Failed to fetch direct cost summary by cost code",
        );
      }
      return res.json();
    },
    enabled: !!projectId,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Create a new direct cost with line items
 */
export function useCreateDirectCost(projectId: number) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: DirectCostCreate) => {
      const res = await fetch(`/api/projects/${projectId}/direct-costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create direct cost");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["direct-costs", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["direct-costs-summary-by-cost-code", projectId],
      });
      router.refresh();
      toast.success("Direct cost created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create direct cost: ${error.message}`);
    },
  });
}

/**
 * Update an existing direct cost (uses PUT)
 */
export function useUpdateDirectCost(projectId: number) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({
      costId,
      data,
    }: {
      costId: string;
      data: Omit<DirectCostUpdate, "id">;
    }) => {
      const res = await fetch(
        `/api/projects/${projectId}/direct-costs/${costId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update direct cost");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["direct-costs", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["direct-cost", variables.costId],
      });
      queryClient.invalidateQueries({
        queryKey: ["direct-costs-summary-by-cost-code", projectId],
      });
      router.refresh();
      toast.success("Direct cost updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update direct cost: ${error.message}`);
    },
  });
}

/**
 * Delete a direct cost
 */
export function useDeleteDirectCost(projectId: number) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (costId: string) => {
      const res = await fetch(
        `/api/projects/${projectId}/direct-costs/${costId}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete direct cost");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["direct-costs", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["direct-costs-summary-by-cost-code", projectId],
      });
      router.refresh();
      toast.success("Direct cost deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete direct cost: ${error.message}`);
    },
  });
}

/**
 * Bulk status update for multiple direct costs
 */
export function useBulkDirectCostStatusUpdate(projectId: number) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<BulkOperationResult, Error, Omit<DirectCostBulkStatusUpdate, "ids"> & { ids: string[] }>({
    mutationFn: async (data) => {
      const res = await fetch(`/api/projects/${projectId}/direct-costs/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, operation: "status-update" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Bulk status update failed");
      }
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["direct-costs", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["direct-costs-summary-by-cost-code", projectId],
      });
      router.refresh();
      if (result.failed_count > 0) {
        toast.warning(
          `Updated ${result.success_count} of ${result.total} direct costs. ${result.failed_count} failed.`,
        );
      } else {
        toast.success(
          `Successfully updated ${result.success_count} direct costs`,
        );
      }
    },
    onError: (error: Error) => {
      toast.error(`Bulk status update failed: ${error.message}`);
    },
  });
}

/**
 * Bulk delete multiple direct costs
 */
export function useBulkDirectCostDelete(projectId: number) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<BulkOperationResult, Error, Omit<DirectCostBulkDelete, "ids"> & { ids: string[] }>({
    mutationFn: async (data) => {
      const res = await fetch(`/api/projects/${projectId}/direct-costs/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, operation: "delete" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Bulk delete failed");
      }
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["direct-costs", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["direct-costs-summary-by-cost-code", projectId],
      });
      router.refresh();
      if (result.failed_count > 0) {
        toast.warning(
          `Deleted ${result.success_count} of ${result.total} direct costs. ${result.failed_count} failed.`,
        );
      } else {
        toast.success(
          `Successfully deleted ${result.success_count} direct costs`,
        );
      }
    },
    onError: (error: Error) => {
      toast.error(`Bulk delete failed: ${error.message}`);
    },
  });
}

/**
 * Export direct costs (CSV, Excel, or PDF)
 */
export function useExportDirectCosts(projectId: number) {
  return useMutation({
    mutationFn: async (params: DirectCostExport) => {
      const res = await fetch(
        `/api/projects/${projectId}/direct-costs/export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to export direct costs");
      }
      return res;
    },
    onSuccess: async (response, variables) => {
      // Download the file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const dateStr = new Date().toISOString().split("T")[0];
      const ext =
        variables.format === "excel"
          ? "xlsx"
          : variables.format === "pdf"
            ? "html"
            : "csv";
      a.download = `direct-costs-${dateStr}.${ext}`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Direct costs exported successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to export direct costs: ${error.message}`);
    },
  });
}
