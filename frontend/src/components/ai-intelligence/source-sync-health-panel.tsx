"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileText,
  Info,
  Loader2,
  Mail,
  MessageSquare,
  Play,
  RefreshCw,
  RotateCw,
  Sparkles,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

type RagLifecycleStageKey =
  | "synced"
  | "vectorized"
  | "projectAssigned"
  | "tasksExtracted"
  | "projectIntelligenceUpdated";

interface RagLifecycleStage {
  key: RagLifecycleStageKey;
  label: string;
  status: "healthy" | "warning" | "critical" | "unknown";
  count: number;
  total: number;
  latestAt: string | null;
  message: string;
  ownerHint: string;
}

interface RagLifecycleSource {
  key: "meetings" | "teams" | "emails" | "sharepoint";
  label: string;
  sourceSystems: string[];
  totalSources: number;
  latestSourceAt: string | null;
  status: "healthy" | "warning" | "critical" | "unknown";
  stages: RagLifecycleStage[];
  alerts: SourceSyncAlert[];
}

interface RagLifecycleNotification {
  status: "sent" | "ready" | "blocked" | "failed" | "skipped";
  channel: string;
  message: string;
  checkedAt: string;
}

interface RagLifecycleStatus {
  generatedAt: string;
  lookbackHours: number;
  maxPacketAgeHours: number;
  status: "healthy" | "degraded" | "unavailable";
  sources: RagLifecycleSource[];
  notifications: RagLifecycleNotification[];
}

interface SourceSyncStatus {
  status: "healthy" | "degraded" | "unavailable";
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
  ragLifecycle?: RagLifecycleStatus;
}

interface RecomputeResult {
  status: string;
  updatedSnapshots: number;
}

interface ActionResult {
  label: string;
  payload: unknown;
}

interface ActionPayload {
  status?: string;
  message?: string;
  nextStep?: string;
  timeoutMs?: number;
  requested?: Record<string, unknown>;
}

interface ProjectIntelligenceSummary {
  schema: "project_intelligence_summary_v1";
  model: string;
  sourceCount: number;
  sourceIds: string[];
  headline: string;
  context: string;
  risks: Array<{
    title: string;
    severity: "low" | "medium" | "high" | "critical";
    recommendedAction: string;
    sourceIds: string[];
  }>;
  decisions: Array<{
    title: string;
    owner: string | null;
    followUp: string | null;
    sourceIds: string[];
  }>;
  actionItems: Array<{
    title: string;
    owner: string | null;
    dueDate: string | null;
    priority: "low" | "medium" | "high" | "critical";
    sourceIds: string[];
  }>;
  dataGaps: string[];
  confidence: "low" | "medium" | "high";
}

interface SourceSyncAiBriefSnapshot {
  id: string;
  generatedAt: string;
  sourceCount: number;
}

interface SourceSyncAiBriefSnapshotListItem extends SourceSyncAiBriefSnapshot {
  headline: string | null;
  context: string | null;
  confidence: "low" | "medium" | "high" | null;
  healthStatus: string | null;
  model: string | null;
  risks: Array<{
    title: string;
    severity: string | null;
    recommendedAction: string | null;
  }>;
  actionItems: Array<{
    title: string;
    owner: string | null;
    dueDate: string | null;
    priority: string | null;
  }>;
  dataGaps: string[];
}

interface SourceSyncAiBriefResponse {
  summary: ProjectIntelligenceSummary;
  snapshot: SourceSyncAiBriefSnapshot;
}

interface SourceSyncAiBriefSnapshotsResponse {
  snapshots: SourceSyncAiBriefSnapshotListItem[];
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
  { key: "graphProjectDocumentPromotion", title: "Project document promotion" },
];

const FIREFLIES_STAGE_ORDER = [
  "raw_ingested",
  "chunked",
  "embedded",
  "done",
  "error",
];

const FIREFLIES_STAGE_DETAILS: Record<string, string> = {
  raw_ingested:
    "The Fireflies record has been captured from the source, but text extraction and downstream processing are not complete yet.",
  chunked:
    "The source text has been split into searchable chunks. This comes before embedding.",
  embedded:
    "Chunks have vector embeddings, so they can be found by semantic search. This does not always mean the whole job is finished.",
  done: "The Fireflies job completed all expected processing steps for that record.",
  error:
    "Processing failed and needs investigation or retry before the record can finish.",
};

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

function normalizePipelineKey(value: string): string {
  return value.trim().toLowerCase().replaceAll(" ", "_").replaceAll("-", "_");
}

function formatPipelineLabel(value: string): string {
  return value.replaceAll("_", " ").replaceAll(":", ": ");
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
  const primaryIssue = issues[0];
  const priorityIssues = issues.slice(0, 3);
  const nextSteps = priorityIssues.map((issue) => issue.nextStep);
  const ragLifecycle = status.ragLifecycle;
  const ragBlockers =
    ragLifecycle?.sources.flatMap((source) =>
      source.stages
        .filter((stage) => stage.status === "critical" || stage.status === "warning")
        .map((stage) => ({ source, stage })),
    ) ?? [];
  const statusSummary =
    status.status === "healthy" && ragLifecycle?.status !== "degraded"
      ? "Sources are current and intelligence is ready."
      : ragLifecycle?.status === "degraded"
        ? "RAG lifecycle is degraded. Synced content exists, but some sources are not fully searchable, assigned, task-checked, or reflected in Project Intelligence."
        : "Source sync is degraded. Some provider or processing work still needs attention.";
  const keyCounts = [
    { label: "Not searchable", value: status.counts.unembedded },
    { label: "Not compiled", value: status.counts.uncompiled },
    { label: "Stuck items", value: status.counts.stuckItems },
    { label: "Documents", value: status.counts.documents },
  ];

  return (
    <div className="space-y-3 border-y border-border/60 py-4">
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-medium text-foreground">{statusSummary}</p>
        {ragBlockers.length > 0 ? (
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Main blocker:{" "}
            <span className="font-medium text-foreground">
              {ragBlockers[0].source.label} / {ragBlockers[0].stage.label}
            </span>
            . {ragBlockers[0].stage.message}
          </p>
        ) : primaryIssue ? (
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Main blocker:{" "}
            <span className="font-medium text-foreground">
              {primaryIssue.title}
            </span>
            . {primaryIssue.detail}
          </p>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            No active source sync issues were found.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        {keyCounts.map((metric) => (
          <div key={metric.label} className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground">
              {metric.label}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {metric.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {nextSteps.length > 0 ? (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 border-t border-border/60 pt-3 text-sm">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            Fix next
          </span>
          <span className="font-medium text-foreground">
            {nextSteps.join(" ")}
          </span>
        </div>
      ) : (
        <InfoAlert variant="success">
          No active source sync issues were found.
        </InfoAlert>
      )}
    </div>
  );
}

function isActionPayload(value: unknown): value is ActionPayload {
  return Boolean(value && typeof value === "object");
}

function ActionResultAlert({ action }: { action: ActionResult }) {
  const payload = isActionPayload(action.payload) ? action.payload : null;
  const accepted = payload?.status === "accepted";
  const requested = payload?.requested;

  return (
    <InfoAlert variant={accepted ? "success" : "info"} role="status">
      <div className="space-y-2">
        <p className="font-medium text-foreground">
          {accepted ? `${action.label} was accepted` : `${action.label} finished`}
        </p>
        <p>
          {payload?.message ??
            "The action returned successfully. Refresh the dashboard to read the latest lifecycle state."}
        </p>
        {payload?.nextStep ? (
          <p className="text-xs font-medium">{payload.nextStep}</p>
        ) : null}
        {requested ? (
          <details className="text-xs">
            <summary className="cursor-pointer font-medium">
              Show run details
            </summary>
            <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
              {Object.entries(requested).map(([key, value]) => (
                <React.Fragment key={key}>
                  <dt className="text-muted-foreground">{humanizeToken(key)}</dt>
                  <dd className="font-mono">{String(value)}</dd>
                </React.Fragment>
              ))}
              {payload?.timeoutMs ? (
                <>
                  <dt className="text-muted-foreground">Dashboard wait window</dt>
                  <dd className="font-mono">{payload.timeoutMs}ms</dd>
                </>
              ) : null}
            </dl>
          </details>
        ) : null}
      </div>
    </InfoAlert>
  );
}

function AiOperationsSummary({
  summary,
  snapshot,
}: {
  summary: ProjectIntelligenceSummary;
  snapshot: SourceSyncAiBriefSnapshot | null;
}) {
  return (
    <div className="space-y-3 border-t border-border/60 pt-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium text-foreground">
            {summary.headline}
          </p>
          <Badge variant="outline" className="capitalize">
            {summary.confidence} confidence
          </Badge>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {summary.context}
        </p>
      </div>

      {summary.actionItems.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            AI next actions
          </p>
          <div className="divide-y divide-border/60">
            {summary.actionItems.slice(0, 4).map((item) => (
              <div key={item.title} className="py-2 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-medium text-foreground">
                    {item.title}
                  </span>
                  {item.owner ? (
                    <span className="text-xs text-muted-foreground">
                      Owner: {item.owner}
                    </span>
                  ) : null}
                  {item.dueDate ? (
                    <span className="text-xs text-muted-foreground">
                      Due: {item.dueDate}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        AI brief used {summary.sourceCount} source sync records
        {snapshot
          ? ` and was saved as operations snapshot ${snapshot.id} at ${formatDate(snapshot.generatedAt)}.`
          : "."}
      </p>
    </div>
  );
}

function RecentAiBriefSnapshots({
  snapshots,
  error,
}: {
  snapshots: SourceSyncAiBriefSnapshotListItem[];
  error: string | null;
}) {
  if (!error && snapshots.length === 0) return null;

  return (
    <div className="space-y-3 border-t border-border/60 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Recent AI briefs
        </p>
        <span className="text-xs text-muted-foreground">
          {snapshots.length} saved
        </span>
      </div>

      {error ? <InfoAlert variant="error">{error}</InfoAlert> : null}

      {snapshots.length > 0 ? (
        <div className="divide-y divide-border/60">
          {snapshots.map((snapshot) => (
            <details key={snapshot.id} className="group py-2 text-sm">
              <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium text-foreground">
                    {snapshot.headline ?? "Source sync AI brief"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {snapshot.sourceCount} records ·{" "}
                    {snapshot.model ?? "model unknown"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {snapshot.confidence ? (
                    <Badge variant="outline" className="capitalize">
                      {snapshot.confidence}
                    </Badge>
                  ) : null}
                  {snapshot.healthStatus ? (
                    <span className="capitalize">{snapshot.healthStatus}</span>
                  ) : null}
                  <span>{formatDate(snapshot.generatedAt)}</span>
                </div>
              </summary>

              <div className="space-y-3 pt-3 text-sm">
                {snapshot.context ? (
                  <p className="max-w-3xl leading-6 text-muted-foreground">
                    {snapshot.context}
                  </p>
                ) : null}

                {snapshot.actionItems.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Actions
                    </p>
                    <div className="space-y-1">
                      {snapshot.actionItems.map((item) => (
                        <div key={item.title} className="text-sm">
                          <span className="font-medium text-foreground">
                            {item.title}
                          </span>
                          {item.owner || item.dueDate || item.priority ? (
                            <span className="text-muted-foreground">
                              {" "}
                              {[
                                item.owner ? `Owner: ${item.owner}` : null,
                                item.dueDate ? `Due: ${item.dueDate}` : null,
                                item.priority ? `Priority: ${item.priority}` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {snapshot.risks.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Risks
                    </p>
                    <div className="space-y-1">
                      {snapshot.risks.map((risk) => (
                        <div key={risk.title} className="text-sm">
                          <span className="font-medium text-foreground">
                            {risk.title}
                          </span>
                          {risk.recommendedAction ? (
                            <span className="text-muted-foreground">
                              {" "}
                              {risk.recommendedAction}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {snapshot.dataGaps.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Data gaps
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {snapshot.dataGaps.join(" ")}
                    </p>
                  </div>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      ) : null}
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

function lifecycleBadgeVariant(
  status: RagLifecycleStage["status"] | RagLifecycleSource["status"],
): "active" | "destructive" | "outline" {
  if (status === "healthy") return "active";
  if (status === "critical") return "destructive";
  return "outline";
}

function LifecycleStageCell({ stage }: { stage: RagLifecycleStage }) {
  const missing = Math.max(stage.total - stage.count, 0);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="min-w-36 space-y-1">
          <div className="flex items-center gap-2">
            <Badge
              variant={lifecycleBadgeVariant(stage.status)}
              className="capitalize"
            >
              {humanizeToken(stage.status)}
            </Badge>
            <span className="text-xs tabular-nums text-muted-foreground">
              {stage.count}/{stage.total}
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {missing > 0 ? `${missing} remaining` : formatDate(stage.latestAt)}
          </p>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <div className="space-y-1 text-xs">
          <p className="font-medium">{stage.message}</p>
          <p>Owner: {stage.ownerHint}</p>
          <p>Latest: {formatDate(stage.latestAt)}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function RagLifecycleBlockers({
  lifecycle,
}: {
  lifecycle: RagLifecycleStatus;
}) {
  const blockers = lifecycle.sources
    .flatMap((source) =>
      source.stages
        .filter((stage) => stage.status === "critical" || stage.status === "warning")
        .map((stage) => ({
          source,
          stage,
          missing: Math.max(stage.total - stage.count, 0),
        })),
    )
    .sort((a, b) => {
      const severityDelta =
        (b.stage.status === "critical" ? 1 : 0) -
        (a.stage.status === "critical" ? 1 : 0);
      if (severityDelta) return severityDelta;
      return b.missing - a.missing;
    })
    .slice(0, 6);

  if (blockers.length === 0) {
    return (
      <InfoAlert variant="success">
        All required RAG lifecycle stages are healthy for the current window.
      </InfoAlert>
    );
  }

  return (
    <div className="space-y-3 border-y border-border/60 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <SectionRuleHeading label="What needs attention" className="mb-0 pb-0" />
        <span className="text-xs text-muted-foreground">
          Ordered by severity and missing rows
        </span>
      </div>
      <div className="divide-y divide-border/60">
        {blockers.map(({ source, stage, missing }) => (
          <div
            key={`${source.key}:${stage.key}`}
            className="grid gap-2 py-3 text-sm md:grid-cols-[220px_1fr_150px]"
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground">{source.label}</p>
              <p className="text-xs text-muted-foreground">{stage.label}</p>
            </div>
            <p className="leading-6 text-muted-foreground">{stage.message}</p>
            <div className="text-left md:text-right">
              <Badge
                variant={lifecycleBadgeVariant(stage.status)}
                className="capitalize"
              >
                {stage.count}/{stage.total}
              </Badge>
              <p className="mt-1 text-xs text-muted-foreground">
                {missing} remaining · {stage.ownerHint}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RagLifecycleMatrix({
  lifecycle,
}: {
  lifecycle: RagLifecycleStatus | undefined;
}) {
  if (!lifecycle) {
    return (
      <InfoAlert variant="error">
        Daily RAG lifecycle status was not returned by the source-sync API.
      </InfoAlert>
    );
  }

  const notification = lifecycle.notifications[0] ?? null;
  const stageLabels =
    lifecycle.sources[0]?.stages.map((stage) => ({
      key: stage.key,
      label: stage.label,
    })) ?? [];

  return (
      <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <SectionRuleHeading label="Daily RAG trust" className="mb-0 pb-0" />
          <p className="text-sm text-muted-foreground">
            Last {lifecycle.lookbackHours} hours · packet freshness threshold{" "}
            {lifecycle.maxPacketAgeHours} hours
          </p>
        </div>
        <StatusPill status={lifecycle.status} />
      </div>

      <RagLifecycleBlockers lifecycle={lifecycle} />

      <div className="overflow-x-auto rounded-md border border-border/70">
        <table className="min-w-full divide-y divide-border/70 text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium">
                Source
              </th>
              {stageLabels.map((stage) => (
                <th
                  key={stage.key}
                  className="whitespace-nowrap px-3 py-2 text-left font-medium"
                >
                  {stage.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {lifecycle.sources.map((source) => (
              <tr key={source.key} className="align-top">
                <th className="w-52 px-3 py-3 text-left font-medium">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span>{source.label}</span>
                      <Badge
                        variant={lifecycleBadgeVariant(source.status)}
                        className="capitalize"
                      >
                        {humanizeToken(source.status)}
                      </Badge>
                    </div>
                    <p className="text-xs font-normal text-muted-foreground">
                      {source.totalSources} source rows · newest{" "}
                      {formatDate(source.latestSourceAt)}
                    </p>
                  </div>
                </th>
                {source.stages.map((stage) => (
                  <td key={stage.key} className="px-3 py-3">
                    <LifecycleStageCell stage={stage} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {notification ? (
        <InfoAlert
          variant={
            notification.status === "ready" ||
            notification.status === "blocked" ||
            notification.status === "failed"
              ? "warning"
              : "success"
          }
        >
          <span className="font-medium">Notification {notification.status}.</span>{" "}
          {notification.message}
        </InfoAlert>
      ) : null}
    </div>
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
        align: "right",
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
        align: "right",
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
        align: "right",
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
      header={{ title: "Recent sync runs", variant: "compact" }}
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
      layout={{
        fullBleedTable: true,
        alignHeaderWithFullBleedTable: true,
        toolbarInlineWithHeader: true,
        containerPadding: false,
      }}
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
        align: "right",
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
      header={{ title: "Stuck items", variant: "compact" }}
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
      layout={{
        fullBleedTable: true,
        alignHeaderWithFullBleedTable: true,
        toolbarInlineWithHeader: true,
        containerPadding: false,
      }}
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
        align: "right",
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
        align: "right",
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
        align: "right",
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
        align: "right",
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
      header={{ title: "Source details", variant: "compact" }}
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
      layout={{
        fullBleedTable: true,
        alignHeaderWithFullBleedTable: true,
        toolbarInlineWithHeader: true,
        containerPadding: false,
      }}
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

function orderedPipelineEntries(
  groupKey: string,
  values: StatusMap,
): Array<[string, number]> {
  const entries = Object.entries(values);
  if (groupKey !== "firefliesJobsByStage") return entries;

  return entries.sort(([left], [right]) => {
    const leftIndex = FIREFLIES_STAGE_ORDER.indexOf(normalizePipelineKey(left));
    const rightIndex = FIREFLIES_STAGE_ORDER.indexOf(
      normalizePipelineKey(right),
    );
    const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const normalizedRight =
      rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
    if (normalizedLeft !== normalizedRight) {
      return normalizedLeft - normalizedRight;
    }
    return left.localeCompare(right);
  });
}

function PipelineCountLabel({
  groupKey,
  label,
}: {
  groupKey: string;
  label: string;
}) {
  const detail =
    groupKey === "firefliesJobsByStage"
      ? FIREFLIES_STAGE_DETAILS[normalizePipelineKey(label)]
      : undefined;
  const formattedLabel = formatPipelineLabel(label);

  if (!detail) {
    return (
      <span className="capitalize text-muted-foreground">{formattedLabel}</span>
    );
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
      <span className="capitalize">{formattedLabel}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="size-4 rounded-full p-0 text-muted-foreground hover:bg-transparent hover:text-foreground focus-visible:ring-1"
            aria-label={`${formattedLabel} meaning`}
          >
            <Info className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-72">
          {detail}
        </TooltipContent>
      </Tooltip>
    </span>
  );
}

function PipelineCounts({ status }: { status: SourceSyncStatus }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PIPELINE_GROUPS.map((group) => {
        // pipeline values are usually a Record<string, number> breakdown, but
        // some entries are scalar counts. Every PIPELINE_GROUPS key is a
        // breakdown map; narrow defensively so a scalar can never throw here.
        const raw = status.pipeline[group.key];
        const values: StatusMap =
          raw && typeof raw === "object" ? raw : {};
        const entries = orderedPipelineEntries(group.key, values);
        return (
          <div key={group.key} className="space-y-3 rounded-lg bg-muted/25 p-4">
            <div className="flex items-center justify-between gap-3">
              <SectionRuleHeading label={group.title} className="mb-0 pb-0" />
              <span className="text-xs tabular-nums text-muted-foreground">
                {statusTotal(values)}
              </span>
            </div>
            <div className="space-y-2">
              {entries.length === 0 ? (
                <p className="text-xs text-muted-foreground">No rows found.</p>
              ) : (
                entries.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <PipelineCountLabel groupKey={group.key} label={key} />
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
  const [aiSummary, setAiSummary] =
    React.useState<ProjectIntelligenceSummary | null>(null);
  const [aiSummarySnapshot, setAiSummarySnapshot] =
    React.useState<SourceSyncAiBriefSnapshot | null>(null);
  const [recentAiBriefSnapshots, setRecentAiBriefSnapshots] = React.useState<
    SourceSyncAiBriefSnapshotListItem[]
  >([]);
  const [recentAiBriefError, setRecentAiBriefError] = React.useState<
    string | null
  >(null);
  const [summarizing, setSummarizing] = React.useState(false);
  const criticalAlertCount =
    status?.alerts.filter((alert) => alert.severity === "critical").length ?? 0;
  const warningAlertCount = status
    ? status.alerts.length - criticalAlertCount
    : 0;

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

  const loadRecentAiBriefSnapshots = React.useCallback(async () => {
    try {
      const result = await apiFetch<SourceSyncAiBriefSnapshotsResponse>(
        "/api/admin/source-sync/summary",
      );
      setRecentAiBriefSnapshots(result.snapshots);
      setRecentAiBriefError(null);
    } catch (err) {
      setRecentAiBriefError(
        err instanceof Error
          ? err.message
          : "Failed to load recent source sync AI briefs.",
      );
    }
  }, []);

  React.useEffect(() => {
    void loadStatus("initial");
    void loadRecentAiBriefSnapshots();
  }, [loadRecentAiBriefSnapshots, loadStatus]);

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

  const generateAiSummary = async () => {
    setSummarizing(true);
    setError(null);
    try {
      const result = await apiFetch<SourceSyncAiBriefResponse>(
        "/api/admin/source-sync/summary",
        {
          method: "POST",
        },
      );
      setAiSummary(result.summary);
      setAiSummarySnapshot(result.snapshot);
      await loadRecentAiBriefSnapshots();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate source sync AI brief.",
      );
    } finally {
      setSummarizing(false);
    }
  };

  const runAction = async (
    key: "graph-sync" | "graph-embed",
    label: string,
  ) => {
    setActionRunning(key);
    setError(null);
    try {
      const endpoint = `/api/admin/source-sync/${key}`;
      const body =
        key === "graph-embed"
            ? { limit: 100 }
            : key === "graph-sync"
              ? {
                  runOutlook: true,
                  runTeams: true,
                  runOneDrive: false,
                  runEmbedding: false,
                  runTeamsCompiler: false,
                  embedLimit: 25,
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
      {status ? (
        <p className="text-sm text-muted-foreground">
          Last checked {formatDate(status.generatedAt)} · {criticalAlertCount}{" "}
          critical / {warningAlertCount} warning
        </p>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <SectionRuleHeading
              label="Source sync health"
              className="mb-0 pb-0"
            />
            {status ? <StatusPill status={status.status} /> : null}
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
              disabled={loading || refreshing || recomputing || summarizing}
            >
              {recomputing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCw className="h-4 w-4" />
              )}
              Recompute
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void generateAiSummary()}
              disabled={loading || refreshing || recomputing || summarizing}
            >
              {summarizing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              AI brief
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

        {lastAction ? <ActionResultAlert action={lastAction} /> : null}

        {loading ? (
          <LoadingState />
        ) : status ? (
          <div className="space-y-4">
            <OperationsBrief status={status} />
            <RagLifecycleMatrix lifecycle={status.ragLifecycle} />
              {aiSummary ? (
                <AiOperationsSummary
                  summary={aiSummary}
                  snapshot={aiSummarySnapshot}
                />
              ) : null}
              <RecentAiBriefSnapshots
                snapshots={recentAiBriefSnapshots}
                error={recentAiBriefError}
              />
          </div>
        ) : (
          <RecentAiBriefSnapshots
            snapshots={recentAiBriefSnapshots}
            error={recentAiBriefError}
          />
        )}
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
            </div>
          </section>

          <section className="space-y-4">
            <SourceTable sources={status.sources} />
          </section>

          <section className="space-y-4">
            <RunLedgerTable runs={status.recentRuns} />
          </section>

          <section className="space-y-4">
            <StuckItemsTable items={status.stuckItems} />
          </section>

          <section className="space-y-4">
            <SectionRuleHeading label="Alerts explained" />
            <AlertList alerts={status.alerts} />
          </section>

          <section className="space-y-3">
            <SectionRuleHeading label="Raw counts" />
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              These are backend counters for debugging. They are useful when
              fixing the system, but the brief above is the decision view.
            </p>
            <div className="pt-1">
              <PipelineCounts status={status} />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
