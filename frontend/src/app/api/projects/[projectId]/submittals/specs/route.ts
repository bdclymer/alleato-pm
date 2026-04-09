import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/projects/[projectId]/submittals/specs
 * Returns specification sections for the project ordered by section_number.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("specifications")
      .select("id, section_number, section_title, division")
      .eq("project_id", parseInt(projectId, 10))
      .order("section_number");

    if (error) return apiErrorResponse(error);

    return NextResponse.json(data ?? []);
  } catch (err) {
    return apiErrorResponse(err);
  }
}
