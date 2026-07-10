import { NextResponse } from "next/server";

import { requireCurrentUserAppCapability } from "@/lib/app-capabilities";
import {
  listDailyExecutiveBriefPackets,
  toDailyBriefHistoryItem,
} from "@/lib/daily-briefs/canonical-packets";
import type { DailyBriefHistoryResponse } from "@/lib/daily-briefs/types";
import { withApiGuardrails } from "@/lib/guardrails/api";

export const GET = withApiGuardrails(
  "/api/executive/daily-brief/history#GET",
  async () => {
    await requireCurrentUserAppCapability(
      "view_executive_briefing",
      "/api/executive/daily-brief/history#GET",
      "Daily Brief history access required.",
    );

    const packets = await listDailyExecutiveBriefPackets();

    return NextResponse.json({
      briefs: packets.map(toDailyBriefHistoryItem),
    } satisfies DailyBriefHistoryResponse);
  },
);
