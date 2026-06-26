import {
  getAiNotificationDeliveryPlan,
  shouldInterruptAiWidget,
} from "../ai-notification-routing";

describe("AI notification routing", () => {
  it("routes approval decisions as interrupting approval queue items", () => {
    const notification = {
      id: "1",
      kind: "ai_notification_decision",
      readAt: null,
      metadata: { eventType: "ai_change_event_awaiting_approval" },
    };

    expect(getAiNotificationDeliveryPlan(notification)).toEqual({
      tier: "interrupt",
      channels: ["approvals_queue", "in_app_widget", "notifications_center"],
      reason: "AI decision requires human review before a business action proceeds.",
    });
    expect(shouldInterruptAiWidget(notification)).toBe(true);
  });

  it("keeps memory and profile updates quiet by default", () => {
    const notification = {
      id: "2",
      kind: "ai_notification_decision",
      readAt: null,
      metadata: { eventType: "ai_memory_updated" },
    };

    expect(getAiNotificationDeliveryPlan(notification)).toEqual({
      tier: "quiet_unboxing",
      channels: ["notifications_center"],
      reason: "Notification is useful context but does not require interruption.",
    });
    expect(shouldInterruptAiWidget(notification)).toBe(false);
  });

  it("honors explicit interrupt and quiet tier metadata", () => {
    expect(
      getAiNotificationDeliveryPlan({
        id: "3",
        kind: "ai_action_ready",
        readAt: null,
        metadata: { tier: "interrupt" },
      })?.tier,
    ).toBe("interrupt");

    expect(
      getAiNotificationDeliveryPlan({
        id: "4",
        kind: "change_request_review_needed",
        readAt: null,
        metadata: { tier: "quiet_unboxing" },
      })?.tier,
    ).toBe("quiet_unboxing");
  });

  it("ignores non-AI notification kinds", () => {
    expect(
      getAiNotificationDeliveryPlan({
        id: "5",
        kind: "comment",
        readAt: null,
      }),
    ).toBeNull();
  });
});
