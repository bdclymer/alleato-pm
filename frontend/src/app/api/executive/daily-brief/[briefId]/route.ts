import { NextResponse } from "next/server";

import { requireCurrentUserAppCapability } from "@/lib/app-capabilities";
import { loadDailyExecutiveBriefPacketById } from "@/lib/daily-briefs/canonical-packets";
import { withApiGuardrails } from "@/lib/guardrails/api";

/**
 * Lightweight lookup for a single canonical Daily Brief packet. Used by the
 * header breadcrumb to resolve a brief id (UUID in the URL) to its business
 * date so the crumb reads "Daily Briefs / 2026-07-08" instead of a raw id.
 */
export const GET = withApiGuardrails<{ briefId: string }>(
  "/api/executive/daily-brief/[briefId]#GET",
  async ({ params }) => {
    await requireCurrentUserAppCapability(
      "view_executive_briefing",
      "/api/executive/daily-brief/[briefId]#GET",
      "Daily Brief access required.",
    );

    const { briefId } = await params;
    const packet = await loadDailyExecutiveBriefPacketById(briefId);
    if (!packet) {
      return NextResponse.json({ error: "Daily Brief not found." }, { status: 404 });
    }

    return NextResponse.json({
      id: packet.id,
      businessDate: packet.businessDate,
      title: packet.title,
    });
  },
);
