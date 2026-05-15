"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { SectionRuleHeading } from "@/components/layout/spacing";
import { StatusBadge } from "@/components/ds/status-badge";
import { UnifiedTablePage, type TableColumn } from "@/components/tables/unified";
import { formatDate } from "@/lib/table-config/formatters";
import { apiFetch } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PrimePco {
  id: string;
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
        // Filter client-side to only show PCOs belonging to this prime contract
        setPcos(
          contractId
            ? allPcos.filter(
                (p) => (p as unknown as Record<string, unknown>).prime_contract_id === contractId,
              )
            : allPcos,
        );
      } catch (error) {
        console.error("Failed to load potential change orders:", error);
        toast.error("Failed to load potential change orders. Try refreshing the page.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPcos();
  }, [projectId, contractId]);

  // Build the canonical nested prime-contract PCO detail route.
  const buildPcoHref = useCallback(
    (pcoId: string) => `/${projectId}/prime-contracts/${contractId}/change-orders/pcos/${pcoId}`,
    [projectId, contractId],
  );

  // Navigate reliably even when table row click delegation is interrupted by nested UI handlers.
  const navigateToPco = useCallback(
    (pcoId: string) => {
      if (!pcoId) return;
      const href = buildPcoHref(pcoId);
      window.location.assign(href);
      window.setTimeout(() => {
        if (window.location.pathname !== href) {
          window.location.assign(href);
        }
      }, 150);
    },
    [buildPcoHref],
  );

  const columns: TableColumn<PrimePco>[] = useMemo(
    () => [
      {
        id: "pco_number",
        label: "Number",
        alwaysVisible: true,
        render: (pco) => (
          <a
            href={buildPcoHref(pco.id)}
            className="text-primary hover:underline font-medium"
            data-row-interactive="true"
            onClick={(event) => {
              event.stopPropagation();
              navigateToPco(pco.id);
            }}
          >
            {pco.pco_number ?? "—"}
          </a>
        ),
      },
      {
        id: "revision",
        label: "Revision",
        render: (pco) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {pco.revision != null ? pco.revision : "—"}
          </span>
        ),
      },
      {
        id: "title",
        label: "Title",
        render: (pco) => (
          <a
            href={buildPcoHref(pco.id)}
            className="text-foreground hover:underline"
            data-row-interactive="true"
            onClick={(event) => {
              event.stopPropagation();
              navigateToPco(pco.id);
            }}
          >
            {pco.title}
          </a>
        ),
      },
      {
        id: "status",
        label: "Status",
        render: (pco) => <StatusBadge status={pco.status} />,
      },
      {
        id: "total_amount",
        label: "Executed Amount",
        render: (pco) => (
          <div className="text-right tabular-nums">
            {formatCurrency(pco.total_amount)}
          </div>
        ),
      },
      {
        id: "schedule_impact",
        label: "Schedule Impact",
        render: (pco) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {pco.schedule_impact != null ? `${pco.schedule_impact}d` : "—"}
          </span>
        ),
      },
      {
        id: "created_at",
        label: "Date Initiated",
        render: (pco) => (
          <span className="text-sm text-muted-foreground">{formatDate(pco.created_at)}</span>
        ),
      },
      {
        id: "change_reason",
        label: "Change Reason",
        render: (pco) => (
          <span className="text-sm text-muted-foreground">{pco.change_reason || "—"}</span>
        ),
      },
      {
        id: "promoted_co_number",
        label: "PCCO",
        render: (pco) => (
          <span className="text-sm text-muted-foreground">
            {pco.promoted_co_number ?? "—"}
          </span>
        ),
      },
    ],
    [buildPcoHref, formatCurrency, navigateToPco],
  );

  return (
    <div className="space-y-3">
      <SectionRuleHeading label="Potential Change Orders" />
      <UnifiedTablePage
        header={{ title: "" }}
        toolbar={{
          totalItems: pcos.length,
          filteredItems: pcos.length,
          selectedCount: 0,
          searchValue: "",
          onSearchChange: () => {},
          currentView: "table",
          onViewChange: () => {},
        }}
        data={{ items: pcos, isLoading }}
        table={{
          columns,
          getRowId: (pco) => pco.id,
          onRowClick: (pco) => {
            navigateToPco(pco.id);
          },
        }}
        features={{
          enableSearch: false,
          enableViews: false,
          enableFilters: false,
          enableColumnToggle: false,
          enableExport: false,
          enableBulkDelete: false,
          enableRowSelection: false,
        }}
        layout={{
          containerPadding: false,
          toolbarInlineWithHeader: true,
          containerClassName: "min-h-0 pb-0",
        }}
        emptyState={{
          title: "No potential change orders",
          description: "PCOs will appear here when created for this contract.",
          filteredDescription: "No potential change orders found.",
          isFiltered: false,
        }}
      />
    </div>
  );
}
