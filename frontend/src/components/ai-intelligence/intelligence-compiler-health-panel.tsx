"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Play,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { InfoAlert } from "@/components/ds/InfoAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionRuleHeading } from "@/components/layout";
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

interface IntelligenceCompilerStatus {
  status: "healthy" | "unhealthy";
  healthy: boolean;
  thresholds: Record<string, number>;
  counts: {
    sourceJobsByStatus: StatusMap;
    packetJobsByStatus: StatusMap;
    sourceSignalCandidatesByStatus: StatusMap;
    insightCards: number;
    currentPackets: number;
  };
  checks: Record<string, number>;
  unhealthyChecks: Record<string, number>;
  generatedAt: string;
}

interface RunResult {
  job_id: string;
  status: string;
  results?: Record<string, unknown>;
}

const CHECK_LABELS: Record<string, string> = {
  sourceStaleQueued: "Source jobs queued too long",
  packetStaleQueued: "Packet refresh jobs queued too long",
  sourceStaleRunning: "Source jobs running too long",
  packetStaleRunning: "Packet refresh jobs running too long",
  sourceRecentFailed: "Recent source job failures",
  packetRecentFailed: "Recent packet job failures",
  highConfidenceUnpromoted: "High-confidence candidates not promoted",
  promotedWithoutCard: "Promoted candidates missing cards",
  promotedWithoutEvidence: "Promoted candidates missing evidence",
  activeCardsMissingCurrentPacket: "Active cards missing from current packets",
  succeededPacketJobsWithoutOutput: "Succeeded packet jobs missing output packet",
};

const COUNT_GROUPS: Array<{
  title: string;
  getValue: (status: IntelligenceCompilerStatus) => StatusMap;
}> = [
  { title: "Source jobs", getValue: (status) => status.counts.sourceJobsByStatus },
  { title: "Packet jobs", getValue: (status) => status.counts.packetJobsByStatus },
  {
    title: "Signal candidates",
    getValue: (status) => status.counts.sourceSignalCandidatesByStatus,
  },
];

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function statusTotal(statuses: StatusMap): number {
  return Object.values(statuses).reduce((total, value) => total + value, 0);
}

function StatusPill({ healthy }: { healthy: boolean }) {
  return (
    <Badge variant={healthy ? "active" : "destructive"} className="gap-1.5">
      {healthy ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {healthy ? "Healthy" : "Needs attention"}
    </Badge>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function StatusCounts({ status }: { status: IntelligenceCompilerStatus }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {COUNT_GROUPS.map((group) => {
        const values = group.getValue(status);
        return (
          <div key={group.title} className="space-y-3 rounded-lg bg-muted/25 p-4">
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
                    <span className="capitalize text-muted-foreground">{key.replaceAll("_", " ")}</span>
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

function CheckTable({ status }: { status: IntelligenceCompilerStatus }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Compiler check</TableHead>
          <TableHead className="w-28 text-right">Count</TableHead>
          <TableHead className="w-28 text-right">State</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Object.entries(CHECK_LABELS).map(([key, label]) => {
          const value = status.checks[key] ?? 0;
          const failed = value > 0;
          return (
            <TableRow key={key} className={failed ? "bg-destructive/5" : undefined}>
              <TableCell className="max-w-none whitespace-normal">
                <div className="flex items-center gap-2">
                  {failed ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-status-success" />
                  )}
                  <span className="text-sm text-foreground">{label}</span>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{value}</TableCell>
              <TableCell className="text-right">
                <Badge variant={failed ? "destructive" : "active"}>
                  {failed ? "Fail" : "Pass"}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function RunSummary({ runResult }: { runResult: RunResult | null }) {
  if (!runResult) return null;
  const results = runResult.results ?? {};
  return (
    <div className="rounded-lg bg-muted/25 p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">Last run: {runResult.status}</p>
          <p className="mt-1 text-xs text-muted-foreground">Job {runResult.job_id}</p>
        </div>
        <Badge variant={runResult.status === "completed" ? "active" : "outline"}>
          {runResult.status}
        </Badge>
      </div>
      {Object.entries(results).length > 0 ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(results).map(([key, value]) => (
            <div key={key}>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                {key.replaceAll("_", " ")}
              </dt>
              <dd className="mt-1 text-sm tabular-nums text-foreground">
                {typeof value === "object" ? JSON.stringify(value) : String(value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

export function IntelligenceCompilerHealthPanel() {
  const [status, setStatus] = React.useState<IntelligenceCompilerStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [runResult, setRunResult] = React.useState<RunResult | null>(null);
  const [sourceLimit, setSourceLimit] = React.useState(5);
  const [packetLimit, setPacketLimit] = React.useState(5);

  const loadStatus = React.useCallback(async (mode: "initial" | "refresh" = "refresh") => {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);
    setError(null);
    try {
      const nextStatus = await apiFetch<IntelligenceCompilerStatus>(
        "/api/admin/intelligence-compiler/status",
      );
      setStatus(nextStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load compiler status.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void loadStatus("initial");
  }, [loadStatus]);

  const runCompiler = async () => {
    setRunning(true);
    setError(null);
    try {
      const result = await apiFetch<RunResult>("/api/admin/intelligence-compiler/run", {
        method: "POST",
        body: JSON.stringify({
          sourceLimit: Math.max(0, Math.min(100, sourceLimit)),
          packetLimit: Math.max(0, Math.min(100, packetLimit)),
          background: true,
          maxProcessingTimeMs: 120000,
        }),
      });
      setRunResult(result);
      window.setTimeout(() => {
        void loadStatus("refresh");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compiler run failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <SectionRuleHeading label="Compiler health" className="mb-0 pb-0" />
              {status ? <StatusPill healthy={status.healthy} /> : null}
            </div>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Tracks whether source messages are becoming reviewable signals, promoted insight
              cards, evidence links, and current project packets.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadStatus("refresh")}
            disabled={loading || refreshing || running}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        {error ? (
          <InfoAlert variant="error">
            {error}
          </InfoAlert>
        ) : null}

        {loading ? (
          <LoadingRows />
        ) : status ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-muted/25 p-4">
                <p className="text-xs font-medium text-muted-foreground">Generated</p>
                <p className="mt-2 text-sm text-foreground">{formatDate(status.generatedAt)}</p>
              </div>
              <div className="rounded-lg bg-muted/25 p-4">
                <p className="text-xs font-medium text-muted-foreground">Insight cards</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
                  {status.counts.insightCards}
                </p>
              </div>
              <div className="rounded-lg bg-muted/25 p-4">
                <p className="text-xs font-medium text-muted-foreground">Current packets</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
                  {status.counts.currentPackets}
                </p>
              </div>
            </div>

            <StatusCounts status={status} />
            <CheckTable status={status} />
          </>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <SectionRuleHeading label="Run queue" className="mb-0 pb-0" />
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Drains queued source intelligence jobs first, then packet refresh jobs. Use this after
              ingestion backfills or when health shows stale compiler work.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Source limit</span>
              <Input
                className="w-28"
                min={0}
                max={100}
                type="number"
                value={sourceLimit}
                onChange={(event) => setSourceLimit(Number(event.target.value))}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Packet limit</span>
              <Input
                className="w-28"
                min={0}
                max={100}
                type="number"
                value={packetLimit}
                onChange={(event) => setPacketLimit(Number(event.target.value))}
              />
            </label>
            <Button type="button" onClick={runCompiler} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run now
            </Button>
          </div>
        </div>

        <RunSummary runResult={runResult} />

        {status ? (
          <div className="rounded-lg bg-muted/25 p-4">
            <SectionRuleHeading label="Thresholds" />
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(status.thresholds).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    {key.replaceAll(/([A-Z])/g, " $1").trim()}
                  </dt>
                  <dd className="mt-1 text-sm tabular-nums text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        <p className={cn("text-xs leading-5 text-muted-foreground", !status && "sr-only")}>
          Failures here mean the assistant may answer strategically from stale packets or miss
          newly ingested Teams, Outlook, meeting, or document signals.
        </p>
      </section>
    </div>
  );
}
