import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const GET = withApiGuardrails("/api/accounting/bills#GET", async () => {
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/accounting/bills#GET",
      message: "Unauthorized accounting bills request.",
      status: 401,
      severity: "medium",
    });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("acumatica_ap_bills")
    .select("id, external_key, reference_nbr, document_type, vendor_id, vendor_ref, project_code, date, due_date, status, description, amount, balance, currency_id, terms, hold, approved_for_payment, last_modified_at, acumatica_sync_at")
    .order("date", { ascending: false });

  if (error) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "/api/accounting/bills#GET",
      message: "Failed to load accounting bills.",
      details: { reason: error.message },
      cause: error,
    });
  }

  return NextResponse.json(data);
});
