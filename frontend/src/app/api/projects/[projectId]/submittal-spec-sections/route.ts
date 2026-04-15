import { withApiGuardrails } from "@/lib/guardrails/api";
import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/projects/[projectId]/submittal-spec-sections
 * Compatibility endpoint for specification section lookups.
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/submittal-spec-sections#GET",
  async ({ params }) => {
    const { projectId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("specifications")
      .select("id, section_number, section_title, division")
      .eq("project_id", parseInt(projectId, 10))
      .order("section_number");

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data ?? []);
  },
);
