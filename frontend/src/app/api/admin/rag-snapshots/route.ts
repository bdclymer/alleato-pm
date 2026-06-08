import { NextResponse } from "next/server";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { createClient } from "@/lib/supabase/server";
import { createRagServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
const WHERE = "/api/admin/rag-snapshots#GET";

/**
 * Daily sync health for the /rag dashboard.
 *
 * Returns one row per day for the last N days, with per-source totals for
 * items successfully synced and items that failed. Source rows in
 * `source_sync_runs` are bucketed into the four user-visible sources
 * (OneDrive, Outlook, Meetings, Teams). Days with no sync activity at all
 * still appear so a multi-day stall is obvious at a glance.
 */

export type SourceKey = "onedrive" | "outlook" | "meetings" | "teams";

export type DailySyncRow = {
  /** ISO date (YYYY-MM-DD), UTC. */
  date: string;
  onedrive_synced: number;
  onedrive_failed: number;
  outlook_synced: number;
  outlook_failed: number;
  meetings_synced: number;
  meetings_failed: number;
  teams_synced: number;
  teams_failed: number;
  /** Total runs that landed in any non-success status (error/failed/warning) for that date. */
  failed_runs: number;
};

const SOURCE_BUCKETS: Record<string, SourceKey> = {
  onedrive_file: "onedrive",
  sharepoint_file: "onedrive",
  outlook_email: "outlook",
  fireflies: "meetings",
  teams_message: "teams",
  teams_chat_export: "teams",
};

const FAILURE_STATUSES = new Set(["error", "failed", "warning"]);

function addSourceTotals(
  day: DailySyncRow,
  bucket: SourceKey,
  synced: number,
  failed: number,
) {
  if (bucket === "onedrive") {
    day.onedrive_synced += synced;
    day.onedrive_failed += failed;
    return;
  }
  if (bucket === "outlook") {
    day.outlook_synced += synced;
    day.outlook_failed += failed;
    return;
  }
  if (bucket === "meetings") {
    day.meetings_synced += synced;
    day.meetings_failed += failed;
    return;
  }
  day.teams_synced += synced;
  day.teams_failed += failed;
}

export const GET = withApiGuardrails(WHERE, async ({ request }) => {
  const supabase = await createClient();
  const ragSupabase = createRagServiceClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const days = Math.min(
    Math.max(parseInt(url.searchParams.get("days") || "30", 10) || 30, 1),
    180,
  );

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  since.setUTCHours(0, 0, 0, 0);

  const { data, error } = await ragSupabase
    .from("source_sync_runs")
    .select("source,started_at,items_synced,items_failed,status")
    .gte("started_at", since.toISOString())
    .in("source", Object.keys(SOURCE_BUCKETS))
    .order("started_at", { ascending: false })
    .limit(10000);

  if (error) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as Array<{
    source: string;
    started_at: string;
    items_synced: number | null;
    items_failed: number | null;
    status: string | null;
  }>;

  const byDay = new Map<string, DailySyncRow>();
  for (const row of rows) {
    const bucket = SOURCE_BUCKETS[row.source];
    if (!bucket) continue;

    const date = row.started_at.slice(0, 10);
    let day = byDay.get(date);
    if (!day) {
      day = {
        date,
        onedrive_synced: 0,
        onedrive_failed: 0,
        outlook_synced: 0,
        outlook_failed: 0,
        meetings_synced: 0,
        meetings_failed: 0,
        teams_synced: 0,
        teams_failed: 0,
        failed_runs: 0,
      };
      byDay.set(date, day);
    }

    const synced = row.items_synced ?? 0;
    const failed = row.items_failed ?? 0;
    addSourceTotals(day, bucket, synced, failed);
    if (row.status && FAILURE_STATUSES.has(row.status)) {
      day.failed_runs += 1;
    }
  }

  // Fill in empty days so a multi-day stall is visible as a row of zeros
  // rather than an absent row.
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  for (const date of dates) {
    if (!byDay.has(date)) {
      byDay.set(date, {
        date,
        onedrive_synced: 0,
        onedrive_failed: 0,
        outlook_synced: 0,
        outlook_failed: 0,
        meetings_synced: 0,
        meetings_failed: 0,
        teams_synced: 0,
        teams_failed: 0,
        failed_runs: 0,
      });
    }
  }

  const days_sorted = Array.from(byDay.values()).sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  );

  return NextResponse.json({
    days: days_sorted,
    count: days_sorted.length,
  });
});
