import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { requireCurrentUserAppCapability } from "@/lib/app-capabilities";
import {
  DEFAULT_EXECUTIVE_WINDOW_DAYS,
} from "@/lib/executive/brandon-daily-update";
import {
  getExecutiveBriefingDashboard,
  regenerateExecutiveBriefingDraft,
} from "@/lib/executive/executive-briefing-workflow";

export const GET = withApiGuardrails(
  "/api/executive/brandon-daily-update#GET",
  async ({ request }) => {
    await requireCurrentUserAppCapability(
      "view_executive_briefing",
      "/api/executive/brandon-daily-update#GET",
      "Executive briefing access required.",
    );

    const { searchParams } = new URL(request.url);
    const daysParam = Number(searchParams.get("days") ?? String(DEFAULT_EXECUTIVE_WINDOW_DAYS));
    const windowDays = Number.isFinite(daysParam)
      ? Math.min(Math.max(Math.trunc(daysParam), 1), 14)
      : DEFAULT_EXECUTIVE_WINDOW_DAYS;
    const fresh = searchParams.get("fresh") === "true";

    const draft = fresh
      ? (await regenerateExecutiveBriefingDraft({ windowDays })).draft
      : (await getExecutiveBriefingDashboard({ windowDays })).draft;

    return NextResponse.json(draft.packet);
  },
);
