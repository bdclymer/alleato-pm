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

import type { RagSnapshotRow } from "@/app/api/admin/rag-snapshots/route";

// ─── Source definitions ────────────────────────────────────────────────────────

const SOURCES = [
  { key: "onedrive", label: "OneDrive" },
  { key: "outlook", label: "Outlook" },
  { key: "meetings", label: "Meetings" },
  { key: "teams", label: "Teams" },
] as const;

type SourceKey = (typeof SOURCES)[number]["key"];

const COMPILERS = [
  { key: "teams_compiler_total", label: "Teams compiler" },
  { key: "task_extraction_total", label: "Task extraction" },
  { key: "insight_extraction_total", label: "Insight extraction" },
  { key: "project_intelligence_packets", label: "Project intelligence" },
] as const;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatNumber(value: number | undefined): string {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatTimestamp(value: string | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sourceMetric(row: RagSnapshotRow, source: SourceKey, kind: "synced" | "chunked" | "embedded"): number {
  return row[`${source}_${kind}` as keyof RagSnapshotRow] as number;
}

// ─── Source KPI card ───────────────────────────────────────────────────────────

interface SourceKpiCardProps {
  label: string;
  synced: number;
  chunked: number;
  embedded: number;
  syncedDelta?: number;
}

function SourceKpiCard({ label, synced, chunked, embedded, syncedDelta }: SourceKpiCardProps) {
  const embeddedPct = synced > 0 ? Math.round((embedded / synced) * 100) : 0;
  return (
    <div className="space-y-3 rounded-md bg-muted/40 px-5 py-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-foreground">{label}</h3>
        {syncedDelta !== undefined && syncedDelta !== 0 && (
          <span
            className={
              syncedDelta > 0
                ? "text-xs font-medium text-emerald-600 tabular-nums"
                : "text-xs font-medium text-muted-foreground tabular-nums"
            }
          >
            {syncedDelta > 0 ? "+" : ""}
            {formatNumber(syncedDelta)}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums text-foreground">
          {formatNumber(synced)}
        </span>
        <span className="text-xs text-muted-foreground">synced</span>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
        <div>
          <div className="font-medium tabular-nums text-foreground">{formatNumber(chunked)}</div>
          <div className="text-muted-foreground">chunked</div>
        </div>
        <div>
          <div className="font-medium tabular-nums text-foreground">{formatNumber(embedded)}</div>
          <div className="text-muted-foreground">embedded ({embeddedPct}%)</div>
        </div>
      </div>
    </div>
  );
}

// ─── Compiler KPI card ─────────────────────────────────────────────────────────

interface CompilerKpiCardProps {
  label: string;
  total: number;
  delta?: number;
}

function CompilerKpiCard({ label, total, delta }: CompilerKpiCardProps) {
  return (
    <div className="space-y-2 rounded-md bg-muted/40 px-5 py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{label}</h3>
        {delta !== undefined && delta !== 0 && (
          <span
            className={
              delta > 0
                ? "text-xs font-medium text-emerald-600 tabular-nums"
                : "text-xs font-medium text-muted-foreground tabular-nums"
            }
          >
            {delta > 0 ? "+" : ""}
            {formatNumber(delta)}
          </span>
        )}
      </div>
      <div className="text-3xl font-semibold tabular-nums text-foreground">
        {formatNumber(total)}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function RagDashboardPage() {
  const [snapshots, setSnapshots] = React.useState<RagSnapshotRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ snapshots: RagSnapshotRow[] }>(
        "/api/admin/rag-snapshots?limit=60",
      );
      setSnapshots(res.snapshots ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load snapshots");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const latest = snapshots[0];
  const previous = snapshots[1];

  const cron = "06:00, 14:00, 22:00 UTC daily";

  return (
    <PageShell
      variant="dashboard"
      title="RAG Pipeline"
      eyebrow="Admin"
      description={`Point-in-time snapshots of every document synced, chunked, and embedded into the RAG index. New row written ${cron} by the alleato-rag-snapshot Render cron.`}
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      }
    >
      {error && (
        <InfoAlert variant="error" role="alert">
          <div className="font-medium">Failed to load snapshots</div>
          <div className="text-xs opacity-80">{error}</div>
        </InfoAlert>
      )}

      {/* ─── Latest snapshot — source KPIs ──────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-foreground">Latest snapshot</h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {latest ? formatTimestamp(latest.captured_at) : loading ? "Loading…" : "No snapshots yet"}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SOURCES.map((source) => {
            const synced = latest ? sourceMetric(latest, source.key, "synced") : 0;
            const previousSynced = previous ? sourceMetric(previous, source.key, "synced") : undefined;
            return (
              <SourceKpiCard
                key={source.key}
                label={source.label}
                synced={synced}
                chunked={latest ? sourceMetric(latest, source.key, "chunked") : 0}
                embedded={latest ? sourceMetric(latest, source.key, "embedded") : 0}
                syncedDelta={previousSynced !== undefined ? synced - previousSynced : undefined}
              />
            );
          })}
        </div>
      </section>

      {/* ─── Compiler KPIs ──────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Compilers &amp; project intelligence</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COMPILERS.map((compiler) => {
            const total = latest ? (latest[compiler.key] as number) : 0;
            const previousTotal = previous ? (previous[compiler.key] as number) : undefined;
            return (
              <CompilerKpiCard
                key={compiler.key}
                label={compiler.label}
                total={total}
                delta={previousTotal !== undefined ? total - previousTotal : undefined}
              />
            );
          })}
        </div>
      </section>

      {/* ─── Snapshot history table ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-foreground">Snapshot history</h2>
          <span className="text-xs text-muted-foreground">
            Showing {snapshots.length} of last 60 · written {cron}
          </span>
        </div>

        <InlineTable variant="read">
          <InlineTableHeader>
            <InlineTableHeaderRow type="group">
              <InlineTableHeaderCell rowSpan={2}>Captured</InlineTableHeaderCell>
              <InlineTableHeaderCell colSpan={3} align="center" divider>
                OneDrive
              </InlineTableHeaderCell>
              <InlineTableHeaderCell colSpan={3} align="center" divider>
                Outlook
              </InlineTableHeaderCell>
              <InlineTableHeaderCell colSpan={3} align="center" divider>
                Meetings
              </InlineTableHeaderCell>
              <InlineTableHeaderCell colSpan={3} align="center" divider>
                Teams
              </InlineTableHeaderCell>
              <InlineTableHeaderCell colSpan={3} align="center" divider>
                Compilers
              </InlineTableHeaderCell>
              <InlineTableHeaderCell align="center" divider>
                PI
              </InlineTableHeaderCell>
            </InlineTableHeaderRow>
            <InlineTableHeaderRow>
              {SOURCES.map((source, idx) => (
                <React.Fragment key={source.key}>
                  <InlineTableHeaderCell align="right" divider={idx === 0}>
                    Synced
                  </InlineTableHeaderCell>
                  <InlineTableHeaderCell align="right">Chunked</InlineTableHeaderCell>
                  <InlineTableHeaderCell align="right">Embedded</InlineTableHeaderCell>
                </React.Fragment>
              ))}
              <InlineTableHeaderCell align="right" divider>
                Teams
              </InlineTableHeaderCell>
              <InlineTableHeaderCell align="right">Tasks</InlineTableHeaderCell>
              <InlineTableHeaderCell align="right">Insights</InlineTableHeaderCell>
              <InlineTableHeaderCell align="right" divider>
                Packets
              </InlineTableHeaderCell>
            </InlineTableHeaderRow>
          </InlineTableHeader>

          <InlineTableBody>
            {loading && snapshots.length === 0 && (
              <InlineTableRow>
                <InlineTableCell colSpan={17} align="center" className="py-8 text-muted-foreground">
                  Loading snapshots…
                </InlineTableCell>
              </InlineTableRow>
            )}

            {!loading && snapshots.length === 0 && (
              <InlineTableRow>
                <InlineTableCell colSpan={17} align="center" className="py-8 text-muted-foreground">
                  No snapshots yet. The first row is written by the alleato-rag-snapshot Render cron at {cron}.
                </InlineTableCell>
              </InlineTableRow>
            )}

            {snapshots.map((snapshot) => (
              <InlineTableRow key={snapshot.id}>
                <InlineTableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatTimestamp(snapshot.captured_at)}
                </InlineTableCell>
                {SOURCES.map((source, idx) => (
                  <React.Fragment key={source.key}>
                    <InlineTableCell align="right" numeric divider={idx === 0}>
                      {formatNumber(sourceMetric(snapshot, source.key, "synced"))}
                    </InlineTableCell>
                    <InlineTableCell align="right" numeric>
                      {formatNumber(sourceMetric(snapshot, source.key, "chunked"))}
                    </InlineTableCell>
                    <InlineTableCell align="right" numeric>
                      {formatNumber(sourceMetric(snapshot, source.key, "embedded"))}
                    </InlineTableCell>
                  </React.Fragment>
                ))}
                <InlineTableCell align="right" numeric divider>
                  {formatNumber(snapshot.teams_compiler_total)}
                </InlineTableCell>
                <InlineTableCell align="right" numeric>
                  {formatNumber(snapshot.task_extraction_total)}
                </InlineTableCell>
                <InlineTableCell align="right" numeric>
                  {formatNumber(snapshot.insight_extraction_total)}
                </InlineTableCell>
                <InlineTableCell align="right" numeric divider>
                  {formatNumber(snapshot.project_intelligence_packets)}
                </InlineTableCell>
              </InlineTableRow>
            ))}
          </InlineTableBody>
        </InlineTable>
      </section>
    </PageShell>
  );
}
