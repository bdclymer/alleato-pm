export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/admin/owner-briefing/send-test
 *
 * Sends the best available executive briefing to one recipient for formatting
 * verification. Picks the most recent approved packet that has actual content
 * (needsBrandon or waitingOnOthers items). Bypasses EXECUTIVE_DAILY_BRIEF_ENABLED.
 *
 * Auth: Bearer CRON_SECRET
 * Body: { "userId"?: string, "draftId"?: string }
 *       userId defaults to Megan's user ID
 *       draftId explicitly picks a packet (skip auto-selection)
 */

import { NextResponse } from "next/server";
import { GuardrailError } from "@/lib/guardrails/errors";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { createServiceClient } from "@/lib/supabase/service";
import { formatExecutiveBriefingTeamsMessage } from "@/lib/executive/executive-briefing-render";
import {
  CEO_EXECUTIVE_BRIEFING_RECAP_KIND,
  type ExecutiveBriefingDraft,
} from "@/lib/executive/executive-briefing-workflow";
import type { BrandonDailyUpdatePacket } from "@/lib/executive/brandon-daily-update";
import {
  completeDailyBriefRun,
  failDailyBriefRun,
  recordDraftEvidence,
  sourceHealthForDraft,
  startDailyBriefRun,
} from "@/lib/ai-ops/executive-daily-brief-ledger";

const MEGAN_USER_ID = "1854b4b0-3e8e-4d69-86df-32cdb3c80ee0";

export const POST = withApiGuardrails(
  "/api/admin/owner-briefing/send-test#POST",
  async ({ request }) => {
    const cronSecret = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");
    if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "/api/admin/owner-briefing/send-test#POST",
        message: "Unauthorized.",
        status: 401,
        severity: "medium",
      });
    }

    const body = await request.json().catch(() => ({}));
    const targetUserId: string = body.userId ?? MEGAN_USER_ID;
    const runContext = await startDailyBriefRun({
      eventType: "teams_event",
      triggerType: "admin_owner_briefing_send_test",
      surface: "admin_owner_briefing_send_test",
      title: "Owner briefing admin test send",
      userGoal:
        "Send a test Executive Daily Brief Teams message to one recipient.",
      normalizedGoal:
        "Load an approved Executive Daily Brief packet, send it to one Teams recipient, and record the ledger run.",
      deliveryTarget: { channel: "teams", targetUserId, dryRun: false },
      payload: {
        targetUserId,
        draftId: typeof body.draftId === "string" ? body.draftId : null,
      },
    });

    const supabase = createServiceClient();

    try {
      // If draftId is specified, load that exact packet.
      // Otherwise find the best recent packet: most recent with needsBrandon > 0,
      // fallback to most recent with any content.
      let packet: BrandonDailyUpdatePacket | null = null;
      let draftId: string | null = null;
      let recapDate: string | null = null;

      if (body.draftId) {
        const { data } = await supabase
          .from("daily_recaps")
          .select("id, recap_date, briefing_packet")
          .eq("id", body.draftId)
          .single();
        packet = data?.briefing_packet as BrandonDailyUpdatePacket | null;
        draftId = data?.id ?? null;
        recapDate = data?.recap_date ?? null;
      } else {
        // Default: send the most recent approved packet (today's brief).
        const { data } = await supabase
          .from("daily_recaps")
          .select("id, recap_date, briefing_packet")
          .eq("recap_kind", CEO_EXECUTIVE_BRIEFING_RECAP_KIND)
          .eq("workflow_status", "approved")
          .not("briefing_packet", "is", null)
          .order("recap_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          packet = data.briefing_packet as BrandonDailyUpdatePacket;
          draftId = data.id;
          recapDate = data.recap_date;
        }
      }

      if (!packet || !draftId) {
        await completeDailyBriefRun(runContext, {
          status: "skipped",
          deliveryStatus: "skipped",
          resultSummary:
            "No approved briefing packet found for admin test send.",
          deliveryTarget: { channel: "teams", targetUserId },
          sourceCounts: {},
          metadata: { reason: "no_approved_briefing_packet" },
        });

        return NextResponse.json(
          {
            ok: false,
            reason: "No approved briefing packet found.",
            runId: runContext.runId,
          },
          { status: 404 },
        );
      }

      const draft = {
        id: draftId,
        recapDate: recapDate ?? "",
        workflowStatus: "approved",
        approvedAt: null,
        approvedBy: null,
        packet,
        createdAt: null,
        updatedSummary:
          "Approved executive briefing packet selected for admin test send.",
      } satisfies ExecutiveBriefingDraft;

      // Send the brief as a plain, normal-width Teams text message (not a card —
      // Adaptive Cards render cramped on Teams desktop).
      const text = formatExecutiveBriefingTeamsMessage(packet, "Brandon");
      const { sendProactiveMessage } = await import("@/lib/bot/teams-chat");
      await sendProactiveMessage(targetUserId, text);

      const sections = {
        needsBrandon: packet.sections.needsBrandon.length,
        waitingOnOthers: packet.sections.waitingOnOthers.length,
        importantUpdates: packet.sections.importantUpdates.length,
      };
      const itemCount =
        sections.needsBrandon +
        sections.waitingOnOthers +
        sections.importantUpdates;

      await recordDraftEvidence(runContext, draft);
      await completeDailyBriefRun(runContext, {
        status: "succeeded",
        deliveryStatus: "sent",
        resultSummary: `Sent admin owner briefing test message with ${itemCount} item(s).`,
        deliveryTarget: {
          channel: "teams",
          targetUserId,
          recipientCount: 1,
          sentCount: 1,
        },
        sourceCounts: {
          ...sections,
          itemCount,
          recipientCount: 1,
          sentCount: 1,
        },
        sourceHealth: sourceHealthForDraft(draft),
        metadata: { draftId, recapDate, adminTestSend: true },
      });

      return NextResponse.json({
        ok: true,
        runId: runContext.runId,
        draftId,
        recapDate,
        sentTo: targetUserId,
        sections,
        text,
      });
    } catch (error) {
      await failDailyBriefRun(
        runContext,
        error,
        "EXECUTIVE_DAILY_BRIEF_ADMIN_TEST_SEND_FAILED",
      );
      throw error;
    }
  },
);
