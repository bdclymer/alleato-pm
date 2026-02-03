import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

// Zod schema for change order update
const updateChangeOrderSchema = z.object({
  change_order_number: z
    .string()
    .trim()
    .min(1, "Change order number is required")
    .max(100)
    .optional(),
  description: z.string().trim().max(2000).optional(),
  amount: z.coerce.number().optional(),
  status: z
    .enum(["draft", "pending", "approved", "executed", "void"])
    .optional(),
  requested_date: z.string().optional().nullable(),
  requested_by: z.string().uuid().optional().nullable(),
});

/**
 * GET /api/commitments/[id]/change-orders/[changeOrderId]
 * Get a specific change order for a commitment
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; changeOrderId: string }> },
) {
  try {
    const { id, changeOrderId } = await params;
    const supabase = await createClient();

    const { data: changeOrder, error } = await supabase
      .from("contract_change_orders")
      .select("*")
      .eq("id", changeOrderId)
      .eq("contract_id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Change order not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: changeOrder });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Internal server error", message: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/commitments/[id]/change-orders/[changeOrderId]
 * Update a change order
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; changeOrderId: string }> },
) {
  try {
    const { id, changeOrderId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate request body
    const validation = updateChangeOrderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const validated = validation.data;

    // Verify the change order exists and belongs to this commitment
    const { data: existingCO, error: fetchError } = await supabase
      .from("contract_change_orders")
      .select("id, status")
      .eq("id", changeOrderId)
      .eq("contract_id", id)
      .single();

    if (fetchError || !existingCO) {
      return NextResponse.json(
        { error: "Change order not found" },
        { status: 404 },
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      ...validated,
      updated_at: new Date().toISOString(),
    };

    // If status is changing to approved, set approved_date and approved_by
    if (
      validated.status === "approved" &&
      existingCO.status !== "approved"
    ) {
      updateData.approved_date = new Date().toISOString();
      updateData.approved_by = user.id;
    }

    // Update the change order
    const { data: updatedCO, error: updateError } = await supabase
      .from("contract_change_orders")
      .update(updateData)
      .eq("id", changeOrderId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ data: updatedCO });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Internal server error", message: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/commitments/[id]/change-orders/[changeOrderId]
 * Delete a change order
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; changeOrderId: string }> },
) {
  try {
    const { id, changeOrderId } = await params;
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the change order exists and belongs to this commitment
    const { data: existingCO, error: fetchError } = await supabase
      .from("contract_change_orders")
      .select("id, status")
      .eq("id", changeOrderId)
      .eq("contract_id", id)
      .single();

    if (fetchError || !existingCO) {
      return NextResponse.json(
        { error: "Change order not found" },
        { status: 404 },
      );
    }

    // Only allow deletion of draft change orders
    if (existingCO.status !== "draft") {
      return NextResponse.json(
        {
          error: "Cannot delete change order",
          message:
            "Only draft change orders can be deleted. Change the status to draft first.",
        },
        { status: 400 },
      );
    }

    // Delete the change order
    const { error: deleteError } = await supabase
      .from("contract_change_orders")
      .delete()
      .eq("id", changeOrderId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Change order deleted successfully",
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Internal server error", message: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
