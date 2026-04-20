"use client";

import { useMemo } from "react";

import Link from "next/link";

import { StatusBadge } from "@/components/ds";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { UnifiedTablePage, type TableColumn } from "@/components/tables/unified/unified-table-page";
import { useChangeEvents } from "@/hooks/use-change-events";
import type { ChangeEvent } from "@/types/change-events";

interface PrimeContractChangeEventsTabProps {
  projectId: string;
  contractId: string;
  formatCurrency: (value: number | null | undefined) => string;
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

  // Filter to events linked to this prime contract (or show all if none linked)
  const filtered = changeEvents.filter(
    (ce) => (ce as ChangeEvent & { prime_contract_id?: string | null }).prime_contract_id === contractId,
  );
  const rows = filtered.length > 0 ? filtered : changeEvents;

  const columns: TableColumn<ChangeEvent>[] = useMemo(
    () => [
      {
        id: "number",
        label: "#",
        render: (ce) => (
          <span className="font-medium text-foreground">{ce.number ?? "—"}</span>
        ),
      },
      {
        id: "title",
        label: "Title",
        render: (ce) => (
          <Link
            href={`/${projectId}/change-events/${ce.id}`}
            className="text-primary hover:underline"
          >
            {ce.title || "Untitled"}
          </Link>
        ),
      },
      {
        id: "type",
        label: "Type",
        render: (ce) => (
          <span className="text-muted-foreground text-sm">{ce.type || "—"}</span>
        ),
      },
      {
        id: "status",
        label: "Status",
        render: (ce) => <StatusBadge status={ce.status ?? "Open"} />,
      },
      {
        id: "scope",
        label: "Scope",
        render: (ce) => (
          <span className="text-muted-foreground text-sm">{ce.scope || "—"}</span>
        ),
      },
      {
        id: "cost_rom",
        label: "Cost ROM",
        render: (ce) => (
          <span className="tabular-nums text-right block">
            {ce.cost_rom != null ? formatCurrency(Number(ce.cost_rom)) : "—"}
          </span>
        ),
      },
      {
        id: "prime_pco",
        label: "Potential PCO",
        render: (ce) => (
          <span className="text-sm text-muted-foreground">
            {ce.prime_pco || "—"}
          </span>
        ),
      },
    ],
    [projectId, formatCurrency],
  );

  return (
    <div className="space-y-3">
      <SectionRuleHeading label="Change Events" />
      <UnifiedTablePage
        header={{ title: "" }}
        toolbar={{
          totalItems: rows.length,
          filteredItems: rows.length,
          selectedCount: 0,
          searchValue: "",
          onSearchChange: () => {},
          currentView: "table",
          onViewChange: () => {},
        }}
        data={{ items: rows, isLoading }}
        table={{
          columns,
          getRowId: (ce) => String(ce.id),
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
          title: "No change events",
          description: "Change events associated with this prime contract will appear here.",
          filteredDescription: "No change events found.",
          isFiltered: false,
        }}
      />
    </div>
  );
}
