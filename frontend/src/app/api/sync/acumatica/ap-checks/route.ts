import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { syncAPChecksToCommitmentPayments } from "@/lib/acumatica/sync-service";

/**
 * POST /api/sync/acumatica/ap-checks
 *
 * Syncs all Acumatica AP Checks from the mirror table into commitment_payments.
 * Global sync — not scoped to a single project.
 */
export const POST = withApiGuardrails("/api/sync/acumatica/ap-checks#POST", async () => {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/sync/acumatica/ap-checks#POST",
      message: "Unauthorized",
      status: 401,
      severity: "medium",
    });
  }

  try {
    const result = await syncAPChecksToCommitmentPayments(createServiceClient());
    return NextResponse.json({ success: true, result, syncedAt: new Date().toISOString() });
  } catch (err) {
    throw new GuardrailError({
      code: "UPSTREAM_FAILURE",
      where: "/api/sync/acumatica/ap-checks#POST",
      message: "AP checks sync failed.",
      details: { reason: err instanceof Error ? err.message : "Unknown error" },
      cause: err instanceof Error ? err : undefined,
    });
  }
});
