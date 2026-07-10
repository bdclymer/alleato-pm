import { NextResponse } from "next/server";

import { requireCurrentUserAppCapability } from "@/lib/app-capabilities";
import { previewCanonicalDailyBriefTeamsPayload } from "@/lib/daily-briefs/canonical-teams-delivery";
import { withApiGuardrails } from "@/lib/guardrails/api";

export const dynamic = "force-dynamic";

export const POST = withApiGuardrails(
  "executive/daily-brief/preview-teams#POST",
  async (): Promise<Response> => {
    await requireCurrentUserAppCapability(
      "view_executive_briefing",
      "executive/daily-brief/preview-teams#POST",
      "Daily Brief access required.",
    );

    const preview = await previewCanonicalDailyBriefTeamsPayload();
    return NextResponse.json({
      success: true,
      preview,
      sourceOfTruth: "intelligence_packets",
    });
  },
);
