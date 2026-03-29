import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string; transmittalId: string }>;
}

const updateTransmittalSchema = z.object({
  number: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  status: z.enum(["Draft", "Open", "Closed", "Void"]).optional(),
  to_company: z.string().nullable().optional(),
  to_contact: z.string().nullable().optional(),
  from_company: z.string().nullable().optional(),
  from_contact: z.string().nullable().optional(),
  sent_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  received_date: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  delivery_method: z
    .enum(["Email", "Hand Delivery", "Mail", "Courier", "Fax", "Other"])
    .optional(),
  copies_sent: z.number().int().nullable().optional(),
  is_private: z.boolean().optional(),
  ball_in_court: z.string().nullable().optional(),
});

/**
 * GET /api/projects/[projectId]/transmittals/[transmittalId]
 * Returns a single transmittal.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, transmittalId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("project_transmittals")
      .select("*")
      .eq("project_id", parseInt(projectId, 10))
      .eq("id", parseInt(transmittalId, 10))
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    if (!data) {
      return NextResponse.json(
        { error: "Transmittal not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * PUT /api/projects/[projectId]/transmittals/[transmittalId]
 * Updates a transmittal.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, transmittalId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validatedData = updateTransmittalSchema.parse(body);

    const { data, error } = await supabase
      .from("project_transmittals")
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", parseInt(projectId, 10))
      .eq("id", parseInt(transmittalId, 10))
      .select("*")
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
 * DELETE /api/projects/[projectId]/transmittals/[transmittalId]
 * Soft-deletes a transmittal (moves to Recycle Bin).
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, transmittalId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("project_transmittals")
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq("project_id", parseInt(projectId, 10))
      .eq("id", parseInt(transmittalId, 10));

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
