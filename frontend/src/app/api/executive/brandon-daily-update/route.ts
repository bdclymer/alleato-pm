import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { generateBrandonDailyUpdate } from "@/lib/executive/brandon-daily-update";
import { getApiRouteUser } from "@/lib/supabase/server";

export const GET = withApiGuardrails(
  "/api/executive/brandon-daily-update#GET",
  async ({ request }) => {
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "/api/executive/brandon-daily-update#GET",
        message: "Authentication required to generate Brandon's daily update.",
        status: 401,
      });
    }

    const { searchParams } = new URL(request.url);
    const daysParam = Number(searchParams.get("days") ?? "2");
    const windowDays = Number.isFinite(daysParam)
      ? Math.min(Math.max(Math.trunc(daysParam), 1), 14)
      : 2;

    const packet = await generateBrandonDailyUpdate({ windowDays });
    return NextResponse.json(packet);
  },
);
