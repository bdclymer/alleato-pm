import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import {
  createOutlookIntakeServiceClient,
  createServiceClient,
} from "@/lib/supabase/service";
import { NextResponse } from "next/server";

/**
 * Global Emails feed.
 *
 * Reads the LIVE inbox (`outlook_email_intake`, AI Database) — current to today.
 * The old PM-APP `project_emails` projection this used to read was abandoned
 * when the Outlook sync moved to the AI DB (it silently stopped ~2026-06-16),
 * leaving the page stale. The Triage inbox already reads this same live source.
 * App-composed drafts (a handful) are not surfaced in this list; they're
 * authored from the project email composer.
 *
 * The response shape mirrors the previous project_emails contract so the Emails
 * UI is unchanged.
 */

const MAX_EMAILS = 1000;

interface IntakeRow {
  id: number;
  project_id: number | null;
  subject: string | null;
  body: string | null;
  body_html: string | null;
  body_text: string | null;
  from_name: string | null;
  from_email: string | null;
  to_list: string[] | null;
  cc_list: string[] | null;
  received_at: string | null;
  has_attachments: boolean | null;
  graph_message_id: string | null;
  mailbox_user_id: string | null;
  conversation_id: string | null;
  created_at: string | null;
}

export const GET = withApiGuardrails("emails#GET", async ({ request }) => {
  const supabase = await createClient();
  const user = await getApiRouteUser();

  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "emails#GET",
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
  const status = searchParams.get("status");

  const intake = createOutlookIntakeServiceClient();
  let query = intake
    .from("outlook_email_intake")
    .select(
      "id,project_id,subject,body,body_html,body_text,from_name,from_email,to_list,cc_list,received_at,has_attachments,graph_message_id,mailbox_user_id,conversation_id,created_at",
    )
    .order("received_at", { ascending: false, nullsFirst: false })
    .limit(MAX_EMAILS);

  // Non-admins only see mail they sent or received.
  if (!isAdmin && user.email) {
    query = query.or(`from_email.eq.${user.email},to_list.cs.{${user.email}}`);
  } else if (!isAdmin) {
    return NextResponse.json([]);
  }

  const { data, error } = await query;
  if (error) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "emails#GET",
      message: error.message,
    });
  }

  const rows = (data ?? []) as unknown as IntakeRow[];

  // Real (non-inline) attachments only. Outlook/Graph's has_attachments flag is
  // true for inline images (signature logos), which falsely shows a paperclip on
  // emails with no actual file. Drive the icon off real attachment rows instead.
  const emailIds = rows.map((r) => r.id);
  const emailsWithRealAttachments = new Set<number>();
  if (emailIds.length > 0) {
    const { data: attachmentRows } = await intake
      .from("outlook_email_intake_attachments")
      .select("intake_email_id")
      .in("intake_email_id", emailIds)
      .or("is_inline.is.null,is_inline.eq.false");
    for (const a of attachmentRows ?? []) {
      if (typeof a.intake_email_id === "number") emailsWithRealAttachments.add(a.intake_email_id);
    }
  }

  // Resolve project names from the PM APP in one batch.
  const projectIds = Array.from(
    new Set(rows.map((r) => r.project_id).filter((id): id is number => typeof id === "number")),
  );
  const projects = new Map<number, { id: number; name: string | null; project_number: string | null }>();
  if (projectIds.length > 0) {
    const { data: projectRows } = await createServiceClient()
      .from("projects")
      .select("id,name,project_number")
      .in("id", projectIds);
    for (const p of projectRows ?? []) {
      projects.set(p.id as number, {
        id: p.id as number,
        name: (p.name as string | null) ?? null,
        project_number: (p.project_number as string | null) ?? null,
      });
    }
  }

  const emails = rows
    .filter((r) => (status ? "Received" === status : true))
    .map((r) => ({
      id: r.id,
      project_id: r.project_id,
      subject: r.subject || "(no subject)",
      body: r.body_text || r.body,
      body_html: r.body_html,
      from_name: r.from_name,
      from_email: r.from_email,
      to_list: r.to_list,
      cc_list: r.cc_list,
      bcc_list: null,
      status: "Received" as const,
      sent_at: null,
      received_at: r.received_at,
      is_private: null,
      is_starred: null,
      has_attachments: emailsWithRealAttachments.has(r.id),
      related_tool: null,
      related_id: null,
      distribution_group: null,
      thread_id: r.conversation_id,
      graph_message_id: r.graph_message_id,
      mailbox_user_id: r.mailbox_user_id,
      conversation_id: r.conversation_id,
      created_by: null,
      created_at: r.created_at ?? r.received_at,
      updated_at: r.created_at ?? r.received_at,
      deleted_at: null,
      project: typeof r.project_id === "number" ? (projects.get(r.project_id) ?? null) : null,
    }));

  return NextResponse.json(emails);
});
