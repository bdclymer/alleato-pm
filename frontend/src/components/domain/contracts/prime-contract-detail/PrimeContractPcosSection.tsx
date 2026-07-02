"use client";

import { useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/table-config/formatters";

import {
  PrimeContractQuickViewSection,
  type QuickViewRecord,
} from "./PrimeContractQuickViewSection";

interface PrimePco {
  id: string;
  prime_contract_id?: string | null;
  pco_number: string | null;
  title: string;
  status: string;
  total_amount: number | null;
  description: string | null;
  revision: number | null;
  schedule_impact: number | null;
  change_reason: string | null;
  due_date: string | null;
  created_at: string;
  commitment_id: string;
  commitment_type: string | null;
  promoted_to_co_id: string | null;
  promoted_co_number: string | null;
}

interface PrimeContractPcosSectionProps {
  projectId: string;
  contractId: string;
  formatCurrency: (value: number | null | undefined) => string;
}

export function PrimeContractPcosSection({
  projectId,
  contractId,
  formatCurrency,
}: PrimeContractPcosSectionProps) {
  const [pcos, setPcos] = useState<PrimePco[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPcos = async () => {
      setIsLoading(true);
      try {
        const json = await apiFetch<{ data?: PrimePco[] } | PrimePco[]>(
          `/api/projects/${projectId}/prime-contract-pcos`,
        );
        const allPcos: PrimePco[] = Array.isArray(json) ? json : (json.data ?? []);
        setPcos(
          contractId
            ? allPcos.filter((pco) => pco.prime_contract_id === contractId)
            : allPcos,
        );
      } catch (error) {
        console.error("Failed to load potential change orders:", error);
        toast.error("Failed to load potential change orders. Try refreshing the page.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchPcos();
  }, [contractId, projectId]);

  const records = useMemo<QuickViewRecord[]>(
    () =>
      pcos.map((pco) => ({
        id: pco.id,
        eyebrow: pco.pco_number ?? "Potential change order",
        title: pco.title || "Untitled PCO",
        status: pco.status,
        summary: pco.description,
        meta: [
          formatCurrency(pco.total_amount),
          pco.schedule_impact != null ? `${pco.schedule_impact}d schedule impact` : "No schedule impact",
          pco.change_reason || "No reason recorded",
        ],
        href: `/${projectId}/prime-contracts/${contractId}/change-orders/pcos/${pco.id}`,
        linkLabel: "Open PCO",
        fields: [
          { label: "Revision", value: pco.revision ?? "—" },
          { label: "Executed Amount", value: formatCurrency(pco.total_amount) },
          {
            label: "Schedule Impact",
            value: pco.schedule_impact != null ? `${pco.schedule_impact} day${pco.schedule_impact === 1 ? "" : "s"}` : "None",
          },
          { label: "Date Initiated", value: formatDate(pco.created_at) },
          { label: "Change Reason", value: pco.change_reason || "—" },
          { label: "Promoted Change Order", value: pco.promoted_co_number || "Not promoted" },
          { label: "Description", value: pco.description || "No description provided.", fullWidth: true },
        ],
      })),
    [contractId, formatCurrency, pcos, projectId],
  );

  return (
    <PrimeContractQuickViewSection
      label="Potential Change Orders"
      items={records}
      isLoading={isLoading}
      emptyMessage="No potential change orders created yet."
    />
  );
}
