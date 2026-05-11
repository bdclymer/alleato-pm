#!/usr/bin/env tsx
import * as dotenv from "dotenv";
import { resolve } from "path";
import type { BrandonDailyUpdatePacket } from "../src/lib/executive/brandon-daily-update";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.types";

dotenv.config({ path: resolve(process.cwd(), "../.env") });
dotenv.config({ path: resolve(process.cwd(), ".env") });
dotenv.config({ path: resolve(process.cwd(), ".env.local"), override: true });

type RunStatus = "running" | "success" | "failed";
type ServiceClient = SupabaseClient<Database>;
type SourceSyncRunInsert = Database["public"]["Tables"]["source_sync_runs"]["Insert"];
type SourceSyncRunUpdate = Database["public"]["Tables"]["source_sync_runs"]["Update"];

type RunRow = {
  id?: string;
};

type ExecutiveBriefingDraft = {
  id: string;
  recapDate: string;
  packet: BrandonDailyUpdatePacket;
};

type ExecutiveBriefingWorkflowModule = {
  regenerateExecutiveBriefingDraft(options: {
    sourceBackedOnly?: boolean;
  }): Promise<{ draft: ExecutiveBriefingDraft }>;
};

type SupabaseServiceModule = {
  createServiceClient(): ServiceClient;
};

function envFlag(name: string, defaultValue: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return defaultValue;
  return ["1", "true", "yes", "on"].includes(value);
}

function compactError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").slice(0, 1800);
}

function frontendBaseUrl(): string {
  const configured =
    process.env.EXECUTIVE_DAILY_BRIEF_FRONTEND_BASE_URL ??
    process.env.FRONTEND_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (!configured) {
    throw new Error(
      "EXECUTIVE_DAILY_BRIEF_FRONTEND_BASE_URL or FRONTEND_BASE_URL is required for Teams delivery.",
    );
  }

  const withProtocol = /^https?:\/\//i.test(configured)
    ? configured
    : `https://${configured}`;
  return withProtocol.replace(/\/+$/, "");
}

function cliArg(name: string): string | null {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

async function createRun(client: ServiceClient, startedAt: string): Promise<RunRow> {
  const payload = {
    source: "executive_daily_brief",
    resource_id:
      process.env.EXECUTIVE_DAILY_BRIEF_RESOURCE_ID ??
      "scheduled_executive_daily_brief",
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
      sendTeams: envFlag("EXECUTIVE_DAILY_BRIEF_SEND_TEAMS", true),
    },
  } satisfies SourceSyncRunInsert;

  const response = await client.from("source_sync_runs").insert(payload).select("id").single();
  if (response.error) {
    throw new Error(`Failed to create executive daily brief run row: ${response.error.message}`);
  }
  return response.data ?? {};
}

async function updateRun(
  client: ServiceClient,
  runId: string | undefined,
  payload: SourceSyncRunUpdate,
) {
  if (!runId) return;
  const response = await client
    .from("source_sync_runs")
    .update({
      ...payload,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);
  if (response.error) {
    console.warn("[executive-daily-brief] Failed to update run row", {
      runId,
      error: response.error.message,
    });
  }
}

async function sendStoredBriefToTeams(userId?: string | null) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    throw new Error("CRON_SECRET is required for Teams delivery.");
  }

  const response = await fetch(`${frontendBaseUrl()}/api/executive/daily-brief/send-teams`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${cronSecret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(userId ? { userId } : {}),
  });
  const body = await response.text();
  let parsed: unknown = body;
  try {
    parsed = body ? JSON.parse(body) : null;
  } catch {
    // Keep the raw body for diagnostics.
  }

  if (!response.ok) {
    throw new Error(
      `Teams delivery failed with ${response.status}: ${
        typeof parsed === "string" ? parsed.slice(0, 1000) : JSON.stringify(parsed)
      }`,
    );
  }

  return parsed;
}

async function main() {
  const workflowModule = (await import(
    "../src/lib/executive/executive-briefing-workflow"
  )) as ExecutiveBriefingWorkflowModule;
  const serviceModule = (await import("../src/lib/supabase/service")) as SupabaseServiceModule;
  const { regenerateExecutiveBriefingDraft } = workflowModule;
  const { createServiceClient } = serviceModule;
  const client = createServiceClient();
  const startedAt = new Date().toISOString();
  const run = await createRun(client, startedAt);
  const startMs = Date.now();

  try {
    const { draft } = await regenerateExecutiveBriefingDraft({
      sourceBackedOnly: true,
    });
    const itemCounts = {
      needsBrandon: draft.packet.sections.needsBrandon.length,
      waitingOnOthers: draft.packet.sections.waitingOnOthers.length,
      importantUpdates: draft.packet.sections.importantUpdates.length,
    };
    const totalItems =
      itemCounts.needsBrandon +
      itemCounts.waitingOnOthers +
      itemCounts.importantUpdates;

    const shouldSend = envFlag("EXECUTIVE_DAILY_BRIEF_SEND_TEAMS", true);
    const userId =
      cliArg("--user-id") ??
      process.env.EXECUTIVE_DAILY_BRIEF_TEAMS_USER_ID ??
      null;
    const deliveryResult = shouldSend ? await sendStoredBriefToTeams(userId) : null;

    await updateRun(client, run.id, {
      status: "success" satisfies RunStatus,
      items_seen: totalItems,
      items_synced: shouldSend ? 1 : 0,
      items_created: 1,
      items_updated: shouldSend ? 1 : 0,
      metadata: {
        draftId: draft.id,
        recapDate: draft.recapDate,
        generatedAt: draft.packet.generatedAt,
        generationMs: Date.now() - startMs,
        itemCounts,
        deliveryResult,
      },
    });

    console.log(
      JSON.stringify(
        {
          ok: true,
          draftId: draft.id,
          recapDate: draft.recapDate,
          itemCounts,
          sentTeams: shouldSend,
          deliveryResult,
          durationMs: Date.now() - startMs,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    const message = compactError(error);
    await updateRun(client, run.id, {
      status: "failed" satisfies RunStatus,
      items_failed: 1,
      error_code: "EXECUTIVE_DAILY_BRIEF_FAILED",
      error_message: message,
      metadata: {
        durationMs: Date.now() - startMs,
      },
    });
    console.error("[executive-daily-brief] failed:", message);
    process.exit(1);
  }
}

main();
