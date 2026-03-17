import {
  Liveblocks,
  type NotificationEvent,
  WebhookHandler,
  isThreadNotificationEvent,
  isTextMentionNotificationEvent,
  isCustomNotificationEvent,
} from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";

import { sendTeamsNotification } from "@/lib/integrations/teams-notifications";
import {
  sendThreadNotificationEmail,
  sendTextMentionNotificationEmail,
  sendCustomNotificationEmail,
} from "@/lib/integrations/email-notifications";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function isEmailNotificationEvent(event: unknown): event is NotificationEvent {
  if (!event || typeof event !== "object") return false;
  const e = event as { type?: string; data?: { channel?: string } };
  return e.type === "notification" && e.data?.channel === "email";
}

function isTeamsNotificationEvent(event: unknown): event is NotificationEvent {
  if (!event || typeof event !== "object") return false;
  const e = event as { type?: string; data?: { channel?: string } };
  return e.type === "notification" && e.data?.channel === "teams";
}

export async function POST(request: NextRequest) {
  let webhookHandler: WebhookHandler;

  try {
    webhookHandler = new WebhookHandler(getRequiredEnv("LIVEBLOCKS_WEBHOOK_SECRET"));
  } catch (error) {
    console.error("[liveblocks-webhook] misconfigured secret", error);
    return NextResponse.json(
      { error: "Webhook endpoint is not configured" },
      { status: 500 }
    );
  }

  const rawBody = await request.text();

  let event: unknown;
  try {
    event = webhookHandler.verifyRequest({
      headers: request.headers,
      rawBody,
    });
  } catch (error) {
    console.warn("[liveblocks-webhook] signature verification failed", error);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  // ── Email channel ──────────────────────────────────────────────────────────

  if (isEmailNotificationEvent(event)) {
    const liveblocksSecret = process.env.LIVEBLOCKS_SECRET_KEY;
    if (!liveblocksSecret) {
      console.error("[liveblocks-webhook] LIVEBLOCKS_SECRET_KEY not set");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const liveblocks = new Liveblocks({ secret: liveblocksSecret });

    try {
      if (isThreadNotificationEvent(event)) {
        await sendThreadNotificationEmail(liveblocks, event);
      } else if (isTextMentionNotificationEvent(event)) {
        await sendTextMentionNotificationEmail(liveblocks, event);
      } else if (isCustomNotificationEvent(event)) {
        // Handles: $criticalIssue, $deadline, $statusChange, $budgetAlert,
        //          $weeklyDigest, $assignment, $approvalRequest, $ballInCourt
        await sendCustomNotificationEmail(liveblocks, event);
      }
    } catch (error) {
      console.error("[liveblocks-webhook] Email delivery failed", error);
      return NextResponse.json({ error: "Email delivery failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  }

  // ── Teams channel ──────────────────────────────────────────────────────────

  if (isTeamsNotificationEvent(event)) {
    const adaptiveCardUrl = process.env.LIVEBLOCKS_TEAMS_ADAPTIVE_CARD_URL;
    const bodyUrl = process.env.LIVEBLOCKS_TEAMS_BODY_URL;

    if (!adaptiveCardUrl && !bodyUrl) {
      console.error("[liveblocks-webhook] No Teams webhook URLs configured");
      return NextResponse.json(
        { error: "Missing Teams webhook URL" },
        { status: 500 }
      );
    }

    let inboxNotification = null;
    const liveblocksSecret = process.env.LIVEBLOCKS_SECRET_KEY;

    if (liveblocksSecret) {
      try {
        const liveblocks = new Liveblocks({ secret: liveblocksSecret });
        inboxNotification = await liveblocks.getInboxNotification({
          userId: event.data.userId,
          inboxNotificationId: event.data.inboxNotificationId,
        });
      } catch (error) {
        console.warn("[liveblocks-webhook] inbox notification enrichment failed", error);
      }
    }

    try {
      await sendTeamsNotification({ adaptiveCardUrl, bodyUrl }, {
        event,
        inboxNotification,
        appBaseUrl: process.env.LIVEBLOCKS_NOTIFICATION_BASE_URL,
      });
    } catch (error) {
      console.error("[liveblocks-webhook] Teams delivery failed", error);
      return NextResponse.json({ error: "Teams delivery failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  }

  // Unrecognised event type — acknowledge without processing
  return NextResponse.json({ ok: true, ignored: true });
}
