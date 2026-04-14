import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/sync/acumatica/mirror
 *
 * Triggers a full or incremental sync of Acumatica entities into mirror tables.
 * This is a GLOBAL sync — no projectId needed. Pulls all records from Acumatica
 * and upserts into acumatica_* Supabase tables.
 *
 * Body: {
 *   mode: "full" | "incremental"   // default: "incremental"
 *   entities?: string[]             // optional — sync only these entities
 *   tier?: number                   // optional — sync only this tier (0-2)
 * }
 */
export const maxDuration = 300;

const AcumaticaMirrorSyncSchema = z.object({
  mode: z.enum(["full", "incremental"]).optional(),
  entities: z.array(z.string()).optional(),
  tier: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
  ]).optional(),
});

export const POST = withApiGuardrails("/api/sync/acumatica/mirror#POST", async ({ request }) => {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/sync/acumatica/mirror#POST",
      message: "Unauthorized Acumatica mirror sync request.",
      status: 401,
      severity: "medium",
      details: authError ? { reason: authError.message } : undefined,
      cause: authError ?? undefined,
    });
  }

  const body = await parseJsonBody(
    request,
    AcumaticaMirrorSyncSchema,
    "/api/sync/acumatica/mirror#POST",
  );
  const mode = body.mode ?? "incremental";

  try {
    // Dynamic import to avoid bundling issues
    const { syncAllMirrorEntities, syncMirrorTier } = await import(
      "@/lib/acumatica/mirror-sync"
    );

    let results;
    if (typeof body.tier === "number") {
      results = await syncMirrorTier(body.tier, { mode }, supabase);
    } else {
      results = await syncAllMirrorEntities({ mode }, supabase);
    }

    const totalFetched = results.reduce(
      (s: number, r: { fetched: number }) => s + r.fetched,
      0,
    );
    const totalUpserted = results.reduce(
      (s: number, r: { upserted: number }) => s + r.upserted,
      0,
    );
    const totalErrors = results.reduce(
      (s: number, r: { errors: number }) => s + r.errors,
      0,
    );

    return NextResponse.json({
      success: true,
      mode,
      summary: {
        entities: results.length,
        totalFetched,
        totalUpserted,
        totalErrors,
      },
      results,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    throw new GuardrailError({
      code: "UPSTREAM_FAILURE",
      where: "/api/sync/acumatica/mirror#POST",
      message: "Acumatica mirror sync failed.",
      details: {
        reason: err instanceof Error ? err.message : "Unknown error",
      },
      cause: err instanceof Error ? err : undefined,
    });
  }
});
