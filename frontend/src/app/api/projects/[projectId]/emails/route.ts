import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { buildOwnEmailsFilter } from "@/lib/emails/access";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

const createEmailSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(500),
  body: z.string().optional().nullable(),
  body_html: z.string().optional().nullable(),
  from_name: z.string().optional().nullable(),
  from_email: z.string().email("Invalid email address").optional().nullable(),
  to_list: z.array(z.string()).optional().nullable(),
  cc_list: z.array(z.string()).optional().nullable(),
  bcc_list: z.array(z.string()).optional().nullable(),
  status: z.enum(["Draft", "Sent", "Received", "Failed"]).default("Draft"),
  is_private: z.boolean().optional().default(false),
  is_starred: z.boolean().optional().default(false),
  has_attachments: z.boolean().optional().default(false),
  related_tool: z.string().optional().nullable(),
  related_id: z.string().optional().nullable(),
  distribution_group: z.string().optional().nullable(),
  thread_id: z.string().optional().nullable(),
});

/**
 * GET /api/projects/[projectId]/emails
 * Fetch all emails for a project with optional filters
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/emails#GET",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const supabase = await createClient();

    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/emails#GET", message: "Authentication required." });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.is_admin === true;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const starred = searchParams.get("starred");
    const relatedTool = searchParams.get("related_tool");
    const relatedId = searchParams.get("related_id");
    const source = searchParams.get("source") ?? "app";

    let query = supabase
      .from("project_emails")
      .select("*")
      .eq("project_id", parseInt(projectId, 10))
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

    if (starred === "true") {
      query = query.eq("is_starred", true);
    }

    if (relatedTool) {
      query = query.eq("related_tool", relatedTool);
    }

    if (relatedId) {
      query = query.eq("related_id", relatedId);
    }

    if (search) {
      query = query.or(
        `subject.ilike.%${search}%,from_name.ilike.%${search}%,from_email.ilike.%${search}%,body.ilike.%${search}%`,
      );
    }

    // Non-admins see only emails they are a party to.
    if (!isAdmin) {
      const filter = buildOwnEmailsFilter({ authUserId: user.id, email: user.email });
      if (!filter) {
        return NextResponse.json([]);
      }
      query = query.or(filter);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ msg: "Error fetching emails:", error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: "Failed to fetch emails" },
        { status: 500 },
      );
    }

    return NextResponse.json(data ?? []);
    },
);

/**
 * POST /api/projects/[projectId]/emails
 * Create a new email
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/emails#POST",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const supabase = await createClient();

    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/emails#POST", message: "Authentication required." });
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (profileError) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "projects/[projectId]/emails#POST",
        message: profileError.message,
      });
    }

    if (!profile?.is_admin) {
      throw new GuardrailError({
        code: "FORBIDDEN",
        where: "projects/[projectId]/emails#POST",
        message: "Admin access required.",
        status: 403,
      });
    }

    const body = await request.json();
    const validated = createEmailSchema.parse(body);

    const { data, error } = await supabase
      .from("project_emails")
      .insert({
        ...validated,
        project_id: parseInt(projectId, 10),
        created_by: user.id,
        sent_at: validated.status === "Sent" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      logger.error({ msg: "Error creating email:", error: error instanceof Error ? error.message : String(error) });
      return apiErrorResponse(error);
    }

    return NextResponse.json(data, { status: 201 });
    },
);
