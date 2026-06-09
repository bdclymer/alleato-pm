import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { requireCurrentUserAppCapability } from "@/lib/app-capabilities";
import {
  DEFAULT_EXECUTIVE_WINDOW_DAYS,
  clampDailyBriefWindowDays,
} from "@/lib/executive/daily-brief";
import { getExecutiveBriefingDashboard } from "@/lib/executive/executive-briefing-workflow";
import { generateExecutiveIntelligenceBrief } from "@/lib/executive/intelligence-brief";

export const GET = withApiGuardrails(
  "/api/executive/intelligence-brief#GET",
  async ({ request }) => {
    await requireCurrentUserAppCapability(
      "view_executive_briefing",
      "/api/executive/intelligence-brief#GET",
      "Executive briefing access required.",
    );

    const { searchParams } = new URL(request.url);
    const windowDays = clampDailyBriefWindowDays(
      Number(searchParams.get("days") ?? String(DEFAULT_EXECUTIVE_WINDOW_DAYS)),
    );
    const forceBriefType = searchParams.get("type") as "morning" | "evening" | null;

    const { draft } = await getExecutiveBriefingDashboard({ windowDays });
    const brief = await generateExecutiveIntelligenceBrief(draft.packet, {
      forceBriefType: forceBriefType ?? undefined,
    });

    return NextResponse.json(brief);
  },
);
