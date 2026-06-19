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
} from "@/lib/executive/executive-briefing-workflow";
import { formatExecutiveBriefingTeamsMessage } from "@/lib/executive/executive-briefing-teams-delivery";
import {
  completeDailyBriefRun,
  failDailyBriefRun,
  recordDraftEvidence,
  regenerateDailyBriefDraftForRun,
  sourceHealthForDraft,
  startDailyBriefRun,
} from "@/lib/ai-ops/executive-daily-brief-ledger";

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
        code: "BAD_REQUEST",
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

    const runContext = await startDailyBriefRun({
      eventType: "preview_request",
      triggerType: body.fresh ? "manual_preview_fresh" : "manual_preview",
      surface: "executive_daily_brief_preview_teams",
      title: "Executive Daily Brief Teams preview",
      userGoal:
        "Preview the Executive Daily Brief Teams message without sending.",
      normalizedGoal:
        "Build a no-send Teams preview and record evidence-linked run state.",
      deliveryTarget: {
        channel: "teams",
        recipientName: firstName,
        dryRun: true,
      },
      payload: { windowDays, fresh: Boolean(body.fresh), firstName },
    });

    try {
      const draft = body.fresh
        ? (await regenerateDailyBriefDraftForRun(runContext, { windowDays }))
            .draft
        : (await getExecutiveBriefingDashboard({ windowDays })).draft;

      if (!draft) {
        await completeDailyBriefRun(runContext, {
          status: "skipped",
          deliveryStatus: "skipped",
          resultSummary: "No brief available for this window.",
          deliveryTarget: {
            channel: "teams",
            recipientName: firstName,
            dryRun: true,
          },
          sourceCounts: { itemCount: 0, windowDays },
        });

        return NextResponse.json(
          {
            success: false,
            error_message:
              "No brief available for this window. Try fresh=true to regenerate.",
          },
          { status: 404 },
        );
      }

      const card = formatExecutiveBriefingTeamsMessage(
        draft.packet,
        firstName,
        { now: new Date() },
      );

      const totalItems =
        draft.packet.sections.needsBrandon.length +
        draft.packet.sections.waitingOnOthers.length +
        draft.packet.sections.importantUpdates.length;

      if (!body.fresh) {
        await recordDraftEvidence(runContext, draft);
      }
      await completeDailyBriefRun(runContext, {
        status: "succeeded",
        dailyRecapId: draft.id,
        deliveryStatus: "dry_run",
        resultSummary: `Built Teams preview with ${totalItems} brief items.`,
        deliveryTarget: {
          channel: "teams",
          recipientName: firstName,
          dryRun: true,
        },
        sourceCounts: { itemCount: totalItems, windowDays },
        sourceHealth: sourceHealthForDraft(draft),
        metadata: {
          recapDate: draft.recapDate,
          generatedFresh: Boolean(body.fresh),
        },
      });

      return NextResponse.json({
        success: true,
        runId: runContext.runId,
        card,
        recipientName: firstName,
        itemCount: totalItems,
        windowDays,
        recapDate: draft.recapDate,
        generatedFresh: Boolean(body.fresh),
      });
    } catch (error) {
      await failDailyBriefRun(
        runContext,
        error,
        "EXECUTIVE_DAILY_BRIEF_PREVIEW_FAILED",
      );
      throw error;
    }
  },
);
