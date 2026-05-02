import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface EmailProjectRow {
  id: number;
  name: string | null;
  project_number: string | null;
}

interface EmailRow {
  id: number;
  project_id: number;
  subject: string;
  body: string | null;
  body_html: string | null;
  from_name: string | null;
  from_email: string | null;
  to_list: string[] | null;
  cc_list: string[] | null;
  bcc_list: string[] | null;
  status: "Draft" | "Sent" | "Received" | "Failed";
  sent_at: string | null;
  received_at: string | null;
  is_private: boolean | null;
  is_starred: boolean | null;
  has_attachments: boolean | null;
  related_tool: string | null;
  related_id: string | null;
  distribution_group: string | null;
  thread_id: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  projects: EmailProjectRow | null;
}

async function assertAdminAccess(where: string) {
  const supabase = await createClient();
  const user = await getApiRouteUser();

  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where,
      message: "Authentication required.",
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where,
      message: profileError.message,
    });
  }

  if (!profile?.is_admin) {
    throw new GuardrailError({
      code: "FORBIDDEN",
      where,
      message: "Admin access required.",
      status: 403,
    });
  }

  return supabase;
}

export const GET = withApiGuardrails("emails#GET", async ({ request }) => {
  const supabase = await assertAdminAccess("emails#GET");
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const source = searchParams.get("source") ?? "app";

  let query = supabase
    .from("project_emails")
    .select(
      `
        *,
        projects!project_emails_project_id_fkey (
          id,
          name,
          project_number
        )
      `,
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (source === "outlook") {
    query = query.or(
      "graph_message_id.not.is.null,mailbox_user_id.not.is.null,conversation_id.not.is.null",
    );
  } else if (source === "app") {
    query = query
      .is("graph_message_id", null)
      .is("mailbox_user_id", null)
      .is("conversation_id", null);
  }

  const { data, error } = await query;

  if (error) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "emails#GET",
      message: error.message,
    });
  }

  const emails = ((data ?? []) as unknown as EmailRow[]).map((email) => ({
    ...email,
    project: email.projects
      ? {
          id: email.projects.id,
          name: email.projects.name,
          project_number: email.projects.project_number,
        }
      : null,
  }));

  return NextResponse.json(emails);
});
