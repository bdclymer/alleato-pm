"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
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
  AiWorkRunArtifactView,
  AiWorkRunDeliveryAttemptView,
  AiWorkRunSourceView,
  AiWorkRunStepView,
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

function sourceHref(source: AiWorkRunSourceView): string | null {
  return source.internalHref ?? source.sourceUrl ?? null;
}

function runGuidance(run: AiWorkRunView): Array<[string, string]> {
  const retryableAttempts = run.deliveryAttempts.filter((attempt) => attempt.retryable);
  const failedRetryableSteps = run.steps.filter(
    (step) => step.status === "failed_retryable",
  );
  const missingAdapterStep = run.steps.find(
    (step) => step.failureCode === "SOURCE_ADAPTER_MISSING",
  );

  const retryability =
    retryableAttempts.length > 0 || failedRetryableSteps.length > 0
      ? "retryable"
      : run.status === "failed_retryable"
        ? "retryable"
        : "not retryable";

  let nextAction = "No action required.";
  if (run.deliveryStatus === "disabled") {
    nextAction = "Enable delivery configuration before retrying delivery.";
  } else if (missingAdapterStep) {
    nextAction =
      "Implement or configure the missing source adapter, then regenerate the brief.";
  } else if (retryableAttempts.length > 0) {
    nextAction =
      "Resolve the provider or recipient failure, then retry the delivery path.";
  } else if (failedRetryableSteps.length > 0 || run.status === "failed_retryable") {
    nextAction = "Resolve the failed retryable step, then rerun this workflow.";
  } else if (run.status === "partial_success") {
    nextAction = "Review failed recipients or source steps before treating the run as complete.";
  } else if (run.status === "skipped") {
    nextAction = "No retry needed unless the schedule or trigger conditions were wrong.";
  } else if (run.failureCode || run.failureMessage) {
    nextAction = "Fix the recorded failure, then rerun the workflow.";
  }

  return [
    ["retryability", retryability],
    ["nextAction", nextAction],
  ];
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
            <th className="py-2 pr-3 font-medium">Project</th>
            <th className="py-2 pr-3 font-medium">Evidence</th>
            <th className="py-2 pr-3 font-medium">Open</th>
            <th className="py-2 pr-3 font-medium">Seen</th>
            <th className="py-2 pr-3 font-medium">Confidence</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sources.map((source) => {
            const href = sourceHref(source);
            const opensExternal = href === source.sourceUrl;
            return (
              <tr key={source.id}>
                <td className="py-2 pr-3 align-top text-muted-foreground">
                  {formatLabel(source.sourceFamily)}
                </td>
                <td className="py-2 pr-3 align-top font-medium text-foreground">
                  {source.sourceTitle ?? source.sourceRecordId ?? "-"}
                </td>
                <td className="py-2 pr-3 align-top text-muted-foreground">
                  {source.projectLabel ?? source.projectId ?? "-"}
                </td>
                <td className="max-w-xl py-2 pr-3 align-top text-foreground">
                  {source.evidenceExcerpt ?? "-"}
                </td>
                <td className="py-2 pr-3 align-top">
                  {href ? (
                    <a
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      href={href}
                      target={opensExternal ? "_blank" : undefined}
                      rel={opensExternal ? "noreferrer" : undefined}
                    >
                      Open
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="py-2 pr-3 align-top text-muted-foreground">
                  {formatDateTime(source.sourceOccurredAt)}
                </td>
                <td className="py-2 pr-3 align-top text-muted-foreground">
                  {formatLabel(source.confidence)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EvidenceDrilldown({
  artifacts,
  sources,
}: {
  artifacts: AiWorkRunArtifactView[];
  sources: AiWorkRunSourceView[];
}) {
  const packetArtifacts = artifacts.filter(
    (artifact) => artifact.kind === "brief_packet",
  );

  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs font-semibold text-foreground">
          Packet Evidence Drilldown
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Source refs attached to the generated packet and delivery run.
        </p>
      </div>
      {packetArtifacts.length > 0 && (
        <div className="divide-y divide-border/60 text-xs">
          {packetArtifacts.map((artifact) => (
            <div
              key={artifact.id}
              className="grid gap-2 py-2 sm:grid-cols-[140px_1fr_120px]"
            >
              <div className="text-muted-foreground">{formatLabel(artifact.kind)}</div>
              <div className="font-medium text-foreground">{artifact.title}</div>
              <div className="text-muted-foreground">
                {artifact.sourceRefCount} ref{artifact.sourceRefCount === 1 ? "" : "s"}
              </div>
            </div>
          ))}
        </div>
      )}
      <SourceRows sources={sources} />
    </div>
  );
}

function ArtifactRows({ artifacts }: { artifacts: AiWorkRunArtifactView[] }) {
  if (artifacts.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        No artifacts were recorded for this run.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-left text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 pr-3 font-medium">Kind</th>
            <th className="py-2 pr-3 font-medium">Title</th>
            <th className="py-2 pr-3 font-medium">Storage</th>
            <th className="py-2 pr-3 font-medium">Refs</th>
            <th className="py-2 pr-3 font-medium">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {artifacts.map((artifact) => (
            <tr key={artifact.id}>
              <td className="py-2 pr-3 align-top text-muted-foreground">
                {formatLabel(artifact.kind)}
              </td>
              <td className="py-2 pr-3 align-top font-medium text-foreground">
                {artifact.title}
              </td>
              <td className="py-2 pr-3 align-top font-mono text-[11px] text-muted-foreground">
                {artifact.storageTable && artifact.storageId
                  ? `${artifact.storageTable}:${artifact.storageId}`
                  : artifact.contentType}
              </td>
              <td className="py-2 pr-3 align-top text-muted-foreground">
                {artifact.sourceRefCount}
              </td>
              <td className="py-2 pr-3 align-top text-muted-foreground">
                {formatDateTime(artifact.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeliveryAttemptRows({
  attempts,
}: {
  attempts: AiWorkRunDeliveryAttemptView[];
}) {
  if (attempts.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        No delivery attempts were recorded for this run.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-left text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 pr-3 font-medium">Channel</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 pr-3 font-medium">Recipient</th>
            <th className="py-2 pr-3 font-medium">Failure</th>
            <th className="py-2 pr-3 font-medium">Retry</th>
            <th className="py-2 pr-3 font-medium">Attempted</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {attempts.map((attempt) => (
            <tr key={attempt.id}>
              <td className="py-2 pr-3 align-top text-muted-foreground">
                {formatLabel(attempt.channel)}
              </td>
              <td className="py-2 pr-3 align-top">
                <StatusPill status={attempt.status} />
              </td>
              <td className="py-2 pr-3 align-top text-foreground">
                {attempt.recipientAddress ?? attempt.recipientId ?? "-"}
              </td>
              <td className="max-w-md py-2 pr-3 align-top text-muted-foreground">
                {attempt.failureCode || attempt.failureMessage
                  ? `${attempt.failureCode ?? "Failure"}: ${attempt.failureMessage ?? ""}`
                  : "-"}
              </td>
              <td className="py-2 pr-3 align-top text-muted-foreground">
                {attempt.retryable ? "retryable" : "no"}
              </td>
              <td className="py-2 pr-3 align-top text-muted-foreground">
                {formatDateTime(attempt.attemptedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StepRows({ steps }: { steps: AiWorkRunStepView[] }) {
  if (steps.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        No step rows were recorded for this run.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-left text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 pr-3 font-medium">Step</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 pr-3 font-medium">Failure</th>
            <th className="py-2 pr-3 font-medium">Completed</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {steps.map((step) => (
            <tr key={step.id}>
              <td className="py-2 pr-3 align-top text-muted-foreground">
                {formatLabel(step.stepType)}
              </td>
              <td className="py-2 pr-3 align-top">
                <StatusPill status={step.status} />
              </td>
              <td className="max-w-md py-2 pr-3 align-top text-muted-foreground">
                {step.failureCode || step.failureMessage
                  ? `${step.failureCode ?? "Failure"}: ${step.failureMessage ?? ""}`
                  : "-"}
              </td>
              <td className="py-2 pr-3 align-top text-muted-foreground">
                {formatDateTime(step.completedAt ?? step.createdAt)}
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
        {run.artifacts.length === 0 && (
          <DetailList title="Generated Artifact" entries={artifactEntries} />
        )}
        <DetailList title="Run Guidance" entries={runGuidance(run)} />
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
        <div className="text-xs font-semibold text-foreground">Artifacts</div>
        <ArtifactRows artifacts={run.artifacts} />
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold text-foreground">Delivery Attempts</div>
        <DeliveryAttemptRows attempts={run.deliveryAttempts} />
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold text-foreground">Run Steps</div>
        <StepRows steps={run.steps} />
      </div>

      <div className="space-y-2">
        <EvidenceDrilldown artifacts={run.artifacts} sources={run.sources} />
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
