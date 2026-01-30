import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Zod schema for budget line PATCH updates
// All fields optional since PATCH allows partial updates
// OWASP: Input validation to prevent injection and data integrity issues (A03:2021 - Injection)
const budgetLinePatchSchema = z
  .object({
    quantity: z
      .union([z.number(), z.string()])
      .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
      .refine((val) => !Number.isNaN(val), "quantity must be a valid number")
      .optional(),
    unit_cost: z
      .union([z.number(), z.string()])
      .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
      .refine((val) => !Number.isNaN(val), "unit_cost must be a valid number")
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, "Description must be at most 1000 characters")
      .optional(),
    original_amount: z
      .union([z.number(), z.string()])
      .transform((val) => (typeof val === "string" ? parseFloat(val) : val))
      .refine(
        (val) => !Number.isNaN(val),
        "original_amount must be a valid number",
      )
      .optional(),
  })
  .refine(
    (data) =>
      data.quantity !== undefined ||
      data.unit_cost !== undefined ||
      data.description !== undefined ||
      data.original_amount !== undefined,
    {
      message:
        "At least one field (quantity, unit_cost, description, original_amount) must be provided",
    },
  );

// GET /api/projects/[id]/budget/lines/[lineId] - Fetch a single budget line item
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; lineId: string }> },
) {
  try {
    const { projectId, lineId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Get current user for authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - please log in" },
        { status: 401 },
      );
    }

    // TODO: Add project membership validation when project_team_members table exists
    // For now, all authenticated users can view (will be restricted by RLS on budget_lines)

    // Fetch the budget line with related data
    const { data: budgetLine, error: lineError } = await supabase
      .from("budget_lines")
      .select(
        `
        id,
        project_id,
        cost_code_id,
        cost_type_id,
        project_budget_code_id,
        description,
        quantity,
        unit_cost,
        unit_of_measure,
        original_amount,
        forecasting_enabled,
        default_ftc_method,
        sub_job_id,
        sub_job_key,
        created_at,
        created_by,
        updated_at,
        updated_by,
        cost_codes(
          id,
          title,
          division_id,
          division_title
        ),
        cost_code_types(
          id,
          name,
          category
        )
      `,
      )
      .eq("id", lineId)
      .single();

    if (lineError) {
      if (lineError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Budget line item not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch budget line", details: lineError.message },
        { status: 500 },
      );
    }

    // Verify the budget line belongs to the specified project
    if (budgetLine.project_id !== projectIdNum) {
      return NextResponse.json(
        { error: "Budget line does not belong to this project" },
        { status: 403 },
      );
    }

    // Return the budget line with enriched data
    return NextResponse.json({
      id: budgetLine.id,
      project_id: budgetLine.project_id,
      cost_code_id: budgetLine.cost_code_id,
      cost_type_id: budgetLine.cost_type_id,
      project_budget_code_id: budgetLine.project_budget_code_id,
      description: budgetLine.description,
      quantity: budgetLine.quantity,
      unit_cost: budgetLine.unit_cost,
      unit_of_measure: budgetLine.unit_of_measure,
      original_amount: budgetLine.original_amount,
      forecasting_enabled: budgetLine.forecasting_enabled,
      default_ftc_method: budgetLine.default_ftc_method,
      sub_job_id: budgetLine.sub_job_id,
      sub_job_key: budgetLine.sub_job_key,
      created_at: budgetLine.created_at,
      created_by: budgetLine.created_by,
      updated_at: budgetLine.updated_at,
      updated_by: budgetLine.updated_by,
      // Related data
      cost_code: budgetLine.cost_codes,
      cost_type: budgetLine.cost_code_types,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch budget line";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// PATCH /api/projects/[id]/budget/lines/[lineId] - Update a budget line item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; lineId: string }> },
) {
  try {
    const { projectId, lineId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - please log in" },
        { status: 401 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = budgetLinePatchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { quantity, unit_cost, description, original_amount } =
      validation.data;

    // TODO: Add project membership validation when project_team_members table exists
    // For now, all authenticated users can edit (will be restricted by RLS on budget_lines)

    // Check if budget is locked
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("budget_locked")
      .eq("id", projectIdNum)
      .single();

    if (projectError) {
      return NextResponse.json(
        { error: "Failed to verify project status" },
        { status: 500 },
      );
    }

    if (project.budget_locked) {
      return NextResponse.json(
        { error: "Budget is locked and cannot be edited" },
        { status: 403 },
      );
    }

    // Verify the budget line exists and belongs to this project
    const { data: existingLine, error: lineError } = await supabase
      .from("budget_lines")
      .select(
        "id, project_id, quantity, unit_cost, description, original_amount",
      )
      .eq("id", lineId)
      .single();

    if (lineError || !existingLine) {
      return NextResponse.json(
        { error: "Budget line item not found" },
        { status: 404 },
      );
    }

    if (existingLine.project_id !== projectIdNum) {
      return NextResponse.json(
        { error: "Budget line does not belong to this project" },
        { status: 403 },
      );
    }

    // Build update object
    const updateData: {
      quantity?: number;
      unit_cost?: number;
      description?: string;
      original_amount?: number;
      updated_by: string;
      updated_at: string;
    } = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (quantity !== undefined) {
      updateData.quantity = quantity;
    }

    if (unit_cost !== undefined) {
      updateData.unit_cost = unit_cost;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    // Handle original_amount:
    // If original_amount is explicitly provided, use it directly (manual mode)
    // Otherwise, recalculate from quantity * unit_cost if either changed
    if (original_amount !== undefined) {
      updateData.original_amount = original_amount;
    } else if (quantity !== undefined || unit_cost !== undefined) {
      // Recalculate original_amount if quantity or unit_cost changed
      const newQuantity =
        quantity !== undefined ? quantity : existingLine.quantity;
      const newUnitCost =
        unit_cost !== undefined ? unit_cost : existingLine.unit_cost;

      if (newQuantity !== null && newUnitCost !== null) {
        updateData.original_amount = newQuantity * newUnitCost;
      }
    }

    // Update the budget line
    // The trigger will automatically create history entries
    const { data: updatedLine, error: updateError } = await supabase
      .from("budget_lines")
      .update(updateData)
      .eq("id", lineId)
      .select(
        `
        id,
        quantity,
        unit_cost,
        description,
        original_amount,
        updated_at,
        updated_by
      `,
      )
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update budget line", details: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      lineItem: {
        id: updatedLine.id,
        quantity: updatedLine.quantity,
        unit_cost: updatedLine.unit_cost,
        description: updatedLine.description,
        amount: updatedLine.original_amount,
        updated_at: updatedLine.updated_at,
        updated_by: updatedLine.updated_by,
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update budget line";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/budget/lines/[lineId] - Delete a budget line item
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; lineId: string }> },
) {
  try {
    const { projectId, lineId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - please log in" },
        { status: 401 },
      );
    }

    // Check if budget is locked
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("budget_locked")
      .eq("id", projectIdNum)
      .single();

    if (projectError) {
      return NextResponse.json(
        { error: "Failed to verify project status" },
        { status: 500 },
      );
    }

    if (project.budget_locked) {
      return NextResponse.json(
        { error: "Budget is locked and cannot be deleted" },
        { status: 403 },
      );
    }

    // Verify the budget line exists and belongs to this project
    const { data: existingLine, error: lineError } = await supabase
      .from("budget_lines")
      .select("id, project_id")
      .eq("id", lineId)
      .single();

    if (lineError || !existingLine) {
      return NextResponse.json(
        { error: "Budget line item not found" },
        { status: 404 },
      );
    }

    if (existingLine.project_id !== projectIdNum) {
      return NextResponse.json(
        { error: "Budget line does not belong to this project" },
        { status: 403 },
      );
    }

    // Delete the budget line
    const { error: deleteError } = await supabase
      .from("budget_lines")
      .delete()
      .eq("id", lineId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete budget line", details: deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Budget line deleted successfully",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete budget line";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
