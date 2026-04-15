import { withApiGuardrails } from "@/lib/guardrails/api";
import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/projects/[projectId]/submittal-types
 * Compatibility endpoint for submittal type catalogs.
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/submittal-types#GET",
  async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("submittal_types")
      .select("id, name, category, description")
      .order("name");

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data ?? []);
  },
);
