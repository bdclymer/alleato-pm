"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { SectionHeader } from "@/components/ds/section-header";
import { StatusBadge } from "@/components/ds/status-badge";
import { UnifiedTablePage, type TableColumn } from "@/components/tables/unified/unified-table-page";
import { formatDate } from "@/lib/table-config/formatters";

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
        const res = await fetch(
          `/api/projects/${projectId}/prime-contract-pcos`,
        );
        if (!res.ok) throw new Error("Failed to fetch PCOs");
        const json = await res.json();
        const allPcos: PrimePco[] = json.data ?? json ?? [];
        // Filter client-side to only show PCOs belonging to this prime contract
        setPcos(
          contractId
            ? allPcos.filter(
                (p) => (p as unknown as Record<string, unknown>).prime_contract_id === contractId,
              )
            : allPcos,
        );
      } catch {
        toast.error("Failed to load potential change orders");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPcos();
  }, [projectId, contractId]);

  const columns: TableColumn<PrimePco>[] = useMemo(
    () => [
      {
        id: "pco_number",
        label: "Number",
        alwaysVisible: true,
        render: (pco) => (
          <Link
            href={`/${projectId}/prime-contract-pcos/${pco.id}`}
            className="text-primary hover:underline font-medium"
          >
            {pco.pco_number ?? "—"}
          </Link>
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
          <span className="text-foreground">{pco.title}</span>
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
    [projectId, formatCurrency],
  );

  return (
    <div className="space-y-3">
      <SectionHeader
        title="Potential Change Orders"
        count={pcos.length}
      />
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
