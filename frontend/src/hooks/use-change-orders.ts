"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";
import type { Database } from "@/types/database.types";

type ChangeOrderRow = Database["public"]["Tables"]["change_orders"]["Row"];
type ChangeOrderInsert = Database["public"]["Tables"]["change_orders"]["Insert"];

export type ChangeOrder = ChangeOrderRow;

export interface ChangeOrderOption {
  value: string;
  label: string;
  amount?: number;
  status?: string;
}

interface UseChangeOrdersOptions {
  contractId?: number;
  projectId?: number;
  status?: string;
  limit?: number;
  enabled?: boolean;
}

interface UseChangeOrdersReturn {
  changeOrders: ChangeOrder[];
  options: ChangeOrderOption[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createChangeOrder: (
    changeOrder: Partial<ChangeOrderInsert>,
  ) => Promise<ChangeOrder | null>;
  updateChangeOrder: (
    id: number,
    updates: Partial<ChangeOrderInsert>,
  ) => Promise<ChangeOrder | null>;
  deleteChangeOrder: (id: number) => Promise<boolean>;
}

export function useChangeOrders(
  options: UseChangeOrdersOptions = {},
): UseChangeOrdersReturn {
  const {
    contractId,
    projectId,
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

      if (contractId) {
        query = query.eq("contract_id", contractId);
      }

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

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
  }, [contractId, projectId, status, limit, enabled]);

  useEffect(() => {
    fetchChangeOrders();
  }, [fetchChangeOrders]);

  const createChangeOrder = useCallback(
    async (
      changeOrder: Partial<ChangeOrderInsert>,
    ): Promise<ChangeOrder | null> => {
      try {
        const supabase = createClient();

        const insertData: ChangeOrderInsert = {
          project_id: changeOrder.project_id!,
          co_number: changeOrder.co_number,
          title: changeOrder.title,
          description: changeOrder.description,
          status: changeOrder.status || "draft",
          contract_id: changeOrder.contract_id,
          change_event_id: changeOrder.change_event_id,
          amount: changeOrder.amount ?? 0,
          is_private: changeOrder.is_private ?? false,
          due_date: changeOrder.due_date,
        };

        const { data, error: insertError } = await supabase
          .from("change_orders")
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          throw new Error(insertError.message);
        }

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

  const updateChangeOrder = useCallback(
    async (
      id: number,
      updates: Partial<ChangeOrderInsert>,
    ): Promise<ChangeOrder | null> => {
      try {
        const supabase = createClient();

        const { data, error: updateError } = await supabase
          .from("change_orders")
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();

        if (updateError) {
          throw new Error(updateError.message);
        }

        await fetchChangeOrders();
        return data;
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to update change order"),
        );
        return null;
      }
    },
    [fetchChangeOrders],
  );

  const deleteChangeOrder = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        const supabase = createClient();

        const { error: deleteError } = await supabase
          .from("change_orders")
          .delete()
          .eq("id", id);

        if (deleteError) {
          throw new Error(deleteError.message);
        }

        await fetchChangeOrders();
        return true;
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to delete change order"),
        );
        return false;
      }
    },
    [fetchChangeOrders],
  );

  const changeOrderOptions: ChangeOrderOption[] = changeOrders.map((co) => {
    const number = co.co_number || `CO-${co.id}`;
    const label = co.title ? `${number}: ${co.title}` : number;

    return {
      value: co.id.toString(),
      label,
      amount: co.amount ?? undefined,
      status: co.status ?? undefined,
    };
  });

  return {
    changeOrders,
    options: changeOrderOptions,
    isLoading,
    error,
    refetch: fetchChangeOrders,
    createChangeOrder,
    updateChangeOrder,
    deleteChangeOrder,
  };
}

/**
 * Helper hook to get change orders for a specific contract
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
