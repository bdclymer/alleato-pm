import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { syncDirectCosts } from "@/lib/acumatica/sync-service";

/**
 * POST /api/sync/acumatica/direct-costs
 *
 * Pulls Project Transactions (PM3040PL) from Acumatica and upserts them
 * into the direct_costs table for a given project.
 *
 * Body: { projectId: number }
 */
const SyncProjectPayloadSchema = z.object({
  projectId: z.number().int().positive(),
});

export const POST = withApiGuardrails("/api/sync/acumatica/direct-costs#POST", async ({ request }) => {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/sync/acumatica/direct-costs#POST",
      message: "Unauthorized direct costs sync request.",
      status: 401,
      severity: "medium",
      details: authError ? { reason: authError.message } : undefined,
      cause: authError ?? undefined,
    });
  }

  const body = await parseJsonBody(
    request,
    SyncProjectPayloadSchema,
    "/api/sync/acumatica/direct-costs#POST",
  );
  const { projectId } = body;

  try {
    const result = await syncDirectCosts(projectId, user.id);

    return NextResponse.json({
      success: true,
      projectId,
      result,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    throw new GuardrailError({
      code: "UPSTREAM_FAILURE",
      where: "/api/sync/acumatica/direct-costs#POST",
      message: "Direct costs sync failed.",
      details: { reason: err instanceof Error ? err.message : "Unknown error" },
      cause: err instanceof Error ? err : undefined,
    });
  }
});
