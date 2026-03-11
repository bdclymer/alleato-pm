import type { NotificationEvent } from "@liveblocks/node";
import type { InboxNotificationData } from "@liveblocks/core";

type TeamsNotificationPayload = {
  event: NotificationEvent;
  inboxNotification?: InboxNotificationData | null;
  appBaseUrl?: string;
};

function buildAppLink(payload: TeamsNotificationPayload): string | null {
  const baseUrl = payload.appBaseUrl;
  if (!baseUrl) {
    return null;
  }

  const roomId = payload.event.data.roomId;
  if (!roomId) {
    return null;
  }

  const safeBase = baseUrl.replace(/\/$/, "");
  const threadId = "threadId" in payload.event.data ? payload.event.data.threadId : null;

  if (!threadId) {
    return `${safeBase}/rooms/${encodeURIComponent(roomId)}`;
  }

  return `${safeBase}/rooms/${encodeURIComponent(roomId)}?threadId=${encodeURIComponent(threadId)}`;
}

function buildSummaryText(payload: TeamsNotificationPayload): string {
  const { data } = payload.event;
  const lines: string[] = [
    "Liveblocks notification",
    `Kind: ${data.kind}`,
    `Channel: ${data.channel}`,
    `Project: ${data.projectId}`,
    `Room: ${data.roomId ?? "(none)"}`,
    `User: ${data.userId}`,
    `Inbox notification: ${data.inboxNotificationId}`,
    `Triggered at: ${data.triggeredAt}`,
  ];

  if ("threadId" in data) {
    lines.push(`Thread: ${data.threadId}`);
  }

  if ("mentionId" in data) {
    lines.push(`Mention: ${data.mentionId}`);
  }

  if ("subjectId" in data) {
    lines.push(`Subject: ${data.subjectId}`);
  }

  const link = buildAppLink(payload);
  if (link) {
    lines.push(`Open: ${link}`);
  }

  return lines.join("\n");
}

async function postJson(url: string, body: unknown): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendTeamsNotification(
  webhookUrl: string,
  payload: TeamsNotificationPayload
): Promise<void> {
  const summaryText = buildSummaryText(payload);

  const messageCardPayload = {
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    summary: "Liveblocks notification",
    themeColor: "0078D4",
    sections: [
      {
        activityTitle: "Liveblocks notification",
        text: summaryText,
      },
    ],
  };

  const cardResponse = await postJson(webhookUrl, messageCardPayload);
  if (cardResponse.ok) {
    return;
  }

  // Fallback for workflows/endpoints that only accept a plain text payload.
  const textResponse = await postJson(webhookUrl, { text: summaryText });
  if (textResponse.ok) {
    return;
  }

  const cardError = await cardResponse.text().catch(() => "");
  const textError = await textResponse.text().catch(() => "");

  throw new Error(
    `Failed to send Teams notification (card: ${cardResponse.status} ${cardError}; text: ${textResponse.status} ${textError})`
  );
}
