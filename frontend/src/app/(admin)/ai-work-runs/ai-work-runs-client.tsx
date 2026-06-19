"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

import {
  InfoAlert,
  InlineTable,
  InlineTableBody,
  InlineTableCell,
  InlineTableHeader,
  InlineTableHeaderCell,
  InlineTableHeaderRow,
  InlineTableRow,
} from "@/components/ds";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

import type {
  AiWorkRunSourceView,
  AiWorkRunView,
} from "@/app/api/admin/ai-work-runs/route";

type AiWorkRunsResponse = {
  workflowId: string;
  generatedAt: string;
  runs: AiWorkRunView[];
};

const WORKFLOW_ID = "executive_daily_brief";

const STATUS_STYLES: Record<string, string> = {
  succeeded: "text-emerald-700 bg-emerald-50",
  partial_success: "text-amber-700 bg-amber-50",
  running: "text-blue-700 bg-blue-50",
  skipped: "text-muted-foreground bg-muted",
  failed_permanent: "text-destructive bg-destructive/10",
  failed_retryable: "text-destructive bg-destructive/10",
};

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(value: number | null): string {
  if (value === null) return "-";
  if (value < 1000) return `${value}ms`;
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
}

function formatLabel(value: string | null | undefined): string {
  if (!value) return "-";
  return value.replaceAll("_", " ");
}

function jsonEntries(value: Record<string, unknown>): Array<[string, string]> {
  return Object.entries(value)
    .filter(([, item]) => item !== null && item !== undefined && item !== "")
    .map(([key, item]) => [
      key,
      typeof item === "object" ? JSON.stringify(item) : String(item),
    ]);
}

function StatusPill({ status }: { status: string | null }) {
  const label = formatLabel(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
        status ? STATUS_STYLES[status] ?? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function DetailList({
  title,
  entries,
}: {
  title: string;
  entries: Array<[string, string]>;
}) {
  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-foreground">{title}</div>
      <dl className="divide-y divide-border/60 text-xs">
        {entries.map(([key, value]) => (
          <div key={key} className="grid gap-2 py-2 sm:grid-cols-[160px_1fr]">
            <dt className="text-muted-foreground">{formatLabel(key)}</dt>
            <dd className="break-words font-mono text-[11px] text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SourceRows({ sources }: { sources: AiWorkRunSourceView[] }) {
  if (sources.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        No source rows were recorded for this run.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-left text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 pr-3 font-medium">Source</th>
            <th className="py-2 pr-3 font-medium">Title</th>
            <th className="py-2 pr-3 font-medium">Evidence</th>
            <th className="py-2 pr-3 font-medium">Seen</th>
            <th className="py-2 pr-3 font-medium">Confidence</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sources.map((source) => (
            <tr key={source.id}>
              <td className="py-2 pr-3 align-top text-muted-foreground">
                {formatLabel(source.sourceFamily)}
              </td>
              <td className="py-2 pr-3 align-top font-medium text-foreground">
                {source.sourceTitle ?? source.sourceRecordId ?? "-"}
              </td>
              <td className="max-w-xl py-2 pr-3 align-top text-foreground">
                {source.evidenceExcerpt ?? "-"}
              </td>
              <td className="py-2 pr-3 align-top text-muted-foreground">
                {formatDateTime(source.sourceOccurredAt)}
              </td>
              <td className="py-2 pr-3 align-top text-muted-foreground">
                {formatLabel(source.confidence)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RunDetail({ run }: { run: AiWorkRunView }) {
  const sourceSyncEntries: Array<[string, string]> = run.sourceSyncRun
    ? ([
        ["status", run.sourceSyncRun.status],
        ["itemsSeen", String(run.sourceSyncRun.itemsSeen)],
        ["itemsSynced", String(run.sourceSyncRun.itemsSynced)],
        ["itemsSkipped", String(run.sourceSyncRun.itemsSkipped)],
        ["itemsFailed", String(run.sourceSyncRun.itemsFailed)],
        ["errorCode", run.sourceSyncRun.errorCode ?? ""],
        ["errorMessage", run.sourceSyncRun.errorMessage ?? ""],
      ] as Array<[string, string]>).filter(([, value]) => value !== "")
    : [];
  const artifactEntries: Array<[string, string]> = run.dailyRecapId
    ? [
        ["kind", "brief_packet"],
        ["storageTable", "daily_recaps"],
        ["storageId", run.dailyRecapId],
      ]
    : [];

  return (
    <div className="space-y-5 py-4">
      {(run.failureCode || run.failureMessage) && (
        <InfoAlert variant="error" role="alert">
          <div className="font-medium">{run.failureCode ?? "Run failed"}</div>
          <div className="text-xs opacity-80">{run.failureMessage}</div>
        </InfoAlert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <DetailList title="Generated Artifact" entries={artifactEntries} />
        <DetailList title="Source Counts" entries={jsonEntries(run.sourceCounts)} />
        <DetailList title="Delivery Target" entries={jsonEntries(run.deliveryTarget)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DetailList title="Source Sync Run" entries={sourceSyncEntries} />
        <DetailList title="Tool Scope" entries={jsonEntries(run.toolScope)} />
        <DetailList title="Source Policy" entries={jsonEntries(run.sourcePolicy)} />
      </div>

      {run.event && (
        <DetailList
          title="Trigger Event"
          entries={[
            ["eventType", run.event.eventType],
            ["status", run.event.status],
            ["receivedAt", formatDateTime(run.event.receivedAt)],
            ...jsonEntries(run.event.payload),
          ]}
        />
      )}

      <div className="space-y-2">
        <div className="text-xs font-semibold text-foreground">Evidence Rows</div>
        <SourceRows sources={run.sources} />
      </div>
    </div>
  );
}

export function AiWorkRunsClient() {
  const [data, setData] = React.useState<AiWorkRunsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [expandedRunId, setExpandedRunId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<AiWorkRunsResponse>(
        `/api/admin/ai-work-runs?workflow=${WORKFLOW_ID}&limit=50`,
      );
      setData(response);
      setExpandedRunId((current) => {
        if (current && response.runs.some((run) => run.id === current)) return current;
        return response.runs[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI work runs");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const runs = data?.runs ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">Executive Daily Brief</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Run lifecycle, delivery state, source policy, and evidence rows.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </div>

      {error && (
        <InfoAlert variant="error" role="alert">
          <div className="font-medium">Failed to load AI work runs</div>
          <div className="text-xs opacity-80">{error}</div>
        </InfoAlert>
      )}

      <InlineTable variant="read">
        <InlineTableHeader>
          <InlineTableHeaderRow>
            <InlineTableHeaderCell>Run</InlineTableHeaderCell>
            <InlineTableHeaderCell>Status</InlineTableHeaderCell>
            <InlineTableHeaderCell>Delivery</InlineTableHeaderCell>
            <InlineTableHeaderCell>Started</InlineTableHeaderCell>
            <InlineTableHeaderCell>Duration</InlineTableHeaderCell>
            <InlineTableHeaderCell align="right">Sources</InlineTableHeaderCell>
          </InlineTableHeaderRow>
        </InlineTableHeader>
        <InlineTableBody>
          {loading && runs.length === 0 && (
            <InlineTableRow>
              <InlineTableCell colSpan={6} align="center" className="py-8 text-muted-foreground">
                Loading AI work runs...
              </InlineTableCell>
            </InlineTableRow>
          )}

          {!loading && runs.length === 0 && !error && (
            <InlineTableRow>
              <InlineTableCell colSpan={6} align="center" className="py-8 text-muted-foreground">
                No Executive Daily Brief work runs have been recorded yet.
              </InlineTableCell>
            </InlineTableRow>
          )}

          {runs.map((run) => {
            const expanded = expandedRunId === run.id;
            return (
              <React.Fragment key={run.id}>
                <InlineTableRow>
                  <InlineTableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedRunId(expanded ? null : run.id)}
                      className="h-auto min-w-0 justify-start gap-2 p-0 text-left hover:bg-transparent"
                    >
                      {expanded ? (
                        <ChevronDown className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="min-w-0">
                        <span className="block font-medium text-foreground">
                          {run.resultSummary ?? run.title}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {run.id}
                        </span>
                      </span>
                    </Button>
                  </InlineTableCell>
                  <InlineTableCell>
                    <StatusPill status={run.status} />
                  </InlineTableCell>
                  <InlineTableCell>
                    <StatusPill status={run.deliveryStatus} />
                  </InlineTableCell>
                  <InlineTableCell className="whitespace-nowrap text-sm">
                    {formatDateTime(run.startedAt ?? run.createdAt)}
                  </InlineTableCell>
                  <InlineTableCell className="whitespace-nowrap text-sm">
                    {formatDuration(run.durationMs)}
                  </InlineTableCell>
                  <InlineTableCell align="right" numeric>
                    {run.sources.length}
                  </InlineTableCell>
                </InlineTableRow>
                {expanded && (
                  <InlineTableRow>
                    <InlineTableCell colSpan={6}>
                      <RunDetail run={run} />
                    </InlineTableCell>
                  </InlineTableRow>
                )}
              </React.Fragment>
            );
          })}
        </InlineTableBody>
      </InlineTable>
    </div>
  );
}
