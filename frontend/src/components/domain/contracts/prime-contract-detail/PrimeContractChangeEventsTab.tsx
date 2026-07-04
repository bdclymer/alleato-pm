"use client";

import { useMemo } from "react";

import { useChangeEvents } from "@/hooks/use-change-events";
import type { ChangeEvent } from "@/types/change-events";

import {
  PrimeContractQuickViewSection,
  type QuickViewRecord,
} from "./PrimeContractQuickViewSection";

interface PrimeContractChangeEventsTabProps {
  projectId: string;
  contractId: string;
  formatCurrency: (value: number | null | undefined) => string;
}

function normalizePrimeContractId(value: ChangeEvent["prime_contract_id"] | string | null | undefined) {
  if (value === null || value === undefined) return null;
  return String(value);
}

export function PrimeContractChangeEventsTab({
  projectId,
  contractId,
  formatCurrency,
}: PrimeContractChangeEventsTabProps) {
  const { changeEvents, isLoading } = useChangeEvents({
    projectId: Number(projectId),
    limit: 200,
  });

  const rows = useMemo(
    () =>
      changeEvents.filter(
        (changeEvent) =>
          normalizePrimeContractId(
            (changeEvent as ChangeEvent & { prime_contract_id?: string | number | null }).prime_contract_id,
          ) === contractId,
      ),
    [changeEvents, contractId],
  );

  const records = useMemo<QuickViewRecord[]>(
    () =>
      rows.map((changeEvent) => ({
        id: String(changeEvent.id),
        eyebrow: changeEvent.number ?? "Change event",
        title: changeEvent.title || "Untitled change event",
        status: changeEvent.status ?? "Open",
        summary: changeEvent.description,
        meta: [
          changeEvent.type || "No type",
          changeEvent.scope || "No scope",
          changeEvent.cost_rom != null ? formatCurrency(Number(changeEvent.cost_rom)) : "No ROM",
        ],
        href: `/${projectId}/change-events/${changeEvent.id}`,
        linkLabel: "Open change event",
        fields: [
          { label: "Type", value: changeEvent.type || "—" },
          { label: "Scope", value: changeEvent.scope || "—" },
          { label: "Cost ROM", value: changeEvent.cost_rom != null ? formatCurrency(Number(changeEvent.cost_rom)) : "—" },
          { label: "Potential PCO", value: changeEvent.prime_pco || "Not linked" },
          { label: "Reason", value: changeEvent.reason || "—" },
          { label: "Origin", value: changeEvent.origin || "—" },
          { label: "Description", value: changeEvent.description || "No description provided.", fullWidth: true },
        ],
      })),
    [formatCurrency, projectId, rows],
  );

  return (
    <PrimeContractQuickViewSection
      label="Change Events"
      items={records}
      isLoading={isLoading}
      emptyMessage="No change events associated with this prime contract yet."
    />
  );
}
