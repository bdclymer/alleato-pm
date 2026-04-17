"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionHeader } from "@/components/ds/section-header";
import { StatusBadge } from "@/components/ds/status-badge";
import {
  InlineTable,
  InlineTableHeader,
  InlineTableHeaderRow,
  InlineTableHeaderCell,
  InlineTableBody,
  InlineTableRow,
  InlineTableCell,
} from "@/components/ds/inline-table";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/table-config/formatters";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PrimeContractInfo {
  id: string;
  contract_number: string | null;
  title: string | null;
  status: string | null;
}

interface LinkedPrimePco {
  linkId: string;
  linkedAt: string;
  id: string;
  pco_number: string | null;
  title: string;
  status: string;
  total_amount: number | null;
  schedule_impact: number | null;
  created_at: string;
  prime_contract_id: string;
  prime_contracts: PrimeContractInfo | null;
}

interface ChangeEventPrimePCOsSectionProps {
  projectId: number;
  changeEventId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChangeEventPrimePCOsSection({
  projectId,
  changeEventId,
}: ChangeEventPrimePCOsSectionProps) {
  const [pcos, setPcos] = useState<LinkedPrimePco[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPcos = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch<{ data: LinkedPrimePco[] }>(
          `/api/projects/${projectId}/change-events/${changeEventId}/prime-pcos`,
          { cache: "no-store" as RequestCache },
        );
        setPcos(res.data ?? []);
      } catch (err) {
        console.error("[ChangeEventPrimePCOsSection] Failed to load prime contract PCOs:", err);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchPcos();
  }, [projectId, changeEventId]);

  if (!isLoading && pcos.length === 0) return null;

  return (
    <div className="space-y-3">
      <SectionHeader
        title="Prime Contract Potential Change Orders"
        count={isLoading ? undefined : pcos.length}
      />
      <InlineTable variant="read">
        <InlineTableHeader>
          <InlineTableHeaderRow>
            <InlineTableHeaderCell>PCO #</InlineTableHeaderCell>
            <InlineTableHeaderCell>Title</InlineTableHeaderCell>
            <InlineTableHeaderCell>Status</InlineTableHeaderCell>
            <InlineTableHeaderCell>Prime Contract</InlineTableHeaderCell>
            <InlineTableHeaderCell className="text-right">Amount</InlineTableHeaderCell>
            <InlineTableHeaderCell>Schedule Impact</InlineTableHeaderCell>
            <InlineTableHeaderCell>Date Created</InlineTableHeaderCell>
          </InlineTableHeaderRow>
        </InlineTableHeader>
        <InlineTableBody>
          {isLoading ? (
            <InlineTableRow>
              <InlineTableCell colSpan={7} className="text-center text-muted-foreground py-4">
                Loading…
              </InlineTableCell>
            </InlineTableRow>
          ) : (
            pcos.map((pco) => (
              <InlineTableRow key={pco.linkId}>
                <InlineTableCell>
                  <Link
                    href={`/${projectId}/prime-contracts/${pco.prime_contract_id}/change-orders/pcos/${pco.id}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {pco.pco_number ?? "—"}
                  </Link>
                </InlineTableCell>
                <InlineTableCell className="text-foreground">
                  {pco.title}
                </InlineTableCell>
                <InlineTableCell>
                  <StatusBadge status={pco.status} />
                </InlineTableCell>
                <InlineTableCell>
                  {pco.prime_contracts ? (
                    <Link
                      href={`/${projectId}/prime-contracts/${pco.prime_contract_id}`}
                      className="text-primary hover:underline"
                    >
                      {pco.prime_contracts.contract_number ||
                        pco.prime_contracts.title ||
                        "—"}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </InlineTableCell>
                <InlineTableCell className="text-right tabular-nums">
                  {formatCurrency(pco.total_amount)}
                </InlineTableCell>
                <InlineTableCell className="text-muted-foreground tabular-nums">
                  {pco.schedule_impact != null ? `${pco.schedule_impact}d` : "—"}
                </InlineTableCell>
                <InlineTableCell className="text-muted-foreground">
                  {formatDate(pco.created_at)}
                </InlineTableCell>
              </InlineTableRow>
            ))
          )}
        </InlineTableBody>
      </InlineTable>
    </div>
  );
}
