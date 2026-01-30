"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";

export interface ChangeOrder {
  id: number;
  project_id: number;
  contract_id?: number | null; // Will be added via migration
  commitment_id?: string | null; // Will be added via migration
  co_number: string | null;
  change_order_number?: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
  amount?: number | null;
  executed?: boolean | null;
  execution_date?: string | null;
  approval_date?: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ChangeOrderOption {
  value: string;
  label: string;
  amount?: number;
  status?: string;
}

interface UseChangeOrdersOptions {
  // Filter by contract ID (when contract_id column exists)
  contractId?: number;
  // Filter by project ID (fallback)
  projectId?: number;
  // Filter by commitment ID
  commitmentId?: string;
  // Filter by status
  status?: string;
  // Limit results
  limit?: number;
  // Whether to auto-fetch
  enabled?: boolean;
}

interface UseChangeOrdersReturn {
  changeOrders: ChangeOrder[];
  options: ChangeOrderOption[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createChangeOrder: (
    changeOrder: Partial<ChangeOrder>,
  ) => Promise<ChangeOrder | null>;
}

/**
 * Hook for fetching and managing change orders from Supabase
 * Used in contract detail pages, change order forms, etc.
 *
 * Note: Currently links to contracts via project_id.
 * When migration 006_change_orders_contract_link.sql is applied,
 * this hook will support direct contract_id linking.
 */
export function useChangeOrders(
  options: UseChangeOrdersOptions = {},
): UseChangeOrdersReturn {
  const {
    contractId,
    projectId,
    commitmentId,
    status,
    limit = 100,
    enabled = true,
  } = options;
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchChangeOrders = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      let query = supabase
        .from("change_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      // Filter by contract_id if the column exists and is provided
      // For now, this will be a no-op until migration is applied
      if (contractId) {
        // Try to filter by contract_id (will work after migration)
        // If column doesn't exist, Supabase returns all records
        query = query.eq("contract_id", contractId);
      }

      // Filter by project_id (current fallback)
      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      // Filter by commitment_id if provided
      if (commitmentId) {
        query = query.eq("commitment_id", commitmentId);
      }

      // Filter by status if provided
      if (status) {
        query = query.eq("status", status);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw new Error(queryError.message);
      }

      setChangeOrders(data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch change orders"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [contractId, projectId, commitmentId, status, limit, enabled]);

  useEffect(() => {
    fetchChangeOrders();
  }, [fetchChangeOrders]);

  const createChangeOrder = useCallback(
    async (changeOrder: Partial<ChangeOrder>): Promise<ChangeOrder | null> => {
      try {
        const supabase = createClient();

        // Prepare the insert data
        const insertData: Record<string, unknown> = {
          project_id: changeOrder.project_id,
          co_number: changeOrder.co_number || changeOrder.change_order_number,
          title: changeOrder.title,
          description: changeOrder.description,
          status: changeOrder.status || "draft",
        };

        // Add contract_id if provided (will work after migration)
        if (changeOrder.contract_id) {
          insertData.contract_id = changeOrder.contract_id;
        }

        // Add commitment_id if provided
        if (changeOrder.commitment_id) {
          insertData.commitment_id = changeOrder.commitment_id;
        }

        // Add financial fields if migration has been applied
        if (changeOrder.amount !== undefined) {
          insertData.amount = changeOrder.amount;
        }
        if (changeOrder.executed !== undefined) {
          insertData.executed = changeOrder.executed;
        }

        const { data, error: insertError } = await (supabase as any)
          .from("change_orders")
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          // If error is about unknown column, the migration hasn't been applied yet
          // Retry without the new columns
          if (
            insertError.message.includes("column") &&
            insertError.message.includes("does not exist")
          ) {
            const basicData = {
              project_id: changeOrder.project_id,
              co_number:
                changeOrder.co_number || changeOrder.change_order_number,
              title: changeOrder.title,
              description: changeOrder.description,
              status: changeOrder.status || "draft",
            };

            const { data: retryData, error: retryError } = await (supabase as any)
              .from("change_orders")
              .insert(basicData)
              .select()
              .single();

            if (retryError) {
              throw new Error(retryError.message);
            }

            await fetchChangeOrders();
            return retryData;
          }

          throw new Error(insertError.message);
        }

        // Refetch to update the list
        await fetchChangeOrders();
        return data;
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to create change order"),
        );
        return null;
      }
    },
    [fetchChangeOrders],
  );

  // Transform change orders to options for dropdowns
  const changeOrderOptions: ChangeOrderOption[] = changeOrders.map((co) => {
    const number = co.co_number || co.change_order_number || `CO-${co.id}`;
    const label = co.title ? `${number}: ${co.title}` : number;

    return {
      value: co.id.toString(),
      label,
      amount: co.amount || undefined,
      status: co.status || undefined,
    };
  });

  return {
    changeOrders,
    options: changeOrderOptions,
    isLoading,
    error,
    refetch: fetchChangeOrders,
    createChangeOrder,
  };
}

/**
 * Helper hook to get change orders for a specific contract
 * Uses project_id relationship until contract_id migration is applied
 */
export function useContractChangeOrders(
  contractId: number,
  projectId?: number,
) {
  return useChangeOrders({
    contractId,
    projectId,
    enabled: !!contractId || !!projectId,
  });
}
