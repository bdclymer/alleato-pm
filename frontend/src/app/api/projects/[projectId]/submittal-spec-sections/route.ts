import { withApiGuardrails } from "@/lib/guardrails/api";
import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { listSpecificationLookupOptions } from "@/lib/specifications/compatibility";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/projects/[projectId]/submittal-spec-sections
 * Compatibility endpoint for specification section lookups.
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/submittal-spec-sections#GET",
  async ({ params }) => {
    const { projectId } = await params;
    const supabase = await createClient();

    try {
      const data = await listSpecificationLookupOptions(
        supabase,
        parseInt(projectId, 10),
      );

      return NextResponse.json(data);
    } catch (error) {
      return apiErrorResponse(error);
    }
  },
);
