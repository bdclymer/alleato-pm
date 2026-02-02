/**
 * RFI API Route (Single Resource)
 *
 * GET /api/rfis/[rfiId] - Get single RFI
 * PATCH /api/rfis/[rfiId] - Update RFI
 * DELETE /api/rfis/[rfiId] - Delete RFI
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { rfiEditSchema } from "@/lib/schemas/rfi-schema";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ rfiId: string }>;
};

/**
 * GET /api/rfis/[rfiId]
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { rfiId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("rfis")
      .select("*")
      .eq("id", rfiId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "RFI not found" }, { status: 404 });
      }
      console.error("RFI get error:", error);
      return apiErrorResponse(error);
    }

    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * PATCH /api/rfis/[rfiId]
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { rfiId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate update data
    const result = rfiEditSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation error", issues: result.error.flatten() },
        { status: 400 },
      );
    }

    // Build update object from validated fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const validatedData = result.data;
    if (validatedData.subject !== undefined)
      updateData.subject = validatedData.subject;
    if (validatedData.question !== undefined)
      updateData.question = validatedData.question;
    if (validatedData.due_date !== undefined)
      updateData.due_date = validatedData.due_date;
    if (validatedData.assignees !== undefined)
      updateData.assignees = validatedData.assignees;
    if (validatedData.rfi_manager !== undefined)
      updateData.rfi_manager = validatedData.rfi_manager;
    if (validatedData.received_from !== undefined)
      updateData.received_from = validatedData.received_from;
    if (validatedData.responsible_contractor !== undefined)
      updateData.responsible_contractor = validatedData.responsible_contractor;
    if (validatedData.distribution_list !== undefined)
      updateData.distribution_list = validatedData.distribution_list;
    if (validatedData.location !== undefined)
      updateData.location = validatedData.location;
    if (validatedData.specification !== undefined)
      updateData.specification = validatedData.specification;
    if (validatedData.cost_code !== undefined)
      updateData.cost_code = validatedData.cost_code;
    if (validatedData.schedule_impact !== undefined)
      updateData.schedule_impact = validatedData.schedule_impact;
    if (validatedData.cost_impact !== undefined)
      updateData.cost_impact = validatedData.cost_impact;
    if (validatedData.reference !== undefined)
      updateData.reference = validatedData.reference;
    if (validatedData.is_private !== undefined)
      updateData.is_private = validatedData.is_private;
    if (validatedData.rfi_stage !== undefined)
      updateData.rfi_stage = validatedData.rfi_stage;

    // Handle status changes from body (not in base schema)
    if (body.status !== undefined) {
      updateData.status = body.status;

      // Clear ball_in_court on close
      if (body.status === "closed") {
        updateData.closed_date = new Date().toISOString().split("T")[0];
        updateData.ball_in_court = null;
      }
    }

    const { data, error } = await supabase
      .from("rfis")
      .update(updateData)
      .eq("id", rfiId)
      .select()
      .single();

    if (error) {
      console.error("RFI update error:", error);
      return apiErrorResponse(error);
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.issues },
        { status: 400 },
      );
    }
    return apiErrorResponse(error);
  }
}

/**
 * DELETE /api/rfis/[rfiId]
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { rfiId } = await params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase.from("rfis").delete().eq("id", rfiId);

    if (error) {
      console.error("RFI delete error:", error);
      return apiErrorResponse(error);
    }

    return NextResponse.json({ message: "RFI deleted successfully", id: rfiId });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
