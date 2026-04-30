import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { syncCommitments } from "@/lib/acumatica/sync-service";

/**
 * POST /api/sync/acumatica/commitments
 *
 * Pulls Subcontracts and Purchase Orders from Acumatica and upserts
 * them into subcontracts and purchase_orders tables for a given project.
 *
 * Body: { projectId: number }
 */
const SyncProjectPayloadSchema = z.object({
  projectId: z.number().int().positive(),
});

export const POST = withApiGuardrails("/api/sync/acumatica/commitments#POST", async ({ request }) => {
  if (!process.env.ACCOUNTING_USER || !process.env.ACCOUNTING_PASSWORD) {
    throw new GuardrailError({
      code: "MISSING_ENV_VAR",
      where: "/api/sync/acumatica/commitments#POST",
      message: "Acumatica ERP is not configured on this server. Contact your administrator to set ACCOUNTING_USER and ACCOUNTING_PASSWORD.",
      status: 503,
      severity: "high",
    });
  }

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/sync/acumatica/commitments#POST",
      message: "Unauthorized commitments sync request.",
      status: 401,
      severity: "medium",
      details: authError ? { reason: authError.message } : undefined,
      cause: authError ?? undefined,
    });
  }

  const body = await parseJsonBody(
    request,
    SyncProjectPayloadSchema,
    "/api/sync/acumatica/commitments#POST",
  );
  const { projectId } = body;

  try {
    const result = await syncCommitments(projectId, user.id);

    return NextResponse.json({
      success: true,
      projectId,
      result,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Unknown error";
    throw new GuardrailError({
      code: "UPSTREAM_FAILURE",
      where: "/api/sync/acumatica/commitments#POST",
      message: `Commitments sync failed: ${reason}`,
      details: { reason },
      cause: err instanceof Error ? err : undefined,
      severity: "high",
    });
  }
});
