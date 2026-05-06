import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface IntakeProjectRow {
  id: number;
  name: string | null;
  project_number: string | null;
}

interface IntakeAttachmentRow {
  id: number;
  file_name: string;
  file_size: number | null;
  content_type: string | null;
  created_at: string | null;
}

interface OutlookIntakeRow {
  id: number;
  graph_message_id: string;
  mailbox_user_id: string;
  project_id: number | null;
  document_metadata_id: string | null;
  document_metadata: { status: string } | null;
  conversation_id: string | null;
  subject: string;
  from_name: string | null;
  from_email: string | null;
  to_list: string[] | null;
  match_status: string;
  assignment_method: string | null;
  assignment_confidence: number | null;
  received_at: string | null;
  has_attachments: boolean | null;
  web_link: string | null;
  created_at: string | null;
  projects: IntakeProjectRow | null;
  outlook_email_intake_attachments: IntakeAttachmentRow[] | null;
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

export const GET = withApiGuardrails("outlook-intake#GET", async ({ request }) => {
  const supabase = await assertAdminAccess("outlook-intake#GET");
  const { searchParams } = new URL(request.url);
  const matchStatus = searchParams.get("match_status");
  const unassigned = searchParams.get("unassigned") === "true";

  let query = supabase
    .from("outlook_email_intake")
    .select(
      `
        id,
        graph_message_id,
        mailbox_user_id,
        project_id,
        document_metadata_id,
        document_metadata (
          status
        ),
        conversation_id,
        subject,
        from_name,
        from_email,
        to_list,
        match_status,
        assignment_method,
        assignment_confidence,
        received_at,
        has_attachments,
        web_link,
        created_at,
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
          created_at
        )
      `,
    )
    .is("deleted_at", null)
    .order("received_at", { ascending: false, nullsFirst: false });

  if (matchStatus) {
    query = query.eq("match_status", matchStatus);
  }

  if (unassigned) {
    query = query.is("project_id", null);
  }

  const { data, error } = await query;

  if (error) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "outlook-intake#GET",
      message: error.message,
    });
  }

  const rows = ((data ?? []) as unknown as OutlookIntakeRow[]).map((row) => ({
    id: row.id,
    graphMessageId: row.graph_message_id,
    mailboxUserId: row.mailbox_user_id,
    documentMetadataId: row.document_metadata_id,
    documentStatus: row.document_metadata?.status ?? null,
    conversationId: row.conversation_id,
    subject: row.subject,
    fromName: row.from_name,
    fromEmail: row.from_email,
    toList: row.to_list ?? [],
    matchStatus: row.match_status,
    assignmentMethod: row.assignment_method,
    assignmentConfidence: row.assignment_confidence,
    receivedAt: row.received_at,
    hasAttachments: row.has_attachments,
    webLink: row.web_link,
    createdAt: row.created_at,
    project: row.projects
      ? {
          id: row.projects.id,
          name: row.projects.name,
          projectNumber: row.projects.project_number,
        }
      : null,
    attachments: (row.outlook_email_intake_attachments ?? []).map((attachment) => ({
      id: attachment.id,
      fileName: attachment.file_name,
      fileSize: attachment.file_size,
      contentType: attachment.content_type,
      createdAt: attachment.created_at,
    })),
  }));

  return NextResponse.json(rows);
});
