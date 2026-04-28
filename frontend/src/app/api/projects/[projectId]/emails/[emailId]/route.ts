import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string; emailId: string }>;
}

const updateEmailSchema = z.object({
  subject: z.string().min(1).max(500).optional(),
  body: z.string().optional().nullable(),
  body_html: z.string().optional().nullable(),
  from_name: z.string().optional().nullable(),
  from_email: z.string().email("Invalid email address").optional().nullable(),
  to_list: z.array(z.string()).optional().nullable(),
  cc_list: z.array(z.string()).optional().nullable(),
  bcc_list: z.array(z.string()).optional().nullable(),
  status: z.enum(["Draft", "Sent", "Received", "Failed"]).optional(),
  is_private: z.boolean().optional(),
  is_starred: z.boolean().optional(),
  has_attachments: z.boolean().optional(),
  related_tool: z.string().optional().nullable(),
  related_id: z.string().optional().nullable(),
  distribution_group: z.string().optional().nullable(),
  thread_id: z.string().optional().nullable(),
});

/**
 * GET /api/projects/[projectId]/emails/[emailId]
 * Fetch a single email by ID
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/emails/[emailId]#GET",
  async ({ request, params }) => {
  
    const { projectId, emailId } = await params;
    const supabase = await createClient();

    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/emails/[emailId]#GET", message: "Authentication required." });
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (profileError) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "projects/[projectId]/emails/[emailId]#GET",
        message: profileError.message,
      });
    }

    if (!profile?.is_admin) {
      throw new GuardrailError({
        code: "FORBIDDEN",
        where: "projects/[projectId]/emails/[emailId]#GET",
        message: "Admin access required.",
        status: 403,
      });
    }

    const { data, error } = await supabase
      .from("project_emails")
      .select("*")
      .eq("id", parseInt(emailId, 10))
      .eq("project_id", parseInt(projectId, 10))
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Email not found" }, { status: 404 });
      }
      return apiErrorResponse(error);
    }

    return NextResponse.json(data);
    },
);

/**
 * PUT /api/projects/[projectId]/emails/[emailId]
 * Update an email
 */
export const PUT = withApiGuardrails(
  "projects/[projectId]/emails/[emailId]#PUT",
  async ({ request, params }) => {
  
    const { projectId, emailId } = await params;
    const supabase = await createClient();

    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/emails/[emailId]#PUT", message: "Authentication required." });
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (profileError) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "projects/[projectId]/emails/[emailId]#PUT",
        message: profileError.message,
      });
    }

    if (!profile?.is_admin) {
      throw new GuardrailError({
        code: "FORBIDDEN",
        where: "projects/[projectId]/emails/[emailId]#PUT",
        message: "Admin access required.",
        status: 403,
      });
    }

    const body = await request.json();
    const validated = updateEmailSchema.parse(body);

    const updateData: Record<string, unknown> = {
      ...validated,
      updated_at: new Date().toISOString(),
    };

    // If status is changing to Sent, set sent_at
    if (validated.status === "Sent") {
      updateData.sent_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("project_emails")
      .update(updateData)
      .eq("id", parseInt(emailId, 10))
      .eq("project_id", parseInt(projectId, 10))
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Email not found" }, { status: 404 });
      }
      return apiErrorResponse(error);
    }

    return NextResponse.json(data);
    },
);

/**
 * DELETE /api/projects/[projectId]/emails/[emailId]
 * Soft-delete an email (sets deleted_at)
 */
export const DELETE = withApiGuardrails(
  "projects/[projectId]/emails/[emailId]#DELETE",
  async ({ request, params }) => {
  
    const { projectId, emailId } = await params;
    const supabase = await createClient();

    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/emails/[emailId]#DELETE", message: "Authentication required." });
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (profileError) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "projects/[projectId]/emails/[emailId]#DELETE",
        message: profileError.message,
      });
    }

    if (!profile?.is_admin) {
      throw new GuardrailError({
        code: "FORBIDDEN",
        where: "projects/[projectId]/emails/[emailId]#DELETE",
        message: "Admin access required.",
        status: 403,
      });
    }

    const { data, error } = await supabase
      .from("project_emails")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", parseInt(emailId, 10))
      .eq("project_id", parseInt(projectId, 10))
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Email not found" }, { status: 404 });
      }
      return apiErrorResponse(error);
    }

    return NextResponse.json({ message: "Email deleted", id: data.id });
    },
);
