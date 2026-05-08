import { NextResponse } from "next/server";
import { requireCurrentUserAppCapability } from "@/lib/app-capabilities";
import {
  DEFAULT_EXECUTIVE_WINDOW_DAYS,
  clampDailyBriefWindowDays,
} from "@/lib/executive/daily-brief";
import {
  getExecutiveBriefingDashboard,
  regenerateExecutiveBriefingDraft,
} from "@/lib/executive/executive-briefing-workflow";

export async function getDailyBriefPacketResponse(
  request: Request,
  guardrailKey: string,
) {
  await requireCurrentUserAppCapability(
    "view_executive_briefing",
    guardrailKey,
    "Daily Brief access required.",
  );

  const { searchParams } = new URL(request.url);
  const windowDays = clampDailyBriefWindowDays(
    Number(searchParams.get("days") ?? String(DEFAULT_EXECUTIVE_WINDOW_DAYS)),
  );
  const fresh = searchParams.get("fresh") === "true";
  const sourceBackedOnly = searchParams.get("mode") === "source-backed";

  const draft = fresh
    ? (await regenerateExecutiveBriefingDraft({ windowDays, sourceBackedOnly }))
        .draft
    : (await getExecutiveBriefingDashboard({ windowDays })).draft;

  return NextResponse.json(draft.packet);
}
