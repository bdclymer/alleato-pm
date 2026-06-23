import { NextResponse } from "next/server";

import { validateResponseContract, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { logEvent } from "@/lib/guardrails/observability";
import { createRagServiceClient, createServiceClient } from "@/lib/supabase/service";

import { SourceSyncStatusSchema, type SourceSyncStatus } from "../_contracts";
import { fetchBackendSourceSync, requireAdmin } from "../_shared";

const RAG_LIFECYCLE_LOOKBACK_HOURS = 24;
const RAG_LIFECYCLE_MAX_PACKET_AGE_HOURS = 36;
const RAG_LIFECYCLE_BATCH_SIZE = 25;

type LifecycleStageKey =
  | "synced"
  | "vectorized"
  | "projectAssigned"
  | "tasksExtracted"
  | "projectIntelligenceUpdated";

type LifecycleStatus = "healthy" | "warning" | "critical" | "unknown";

type SourceFamilyKey = "meetings" | "teams" | "emails" | "sharepoint";

type SourceRow = {
  id: string;
  title: string | null;
  source: string | null;
  category: string | null;
  type: string | null;
  project_id: number | null;
  source_system: string | null;
  source_item_id: string | null;
  fireflies_id: string | null;
  created_at: string | null;
  date: string | null;
  source_last_modified_at: string | null;
};

type RagEmailSourceRow = {
  id: string;
  title: string | null;
  source: string | null;
  type: string | null;
  source_system: string | null;
  source_item_id: string | null;
  source_web_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  project_id: number | null;
};

type LifecycleJobRow = {
  source_document_id: string | null;
  source_item_id: string | null;
  source_system: string;
  status: string;
  updated_at: string;
  error_code: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
};

type SourceFamilyConfig = {
  key: SourceFamilyKey;
  label: string;
  sourceSystems: string[];
  matches: (row: SourceRow) => boolean;
};

const SOURCE_FAMILIES: SourceFamilyConfig[] = [
  {
    key: "meetings",
    label: "Meeting transcripts",
    sourceSystems: ["fireflies"],
    matches: (row) => row.source === "fireflies",
  },
  {
    key: "teams",
    label: "Teams messages",
    sourceSystems: ["microsoft_graph", "teams"],
    matches: (row) =>
      row.source === "microsoft_graph" &&
      (row.category === "teams_message" || String(row.type ?? "").includes("teams")),
  },
  {
    key: "emails",
    label: "Emails",
    sourceSystems: ["microsoft_graph", "outlook_email"],
    matches: (row) =>
      row.source === "microsoft_graph" &&
      (row.category === "email" ||
        row.type === "email" ||
        row.type === "email_attachment" ||
        row.id.startsWith("outlook_")),
  },
  {
    key: "sharepoint",
    label: "SharePoint files",
    sourceSystems: ["microsoft_graph", "sharepoint_file"],
    matches: (row) =>
      row.source === "microsoft_graph" &&
      (row.id.startsWith("sharepoint_") ||
        String(row.source_item_id ?? "").startsWith("sharepoint_") ||
        String(row.source_item_id ?? "").startsWith("sites/") ||
        String(row.source_item_id ?? "").includes("sharepoint") ||
        String(row.source_system ?? "").includes("sharepoint")),
  },
];

function emptyRagLifecycleStatus(
  status: "unavailable" | "degraded",
  message: string,
): NonNullable<SourceSyncStatus["ragLifecycle"]> {
  return {
    generatedAt: new Date().toISOString(),
    lookbackHours: RAG_LIFECYCLE_LOOKBACK_HOURS,
    maxPacketAgeHours: RAG_LIFECYCLE_MAX_PACKET_AGE_HOURS,
    status,
    sources: SOURCE_FAMILIES.map((family) => ({
      key: family.key,
      label: family.label,
      sourceSystems: family.sourceSystems,
      totalSources: 0,
      latestSourceAt: null,
      status: "unknown",
      stages: [
        lifecycleStage("synced", "Synced", "unknown", 0, 0, null, message, "source adapter"),
        lifecycleStage("vectorized", "Vectorized", "unknown", 0, 0, null, message, "RAG embedder"),
        lifecycleStage("projectAssigned", "Project assigned", "unknown", 0, 0, null, message, "project attribution"),
        lifecycleStage("tasksExtracted", "Tasks extracted", "unknown", 0, 0, null, message, "task extractor"),
        lifecycleStage(
          "projectIntelligenceUpdated",
          "Project Intelligence updated",
          "unknown",
          0,
          0,
          null,
          message,
          "intelligence compiler",
        ),
      ],
      alerts: [],
    })),
    notifications: [
      {
        status: "blocked",
        channel: "source-sync-health",
        message,
        checkedAt: new Date().toISOString(),
      },
    ],
  };
}

function lifecycleStage(
  key: LifecycleStageKey,
  label: string,
  status: LifecycleStatus,
  count: number,
  total: number,
  latestAt: string | null,
  message: string,
  ownerHint: string,
) {
  return { key, label, status, count, total, latestAt, message, ownerHint };
}

function newest(values: Array<string | null | undefined>): string | null {
  const sorted = values
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  return sorted[0] ?? null;
}

function coverageStatus(count: number, total: number): LifecycleStatus {
  if (total === 0) return "unknown";
  if (count === total) return "healthy";
  if (count > 0) return "warning";
  return "critical";
}

function latestJobMetadataByDocumentId(jobRows: LifecycleJobRow[]) {
  const metadataByDocumentId = new Map<string, Record<string, unknown>>();
  const sorted = [...jobRows].sort((a, b) => {
    const aHasTaskStatus = Boolean(a.metadata?.task_extraction_status);
    const bHasTaskStatus = Boolean(b.metadata?.task_extraction_status);
    if (aHasTaskStatus !== bHasTaskStatus) return aHasTaskStatus ? -1 : 1;
    return String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? ""));
  });
  for (const row of sorted) {
    const documentId = row.source_document_id ? String(row.source_document_id) : "";
    if (!documentId || metadataByDocumentId.has(documentId)) continue;
    const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
    metadataByDocumentId.set(documentId, { ...metadata, _updated_at: row.updated_at });
  }
  return metadataByDocumentId;
}

function hasTaskExtractionOutcome(
  documentId: string,
  taskIds: Set<string>,
  jobMetadataByDocumentId: Map<string, Record<string, unknown>>,
) {
  if (taskIds.has(documentId)) return true;
  const status = String(jobMetadataByDocumentId.get(documentId)?.task_extraction_status ?? "").toLowerCase();
  return status === "tasks_created" || status === "no_actionable_tasks" || status === "task_signal_staged";
}

function sourceStatus(stages: Array<{ status: LifecycleStatus }>): LifecycleStatus {
  if (stages.some((stage) => stage.status === "critical")) return "critical";
  if (stages.some((stage) => stage.status === "warning")) return "warning";
  if (stages.every((stage) => stage.status === "healthy")) return "healthy";
  return "unknown";
}

function sourceAlert(params: {
  severity: "warning" | "critical";
  code: string;
  source: SourceFamilyKey;
  message: string;
}): SourceSyncStatus["alerts"][number] {
  return {
    severity: params.severity,
    code: params.code,
    source: params.source,
    resourceId: `rag-lifecycle:${params.source}`,
    message: params.message,
    detectedAt: new Date().toISOString(),
  };
}

function batches<T>(values: T[], size = RAG_LIFECYCLE_BATCH_SIZE): T[][] {
  const grouped: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    grouped.push(values.slice(index, index + size));
  }
  return grouped;
}

function isTransientSupabaseReadError(error: { message?: string } | null | undefined) {
  return String(error?.message ?? "").toLowerCase().includes("fetch failed");
}

async function readSupabaseRows<T>(
  label: string,
  queryFactory: () => PromiseLike<{ data: T[] | null; error: { message?: string } | null }>,
): Promise<T[]> {
  let lastMessage = "";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = await queryFactory();
    if (!result.error) return result.data ?? [];
    lastMessage = result.error.message ?? "unknown error";
    if (!isTransientSupabaseReadError(result.error) || attempt === 3) {
      throw new Error(`Failed to load ${label}: ${lastMessage}`);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 250));
  }
  throw new Error(`Failed to load ${label}: ${lastMessage}`);
}

async function buildRagLifecycleStatus(): Promise<NonNullable<SourceSyncStatus["ragLifecycle"]>> {
  const generatedAt = new Date().toISOString();
  const cutoff = new Date(
    Date.now() - RAG_LIFECYCLE_LOOKBACK_HOURS * 60 * 60 * 1000,
  ).toISOString();
  const maxFreshPacketCutoff = new Date(
    Date.now() - RAG_LIFECYCLE_MAX_PACKET_AGE_HOURS * 60 * 60 * 1000,
  ).toISOString();
  const appClient = createServiceClient();
  const ragClient = createRagServiceClient();

  const sourceRows = await readSupabaseRows<SourceRow>("daily source metadata", () =>
    appClient
      .from("document_metadata")
      .select(
        "id,title,source,category,type,project_id,source_system,source_item_id,fireflies_id,created_at,date,source_last_modified_at",
      )
      .is("deleted_at", null)
      .gte("created_at", cutoff)
      .in("source", ["fireflies", "microsoft_graph"])
      .order("created_at", { ascending: false })
      .limit(2000),
  );

  const appRows = sourceRows;
  const appRowIds = new Set(appRows.map((row) => row.id));
  const ragEmailRows = await readSupabaseRows<RagEmailSourceRow>("RAG email metadata", () =>
    ragClient
      .from("rag_document_metadata")
      .select("id,title,source,type,source_system,source_item_id,source_web_url,created_at,updated_at,project_id")
      .eq("source", "microsoft_graph")
      .or("type.in.(email,email_attachment),id.like.outlook_%")
      .gte("updated_at", cutoff)
      .order("updated_at", { ascending: false })
      .limit(2000),
  );

  const ragOnlyEmailRows = ragEmailRows
    .filter((row) => !appRowIds.has(row.id))
    .map<SourceRow>((row) => ({
      id: row.id,
      title: row.title,
      source: row.source,
      category: row.type === "email_attachment" ? "email_attachment" : "email",
      type: row.type,
      project_id: row.project_id,
      source_system: row.source_system,
      source_item_id: row.source_item_id,
      fireflies_id: null,
      created_at: row.created_at,
      date: row.created_at,
      source_last_modified_at: row.updated_at,
    }));

  const rows = [...appRows, ...ragOnlyEmailRows];
  const sourceIds = rows.map((row) => row.id);

  const chunkRows: Array<{ document_id: string; source_type: string | null; updated_at: string | null }> = [];
  const taskRows: Array<{
    metadata_id: string;
    project_id: number | null;
    created_at: string;
  }> = [];
  const evidenceRows: Array<{
    source_document_id: string | null;
    created_at: string;
  }> = [];
  const jobRows: LifecycleJobRow[] = [];

  for (const batch of batches(sourceIds)) {
    const [chunkResult, taskResult, evidenceResult, jobResult, intelligenceJobResult] = await Promise.all([
      readSupabaseRows<{ document_id: string; source_type: string | null; updated_at: string | null }>("RAG chunks", () =>
        ragClient
          .from("document_chunks")
          .select("document_id,source_type,updated_at")
          .in("document_id", batch)
          .not("embedding", "is", null)
          .limit(1000),
      ),
      readSupabaseRows<{ metadata_id: string; project_id: number | null; created_at: string }>("extracted tasks", () =>
        appClient
          .from("tasks")
          .select("metadata_id,source_system,project_id,created_at")
          .in("metadata_id", batch)
          .gte("created_at", cutoff)
          .limit(1000),
      ),
      readSupabaseRows<{ source_document_id: string | null; created_at: string }>("Project Intelligence evidence", () =>
        appClient
          .from("insight_card_evidence")
          .select("source_document_id,created_at")
          .in("source_document_id", batch)
          .gte("created_at", cutoff)
          .limit(1000),
      ),
      readSupabaseRows<LifecycleJobRow>("source processing jobs", () =>
        ragClient
          .from("source_processing_jobs")
          .select("source_document_id,source_item_id,source_system,status,updated_at,error_code,error_message,metadata")
          .in("source_document_id", batch)
          .order("updated_at", { ascending: false })
          .limit(1000)
          .returns<LifecycleJobRow[]>(),
      ),
      readSupabaseRows<{
        source_document_id: string | null;
        status: string;
        updated_at: string;
        last_error: string | null;
        output_summary: Record<string, unknown> | null;
      }>("source intelligence jobs", () =>
        ragClient
          .from("source_intelligence_jobs")
          .select("source_document_id,status,updated_at,last_error,output_summary")
          .in("source_document_id", batch)
          .order("updated_at", { ascending: false })
          .limit(1000)
          .returns<
            {
              source_document_id: string | null;
              status: string;
              updated_at: string;
              last_error: string | null;
              output_summary: Record<string, unknown> | null;
            }[]
          >(),
      ),
    ]);

    chunkRows.push(...chunkResult);
    taskRows.push(...taskResult);
    evidenceRows.push(...evidenceResult);
    jobRows.push(...jobResult);
    jobRows.push(
      ...intelligenceJobResult.map<LifecycleJobRow>((row) => ({
        source_document_id: row.source_document_id,
        source_item_id: null,
        source_system: "source_intelligence_jobs",
        status: row.status,
        updated_at: row.updated_at,
        error_code: row.status === "failed" ? "source_intelligence_failed" : null,
        error_message: row.last_error,
        metadata: row.output_summary,
      })),
    );
  }

  const [packetResult, recentJobResult, recentIntelligenceJobResult] =
    await Promise.all([
      readSupabaseRows<{ id: string; generated_at: string }>("Project Intelligence packets", () =>
        appClient
          .from("intelligence_packets")
          .select("id,generated_at")
          .eq("packet_type", "current")
          .gte("generated_at", maxFreshPacketCutoff)
          .order("generated_at", { ascending: false })
          .limit(100),
      ),
      readSupabaseRows<LifecycleJobRow>("source processing jobs", () =>
        ragClient
          .from("source_processing_jobs")
          .select("source_document_id,source_item_id,source_system,status,updated_at,error_code,error_message,metadata")
          .gte("updated_at", cutoff)
          .limit(5000)
          .returns<LifecycleJobRow[]>(),
      ),
      readSupabaseRows<{
        source_document_id: string | null;
        status: string;
        updated_at: string;
        last_error: string | null;
        output_summary: Record<string, unknown> | null;
      }>("source intelligence jobs", () =>
        ragClient
          .from("source_intelligence_jobs")
          .select("source_document_id,status,updated_at,last_error,output_summary")
          .gte("updated_at", cutoff)
          .limit(5000)
          .returns<
            {
              source_document_id: string | null;
              status: string;
              updated_at: string;
              last_error: string | null;
              output_summary: Record<string, unknown> | null;
            }[]
          >(),
      ),
    ]);

  jobRows.push(...recentJobResult);
  jobRows.push(
    ...recentIntelligenceJobResult.map<LifecycleJobRow>((row) => ({
      source_document_id: row.source_document_id,
      source_item_id: null,
      source_system: "source_intelligence_jobs",
      status: row.status,
      updated_at: row.updated_at,
      error_code: row.status === "failed" ? "source_intelligence_failed" : null,
      error_message: row.last_error,
      metadata: row.output_summary,
    })),
  );

  const embeddedIds = new Set(chunkRows.map((row) => row.document_id));
  const embeddedMeetingTranscriptIds = new Set(
    chunkRows
      .filter((row) => row.source_type === "meeting_transcript")
      .map((row) => row.document_id),
  );
  const taskIds = new Set(taskRows.map((row) => row.metadata_id));
  const jobMetadataByDocumentId = latestJobMetadataByDocumentId(jobRows);
  const evidenceIds = new Set(
    evidenceRows
      .map((row) => row.source_document_id)
      .filter((id): id is string => Boolean(id)),
  );
  const latestPacketAt = newest(packetResult.map((row) => row.generated_at));
  const hasFreshPackets = Boolean(latestPacketAt);

  const sources = SOURCE_FAMILIES.map((family) => {
    const familyRows = rows.filter(family.matches);
    const ids = new Set(familyRows.map((row) => row.id));
    const total = familyRows.length;
    const vectorizedIds = family.key === "meetings" ? embeddedMeetingTranscriptIds : embeddedIds;
    const vectorized = familyRows.filter((row) => vectorizedIds.has(row.id)).length;
    const projectAssigned = familyRows.filter((row) => row.project_id !== null).length;
    const tasksExtracted = familyRows.filter((row) =>
      hasTaskExtractionOutcome(row.id, taskIds, jobMetadataByDocumentId),
    ).length;
    const intelligenceUpdated = familyRows.filter((row) => evidenceIds.has(row.id)).length;
    const latestSourceAt = newest(
      familyRows.map((row) => row.source_last_modified_at ?? row.date ?? row.created_at),
    );
    const latestChunkAt = newest(
      chunkRows
        .filter((row) => ids.has(row.document_id) && (family.key !== "meetings" || row.source_type === "meeting_transcript"))
        .map((row) => row.updated_at),
    );
    const latestTaskAt = newest(
      [
        ...taskRows.filter((row) => ids.has(row.metadata_id)).map((row) => row.created_at),
        ...familyRows
          .filter((row) => hasTaskExtractionOutcome(row.id, taskIds, jobMetadataByDocumentId))
          .map((row) => jobMetadataByDocumentId.get(row.id)?._updated_at as string | undefined),
      ],
    );
    const latestEvidenceAt = newest(
      evidenceRows
        .filter((row) => row.source_document_id && ids.has(row.source_document_id))
        .map((row) => row.created_at),
    );
    const recentFailures = jobRows.filter((job) => {
      if (!String(job.status).startsWith("failed") && job.status !== "error") return false;
      return familyRows.some((row) =>
        [row.id, row.source_item_id, row.fireflies_id]
          .filter(Boolean)
          .map(String)
          .includes(String(job.source_document_id ?? job.source_item_id ?? "")),
      );
    });

    const stages = [
      lifecycleStage(
        "synced",
        "Synced",
        total > 0 ? "healthy" : "unknown",
        total,
        total,
        latestSourceAt,
        total > 0
          ? `${total} ${family.label.toLowerCase()} synced in the last ${RAG_LIFECYCLE_LOOKBACK_HOURS} hours.`
          : `No ${family.label.toLowerCase()} synced in the last ${RAG_LIFECYCLE_LOOKBACK_HOURS} hours.`,
        "source adapter",
      ),
      lifecycleStage(
        "vectorized",
        "Vectorized",
        coverageStatus(vectorized, total),
        vectorized,
        total,
        latestChunkAt,
        family.key === "meetings"
          ? `${vectorized}/${total} Fireflies metadata rows have embedded meeting_transcript chunks and are searchable by the AI assistant.`
          : `${vectorized}/${total} have embedded chunks and are searchable by the AI assistant.`,
        "RAG embedder",
      ),
      lifecycleStage(
        "projectAssigned",
        "Project assigned",
        coverageStatus(projectAssigned, total),
        projectAssigned,
        total,
        latestSourceAt,
        `${projectAssigned}/${total} have project_id assigned.`,
        "project attribution",
      ),
      lifecycleStage(
        "tasksExtracted",
        "Tasks extracted",
        coverageStatus(tasksExtracted, total),
        tasksExtracted,
        total,
        latestTaskAt,
        `${tasksExtracted}/${total} have task extraction outcomes from this source set.`,
        "task extractor",
      ),
      lifecycleStage(
        "projectIntelligenceUpdated",
        "Project Intelligence updated",
        hasFreshPackets ? coverageStatus(intelligenceUpdated, total) : "critical",
        intelligenceUpdated,
        total,
        latestEvidenceAt ?? latestPacketAt,
        hasFreshPackets
          ? `${intelligenceUpdated}/${total} have recent Project Intelligence evidence; newest current packet ${latestPacketAt ?? "not found"}.`
          : `No fresh current Project Intelligence packet within ${RAG_LIFECYCLE_MAX_PACKET_AGE_HOURS} hours.`,
        "intelligence compiler",
      ),
    ];

    const alerts = [
      ...stages
        .filter((stage) => stage.status === "critical" || stage.status === "warning")
        .map((stage) =>
          sourceAlert({
            severity: stage.status === "critical" ? "critical" : "warning",
            code: `rag_lifecycle_${stage.key}`,
            source: family.key,
            message: `${family.label}: ${stage.message} Owner: ${stage.ownerHint}.`,
          }),
        ),
      ...recentFailures.slice(0, 3).map((failure) =>
        sourceAlert({
          severity: "critical",
          code: failure.error_code ?? "source_processing_failed",
          source: family.key,
          message: `${family.label}: ${failure.error_message ?? failure.status}. Owner: source processing job.`,
        }),
      ),
    ];

    return {
      key: family.key,
      label: family.label,
      sourceSystems: family.sourceSystems,
      totalSources: total,
      latestSourceAt,
      status: sourceStatus(stages),
      stages,
      alerts,
    };
  });

  const degraded = sources.some((source) =>
    source.status === "critical" || source.status === "warning",
  );

  return {
    generatedAt,
    lookbackHours: RAG_LIFECYCLE_LOOKBACK_HOURS,
    maxPacketAgeHours: RAG_LIFECYCLE_MAX_PACKET_AGE_HOURS,
    status: degraded ? "degraded" : "healthy",
    sources,
    notifications: [
      {
        status: degraded ? "ready" : "skipped",
        channel: "source-sync-health",
        message: degraded
          ? "RAG lifecycle is degraded; source-sync alerts are ready for immediate notification handling."
          : "No immediate RAG lifecycle notification needed.",
        checkedAt: generatedAt,
      },
    ],
  };
}

async function withRagLifecycle(status: SourceSyncStatus): Promise<SourceSyncStatus> {
  try {
    const ragLifecycle = await buildRagLifecycleStatus();
    const lifecycleAlerts = ragLifecycle.sources.flatMap((source) => source.alerts);
    return {
      ...status,
      healthy: status.healthy && ragLifecycle.status === "healthy",
      status:
        status.status === "unavailable"
          ? "unavailable"
          : status.status === "degraded" || ragLifecycle.status === "degraded"
            ? "degraded"
            : "healthy",
      alerts: [...lifecycleAlerts, ...status.alerts].slice(0, 120),
      counts: {
        ...status.counts,
        alerts: status.counts.alerts + lifecycleAlerts.length,
      },
      ragLifecycle,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const ragLifecycle = emptyRagLifecycleStatus(
      "degraded",
      `RAG lifecycle read-back failed: ${message}`,
    );
    return {
      ...status,
      healthy: false,
      status: status.status === "unavailable" ? "unavailable" : "degraded",
      alerts: [
        sourceAlert({
          severity: "critical",
          code: "rag_lifecycle_readback_failed",
          source: "meetings",
          message: `RAG lifecycle read-back failed: ${message}`,
        }),
        ...status.alerts,
      ],
      counts: {
        ...status.counts,
        alerts: status.counts.alerts + 1,
      },
      ragLifecycle,
    };
  }
}

/**
 * Graceful-degradation payload returned when the backend times out or is
 * unreachable. Using HTTP 200 here intentionally — the UI should render a
 * "checking…" state rather than surfacing a red error page, and the error
 * tracker should not fire a high-severity alert for routine backend cold-starts.
 */
function unavailableStatus(reason: string, requestId: string): SourceSyncStatus {
  return {
    status: "unavailable",
    healthy: false,
    generatedAt: new Date().toISOString(),
    thresholds: {
      staleSyncMinutes: 120,
      staleFirefliesMinutes: 240,
      staleExtractionMinutes: 1440,
      embeddingBacklogWarning: 25,
      compilerBacklogWarning: 25,
      failedJobWarning: 1,
      documentHealthSampleLimit: 2500,
      chunkHealthSampleLimit: 5000,
      jobHealthSampleLimit: 5000,
      maxReturnedSources: 80,
      maxReturnedAlerts: 80,
      maxReturnedStuckItems: 25,
    },
    sources: [],
    pipeline: {},
    alerts: [
      {
        severity: "warning",
        code: "backend_unavailable",
        source: "backend",
        resourceId: "source-sync-status",
        message: `Status check could not reach the backend: ${reason}`,
        detectedAt: new Date().toISOString(),
      },
    ],
    recentRuns: [],
    stuckItems: [],
    counts: {
      sources: 0,
      alerts: 1,
      documents: 0,
      chunks: 0,
      unembedded: 0,
      uncompiled: 0,
      tasks: 0,
      graphSubscriptions: 0,
      stuckItems: 0,
    },
    ragLifecycle: emptyRagLifecycleStatus(
      "unavailable",
      "Backend source-sync status is unavailable, so daily RAG lifecycle trust cannot be proved.",
    ),
  };
}

export const GET = withApiGuardrails(
  "api.admin.source-sync.status.GET",
  async ({ requestId }) => {
    await requireAdmin("api.admin.source-sync.status.GET");

    let backendResponse: Response;
    try {
      backendResponse = await fetchBackendSourceSync(
        requestId,
        "api.admin.source-sync.status.GET",
        "status",
        { method: "GET" },
      );
    } catch (err) {
      // UPSTREAM_TIMEOUT / UPSTREAM_FAILURE: the backend is slow or down.
      // Return a structured "unavailable" payload (HTTP 200) so the UI renders
      // gracefully and the error tracker is not spammed with high-severity 504s.
      const isTimeout =
        err instanceof GuardrailError &&
        (err.code === "UPSTREAM_TIMEOUT" || err.code === "UPSTREAM_FAILURE");

      if (isTimeout) {
        logEvent({
          event: "dependency_degraded",
          level: "warn",
          requestId,
          where: "api.admin.source-sync.status.GET",
          dependency: "backend.source-sync.status",
          details: {
            code: (err as GuardrailError).code,
            reason: (err as GuardrailError).message,
          },
        });
        const statusWithLifecycle = await withRagLifecycle(
          unavailableStatus((err as GuardrailError).message, requestId),
        );
        return NextResponse.json(statusWithLifecycle);
      }
      throw err;
    }

    const payload = await backendResponse.json();
    const status = validateResponseContract(
      SourceSyncStatusSchema,
      payload,
      "api.admin.source-sync.status.GET",
    );

    const enrichedStatus = validateResponseContract(
      SourceSyncStatusSchema,
      await withRagLifecycle(status),
      "api.admin.source-sync.status.GET.rag-lifecycle",
    );

    return NextResponse.json(enrichedStatus);
  },
);
