import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string; submittalId: string }>;
}

const updateSubmittalSchema = z.object({
  title: z.string().min(1).optional(),
  submittal_number: z.string().min(1).optional(),
  revision: z.number().int().min(0).optional(),
  status: z.enum(["Draft", "Open", "Distributed", "Closed"]).optional(),
  specification_section: z.string().nullable().optional(),
  submittal_type: z.string().nullable().optional(),
  submittal_type_id: z.string().uuid().nullable().optional(),
  division: z.string().nullable().optional(),
  submittal_package_id: z.string().uuid().nullable().optional(),
  responsible_contractor_id: z.string().nullable().optional(),
  received_from_id: z.string().uuid().nullable().optional(),
  submittal_manager_id: z.string().uuid().nullable().optional(),
  final_due_date: z.string().nullable().optional(),
  lead_time: z.number().int().nullable().optional(),
  required_on_site_date: z.string().nullable().optional(),
  cost_code_id: z.number().int().nullable().optional(),
  location_id: z.number().int().nullable().optional(),
  is_private: z.boolean().optional(),
  description: z.string().nullable().optional(),
  priority: z.string().nullable().optional(),
  ball_in_court: z.string().nullable().optional(),
  required_approval_date: z.string().nullable().optional(),
  submission_date: z.string().nullable().optional(),
});

/**
 * GET /api/projects/[projectId]/submittals/[submittalId]
 * Returns a single submittal with all related data.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, submittalId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("submittals")
      .select(
        `*,
         submittal_type:submittal_types(id, name),
         submittal_package:submittal_packages(id, name),
         submittal_workflow_steps(
           id,
           step_order,
           step_type,
           submittal_responses(
             id,
             responder_id,
             response_status,
             comments,
             responded_at
           )
         ),
         submittal_distributions(
           id,
           from_id,
           message,
           distributed_at,
           submittal_distribution_recipients(id, recipient_id)
         ),
         submittal_attachments(
           id,
           file_name,
           file_url,
           file_size,
           content_type,
           is_current,
           uploaded_by,
           created_at
         ),
         submittal_linked_drawings(
           id,
           drawing_id
         ),
         submittal_history(
           id,
           action,
           actor_id,
           new_status,
           changes,
           occurred_at
         )`,
      )
      .eq("project_id", parseInt(projectId, 10))
      .eq("id", submittalId)
      .maybeSingle();

    if (error) {
      return apiErrorResponse(error);
    }

    if (!data) {
      return NextResponse.json({ error: "Submittal not found" }, { status: 404 });
    }

    // Resolve responsible_contractor name via secondary lookup (no FK exists)
    let responsible_contractor: { id: string; name: string } | null = null;
    if (data.responsible_contractor_id) {
      const { data: company } = await supabase
        .from("companies")
        .select("id, name")
        .eq("id", String(data.responsible_contractor_id))
        .single();
      if (company) {
        responsible_contractor = company;
      }
    }

    return NextResponse.json({ ...data, responsible_contractor });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * PUT /api/projects/[projectId]/submittals/[submittalId]
 * Updates a submittal.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, submittalId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validatedData = updateSubmittalSchema.parse(body);

    const { data, error } = await supabase
      .from("submittals")
      .update({
        ...validatedData,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", parseInt(projectId, 10))
      .eq("id", submittalId)
      .select(
        `*,
         submittal_type:submittal_types(id, name),
         submittal_package:submittal_packages(id, name)`,
      )
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }
    return apiErrorResponse(error);
  }
}

/**
 * DELETE /api/projects/[projectId]/submittals/[submittalId]
 * Soft-deletes a submittal (moves to Recycle Bin).
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, submittalId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("submittals")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("project_id", parseInt(projectId, 10))
      .eq("id", submittalId);

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
