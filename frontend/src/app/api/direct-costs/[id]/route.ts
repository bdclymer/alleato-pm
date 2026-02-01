import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { DirectCostUpdateSchema } from "@/lib/schemas/direct-costs";
import { ZodError } from "zod";

/**
 * GET /api/direct-costs/[id]
 * Fetch a single direct cost with related data
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("direct_costs")
      .select(
        `
        *,
        vendor:vendors!vendor_id(id, name),
        employee:people!employee_id(id, first_name, last_name),
        line_items:direct_cost_line_items(
          *,
          budget_code:budget_lines!budget_code_id(code, description)
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Direct cost not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
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
 * PATCH /api/direct-costs/[id]
 * Update a direct cost (partial update)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if direct cost exists
    const { data: existing, error: fetchError } = await supabase
      .from("direct_costs")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Direct cost not found" },
        { status: 404 },
      );
    }

    // Validate update data (partial)
    const updateData: Record<string, unknown> = {};

    // Only validate and include provided fields
    if (body.description !== undefined) updateData.description = body.description;
    if (body.cost_type !== undefined) updateData.cost_type = body.cost_type;
    if (body.vendor_id !== undefined) updateData.vendor_id = body.vendor_id;
    if (body.employee_id !== undefined) updateData.employee_id = body.employee_id;
    if (body.date !== undefined) updateData.date = body.date;
    if (body.invoice_number !== undefined) updateData.invoice_number = body.invoice_number;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.terms !== undefined) updateData.terms = body.terms;
    if (body.received_date !== undefined) updateData.received_date = body.received_date;
    if (body.paid_date !== undefined) updateData.paid_date = body.paid_date;

    // Always update timestamp and user
    updateData.updated_at = new Date().toISOString();
    updateData.updated_by_user_id = user.id;

    // Update direct cost
    const { data, error } = await supabase
      .from("direct_costs")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        vendor:vendors!vendor_id(id, name),
        employee:people!employee_id(id, first_name, last_name),
        line_items:direct_cost_line_items(
          *,
          budget_code:budget_lines!budget_code_id(code, description)
        )
      `,
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.issues },
        { status: 400 },
      );
    }

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
 * DELETE /api/direct-costs/[id]
 * Delete a direct cost (soft delete via is_deleted flag)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if direct cost exists
    const { data: existing, error: fetchError } = await supabase
      .from("direct_costs")
      .select("id, is_deleted")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Direct cost not found" },
        { status: 404 },
      );
    }

    if (existing.is_deleted) {
      return NextResponse.json(
        { error: "Direct cost already deleted" },
        { status: 400 },
      );
    }

    // Soft delete by setting is_deleted flag
    const { error } = await supabase
      .from("direct_costs")
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
        updated_by_user_id: user.id,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: "Direct cost deleted successfully",
      id,
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
