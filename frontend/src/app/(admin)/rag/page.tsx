"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { PageShell, PageTabs } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  InfoAlert,
  InlineTable,
  InlineTableHeader,
  InlineTableHeaderRow,
  InlineTableHeaderCell,
  InlineTableBody,
  InlineTableRow,
  InlineTableCell,
} from "@/components/ds";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

import type { DailySyncRow } from "@/app/api/admin/rag-snapshots/route";
import type { SourceSyncStatus } from "@/app/api/admin/source-sync/_contracts";

const SOURCES = [
  { key: "sharepoint", label: "SharePoint" },
  { key: "outlook", label: "Outlook" },
  { key: "meetings", label: "Meetings" },
  { key: "teams", label: "Teams" },
  { key: "acumatica", label: "Acumatica" },
] as const;

const STAGE_ORDER = [
  "synced",
  "vectorized",
  "projectAssigned",
  "tasksExtracted",
  "projectIntelligenceUpdated",
] as const;

type SourceKey = (typeof SOURCES)[number]["key"];

type Lifecycle = NonNullable<SourceSyncStatus["ragLifecycle"]>;
type LifecycleSource = Lifecycle["sources"][number];
type LifecycleStage = LifecycleSource["stages"][number];

function formatNumber(value: number): string {
  if (!value) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatSyncedNumber(value: number): string {
  if (!value) return "0";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatFailedNumber(value: number): string {
  if (!value) return "0";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "Never";
  const date = value.length === 10 ? new Date(`${value}T12:00:00Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    weekday: value.length === 10 ? "short" : undefined,
    month: "short",
    day: "numeric",
    hour: value.length === 10 ? undefined : "numeric",
    minute: value.length === 10 ? undefined : "2-digit",
  });
}

function humanize(value: string): string {
  return value.replaceAll("_", " ").replaceAll("-", " ");
}

function isToday(value: string): boolean {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return value === today.toISOString().slice(0, 10);
}

function syncedFor(row: DailySyncRow, source: SourceKey): number {
  return row[`${source}_synced` as keyof DailySyncRow] as number;
}

function failedFor(row: DailySyncRow, source: SourceKey): number {
  return row[`${source}_failed` as keyof DailySyncRow] as number;
}

function runsFor(row: DailySyncRow, source: SourceKey): number {
  return row[`${source}_runs` as keyof DailySyncRow] as number;
}

function firstColumnLabel(source: SourceKey): string {
  return source === "meetings" ? "Added" : "Synced";
}

function secondColumnLabel(source: SourceKey): string {
  return source === "meetings" ? "Complete" : "Failed";
}

function firstValueFor(row: DailySyncRow, source: SourceKey): number {
  return source === "meetings" ? row.meetings_added : syncedFor(row, source);
}

function secondValueFor(row: DailySyncRow, source: SourceKey): number {
  return source === "meetings" ? row.meetings_complete : failedFor(row, source);
}

function rowTotalSynced(row: DailySyncRow): number {
  return SOURCES.reduce((sum, source) => sum + firstValueFor(row, source.key), 0);
}

function rowTotalFailed(row: DailySyncRow): number {
  return SOURCES.reduce((sum, source) => {
    if (source.key === "meetings") {
      return sum + Math.max(row.meetings_added - row.meetings_complete, 0);
    }
    return sum + failedFor(row, source.key);
  }, 0);
}

function MissingRunIcon({ label }: { label: string }) {
  return (
    <span
      aria-label={`${label} did not run`}
      className="inline-flex items-center justify-end text-status-warning"
      title={`${label} did not run`}
    >
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  );
}

function badgeVariant(status: LifecycleStage["status"] | LifecycleSource["status"] | Lifecycle["status"]) {
  if (status === "healthy") return "active";
  if (status === "critical" || status === "degraded") return "destructive";
  return "outline";
}

function missingCount(stage: LifecycleStage) {
  return Math.max(stage.total - stage.count, 0);
}

function lifecycleRows(lifecycle: Lifecycle) {
  return lifecycle.sources
    .flatMap((source) => {
      const stagesByKey = new Map(source.stages.map((stage) => [stage.key, stage]));
      return STAGE_ORDER.map((key) => {
        const stage = stagesByKey.get(key);
        return stage
          ? {
              source,
              stage,
              missing: missingCount(stage),
            }
          : null;
      }).filter((row): row is { source: LifecycleSource; stage: LifecycleStage; missing: number } =>
        Boolean(row),
      );
    })
    .sort((left, right) => {
      const severityDelta =
        (right.stage.status === "critical" ? 1 : 0) -
        (left.stage.status === "critical" ? 1 : 0);
      if (severityDelta) return severityDelta;
      const missingDelta = right.missing - left.missing;
      if (missingDelta) return missingDelta;
      return STAGE_ORDER.indexOf(left.stage.key as (typeof STAGE_ORDER)[number]) -
        STAGE_ORDER.indexOf(right.stage.key as (typeof STAGE_ORDER)[number]);
    });
}

function LifecycleTable({ lifecycle }: { lifecycle: Lifecycle | undefined }) {
  if (!lifecycle) {
    return (
      <InfoAlert variant="error" role="alert">
        RAG lifecycle data did not load. Refresh the page or check the source-sync status API.
      </InfoAlert>
    );
  }

  const rows = lifecycleRows(lifecycle);
  const notification = lifecycle.notifications[0] ?? null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            RAG lifecycle
          </span>
          <Badge variant={badgeVariant(lifecycle.status)} className="capitalize">
            {humanize(lifecycle.status)}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          Updated {formatDate(lifecycle.generatedAt)}
        </div>
      </div>

      <InlineTable variant="read">
        <InlineTableHeader>
          <InlineTableHeaderRow>
            <InlineTableHeaderCell>Source</InlineTableHeaderCell>
            <InlineTableHeaderCell>Stage</InlineTableHeaderCell>
            <InlineTableHeaderCell>Status</InlineTableHeaderCell>
            <InlineTableHeaderCell align="right">Complete</InlineTableHeaderCell>
            <InlineTableHeaderCell align="right">Remaining</InlineTableHeaderCell>
            <InlineTableHeaderCell>Owner</InlineTableHeaderCell>
            <InlineTableHeaderCell>Current evidence</InlineTableHeaderCell>
          </InlineTableHeaderRow>
        </InlineTableHeader>
        <InlineTableBody>
          {rows.map(({ source, stage, missing }) => (
            <InlineTableRow key={`${source.key}:${stage.key}`}>
              <InlineTableCell className="font-medium text-foreground">
                {source.label}
              </InlineTableCell>
              <InlineTableCell>{stage.label}</InlineTableCell>
              <InlineTableCell>
                <Badge variant={badgeVariant(stage.status)} className="capitalize">
                  {humanize(stage.status)}
                </Badge>
              </InlineTableCell>
              <InlineTableCell align="right" numeric>
                {formatNumber(stage.count)}/{formatNumber(stage.total)}
              </InlineTableCell>
              <InlineTableCell
                align="right"
                numeric
                className={cn(missing > 0 && "font-semibold text-foreground")}
              >
                {formatNumber(missing)}
              </InlineTableCell>
              <InlineTableCell className="whitespace-nowrap">
                {stage.ownerHint}
              </InlineTableCell>
              <InlineTableCell className="max-w-xl text-muted-foreground">
                {stage.message}
              </InlineTableCell>
            </InlineTableRow>
          ))}
        </InlineTableBody>
      </InlineTable>

      {notification ? (
        <p className="text-xs text-muted-foreground">
          Notification {notification.status}: {notification.message}
        </p>
      ) : null}
    </section>
  );
}

function DailySyncHistory({ days, loading }: { days: DailySyncRow[]; loading: boolean }) {
  const columnCount = 1 + SOURCES.length * 2 + 2;

  return (
    <section>
      <InlineTable variant="read">
        <InlineTableHeader>
          <InlineTableHeaderRow type="group">
            <InlineTableHeaderCell rowSpan={2}>Date</InlineTableHeaderCell>
            <InlineTableHeaderCell colSpan={2} align="center" divider>
              SharePoint
            </InlineTableHeaderCell>
            <InlineTableHeaderCell colSpan={2} align="center" divider>
              Outlook
            </InlineTableHeaderCell>
            <InlineTableHeaderCell colSpan={2} align="center" divider>
              Meetings
            </InlineTableHeaderCell>
            <InlineTableHeaderCell colSpan={2} align="center" divider>
              Teams
            </InlineTableHeaderCell>
            <InlineTableHeaderCell colSpan={2} align="center" divider>
              Acumatica
            </InlineTableHeaderCell>
            <InlineTableHeaderCell colSpan={2} align="center" divider>
              Day total
            </InlineTableHeaderCell>
          </InlineTableHeaderRow>
          <InlineTableHeaderRow>
            {SOURCES.map((source, index) => (
              <React.Fragment key={source.key}>
                <InlineTableHeaderCell align="right" divider={index === 0}>
                  {firstColumnLabel(source.key)}
                </InlineTableHeaderCell>
                <InlineTableHeaderCell align="right">
                  {secondColumnLabel(source.key)}
                </InlineTableHeaderCell>
              </React.Fragment>
            ))}
            <InlineTableHeaderCell align="right" divider>
              Added / synced
            </InlineTableHeaderCell>
            <InlineTableHeaderCell align="right">Open</InlineTableHeaderCell>
          </InlineTableHeaderRow>
        </InlineTableHeader>

        <InlineTableBody>
          {loading && days.length === 0 ? (
            <InlineTableRow>
              <InlineTableCell colSpan={columnCount} align="center" className="py-8 text-muted-foreground">
                Loading sync history...
              </InlineTableCell>
            </InlineTableRow>
          ) : null}

          {!loading && days.length === 0 ? (
            <InlineTableRow>
              <InlineTableCell colSpan={columnCount} align="center" className="py-8 text-muted-foreground">
                No sync runs recorded in the selected window.
              </InlineTableCell>
            </InlineTableRow>
          ) : null}

          {days.map((day) => {
            const totalSynced = rowTotalSynced(day);
            const totalFailed = rowTotalFailed(day);
            const hasActivity = totalSynced > 0 || totalFailed > 0;
            return (
              <InlineTableRow key={day.date}>
                <InlineTableCell
                  className={cn(
                    "whitespace-nowrap text-xs",
                    isToday(day.date)
                      ? "font-semibold text-foreground"
                      : hasActivity
                        ? "text-foreground"
                        : "text-muted-foreground/60",
                  )}
                >
                  {formatDate(day.date)}
                </InlineTableCell>
                {SOURCES.map((source, index) => {
                  const firstValue = firstValueFor(day, source.key);
                  const secondValue = secondValueFor(day, source.key);
                  const runs = runsFor(day, source.key);
                  const isMeetings = source.key === "meetings";
                  const hasRun = isMeetings || runs > 0;
                  const meetingComplete = isMeetings && day.meetings_added > 0 && day.meetings_complete === day.meetings_added;
                  return (
                    <React.Fragment key={source.key}>
                      <InlineTableCell
                        align="right"
                        numeric
                        divider={index === 0}
                        className={cn(
                          !hasRun
                            ? "text-status-warning"
                            : firstValue === 0
                              ? "text-destructive"
                              : undefined,
                        )}
                      >
                        {hasRun ? formatSyncedNumber(firstValue) : <MissingRunIcon label={source.label} />}
                      </InlineTableCell>
                      <InlineTableCell
                        align="right"
                        numeric
                        title={
                          isMeetings
                            ? `${day.meetings_vectorized}/${day.meetings_added} vectorized, ${day.meetings_project_assigned}/${day.meetings_added} project assigned, ${day.meetings_tasks_extracted}/${day.meetings_added} tasks extracted, ${day.meetings_project_intelligence_updated}/${day.meetings_added} Project Intelligence updated`
                            : undefined
                        }
                        className={
                          !hasRun
                            ? "text-muted-foreground/60"
                            : isMeetings
                              ? meetingComplete || day.meetings_added === 0
                                ? "text-emerald-700"
                                : "text-destructive"
                              : secondValue > 0
                                ? "text-destructive"
                                : "text-emerald-700"
                        }
                      >
                        {hasRun ? formatFailedNumber(secondValue) : "0"}
                      </InlineTableCell>
                    </React.Fragment>
                  );
                })}
                <InlineTableCell
                  align="right"
                  numeric
                  divider
                  className={cn("font-semibold", totalSynced === 0 && "text-destructive")}
                >
                  {formatSyncedNumber(totalSynced)}
                </InlineTableCell>
                <InlineTableCell
                  align="right"
                  numeric
                  className={cn(
                    "font-semibold",
                    totalFailed > 0 ? "text-destructive" : "text-emerald-700",
                  )}
                >
                  {formatFailedNumber(totalFailed)}
                </InlineTableCell>
              </InlineTableRow>
            );
          })}
        </InlineTableBody>
      </InlineTable>
    </section>
  );
}

export default function RagDashboardPage() {
  const searchParams = useSearchParams();
  const [days, setDays] = React.useState<DailySyncRow[]>([]);
  const [status, setStatus] = React.useState<SourceSyncStatus | null>(null);
  const [historyLoading, setHistoryLoading] = React.useState(true);
  const [lifecycleLoading, setLifecycleLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const activeTab = searchParams?.get("tab") === "lifecycle" ? "lifecycle" : "sync";
  const loading = historyLoading || lifecycleLoading;

  const load = React.useCallback(async () => {
    setError(null);

    setHistoryLoading(true);
    void apiFetch<{ days: DailySyncRow[] }>("/api/admin/rag-snapshots?days=30")
      .then((history) => {
        setDays(history.days ?? []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load sync history.");
      })
      .finally(() => {
        setHistoryLoading(false);
      });

    setLifecycleLoading(true);
    void apiFetch<SourceSyncStatus>("/api/admin/source-sync/status")
      .then((lifecycleStatus) => {
        setStatus(lifecycleStatus);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load RAG lifecycle.");
      })
      .finally(() => {
        setLifecycleLoading(false);
      });
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageShell
      variant="dashboard"
      title="RAG Health"
      eyebrow="Admin"
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      }
    >
      {error ? (
        <InfoAlert variant="error" role="alert">
          <div className="font-medium">Failed to load RAG health</div>
          <div className="text-xs opacity-80">{error}</div>
        </InfoAlert>
      ) : null}

      <PageTabs
        variant="inline"
        tabs={[
          {
            label: "Sync history",
            href: "/rag",
            isActive: activeTab === "sync",
          },
          {
            label: "RAG lifecycle",
            href: "/rag?tab=lifecycle",
            isActive: activeTab === "lifecycle",
          },
        ]}
      />

      {activeTab === "sync" ? (
        <DailySyncHistory days={days} loading={historyLoading} />
      ) : lifecycleLoading && !status ? (
        <InfoAlert>Loading RAG lifecycle health...</InfoAlert>
      ) : (
        <LifecycleTable lifecycle={status?.ragLifecycle} />
      )}
    </PageShell>
  );
}
