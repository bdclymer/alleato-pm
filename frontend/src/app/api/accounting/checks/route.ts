import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { requireCurrentUserAppCapability } from "@/lib/app-capabilities";
import { createServiceClient } from "@/lib/supabase/service";

export const GET = withApiGuardrails("/api/accounting/checks#GET", async () => {
  await requireCurrentUserAppCapability(
    "view_accounting",
    "/api/accounting/checks#GET",
    "Accounting access required.",
  );

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("acumatica_checks")
    .select("id, external_key, reference_nbr, document_type, vendor_id, vendor_name, payment_ref, application_date, status, description, payment_method, cash_account, currency_id, payment_amount, last_modified_at, acumatica_sync_at")
    .order("application_date", { ascending: false });

  if (error) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "/api/accounting/checks#GET",
      message: "Failed to load accounting checks.",
      details: { reason: error.message },
      cause: error,
    });
  }

  return NextResponse.json(data);
});
