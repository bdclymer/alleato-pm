import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

interface HistoryParams {
  params: Promise<{
    projectId: string;
  }>;
}

/**
 * GET /api/projects/[id]/budget/history
 *
 * Fetches budget change history (audit trail)
 */
export async function GET(request: NextRequest, { params }: HistoryParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch change history
    const { data: changes, error: changesError } = await supabase
      .from("budget_line_history")
      .select(
        `
        id,
        budget_line_id,
        field_name,
        old_value,
        new_value,
        change_type,
        changed_at,
        changed_by,
        budget_lines (
          cost_code_id,
          description,
          cost_codes (
            id,
            title
          )
        ),
        users:changed_by (
          email
        )
      `,
      )
      .eq("project_id", parseInt(projectId, 10))
      .order("changed_at", { ascending: false })
      .limit(100);

    if (changesError) {
      return NextResponse.json(
        { error: "Failed to fetch change history" },
        { status: 500 },
      );
    }

    // Format changes for display
    const formattedChanges = (changes || []).map((change) => {
      const budgetLine = change.budget_lines as unknown as {
        cost_codes: { id: string; title: string | null } | null;
        description: string;
      } | null;

      const userInfo = change.users as unknown as { email: string } | null;

      return {
        id: change.id,
        timestamp: change.changed_at,
        user: userInfo?.email || "Unknown User",
        action: change.change_type,
        field: change.field_name,
        oldValue: change.old_value,
        newValue: change.new_value,
        costCode: budgetLine?.cost_codes
          ? `${budgetLine.cost_codes.id} - ${budgetLine.cost_codes.title ?? ""}`
          : null,
        description: budgetLine?.description || null,
      };
    });

    // Calculate statistics
    const now = new Date();
    const thisMonth = formattedChanges.filter((change) => {
      const changeDate = new Date(change.timestamp);
      return (
        changeDate.getMonth() === now.getMonth() &&
        changeDate.getFullYear() === now.getFullYear()
      );
    });

    const uniqueUsers = new Set(formattedChanges.map((c) => c.user));
    const lastChange =
      formattedChanges.length > 0 ? formattedChanges[0].timestamp : null;

    return NextResponse.json({
      changes: formattedChanges,
      statistics: {
        totalChanges: formattedChanges.length,
        changesThisMonth: thisMonth.length,
        activeUsers: uniqueUsers.size,
        lastChange,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
