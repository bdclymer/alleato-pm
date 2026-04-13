/**
 * Company-level estimates API — cross-project list
 * GET /api/estimates?type=asrs|design_build|all
 */

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EstimateService } from "@/lib/services/estimate-service";

export const GET = withApiGuardrails(
  "estimates#GET",
  async ({ request }) => {
  
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "estimates#GET", message: "Authentication required." });
    }

    const { searchParams } = new URL(request.url);
    const estimateType = searchParams.get("type") ?? "all";

    const service = new EstimateService(supabase);
    const data = await service.listAll(estimateType === "all" ? null : estimateType);

    return NextResponse.json({ data });
    },
);
