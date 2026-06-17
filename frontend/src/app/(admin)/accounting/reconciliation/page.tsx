"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";

import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
  type TableColumn,
} from "@/components/tables/unified";
import { KpiRow, StatusBadge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { centsToUsd, type ReconciliationFinding, type FindingTier } from "@/lib/accounting/reconciliation";
import { useReconciliationFindings } from "@/hooks/use-reconciliation-findings";
import {
  kindLabels,
  reconciliationFilters,
  tierLabels,
} from "@/features/reconciliation/reconciliation-table-config";

const tierVariant: Record<FindingTier, "error" | "warning" | "neutral"> = {
  HIGH: "error",
  MED: "warning",
  INFO: "neutral",
};

const recordTypeLabels: Record<ReconciliationFinding["recordType"], string> = {
  budget_line: "Budget line",
  commitment_co: "Commitment CO",
  prime_co: "Prime CO",
  budget: "Budget",
};

const columns: TableColumn<ReconciliationFinding>[] = [
  {
    id: "project",
    label: "Project",
    alwaysVisible: true,
    sortable: true,
    sortValue: (f) => f.jpProjectName,
    csvValue: (f) => f.jpProjectName,
    render: (f) => <span className="font-medium">{f.jpProjectName}</span>,
  },
  {
    id: "tier",
    label: "Confidence",
    defaultVisible: true,
    sortable: true,
    sortValue: (f) => ({ HIGH: 0, MED: 1, INFO: 2 })[f.tier],
    csvValue: (f) => tierLabels[f.tier],
    render: (f) => <StatusBadge status={tierLabels[f.tier]} variant={tierVariant[f.tier]} />,
  },
  {
    id: "kind",
    label: "Finding",
    defaultVisible: true,
    sortable: true,
    sortValue: (f) => f.kind,
    csvValue: (f) => kindLabels[f.kind],
    render: (f) => <span>{kindLabels[f.kind]}</span>,
  },
  {
    id: "recordType",
    label: "Record",
    defaultVisible: true,
    csvValue: (f) => recordTypeLabels[f.recordType],
    render: (f) => <span className="text-muted-foreground">{recordTypeLabels[f.recordType]}</span>,
  },
  {
    id: "detail",
    label: "Detail",
    defaultVisible: true,
    csvValue: (f) => f.detail,
    render: (f) => <span className="text-muted-foreground">{f.detail}</span>,
  },
  {
    id: "amount",
    label: "Amount at risk",
    defaultVisible: true,
    sortable: true,
    sortValue: (f) => Math.abs(f.amountCents ?? 0),
    csvValue: (f) => (f.amountCents == null ? "" : centsToUsd(Math.abs(f.amountCents))),
    render: (f) =>
      f.amountCents == null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className="tabular-nums">{centsToUsd(Math.abs(f.amountCents))}</span>
      ),
  },
];

const defaultVisibleColumns = columns.map((c) => c.id);

export default function ReconciliationPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data, isLoading, isFetching, error, refetch } = useReconciliationFindings();

  const tableState = useUnifiedTableState({
    entityKey: "reconciliation-findings",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "tier",
      sortDirection: "asc",
      visibleColumns: defaultVisibleColumns,
      filters: { tier: undefined, kind: undefined },
    },
  });

  const activeFilters = useMemo<Record<string, FilterValue>>(
    () => ({
      tier: (searchParams?.get("tier") as FilterValue) || undefined,
      kind: (searchParams?.get("kind") as FilterValue) || undefined,
    }),
    [searchParams],
  );

  const allFindings = data?.findings ?? [];
  const filteredItems = useMemo(() => {
    return allFindings.filter((f) => {
      if (activeFilters.tier && f.tier !== activeFilters.tier) return false;
      if (activeFilters.kind && f.kind !== activeFilters.kind) return false;
      return true;
    });
  }, [allFindings, activeFilters]);

  const summary = data?.summary;
  const metrics = [
    { label: "High-confidence findings", value: summary ? String(summary.highCount) : "—" },
    {
      label: "Dollars at risk",
      value: summary ? centsToUsd(summary.dollarsAtRiskCents) : "—",
    },
    { label: "Projects scanned", value: summary ? String(summary.projects) : "—" },
  ];

  const handleFilterChange = (next: Record<string, FilterValue>) => {
    tableState.setSearchParams({
      tier: (next.tier as string) ?? null,
      kind: (next.kind as string) ?? null,
    });
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <KpiRow metrics={metrics} size="small" />
      <UnifiedTablePage
        header={{
          title: "Reconciliation",
          description:
            "Job Planner records that disagree with Acumatica — unlinked, drifted, or mismatched. Phase 1 (Job Planner sync metadata).",
          actions: (
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          ),
        }}
        toolbar={{
          totalItems: allFindings.length,
          filteredItems: filteredItems.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search findings…",
          currentView: tableState.currentView,
          onViewChange: tableState.setCurrentView,
          filters: reconciliationFilters,
          activeFilters,
          onFilterChange: handleFilterChange,
          onClearFilters: () => handleFilterChange({ tier: undefined, kind: undefined }),
        }}
        data={{
          items: filteredItems,
          isLoading,
          isFetching,
          error: error instanceof Error ? error : null,
        }}
        table={{
          columns,
          getRowId: (f) => f.fingerprint,
        }}
        emptyState={{
          title: "No findings",
          description: "Job Planner and Acumatica are in sync, or no data has loaded yet.",
          filteredDescription: "No findings match your current filters.",
          isFiltered: Boolean(tableState.debouncedSearch) || Boolean(activeFilters.tier) || Boolean(activeFilters.kind),
        }}
      />
    </div>
  );
}
