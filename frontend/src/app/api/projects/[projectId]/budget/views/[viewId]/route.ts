import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UpdateBudgetViewRequest } from "@/types/budget-views";
import { apiErrorResponse } from "@/lib/api-error";

// GET /api/projects/[id]/budget/views/[viewId]
// Fetch a single budget view
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string; viewId: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { viewId } = await context.params;

    const { data: view, error } = await supabase
      .from("budget_views")
      .select(
        `
        *,
        columns:budget_view_columns(*)
      `,
      )
      .eq("id", viewId)
      .single();

    if (error) {
      console.error("Budget view fetch error:", {
        error,
        viewId,
        userId: user.id
      });

      // Handle specific error cases
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Budget view not found" },
          { status: 404 },
        );
      }

      return apiErrorResponse(error);
    }

    if (!view) {
      return NextResponse.json(
        { error: "Budget view not found" },
        { status: 404 },
      );
    }

    // Sort columns by display_order
    const viewWithSortedColumns = {
      ...view,
      columns:
        view.columns?.sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order) || [],
    };

    return NextResponse.json({ view: viewWithSortedColumns });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// PATCH /api/projects/[id]/budget/views/[viewId]
// Update a budget view
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; viewId: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { viewId } = await context.params;
    const body: UpdateBudgetViewRequest = await request.json();

    // Check if view is a system view
    const { data: existingView, error: fetchError } = await supabase
      .from("budget_views")
      .select("is_system")
      .eq("id", viewId)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch budget view", details: fetchError.message },
        { status: 500 },
      );
    }

    if (!existingView) {
      return NextResponse.json(
        { error: "Budget view not found" },
        { status: 404 },
      );
    }

    if (existingView.is_system) {
      return NextResponse.json(
        { error: "Cannot modify system views" },
        { status: 403 },
      );
    }

    const { name, description, is_default, columns } = body;

    // Update the view metadata
    if (name || description !== undefined || is_default !== undefined) {
      const updateData: Record<string, unknown> = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (is_default !== undefined) updateData.is_default = is_default;

      const { error: updateError } = await supabase
        .from("budget_views")
        .update(updateData)
        .eq("id", viewId);

      if (updateError) {
        return NextResponse.json(
          {
            error: "Failed to update budget view",
            details: updateError.message,
          },
          { status: 500 },
        );
      }
    }

    // Update columns if provided
    if (columns && columns.length > 0) {
      // Delete existing columns
      const { error: deleteError } = await supabase
        .from("budget_view_columns")
        .delete()
        .eq("view_id", viewId);

      if (deleteError) {
        return NextResponse.json(
          {
            error: "Failed to update budget view columns",
            details: deleteError.message,
          },
          { status: 500 },
        );
      }

      // Insert new columns
      const columnsToInsert = columns.map((col) => ({
        view_id: viewId,
        column_key: col.column_key,
        display_name: col.display_name || null,
        display_order: col.display_order,
        width: col.width || null,
        is_visible: col.is_visible !== undefined ? col.is_visible : true,
        is_locked: col.is_locked !== undefined ? col.is_locked : false,
      }));

      const { error: insertError } = await supabase
        .from("budget_view_columns")
        .insert(columnsToInsert);

      if (insertError) {
        return NextResponse.json(
          {
            error: "Failed to update budget view columns",
            details: insertError.message,
          },
          { status: 500 },
        );
      }
    }

    // Fetch the updated view
    const { data: updatedView, error: fetchUpdatedError } = await supabase
      .from("budget_views")
      .select(
        `
        *,
        columns:budget_view_columns(*)
      `,
      )
      .eq("id", viewId)
      .single();

    if (fetchUpdatedError) {
      return NextResponse.json(
        {
          error: "Failed to fetch updated budget view",
          details: fetchUpdatedError.message,
        },
        { status: 500 },
      );
    }

    // Sort columns by display_order
    const viewWithSortedColumns = {
      ...updatedView,
      columns:
        updatedView.columns?.sort(
          (a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order,
        ) || [],
    };

    return NextResponse.json({ view: viewWithSortedColumns });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// DELETE /api/projects/[id]/budget/views/[viewId]
// Delete a budget view
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string; viewId: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { viewId } = await context.params;

    // Check if view is a system view
    const { data: existingView, error: fetchError } = await supabase
      .from("budget_views")
      .select("is_system, is_default")
      .eq("id", viewId)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch budget view", details: fetchError.message },
        { status: 500 },
      );
    }

    if (!existingView) {
      return NextResponse.json(
        { error: "Budget view not found" },
        { status: 404 },
      );
    }

    if (existingView.is_system) {
      return NextResponse.json(
        { error: "Cannot delete system views" },
        { status: 403 },
      );
    }

    // Delete the view (cascade will delete columns)
    const { error: deleteError } = await supabase
      .from("budget_views")
      .delete()
      .eq("id", viewId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete budget view", details: deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
