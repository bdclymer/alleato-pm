"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Play,
  RefreshCw,
  RotateCw,
  Wrench,
  XCircle,
} from "lucide-react";

import { InfoAlert } from "@/components/ds/InfoAlert";
import { SectionRuleHeading } from "@/components/layout";
import {
  UnifiedTablePage,
  useUnifiedTableState,
  type ColumnConfig,
  type FilterConfig,
  type FilterValue,
  type TableColumn,
} from "@/components/tables/unified";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type StatusMap = Record<string, number>;

interface SourceHealth {
  source: string;
  resourceId: string;
  resourceName: string;
  status: "healthy" | "warning" | "critical" | "unknown";
  lastSyncAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  itemsSynced: number;
  staleMinutes: number | null;
  unprocessedCount: number;
  unembeddedCount: number;
  uncompiledCount: number;
  metadata: Record<string, unknown>;
}

interface SourceSyncAlert {
  severity: string;
  code: string;
  source: string;
  resourceId: string;
  message: string;
  detectedAt: string | null;
}

interface SourceSyncRun {
  id: string;
  source: string;
  stage: string;
  status: string;
  resourceId: string;
  resourceName: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  itemsSeen: number;
  itemsSynced: number;
  itemsFailed: number;
  errorCode: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
}

interface SourceSyncStuckItem {
  source: string;
  resourceId: string;
  resourceName: string;
  stage: string;
  status: string;
  ageMinutes: number | null;
  lastAttemptAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
}

interface SourceSyncStatus {
  status: "healthy" | "degraded";
  healthy: boolean;
  generatedAt: string;
  thresholds: Record<string, number>;
  sources: SourceHealth[];
  pipeline: Record<string, StatusMap>;
  alerts: SourceSyncAlert[];
  recentRuns: SourceSyncRun[];
  stuckItems: SourceSyncStuckItem[];
  counts: {
    sources: number;
    alerts: number;
    documents: number;
    chunks: number;
    unembedded: number;
    uncompiled: number;
    tasks: number;
    graphSubscriptions: number;
    stuckItems: number;
  };
}

interface RecomputeResult {
  status: string;
  updatedSnapshots: number;
}

interface ActionResult {
  label: string;
  payload: unknown;
}

interface OperationsIssue {
  key: string;
  title: string;
  detail: string;
  nextStep: string;
  severity: "critical" | "warning";
  count?: number;
  icon: React.ComponentType<{ className?: string }>;
}

interface AlertGroup {
  key: string;
  title: string;
  meaning: string;
  nextStep: string;
  severity: string;
  count: number;
  latestDetectedAt: string | null;
  examples: SourceSyncAlert[];
}

const PIPELINE_GROUPS: Array<{ key: string; title: string }> = [
  { key: "documentMetadataBySource", title: "Documents by source" },
  { key: "documentMetadataByStatus", title: "Documents by status" },
  { key: "unembeddedBySource", title: "Unembedded by source" },
  { key: "uncompiledBySource", title: "Uncompiled by source" },
  { key: "firefliesJobsByStage", title: "Fireflies stages" },
  { key: "sourceJobsByStatus", title: "Compiler jobs" },
  { key: "packetJobsByStatus", title: "Packet jobs" },
  { key: "tasksBySourceSystem", title: "Tasks by source" },
  { key: "graphSubscriptionsByStatus", title: "Graph subscriptions" },
];

const stuckItemColumnConfig: ColumnConfig[] = [
  { id: "resourceName", label: "Resource name", alwaysVisible: true },
  { id: "source", label: "Source", defaultVisible: true },
  { id: "resourceId", label: "Resource ID", defaultVisible: true },
  { id: "stage", label: "Stage", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "ageMinutes", label: "Age", defaultVisible: true },
  { id: "lastAttemptAt", label: "Last attempt", defaultVisible: true },
  { id: "errorMessage", label: "Error", defaultVisible: true },
];

const stuckItemDefaultVisibleColumns = stuckItemColumnConfig
  .filter((column) => column.defaultVisible || column.alwaysVisible)
  .map((column) => column.id);

const runLedgerColumnConfig: ColumnConfig[] = [
  { id: "run", label: "Run", alwaysVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "finished", label: "Finished", defaultVisible: true },
  { id: "itemsSeen", label: "Seen", defaultVisible: true },
  { id: "itemsSynced", label: "Synced", defaultVisible: true },
  { id: "itemsFailed", label: "Failed", defaultVisible: true },
  { id: "errorMessage", label: "Error", defaultVisible: false },
];

const runLedgerDefaultVisibleColumns = runLedgerColumnConfig
  .filter((column) => column.defaultVisible || column.alwaysVisible)
  .map((column) => column.id);

const sourceHealthColumnConfig: ColumnConfig[] = [
  { id: "source", label: "Source", alwaysVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "lastSyncAt", label: "Last sync", defaultVisible: true },
  { id: "staleMinutes", label: "Age", defaultVisible: true },
  { id: "itemsSynced", label: "Synced", defaultVisible: true },
  { id: "unembeddedCount", label: "Unembedded", defaultVisible: true },
  { id: "uncompiledCount", label: "Uncompiled", defaultVisible: true },
  { id: "lastErrorMessage", label: "Error", defaultVisible: false },
];

const sourceHealthDefaultVisibleColumns = sourceHealthColumnConfig
  .filter((column) => column.defaultVisible || column.alwaysVisible)
  .map((column) => column.id);

function formatDate(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatAge(minutes: number | null): string {
  if (minutes === null) return "Unknown";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours}h ${rest}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const dayHours = hours % 24;
  return dayHours ? `${days}d ${dayHours}h` : `${days}d`;
}

function statusTotal(statuses: StatusMap): number {
  return Object.values(statuses).reduce((total, value) => total + value, 0);
}

function humanizeToken(value: string): string {
  return value.replaceAll("_", " ").replaceAll("-", " ");
}

function normalizeSearchValue(value: string | null | undefined): string {
  return humanizeToken(value ?? "").toLowerCase();
}

function csvEscape(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function shortMessage(value: string | null, maxLength = 220): string | null {
  if (!value) return null;
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > maxLength
    ? `${compact.slice(0, maxLength - 1)}...`
    : compact;
}

function alertExplanation(alert: SourceSyncAlert): {
  title: string;
  meaning: string;
  nextStep: string;
} {
  if (alert.code === "embedding_backlog") {
    return {
      title: "Search index backlog",
      meaning:
        "Some synced files or messages are not searchable yet because embeddings/chunks are missing.",
      nextStep: "Run Embed pending, then refresh this page.",
    };
  }
  if (alert.code === "compiler_backlog") {
    return {
      title: "Project intelligence backlog",
      meaning:
        "Some searchable content has not been turned into project intelligence cards or packets yet.",
      nextStep: "Run Compiler run, then refresh this page.",
    };
  }
  if (alert.code === "packet_refresh_failed") {
    return {
      title: "Packet refresh failure",
      meaning:
        "The project-facing intelligence packet did not refresh cleanly after new signals were found.",
      nextStep:
        "Retry the compiler repair job and inspect packet job errors if it repeats.",
    };
  }
  if (alert.code === "source_sync_stale") {
    const source = humanizeToken(alert.source);
    return {
      title: `${source} has not synced recently`,
      meaning:
        "The source may still have old data, but new emails, files, or messages may be missing.",
      nextStep:
        "Run the matching source sync phase or check that provider's credentials/permissions.",
    };
  }
  if (alert.code === "source_sync_error") {
    return {
      title: "Source sync error",
      meaning:
        "A provider returned an error while we tried to read new source data.",
      nextStep:
        "Open the source row below for the exact provider error, then rerun that source only.",
    };
  }
  if (alert.code === "graph_subscription_removed") {
    return {
      title: "Microsoft webhook subscription issue",
      meaning:
        "Microsoft stopped or missed a Graph subscription, so automatic updates may not arrive.",
      nextStep:
        "Reconcile Graph subscriptions after Microsoft connectivity is stable.",
    };
  }
  return {
    title: humanizeToken(alert.code),
    meaning: alert.message,
    nextStep: "Review the matching source and recent run rows below.",
  };
}

function buildOperationsIssues(status: SourceSyncStatus): OperationsIssue[] {
  const issues: OperationsIssue[] = [];
  const fireflies = status.sources.find(
    (source) => source.source === "fireflies",
  );
  const graph = status.sources.find(
    (source) => source.source === "microsoft_graph",
  );
  const staleSources = status.sources.filter(
    (source) => source.status === "critical" && source.staleMinutes !== null,
  );
  const providerErrors = status.alerts.filter(
    (alert) => alert.code === "source_sync_error",
  );
  const failedRuns = status.recentRuns.filter((run) => run.status === "failed");

  if (status.counts.unembedded > 0) {
    issues.push({
      key: "unembedded",
      title: "Not searchable yet",
      detail: `${status.counts.unembedded.toLocaleString()} synced items are missing searchable chunks or embeddings.`,
      nextStep: "Run Embed pending, then refresh.",
      severity:
        status.counts.unembedded >=
        (status.thresholds.embeddingBacklogWarning ?? 25)
          ? "warning"
          : "warning",
      count: status.counts.unembedded,
      icon: Database,
    });
  }

  if (status.counts.uncompiled > 0) {
    issues.push({
      key: "uncompiled",
      title: "Not in project intelligence yet",
      detail: `${status.counts.uncompiled.toLocaleString()} searchable items have not been compiled into intelligence packets.`,
      nextStep: "Run Compiler run, or use the repair script for stuck jobs.",
      severity: "warning",
      count: status.counts.uncompiled,
      icon: Wrench,
    });
  }

  if (
    fireflies &&
    (fireflies.unembeddedCount > 0 || fireflies.uncompiledCount > 0)
  ) {
    issues.push({
      key: "fireflies",
      title: "Fireflies backlog",
      detail:
        "Meeting/file records are being processed, but the backlog is too large for one manual run.",
      nextStep: "Drain Fireflies in scheduled small batches.",
      severity: fireflies.status === "critical" ? "critical" : "warning",
      count: fireflies.unembeddedCount + fireflies.uncompiledCount,
      icon: FileText,
    });
  }

  if (graph && graph.status !== "healthy") {
    issues.push({
      key: "graph",
      title: "Microsoft sync needs attention",
      detail:
        "Outlook, Teams, OneDrive, or SharePoint may be stale or blocked by Microsoft errors.",
      nextStep:
        "Run Graph phases separately and fix expired tokens or permissions.",
      severity: graph.status === "critical" ? "critical" : "warning",
      count: graph.unembeddedCount + graph.uncompiledCount,
      icon: Mail,
    });
  }

  if (providerErrors.length > 0) {
    issues.push({
      key: "provider-errors",
      title: "Provider errors",
      detail: `${providerErrors.length} source errors are active, mostly provider responses like Microsoft 403/410 or timeouts.`,
      nextStep:
        "Review source errors below; fix permissions or reset expired delta tokens.",
      severity: "critical",
      count: providerErrors.length,
      icon: MessageSquare,
    });
  }

  if (failedRuns.length > 0) {
    issues.push({
      key: "failed-runs",
      title: "Failed recent runs",
      detail: `${failedRuns.length} recent backend runs failed or did not finish cleanly.`,
      nextStep:
        "Retry only the failed source after checking the error message.",
      severity: "critical",
      count: failedRuns.length,
      icon: AlertTriangle,
    });
  }

  if (staleSources.length > 0 && issues.length < 6) {
    issues.push({
      key: "stale-sources",
      title: "Stale source data",
      detail: `${staleSources.length} sources have not checked in recently.`,
      nextStep: "Run the relevant source phase or verify the scheduled job.",
      severity: "critical",
      count: staleSources.length,
      icon: RefreshCw,
    });
  }

  return issues.slice(0, 6);
}

function groupAlerts(alerts: SourceSyncAlert[]): AlertGroup[] {
  const groups = new Map<string, AlertGroup>();

  for (const alert of alerts) {
    const explanation = alertExplanation(alert);
    const key = `${alert.code}:${alert.source}:${explanation.title}`;
    const existing = groups.get(key);

    if (existing) {
      existing.count += 1;
      if (existing.examples.length < 3) existing.examples.push(alert);
      if (
        alert.detectedAt &&
        (!existing.latestDetectedAt ||
          new Date(alert.detectedAt).getTime() >
            new Date(existing.latestDetectedAt).getTime())
      ) {
        existing.latestDetectedAt = alert.detectedAt;
      }
      continue;
    }

    groups.set(key, {
      key,
      title: explanation.title,
      meaning: explanation.meaning,
      nextStep: explanation.nextStep,
      severity: alert.severity,
      count: 1,
      latestDetectedAt: alert.detectedAt,
      examples: [alert],
    });
  }

  return Array.from(groups.values()).sort((a, b) => {
    const severityDelta =
      (b.severity === "critical" ? 1 : 0) - (a.severity === "critical" ? 1 : 0);
    if (severityDelta) return severityDelta;
    return b.count - a.count;
  });
}

function OperationsBrief({ status }: { status: SourceSyncStatus }) {
  const issues = buildOperationsIssues(status);
  const criticalCount = status.alerts.filter(
    (alert) => alert.severity === "critical",
  ).length;
  const warningCount = status.alerts.length - criticalCount;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={status.status} />
            <span className="text-sm text-muted-foreground">
              {criticalCount} critical / {warningCount} warning
            </span>
          </div>
          <p className="text-lg font-semibold text-foreground">
            The system is synced enough to load, but intelligence is behind.
          </p>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            This page is checking whether external sources have been pulled in,
            converted into searchable embeddings, and compiled into project
            intelligence packets. The main issues right now are backlog, stale
            Microsoft sources, and provider errors that need targeted retries
            rather than one giant sync.
          </p>
        </div>
        <div className="rounded-lg bg-muted/25 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Last checked
          </p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {formatDate(status.generatedAt)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Not searchable</p>
              <p className="font-semibold tabular-nums text-foreground">
                {status.counts.unembedded.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Not compiled</p>
              <p className="font-semibold tabular-nums text-foreground">
                {status.counts.uncompiled.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {issues.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {issues.map((issue) => {
            const Icon = issue.icon;
            return (
              <div key={issue.key} className="rounded-lg bg-muted/25 p-4">
                <div className="flex items-start gap-3">
                  <Icon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      issue.severity === "critical"
                        ? "text-destructive"
                        : "text-amber-600",
                    )}
                  />
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {issue.title}
                      </p>
                      {issue.count !== undefined ? (
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {issue.count.toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm leading-5 text-muted-foreground">
                      {issue.detail}
                    </p>
                    <p className="text-xs font-medium text-foreground">
                      {issue.nextStep}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <InfoAlert variant="success">
          No active source sync issues were found.
        </InfoAlert>
      )}
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: SourceHealth["status"] | SourceSyncStatus["status"];
}) {
  const healthy = status === "healthy";
  const critical = status === "critical" || status === "degraded";
  return (
    <Badge
      variant={healthy ? "active" : critical ? "destructive" : "outline"}
      className="gap-1.5 capitalize"
    >
      {healthy ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : critical ? (
        <XCircle className="h-3 w-3" />
      ) : (
        <AlertTriangle className="h-3 w-3" />
      )}
      {status.replace("_", " ")}
    </Badge>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function MetricTiles({ status }: { status: SourceSyncStatus }) {
  const metrics = [
    { label: "Sources", value: status.counts.sources },
    { label: "Active alerts", value: status.counts.alerts },
    { label: "Unembedded", value: status.counts.unembedded },
    { label: "Uncompiled", value: status.counts.uncompiled },
    { label: "Stuck items", value: status.counts.stuckItems },
    { label: "Documents", value: status.counts.documents },
    { label: "Tasks", value: status.counts.tasks },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-lg bg-muted/25 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            {metric.label}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
            {metric.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function statusVariant(status: string): "active" | "destructive" | "outline" {
  if (status === "succeeded" || status === "healthy") return "active";
  if (status === "failed" || status === "critical") return "destructive";
  return "outline";
}

function RunLedgerTable({ runs }: { runs: SourceSyncRun[] }) {
  const [visibleColumns, setVisibleColumns] = React.useState(
    runLedgerDefaultVisibleColumns,
  );
  const [sortBy, setSortBy] = React.useState<string | null>("finished");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(
    "desc",
  );
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(25);

  const columns = React.useMemo<TableColumn<SourceSyncRun>[]>(
    () => [
      {
        id: "run",
        label: "Run",
        alwaysVisible: true,
        sortable: true,
        sortValue: (run) => `${run.source} ${run.stage} ${run.resourceName ?? run.resourceId}`,
        width: 280,
        render: (run) => (
          <span className="block truncate font-medium text-foreground" title={`${humanizeToken(run.source)} / ${humanizeToken(run.stage)}`}>
            {humanizeToken(run.source)} / {humanizeToken(run.stage)}
          </span>
        ),
        csvValue: (run) => `${humanizeToken(run.source)} / ${humanizeToken(run.stage)}`,
      },
      {
        id: "status",
        label: "Status",
        sortable: true,
        sortValue: (run) => run.status,
        width: 140,
        render: (run) => (
          <Badge variant={statusVariant(run.status)} className="capitalize">
            {humanizeToken(run.status)}
          </Badge>
        ),
        csvValue: (run) => humanizeToken(run.status),
      },
      {
        id: "finished",
        label: "Finished",
        sortable: true,
        sortValue: (run) =>
          run.finishedAt || run.startedAt
            ? new Date(run.finishedAt || run.startedAt || "").getTime()
            : 0,
        width: 190,
        render: (run) => (
          <span className="text-muted-foreground">
            {formatDate(run.finishedAt || run.startedAt)}
          </span>
        ),
        csvValue: (run) => formatDate(run.finishedAt || run.startedAt),
      },
      {
        id: "itemsSeen",
        label: "Seen",
        sortable: true,
        sortValue: (run) => run.itemsSeen,
        width: 100,
        render: (run) => (
          <span className="block text-right tabular-nums">{run.itemsSeen}</span>
        ),
        csvValue: (run) => String(run.itemsSeen),
      },
      {
        id: "itemsSynced",
        label: "Synced",
        sortable: true,
        sortValue: (run) => run.itemsSynced,
        width: 110,
        render: (run) => (
          <span className="block text-right tabular-nums">{run.itemsSynced}</span>
        ),
        csvValue: (run) => String(run.itemsSynced),
      },
      {
        id: "itemsFailed",
        label: "Failed",
        sortable: true,
        sortValue: (run) => run.itemsFailed,
        width: 110,
        render: (run) => (
          <span className="block text-right tabular-nums">{run.itemsFailed}</span>
        ),
        csvValue: (run) => String(run.itemsFailed),
      },
      {
        id: "errorMessage",
        label: "Error",
        sortable: true,
        sortValue: (run) => run.errorMessage ?? "",
        width: 360,
        render: (run) => {
          const message = shortMessage(run.errorMessage, 160);
          return (
            <span
              className={cn(
                "block truncate",
                message ? "text-destructive" : "text-muted-foreground",
              )}
              title={run.errorMessage ?? "No error message reported"}
            >
              {message ?? "No error message reported"}
            </span>
          );
        },
        csvValue: (run) => run.errorMessage ?? "",
      },
    ],
    [],
  );

  const handleExport = React.useCallback(() => {
    downloadCsv(
      "source-sync-run-ledger.csv",
      runLedgerColumnConfig.map((column) => column.label),
      runs.map((run) => [
        `${humanizeToken(run.source)} / ${humanizeToken(run.stage)}`,
        humanizeToken(run.status),
        formatDate(run.finishedAt || run.startedAt),
        String(run.itemsSeen),
        String(run.itemsSynced),
        String(run.itemsFailed),
        run.errorMessage ?? "",
      ]),
    );
  }, [runs]);

  const totalPages = Math.max(1, Math.ceil(runs.length / perPage));

  return (
    <UnifiedTablePage
      header={{ title: "", variant: "compact" }}
      toolbar={{
        totalItems: runs.length,
        filteredItems: runs.length,
        selectedCount: 0,
        searchValue: "",
        onSearchChange: () => undefined,
        currentView: "table",
        enabledViews: ["table"],
        onViewChange: () => undefined,
        columns: runLedgerColumnConfig,
        visibleColumns,
        onColumnVisibilityChange: setVisibleColumns,
        onExport: handleExport,
      }}
      data={{ items: runs, isLoading: false, isFetching: false, error: null }}
      table={{
        columns,
        getRowId: (run) => run.id,
        stickyHeader: true,
        density: "compact",
        defaultPinnedLeftColumns: ["run"],
      }}
      sorting={{
        sortBy,
        sortDirection,
        onSortChange: (nextSortBy, nextDirection) => {
          setSortBy(nextSortBy);
          setSortDirection(nextDirection);
          setPage(1);
        },
      }}
      emptyState={{
        title: "No source sync runs",
        description: "No source sync run ledger rows were found.",
        filteredDescription: "No source sync runs match the current table settings.",
        isFiltered: false,
      }}
      pagination={{
        page,
        totalPages,
        perPage,
        onPageChange: setPage,
        onPerPageChange: (value) => {
          setPerPage(Number(value));
          setPage(1);
        },
        clientSide: true,
      }}
      layout={{ fullBleedTable: true }}
      features={{
        enableSearch: false,
        enableViews: false,
        enableFilters: false,
        enableColumnToggle: true,
        enableExport: true,
        enableBulkDelete: false,
        enableRowSelection: false,
        enableRowActions: false,
        enableRowReorder: false,
      }}
    />
  );
}

function StuckItemsTable({ items }: { items: SourceSyncStuckItem[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const tableState = useUnifiedTableState({
    entityKey: "source-sync-stuck-items",
    searchParams,
    pathname,
    router,
    defaults: {
      view: "table",
      allowedViews: ["table"],
      page: 1,
      perPage: 25,
      search: "",
      sortBy: "ageMinutes",
      sortDirection: "desc",
      visibleColumns: stuckItemDefaultVisibleColumns,
      filters: {
        source: undefined,
        stage: undefined,
        status: undefined,
      },
    },
  });

  const filters = React.useMemo<FilterConfig[]>(() => {
    const buildOptions = (key: "source" | "stage" | "status") =>
      Array.from(new Set(items.map((item) => item[key]).filter(Boolean)))
        .sort((a, b) => humanizeToken(a).localeCompare(humanizeToken(b)))
        .map((value) => ({ value, label: humanizeToken(value) }));

    return [
      { id: "source", label: "Source", type: "select", options: buildOptions("source") },
      { id: "stage", label: "Stage", type: "select", options: buildOptions("stage") },
      { id: "status", label: "Status", type: "select", options: buildOptions("status") },
    ];
  }, [items]);

  const filteredItems = React.useMemo(() => {
    const search = normalizeSearchValue(tableState.debouncedSearch);
    const sourceFilter = String(tableState.activeFilters.source ?? "");
    const stageFilter = String(tableState.activeFilters.stage ?? "");
    const statusFilter = String(tableState.activeFilters.status ?? "");

    return items.filter((item) => {
      if (sourceFilter && item.source !== sourceFilter) return false;
      if (stageFilter && item.stage !== stageFilter) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      if (!search) return true;

      const searchable = [
        item.resourceName,
        item.resourceId,
        item.source,
        item.stage,
        item.status,
        item.errorMessage,
      ]
        .map(normalizeSearchValue)
        .join(" ");

      return searchable.includes(search);
    });
  }, [
    items,
    tableState.activeFilters.source,
    tableState.activeFilters.stage,
    tableState.activeFilters.status,
    tableState.debouncedSearch,
  ]);

  const hasActiveFilters = Object.values(tableState.activeFilters).some(Boolean);

  const handleFilterChange = React.useCallback(
    (nextFilters: Record<string, FilterValue>) => {
      tableState.setActiveFilters(nextFilters);
      tableState.setPage(1);
    },
    [tableState],
  );

  const columns = React.useMemo<TableColumn<SourceSyncStuckItem>[]>(
    () => [
      {
        id: "resourceName",
        label: "Resource name",
        alwaysVisible: true,
        sortable: true,
        sortValue: (item) => item.resourceName,
        width: 260,
        render: (item) => (
          <span className="block truncate font-medium text-foreground" title={item.resourceName}>
            {item.resourceName || "Unnamed resource"}
          </span>
        ),
        csvValue: (item) => item.resourceName,
      },
      {
        id: "source",
        label: "Source",
        sortable: true,
        sortValue: (item) => item.source,
        width: 150,
        render: (item) => (
          <span className="capitalize text-muted-foreground">
            {humanizeToken(item.source)}
          </span>
        ),
        csvValue: (item) => humanizeToken(item.source),
      },
      {
        id: "resourceId",
        label: "Resource ID",
        sortable: true,
        sortValue: (item) => item.resourceId,
        width: 240,
        render: (item) => (
          <span className="block truncate font-mono text-xs text-muted-foreground" title={item.resourceId}>
            {item.resourceId}
          </span>
        ),
        csvValue: (item) => item.resourceId,
      },
      {
        id: "stage",
        label: "Stage",
        sortable: true,
        sortValue: (item) => item.stage,
        width: 150,
        render: (item) => (
          <span className="capitalize text-muted-foreground">
            {humanizeToken(item.stage)}
          </span>
        ),
        csvValue: (item) => humanizeToken(item.stage),
      },
      {
        id: "status",
        label: "Status",
        sortable: true,
        sortValue: (item) => item.status,
        width: 140,
        render: (item) => (
          <Badge variant={statusVariant(item.status)} className="capitalize">
            {humanizeToken(item.status)}
          </Badge>
        ),
        csvValue: (item) => humanizeToken(item.status),
      },
      {
        id: "ageMinutes",
        label: "Age",
        sortable: true,
        sortValue: (item) => item.ageMinutes ?? -1,
        width: 110,
        render: (item) => (
          <span className="block text-right tabular-nums text-muted-foreground">
            {formatAge(item.ageMinutes)}
          </span>
        ),
        csvValue: (item) => formatAge(item.ageMinutes),
      },
      {
        id: "lastAttemptAt",
        label: "Last attempt",
        sortable: true,
        sortValue: (item) =>
          item.lastAttemptAt ? new Date(item.lastAttemptAt).getTime() : 0,
        width: 190,
        render: (item) => (
          <span className="text-muted-foreground">
            {formatDate(item.lastAttemptAt)}
          </span>
        ),
        csvValue: (item) => formatDate(item.lastAttemptAt),
      },
      {
        id: "errorMessage",
        label: "Error",
        sortable: true,
        sortValue: (item) => item.errorMessage ?? "",
        width: 360,
        render: (item) => {
          const message = shortMessage(item.errorMessage, 160);
          return (
            <span
              className={cn(
                "block truncate",
                message ? "text-destructive" : "text-muted-foreground",
              )}
              title={item.errorMessage ?? "No error message reported"}
            >
              {message ?? "No error message reported"}
            </span>
          );
        },
        csvValue: (item) => item.errorMessage ?? "",
      },
    ],
    [],
  );

  const handleExport = React.useCallback(() => {
    downloadCsv(
      "source-sync-stuck-items.csv",
      stuckItemColumnConfig.map((column) => column.label),
      filteredItems.map((item) => [
        item.resourceName,
        humanizeToken(item.source),
        item.resourceId,
        humanizeToken(item.stage),
        humanizeToken(item.status),
        formatAge(item.ageMinutes),
        formatDate(item.lastAttemptAt),
        item.errorMessage ?? "",
      ]),
    );
  }, [filteredItems]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / tableState.perPage));

  return (
    <UnifiedTablePage
      header={{ title: "", variant: "compact" }}
      toolbar={{
        totalItems: items.length,
        filteredItems: filteredItems.length,
        selectedCount: 0,
        searchValue: tableState.searchInput,
        onSearchChange: tableState.setSearchInput,
        searchPlaceholder: "Search resource, source, ID, stage, status, or error...",
        currentView: tableState.currentView,
        enabledViews: ["table"],
        onViewChange: (view) => {
          tableState.setCurrentView(view);
          tableState.setSearchParams({ view });
        },
        filters,
        activeFilters: tableState.activeFilters,
        onFilterChange: handleFilterChange,
        onClearFilters: () =>
          handleFilterChange({
            source: undefined,
            stage: undefined,
            status: undefined,
          }),
        columns: stuckItemColumnConfig,
        visibleColumns: tableState.visibleColumns,
        onColumnVisibilityChange: tableState.setVisibleColumns,
        onExport: handleExport,
      }}
      data={{
        items: filteredItems,
        isLoading: false,
        isFetching: false,
        error: null,
      }}
      table={{
        columns,
        getRowId: (item) => `${item.source}:${item.resourceId}:${item.stage}`,
        stickyHeader: true,
        density: "compact",
        defaultPinnedLeftColumns: ["resourceName"],
      }}
      sorting={{
        sortBy: tableState.sortBy,
        sortDirection: tableState.sortDirection,
        onSortChange: (sortBy, direction) => {
          tableState.setSortBy(sortBy);
          tableState.setSortDirection(direction);
          tableState.setSearchParams({
            sort: sortBy,
            sort_dir: direction,
            page: "1",
          });
          tableState.setPage(1);
        },
      }}
      emptyState={{
        title: "No stuck source items",
        description: "No stuck files or messages are currently reported.",
        filteredDescription: "No stuck items match the current search or filters.",
        isFiltered: Boolean(tableState.debouncedSearch) || hasActiveFilters,
      }}
      pagination={{
        page: tableState.page,
        totalPages,
        perPage: tableState.perPage,
        onPageChange: tableState.setPage,
        onPerPageChange: (value) => tableState.setPerPage(Number(value)),
        clientSide: true,
      }}
      layout={{ fullBleedTable: true }}
      features={{
        enableSearch: true,
        enableViews: false,
        enableFilters: true,
        enableColumnToggle: true,
        enableExport: true,
        enableBulkDelete: false,
        enableRowSelection: false,
        enableRowActions: false,
        enableRowReorder: false,
      }}
    />
  );
}

function SourceTable({ sources }: { sources: SourceHealth[] }) {
  const [visibleColumns, setVisibleColumns] = React.useState(
    sourceHealthDefaultVisibleColumns,
  );
  const [sortBy, setSortBy] = React.useState<string | null>("status");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(
    "desc",
  );
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(25);

  const columns = React.useMemo<TableColumn<SourceHealth>[]>(
    () => [
      {
        id: "source",
        label: "Source",
        alwaysVisible: true,
        sortable: true,
        sortValue: (source) => `${source.source} ${source.resourceName}`,
        width: 280,
        render: (source) => (
          <span className="block truncate font-medium text-foreground" title={source.resourceName}>
            {source.resourceName || humanizeToken(source.source)}
          </span>
        ),
        csvValue: (source) => source.resourceName || humanizeToken(source.source),
      },
      {
        id: "status",
        label: "Status",
        sortable: true,
        sortValue: (source) => source.status,
        width: 140,
        render: (source) => <StatusPill status={source.status} />,
        csvValue: (source) => humanizeToken(source.status),
      },
      {
        id: "lastSyncAt",
        label: "Last sync",
        sortable: true,
        sortValue: (source) =>
          source.lastSyncAt ? new Date(source.lastSyncAt).getTime() : 0,
        width: 190,
        render: (source) => (
          <span className="text-muted-foreground">
            {formatDate(source.lastSyncAt)}
          </span>
        ),
        csvValue: (source) => formatDate(source.lastSyncAt),
      },
      {
        id: "staleMinutes",
        label: "Age",
        sortable: true,
        sortValue: (source) => source.staleMinutes ?? -1,
        width: 110,
        render: (source) => (
          <span className="block text-right tabular-nums">
            {formatAge(source.staleMinutes)}
          </span>
        ),
        csvValue: (source) => formatAge(source.staleMinutes),
      },
      {
        id: "itemsSynced",
        label: "Synced",
        sortable: true,
        sortValue: (source) => source.itemsSynced,
        width: 110,
        render: (source) => (
          <span className="block text-right tabular-nums">
            {source.itemsSynced}
          </span>
        ),
        csvValue: (source) => String(source.itemsSynced),
      },
      {
        id: "unembeddedCount",
        label: "Unembedded",
        sortable: true,
        sortValue: (source) => source.unembeddedCount,
        width: 130,
        render: (source) => (
          <span className="block text-right tabular-nums">
            {source.unembeddedCount}
          </span>
        ),
        csvValue: (source) => String(source.unembeddedCount),
      },
      {
        id: "uncompiledCount",
        label: "Uncompiled",
        sortable: true,
        sortValue: (source) => source.uncompiledCount,
        width: 130,
        render: (source) => (
          <span className="block text-right tabular-nums">
            {source.uncompiledCount}
          </span>
        ),
        csvValue: (source) => String(source.uncompiledCount),
      },
      {
        id: "lastErrorMessage",
        label: "Error",
        sortable: true,
        sortValue: (source) => source.lastErrorMessage ?? "",
        width: 360,
        render: (source) => {
          const message = shortMessage(source.lastErrorMessage, 160);
          return (
            <span
              className={cn(
                "block truncate",
                message ? "text-destructive" : "text-muted-foreground",
              )}
              title={source.lastErrorMessage ?? "No error message reported"}
            >
              {message ?? "No error message reported"}
            </span>
          );
        },
        csvValue: (source) => source.lastErrorMessage ?? "",
      },
    ],
    [],
  );

  const handleExport = React.useCallback(() => {
    downloadCsv(
      "source-sync-source-details.csv",
      sourceHealthColumnConfig.map((column) => column.label),
      sources.map((source) => [
        source.resourceName || humanizeToken(source.source),
        humanizeToken(source.status),
        formatDate(source.lastSyncAt),
        formatAge(source.staleMinutes),
        String(source.itemsSynced),
        String(source.unembeddedCount),
        String(source.uncompiledCount),
        source.lastErrorMessage ?? "",
      ]),
    );
  }, [sources]);

  const totalPages = Math.max(1, Math.ceil(sources.length / perPage));

  return (
    <UnifiedTablePage
      header={{ title: "", variant: "compact" }}
      toolbar={{
        totalItems: sources.length,
        filteredItems: sources.length,
        selectedCount: 0,
        searchValue: "",
        onSearchChange: () => undefined,
        currentView: "table",
        enabledViews: ["table"],
        onViewChange: () => undefined,
        columns: sourceHealthColumnConfig,
        visibleColumns,
        onColumnVisibilityChange: setVisibleColumns,
        onExport: handleExport,
      }}
      data={{
        items: sources,
        isLoading: false,
        isFetching: false,
        error: null,
      }}
      table={{
        columns,
        getRowId: (source) => `${source.source}:${source.resourceId}`,
        stickyHeader: true,
        density: "compact",
        defaultPinnedLeftColumns: ["source"],
      }}
      sorting={{
        sortBy,
        sortDirection,
        onSortChange: (nextSortBy, nextDirection) => {
          setSortBy(nextSortBy);
          setSortDirection(nextDirection);
          setPage(1);
        },
      }}
      emptyState={{
        title: "No source health rows",
        description: "No source sync health rows were found.",
        filteredDescription: "No source sync rows match the current table settings.",
        isFiltered: false,
      }}
      pagination={{
        page,
        totalPages,
        perPage,
        onPageChange: setPage,
        onPerPageChange: (value) => {
          setPerPage(Number(value));
          setPage(1);
        },
        clientSide: true,
      }}
      layout={{ fullBleedTable: true }}
      features={{
        enableSearch: false,
        enableViews: false,
        enableFilters: false,
        enableColumnToggle: true,
        enableExport: true,
        enableBulkDelete: false,
        enableRowSelection: false,
        enableRowActions: false,
        enableRowReorder: false,
      }}
    />
  );
}

function AlertList({ alerts }: { alerts: SourceSyncAlert[] }) {
  const groups = groupAlerts(alerts);

  if (alerts.length === 0) {
    return (
      <InfoAlert variant="success">
        No active source, vectorization, compiler, packet, or task extraction
        alerts.
      </InfoAlert>
    );
  }

  return (
    <div className="divide-y divide-border bg-transparent">
      {groups.map((group) => {
        return (
          <div key={group.key} className="py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  group.severity === "critical" ? "destructive" : "outline"
                }
              >
                {group.severity}
              </Badge>
              <span className="text-sm font-medium text-foreground">
                {group.title}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {group.count} {group.count === 1 ? "alert" : "alerts"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(group.latestDetectedAt)}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {group.meaning}
            </p>
            <p className="mt-1 text-xs font-medium text-foreground">
              {group.nextStep}
            </p>
            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer">Show examples</summary>
              <div className="mt-2 space-y-2">
                {group.examples.map((alert) => (
                  <div
                    key={`${alert.code}:${alert.source}:${alert.resourceId}`}
                  >
                    <p className="leading-5">
                      {shortMessage(alert.message, 500)}
                    </p>
                    <p className="mt-1 break-all">
                      {alert.code} / {alert.source} / {alert.resourceId}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          </div>
        );
      })}
    </div>
  );
}

function PipelineCounts({ status }: { status: SourceSyncStatus }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PIPELINE_GROUPS.map((group) => {
        const values = status.pipeline[group.key] ?? {};
        return (
          <div key={group.key} className="space-y-3 rounded-lg bg-muted/25 p-4">
            <div className="flex items-center justify-between gap-3">
              <SectionRuleHeading label={group.title} className="mb-0 pb-0" />
              <span className="text-xs tabular-nums text-muted-foreground">
                {statusTotal(values)}
              </span>
            </div>
            <div className="space-y-2">
              {Object.entries(values).length === 0 ? (
                <p className="text-xs text-muted-foreground">No rows found.</p>
              ) : (
                Object.entries(values).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="capitalize text-muted-foreground">
                      {key.replaceAll("_", " ").replaceAll(":", ": ")}
                    </span>
                    <span className="tabular-nums text-foreground">
                      {value}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SourceSyncHealthPanel() {
  const [status, setStatus] = React.useState<SourceSyncStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [recomputing, setRecomputing] = React.useState(false);
  const [actionRunning, setActionRunning] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [lastRecompute, setLastRecompute] =
    React.useState<RecomputeResult | null>(null);
  const [lastAction, setLastAction] = React.useState<ActionResult | null>(null);

  const loadStatus = React.useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      try {
        const nextStatus = await apiFetch<SourceSyncStatus>(
          "/api/admin/source-sync/status",
        );
        setStatus(nextStatus);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load source sync health.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    void loadStatus("initial");
  }, [loadStatus]);

  const recompute = async () => {
    setRecomputing(true);
    setError(null);
    try {
      const result = await apiFetch<RecomputeResult>(
        "/api/admin/source-sync/recompute",
        {
          method: "POST",
        },
      );
      setLastRecompute(result);
      await loadStatus("refresh");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to recompute source sync health.",
      );
    } finally {
      setRecomputing(false);
    }
  };

  const runAction = async (
    key: "graph-sync" | "graph-embed" | "compiler",
    label: string,
  ) => {
    setActionRunning(key);
    setError(null);
    try {
      const endpoint =
        key === "compiler"
          ? "/api/admin/intelligence-compiler/run"
          : `/api/admin/source-sync/${key}`;
      const body =
        key === "compiler"
          ? {
              sourceLimit: 10,
              packetLimit: 10,
              background: true,
              maxProcessingTimeMs: 120000,
            }
          : key === "graph-embed"
            ? { limit: 100 }
            : key === "graph-sync"
              ? {
                  runEmbedding: false,
                  runTeamsCompiler: false,
                  embedLimit: 100,
                  teamsCompilerBatchSize: 10,
                }
              : undefined;
      const payload = await apiFetch<unknown>(endpoint, {
        method: "POST",
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      setLastAction({ label, payload });
      window.setTimeout(() => {
        void loadStatus("refresh");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : `${label} failed.`);
    } finally {
      setActionRunning(null);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <SectionRuleHeading
                label="Source sync health"
                className="mb-0 pb-0"
              />
              {status ? <StatusPill status={status.status} /> : null}
            </div>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Tracks source freshness, vectorization backlog, task extraction,
              compiler work, and packet readiness from the same operational
              view.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadStatus("refresh")}
              disabled={loading || refreshing || recomputing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void recompute()}
              disabled={loading || refreshing || recomputing}
            >
              {recomputing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCw className="h-4 w-4" />
              )}
              Recompute
            </Button>
          </div>
        </div>

        {error ? <InfoAlert variant="error">{error}</InfoAlert> : null}

        {lastRecompute ? (
          <InfoAlert>
            Recompute {lastRecompute.status}; updated{" "}
            {lastRecompute.updatedSnapshots} source health snapshots.
          </InfoAlert>
        ) : null}

        {lastAction ? (
          <InfoAlert>
            {lastAction.label} started. Result:{" "}
            {typeof lastAction.payload === "object"
              ? JSON.stringify(lastAction.payload)
              : String(lastAction.payload)}
          </InfoAlert>
        ) : null}

        {loading ? (
          <LoadingState />
        ) : status ? (
          <>
            <OperationsBrief status={status} />
            <MetricTiles status={status} />
          </>
        ) : null}
      </section>

      {status ? (
        <>
          <section className="space-y-4">
            <SectionRuleHeading label="Run controls" />
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Use these for targeted retries. Avoid running the full Graph sync
              repeatedly when only one source is failing.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void runAction("graph-sync", "Graph sync")}
                disabled={
                  Boolean(actionRunning) || loading || refreshing || recomputing
                }
              >
                {actionRunning === "graph-sync" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Graph sync
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void runAction("graph-embed", "Embed pending")}
                disabled={
                  Boolean(actionRunning) || loading || refreshing || recomputing
                }
              >
                {actionRunning === "graph-embed" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Embed pending
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void runAction("compiler", "Compiler run")}
                disabled={
                  Boolean(actionRunning) || loading || refreshing || recomputing
                }
              >
                {actionRunning === "compiler" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Compiler run
              </Button>
            </div>
          </section>

          <section className="space-y-4">
            <SectionRuleHeading label="Source details" />
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              A source is stale when it has not checked for new data recently. A
              source error means the provider rejected or timed out during the
              last read.
            </p>
            <SourceTable sources={status.sources} />
          </section>

          <section className="space-y-4">
            <SectionRuleHeading label="Recent sync runs" />
            <RunLedgerTable runs={status.recentRuns} />
          </section>

          <section className="space-y-4">
            <SectionRuleHeading label="Stuck items" />
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              These are individual files or messages that failed, are
              unsupported, or have been sitting in a processing stage too long.
            </p>
            <StuckItemsTable items={status.stuckItems} />
          </section>

          <section className="space-y-4">
            <SectionRuleHeading label="Alerts explained" />
            <AlertList alerts={status.alerts} />
          </section>

          <section className="space-y-4">
            <SectionRuleHeading label="Raw counts" />
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              These are backend counters for debugging. They are useful when
              fixing the system, but the brief above is the decision view.
            </p>
            <PipelineCounts status={status} />
          </section>
        </>
      ) : null}
    </div>
  );
}
