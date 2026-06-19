export const dynamic = "force-dynamic";

/**
 * POST /api/executive/daily-brief/send-teams
 *
 * Deliver the latest approved Daily Brief packet as a conversational Teams
 * message via the Archon bot. Generation is intentionally owned by the Render
 * worker so this endpoint stays short-lived and delivery-only.
 *
 * Auth: Bearer CRON_SECRET  OR  active Supabase session (any logged-in user
 *       — the admin page is already access-controlled).
 *
 * Body (all optional):
 *   { userId?: string }   — Supabase user ID to send to.
 *                           Omit to auto-resolve the first Teams-linked user
 *                           who has an active conversation ref.
 */

import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { createClient } from "@/lib/supabase/server";
import { sendOwnerBriefingToTeams } from "@/lib/executive/owner-briefing-delivery";
import {
  completeDailyBriefRun,
  failDailyBriefRun,
  recordDeliveryAttempt,
  recordDeliveryEvidence,
  recordTeamsPayloadArtifact,
  sourceHealthForDeliveryResult,
  startDailyBriefRun,
} from "@/lib/ai-ops/executive-daily-brief-ledger";

// ── Handler ───────────────────────────────────────────────────────────────────

export const POST = withApiGuardrails(
  "executive/daily-brief/send-teams#POST",
  async ({ request }): Promise<Response> => {
    // Kill switch: deactivated 2026-05-18 at user request. Default OFF.
    // Set EXECUTIVE_DAILY_BRIEF_ENABLED=true to re-enable Teams delivery.
    const enabled =
      (process.env.EXECUTIVE_DAILY_BRIEF_ENABLED ?? "false").toLowerCase() ===
      "true";
    if (!enabled) {
      const runContext = await startDailyBriefRun({
        eventType: "teams_event",
        triggerType: "teams_delivery_disabled",
        surface: "executive_daily_brief_send_teams",
        title: "Executive Daily Brief Teams delivery",
        userGoal: "Deliver the Executive Daily Brief to Teams.",
        normalizedGoal: "Record disabled Teams delivery state without sending.",
        deliveryTarget: { channel: "teams", deliveryEnabled: false },
        payload: { enabled: false },
      });
      await recordDeliveryAttempt(runContext, {
        channel: "teams",
        status: "disabled",
        failureCode: "EXECUTIVE_DAILY_BRIEF_DISABLED",
        failureMessage:
          "Executive Daily Brief Teams delivery is disabled by configuration.",
        metadata: { reason: "executive_daily_brief_disabled" },
      });
      await completeDailyBriefRun(runContext, {
        status: "skipped",
        deliveryStatus: "disabled",
        resultSummary: "Executive Daily Brief Teams delivery is disabled.",
        deliveryTarget: { channel: "teams", deliveryEnabled: false },
        sourceCounts: {},
        sourceHealth: sourceHealthForDeliveryResult({
          skipped: true,
          status: "disabled",
          reason: "executive_daily_brief_disabled",
        }),
        metadata: { reason: "executive_daily_brief_disabled" },
      });

      return NextResponse.json(
        {
          ok: true,
          skipped: true,
          status: "disabled",
          reason: "executive_daily_brief_disabled",
          runId: runContext.runId,
          message:
            "Executive Daily Brief Teams delivery is disabled. Set EXECUTIVE_DAILY_BRIEF_ENABLED=true to re-enable.",
        },
        { status: 200 },
      );
    }

    // Auth: CRON_SECRET bearer OR active session
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCronAuth = Boolean(
      cronSecret && authHeader === `Bearer ${cronSecret}`,
    );

    let isAuthorized = isCronAuth;

    if (!isAuthorized) {
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        isAuthorized = Boolean(user);
      } catch (error) {
        console.warn("[executive-briefing] Session auth check failed.", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error_code: "AUTH_EXPIRED",
          error_message: "Unauthorized",
        },
        { status: 401 },
      );
    }

    let body: { dryRun?: boolean } = {};
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text) as { dryRun?: boolean };
    } catch (error) {
      console.warn(
        "[owner-briefing] Ignoring invalid optional Teams send body.",
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }

    const runContext = await startDailyBriefRun({
      eventType: "teams_event",
      triggerType: body.dryRun ? "manual_teams_dry_run" : "manual_teams_send",
      surface: "executive_daily_brief_send_teams",
      title: "Executive Daily Brief Teams delivery",
      userGoal: "Deliver the Executive Daily Brief to Teams.",
      normalizedGoal:
        "Send or dry-run the Executive Daily Brief Teams payload and record delivery evidence.",
      deliveryTarget: { channel: "teams", dryRun: Boolean(body.dryRun) },
      payload: { dryRun: Boolean(body.dryRun), isCronAuth },
    });

    try {
      const result = await sendOwnerBriefingToTeams({ dryRun: body.dryRun });
      if (result.ok) {
        const payloadArtifact = await recordTeamsPayloadArtifact(runContext, {
          title: body.dryRun
            ? "Executive Daily Brief Teams dry-run payload"
            : "Executive Daily Brief Teams delivery payload",
          contentType: "application/vnd.microsoft.teams.card+json",
          metadata: {
            dryRun: Boolean(body.dryRun),
            sentAt: result.sentAt,
            recipientCount: result.recipients.length,
            decisionsNeeded: result.decisionsNeeded,
            actionsRequired: result.actionsRequired,
            projectsShown: result.projectsShown,
          },
        });
        const sentCount = result.recipients.filter(
          (recipient) => recipient.sent,
        ).length;
        const failedRecipientCount = result.recipients.filter(
          (recipient) => !recipient.sent && recipient.reason !== "dry_run",
        ).length;

        await recordDeliveryEvidence(runContext, result, payloadArtifact.id);
        await completeDailyBriefRun(runContext, {
          status: failedRecipientCount > 0 ? "partial_success" : "succeeded",
          deliveryStatus: body.dryRun ? "dry_run" : "sent",
          resultSummary: body.dryRun
            ? `Built Teams dry-run for ${result.recipients.length} recipient(s).`
            : `Sent Executive Daily Brief to ${sentCount}/${result.recipients.length} Teams recipient(s).`,
          deliveryTarget: {
            channel: "teams",
            dryRun: Boolean(body.dryRun),
            recipientCount: result.recipients.length,
            sentCount,
            failedRecipientCount,
          },
          sourceCounts: {
            decisionsNeeded: result.decisionsNeeded,
            actionsRequired: result.actionsRequired,
            projectsShown: result.projectsShown,
            activeProjectCount: result.sourceSummary.activeProjectCount,
            stalePacketCount: result.sourceSummary.stalePacketCount,
            recipientCount: result.recipients.length,
            sentCount,
            failedRecipientCount,
          },
          sourceHealth: sourceHealthForDeliveryResult(result),
          metadata: { sentAt: result.sentAt, dryRun: Boolean(body.dryRun) },
        });

        return NextResponse.json({ ...result, runId: runContext.runId });
      }

      await recordDeliveryEvidence(runContext, result);
      await completeDailyBriefRun(runContext, {
        status:
          result.status === "blocked" ? "partial_success" : "failed_permanent",
        deliveryStatus: result.status === "blocked" ? "blocked" : "failed",
        resultSummary: result.reason,
        deliveryTarget: { channel: "teams", dryRun: Boolean(body.dryRun) },
        sourceCounts: {},
        sourceHealth: sourceHealthForDeliveryResult(result),
        metadata: { reason: result.reason },
      });

      return NextResponse.json(
        { ...result, runId: runContext.runId },
        {
          status: result.status === "blocked" ? 400 : 500,
        },
      );
    } catch (error) {
      await failDailyBriefRun(
        runContext,
        error,
        "EXECUTIVE_DAILY_BRIEF_TEAMS_SEND_FAILED",
      );
      throw error;
    }
  },
);
