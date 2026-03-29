import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

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
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const starred = searchParams.get("starred");

    let query = supabase
      .from("project_emails")
      .select("*")
      .eq("project_id", parseInt(projectId, 10))
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (starred === "true") {
      query = query.eq("is_starred", true);
    }

    if (search) {
      query = query.or(
        `subject.ilike.%${search}%,from_name.ilike.%${search}%,from_email.ilike.%${search}%,body.ilike.%${search}%`,
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching emails:", error);
      return NextResponse.json(
        { error: "Failed to fetch emails" },
        { status: 500 },
      );
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * POST /api/projects/[projectId]/emails
 * Create a new email
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      console.error("Error creating email:", error);
      return apiErrorResponse(error);
    }

    return NextResponse.json(data, { status: 201 });
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
