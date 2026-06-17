"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ExternalLink, RefreshCw, RotateCcw } from "lucide-react";

import {
  UnifiedTablePage,
  useUnifiedTableState,
  type FilterValue,
  type TableColumn,
} from "@/components/tables/unified";
import { StatusBadge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { centsToUsd, type FindingTier } from "@/lib/accounting/reconciliation";
import {
  useReconciliationFindings,
  useResolveFinding,
  useRunReconciliation,
  type ReconciliationFindingItem,
  type ReviewStatus,
} from "@/hooks/use-reconciliation-findings";
import {
  kindLabels,
  kindMeaning,
  reconciliationFilters,
  tierLabels,
} from "@/features/reconciliation/reconciliation-table-config";

const ACUMATICA_PROJECTS_URL = "https://alleatogroup.acumatica.com/Main?ScreenId=PM301000";

const tierVariant: Record<FindingTier, "error" | "warning" | "neutral"> = {
  HIGH: "error",
  MED: "warning",
  INFO: "neutral",
};

const statusVariant: Record<ReviewStatus, "success" | "info" | "neutral"> = {
  resolved: "success",
  reviewed: "info",
  open: "neutral",
};

const recordTypeLabels: Record<ReconciliationFindingItem["recordType"], string> = {
  budget_line: "Budget line",
  commitment_co: "Commitment CO",
  prime_co: "Prime CO",
  budget: "Budget",
  ap_bill: "AP bill",
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function relativeDays(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 60) return `${days} days ago`;
  return `${Math.floor(days / 30)} mo ago`;
}

const columns: TableColumn<ReconciliationFindingItem>[] = [
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
    id: "costCode",
    label: "Cost code / record",
    defaultVisible: true,
    sortable: true,
    sortValue: (f) => f.costCodeLabel ?? f.recordRef,
    csvValue: (f) => f.costCodeLabel ?? recordTypeLabels[f.recordType],
    render: (f) =>
      f.costCodeLabel ? (
        <span>{f.costCodeLabel}</span>
      ) : (
        <span className="text-muted-foreground">{recordTypeLabels[f.recordType]}</span>
      ),
  },
  {
    id: "tier",
    label: "Confidence",
    defaultVisible: true,
    sortable: true,
    sortValue: (f) => ({ HIGH: 0, MED: 1, INFO: 2 })[f.tier],
    csvValue: (f) => tierLabels[f.tier],
    render: (f) => (
      <span className="inline-flex items-center gap-1">
        <StatusBadge status={tierLabels[f.tier]} variant={tierVariant[f.tier]} />
        {f.acumaticaChecked && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
      </span>
    ),
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
    id: "status",
    label: "Status",
    defaultVisible: true,
    sortable: true,
    sortValue: (f) => f.reviewStatus,
    csvValue: (f) => f.reviewStatus,
    render: (f) =>
      f.reviewStatus === "open" ? (
        <span className="text-xs text-muted-foreground">Open</span>
      ) : (
        <StatusBadge
          status={f.reviewStatus === "resolved" ? "Resolved" : "Reviewed"}
          variant={statusVariant[f.reviewStatus]}
        />
      ),
  },
  {
    id: "modified",
    label: "Date",
    defaultVisible: true,
    sortable: true,
    sortValue: (f) => (f.jpModifiedOn ? new Date(f.jpModifiedOn).getTime() : 0),
    csvValue: (f) => f.jpModifiedOn ?? "",
    render: (f) => (
      <span className="whitespace-nowrap">
        {fmtDate(f.jpModifiedOn)}
        {f.jpModifiedOn && (
          <span className="ml-1 text-xs text-muted-foreground">({relativeDays(f.jpModifiedOn)})</span>
        )}
      </span>
    ),
  },
  {
    id: "synced",
    label: "Last synced",
    defaultVisible: true,
    sortable: true,
    sortValue: (f) => (f.lastSyncedOn ? new Date(f.lastSyncedOn).getTime() : 0),
    csvValue: (f) => f.lastSyncedOn ?? "",
    render: (f) => <span className="whitespace-nowrap text-muted-foreground">{fmtDate(f.lastSyncedOn)}</span>,
  },
  {
    id: "amount",
    label: "Amount",
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

function EvidenceRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-2">
      <span className="w-40 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="flex-1 text-sm">{value}</span>
    </div>
  );
}

function FindingDetail({
  finding,
  onReview,
  isUpdating,
}: {
  finding: ReconciliationFindingItem;
  onReview: (status: ReviewStatus) => void;
  isUpdating: boolean;
}) {
  const showValues = (finding.jpValueCents ?? 0) !== 0 || (finding.acuValueCents ?? 0) !== 0;
  return (
    <div className="mt-4 space-y-6">
      <div className="rounded-md bg-muted p-4 text-sm">{kindMeaning[finding.kind]}</div>

      <div className="divide-y divide-border">
        <EvidenceRow
          label="Project"
          value={finding.jpProjectId > 0 ? `${finding.jpProjectName} (JP #${finding.jpProjectId})` : finding.jpProjectName}
        />
        {finding.costCodeLabel && (
          <EvidenceRow
            label={finding.recordType === "ap_bill" ? "Vendor" : "Cost code"}
            value={finding.costCodeLabel}
          />
        )}
        <EvidenceRow label="Record" value={recordTypeLabels[finding.recordType]} />
        <EvidenceRow label="Detail" value={finding.detail} />
        {showValues && (
          <EvidenceRow
            label="Values"
            value={
              <span className="tabular-nums">
                {finding.jpValueCents != null && (
                  <>Job Planner {centsToUsd(finding.jpValueCents)}{finding.acuValueCents != null && " · "}</>
                )}
                {finding.acuValueCents != null && <>Acumatica {centsToUsd(finding.acuValueCents)}</>}
                {finding.acumaticaChecked && (
                  <span className="ml-2 text-xs text-muted-foreground">✓ verified against Acumatica ledger</span>
                )}
              </span>
            }
          />
        )}
        <EvidenceRow label="Date" value={`${fmtDate(finding.jpModifiedOn)} (${relativeDays(finding.jpModifiedOn) || "—"})`} />
        {finding.recordType !== "ap_bill" && (
          <EvidenceRow label="Last synced to Acumatica" value={fmtDate(finding.lastSyncedOn)} />
        )}
        {finding.externalId && (
          <EvidenceRow
            label="Acumatica record id"
            value={<code className="break-all text-xs">{finding.externalModel}: {finding.externalId}</code>}
          />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {finding.reviewStatus !== "resolved" ? (
            <Button size="sm" onClick={() => onReview("resolved")} disabled={isUpdating}>
              <Check className="h-4 w-4 mr-2" />
              Mark resolved
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => onReview("open")} disabled={isUpdating}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reopen
            </Button>
          )}
          {finding.reviewStatus === "open" && (
            <Button size="sm" variant="outline" onClick={() => onReview("reviewed")} disabled={isUpdating}>
              Mark reviewed
            </Button>
          )}
        </div>
        <a href={ACUMATICA_PROJECTS_URL} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm" className="w-full justify-start">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Acumatica Projects screen
          </Button>
        </a>
        <p className="text-xs text-muted-foreground">
          Search the Acumatica record id above to find this exact line. Job Planner deep-links are
          pending the JP web address.
        </p>
      </div>
    </div>
  );
}

export default function ReconciliationPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data, isLoading, isFetching, error } = useReconciliationFindings();
  const runScan = useRunReconciliation();
  const resolveFinding = useResolveFinding();
  const [selected, setSelected] = useState<ReconciliationFindingItem | null>(null);

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
      sortBy: "modified",
      sortDirection: "desc",
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
  const generatedAt = data?.generatedAt ? fmtDate(data.generatedAt) : "—";
  const description = summary
    ? `${summary.highCount} high-confidence findings · ${centsToUsd(summary.dollarsAtRiskCents)} at risk · ${summary.projects} projects · verified against Acumatica · scanned ${generatedAt}. Click any row for the evidence.`
    : "Job Planner records that disagree with Acumatica — unlinked, drifted, or mismatched. Click any row for the evidence.";

  const handleFilterChange = (next: Record<string, FilterValue>) => {
    tableState.setSearchParams({
      tier: (next.tier as string) ?? null,
      kind: (next.kind as string) ?? null,
    });
  };

  const handleReview = (status: ReviewStatus) => {
    if (!selected) return;
    resolveFinding.mutate(
      { fingerprint: selected.fingerprint, reviewStatus: status },
      { onSuccess: () => setSelected(null) },
    );
  };

  const scanning = runScan.isPending || isFetching;

  return (
    <>
      <UnifiedTablePage
        header={{
          title: "Reconciliation",
          description,
          actions: (
            <Button size="sm" variant="outline" onClick={() => runScan.mutate()} disabled={scanning}>
              <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
              {runScan.isPending ? "Re-scanning…" : "Re-scan"}
            </Button>
          ),
        }}
        layout={{ fullBleedTable: false, toolbarInlineWithHeader: true }}
        toolbar={{
          totalItems: allFindings.length,
          filteredItems: filteredItems.length,
          searchValue: tableState.searchInput,
          onSearchChange: tableState.setSearchInput,
          searchPlaceholder: "Search by project, cost code, detail…",
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
          onRowClick: (f) => setSelected(f),
        }}
        emptyState={{
          title: "No findings",
          description: "Job Planner and Acumatica are in sync, or no scan has run yet.",
          filteredDescription: "No findings match your current filters.",
          isFiltered: Boolean(tableState.debouncedSearch) || Boolean(activeFilters.tier) || Boolean(activeFilters.kind),
        }}
      />

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <StatusBadge status={tierLabels[selected.tier]} variant={tierVariant[selected.tier]} />
                  {kindLabels[selected.kind]}
                </SheetTitle>
              </SheetHeader>
              <FindingDetail finding={selected} onReview={handleReview} isUpdating={resolveFinding.isPending} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
