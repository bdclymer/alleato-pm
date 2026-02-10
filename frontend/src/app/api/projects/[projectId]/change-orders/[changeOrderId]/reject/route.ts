import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { z, ZodError } from "zod";

interface RouteParams {
  params: Promise<{ projectId: string; changeOrderId: string }>;
}

const rejectChangeOrderSchema = z.object({
  rejection_reason: z.string().min(1).max(1000),
});

/**
 * POST /api/projects/[projectId]/change-orders/[changeOrderId]/reject
 * Rejects a change order with a required reason
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, changeOrderId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Validate request body
    const validatedData = rejectChangeOrderSchema.parse(body);

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up person_id from auth user
    const { data: authLink } = await supabase
      .from("users_auth")
      .select("person_id")
      .eq("auth_user_id", user.id)
      .single();

    const { data: membership } = await supabase
      .from("project_directory_memberships")
      .select("role, status")
      .eq("project_id", parseInt(projectId, 10))
      .eq("person_id", authLink?.person_id ?? "")
      .single();

    if (!membership || membership.status !== "active") {
      return NextResponse.json(
        {
          error:
            "Forbidden: You do not have permission to reject change orders for this project",
        },
        { status: 403 },
      );
    }

    // Get the change order
    const { data: changeOrder, error: fetchError } = await supabase
      .from("change_orders")
      .select("id, status, project_id")
      .eq("id", Number(changeOrderId))
      .eq("project_id", Number(projectId))
      .single();

    if (fetchError || !changeOrder) {
      return NextResponse.json(
        { error: "Change order not found" },
        { status: 404 },
      );
    }

    // Check if already rejected
    if (changeOrder.status === "rejected") {
      return NextResponse.json(
        { error: "Change order is already rejected" },
        { status: 400 },
      );
    }

    // Update change order to rejected status
    const now = new Date().toISOString();
    const { data: updatedChangeOrder, error: updateError } = await supabase
      .from("change_orders")
      .update({
        status: "rejected",
        approved_by: user.id, // Note: approved_by is used for both approve and reject (the reviewer)
        approved_at: now,
        rejection_reason: validatedData.rejection_reason,
        updated_at: now,
      })
      .eq("id", Number(changeOrderId))
      .eq("project_id", Number(projectId))
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        {
          error: "Failed to reject change order",
          details: updateError.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(updatedChangeOrder);
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
