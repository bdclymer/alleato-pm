import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CreateSubcontractSchema } from "@/lib/schemas/create-subcontract-schema";
import { mapFormToInsert } from "@/lib/db/subcontracts";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/projects/[id]/subcontracts
 * Fetch all subcontracts for a project
 */
export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/subcontracts#GET",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/subcontracts#GET", message: "Authentication required." });
    }

    // Fetch subcontracts with totals view
    const { data, error } = await supabase
      .from("subcontracts_with_totals")
      .select("*")
      .eq("project_id", parseInt(projectId, 10))
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching subcontracts:", error);
      return NextResponse.json(
        { error: "Failed to fetch subcontracts" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
    },
);

/**
 * POST /api/projects/[id]/subcontracts
 * Create a new subcontract
 */
export const POST = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/subcontracts#POST",
  async ({ request, params }) => {
  const { projectId } = await params;
  console.warn(
    `[Subcontracts API] POST /api/projects/${projectId}/subcontracts - Starting`,
  );

  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("[Subcontracts API] Auth error:", userError);
      return NextResponse.json(
        { error: "Authentication failed", details: userError.message },
        { status: 401 },
      );
    }

    if (!user) {
      console.error("[Subcontracts API] No authenticated user found");
      return NextResponse.json(
        { error: "Unauthorized - no user session. Please log in again." },
        { status: 401 },
      );
    }

    console.warn(
      `[Subcontracts API] Authenticated user: ${user.email} (${user.id})`,
    );

    // Parse and validate request body
    const body = await request.json();
    console.warn(
      "[Subcontracts API] Request body received:",
      JSON.stringify(body, null, 2),
    );

    const validationResult = CreateSubcontractSchema.safeParse(body);

    if (!validationResult.success) {
      console.error(
        "[Subcontracts API] Validation failed:",
        validationResult.error.issues,
      );
      return NextResponse.json(
        {
          error: "Validation failed - please check your input",
          details: validationResult.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const data = validationResult.data;

    // Use the typed mapper - this is the ONLY place camelCase -> snake_case happens
    // If you get schema errors, fix them in src/lib/db/subcontracts.ts
    const subcontractData = mapFormToInsert(data, parseInt(projectId), user.id);

    console.warn(
      "[Subcontracts API] Inserting subcontract:",
      JSON.stringify(subcontractData, null, 2),
    );

    const { data: subcontract, error: subcontractError } = await supabase
      .from("subcontracts")
      .insert(subcontractData)
      .select()
      .single();

    if (subcontractError) {
      console.error(
        "[Subcontracts API] Database insert error:",
        subcontractError,
      );

      // Provide more helpful error messages based on error code
      let userMessage = "Failed to create subcontract";
      if (subcontractError.code === "23505") {
        userMessage =
          "A subcontract with this contract number already exists for this project";
      } else if (subcontractError.code === "42501") {
        userMessage =
          "Permission denied - RLS policy blocked the insert. Check your project permissions.";
      } else if (subcontractError.code === "23503") {
        userMessage =
          "Invalid reference - contract company or other referenced record does not exist";
      }

      return NextResponse.json(
        {
          error: userMessage,
          details: {
            code: subcontractError.code,
            message: subcontractError.message,
            hint: subcontractError.hint,
          },
        },
        { status: 500 },
      );
    }

    console.warn(
      "[Subcontracts API] Subcontract created successfully:",
      subcontract.id,
    );

    // Create SOV line items if provided
    if (data.sov && data.sov.length > 0) {
      console.warn(
        `[Subcontracts API] Creating ${data.sov.length} SOV line items`,
      );
      const sovItems = data.sov.map((item, index) => ({
        subcontract_id: subcontract.id,
        line_number: item.lineNumber || index + 1,
        change_event_line_item: item.changeEventLineItem || null,
        budget_code: item.budgetCode || null,
        description: item.description || null,
        amount: item.amount?.toString() || "0",
        billed_to_date: item.billedToDate?.toString() || "0",
        sort_order: index,
      }));

      const { error: sovError } = await supabase
        .from("subcontract_sov_items")
        .insert(sovItems);

      if (sovError) {
        console.error("[Subcontracts API] Error creating SOV items:", sovError);
        // Rollback: delete the subcontract we just created
        await supabase.from("subcontracts").delete().eq("id", subcontract.id);
        return NextResponse.json(
          {
            error: "Failed to create schedule of values line items",
            details: {
              code: sovError.code,
              message: sovError.message,
            },
          },
          { status: 500 },
        );
      }
      console.warn("[Subcontracts API] SOV items created successfully");
    }

    // Fetch the complete subcontract with totals
    const { data: completeSubcontract, error: fetchError } = await supabase
      .from("subcontracts_with_totals")
      .select("*")
      .eq("id", subcontract.id)
      .single();

    if (fetchError) {
      console.error(
        "[Subcontracts API] Error fetching complete subcontract:",
        fetchError,
      );
      // Don't fail here, we already created successfully
      console.warn("[Subcontracts API] Returning basic subcontract data");
      return NextResponse.json({
        data: subcontract,
        message: "Subcontract created successfully",
      });
    }

    console.warn("[Subcontracts API] Request completed successfully");
    return NextResponse.json({
      data: completeSubcontract,
      message: "Subcontract created successfully",
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
  },
);
