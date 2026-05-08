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

type SourceSyncStatus = z.infer<typeof SourceSyncStatusSchema>;
type CompilerStatus = z.infer<typeof CompilerStatusSchema>;

const SOURCE_HEALTH_DOCUMENT_LIMIT = 2500;
const SOURCE_HEALTH_CHUNK_LIMIT = 5000;
const SOURCE_HEALTH_JOB_LIMIT = 5000;
const STALE_SYNC_MINUTES = 120;

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

function countByStatus(rows: Array<{ status: string | null }>): Record<string, number> {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const status = row.status || "unknown";
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ageMinutes(value: string | null | undefined, now: Date): number | null {
  const date = parseDate(value);
  if (!date) return null;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000));
}

async function countTable(table: "tasks" | "insight_cards" | "intelligence_packets") {
  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  if (error) throw new Error(`Failed to count ${table}: ${error.message}`);
  return count ?? 0;
}

async function countCurrentPackets() {
  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from("intelligence_packets")
    .select("id", { count: "exact", head: true })
    .eq("packet_type", "current");

  if (error) throw new Error(`Failed to count current intelligence packets: ${error.message}`);
  return count ?? 0;
}

async function countSignalCandidates(status: string, confidence?: string) {
  const supabase = createServiceClient();
  let query = supabase
    .from("source_signal_candidates")
    .select("id", { count: "exact", head: true })
    .eq("status", status);

  if (confidence) query = query.eq("confidence", confidence);

  const { count, error } = await query;
  if (error) throw new Error(`Failed to count signal candidates: ${error.message}`);
  return count ?? 0;
}

async function loadSourceFallbackStatus(now: Date): Promise<SourceSyncStatus> {
  const supabase = createServiceClient();
  const [
    documentsResult,
    chunksResult,
    sourceJobsResult,
    graphStatesResult,
    recentRunsResult,
    totalTasks,
  ] = await Promise.all([
    supabase
      .from("document_metadata")
      .select("id,source,source_system,category,type,status,captured_at,date,created_at,source_last_modified_at")
      .limit(SOURCE_HEALTH_DOCUMENT_LIMIT),
    supabase
      .from("document_chunks")
      .select("document_id")
      .limit(SOURCE_HEALTH_CHUNK_LIMIT),
    supabase
      .from("source_intelligence_jobs")
      .select("status,source_document_id")
      .limit(SOURCE_HEALTH_JOB_LIMIT),
    supabase
      .from("graph_sync_state")
      .select("source,resource_id,resource_name,last_sync_at,sync_status,error_message,items_synced,updated_at")
      .order("last_sync_at", { ascending: true }),
    supabase
      .from("source_sync_runs")
      .select("source,stage,status,resource_name,finished_at,error_code,error_message")
      .order("started_at", { ascending: false })
      .limit(20),
    countTable("tasks"),
  ]);

  if (documentsResult.error) {
    throw new Error(`Failed to load source documents: ${documentsResult.error.message}`);
  }
  if (chunksResult.error) {
    throw new Error(`Failed to load source chunks: ${chunksResult.error.message}`);
  }
  if (sourceJobsResult.error) {
    throw new Error(`Failed to load source intelligence jobs: ${sourceJobsResult.error.message}`);
  }
  if (graphStatesResult.error) {
    throw new Error(`Failed to load graph sync state: ${graphStatesResult.error.message}`);
  }
  if (recentRunsResult.error) {
    throw new Error(`Failed to load source sync runs: ${recentRunsResult.error.message}`);
  }

  const chunkDocumentIds = new Set(
    (chunksResult.data ?? []).map((row) => row.document_id).filter(Boolean),
  );
  const compiledDocumentIds = new Set(
    (sourceJobsResult.data ?? [])
      .filter((row) => row.status === "succeeded" || row.status === "skipped")
      .map((row) => row.source_document_id)
      .filter(Boolean),
  );
  const documents = documentsResult.data ?? [];
  const unembedded = documents.filter((row) => !chunkDocumentIds.has(row.id)).length;
  const uncompiled = documents.filter((row) => !compiledDocumentIds.has(row.id)).length;
  const staleGraphStates = (graphStatesResult.data ?? [])
    .map((row) => ({
      ...row,
      staleMinutes: ageMinutes(row.last_sync_at, now),
    }))
    .filter((row) => row.error_message || row.staleMinutes === null || row.staleMinutes > STALE_SYNC_MINUTES);
  const primaryGraphIssue = staleGraphStates[0];
  const alerts: SourceSyncStatus["alerts"] = [];

  if (primaryGraphIssue) {
    alerts.push({
      severity: primaryGraphIssue.error_message ? "critical" : "warning",
      code: primaryGraphIssue.error_message ? "source_sync_error" : "source_sync_stale",
      source: primaryGraphIssue.source ?? "microsoft_graph",
      resourceId: primaryGraphIssue.resource_id ?? "default",
      message: `${primaryGraphIssue.resource_name ?? primaryGraphIssue.source ?? "Microsoft Graph"}: ${
        primaryGraphIssue.error_message ??
        (primaryGraphIssue.staleMinutes === null
          ? "No successful sync timestamp is available."
          : `Last sync is ${primaryGraphIssue.staleMinutes} minutes old.`)
      }`,
      detectedAt: now.toISOString(),
    });
  }

  if (unembedded > 0) {
    alerts.push({
      severity: "warning",
      code: "embedding_backlog",
      source: "vectorization",
      resourceId: "document_metadata",
      message: `${unembedded} synced item(s) are missing searchable chunks.`,
      detectedAt: now.toISOString(),
    });
  }

  if (uncompiled > 0) {
    alerts.push({
      severity: "warning",
      code: "compiler_backlog",
      source: "intelligence_compiler",
      resourceId: "source_intelligence_jobs",
      message: `${uncompiled} synced item(s) are not represented in project intelligence packets.`,
      detectedAt: now.toISOString(),
    });
  }

  return {
    status: alerts.length > 0 ? "degraded" : "healthy",
    healthy: alerts.length === 0,
    generatedAt: now.toISOString(),
    counts: {
      alerts: alerts.length,
      documents: documents.length,
      chunks: chunksResult.data?.length ?? 0,
      unembedded,
      uncompiled,
      tasks: totalTasks,
      stuckItems: 0,
    },
    alerts,
    recentRuns: (recentRunsResult.data ?? []).map((run) => ({
      source: run.source ?? "unknown",
      stage: run.stage ?? "unknown",
      status: run.status ?? "unknown",
      resourceName: run.resource_name,
      finishedAt: run.finished_at,
      errorCode: run.error_code,
      errorMessage: run.error_message,
    })),
  };
}

async function loadCompilerFallbackStatus(now: Date): Promise<CompilerStatus> {
  const supabase = createServiceClient();
  const [
    sourceJobsResult,
    packetJobsResult,
    insightCards,
    currentPackets,
    highConfidenceUnpromoted,
  ] = await Promise.all([
    supabase
      .from("source_intelligence_jobs")
      .select("status")
      .limit(SOURCE_HEALTH_JOB_LIMIT),
    supabase
      .from("packet_refresh_jobs")
      .select("status")
      .limit(SOURCE_HEALTH_JOB_LIMIT),
    countTable("insight_cards"),
    countCurrentPackets(),
    countSignalCandidates("candidate", "high"),
  ]);

  if (sourceJobsResult.error) {
    throw new Error(`Failed to load source intelligence jobs: ${sourceJobsResult.error.message}`);
  }
  if (packetJobsResult.error) {
    throw new Error(`Failed to load packet refresh jobs: ${packetJobsResult.error.message}`);
  }

  const sourceJobsByStatus = countByStatus(sourceJobsResult.data ?? []);
  const packetJobsByStatus = countByStatus(packetJobsResult.data ?? []);
  const sourceFailed = totalStatus(sourceJobsByStatus, ["failed", "error"]);
  const packetFailed = totalStatus(packetJobsByStatus, ["failed", "error"]);
  const sourceActive = totalStatus(sourceJobsByStatus, ["queued", "running"]);
  const packetActive = totalStatus(packetJobsByStatus, ["queued", "running"]);
  const unhealthyChecks: Record<string, number> = {};

  if (sourceFailed > 0) unhealthyChecks.sourceFailed = sourceFailed;
  if (packetFailed > 0) unhealthyChecks.packetFailed = packetFailed;
  if (sourceActive > 0) unhealthyChecks.sourceActive = sourceActive;
  if (packetActive > 0) unhealthyChecks.packetActive = packetActive;
  if (highConfidenceUnpromoted > 0) {
    unhealthyChecks.highConfidenceUnpromoted = highConfidenceUnpromoted;
  }

  return {
    status: Object.keys(unhealthyChecks).length > 0 ? "unhealthy" : "healthy",
    healthy: Object.keys(unhealthyChecks).length === 0,
    counts: {
      sourceJobsByStatus,
      packetJobsByStatus,
      insightCards,
      currentPackets,
    },
    unhealthyChecks,
    generatedAt: now.toISOString(),
  };
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

    const [rawSourceResult, rawCompilerResult, newTasks, updatedTasks, dailyBrief] =
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

    const sourceResult = "error" in rawSourceResult
      ? await loadSourceFallbackStatus(now).catch((error) => ({
          error: error instanceof Error ? error.message : rawSourceResult.error,
        }))
      : rawSourceResult;
    const compilerResult = "error" in rawCompilerResult
      ? await loadCompilerFallbackStatus(now).catch((error) => ({
          error: error instanceof Error ? error.message : rawCompilerResult.error,
        }))
      : rawCompilerResult;

    const sourceUnavailable = "error" in sourceResult;
    const compilerUnavailable = "error" in compilerResult;
    const sourceBlocker = sourceUnavailable ? sourceResult.error : firstMeaningfulError(sourceResult);
    const sourceLevel: ReadinessLevel = sourceUnavailable
      ? "blocked"
      : sourceResult.counts.unembedded > 0 || sourceResult.counts.uncompiled > 0
        ? "attention"
        : sourceResult.healthy
          ? "ready"
          : "blocked";
    const sourceHasBacklog =
      !sourceUnavailable &&
      (sourceResult.counts.unembedded > 0 ||
        sourceResult.counts.uncompiled > 0 ||
        sourceResult.counts.stuckItems > 0);
    const sourceBacklogAnswer = sourceUnavailable
      ? null
      : `No. ${formatCount(sourceResult.counts.unembedded)} synced items are not searchable and ${formatCount(sourceResult.counts.uncompiled)} are not in project intelligence packets.`;

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
            : sourceUnavailable
              ? "No. The source health service did not answer, so sync and embedding cannot be trusted."
              : sourceBacklogAnswer ?? "No. Source data is not fully ready.",
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
            ? "No. Task generation cannot be trusted until source health responds."
            : sourceHasBacklog
              ? `No. ${formatCount(newTasks)} tasks were created and ${formatCount(updatedTasks)} were updated in the last 24 hours, but source backlog can leave generated tasks incomplete.`
              : `Yes. ${formatCount(newTasks)} tasks were created and ${formatCount(updatedTasks)} were updated in the last 24 hours.`,
        level: sourceUnavailable ? "blocked" : sourceHasBacklog ? "attention" : "ready",
        checkedAt: generatedAt,
        metrics: [
          { label: "Total extracted tasks", value: sourceUnavailable ? "Unknown" : formatCount(sourceResult.counts.tasks) },
          { label: "Created in 24h", value: formatCount(newTasks) },
          { label: "Updated in 24h", value: formatCount(updatedTasks) },
        ],
        blocker:
          sourceUnavailable
            ? "Task extraction depends on source health, and source health is unavailable."
            : sourceHasBacklog
              ? "Task extraction depends on the same source pipeline; source backlog can leave tasks stale."
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
            ? "No. The compiler health service did not answer, so packet freshness cannot be trusted."
            : packetFailed > 0
              ? "No. Packet refresh jobs are failing."
              : packetQueued > 0
                ? "In progress. Packet work is queued or running."
                : "Yes. Current packets are available.",
        level: compilerUnavailable
          ? "blocked"
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
              ? "No. The latest brief was generated and approved, but has not been sent to Teams."
              : "No. The latest brief was generated as a draft, but has not been approved or sent.",
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
          ? "One or more operating answers are blocked or cannot be trusted yet."
          : attention > 0
            ? "At least one operating answer is no and needs follow-up."
            : "All four operating answers are currently ready.",
      counts: { ready: items.filter((item) => item.level === "ready").length, attention, blocked, unknown },
      items,
    });
  },
);
