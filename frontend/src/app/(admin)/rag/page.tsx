"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";

import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
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

import type { DailySyncRow } from "@/app/api/admin/rag-snapshots/route";

// ─── Source columns ───────────────────────────────────────────────────────────

const SOURCES = [
  { key: "onedrive", label: "OneDrive" },
  { key: "outlook", label: "Outlook" },
  { key: "meetings", label: "Meetings" },
  { key: "teams", label: "Teams" },
] as const;

type SourceKey = (typeof SOURCES)[number]["key"];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatNumber(value: number): string {
  if (!value) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: string): string {
  // value is YYYY-MM-DD UTC; render as a friendly local-ish label.
  const d = new Date(`${value}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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

function rowTotalSynced(row: DailySyncRow): number {
  return SOURCES.reduce((sum, s) => sum + syncedFor(row, s.key), 0);
}

function rowTotalFailed(row: DailySyncRow): number {
  return SOURCES.reduce((sum, s) => sum + failedFor(row, s.key), 0);
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function RagDashboardPage() {
  const [days, setDays] = React.useState<DailySyncRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ days: DailySyncRow[] }>(
        "/api/admin/rag-snapshots?days=30",
      );
      setDays(res.days ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sync history");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Most recent date that actually had any sync activity.
  const lastActiveDay = React.useMemo(
    () => days.find((d) => rowTotalSynced(d) > 0 || rowTotalFailed(d) > 0),
    [days],
  );

  const stallDays = React.useMemo(() => {
    if (!lastActiveDay) return 0;
    const last = new Date(`${lastActiveDay.date}T12:00:00Z`);
    const today = new Date();
    today.setUTCHours(12, 0, 0, 0);
    return Math.max(
      0,
      Math.round((today.getTime() - last.getTime()) / (24 * 60 * 60 * 1000)),
    );
  }, [lastActiveDay]);

  return (
    <PageShell
      variant="dashboard"
      title="Sync Health"
      eyebrow="Admin"
      description="Items successfully synced and items that failed, per source, per day. Sourced live from source_sync_runs."
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      }
    >
      {error && (
        <InfoAlert variant="error" role="alert">
          <div className="font-medium">Failed to load sync history</div>
          <div className="text-xs opacity-80">{error}</div>
        </InfoAlert>
      )}

      {!loading && !error && stallDays >= 1 && (
        <InfoAlert variant="warning" role="alert">
          <div className="font-medium">
            No sync activity for {stallDays} day{stallDays === 1 ? "" : "s"}
          </div>
          <div className="text-xs opacity-80">
            Last activity: {lastActiveDay ? formatDate(lastActiveDay.date) : "—"}. If this is
            unexpected, check the Render cron services and source_sync_runs in Supabase.
          </div>
        </InfoAlert>
      )}

      <InlineTable variant="read">
        <InlineTableHeader>
          <InlineTableHeaderRow type="group">
            <InlineTableHeaderCell rowSpan={2}>Date</InlineTableHeaderCell>
            <InlineTableHeaderCell colSpan={2} align="center" divider>
              OneDrive
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
              Day total
            </InlineTableHeaderCell>
          </InlineTableHeaderRow>
          <InlineTableHeaderRow>
            {SOURCES.map((source, idx) => (
              <React.Fragment key={source.key}>
                <InlineTableHeaderCell align="right" divider={idx === 0}>
                  Synced
                </InlineTableHeaderCell>
                <InlineTableHeaderCell align="right">Failed</InlineTableHeaderCell>
              </React.Fragment>
            ))}
            <InlineTableHeaderCell align="right" divider>
              Synced
            </InlineTableHeaderCell>
            <InlineTableHeaderCell align="right">Failed</InlineTableHeaderCell>
          </InlineTableHeaderRow>
        </InlineTableHeader>

        <InlineTableBody>
          {loading && days.length === 0 && (
            <InlineTableRow>
              <InlineTableCell colSpan={11} align="center" className="py-8 text-muted-foreground">
                Loading sync history…
              </InlineTableCell>
            </InlineTableRow>
          )}

          {!loading && days.length === 0 && (
            <InlineTableRow>
              <InlineTableCell colSpan={11} align="center" className="py-8 text-muted-foreground">
                No sync runs recorded in the selected window.
              </InlineTableCell>
            </InlineTableRow>
          )}

          {days.map((day) => {
            const totalSynced = rowTotalSynced(day);
            const totalFailed = rowTotalFailed(day);
            const hasActivity = totalSynced > 0 || totalFailed > 0;
            return (
              <InlineTableRow key={day.date}>
                <InlineTableCell
                  className={
                    isToday(day.date)
                      ? "whitespace-nowrap text-xs font-semibold text-foreground"
                      : hasActivity
                        ? "whitespace-nowrap text-xs text-foreground"
                        : "whitespace-nowrap text-xs text-muted-foreground/60"
                  }
                >
                  {formatDate(day.date)}
                </InlineTableCell>
                {SOURCES.map((source, idx) => {
                  const synced = syncedFor(day, source.key);
                  const failed = failedFor(day, source.key);
                  return (
                    <React.Fragment key={source.key}>
                      <InlineTableCell align="right" numeric divider={idx === 0}>
                        {formatNumber(synced)}
                      </InlineTableCell>
                      <InlineTableCell
                        align="right"
                        numeric
                        className={failed > 0 ? "text-destructive" : undefined}
                      >
                        {formatNumber(failed)}
                      </InlineTableCell>
                    </React.Fragment>
                  );
                })}
                <InlineTableCell align="right" numeric divider className="font-semibold">
                  {formatNumber(totalSynced)}
                </InlineTableCell>
                <InlineTableCell
                  align="right"
                  numeric
                  className={
                    totalFailed > 0 ? "font-semibold text-destructive" : "font-semibold"
                  }
                >
                  {formatNumber(totalFailed)}
                </InlineTableCell>
              </InlineTableRow>
            );
          })}
        </InlineTableBody>
      </InlineTable>
    </PageShell>
  );
}
