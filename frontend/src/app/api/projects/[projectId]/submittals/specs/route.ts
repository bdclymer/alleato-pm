import { withApiGuardrails } from "@/lib/guardrails/api";
import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { listSpecificationLookupOptions } from "@/lib/specifications/compatibility";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/projects/[projectId]/submittals/specs
 * Returns specification sections for the project ordered by section_number.
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/submittals/specs#GET",
  async ({ request, params }) => {
  
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
