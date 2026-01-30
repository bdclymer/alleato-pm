import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createChangeOrderSchema } from "./validation";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ projectId: string; contractId: string }>;
}

/**
 * GET /api/projects/[id]/contracts/[contractId]/change-orders
 * Returns all change orders for a specific contract
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId } = await params;
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

    // Get all change orders for this contract
    const { data, error } = await supabase
      .from("contract_change_orders")
      .select("*")
      .eq("contract_id", contractId)
      .order("change_order_number", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch change orders", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/projects/[id]/contracts/[contractId]/change-orders
 * Creates a new change order for a contract
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Validate request body
    const validatedData = createChangeOrderSchema.parse({
      ...body,
      contract_id: contractId,
    });

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
            "Forbidden: You do not have permission to create change orders for this project",
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

    // Check for unique change_order_number within contract
    const { data: existingChangeOrder } = await supabase
      .from("contract_change_orders")
      .select("id")
      .eq("contract_id", contractId)
      .eq("change_order_number", validatedData.change_order_number)
      .single();

    if (existingChangeOrder) {
      return NextResponse.json(
        { error: "Change order number already exists for this contract" },
        { status: 400 },
      );
    }

    // Create the change order with requested_by set to current user
    const { data, error } = await supabase
      .from("contract_change_orders")
      .insert({
        ...validatedData,
        requested_by: user.id,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create change order", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(data, { status: 201 });
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
