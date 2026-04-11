import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string; submittalId: string; stepId: string }>;
}

/**
 * DELETE /api/projects/[projectId]/submittals/[submittalId]/workflow-steps/[stepId]
 * Removes a workflow step and its associated responses.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { submittalId, stepId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete associated responses first
    await supabase
      .from("submittal_responses")
      .delete()
      .eq("workflow_step_id", stepId);

    // Delete the step
    const { error: deleteError } = await supabase
      .from("submittal_workflow_steps")
      .delete()
      .eq("id", stepId)
      .eq("submittal_id", submittalId);

    if (deleteError) {
      return apiErrorResponse(deleteError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
