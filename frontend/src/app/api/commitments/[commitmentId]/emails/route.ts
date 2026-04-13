import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const GET = withApiGuardrails<{ commitmentId: string }>(
  "commitments/[commitmentId]/emails#GET",
  async ({ request, params }) => {
  const supabase = await createClient();
  const { commitmentId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "commitments/[commitmentId]/emails#GET", message: "Authentication required." });
  }

  const { data: emails, error } = await supabase
    .from("project_emails")
    .select(
      "id, subject, from_email, from_name, body, status, sent_at, received_at, has_attachments, to_list, created_at",
    )
    .eq("related_tool", "commitment")
    .eq("related_id", commitmentId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: emails ?? [],
    meta: { total_count: emails?.length ?? 0 },
  });
  },
);
