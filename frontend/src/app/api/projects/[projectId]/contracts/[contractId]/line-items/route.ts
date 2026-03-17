import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createLineItemSchema } from "./validation";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ projectId: string; contractId: string }>;
}

/**
 * GET /api/projects/[id]/contracts/[contractId]/line-items
 * Returns all line items for a specific contract
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

    // Get all line items for this contract
    const { data, error } = await supabase
      .from("contract_line_items")
      .select("*")
      .eq("contract_id", contractId)
      .order("line_number", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch line items", details: error.message },
        { status: 400 },
      );
    }

    const lineItems = data || [];
    const costCodeIds = Array.from(
      new Set(
        lineItems
          .map((item) => item.cost_code_id)
          .filter((id): id is number => id != null),
      ),
    );

    // cost_codes table uses string id (the cost code like "01-100") and title (not name)
    // contract_line_items.cost_code_id is numeric — cast for comparison
    const costCodesById = new Map<number, { id: number; code: string; name: string }>();
    if (costCodeIds.length > 0) {
      const { data: costCodes, error: costCodesError } = await supabase
        .from("cost_codes")
        .select("id, title");

      if (!costCodesError && costCodes) {
        // Build map: integer cost_code_id → { id, code, name }
        // cost_codes.id is the code string; we need to match against numeric IDs
        // Try direct match first, then try matching code strings
        for (const costCode of costCodes) {
          // The id may be numeric (stored as string) matching contract_line_items.cost_code_id
          const numericId = Number(costCode.id);
          if (!Number.isNaN(numericId) && costCodeIds.includes(numericId)) {
            costCodesById.set(numericId, {
              id: numericId,
              code: costCode.id,
              name: costCode.title || "",
            });
          }
        }
      }

      // If direct numeric match didn't work, try loading from project_cost_codes
      // which bridges budget code UUIDs to cost_code string IDs
      if (costCodesById.size === 0) {
        const { data: projectCostCodes } = await supabase
          .from("project_cost_codes")
          .select("id, cost_code_id, cost_codes(id, title)")
          .eq("project_id", parseInt(projectId, 10));

        if (projectCostCodes) {
          for (const pcc of projectCostCodes) {
            const costCodeData = Array.isArray(pcc.cost_codes) ? pcc.cost_codes[0] : pcc.cost_codes;
            if (costCodeData) {
              const numericId = Number(costCodeData.id);
              if (!Number.isNaN(numericId) && costCodeIds.includes(numericId)) {
                costCodesById.set(numericId, {
                  id: numericId,
                  code: pcc.cost_code_id,
                  name: costCodeData.title || "",
                });
              }
            }
          }
        }
      }
    }

    return NextResponse.json(
      lineItems.map((item) => ({
        ...item,
        cost_code:
          item.cost_code_id != null
            ? costCodesById.get(item.cost_code_id) ?? undefined
            : undefined,
      })),
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/projects/[id]/contracts/[contractId]/line-items
 * Creates a new line item for a contract
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, contractId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Validate request body
    const validatedData = createLineItemSchema.parse({
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

    // DEVELOPMENT: Permission check disabled for easier testing
    // TODO: Re-enable this in production
    // const { data: projectMember } = await supabase
    //   .from("project_members")
    //   .select("access")
    //   .eq("project_id", parseInt(projectId, 10))
    //   .eq("user_id", user.id)
    //   .single();

    // if (
    //   !projectMember ||
    //   !["editor", "admin", "owner"].includes(projectMember.access)
    // ) {
    //   return NextResponse.json(
    //     {
    //       error:
    //         "Forbidden: You do not have permission to create line items for this project",
    //     },
    //     { status: 403 },
    //   );
    // }

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

    // Check for unique line_number within contract
    const { data: existingLineItem } = await supabase
      .from("contract_line_items")
      .select("id")
      .eq("contract_id", contractId)
      .eq("line_number", validatedData.line_number)
      .single();

    if (existingLineItem) {
      return NextResponse.json(
        { error: "Line number already exists for this contract" },
        { status: 400 },
      );
    }

    // Create the line item
    const { data, error } = await supabase
      .from("contract_line_items")
      .insert(validatedData)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create line item", details: error.message },
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
