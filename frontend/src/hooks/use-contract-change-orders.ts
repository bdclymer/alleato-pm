"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ContractChangeOrder,
  CreateChangeOrderInput,
  UpdateChangeOrderInput,
  ApproveChangeOrderInput,
  RejectChangeOrderInput,
} from "@/types/contract-change-orders";

export interface ContractChangeOrderTotals {
  approved: number;
  pending: number;
  draft: number;
  rejected: number;
  total: number;
  count: number;
}

interface UseContractChangeOrdersOptions {
  projectId: string;
  contractId: string;
  status?: "draft" | "pending" | "approved" | "rejected";
  enabled?: boolean;
}

interface UseContractChangeOrdersReturn {
  changeOrders: ContractChangeOrder[];
  totals: ContractChangeOrderTotals;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createChangeOrder: (
    input: CreateChangeOrderInput
  ) => Promise<ContractChangeOrder | null>;
  updateChangeOrder: (
    changeOrderId: string,
    input: UpdateChangeOrderInput
  ) => Promise<ContractChangeOrder | null>;
  deleteChangeOrder: (changeOrderId: string) => Promise<boolean>;
  approveChangeOrder: (
    changeOrderId: string,
    input: ApproveChangeOrderInput
  ) => Promise<{ success: boolean; data?: ContractChangeOrder }>;
  rejectChangeOrder: (
    changeOrderId: string,
    input: RejectChangeOrderInput
  ) => Promise<{ success: boolean; data?: ContractChangeOrder }>;
}

/**
 * Hook for managing change orders for a specific prime contract
 *
 * Provides:
 * - List of change orders with status-based totals
 * - CRUD operations (create, update, delete)
 * - Approve/Reject functionality
 *
 * @example
 * const { changeOrders, totals, approveChangeOrder } = useContractChangeOrders({
 *   projectId: "123",
 *   contractId: "456",
 * });
 *
 * // Approve a change order
 * const result = await approveChangeOrder("789", {
 *   approved_by: userId,
 *   approved_date: new Date().toISOString(),
 * });
 * if (result.success) {
 *   // Change order approved successfully
 * }
 */
export function useContractChangeOrders(
  options: UseContractChangeOrdersOptions
): UseContractChangeOrdersReturn {
  const { projectId, contractId, status, enabled = true } = options;

  const [changeOrders, setChangeOrders] = useState<ContractChangeOrder[]>([]);
  const [totals, setTotals] = useState<ContractChangeOrderTotals>({
    approved: 0,
    pending: 0,
    draft: 0,
    rejected: 0,
    total: 0,
    count: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Calculate totals from change orders
  const calculateTotals = useCallback(
    (orders: ContractChangeOrder[]): ContractChangeOrderTotals => {
      return orders.reduce(
        (acc, co) => {
          const amount = Number(co.amount) || 0;
          acc.total += amount;
          acc.count += 1;

          switch (co.status) {
            case "approved":
              acc.approved += amount;
              break;
            case "pending":
              acc.pending += amount;
              break;
            case "draft":
              acc.draft += amount;
              break;
            case "rejected":
              acc.rejected += amount;
              break;
          }

          return acc;
        },
        {
          approved: 0,
          pending: 0,
          draft: 0,
          rejected: 0,
          total: 0,
          count: 0,
        }
      );
    },
    []
  );

  // Fetch change orders
  const fetchChangeOrders = useCallback(async () => {
    if (!enabled || !projectId || !contractId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Build query params
      const queryParams = new URLSearchParams();
      if (status) {
        queryParams.append("status", status);
      }

      const queryString = queryParams.toString();
      const url = `/api/projects/${projectId}/contracts/${contractId}/change-orders${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          setChangeOrders([]);
          setTotals({
            approved: 0,
            pending: 0,
            draft: 0,
            rejected: 0,
            total: 0,
            count: 0,
          });
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch change orders");
      }

      const data = await response.json();
      const orders: ContractChangeOrder[] = Array.isArray(data) ? data : [];

      setChangeOrders(orders);
      setTotals(calculateTotals(orders));
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch change orders")
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId, contractId, status, enabled, calculateTotals]);

  useEffect(() => {
    fetchChangeOrders();
  }, [fetchChangeOrders]);

  // Create a new change order
  const createChangeOrder = useCallback(
    async (
      input: CreateChangeOrderInput
    ): Promise<ContractChangeOrder | null> => {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}/change-orders`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(input),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create change order");
        }

        const data = await response.json();

        // Refetch to update the list
        await fetchChangeOrders();

        return data as ContractChangeOrder;
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to create change order")
        );
        return null;
      }
    },
    [projectId, contractId, fetchChangeOrders]
  );

  // Update a change order
  const updateChangeOrder = useCallback(
    async (
      changeOrderId: string,
      input: UpdateChangeOrderInput
    ): Promise<ContractChangeOrder | null> => {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}/change-orders/${changeOrderId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(input),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update change order");
        }

        const data = await response.json();

        // Refetch to update the list
        await fetchChangeOrders();

        return data as ContractChangeOrder;
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to update change order")
        );
        return null;
      }
    },
    [projectId, contractId, fetchChangeOrders]
  );

  // Delete a change order
  const deleteChangeOrder = useCallback(
    async (changeOrderId: string): Promise<boolean> => {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}/change-orders/${changeOrderId}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete change order");
        }

        // Refetch to update the list
        await fetchChangeOrders();

        return true;
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to delete change order")
        );
        return false;
      }
    },
    [projectId, contractId, fetchChangeOrders]
  );

  // Approve a change order
  const approveChangeOrder = useCallback(
    async (
      changeOrderId: string,
      input: ApproveChangeOrderInput
    ): Promise<{ success: boolean; data?: ContractChangeOrder }> => {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}/change-orders/${changeOrderId}/approve`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(input),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to approve change order");
        }

        const data = await response.json();

        // Refetch to update the list
        await fetchChangeOrders();

        return {
          success: true,
          data: data as ContractChangeOrder,
        };
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to approve change order")
        );
        return { success: false };
      }
    },
    [projectId, contractId, fetchChangeOrders]
  );

  // Reject a change order
  const rejectChangeOrder = useCallback(
    async (
      changeOrderId: string,
      input: RejectChangeOrderInput
    ): Promise<{ success: boolean; data?: ContractChangeOrder }> => {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/contracts/${contractId}/change-orders/${changeOrderId}/reject`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(input),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to reject change order");
        }

        const data = await response.json();

        // Refetch to update the list
        await fetchChangeOrders();

        return {
          success: true,
          data: data as ContractChangeOrder,
        };
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to reject change order")
        );
        return { success: false };
      }
    },
    [projectId, contractId, fetchChangeOrders]
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
    rejectChangeOrder,
  };
}

/**
 * Helper hook to get change orders for a specific contract with filtering
 */
export function useContractChangeOrdersByStatus(
  projectId: string,
  contractId: string,
  status: "draft" | "pending" | "approved" | "rejected"
) {
  return useContractChangeOrders({
    projectId,
    contractId,
    status,
    enabled: !!projectId && !!contractId,
  });
}
