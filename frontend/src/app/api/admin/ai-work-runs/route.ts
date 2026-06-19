import { withApiGuardrails } from "@/lib/guardrails/api";
import { requireAdmin } from "@/app/api/admin/intelligence-compiler/_shared";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const WHERE = "api.admin.ai-work-runs#GET";
const DEFAULT_WORKFLOW_ID = "executive_daily_brief";
const MAX_LIMIT = 100;
const WORK_RUN_SELECT = `
  id,
  workflow_id,
  title,
  status,
  trigger_type,
  delivery_status,
  result_summary,
  failure_code,
  failure_message,
  started_at,
  completed_at,
  created_at,
  source_counts,
  delivery_target,
  tool_scope,
  source_policy,
  metadata,
  event_id,
  source_sync_run_id,
  daily_recap_id
`;
const SOURCE_SELECT = `
  id,
  work_run_id,
  source_family,
  source_record_id,
  source_title,
  source_occurred_at,
  evidence_excerpt,
  confidence,
  metadata
`;

type JsonObject = Record<string, unknown>;

export type AiWorkRunSourceView = {
  id: string;
  sourceFamily: string;
  sourceRecordId: string | null;
  sourceTitle: string | null;
  sourceOccurredAt: string | null;
  evidenceExcerpt: string | null;
  confidence: string | null;
  metadata: JsonObject;
};

export type AiWorkRunView = {
  id: string;
  workflowId: string;
  title: string;
  status: string;
  triggerType: string;
  deliveryStatus: string | null;
  resultSummary: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  durationMs: number | null;
  sourceCounts: JsonObject;
  deliveryTarget: JsonObject;
  toolScope: JsonObject;
  sourcePolicy: JsonObject;
  metadata: JsonObject;
  dailyRecapId: string | null;
  event: {
    id: string;
    eventType: string;
    status: string;
    receivedAt: string;
    payload: JsonObject;
  } | null;
  sourceSyncRun: {
    id: string;
    status: string;
    itemsSeen: number;
    itemsSynced: number;
    itemsSkipped: number;
    itemsFailed: number;
    errorCode: string | null;
    errorMessage: string | null;
  } | null;
  sources: AiWorkRunSourceView[];
};

type AiWorkRunRow = {
  id: string;
  workflow_id: string;
  title: string;
  status: string;
  trigger_type: string;
  delivery_status: string | null;
  result_summary: string | null;
  failure_code: string | null;
  failure_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  source_counts: unknown;
  delivery_target: unknown;
  tool_scope: unknown;
  source_policy: unknown;
  metadata: unknown;
  event_id: string | null;
  source_sync_run_id: string | null;
  daily_recap_id: string | null;
};

type AiOperationEventRow = {
  id: string;
  event_type: string;
  status: string;
  received_at: string;
  payload: unknown;
};

type SourceSyncRunRow = {
  id: string;
  status: string;
  items_seen: number | null;
  items_synced: number | null;
  items_skipped: number | null;
  items_failed: number | null;
  error_code: string | null;
  error_message: string | null;
};

type AiWorkRunSourceRow = {
  id: string;
  work_run_id: string;
  source_family: string;
  source_record_id: string | null;
  source_title: string | null;
  source_occurred_at: string | null;
  evidence_excerpt: string | null;
  confidence: string | null;
  metadata: unknown;
};

function asObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonObject;
}

function durationMs(startedAt: string | null, completedAt: string | null): number | null {
  if (!startedAt || !completedAt) return null;
  const started = new Date(startedAt).getTime();
  const completed = new Date(completedAt).getTime();
  if (!Number.isFinite(started) || !Number.isFinite(completed)) return null;
  return Math.max(0, completed - started);
}

function mapSource(row: AiWorkRunSourceRow): AiWorkRunSourceView {
  return {
    id: row.id,
    sourceFamily: row.source_family,
    sourceRecordId: row.source_record_id,
    sourceTitle: row.source_title,
    sourceOccurredAt: row.source_occurred_at,
    evidenceExcerpt: row.evidence_excerpt,
    confidence: row.confidence,
    metadata: asObject(row.metadata),
  };
}

export const GET = withApiGuardrails(WHERE, async ({ request }) => {
  await requireAdmin(WHERE);

  const url = new URL(request.url);
  const workflowId = url.searchParams.get("workflow")?.trim() || DEFAULT_WORKFLOW_ID;
  const rawLimit = Number.parseInt(url.searchParams.get("limit") || "50", 10);
  const limit = Math.min(Math.max(Number.isInteger(rawLimit) ? rawLimit : 50, 1), MAX_LIMIT);

  const supabase = createServiceClient();
  const { data: runRows, error: runError } = await supabase
    .from("ai_work_runs")
    .select(WORK_RUN_SELECT)
    .eq("workflow_id", workflowId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (runError) {
    throw new Error(`ai_work_runs query failed: ${runError.message}`);
  }

  const runs = (runRows ?? []) as AiWorkRunRow[];
  const eventIds = runs.map((run) => run.event_id).filter((id): id is string => Boolean(id));
  const sourceSyncRunIds = runs
    .map((run) => run.source_sync_run_id)
    .filter((id): id is string => Boolean(id));
  const runIds = runs.map((run) => run.id);

  const [eventsResult, sourceSyncResult, sourcesResult] = await Promise.all([
    eventIds.length > 0
      ? supabase
          .from("ai_operation_events")
          .select("id,event_type,status,received_at,payload")
          .in("id", eventIds)
      : Promise.resolve({ data: [], error: null }),
    sourceSyncRunIds.length > 0
      ? supabase
          .from("source_sync_runs")
          .select("id,status,items_seen,items_synced,items_skipped,items_failed,error_code,error_message")
          .in("id", sourceSyncRunIds)
      : Promise.resolve({ data: [], error: null }),
    runIds.length > 0
      ? supabase
          .from("ai_work_run_sources")
          .select(SOURCE_SELECT)
          .in("work_run_id", runIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (eventsResult.error) {
    throw new Error(`ai_operation_events query failed: ${eventsResult.error.message}`);
  }
  if (sourceSyncResult.error) {
    throw new Error(`source_sync_runs query failed: ${sourceSyncResult.error.message}`);
  }
  if (sourcesResult.error) {
    throw new Error(`ai_work_run_sources query failed: ${sourcesResult.error.message}`);
  }

  const eventsById = new Map(
    ((eventsResult.data ?? []) as AiOperationEventRow[]).map((event) => [event.id, event]),
  );
  const sourceSyncById = new Map(
    ((sourceSyncResult.data ?? []) as SourceSyncRunRow[]).map((run) => [run.id, run]),
  );
  const sourcesByRunId = new Map<string, AiWorkRunSourceView[]>();
  for (const source of (sourcesResult.data ?? []) as AiWorkRunSourceRow[]) {
    const bucket = sourcesByRunId.get(source.work_run_id) ?? [];
    bucket.push(mapSource(source));
    sourcesByRunId.set(source.work_run_id, bucket);
  }

  const mappedRuns: AiWorkRunView[] = runs.map((run) => {
    const event = run.event_id ? eventsById.get(run.event_id) ?? null : null;
    const sourceSyncRun = run.source_sync_run_id
      ? sourceSyncById.get(run.source_sync_run_id) ?? null
      : null;

    return {
      id: run.id,
      workflowId: run.workflow_id,
      title: run.title,
      status: run.status,
      triggerType: run.trigger_type,
      deliveryStatus: run.delivery_status,
      resultSummary: run.result_summary,
      failureCode: run.failure_code,
      failureMessage: run.failure_message,
      startedAt: run.started_at,
      completedAt: run.completed_at,
      createdAt: run.created_at,
      durationMs: durationMs(run.started_at, run.completed_at),
      sourceCounts: asObject(run.source_counts),
      deliveryTarget: asObject(run.delivery_target),
      toolScope: asObject(run.tool_scope),
      sourcePolicy: asObject(run.source_policy),
      metadata: asObject(run.metadata),
      dailyRecapId: run.daily_recap_id,
      event: event
        ? {
            id: event.id,
            eventType: event.event_type,
            status: event.status,
            receivedAt: event.received_at,
            payload: asObject(event.payload),
          }
        : null,
      sourceSyncRun: sourceSyncRun
        ? {
            id: sourceSyncRun.id,
            status: sourceSyncRun.status,
            itemsSeen: sourceSyncRun.items_seen ?? 0,
            itemsSynced: sourceSyncRun.items_synced ?? 0,
            itemsSkipped: sourceSyncRun.items_skipped ?? 0,
            itemsFailed: sourceSyncRun.items_failed ?? 0,
            errorCode: sourceSyncRun.error_code,
            errorMessage: sourceSyncRun.error_message,
          }
        : null,
      sources: sourcesByRunId.get(run.id) ?? [],
    };
  });

  return Response.json({
    workflowId,
    generatedAt: new Date().toISOString(),
    runs: mappedRuns,
  });
});
