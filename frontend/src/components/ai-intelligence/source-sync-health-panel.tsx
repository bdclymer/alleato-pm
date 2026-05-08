"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Loader2,
  Play,
  RefreshCw,
  RotateCw,
  XCircle,
} from "lucide-react";

import { InfoAlert } from "@/components/ds/InfoAlert";
import { SectionRuleHeading } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

function StatusPill({ status }: { status: SourceHealth["status"] | SourceSyncStatus["status"] }) {
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
          <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
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
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Run</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Finished</TableHead>
          <TableHead className="text-right">Seen</TableHead>
          <TableHead className="text-right">Synced</TableHead>
          <TableHead className="text-right">Failed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
              No source sync run ledger rows found.
            </TableCell>
          </TableRow>
        ) : (
          runs.map((run) => (
            <TableRow key={run.id} className={run.status === "failed" ? "bg-destructive/5" : ""}>
              <TableCell className="max-w-80 whitespace-normal">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {run.source.replaceAll("_", " ")} / {run.stage.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {run.resourceName || run.resourceId}
                  </p>
                  {run.errorMessage ? (
                    <p className="text-xs text-destructive">{run.errorMessage}</p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(run.status)} className="capitalize">
                  {run.status.replaceAll("_", " ")}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(run.finishedAt || run.startedAt)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{run.itemsSeen}</TableCell>
              <TableCell className="text-right tabular-nums">{run.itemsSynced}</TableCell>
              <TableCell className="text-right tabular-nums">{run.itemsFailed}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function StuckItemsTable({ items }: { items: SourceSyncStuckItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead className="text-right">Age</TableHead>
          <TableHead>Last attempt</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
              No stuck source items found.
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow
              key={`${item.source}:${item.resourceId}:${item.stage}`}
              className={item.status === "failed" ? "bg-destructive/5" : "bg-amber-500/5"}
            >
              <TableCell className="max-w-96 whitespace-normal">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{item.resourceName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.source.replaceAll("_", " ")} / {item.resourceId}
                  </p>
                  {item.errorMessage ? (
                    <p className="text-xs text-destructive">{item.errorMessage}</p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(item.status)} className="capitalize">
                  {item.status.replaceAll("_", " ")}
                </Badge>
              </TableCell>
              <TableCell className="capitalize text-sm text-muted-foreground">
                {item.stage.replaceAll("_", " ")}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatAge(item.ageMinutes)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(item.lastAttemptAt)}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function SourceTable({ sources }: { sources: SourceHealth[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Source</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last sync</TableHead>
          <TableHead className="text-right">Age</TableHead>
          <TableHead className="text-right">Synced</TableHead>
          <TableHead className="text-right">Unembedded</TableHead>
          <TableHead className="text-right">Uncompiled</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sources.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
              No source health rows found.
            </TableCell>
          </TableRow>
        ) : (
          sources.map((source) => (
            <TableRow
              key={`${source.source}:${source.resourceId}`}
              className={cn(
                source.status === "critical" && "bg-destructive/5",
                source.status === "warning" && "bg-amber-500/5",
              )}
            >
              <TableCell className="max-w-64 whitespace-normal">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{source.resourceName}</p>
                  <p className="text-xs text-muted-foreground">
                    {source.source.replaceAll("_", " ")} / {source.resourceId}
                  </p>
                  {source.lastErrorMessage ? (
                    <p className="text-xs text-destructive">{source.lastErrorMessage}</p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <StatusPill status={source.status} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(source.lastSyncAt)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatAge(source.staleMinutes)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{source.itemsSynced}</TableCell>
              <TableCell className="text-right tabular-nums">{source.unembeddedCount}</TableCell>
              <TableCell className="text-right tabular-nums">{source.uncompiledCount}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function AlertList({ alerts }: { alerts: SourceSyncAlert[] }) {
  if (alerts.length === 0) {
    return (
      <InfoAlert variant="success">
        No active source, vectorization, compiler, packet, or task extraction alerts.
      </InfoAlert>
    );
  }

  return (
    <div className="divide-y divide-border rounded-lg bg-muted/20">
      {alerts.map((alert) => (
        <div key={`${alert.code}:${alert.source}:${alert.resourceId}`} className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={alert.severity === "critical" ? "destructive" : "outline"}>
              {alert.severity}
            </Badge>
            <span className="text-sm font-medium text-foreground">{alert.code}</span>
            <span className="text-xs text-muted-foreground">{formatDate(alert.detectedAt)}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{alert.message}</p>
        </div>
      ))}
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
                  <div key={key} className="flex items-center justify-between gap-3 text-xs">
                    <span className="capitalize text-muted-foreground">
                      {key.replaceAll("_", " ").replaceAll(":", ": ")}
                    </span>
                    <span className="tabular-nums text-foreground">{value}</span>
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
  const [lastRecompute, setLastRecompute] = React.useState<RecomputeResult | null>(null);
  const [lastAction, setLastAction] = React.useState<ActionResult | null>(null);

  const loadStatus = React.useCallback(async (mode: "initial" | "refresh" = "refresh") => {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);
    setError(null);
    try {
      const nextStatus = await apiFetch<SourceSyncStatus>("/api/admin/source-sync/status");
      setStatus(nextStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load source sync health.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void loadStatus("initial");
  }, [loadStatus]);

  const recompute = async () => {
    setRecomputing(true);
    setError(null);
    try {
      const result = await apiFetch<RecomputeResult>("/api/admin/source-sync/recompute", {
        method: "POST",
      });
      setLastRecompute(result);
      await loadStatus("refresh");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to recompute source sync health.");
    } finally {
      setRecomputing(false);
    }
  };

  const runAction = async (key: "graph-sync" | "graph-embed" | "compiler", label: string) => {
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
              <SectionRuleHeading label="Source sync health" className="mb-0 pb-0" />
              {status ? <StatusPill status={status.status} /> : null}
            </div>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Tracks source freshness, vectorization backlog, task extraction, compiler work, and
              packet readiness from the same operational view.
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
            Recompute {lastRecompute.status}; updated {lastRecompute.updatedSnapshots} source
            health snapshots.
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
            <div className="rounded-lg bg-muted/25 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4" />
                <span>Generated {formatDate(status.generatedAt)}</span>
                <span>/</span>
                <span>Sync stale after {status.thresholds.staleSyncMinutes} minutes</span>
                <span>/</span>
                <span>Fireflies stale after {status.thresholds.staleFirefliesMinutes} minutes</span>
              </div>
            </div>
            <MetricTiles status={status} />
          </>
        ) : null}
      </section>

      {status ? (
        <>
          <section className="space-y-4">
            <SectionRuleHeading label="Manual actions" />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void runAction("graph-sync", "Graph sync")}
                disabled={Boolean(actionRunning) || loading || refreshing || recomputing}
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
                disabled={Boolean(actionRunning) || loading || refreshing || recomputing}
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
                disabled={Boolean(actionRunning) || loading || refreshing || recomputing}
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
            <SectionRuleHeading label="Source freshness" />
            <SourceTable sources={status.sources} />
          </section>

          <section className="space-y-4">
            <SectionRuleHeading label="Recent sync runs" />
            <RunLedgerTable runs={status.recentRuns} />
          </section>

          <section className="space-y-4">
            <SectionRuleHeading label="Stuck items" />
            <StuckItemsTable items={status.stuckItems} />
          </section>

          <section className="space-y-4">
            <SectionRuleHeading label="Active alerts" />
            <AlertList alerts={status.alerts} />
          </section>

          <section className="space-y-4">
            <SectionRuleHeading label="Pipeline counts" />
            <PipelineCounts status={status} />
          </section>
        </>
      ) : null}
    </div>
  );
}
