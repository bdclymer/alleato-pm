import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string; submittalId: string }>;
}

/**
 * POST /api/projects/[projectId]/submittals/[submittalId]/duplicate
 * Copies a submittal row (appends " (Copy)" to title) and returns the new record.
 */
export async function POST(_req: NextRequest, { params }: RouteParams) {
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

    // Fetch original submittal
    const { data: original, error: fetchError } = await supabase
      .from("submittals")
      .select("*")
      .eq("project_id", parseInt(projectId, 10))
      .eq("id", submittalId)
      .single();

    if (fetchError || !original) {
      return NextResponse.json({ error: "Submittal not found" }, { status: 404 });
    }

    // Build the duplicate — strip identity fields, mutate title
    const { id: _id, created_at: _ca, updated_at: _ua, deleted_at: _da, ...rest } = original;

    const now = new Date().toISOString();
    const { data: newRecord, error: insertError } = await supabase
      .from("submittals")
      .insert({
        ...rest,
        title: `${original.title} (Copy)`,
        status: "Draft",
        deleted_at: null,
        created_at: now,
        updated_at: now,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      return apiErrorResponse(insertError);
    }

    return NextResponse.json(newRecord, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
