#!/usr/bin/env tsx
import { resolve } from "node:path";
import * as dotenv from "dotenv";
import type { Database } from "../src/types/database.types";

dotenv.config({ path: resolve(process.cwd(), "../.env") });
dotenv.config({ path: resolve(process.cwd(), ".env") });
dotenv.config({ path: resolve(process.cwd(), ".env.local"), override: true });

type RunStatus = "running" | "succeeded" | "failed";
type SourceSyncRunInsert = Database["public"]["Tables"]["source_sync_runs"]["Insert"];
type SourceSyncRunUpdate = Database["public"]["Tables"]["source_sync_runs"]["Update"];

type LocalScheduleDecision = {
  shouldRun: boolean;
  timezone: string | null;
  targetLocalTime: string | null;
  currentLocalTime: string | null;
  currentLocalWeekday: number | null;
};

function cliArg(name: string): string | null {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function csvNumbers(value: string | undefined, fallback: number[]): number[] {
  if (!value?.trim()) return fallback;
  const numbers = value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item));
  return numbers.length > 0 ? numbers : fallback;
}

function localParts(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(
    get("weekday"),
  ) + 1;
  return { time: `${get("hour")}:${get("minute")}`, weekday };
}

function localScheduleDecision(now = new Date()): LocalScheduleDecision {
  const timezone =
    process.env.EXECUTIVE_DAILY_BRIEF_TARGET_TIMEZONE?.trim() || null;
  const targetLocalTime =
    process.env.EXECUTIVE_DAILY_BRIEF_TARGET_LOCAL_TIME?.trim() || null;

  if (!timezone || !targetLocalTime) {
    return { shouldRun: true, timezone, targetLocalTime, currentLocalTime: null, currentLocalWeekday: null };
  }

  const weekdays = csvNumbers(process.env.EXECUTIVE_DAILY_BRIEF_TARGET_WEEKDAYS, [1, 2, 3, 4, 5]);
  const current = localParts(now, timezone);

  return {
    shouldRun: current.time === targetLocalTime && weekdays.includes(current.weekday),
    timezone,
    targetLocalTime,
    currentLocalTime: current.time,
    currentLocalWeekday: current.weekday,
  };
}

function supabaseRestConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url) throw new Error("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required.");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY is required.");
  return { restUrl: `${url.replace(/\/+$/, "")}/rest/v1`, key };
}

async function supabaseRestFetch<T>(path: string, init: RequestInit, timeoutMs = 30_000): Promise<T> {
  const { restUrl, key } = supabaseRestConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${restUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Supabase REST ${response.status}: ${text.slice(0, 1000)}`);
    return (text ? JSON.parse(text) : null) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Supabase REST request timed out after ${timeoutMs}ms: ${path}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function createRun(startedAt: string): Promise<{ id?: string }> {
  const payload = {
    source: "executive_daily_brief",
    resource_id: process.env.EXECUTIVE_DAILY_BRIEF_RESOURCE_ID ?? "scheduled_executive_daily_brief",
    resource_name: "Executive Daily Brief",
    stage: "generate_and_send",
    status: "running" satisfies RunStatus,
    started_at: startedAt,
    items_seen: 0,
    items_synced: 0,
    items_created: 0,
    items_updated: 0,
    items_skipped: 0,
    items_failed: 0,
    metadata: {
      trigger: cliArg("--trigger") ?? process.env.EXECUTIVE_DAILY_BRIEF_TRIGGER ?? "render_cron",
      schedule: process.env.EXECUTIVE_DAILY_BRIEF_SCHEDULE ?? null,
      targetTimezone: process.env.EXECUTIVE_DAILY_BRIEF_TARGET_TIMEZONE ?? null,
      targetLocalTime: process.env.EXECUTIVE_DAILY_BRIEF_TARGET_LOCAL_TIME ?? null,
    },
  } satisfies SourceSyncRunInsert;

  const rows = await supabaseRestFetch<Array<{ id?: string }>>(
    "/source_sync_runs?select=id",
    { method: "POST", headers: { prefer: "return=representation" }, body: JSON.stringify(payload) },
  );
  return rows[0] ?? {};
}

async function updateRun(runId: string | undefined, payload: SourceSyncRunUpdate) {
  if (!runId) return;
  try {
    await supabaseRestFetch<unknown>(
      `/source_sync_runs?id=eq.${encodeURIComponent(runId)}`,
      { method: "PATCH", body: JSON.stringify({ ...payload, finished_at: new Date().toISOString() }) },
    );
  } catch (error) {
    console.warn("[executive-daily-brief] Failed to update run row", {
      runId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function main() {
  const nowArg = cliArg("--now");
  const now = nowArg ? new Date(nowArg) : new Date();
  const schedule = localScheduleDecision(now);

  if (!schedule.shouldRun) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: "outside_target_local_schedule", schedule }, null, 2));
    return;
  }

  const startedAt = new Date().toISOString();
  const run = await createRun(startedAt);
  const startMs = Date.now();

  try {
    const { sendOwnerBriefingToTeams } = await import(
      "../src/lib/executive/owner-briefing-delivery"
    );

    const result = await sendOwnerBriefingToTeams({ now });

    if (!result.ok) {
      throw new Error(`Owner briefing failed (${result.status}): ${result.reason}`);
    }

    await updateRun(run.id, {
      status: "succeeded" satisfies RunStatus,
      items_seen: result.decisionsNeeded + result.actionsRequired,
      items_synced: result.recipients.filter((r) => r.sent).length,
      items_created: 0,
      items_updated: result.recipients.filter((r) => r.sent).length,
      items_failed: result.recipients.filter((r) => !r.sent).length,
      metadata: {
        sentAt: result.sentAt,
        decisionsNeeded: result.decisionsNeeded,
        actionsRequired: result.actionsRequired,
        projectsShown: result.projectsShown,
        recipients: result.recipients,
        durationMs: Date.now() - startMs,
      },
    });

    console.log(JSON.stringify({
      ok: true,
      sentAt: result.sentAt,
      decisionsNeeded: result.decisionsNeeded,
      actionsRequired: result.actionsRequired,
      projectsShown: result.projectsShown,
      recipients: result.recipients,
      durationMs: Date.now() - startMs,
    }, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateRun(run.id, {
      status: "failed" satisfies RunStatus,
      items_failed: 1,
      error_code: "EXECUTIVE_DAILY_BRIEF_FAILED",
      error_message: message.replace(/\s+/g, " ").slice(0, 1800),
      metadata: { durationMs: Date.now() - startMs },
    });
    console.error("[executive-daily-brief] failed:", message);
    process.exit(1);
  }
}

main();
