"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

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

interface LinkedCommitmentPco {
  linkId: string;
  linkedAt: string;
  id: string;
  pco_number: string | null;
  title: string;
  status: string;
  total_amount: number | null;
  schedule_impact: number | null;
  commitment_id: string;
  commitment_type: string;
  created_at: string;
}

interface ChangeEventCommitmentPCOsSectionProps {
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

export function ChangeEventCommitmentPCOsSection({
  projectId,
  changeEventId,
}: ChangeEventCommitmentPCOsSectionProps) {
  const [pcos, setPcos] = useState<LinkedCommitmentPco[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPcos = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch<{ data: LinkedCommitmentPco[] }>(
          `/api/projects/${projectId}/change-events/${changeEventId}/commitment-pcos`,
          { cache: "no-store" as RequestCache },
        );
        setPcos(res.data ?? []);
      } catch {
        toast.error("Failed to load commitment PCOs");
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
        title="Commitment Potential Change Orders"
        count={isLoading ? undefined : pcos.length}
      />
      <InlineTable variant="read">
        <InlineTableHeader>
          <InlineTableHeaderRow>
            <InlineTableHeaderCell>PCO #</InlineTableHeaderCell>
            <InlineTableHeaderCell>Title</InlineTableHeaderCell>
            <InlineTableHeaderCell>Status</InlineTableHeaderCell>
            <InlineTableHeaderCell>Type</InlineTableHeaderCell>
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
                    href={`/${projectId}/commitment-pcos/${pco.id}`}
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
                <InlineTableCell className="text-muted-foreground capitalize">
                  {pco.commitment_type === "purchase_order" ? "Purchase Order" : "Subcontract"}
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
