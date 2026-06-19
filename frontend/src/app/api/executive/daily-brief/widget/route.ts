import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { requireCurrentUserAppCapability } from "@/lib/app-capabilities";
import {
  DEFAULT_EXECUTIVE_WINDOW_DAYS,
  clampDailyBriefWindowDays,
} from "@/lib/executive/daily-brief";
import { buildBrandonDailyUpdateWidget } from "@/lib/executive/brandon-daily-update-widget";
import {
  getExecutiveBriefingDashboard,
} from "@/lib/executive/executive-briefing-workflow";
import { regenerateDailyBriefDraftWithLedger } from "@/lib/ai-ops/executive-daily-brief-ledger";

export const GET = withApiGuardrails(
  "/api/executive/daily-brief/widget#GET",
  async ({ request }) => {
    await requireCurrentUserAppCapability(
      "view_executive_briefing",
      "/api/executive/daily-brief/widget#GET",
      "Daily Brief access required.",
    );

    const { searchParams } = new URL(request.url);
    const windowDays = clampDailyBriefWindowDays(
      Number(searchParams.get("days") ?? String(DEFAULT_EXECUTIVE_WINDOW_DAYS)),
    );
    const fresh = searchParams.get("fresh") === "true";
    const sourceBackedOnly = searchParams.get("mode") === "source-backed";
    const packet = fresh
      ? (
          await regenerateDailyBriefDraftWithLedger({
            windowDays,
            sourceBackedOnly,
            triggerType: "manual_widget_refresh",
            surface: "/api/executive/daily-brief/widget#GET",
            title: "Executive Daily Brief widget refresh",
            userGoal: "Regenerate the Executive Daily Brief widget packet.",
            normalizedGoal:
              "Generate the Executive Daily Brief widget packet and record the canonical AI Ops run.",
          })
        ).draft.packet
      : (await getExecutiveBriefingDashboard({ windowDays })).draft.packet;
    const widget = buildBrandonDailyUpdateWidget(packet);

    return NextResponse.json({
      packet,
      widget,
    });
  },
);
