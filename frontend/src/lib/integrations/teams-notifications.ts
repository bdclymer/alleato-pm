import type { NotificationEvent } from "@liveblocks/node";
import type { InboxNotificationData } from "@liveblocks/client";
import { fetchWithPolicy } from "@/lib/guardrails/dependency";
import { generateRequestId } from "@/lib/guardrails/observability";

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
  const threadId =
    "threadId" in payload.event.data ? payload.event.data.threadId : null;

  if (!threadId) {
    return `${safeBase}/rooms/${encodeURIComponent(roomId)}`;
  }

  return `${safeBase}/rooms/${encodeURIComponent(roomId)}?threadId=${encodeURIComponent(threadId)}`;
}

function humanKind(kind: string): string {
  const map: Record<string, string> = {
    thread: "New thread comment",
    textMention: "You were mentioned",
    $thread: "New thread comment",
    $textMention: "You were mentioned",
  };
  return map[kind] ?? kind;
}

function buildFacts(
  payload: TeamsNotificationPayload
): Array<{ title: string; value: string }> {
  const { data } = payload.event;
  const facts: Array<{ title: string; value: string }> = [];

  facts.push({ title: "Type", value: humanKind(data.kind) });

  if (data.roomId) {
    facts.push({ title: "Room", value: data.roomId });
  }

  if ("threadId" in data && data.threadId) {
    facts.push({ title: "Thread", value: String(data.threadId) });
  }

  if ("mentionId" in data && data.mentionId) {
    facts.push({ title: "Mention", value: String(data.mentionId) });
  }

  if (data.userId) {
    facts.push({ title: "User", value: data.userId });
  }

  facts.push({
    title: "Time",
    value: new Date(data.triggeredAt).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  });

  return facts;
}

function buildAdaptiveCard(payload: TeamsNotificationPayload): unknown {
  const link = buildAppLink(payload);
  const facts = buildFacts(payload);
  const title = humanKind(payload.event.data.kind);

  const body: unknown[] = [
    {
      type: "TextBlock",
      text: title,
      weight: "Bolder",
      size: "Medium",
      wrap: true,
    },
    {
      type: "FactSet",
      facts: facts.map((f) => ({ title: f.title, value: f.value })),
    },
  ];

  const actions: unknown[] = [];

  if (link) {
    actions.push({
      type: "Action.OpenUrl",
      title: "Open in Alleato",
      url: link,
    });
  }

  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body,
          ...(actions.length > 0 ? { actions } : {}),
        },
      },
    ],
  };
}

function buildPlainTextFallback(payload: TeamsNotificationPayload): string {
  const { data } = payload.event;
  const lines: string[] = [
    `**${humanKind(data.kind)}**`,
    `Room: ${data.roomId ?? "(none)"}`,
    `User: ${data.userId}`,
  ];

  if ("threadId" in data) {
    lines.push(`Thread: ${data.threadId}`);
  }

  const link = buildAppLink(payload);
  if (link) {
    lines.push(`[Open in Alleato](${link})`);
  }

  return lines.join("\n\n");
}

async function postJson(url: string, body: unknown): Promise<Response> {
  const requestId = generateRequestId();
  return fetchWithPolicy(
    requestId,
    "teams-notifications#postJson",
    "teams-webhook",
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    {
      timeoutMs: 10_000,
      maxRetries: 2,
      backoffMs: 500,
    },
  );
}

export type TeamsWebhookUrls = {
  /** Adaptive Card workflow URL (Power Automate trigger) */
  adaptiveCardUrl?: string;
  /** Body/text workflow URL (Power Automate trigger) */
  bodyUrl?: string;
};

export async function sendTeamsNotification(
  webhookUrls: string | TeamsWebhookUrls,
  payload: TeamsNotificationPayload
): Promise<void> {
  const urls: TeamsWebhookUrls =
    typeof webhookUrls === "string"
      ? { adaptiveCardUrl: webhookUrls }
      : webhookUrls;

  const errors: string[] = [];

  // Send Adaptive Card to the dedicated Adaptive Card workflow
  if (urls.adaptiveCardUrl) {
    const adaptiveCard = buildAdaptiveCard(payload);
    const response = await postJson(urls.adaptiveCardUrl, adaptiveCard);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      errors.push(`adaptiveCard: ${response.status} ${body}`);
    }
  }

  // Send plain-text body to the dedicated body workflow
  if (urls.bodyUrl) {
    const text = buildPlainTextFallback(payload);
    const response = await postJson(urls.bodyUrl, { text });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      errors.push(`body: ${response.status} ${body}`);
    }
  }

  // If no URLs were configured at all, that's an error
  if (!urls.adaptiveCardUrl && !urls.bodyUrl) {
    throw new Error("No Teams webhook URLs configured");
  }

  // If ALL configured webhooks failed, throw
  const configuredCount =
    (urls.adaptiveCardUrl ? 1 : 0) + (urls.bodyUrl ? 1 : 0);

  if (errors.length === configuredCount) {
    throw new Error(
      `Failed to send Teams notification (${errors.join("; ")})`
    );
  }
}
