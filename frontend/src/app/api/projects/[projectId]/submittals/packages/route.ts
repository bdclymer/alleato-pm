import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/projects/[projectId]/submittals/packages
 * Returns submittal packages for the project ordered by name.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("submittal_packages")
      .select("id, name, description")
      .eq("project_id", parseInt(projectId, 10))
      .order("name");

    if (error) return apiErrorResponse(error);

    return NextResponse.json(data ?? []);
  } catch (err) {
    return apiErrorResponse(err);
  }
}
