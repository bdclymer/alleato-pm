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
const STEP_SELECT = `
  id,
  work_run_id,
  step_type,
  status,
  started_at,
  completed_at,
  failure_code,
  failure_message,
  metadata,
  created_at
`;
const ARTIFACT_SELECT = `
  id,
  work_run_id,
  kind,
  title,
  storage_table,
  storage_id,
  content_type,
  checksum,
  source_ref_count,
  metadata,
  created_at
`;
const DELIVERY_ATTEMPT_SELECT = `
  id,
  work_run_id,
  artifact_id,
  channel,
  recipient_id,
  recipient_address,
  status,
  provider_message_id,
  failure_code,
  failure_message,
  retryable,
  attempted_at,
  metadata,
  created_at
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

export type AiWorkRunStepView = {
  id: string;
  stepType: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  metadata: JsonObject;
  createdAt: string;
};

export type AiWorkRunArtifactView = {
  id: string;
  kind: string;
  title: string;
  storageTable: string | null;
  storageId: string | null;
  contentType: string;
  checksum: string | null;
  sourceRefCount: number;
  metadata: JsonObject;
  createdAt: string;
};

export type AiWorkRunDeliveryAttemptView = {
  id: string;
  artifactId: string | null;
  channel: string;
  recipientId: string | null;
  recipientAddress: string | null;
  status: string;
  providerMessageId: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  retryable: boolean;
  attemptedAt: string;
  metadata: JsonObject;
  createdAt: string;
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
  steps: AiWorkRunStepView[];
  artifacts: AiWorkRunArtifactView[];
  deliveryAttempts: AiWorkRunDeliveryAttemptView[];
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

type AiWorkRunStepRow = {
  id: string;
  work_run_id: string;
  step_type: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  failure_code: string | null;
  failure_message: string | null;
  metadata: unknown;
  created_at: string;
};

type AiWorkRunArtifactRow = {
  id: string;
  work_run_id: string;
  kind: string;
  title: string;
  storage_table: string | null;
  storage_id: string | null;
  content_type: string;
  checksum: string | null;
  source_ref_count: number | null;
  metadata: unknown;
  created_at: string;
};

type AiWorkRunDeliveryAttemptRow = {
  id: string;
  work_run_id: string;
  artifact_id: string | null;
  channel: string;
  recipient_id: string | null;
  recipient_address: string | null;
  status: string;
  provider_message_id: string | null;
  failure_code: string | null;
  failure_message: string | null;
  retryable: boolean | null;
  attempted_at: string;
  metadata: unknown;
  created_at: string;
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

function mapStep(row: AiWorkRunStepRow): AiWorkRunStepView {
  return {
    id: row.id,
    stepType: row.step_type,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    failureCode: row.failure_code,
    failureMessage: row.failure_message,
    metadata: asObject(row.metadata),
    createdAt: row.created_at,
  };
}

function mapArtifact(row: AiWorkRunArtifactRow): AiWorkRunArtifactView {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    storageTable: row.storage_table,
    storageId: row.storage_id,
    contentType: row.content_type,
    checksum: row.checksum,
    sourceRefCount: row.source_ref_count ?? 0,
    metadata: asObject(row.metadata),
    createdAt: row.created_at,
  };
}

function mapDeliveryAttempt(
  row: AiWorkRunDeliveryAttemptRow,
): AiWorkRunDeliveryAttemptView {
  return {
    id: row.id,
    artifactId: row.artifact_id,
    channel: row.channel,
    recipientId: row.recipient_id,
    recipientAddress: row.recipient_address,
    status: row.status,
    providerMessageId: row.provider_message_id,
    failureCode: row.failure_code,
    failureMessage: row.failure_message,
    retryable: Boolean(row.retryable),
    attemptedAt: row.attempted_at,
    metadata: asObject(row.metadata),
    createdAt: row.created_at,
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

  const [
    eventsResult,
    sourceSyncResult,
    sourcesResult,
    stepsResult,
    artifactsResult,
    deliveryAttemptsResult,
  ] = await Promise.all([
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
    runIds.length > 0
      ? supabase
          .from("ai_work_run_steps")
          .select(STEP_SELECT)
          .in("work_run_id", runIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    runIds.length > 0
      ? supabase
          .from("ai_work_run_artifacts")
          .select(ARTIFACT_SELECT)
          .in("work_run_id", runIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    runIds.length > 0
      ? supabase
          .from("ai_work_run_delivery_attempts")
          .select(DELIVERY_ATTEMPT_SELECT)
          .in("work_run_id", runIds)
          .order("attempted_at", { ascending: true })
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
  if (stepsResult.error) {
    throw new Error(`ai_work_run_steps query failed: ${stepsResult.error.message}`);
  }
  if (artifactsResult.error) {
    throw new Error(`ai_work_run_artifacts query failed: ${artifactsResult.error.message}`);
  }
  if (deliveryAttemptsResult.error) {
    throw new Error(
      `ai_work_run_delivery_attempts query failed: ${deliveryAttemptsResult.error.message}`,
    );
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
  const stepsByRunId = new Map<string, AiWorkRunStepView[]>();
  for (const step of (stepsResult.data ?? []) as AiWorkRunStepRow[]) {
    const bucket = stepsByRunId.get(step.work_run_id) ?? [];
    bucket.push(mapStep(step));
    stepsByRunId.set(step.work_run_id, bucket);
  }
  const artifactsByRunId = new Map<string, AiWorkRunArtifactView[]>();
  for (const artifact of (artifactsResult.data ?? []) as AiWorkRunArtifactRow[]) {
    const bucket = artifactsByRunId.get(artifact.work_run_id) ?? [];
    bucket.push(mapArtifact(artifact));
    artifactsByRunId.set(artifact.work_run_id, bucket);
  }
  const deliveryAttemptsByRunId = new Map<string, AiWorkRunDeliveryAttemptView[]>();
  for (const attempt of (deliveryAttemptsResult.data ??
    []) as AiWorkRunDeliveryAttemptRow[]) {
    const bucket = deliveryAttemptsByRunId.get(attempt.work_run_id) ?? [];
    bucket.push(mapDeliveryAttempt(attempt));
    deliveryAttemptsByRunId.set(attempt.work_run_id, bucket);
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
      steps: stepsByRunId.get(run.id) ?? [],
      artifacts: artifactsByRunId.get(run.id) ?? [],
      deliveryAttempts: deliveryAttemptsByRunId.get(run.id) ?? [],
    };
  });

  return Response.json({
    workflowId,
    generatedAt: new Date().toISOString(),
    runs: mappedRuns,
  });
});
