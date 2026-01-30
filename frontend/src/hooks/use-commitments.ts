"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";

export interface Commitment {
  id: string;
  number: string | null;
  title: string | null;
  contract_company_id: string | null;
  status: string | null;
  type: string | null;
  commitment_type: string | null;
  original_amount: number | null;
  revised_contract_amount: number | null;
  balance_to_finish: number | null;
  approved_change_orders: number | null;
  executed_date: string | null;
  executed: boolean | null;
  start_date: string | null;
  substantial_completion_date: string | null;
  created_at: string;
  // Joined data
  contract_company?: {
    id: string;
    name: string | null;
  } | null;
}

export interface CommitmentOption {
  value: string;
  label: string;
  commitmentNumber?: string;
  type?: string;
  amount?: number;
}

interface UseCommitmentsOptions {
  // Filter commitments by search term
  search?: string;
  // Filter by status
  status?: string;
  // Filter by type (subcontract, purchase_order)
  type?: string;
  // Filter by company ID
  companyId?: string;
  // Limit number of results
  limit?: number;
  // Whether to auto-fetch on mount
  enabled?: boolean;
}

interface UseCommitmentsReturn {
  commitments: Commitment[];
  options: CommitmentOption[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createCommitment: (
    commitment: Partial<Commitment>,
  ) => Promise<Commitment | null>;
}

/**
 * Hook for fetching commitments (subcontracts and purchase orders) from Supabase
 * Used in change order forms, invoice forms, etc.
 */
export function useCommitments(
  options: UseCommitmentsOptions = {},
): UseCommitmentsReturn {
  const {
    search,
    status,
    type,
    companyId,
    limit = 100,
    enabled = true,
  } = options;
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCommitments = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      type CommitmentRow = {
        id: string;
        number: string | null;
        title: string | null;
        contract_company_id: string | null;
        status: string | null;
        commitment_type: string | null;
        executed: boolean | null;
        contract_date: string | null;
        created_at: string | null;
        contract_company: { id: string; name: string | null } | null;
      };

      let query = (supabase as any)
        .from("commitments_unified")
        .select(
          `
          *,
          contract_company:companies!contract_company_id(id, name)
        `,
        )
        .order("contract_number", { ascending: true })
        .limit(limit);

      if (search) {
        query = query.or(`number.ilike.%${search}%,title.ilike.%${search}%`);
      }

      if (status) {
        query = query.eq("status", status);
      }

      if (type) {
        query = query.eq("type", type);
      }

      if (companyId) {
        query = query.eq("contract_company_id", companyId);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw new Error(queryError.message);
      }

      // Map the data to match our interface
      const mappedData: Commitment[] = (data || []).map((row: any) => ({
        id: row.id || "",
        number: row.contract_number || null,
        title: row.title || null,
        contract_company_id: row.contract_company_id || null,
        status: row.status || null,
        type: row.commitment_type || null,
        commitment_type: row.commitment_type || null,
        original_amount: null,
        revised_contract_amount: null,
        balance_to_finish: null,
        approved_change_orders: null,
        executed_date: row.contract_date || null,
        executed: row.executed || null,
        start_date: null,
        substantial_completion_date: null,
        created_at: row.created_at || new Date().toISOString(),
        contract_company: row.contract_company || null,
      }));

      setCommitments(mappedData);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch commitments"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [search, status, type, companyId, limit, enabled]);

  useEffect(() => {
    fetchCommitments();
  }, [fetchCommitments]);

  const createCommitment = useCallback(
    async (commitment: Partial<Commitment>): Promise<Commitment | null> => {
      try {
        const supabase = createClient();
        const { data, error: insertError } = await (supabase as any)
          .from("commitments_unified")
          .insert({
            contract_number: commitment.number,
            title: commitment.title,
            contract_company_id: commitment.contract_company_id,
            status: commitment.status || "draft",
            commitment_type: commitment.type || commitment.commitment_type || "subcontract",
            executed: commitment.executed || false,
            contract_date: commitment.executed_date,
          })
          .select(
            `
          *,
          contract_company:companies!contract_company_id(id, name)
        `,
          )
          .single();

        if (insertError) {
          throw new Error(insertError.message);
        }

        // Map the result
        const mappedData: Commitment = {
          id: data.id || "",
          number: data.contract_number || null,
          title: data.title || null,
          contract_company_id: data.contract_company_id || null,
          status: data.status || null,
          type: data.commitment_type || null,
          commitment_type: data.commitment_type || null,
          original_amount: null,
          revised_contract_amount: null,
          balance_to_finish: null,
          approved_change_orders: null,
          executed_date: data.contract_date || null,
          executed: data.executed || null,
          start_date: null,
          substantial_completion_date: null,
          created_at: data.created_at || new Date().toISOString(),
          contract_company: data.contract_company || null,
        };

        // Refetch to update the list
        await fetchCommitments();
        return mappedData;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to create commitment"),
        );
        return null;
      }
    },
    [fetchCommitments],
  );

  // Transform commitments to options for dropdowns
  const commitmentOptions: CommitmentOption[] = commitments.map(
    (commitment) => {
      const typeLabel = (commitment.type || commitment.commitment_type) === "purchase_order" ? "PO" : "SC";
      const companyName = commitment.contract_company?.name || "";
      const label = commitment.number
        ? `${commitment.number} - ${commitment.title || companyName || "Untitled"}`
        : `${typeLabel} #${commitment.id}`;

      return {
        value: commitment.id,
        label,
        commitmentNumber: commitment.number || undefined,
        type: commitment.type || commitment.commitment_type || undefined,
        amount:
          commitment.revised_contract_amount ||
          commitment.original_amount ||
          undefined,
      };
    },
  );

  return {
    commitments,
    options: commitmentOptions,
    isLoading,
    error,
    refetch: fetchCommitments,
    createCommitment,
  };
}
