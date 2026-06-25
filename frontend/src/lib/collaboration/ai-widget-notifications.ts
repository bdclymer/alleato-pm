import type { Json } from "@/types/database.types";

export const AI_WIDGET_NOTIFICATION_KINDS = [
  "ai_assistant_welcome",
  "ai_action_ready",
  "rfi_attention",
  "change_request_review_needed",
] as const;

export type AiWidgetNotificationKind =
  (typeof AI_WIDGET_NOTIFICATION_KINDS)[number];

export type AiWidgetNotificationMetadata = {
  prompt?: string;
  actionLabel?: string;
  source?: string;
};

export type AiWidgetNotificationCandidate = {
  id?: string;
  kind: string;
  readAt: string | null;
  metadata?: Json | null;
};

export type AiWidgetNotificationDraft = {
  id: string;
  prompt: string;
  actionLabel?: string;
  source?: string;
};

const AI_WIDGET_NOTIFICATION_KIND_SET = new Set<string>(
  AI_WIDGET_NOTIFICATION_KINDS,
);

export function isAiWidgetNotificationKind(
  kind: string,
): kind is AiWidgetNotificationKind {
  return AI_WIDGET_NOTIFICATION_KIND_SET.has(kind);
}

export function getAiWidgetNotificationMetadata(
  metadata: Json | null | undefined,
): AiWidgetNotificationMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  const record = metadata as Record<string, unknown>;

  return {
    prompt:
      typeof record.prompt === "string" && record.prompt.trim()
        ? record.prompt.trim()
        : undefined,
    actionLabel:
      typeof record.actionLabel === "string" && record.actionLabel.trim()
        ? record.actionLabel.trim()
        : undefined,
    source:
      typeof record.source === "string" && record.source.trim()
        ? record.source.trim()
        : undefined,
  };
}

export function isUnreadAiWidgetNotification(
  notification: AiWidgetNotificationCandidate,
): boolean {
  return (
    !notification.readAt && isAiWidgetNotificationKind(notification.kind)
  );
}

export function getUnreadAiWidgetNotifications<
  T extends AiWidgetNotificationCandidate,
>(notifications: T[]): T[] {
  return notifications.filter(isUnreadAiWidgetNotification);
}

export function getFirstUnreadAiWidgetNotificationDraft<
  T extends AiWidgetNotificationCandidate & { id: string },
>(notifications: T[]): AiWidgetNotificationDraft | null {
  for (const notification of getUnreadAiWidgetNotifications(notifications)) {
    const metadata = getAiWidgetNotificationMetadata(notification.metadata);
    if (!metadata.prompt) continue;

    return {
      id: notification.id,
      prompt: metadata.prompt,
      actionLabel: metadata.actionLabel,
      source: metadata.source,
    };
  }

  return null;
}
