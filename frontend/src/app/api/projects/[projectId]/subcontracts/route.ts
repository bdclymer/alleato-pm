import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CreateSubcontractSchema } from "@/lib/schemas/create-subcontract-schema";
import { mapFormToInsert } from "@/lib/db/subcontracts";

/**
 * GET /api/projects/[id]/subcontracts
 * Fetch all subcontracts for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/projects/[id]/subcontracts
 * Create a new subcontract
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
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

    // Look up person_id from auth user
    const { data: authLink } = await supabase
      .from("users_auth")
      .select("person_id")
      .eq("auth_user_id", user.id)
      .single();

    const { data: membership, error: accessError } = await supabase
      .from("project_directory_memberships")
      .select("role, status")
      .eq("project_id", parseInt(projectId))
      .eq("person_id", authLink?.person_id ?? "")
      .single();

    if (accessError || !membership || membership.status !== "active") {
      console.error(
        "[Subcontracts API] Project access check failed:",
        accessError,
      );
      return NextResponse.json(
        {
          error:
            "Forbidden: You do not have permission to access this project",
          details: `User ${user.email} is not an active member of project ${projectId}`,
        },
        { status: 403 },
      );
    }

    console.warn(
      `[Subcontracts API] User membership status: ${membership.status} - authorized`,
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
    console.error("[Subcontracts API] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error - an unexpected error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
