"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import type {
  ReconciliationFinding,
  ReconciliationSummary,
} from "@/lib/accounting/reconciliation";

export type ReconciliationResponse = {
  generatedAt: string;
  summary: ReconciliationSummary;
  findings: ReconciliationFinding[];
};

export function useReconciliationFindings() {
  return useQuery({
    queryKey: ["reconciliation", "findings"],
    queryFn: () => apiFetch<ReconciliationResponse>("/api/reconciliation/findings"),
    staleTime: 5 * 60 * 1000,
  });
}
