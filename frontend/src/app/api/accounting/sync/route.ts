import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { syncAllMirrorEntities } from "@/lib/acumatica/mirror-sync";

/**
 * POST /api/accounting/sync
 *
 * Triggers an incremental Acumatica → Supabase mirror sync.
 * Protected by a bearer token (ACCOUNTING_SYNC_SECRET env var).
 *
 * Called by the scheduled remote agent twice daily (6am + 6pm ET).
 */
const AccountingSyncRequestSchema = z.object({
  mode: z.enum(["incremental", "full"]).optional(),
});

export const POST = withApiGuardrails("/api/accounting/sync#POST", async ({ request }) => {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.ACCOUNTING_SYNC_SECRET;

  if (!secret) {
    throw new GuardrailError({
      code: "MISSING_ENV_VAR",
      where: "/api/accounting/sync#POST",
      message: "ACCOUNTING_SYNC_SECRET is not configured.",
      details: { variable: "ACCOUNTING_SYNC_SECRET" },
      severity: "high",
    });
  }

  if (authHeader !== `Bearer ${secret}`) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/accounting/sync#POST",
      message: "Unauthorized accounting sync request.",
      status: 401,
      severity: "medium",
    });
  }

  const body = await parseJsonBody(
    request,
    AccountingSyncRequestSchema,
    "/api/accounting/sync#POST",
  );
  const mode: "incremental" | "full" = body.mode ?? "incremental";

  try {
    const results = await syncAllMirrorEntities({ mode });

    const summary = results.map((r) => ({
      entity: r.entity,
      fetched: r.fetched,
      upserted: r.upserted,
      skipped: r.skipped,
      errors: r.errors,
      durationMs: r.durationMs,
    }));

    const totalUpserted = results.reduce((acc, r) => acc + r.upserted, 0);
    const totalErrors = results.reduce((acc, r) => acc + r.errors, 0);

    return NextResponse.json({
      ok: true,
      mode,
      totalUpserted,
      totalErrors,
      entities: summary,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    throw new GuardrailError({
      code: "UPSTREAM_FAILURE",
      where: "/api/accounting/sync#POST",
      message: "Accounting mirror sync failed.",
      details: {
        reason: err instanceof Error ? err.message : "Unknown error",
      },
      cause: err instanceof Error ? err : undefined,
    });
  }
});
