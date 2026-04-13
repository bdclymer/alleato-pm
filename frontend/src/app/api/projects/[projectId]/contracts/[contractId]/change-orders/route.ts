import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";
import { NextResponse } from "next/server";
import { createChangeOrderSchema } from "./validation";
import { ZodError } from "zod";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: Promise<{ projectId: string; contractId: string }>;
}

/**
 * GET /api/projects/[id]/contracts/[contractId]/change-orders
 * Returns all change orders for a specific contract
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/contracts/[contractId]/change-orders#GET",
  async ({ request, params }) => {
  
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
    },
);

/**
 * POST /api/projects/[id]/contracts/[contractId]/change-orders
 * Creates a new change order for a contract
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/contracts/[contractId]/change-orders#POST",
  async ({ request, params }) => {
  
    const { projectId, contractId } = await params;
    const projectIdNum = parseInt(projectId, 10);
    const guard = await requirePermission(projectIdNum, "contracts", "write");
    if (guard.denied) return guard.response;

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
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/contracts/[contractId]/change-orders#POST", message: "Authentication required." });
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
    },
);
