export const dynamic = "force-dynamic";

/**
 * POST /api/executive/daily-brief/preview-teams
 *
 * Returns the exact Teams message text that would be sent to Brandon — without
 * actually sending it. Optionally regenerates the brief packet first.
 *
 * Auth: active Supabase session with `view_executive_briefing` capability.
 *
 * Body (all optional):
 *   { fresh?: boolean; windowDays?: number; firstName?: string }
 */

import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { requireCurrentUserAppCapability } from "@/lib/app-capabilities";
import {
  DEFAULT_EXECUTIVE_WINDOW_DAYS,
  clampDailyBriefWindowDays,
} from "@/lib/executive/daily-brief";
import {
  getExecutiveBriefingDashboard,
  regenerateExecutiveBriefingDraft,
} from "@/lib/executive/executive-briefing-workflow";
import { formatExecutiveBriefingTeamsMessage } from "@/lib/executive/executive-briefing-teams-delivery";

export const POST = withApiGuardrails(
  "executive/daily-brief/preview-teams#POST",
  async ({ request }): Promise<Response> => {
    await requireCurrentUserAppCapability(
      "view_executive_briefing",
      "executive/daily-brief/preview-teams#POST",
      "Daily Brief access required.",
    );

    let body: { fresh?: boolean; windowDays?: number; firstName?: string } = {};
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text);
    } catch (error) {
      throw new GuardrailError({
        code: "INVALID_REQUEST",
        where: "executive/daily-brief/preview-teams#POST",
        message:
          error instanceof Error
            ? `Invalid JSON body: ${error.message}`
            : "Invalid JSON body.",
        status: 400,
      });
    }

    const windowDays = clampDailyBriefWindowDays(
      Number(body.windowDays ?? DEFAULT_EXECUTIVE_WINDOW_DAYS),
    );
    const firstName = body.firstName?.trim() || "Brandon";

    const draft = body.fresh
      ? (await regenerateExecutiveBriefingDraft({ windowDays })).draft
      : (await getExecutiveBriefingDashboard({ windowDays })).draft;

    if (!draft) {
      return NextResponse.json(
        {
          success: false,
          error_message:
            "No brief available for this window. Try fresh=true to regenerate.",
        },
        { status: 404 },
      );
    }

    const message = formatExecutiveBriefingTeamsMessage(
      draft.packet,
      firstName,
      { now: new Date() },
    );

    const totalItems =
      draft.packet.sections.needsBrandon.length +
      draft.packet.sections.waitingOnOthers.length +
      draft.packet.sections.importantUpdates.length;

    return NextResponse.json({
      success: true,
      message,
      recipientName: firstName,
      itemCount: totalItems,
      windowDays,
      recapDate: draft.recapDate,
      generatedFresh: Boolean(body.fresh),
    });
  },
);
