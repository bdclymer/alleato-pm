import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { updateLineItemSchema } from "../validation";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ projectId: string; contractId: string; lineItemId: string }>;
}

/**
 * GET /api/projects/[id]/contracts/[contractId]/line-items/[lineItemId]
 * Returns a single line item by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId, lineItemId } = await params;
    const supabase = await createClient();

    // Verify contract exists and belongs to project
    const { data: contract } = await supabase
      .from("prime_contracts")
      .select("id")
      .eq("id", contractId)
      .eq("project_id", parseInt(projectId, 10))
      .single();

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 },
      );
    }

    const { data, error } = await supabase
      .from("contract_line_items")
      .select("*")
      .eq("id", lineItemId)
      .eq("contract_id", contractId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Line item not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch line item", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/projects/[id]/contracts/[contractId]/line-items/[lineItemId]
 * Updates a line item
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId, lineItemId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Validate request body
    const validatedData = updateLineItemSchema.parse(body);

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
            "Forbidden: You do not have permission to update line items for this project",
        },
        { status: 403 },
      );
    }

    // Verify contract exists and belongs to project
    const { data: contract } = await supabase
      .from("prime_contracts")
      .select("id")
      .eq("id", contractId)
      .eq("project_id", parseInt(projectId, 10))
      .single();

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 },
      );
    }

    // Check if line item exists and belongs to this contract
    const { data: existingLineItem } = await supabase
      .from("contract_line_items")
      .select("id, line_number")
      .eq("id", lineItemId)
      .eq("contract_id", contractId)
      .single();

    if (!existingLineItem) {
      return NextResponse.json(
        { error: "Line item not found" },
        { status: 404 },
      );
    }

    // If updating line_number, check for uniqueness
    if (
      validatedData.line_number &&
      validatedData.line_number !== existingLineItem.line_number
    ) {
      const { data: duplicateLineItem } = await supabase
        .from("contract_line_items")
        .select("id")
        .eq("contract_id", contractId)
        .eq("line_number", validatedData.line_number)
        .neq("id", lineItemId)
        .single();

      if (duplicateLineItem) {
        return NextResponse.json(
          { error: "Line number already exists for this contract" },
          { status: 400 },
        );
      }
    }

    // Update the line item
    const { data, error } = await supabase
      .from("contract_line_items")
      .update(validatedData)
      .eq("id", lineItemId)
      .eq("contract_id", contractId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update line item", details: error.message },
        { status: 400 },
      );
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

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/projects/[id]/contracts/[contractId]/line-items/[lineItemId]
 * Deletes a line item
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId, lineItemId } = await params;
    const supabase = await createClient();

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
            "Forbidden: You do not have permission to delete line items for this project",
        },
        { status: 403 },
      );
    }

    // Verify contract exists and belongs to project
    const { data: contract } = await supabase
      .from("prime_contracts")
      .select("id")
      .eq("id", contractId)
      .eq("project_id", parseInt(projectId, 10))
      .single();

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 },
      );
    }

    // Check if line item exists before deleting
    const { data: existingLineItem } = await supabase
      .from("contract_line_items")
      .select("id")
      .eq("id", lineItemId)
      .eq("contract_id", contractId)
      .single();

    if (!existingLineItem) {
      return NextResponse.json(
        { error: "Line item not found" },
        { status: 404 },
      );
    }

    // Delete the line item
    const { error } = await supabase
      .from("contract_line_items")
      .delete()
      .eq("id", lineItemId)
      .eq("contract_id", contractId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete line item", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Line item deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
