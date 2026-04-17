import { withApiGuardrails } from "@/lib/guardrails/api";
import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { getNormalizedSubmittalTypeCatalog } from "@/lib/submittals/submittal-type-catalog";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/projects/[projectId]/submittal-types
 * Compatibility endpoint for submittal type catalogs.
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/submittal-types#GET",
  async () => {
    const supabase = await createClient();

    try {
      const data = await getNormalizedSubmittalTypeCatalog(supabase);
      return NextResponse.json(data ?? []);
    } catch (error) {
      return apiErrorResponse(error);
    }
  },
);
