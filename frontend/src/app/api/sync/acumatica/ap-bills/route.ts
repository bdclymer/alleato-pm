import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { syncAPBillsToSubcontractorInvoices } from "@/lib/acumatica/sync-service";

/**
 * POST /api/sync/acumatica/ap-bills
 *
 * Syncs all Acumatica AP Bills from the mirror table into subcontractor_invoices.
 * Global sync — not scoped to a single project.
 */
export const POST = withApiGuardrails("/api/sync/acumatica/ap-bills#POST", async () => {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/sync/acumatica/ap-bills#POST",
      message: "Unauthorized",
      status: 401,
      severity: "medium",
    });
  }

  try {
    const result = await syncAPBillsToSubcontractorInvoices(createServiceClient());
    return NextResponse.json({ success: true, result, syncedAt: new Date().toISOString() });
  } catch (err) {
    throw new GuardrailError({
      code: "UPSTREAM_FAILURE",
      where: "/api/sync/acumatica/ap-bills#POST",
      message: "AP bills sync failed.",
      details: { reason: err instanceof Error ? err.message : "Unknown error" },
      cause: err instanceof Error ? err : undefined,
    });
  }
});
