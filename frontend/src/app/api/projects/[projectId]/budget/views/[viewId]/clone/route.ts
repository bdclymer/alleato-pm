import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CloneBudgetViewRequest } from "@/types/budget-views";
import { apiErrorResponse } from "@/lib/api-error";

// POST /api/projects/[id]/budget/views/[viewId]/clone
// Clone an existing budget view
export async function POST(
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
    const body: CloneBudgetViewRequest = await request.json();

    const { new_name, new_description } = body;

    // Validate required fields
    if (!new_name) {
      return NextResponse.json(
        { error: "New name is required" },
        { status: 400 },
      );
    }

    // Call the database function to clone the view
    const { data, error } = await supabase.rpc("clone_budget_view", {
      source_view_id: viewId,
      new_name,
      new_description: new_description || null,
    });

    if (error) {
      return apiErrorResponse(error);
    }

    // Fetch the cloned view
    const { data: clonedView, error: fetchError } = await supabase
      .from("budget_views")
      .select(
        `
        *,
        columns:budget_view_columns(*)
      `,
      )
      .eq("id", data)
      .single();

    if (fetchError) {
      return NextResponse.json(
        {
          error: "Failed to fetch cloned budget view",
          details: fetchError.message,
        },
        { status: 500 },
      );
    }

    // Sort columns by display_order
    const viewWithSortedColumns = {
      ...clonedView,
      columns:
        clonedView.columns?.sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order) ||
        [],
    };

    return NextResponse.json({ view: viewWithSortedColumns }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
