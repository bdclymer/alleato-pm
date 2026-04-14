import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { syncARPayments } from "@/lib/acumatica/sync";

/**
 * POST /api/sync/acumatica/ar-payments
 *
 * Pulls AR Payments from Acumatica and upserts them into
 * prime_contract_payments for a given project.
 *
 * Body: { projectId: number }
 */
const SyncProjectPayloadSchema = z.object({
  projectId: z.number().int().positive(),
});

export const POST = withApiGuardrails("/api/sync/acumatica/ar-payments#POST", async ({ request }) => {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/sync/acumatica/ar-payments#POST",
      message: "Unauthorized AR payments sync request.",
      status: 401,
      severity: "medium",
      details: authError ? { reason: authError.message } : undefined,
      cause: authError ?? undefined,
    });
  }

  const body = await parseJsonBody(
    request,
    SyncProjectPayloadSchema,
    "/api/sync/acumatica/ar-payments#POST",
  );
  const { projectId } = body;

  try {
    const result = await syncARPayments(projectId, user.id);

    return NextResponse.json({
      success: true,
      projectId,
      result,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    throw new GuardrailError({
      code: "UPSTREAM_FAILURE",
      where: "/api/sync/acumatica/ar-payments#POST",
      message: "AR payments sync failed.",
      details: { reason: err instanceof Error ? err.message : "Unknown error" },
      cause: err instanceof Error ? err : undefined,
    });
  }
});
