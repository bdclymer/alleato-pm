import { Liveblocks, type NotificationEvent, WebhookHandler } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";

import { sendTeamsNotification } from "@/lib/integrations/teams-notifications";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function isTeamsNotificationEvent(event: unknown): event is NotificationEvent {
  if (!event || typeof event !== "object") {
    return false;
  }

  const maybeEvent = event as { type?: string; data?: { channel?: string } };

  return maybeEvent.type === "notification" && maybeEvent.data?.channel === "teams";
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

  if (!isTeamsNotificationEvent(event)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

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
      // Continue delivery even if enrichment fails.
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
