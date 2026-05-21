/**
 * FM Global form submissions — list endpoint.
 * GET /api/fm-global/submissions
 */

import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const GET = withApiGuardrails("fm-global/submissions#GET", async () => {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "fm-global/submissions#GET",
      message: "Authentication required.",
    });
  }

  const { data, error } = await supabase
    .from("fm_form_submissions")
    .select(
      "id,created_at,updated_at,contact_info,project_details,user_input,matched_table_ids,lead_status,lead_score",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new GuardrailError({
      code: "DB_ERROR",
      where: "fm-global/submissions#GET",
      message: error.message,
    });
  }

  return NextResponse.json({ data: data ?? [] });
});
