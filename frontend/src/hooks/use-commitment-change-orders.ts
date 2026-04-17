"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api-client";

export interface CommitmentChangeOrder {
  id: string;
  number: string;
  title: string;
  description: string;
  status: "draft" | "pending" | "approved" | "executed" | "void";
  amount: number;
  requested_date: string;
  requested_by: string | null;
  approved_date: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommitmentChangeOrderTotals {
  approved: number;
  pending: number;
  draft: number;
  executed: number;
  void: number;
  total: number;
  count: number;
}

interface CreateChangeOrderInput {
  change_order_number: string;
  description: string;
  amount: number;
  status?: "draft" | "pending" | "approved" | "executed" | "void";
  requested_date?: string;
}

interface UpdateChangeOrderInput {
  change_order_number?: string;
  description?: string;
  amount?: number;
  status?: "draft" | "pending" | "approved" | "executed" | "void";
  requested_date?: string;
}

interface UseCommitmentChangeOrdersOptions {
  commitmentId: string;
  enabled?: boolean;
}

interface UseCommitmentChangeOrdersReturn {
  changeOrders: CommitmentChangeOrder[];
  totals: CommitmentChangeOrderTotals;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createChangeOrder: (
    input: CreateChangeOrderInput
  ) => Promise<CommitmentChangeOrder | null>;
  updateChangeOrder: (
    changeOrderId: string,
    input: UpdateChangeOrderInput
  ) => Promise<CommitmentChangeOrder | null>;
  deleteChangeOrder: (changeOrderId: string) => Promise<boolean>;
  approveChangeOrder: (
    changeOrderId: string
  ) => Promise<{ success: boolean; totals?: CommitmentChangeOrderTotals }>;
}

interface CommitmentChangeOrdersResponse {
  data?: Record<string, unknown>[];
}

interface CommitmentChangeOrderResponse {
  data?: Record<string, unknown>;
}

interface ApproveChangeOrderResponse {
  data?: {
    totals?: {
      approved?: number;
      pending?: number;
      draft?: number;
      total?: number;
    };
  };
}

/**
 * Hook for managing change orders for a specific commitment
 *
 * Provides:
 * - List of change orders with status-based totals
 * - CRUD operations (create, update, delete)
 * - Approve functionality that updates commitment revised amount
 *
 * @example
 * const { changeOrders, totals, approveChangeOrder } = useCommitmentChangeOrders({
 *   commitmentId: "123",
 * });
 *
 * // Approve a change order
 * const result = await approveChangeOrder("456");
 * if (result.success) {
 *   // Check result.totals?.approved for new total
 * }
 */
export function useCommitmentChangeOrders(
  options: UseCommitmentChangeOrdersOptions
): UseCommitmentChangeOrdersReturn {
  const { commitmentId, enabled = true } = options;

  const [changeOrders, setChangeOrders] = useState<CommitmentChangeOrder[]>([]);
  const [totals, setTotals] = useState<CommitmentChangeOrderTotals>({
    approved: 0,
    pending: 0,
    draft: 0,
    executed: 0,
    void: 0,
    total: 0,
    count: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Calculate totals from change orders
  const calculateTotals = useCallback(
    (orders: CommitmentChangeOrder[]): CommitmentChangeOrderTotals => {
      return orders.reduce(
        (acc, co) => {
          const amount = Number(co.amount) || 0;
          acc.total += amount;
          acc.count += 1;

          switch (co.status) {
            case "approved":
              acc.approved += amount;
              break;
            case "executed":
              acc.executed += amount;
              acc.approved += amount; // Executed is also approved
              break;
            case "pending":
              acc.pending += amount;
              break;
            case "draft":
              acc.draft += amount;
              break;
            case "void":
              acc.void += amount;
              break;
          }

          return acc;
        },
        {
          approved: 0,
          pending: 0,
          draft: 0,
          executed: 0,
          void: 0,
          total: 0,
          count: 0,
        }
      );
    },
    []
  );

  // Fetch change orders
  const fetchChangeOrders = useCallback(async () => {
    if (!enabled || !commitmentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch<CommitmentChangeOrdersResponse>(
        `/api/commitments/${commitmentId}/change-orders`
      );
      const orders: CommitmentChangeOrder[] = (data.data || []).map(
        (co: Record<string, unknown>) => ({
          id: String(co.id),
          number: String(co.number || co.change_order_number || ""),
          title: String(co.title || co.description || ""),
          description: String(co.description || co.title || ""),
          status: String(co.status || "draft").toLowerCase() as CommitmentChangeOrder["status"],
          amount: Number(co.amount) || 0,
          requested_date: String(co.requested_date || ""),
          requested_by: co.requested_by ? String(co.requested_by) : null,
          approved_date: co.approved_date ? String(co.approved_date) : null,
          approved_by: co.approved_by ? String(co.approved_by) : null,
          rejection_reason: co.rejection_reason ? String(co.rejection_reason) : null,
          created_at: String(co.created_at || ""),
          updated_at: String(co.updated_at || ""),
        })
      );

      setChangeOrders(orders);
      setTotals(calculateTotals(orders));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setChangeOrders([]);
        setTotals({
          approved: 0,
          pending: 0,
          draft: 0,
          executed: 0,
          void: 0,
          total: 0,
          count: 0,
        });
        return;
      }
      const detail = err instanceof Error ? err.message : "an unexpected error occurred";
      setError(new Error(`Could not load change orders: ${detail}`));
    } finally {
      setIsLoading(false);
    }
  }, [commitmentId, enabled, calculateTotals]);

  useEffect(() => {
    fetchChangeOrders();
  }, [fetchChangeOrders]);

  // Create a new change order
  const createChangeOrder = useCallback(
    async (
      input: CreateChangeOrderInput
    ): Promise<CommitmentChangeOrder | null> => {
      try {
        const data = await apiFetch<Record<string, unknown>>(
          `/api/commitments/${commitmentId}/change-orders`,
          {
            method: "POST",
            body: JSON.stringify(input),
          }
        );

        // Refetch to update the list
        await fetchChangeOrders();

        return {
          id: String(data.id),
          number: String(data.number || data.change_order_number || ""),
          title: String(data.title || data.description || ""),
          description: String(data.description || data.title || ""),
          status: String(data.status || "draft").toLowerCase() as CommitmentChangeOrder["status"],
          amount: Number(data.amount) || 0,
          requested_date: String(data.requested_date || ""),
          requested_by: data.requested_by ? String(data.requested_by) : null,
          approved_date: data.approved_date ? String(data.approved_date) : null,
          approved_by: data.approved_by ? String(data.approved_by) : null,
          rejection_reason: null,
          created_at: String(data.created_at || ""),
          updated_at: String(data.updated_at || ""),
        };
      } catch (err) {
        const detail = err instanceof Error ? err.message : "an unexpected error occurred";
        setError(new Error(`Could not create change order: ${detail}`));
        return null;
      }
    },
    [commitmentId, fetchChangeOrders]
  );

  // Update a change order
  const updateChangeOrder = useCallback(
    async (
      changeOrderId: string,
      input: UpdateChangeOrderInput
    ): Promise<CommitmentChangeOrder | null> => {
      try {
        const result = await apiFetch<CommitmentChangeOrderResponse | Record<string, unknown>>(
          `/api/commitments/${commitmentId}/change-orders/${changeOrderId}`,
          {
            method: "PUT",
            body: JSON.stringify(input),
          }
        );
        const data = (
          "data" in result && result.data ? result.data : result
        ) as Record<string, unknown>;

        // Refetch to update the list
        await fetchChangeOrders();

        return {
          id: String(data.id),
          number: String(data.number || data.change_order_number || ""),
          title: String(data.title || data.description || ""),
          description: String(data.description || data.title || ""),
          status: String(data.status || "draft").toLowerCase() as CommitmentChangeOrder["status"],
          amount: Number(data.amount) || 0,
          requested_date: String(data.requested_date || ""),
          requested_by: data.requested_by ? String(data.requested_by) : null,
          approved_date: data.approved_date ? String(data.approved_date) : null,
          approved_by: data.approved_by ? String(data.approved_by) : null,
          rejection_reason: data.rejection_reason ? String(data.rejection_reason) : null,
          created_at: String(data.created_at || ""),
          updated_at: String(data.updated_at || ""),
        };
      } catch (err) {
        const detail = err instanceof Error ? err.message : "an unexpected error occurred";
        setError(new Error(`Could not update change order: ${detail}`));
        return null;
      }
    },
    [commitmentId, fetchChangeOrders]
  );

  // Delete a change order
  const deleteChangeOrder = useCallback(
    async (changeOrderId: string): Promise<boolean> => {
      try {
        await apiFetch(
          `/api/commitments/${commitmentId}/change-orders/${changeOrderId}`,
          {
            method: "DELETE",
          }
        );

        // Refetch to update the list
        await fetchChangeOrders();
        return true;
      } catch (err) {
        const detail = err instanceof Error ? err.message : "an unexpected error occurred";
        setError(new Error(`Could not delete change order: ${detail}`));
        return false;
      }
    },
    [commitmentId, fetchChangeOrders]
  );

  // Approve a change order
  const approveChangeOrder = useCallback(
    async (
      changeOrderId: string
    ): Promise<{ success: boolean; totals?: CommitmentChangeOrderTotals }> => {
      try {
        const result = await apiFetch<ApproveChangeOrderResponse>(
          `/api/commitments/${commitmentId}/change-orders/${changeOrderId}/approve`,
          {
            method: "POST",
          }
        );

        // Refetch to update the list
        await fetchChangeOrders();

        return {
          success: true,
          totals: result.data?.totals
            ? {
                approved: result.data.totals.approved || 0,
                pending: result.data.totals.pending || 0,
                draft: result.data.totals.draft || 0,
                executed: 0,
                void: 0,
                total: result.data.totals.total || 0,
                count: changeOrders.length,
              }
            : undefined,
        };
      } catch (err) {
        const detail = err instanceof Error ? err.message : "an unexpected error occurred";
        setError(new Error(`Could not approve change order: ${detail}`));
        return { success: false };
      }
    },
    [commitmentId, fetchChangeOrders, changeOrders.length]
  );

  return {
    changeOrders,
    totals,
    isLoading,
    error,
    refetch: fetchChangeOrders,
    createChangeOrder,
    updateChangeOrder,
    deleteChangeOrder,
    approveChangeOrder,
  };
}

/**
 * Helper hook for getting change order totals only
 */
export function useCommitmentChangeOrderTotals(commitmentId: string) {
  const { totals, isLoading, error, refetch } = useCommitmentChangeOrders({
    commitmentId,
  });

  return {
    totals,
    isLoading,
    error,
    refetch,
  };
}
