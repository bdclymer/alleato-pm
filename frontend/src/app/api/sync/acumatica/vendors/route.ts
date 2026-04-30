import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { syncVendors } from "@/lib/acumatica/sync-service";

/**
 * POST /api/sync/acumatica/vendors
 *
 * Pulls all active vendors from Acumatica and upserts them directly
 * into the companies table (is_vendor = true), keyed on acumatica_vendor_id.
 *
 * No body required.
 */
export const POST = withApiGuardrails("/api/sync/acumatica/vendors#POST", async () => {
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/sync/acumatica/vendors#POST",
      message: "Unauthorized vendors sync request.",
      status: 401,
      severity: "medium",
      details: authError ? { reason: authError.message } : undefined,
      cause: authError ?? undefined,
    });
  }

  try {
    const result = await syncVendors();

    return NextResponse.json({
      success: true,
      result,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    throw new GuardrailError({
      code: "UPSTREAM_FAILURE",
      where: "/api/sync/acumatica/vendors#POST",
      message: "Vendors sync failed.",
      details: { reason: err instanceof Error ? err.message : "Unknown error" },
      cause: err instanceof Error ? err : undefined,
    });
  }
});
