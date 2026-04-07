import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CreateBudgetViewRequest } from "@/types/budget-views";
import { apiErrorResponse } from "@/lib/api-error";

// GET /api/projects/[id]/budget/views
// Fetch all budget views for a project
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const supabase = await createClient();
    const { projectId } = await context.params;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: "Authentication failed", details: authError.message },
        { status: 401 },
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 },
      );
    }
    // Validate project ID
    const projectIdNum = parseInt(projectId, 10);
    if (isNaN(projectIdNum)) {
      return NextResponse.json(
        { error: "Invalid project ID", details: `Project ID must be a number, got: ${projectId}` },
        { status: 400 },
      );
    }

    // Fetch views with their columns
    const { data: views, error: viewsError } = await supabase
      .from("budget_views")
      .select(
        `
        *,
        columns:budget_view_columns(*)
      `,
      )
      .eq("project_id", projectIdNum)
      .order("created_at", { ascending: true });

    if (viewsError) {
      console.error("Budget views fetch error:", {
        error: viewsError,
        projectId: projectIdNum,
        userId: user.id
      });
      return NextResponse.json(
        {
          error: "Failed to fetch budget views",
          details: viewsError.message,
          code: viewsError.code,
          hint: viewsError.hint
        },
        { status: 500 },
      );
    }

    // Sort columns by display_order
    const viewsWithSortedColumns = views?.map((view) => ({
      ...view,
      columns:
        view.columns?.sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order) || [],
    }));

    return NextResponse.json({ views: viewsWithSortedColumns });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// POST /api/projects/[id]/budget/views
// Create a new budget view
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const supabase = await createClient();
    const { projectId } = await context.params;
    const body: CreateBudgetViewRequest = await request.json();

    const { name, description, is_default = false, columns } = body;

    // Validate required fields
    if (!name || !columns || columns.length === 0) {
      return NextResponse.json(
        { error: "Name and columns are required" },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", details: userError?.message },
        { status: 401 },
      );
    }

    // Validate project ID
    const projectIdNum = parseInt(projectId, 10);
    if (isNaN(projectIdNum)) {
      return NextResponse.json(
        { error: "Invalid project ID", details: `Project ID must be a number, got: ${projectId}` },
        { status: 400 },
      );
    }

    // Create the view
    const { data: view, error: viewError } = await supabase
      .from("budget_views")
      .insert({
        project_id: projectIdNum,
        name,
        description: description || null,
        is_default,
        is_system: false,
        created_by: user.id,
      })
      .select()
      .single();

    if (viewError) {
      console.error("Budget view creation error:", {
        error: viewError,
        projectId: projectIdNum,
        userId: user.id,
        viewName: name
      });
      return NextResponse.json(
        {
          error: "Failed to create budget view",
          details: viewError.message,
          code: viewError.code,
          hint: viewError.hint
        },
        { status: 500 },
      );
    }

    // Create the columns
    const columnsToInsert = columns.map((col) => ({
      view_id: view.id,
      column_key: col.column_key,
      display_name: col.display_name || null,
      display_order: col.display_order,
      width: col.width || null,
      is_visible: col.is_visible !== undefined ? col.is_visible : true,
      is_locked: col.is_locked !== undefined ? col.is_locked : false,
    }));

    const { data: createdColumns, error: columnsError } = await supabase
      .from("budget_view_columns")
      .insert(columnsToInsert)
      .select();

    if (columnsError) {
      console.error("Budget view columns creation error:", {
        error: columnsError,
        viewId: view.id,
        columns: columnsToInsert
      });
      // Rollback: delete the view
      await supabase.from("budget_views").delete().eq("id", view.id);
      return NextResponse.json(
        {
          error: "Failed to create budget view columns",
          details: columnsError.message,
          code: columnsError.code,
          hint: columnsError.hint
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        view: {
          ...view,
          columns: createdColumns.sort(
            (a, b) => a.display_order - b.display_order,
          ),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
