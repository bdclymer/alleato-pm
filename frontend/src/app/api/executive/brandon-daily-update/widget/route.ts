import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { requireCurrentUserAppCapability } from "@/lib/app-capabilities";
import {
  DEFAULT_EXECUTIVE_WINDOW_DAYS,
  generateBrandonDailyUpdate,
} from "@/lib/executive/brandon-daily-update";
import { buildBrandonDailyUpdateWidget } from "@/lib/executive/brandon-daily-update-widget";

export const GET = withApiGuardrails(
  "/api/executive/brandon-daily-update/widget#GET",
  async ({ request }) => {
    await requireCurrentUserAppCapability(
      "view_executive_briefing",
      "/api/executive/brandon-daily-update/widget#GET",
      "Executive briefing access required.",
    );

    const { searchParams } = new URL(request.url);
    const daysParam = Number(searchParams.get("days") ?? String(DEFAULT_EXECUTIVE_WINDOW_DAYS));
    const windowDays = Number.isFinite(daysParam)
      ? Math.min(Math.max(Math.trunc(daysParam), 1), 14)
      : DEFAULT_EXECUTIVE_WINDOW_DAYS;

    const packet = await generateBrandonDailyUpdate({ windowDays });
    const widget = buildBrandonDailyUpdateWidget(packet);

    return NextResponse.json({
      packet,
      widget,
    });
  },
);
