/**
 * @deprecated Use the canonical route at /api/commitments/[commitmentId]/change-orders/[changeOrderId] instead.
 * This route is kept for backward compatibility with existing integrations.
 */
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { updateChangeOrderSchema } from "../validation";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ projectId: string; contractId: string; changeOrderId: string }>;
}

/**
 * GET /api/projects/[id]/contracts/[contractId]/change-orders/[changeOrderId]
 * Returns a single change order by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId, changeOrderId } = await params;
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
      .from("contract_change_orders")
      .select("*")
      .eq("id", changeOrderId)
      .eq("contract_id", contractId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Change order not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch change order", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * PUT /api/projects/[id]/contracts/[contractId]/change-orders/[changeOrderId]
 * Updates a change order
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId, changeOrderId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Validate request body
    const validatedData = updateChangeOrderSchema.parse(body);

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Check if change order exists and belongs to this contract
    const { data: existingChangeOrder } = await supabase
      .from("contract_change_orders")
      .select("id, change_order_number")
      .eq("id", changeOrderId)
      .eq("contract_id", contractId)
      .single();

    if (!existingChangeOrder) {
      return NextResponse.json(
        { error: "Change order not found" },
        { status: 404 },
      );
    }

    // If updating change_order_number, check for uniqueness
    if (
      validatedData.change_order_number &&
      validatedData.change_order_number !==
        existingChangeOrder.change_order_number
    ) {
      const { data: duplicateChangeOrder } = await supabase
        .from("contract_change_orders")
        .select("id")
        .eq("contract_id", contractId)
        .eq("change_order_number", validatedData.change_order_number)
        .neq("id", changeOrderId)
        .single();

      if (duplicateChangeOrder) {
        return NextResponse.json(
          { error: "Change order number already exists for this contract" },
          { status: 400 },
        );
      }
    }

    // Update the change order
    const { data, error } = await supabase
      .from("contract_change_orders")
      .update(validatedData)
      .eq("id", changeOrderId)
      .eq("contract_id", contractId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update change order", details: error.message },
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

    return apiErrorResponse(error);
  }
}

/**
 * DELETE /api/projects/[id]/contracts/[contractId]/change-orders/[changeOrderId]
 * Deletes a change order
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId, changeOrderId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Check if change order exists before deleting
    const { data: existingChangeOrder } = await supabase
      .from("contract_change_orders")
      .select("id")
      .eq("id", changeOrderId)
      .eq("contract_id", contractId)
      .single();

    if (!existingChangeOrder) {
      return NextResponse.json(
        { error: "Change order not found" },
        { status: 404 },
      );
    }

    // Delete the change order
    const { error } = await supabase
      .from("contract_change_orders")
      .delete()
      .eq("id", changeOrderId)
      .eq("contract_id", contractId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete change order", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Change order deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
