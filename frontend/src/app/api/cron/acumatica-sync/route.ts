/**
 * POST /api/cron/acumatica-sync
 *
 * Scheduled Acumatica integration pipeline:
 * 1) mirror tables (incremental), 2) vendor/company projection, 3) project-level direct costs + AR invoices/payments.
 */

import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createServiceClient } from "@/lib/supabase/service";
import { syncAllMirrorEntities } from "@/lib/acumatica/mirror-sync";
import {
  syncARInvoices,
  syncARPayments,
  syncDirectCosts,
  syncVendors,
} from "@/lib/acumatica/sync";
import type { Database } from "@/types/database.types";
import type { Json } from "@/types/database.types";

export const maxDuration = 300;

type ServiceClient = ReturnType<typeof createServiceClient>;
type SyncStateInsert = Database["public"]["Tables"]["acumatica_sync_state"]["Insert"];
type SyncStateUpdate = Database["public"]["Tables"]["acumatica_sync_state"]["Update"];

interface ProjectSyncResult {
  projectId: number;
  directCosts: { created: number; updated: number; errors: string[] };
  arInvoices: { created: number; updated: number; errors: string[] };
  arPayments: { created: number; updated: number; errors: string[] };
}

interface ProjectBatch {
  projectIds: number[];
  totalProjects: number;
  batchSize: number;
  startOffset: number;
  nextOffset: number;
}

const PIPELINE_STATE_ENTITY = "cron_acumatica_pipeline";
const BATCH_STATE_ENTITY = "cron_acumatica_project_batch";

/** Parses and normalizes the cron bearer token from request headers. */
function parseBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const prefix = "Bearer ";
  if (!authorizationHeader.startsWith(prefix)) return null;
  return authorizationHeader.slice(prefix.length).trim();
}

/** Converts unknown errors into a safe message for logs and API responses. */
function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Converts unknown structured values into a JSON-safe payload for Supabase Json columns. */
function toJsonValue(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

/** Reads a positive integer environment value with a safe fallback. */
function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Resolves the sync user for audit fields on direct_cost records. */
async function resolveSyncUserId(supabase: ServiceClient): Promise<string> {
  const configured = process.env.ACUMATICA_SYNC_USER_ID?.trim();
  if (configured) return configured;

  const { data, error } = await supabase
    .from("users_auth")
    .select("auth_user_id")
    .limit(1);

  if (error) {
    throw new Error(`Failed to resolve sync user from users_auth: ${error.message}`);
  }

  const firstUserId = data?.[0]?.auth_user_id;
  if (!firstUserId) {
    throw new Error(
      "ACUMATICA_SYNC_USER_ID is not set and no users_auth.auth_user_id row exists.",
    );
  }
  return firstUserId;
}

/** Upserts a sync-state heartbeat row used for operational monitoring. */
async function upsertSyncState(
  supabase: ServiceClient,
  entityName: string,
  payload: {
    status: string;
    startedAt?: string;
    successAt?: string;
    errorMessage?: string | null;
    stats?: Json | null;
  },
): Promise<void> {
  const row: SyncStateInsert & SyncStateUpdate = {
    entity_name: entityName,
    status: payload.status,
    updated_at: new Date().toISOString(),
    last_started_at: payload.startedAt ?? undefined,
    last_success_at: payload.successAt ?? undefined,
    last_error: payload.errorMessage ?? null,
    last_stats: payload.stats ?? null,
  };

  const { error } = await supabase
    .from("acumatica_sync_state")
    .upsert(row, { onConflict: "entity_name" });

  if (error) {
    throw new Error(`Failed to upsert acumatica_sync_state (${entityName}): ${error.message}`);
  }
}

/** Builds a rotating project batch so all mapped projects are processed across runs. */
async function getProjectBatch(supabase: ServiceClient): Promise<ProjectBatch> {
  const batchSize = readPositiveIntEnv("ACUMATICA_PROJECT_SYNC_BATCH_SIZE", 25);

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id")
    .eq("archived", false)
    .not("acumatica_project_id", "is", null)
    .order("id", { ascending: true });

  if (projectsError) {
    throw new Error(`Failed to fetch mapped projects: ${projectsError.message}`);
  }

  const projectIds = (projects ?? []).map((row) => row.id);
  if (projectIds.length === 0) {
    return {
      projectIds: [],
      totalProjects: 0,
      batchSize,
      startOffset: 0,
      nextOffset: 0,
    };
  }

  const { data: stateRow, error: stateError } = await supabase
    .from("acumatica_sync_state")
    .select("last_stats")
    .eq("entity_name", BATCH_STATE_ENTITY)
    .maybeSingle();

  if (stateError) {
    throw new Error(`Failed to read project batch cursor: ${stateError.message}`);
  }

  const rawNextOffset = stateRow?.last_stats
    && typeof stateRow.last_stats === "object"
    && stateRow.last_stats !== null
    && "next_offset" in stateRow.last_stats
    ? Number((stateRow.last_stats as Record<string, unknown>).next_offset)
    : 0;

  const safeStartOffset = Number.isFinite(rawNextOffset)
    ? ((Math.floor(rawNextOffset) % projectIds.length) + projectIds.length) % projectIds.length
    : 0;

  const effectiveBatchSize = Math.min(batchSize, projectIds.length);
  const rotatingBatch = Array.from({ length: effectiveBatchSize }, (_, index) => {
    const rotatedIndex = (safeStartOffset + index) % projectIds.length;
    return projectIds[rotatedIndex];
  });

  const nextOffset = (safeStartOffset + effectiveBatchSize) % projectIds.length;

  return {
    projectIds: rotatingBatch,
    totalProjects: projectIds.length,
    batchSize: effectiveBatchSize,
    startOffset: safeStartOffset,
    nextOffset,
  };
}

/** Persists the next project cursor after each cron run. */
async function persistProjectBatchState(
  supabase: ServiceClient,
  batch: ProjectBatch,
): Promise<void> {
  await upsertSyncState(supabase, BATCH_STATE_ENTITY, {
    status: "success",
    successAt: new Date().toISOString(),
    stats: {
      total_projects: batch.totalProjects,
      batch_size: batch.batchSize,
      start_offset: batch.startOffset,
      next_offset: batch.nextOffset,
      project_ids: batch.projectIds,
    },
  });
}

/** Writes a per-project ERP sync audit record for operations visibility. */
async function insertProjectSyncLog(
  supabase: ServiceClient,
  projectResult: ProjectSyncResult,
): Promise<void> {
  // Sensitive: this write is used to audit accounting sync behavior for financial data.
  const hasErrors =
    projectResult.directCosts.errors.length > 0
    || projectResult.arInvoices.errors.length > 0
    || projectResult.arPayments.errors.length > 0;

  const payload = {
    direct_costs: projectResult.directCosts,
    ar_invoices: projectResult.arInvoices,
    ar_payments: projectResult.arPayments,
  };

  const { error } = await supabase.from("erp_sync_log").insert({
    project_id: projectResult.projectId,
    erp_system: "acumatica",
    sync_status: hasErrors ? "partial_failure" : "success",
    last_job_cost_sync: new Date().toISOString(),
    last_direct_cost_sync: new Date().toISOString(),
    payload,
  });

  if (error) {
    throw new Error(
      `Failed writing erp_sync_log for project ${projectResult.projectId}: ${error.message}`,
    );
  }
}

export const POST = withApiGuardrails("/api/cron/acumatica-sync#POST", async ({ request }) => {
  const expectedSecret = process.env.CRON_SECRET;
  const bearerToken = parseBearerToken(request.headers.get("authorization"));

  // Sensitive: cron endpoint auth prevents unauthorized financial sync execution.
  if (!expectedSecret || bearerToken !== expectedSecret) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/cron/acumatica-sync#POST",
      message: "Unauthorized cron invocation.",
      status: 401,
      severity: "medium",
    });
  }

  const supabase = createServiceClient();
  const startedAt = new Date().toISOString();

  await upsertSyncState(supabase, PIPELINE_STATE_ENTITY, {
    status: "running",
    startedAt,
    errorMessage: null,
    stats: null,
  });

  try {
    const mirrorResults = await syncAllMirrorEntities({ mode: "incremental" }, supabase);
    const vendorResult = await syncVendors(supabase);
    const syncUserId = await resolveSyncUserId(supabase);
    const projectBatch = await getProjectBatch(supabase);

    const projectResults: ProjectSyncResult[] = [];
    for (const projectId of projectBatch.projectIds) {
      const directCosts = await syncDirectCosts(projectId, syncUserId, supabase);
      const arInvoices = await syncARInvoices(projectId, syncUserId, supabase);
      const arPayments = await syncARPayments(projectId, syncUserId, supabase);

      const projectResult: ProjectSyncResult = {
        projectId,
        directCosts,
        arInvoices,
        arPayments,
      };

      projectResults.push(projectResult);
      await insertProjectSyncLog(supabase, projectResult);
    }

    await persistProjectBatchState(supabase, projectBatch);

    const mirrorErrorCount = mirrorResults.reduce((sum, item) => sum + item.errors, 0);
    const projectErrorCount = projectResults.reduce(
      (sum, item) =>
        sum
        + item.directCosts.errors.length
        + item.arInvoices.errors.length
        + item.arPayments.errors.length,
      0,
    );
    const totalErrorCount = mirrorErrorCount + vendorResult.errors.length + projectErrorCount;
    const status = totalErrorCount === 0 ? "success" : "partial_failure";

    const summary = {
      status,
      startedAt,
      finishedAt: new Date().toISOString(),
      mirror: {
        entities: mirrorResults.length,
        fetched: mirrorResults.reduce((sum, item) => sum + item.fetched, 0),
        upserted: mirrorResults.reduce((sum, item) => sum + item.upserted, 0),
        errors: mirrorErrorCount,
      },
      vendors: vendorResult,
      projects: {
        processed: projectResults.length,
        totalMapped: projectBatch.totalProjects,
        batchSize: projectBatch.batchSize,
        startOffset: projectBatch.startOffset,
        nextOffset: projectBatch.nextOffset,
        errors: projectErrorCount,
      },
      totalErrors: totalErrorCount,
    };

    await upsertSyncState(supabase, PIPELINE_STATE_ENTITY, {
      status,
      startedAt,
      successAt: new Date().toISOString(),
      errorMessage: totalErrorCount === 0 ? null : `Pipeline completed with ${totalErrorCount} error(s).`,
      stats: toJsonValue(summary),
    });

    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    const errorMessage = toErrorMessage(error);

    await upsertSyncState(supabase, PIPELINE_STATE_ENTITY, {
      status: "failed",
      startedAt,
      errorMessage,
      stats: toJsonValue({ startedAt, failedAt: new Date().toISOString() }),
    });

    throw new GuardrailError({
      code: "UPSTREAM_FAILURE",
      where: "/api/cron/acumatica-sync#POST",
      message: "Acumatica cron sync pipeline failed.",
      details: { reason: errorMessage },
      cause: error instanceof Error ? error : undefined,
    });
  }
});
