import type { Json } from "@/types/database.types";
import {
  AI_APPROVAL_QUEUE_NOTIFICATION_KIND,
  isAiApprovalQueueNotification,
} from "./ai-approval-queue";
import {
  getAiWidgetNotificationMetadata,
  isAiWidgetNotificationKind,
  type AiWidgetNotificationCandidate,
} from "./ai-widget-notifications";

export type AiNotificationRoutingTier = "interrupt" | "quiet_unboxing";

export type AiNotificationDeliveryChannel =
  | "approvals_queue"
  | "in_app_widget"
  | "notifications_center"
  | "teams"
  | "outlook";

export type AiNotificationDeliveryPlan = {
  tier: AiNotificationRoutingTier;
  channels: AiNotificationDeliveryChannel[];
  reason: string;
};

export type AiNotificationRoutingCandidate = AiWidgetNotificationCandidate & {
  metadata?: Json | null;
};

const INTERRUPT_EVENT_PATTERNS = [
  "awaiting_approval",
  "requires_review",
  "review_needed",
  "ready_to_send",
  "requires_response",
];

const QUIET_EVENT_PATTERNS = [
  "memory_updated",
  "profile_updated",
  "knowledge_saved",
  "sync_completed",
];

function hasPattern(value: string | undefined, patterns: string[]): boolean {
  return Boolean(value && patterns.some((pattern) => value.includes(pattern)));
}

function explicitTier(value: string | undefined): AiNotificationRoutingTier | null {
  if (value === "interrupt") return "interrupt";
  if (value === "quiet_unboxing") return "quiet_unboxing";
  return null;
}

export function getAiNotificationDeliveryPlan(
  notification: AiNotificationRoutingCandidate,
): AiNotificationDeliveryPlan | null {
  if (!isAiWidgetNotificationKind(notification.kind)) return null;

  const metadata = getAiWidgetNotificationMetadata(notification.metadata);
  const eventType = metadata.eventType;
  const tierOverride = explicitTier(metadata.tier);

  if (
    notification.kind === AI_APPROVAL_QUEUE_NOTIFICATION_KIND &&
    isAiApprovalQueueNotification(notification)
  ) {
    return {
      tier: "interrupt",
      channels: ["approvals_queue", "in_app_widget", "notifications_center"],
      reason: "AI decision requires human review before a business action proceeds.",
    };
  }

  if (tierOverride === "interrupt" || hasPattern(eventType, INTERRUPT_EVENT_PATTERNS)) {
    return {
      tier: "interrupt",
      channels: ["in_app_widget", "notifications_center"],
      reason: "Notification requires timely human attention.",
    };
  }

  if (notification.kind === "rfi_attention") {
    return {
      tier: "interrupt",
      channels: ["in_app_widget", "notifications_center"],
      reason: "RFI attention notifications can affect project response timing.",
    };
  }

  if (tierOverride === "quiet_unboxing" || hasPattern(eventType, QUIET_EVENT_PATTERNS)) {
    return {
      tier: "quiet_unboxing",
      channels: ["notifications_center"],
      reason: "Notification is useful context but does not require interruption.",
    };
  }

  return {
    tier: "quiet_unboxing",
    channels: ["notifications_center"],
    reason: "Default AI notification route is quiet until a review or response signal is present.",
  };
}

export function shouldInterruptAiWidget(
  notification: AiNotificationRoutingCandidate,
): boolean {
  const plan = getAiNotificationDeliveryPlan(notification);
  return Boolean(plan?.tier === "interrupt" && plan.channels.includes("in_app_widget"));
}
