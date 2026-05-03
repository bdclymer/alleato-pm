import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { listAllProgressReports } from "@/lib/progress-reports/server";
import { getApiRouteUser } from "@/lib/supabase/server";

export const GET = withApiGuardrails(
  "progress-reports#GET",
  async () => {
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "progress-reports#GET",
        message: "Authentication required.",
      });
    }

    const reports = await listAllProgressReports();
    return NextResponse.json({ reports });
  },
);
