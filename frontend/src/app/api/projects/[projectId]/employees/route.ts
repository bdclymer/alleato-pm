import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiErrorResponse } from "@/lib/api-error";
import { logger } from "@/lib/logger";

/**
 * GET /api/projects/[projectId]/employees
 * Returns active employees/users for project form dropdowns.
 */
export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/employees#GET",
  async ({ params }) => {
  
    const { projectId } = await params;
    const projectIdNum = Number.parseInt(projectId, 10);

    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/employees#GET",
        message: "Authentication required to load employees.",
        status: 401,
        severity: "medium",
      });
    }

    const service = createServiceClient();
    const { data, error } = await service
      .from("people")
      .select("id, first_name, last_name")
      .in("person_type", ["employee", "user"])
      .eq("status", "active")
      .order("last_name", { ascending: true });

    if (error) {
      logger.error({ msg: "Error fetching employees:", error: error instanceof Error ? error.message : String(error) });
      return apiErrorResponse(error);
    }

    return NextResponse.json(data || []);
    },
);
