import { NextResponse } from "next/server";

import { requireCurrentUserAppCapability } from "@/lib/app-capabilities";
import { withApiGuardrails } from "@/lib/guardrails/api";

export const dynamic = "force-dynamic";

export const POST = withApiGuardrails(
  "executive/daily-brief/send-teams#POST",
  async (): Promise<Response> => {
    await requireCurrentUserAppCapability(
      "view_executive_briefing",
      "executive/daily-brief/send-teams#POST",
      "Daily Brief access required.",
    );

    return NextResponse.json(
      {
        success: false,
        error: "legacy_teams_delivery_retired",
        message:
          "Daily Brief Teams delivery is retired until delivery is rebuilt from the canonical intelligence_packets/daily-executive-brief packet.",
        sourceOfTruth: "intelligence_packets",
      },
      { status: 409 },
    );
  },
);
