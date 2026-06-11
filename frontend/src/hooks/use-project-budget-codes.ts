"use client";

import { apiFetch } from "@/lib/api-client";
import { useCallback, useEffect, useState } from "react";

export interface ProjectBudgetCodeOption {
  value: string;
  label: string;
  code: string;
  description: string;
}

interface UseProjectBudgetCodesReturn {
  options: ProjectBudgetCodeOption[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Loads the cost codes used in a project's Acumatica budget so commitment
 * Schedule-of-Values lines can resolve their `budget_code` to a readable label.
 *
 * Subcontract/PO SOV lines store CSI-style codes (e.g. "024113") that come from
 * the Acumatica import and do NOT exist in the internal `cost_codes` table. The
 * descriptions for those codes live in `acumatica_project_budgets`, which is
 * RLS-restricted to the service role, so this goes through the dedicated API
 * route rather than a direct client query.
 */
export function useProjectBudgetCodes(
  projectId: number | null | undefined,
): UseProjectBudgetCodesReturn {
  const [options, setOptions] = useState<ProjectBudgetCodeOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBudgetCodes = useCallback(async () => {
    if (projectId == null) {
      setOptions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch<{ budgetCodes: ProjectBudgetCodeOption[] }>(
        `/api/projects/${projectId}/budget-codes/acumatica`,
      );
      setOptions(data.budgetCodes ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch project budget codes"),
      );
      setOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchBudgetCodes();
  }, [fetchBudgetCodes]);

  return { options, isLoading, error, refetch: fetchBudgetCodes };
}
