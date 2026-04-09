import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string; submittalId: string }>;
}

/**
 * PATCH /api/projects/[projectId]/submittals/[submittalId]/restore
 * Restores a soft-deleted submittal (clears deleted_at).
 */
export async function PATCH(_req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, submittalId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("submittals")
      .update({
        deleted_at: null,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("project_id", parseInt(projectId, 10))
      .eq("id", submittalId)
      .select()
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
