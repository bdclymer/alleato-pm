import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string; photoId: string }>;
}

/**
 * PATCH /api/projects/[projectId]/photos/[photoId]/restore
 * Restores a soft-deleted photo by clearing deleted_at.
 */
export async function PATCH(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, photoId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("project_photos")
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq("id", parseInt(photoId, 10))
      .eq("project_id", parseInt(projectId, 10))
      .not("deleted_at", "is", null)
      .select("id")
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    if (!data) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
