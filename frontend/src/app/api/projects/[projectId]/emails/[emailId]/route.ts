import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

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
export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { projectId, emailId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * PUT /api/projects/[projectId]/emails/[emailId]
 * Update an email
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { projectId, emailId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }
    return apiErrorResponse(error);
  }
}

/**
 * DELETE /api/projects/[projectId]/emails/[emailId]
 * Soft-delete an email (sets deleted_at)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { projectId, emailId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch (error) {
    return apiErrorResponse(error);
  }
}
