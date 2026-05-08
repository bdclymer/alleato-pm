import { NextResponse } from "next/server";
import { z } from "zod";

import { validateResponseContract, withApiGuardrails } from "@/lib/guardrails/api";
import { createServiceClient } from "@/lib/supabase/service";

import { fetchBackendCompiler, requireAdmin } from "../../intelligence-compiler/_shared";
import { fetchBackendSourceSync } from "../../source-sync/_shared";

const StatusMapSchema = z.record(z.string(), z.number());

const SourceSyncStatusSchema = z.object({
  status: z.enum(["healthy", "degraded"]),
  healthy: z.boolean(),
  generatedAt: z.string(),
  counts: z.object({
    alerts: z.number(),
    documents: z.number(),
    chunks: z.number(),
    unembedded: z.number(),
    uncompiled: z.number(),
    tasks: z.number(),
    stuckItems: z.number(),
  }),
  alerts: z.array(
    z.object({
      severity: z.enum(["info", "warning", "critical"]).or(z.string()),
      code: z.string(),
      source: z.string(),
      resourceId: z.string(),
      message: z.string(),
      detectedAt: z.string().nullable(),
    }),
  ),
  recentRuns: z.array(
    z.object({
      source: z.string(),
      stage: z.string(),
      status: z.string(),
      resourceName: z.string().nullable(),
      finishedAt: z.string().nullable(),
      errorCode: z.string().nullable(),
      errorMessage: z.string().nullable(),
    }),
  ),
});

const CompilerStatusSchema = z.object({
  status: z.enum(["healthy", "unhealthy"]),
  healthy: z.boolean(),
  counts: z.object({
    sourceJobsByStatus: StatusMapSchema,
    packetJobsByStatus: StatusMapSchema,
    insightCards: z.number(),
    currentPackets: z.number(),
  }),
  unhealthyChecks: z.record(z.string(), z.number()),
  generatedAt: z.string(),
});

type ReadinessLevel = "ready" | "attention" | "blocked" | "unknown";

type ReadinessItem = {
  id: "source-data" | "tasks" | "project-intelligence" | "daily-brief";
  question: string;
  answer: string;
  level: ReadinessLevel;
  checkedAt: string;
  metrics: Array<{ label: string; value: string }>;
  blocker: string | null;
  cause: string;
  prevention: string;
  primaryAction: { label: string; href: string };
  runActions: Array<{
    id: string;
    label: string;
    endpoint: string;
    method: "POST";
    body?: Record<string, unknown>;
    confirm?: string;
  }>;
};

type DailyBriefPacket = {
  generatedAt?: unknown;
  sections?: {
    needsBrandon?: unknown[];
    waitingOnOthers?: unknown[];
    importantUpdates?: unknown[];
  };
  sourceCoverage?: Array<{ status?: string; warning?: string }>;
};

function formatCount(value: number | null | undefined): string {
  return typeof value === "number" ? value.toLocaleString() : "0";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function firstMeaningfulError(status: z.infer<typeof SourceSyncStatusSchema>) {
  const failedRun = status.recentRuns.find(
    (run) => run.status === "failed" && (run.errorMessage || run.errorCode),
  );
  if (failedRun) {
    return `${failedRun.resourceName ?? failedRun.source} ${failedRun.stage}: ${
      failedRun.errorMessage ?? failedRun.errorCode
    }`;
  }

  const alert = status.alerts.find((item) => item.severity === "critical") ?? status.alerts[0];
  return alert?.message ?? null;
}

function totalStatus(map: Record<string, number>, statuses: string[]) {
  return statuses.reduce((total, status) => total + (map[status] ?? 0), 0);
}

function packetItemCount(packet: DailyBriefPacket | null): number {
  if (!packet?.sections) return 0;
  return (
    (packet.sections.needsBrandon?.length ?? 0) +
    (packet.sections.waitingOnOthers?.length ?? 0) +
    (packet.sections.importantUpdates?.length ?? 0)
  );
}

function parseDailyPacket(value: unknown): DailyBriefPacket | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as DailyBriefPacket;
}

async function fetchJson<TSchema extends z.ZodTypeAny>(
  requestId: string,
  where: string,
  label: string,
  fetcher: () => Promise<Response>,
  schema: TSchema,
): Promise<z.infer<TSchema> | { error: string }> {
  try {
    const response = await fetcher();
    const payload = await response.json();
    return validateResponseContract(
      schema,
      payload,
      `${where}.${label}`,
    ) as z.infer<TSchema>;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown readiness dependency failure.",
    };
  }
}

async function countTasksSince(iso: string, column: "created_at" | "updated_at") {
  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .gte(column, iso);

  if (error) throw new Error(`Failed to count ${column} tasks: ${error.message}`);
  return count ?? 0;
}

async function loadLatestDailyBrief() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("daily_recaps")
    .select(
      "id, recap_date, created_at, approved_at, sent_at, sent_email, sent_teams, workflow_status, briefing_packet",
    )
    .eq("recap_kind", "executive_briefing")
    .order("recap_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to load daily brief status: ${error.message}`);
  return data;
}

export const GET = withApiGuardrails(
  "api.admin.operations-readiness.status.GET",
  async ({ requestId }) => {
    await requireAdmin("api.admin.operations-readiness.status.GET");

    const now = new Date();
    const generatedAt = now.toISOString();
    const since24h = new Date(now.getTime() - 86_400_000).toISOString();

    const [sourceResult, compilerResult, newTasks, updatedTasks, dailyBrief] =
      await Promise.all([
        fetchJson(
          requestId,
          "api.admin.operations-readiness.status.GET",
          "source-sync",
          () =>
            fetchBackendSourceSync(
              requestId,
              "api.admin.operations-readiness.status.GET",
              "status",
              { method: "GET" },
            ),
          SourceSyncStatusSchema,
        ),
        fetchJson(
          requestId,
          "api.admin.operations-readiness.status.GET",
          "compiler",
          () =>
            fetchBackendCompiler(
              requestId,
              "api.admin.operations-readiness.status.GET",
              "status",
              { method: "GET" },
            ),
          CompilerStatusSchema,
        ),
        countTasksSince(since24h, "created_at"),
        countTasksSince(since24h, "updated_at"),
        loadLatestDailyBrief(),
      ]);

    const sourceUnavailable = "error" in sourceResult;
    const compilerUnavailable = "error" in compilerResult;
    const sourceBlocker = sourceUnavailable ? sourceResult.error : firstMeaningfulError(sourceResult);
    const sourceLevel: ReadinessLevel = sourceUnavailable
      ? "unknown"
      : sourceResult.counts.unembedded > 0 || sourceResult.counts.uncompiled > 0
        ? "attention"
        : sourceResult.healthy
          ? "ready"
          : "blocked";

    const packetQueued = compilerUnavailable
      ? 0
      : totalStatus(compilerResult.counts.packetJobsByStatus, ["queued", "running"]);
    const packetFailed = compilerUnavailable
      ? 0
      : totalStatus(compilerResult.counts.packetJobsByStatus, ["failed", "error"]);
    const compilerBlocker = compilerUnavailable
      ? compilerResult.error
      : Object.entries(compilerResult.unhealthyChecks)
          .filter(([, value]) => value > 0)
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ") || null;

    const dailyPacket = parseDailyPacket(dailyBrief?.briefing_packet ?? null);
    const dailyItemCount = packetItemCount(dailyPacket);
    const dailyGeneratedAt =
      typeof dailyPacket?.generatedAt === "string"
        ? dailyPacket.generatedAt
        : dailyBrief?.created_at ?? null;
    const dailySourceWarning = dailyPacket?.sourceCoverage?.find(
      (source) => source.status === "warning" && source.warning,
    )?.warning;

    const items: ReadinessItem[] = [
      {
        id: "source-data",
        question: "Has all source data been synced and embedded?",
        answer:
          sourceLevel === "ready"
            ? "Yes. Sources are synced, searchable, and compiled."
            : sourceLevel === "unknown"
              ? "Unknown. The source health service did not answer."
              : "Not completely. Some data still needs sync, embedding, or compiler work.",
        level: sourceLevel,
        checkedAt: sourceUnavailable ? generatedAt : sourceResult.generatedAt,
        metrics: sourceUnavailable
          ? [{ label: "Health service", value: "Unavailable" }]
          : [
              { label: "Documents", value: formatCount(sourceResult.counts.documents) },
              { label: "Chunks", value: formatCount(sourceResult.counts.chunks) },
              { label: "Not searchable", value: formatCount(sourceResult.counts.unembedded) },
              { label: "Not in packets", value: formatCount(sourceResult.counts.uncompiled) },
            ],
        blocker: sourceBlocker,
        cause: sourceBlocker
          ? "A source, embedding, or compiler stage is reporting backlog or a recent provider failure."
          : "No active source-sync blocker is currently reported.",
        prevention:
          "Keep the source-sync health check visible and alert when synced items remain unembedded or uncompiled after the normal job window.",
        primaryAction: { label: "Open source sync", href: "/source-sync" },
        runActions: sourceUnavailable
          ? []
          : [
              {
                id: "embed-pending",
                label: "Embed pending",
                endpoint: "/api/admin/source-sync/graph-embed",
                method: "POST",
                body: { limit: 100 },
              },
              {
                id: "recompute-health",
                label: "Recompute health",
                endpoint: "/api/admin/source-sync/recompute",
                method: "POST",
              },
            ],
      },
      {
        id: "tasks",
        question: "Have all generated tasks been updated?",
        answer:
          sourceUnavailable || (sourceResult.counts.tasks === 0 && newTasks === 0)
            ? "Needs review. Task generation cannot be trusted without source health."
            : "Current enough to review. Recent generated task changes are visible in Tasks.",
        level:
          sourceUnavailable || (!sourceUnavailable && sourceResult.counts.stuckItems > 0)
            ? "attention"
            : "ready",
        checkedAt: generatedAt,
        metrics: [
          { label: "Total extracted tasks", value: sourceUnavailable ? "Unknown" : formatCount(sourceResult.counts.tasks) },
          { label: "Created in 24h", value: formatCount(newTasks) },
          { label: "Updated in 24h", value: formatCount(updatedTasks) },
        ],
        blocker:
          sourceUnavailable || (!sourceUnavailable && sourceResult.counts.stuckItems > 0)
            ? "Task extraction depends on the same source pipeline; stuck source items can leave tasks stale."
            : null,
        cause:
          "Generated tasks are derived from synced communication/document records, so task freshness follows source ingestion health.",
        prevention:
          "Track task created/updated counts beside source health so extraction drops are visible before a user notices missing follow-ups.",
        primaryAction: { label: "Open tasks", href: "/tasks" },
        runActions: [],
      },
      {
        id: "project-intelligence",
        question: "Have project intelligence and packets been updated?",
        answer:
          compilerUnavailable
            ? "Unknown. The compiler health service did not answer."
            : packetFailed > 0
              ? "No. Packet refresh jobs are failing."
              : packetQueued > 0
                ? "In progress. Packet work is queued or running."
                : "Yes. Current packets are available.",
        level: compilerUnavailable
          ? "unknown"
          : packetFailed > 0
            ? "blocked"
            : packetQueued > 0 || !compilerResult.healthy
              ? "attention"
              : "ready",
        checkedAt: compilerUnavailable ? generatedAt : compilerResult.generatedAt,
        metrics: compilerUnavailable
          ? [{ label: "Compiler service", value: "Unavailable" }]
          : [
              { label: "Current packets", value: formatCount(compilerResult.counts.currentPackets) },
              { label: "Insight cards", value: formatCount(compilerResult.counts.insightCards) },
              { label: "Packet jobs active", value: formatCount(packetQueued) },
              { label: "Packet jobs failed", value: formatCount(packetFailed) },
            ],
        blocker: compilerBlocker,
        cause: compilerBlocker
          ? "The compiler reports packet, source-job, or evidence checks that need attention."
          : "No compiler blocker is currently reported.",
        prevention:
          "Keep packet job failures and stale queued jobs as first-class readiness checks, not hidden in raw job tables.",
        primaryAction: { label: "Open compiler health", href: "/intelligence-compiler" },
        runActions: compilerUnavailable
          ? []
          : [
              {
                id: "run-compiler",
                label: "Run compiler",
                endpoint: "/api/admin/intelligence-compiler/run",
                method: "POST",
                body: {
                  sourceLimit: 10,
                  packetLimit: 10,
                  background: true,
                  maxProcessingTimeMs: 120000,
                },
              },
            ],
      },
      {
        id: "daily-brief",
        question: "Has the daily brief been updated?",
        answer: !dailyBrief
          ? "No. No executive brief exists yet."
          : dailyBrief.sent_teams
            ? "Yes. The latest brief was generated and sent to Teams."
            : dailyBrief.workflow_status === "approved"
              ? "Generated and approved, but not sent to Teams."
              : "Generated as a draft, but not approved or sent.",
        level: !dailyBrief
          ? "blocked"
          : dailyBrief.sent_teams
            ? "ready"
            : dailyBrief.workflow_status === "approved"
              ? "attention"
              : "attention",
        checkedAt: generatedAt,
        metrics: [
          { label: "Brief date", value: dailyBrief?.recap_date ?? "Missing" },
          { label: "Generated", value: formatDate(dailyGeneratedAt) },
          { label: "Approved", value: formatDate(dailyBrief?.approved_at) },
          { label: "Items", value: formatCount(dailyItemCount) },
        ],
        blocker: !dailyBrief
          ? "No executive briefing row was found."
          : dailyBrief.sent_teams
            ? dailySourceWarning ?? null
            : "The latest executive brief has not been sent to Teams.",
        cause: !dailyBrief
          ? "The daily briefing job has not persisted a recap packet."
          : dailySourceWarning
            ? `The brief was created, but source coverage reported: ${dailySourceWarning}`
            : "Daily brief status comes from the persisted executive briefing packet and delivery flags.",
        prevention:
          "Show generated, approved, and sent states together so a brief cannot look complete when delivery is still pending.",
        primaryAction: { label: "Open executive brief", href: "/executive" },
        runActions:
          dailyBrief && !dailyBrief.sent_teams && dailyBrief.workflow_status === "approved"
            ? [
                {
                  id: "send-daily-brief-teams",
                  label: "Send to Teams",
                  endpoint: "/api/executive/daily-brief/send-teams",
                  method: "POST",
                  confirm:
                    "Send the approved daily brief to Teams now? This is externally visible.",
                },
              ]
            : [],
      },
    ];

    const blocked = items.filter((item) => item.level === "blocked").length;
    const attention = items.filter((item) => item.level === "attention").length;
    const unknown = items.filter((item) => item.level === "unknown").length;

    return NextResponse.json({
      generatedAt,
      status: blocked > 0 || unknown > 0 ? "blocked" : attention > 0 ? "attention" : "ready",
      summary:
        blocked > 0 || unknown > 0
          ? "One or more readiness checks cannot be trusted yet."
          : attention > 0
            ? "The core systems are available, but follow-up is needed."
            : "All four operating answers are currently ready.",
      counts: { ready: items.filter((item) => item.level === "ready").length, attention, blocked, unknown },
      items,
    });
  },
);
