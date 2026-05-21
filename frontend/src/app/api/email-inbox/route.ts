export const dynamic = "force-dynamic";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const GET = withApiGuardrails("email-inbox#GET", async ({ request }) => {
  const supabase = await createClient();
  const user = await getApiRouteUser();

  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "email-inbox#GET",
      message: "Authentication required.",
    });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.is_admin === true;
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab") ?? "needs-assignment";
  const q = searchParams.get("q") ?? "";

  let query = supabase
    .from("outlook_email_intake")
    .select(
      `
      id,
      graph_message_id,
      mailbox_user_id,
      project_id,
      conversation_id,
      subject,
      body,
      body_html,
      body_text,
      from_name,
      from_email,
      to_list,
      cc_list,
      match_status,
      assignment_confidence,
      received_at,
      has_attachments,
      web_link,
      source_metadata,
      projects!outlook_email_intake_project_id_fkey (
        id,
        name,
        project_number
      ),
      outlook_email_intake_attachments (
        id,
        file_name,
        file_size,
        content_type,
        graph_attachment_id,
        promotion_status,
        source_metadata
      )
    `,
    )
    .is("deleted_at", null)
    .order("received_at", { ascending: false })
    .limit(150);

  // Non-admins see only their own mailbox
  if (!isAdmin && user.email) {
    query = query.eq("mailbox_user_id", user.email);
  }

  if (tab === "needs-assignment") {
    query = query.is("project_id", null);
  } else if (tab === "has-attachments") {
    query = query.eq("has_attachments", true);
  }

  if (q) {
    query = query.or(
      `subject.ilike.%${q}%,from_name.ilike.%${q}%,from_email.ilike.%${q}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "email-inbox#GET",
      message: error.message,
    });
  }

  return NextResponse.json(data ?? []);
});
