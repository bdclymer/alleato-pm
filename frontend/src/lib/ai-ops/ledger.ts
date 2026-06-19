import type { SupabaseClient } from "@supabase/supabase-js";

import type { AiEvent, AiRun, EvidenceRef } from "./contracts";
import { aiEventSchema, aiRunSchema, evidenceRefSchema } from "./contracts";
import type { Database, Json } from "@/types/database.types";

type AiOperationEventInsert =
  Database["public"]["Tables"]["ai_operation_events"]["Insert"];
type AiOperationEventUpdate =
  Database["public"]["Tables"]["ai_operation_events"]["Update"];
type AiWorkRunInsert = Database["public"]["Tables"]["ai_work_runs"]["Insert"];
type AiWorkRunUpdate = Database["public"]["Tables"]["ai_work_runs"]["Update"];
type AiWorkRunSourceInsert =
  Database["public"]["Tables"]["ai_work_run_sources"]["Insert"];

type JsonRecord = Record<string, unknown>;

export type AiOpsLedger = {
  createEvent(event: AiEvent): Promise<{ id: string }>;
  updateEvent(
    eventId: string,
    patch: Pick<
      Partial<AiEvent>,
      "status" | "failureCode" | "failureMessage" | "metadata"
    >,
  ): Promise<void>;
  createRun(run: AiRun): Promise<{ id: string }>;
  updateRun(
    runId: string,
    patch: Pick<
      Partial<AiRun>,
      | "status"
      | "dailyRecapId"
      | "sourceCounts"
      | "resultSummary"
      | "confidence"
      | "deliveryStatus"
      | "deliveryTarget"
      | "failureCode"
      | "failureMessage"
      | "completedAt"
      | "metadata"
    >,
  ): Promise<void>;
  insertEvidenceRefs(runId: string, refs: EvidenceRef[]): Promise<void>;
};

function toJson(value: unknown): Json {
  return value as Json;
}

function withMetadata(base: JsonRecord | undefined, patch: JsonRecord): Json {
  return toJson({ ...(base ?? {}), ...patch });
}

function toEventInsert(event: AiEvent): AiOperationEventInsert {
  const parsed = aiEventSchema.parse(event);
  return {
    id: parsed.id,
    event_source: parsed.eventSource,
    event_type: parsed.eventType,
    status: parsed.status,
    idempotency_key: parsed.idempotencyKey,
    source_record_id: parsed.sourceRecordId,
    source_thread_id: parsed.sourceThreadId,
    source_url: parsed.sourceUrl,
    actor_user_id: parsed.actorUserId,
    actor_display_name: parsed.actorDisplayName,
    project_id: parsed.projectId,
    delivery_context: toJson(parsed.deliveryContext),
    permission_context: toJson(parsed.permissionContext),
    payload: toJson(parsed.payload),
    failure_code: parsed.failureCode,
    failure_message: parsed.failureMessage,
    received_at: parsed.receivedAt,
    metadata: toJson(parsed.metadata),
  };
}

function toRunInsert(run: AiRun): AiWorkRunInsert {
  const parsed = aiRunSchema.parse(run);
  return {
    id: parsed.id,
    event_id: parsed.eventId,
    source_sync_run_id: parsed.sourceSyncRunId,
    daily_recap_id: parsed.dailyRecapId,
    workflow_id: parsed.workflowId,
    trigger_type: parsed.triggerType,
    surface: parsed.surface,
    title: parsed.title,
    user_goal: parsed.userGoal,
    normalized_goal: parsed.normalizedGoal,
    status: parsed.status,
    permission_mode: parsed.permissionMode,
    priority: parsed.priority,
    model_policy: toJson(parsed.modelPolicy),
    runtime_budget: toJson(parsed.runtimeBudget),
    tool_scope: toJson(parsed.toolScope),
    source_policy: toJson(parsed.sourcePolicy),
    source_counts: toJson(parsed.sourceCounts),
    result_summary: parsed.resultSummary,
    confidence:
      parsed.confidence && parsed.confidence !== "unknown"
        ? parsed.confidence
        : null,
    delivery_status: parsed.deliveryStatus,
    delivery_target: toJson(parsed.deliveryTarget),
    failure_code: parsed.failureCode,
    failure_message: parsed.failureMessage,
    started_at: parsed.startedAt,
    completed_at: parsed.completedAt,
    metadata: withMetadata(parsed.metadata, {
      workflowVersion: parsed.workflowVersion,
      retryable: parsed.retryable,
      sourceHealth: parsed.sourceHealth,
      artifacts: parsed.artifacts,
    }),
  };
}

function toSourceInsert(
  runId: string,
  ref: EvidenceRef,
): AiWorkRunSourceInsert {
  const parsed = evidenceRefSchema.parse(ref);
  return {
    work_run_id: runId,
    source_family: parsed.sourceFamily,
    source_record_id: parsed.sourceId,
    source_title: parsed.sourceTitle,
    source_url: parsed.sourceUrl,
    source_occurred_at: parsed.occurredAt,
    evidence_excerpt: parsed.excerpt,
    confidence:
      parsed.confidence && parsed.confidence !== "unknown"
        ? parsed.confidence
        : null,
    metadata: toJson({
      internalHref: parsed.internalHref,
      projectId: parsed.projectId,
      projectLabel: parsed.projectLabel,
      ...parsed.metadata,
    }),
  };
}

function assertId(row: { id?: string } | null, table: string): { id: string } {
  if (!row?.id) {
    throw new Error(`${table} insert did not return an id`);
  }
  return { id: row.id };
}

export function createAiOpsLedger(
  supabase: SupabaseClient<Database>,
): AiOpsLedger {
  return {
    async createEvent(event) {
      const payload = toEventInsert(event);
      const { data, error } = await supabase
        .from("ai_operation_events")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        throw new Error(`ai_operation_events insert failed: ${error.message}`);
      }

      return assertId(data, "ai_operation_events");
    },

    async updateEvent(eventId, patch) {
      const payload: AiOperationEventUpdate = {
        status: patch.status,
        failure_code: patch.failureCode,
        failure_message: patch.failureMessage,
        metadata: patch.metadata ? toJson(patch.metadata) : undefined,
      };

      const { error } = await supabase
        .from("ai_operation_events")
        .update(payload)
        .eq("id", eventId);

      if (error) {
        throw new Error(`ai_operation_events update failed: ${error.message}`);
      }
    },

    async createRun(run) {
      const payload = toRunInsert(run);
      const { data, error } = await supabase
        .from("ai_work_runs")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        throw new Error(`ai_work_runs insert failed: ${error.message}`);
      }

      return assertId(data, "ai_work_runs");
    },

    async updateRun(runId, patch) {
      const payload: AiWorkRunUpdate = {
        status: patch.status,
        daily_recap_id: patch.dailyRecapId,
        source_counts: patch.sourceCounts
          ? toJson(patch.sourceCounts)
          : undefined,
        result_summary: patch.resultSummary,
        confidence:
          patch.confidence && patch.confidence !== "unknown"
            ? patch.confidence
            : undefined,
        delivery_status: patch.deliveryStatus,
        delivery_target: patch.deliveryTarget
          ? toJson(patch.deliveryTarget)
          : undefined,
        failure_code: patch.failureCode,
        failure_message: patch.failureMessage,
        completed_at: patch.completedAt,
        metadata: patch.metadata ? toJson(patch.metadata) : undefined,
      };

      const { error } = await supabase
        .from("ai_work_runs")
        .update(payload)
        .eq("id", runId);

      if (error) {
        throw new Error(`ai_work_runs update failed: ${error.message}`);
      }
    },

    async insertEvidenceRefs(runId, refs) {
      if (refs.length === 0) return;
      const rows = refs.map((ref) => toSourceInsert(runId, ref));
      const { error } = await supabase.from("ai_work_run_sources").insert(rows);

      if (error) {
        throw new Error(`ai_work_run_sources insert failed: ${error.message}`);
      }
    },
  };
}
