import {
  formatAiApprovalQueueEventLabel,
  getAiApprovalQueueMetadata,
  getAiApprovalQueueRelatedHref,
  isAiApprovalQueueEventType,
  isAiApprovalQueueNotification,
} from "../ai-approval-queue";

describe("AI approval queue helpers", () => {
  it("accepts explicit approval and review-oriented event types", () => {
    expect(isAiApprovalQueueEventType("ai_change_event_awaiting_approval")).toBe(
      true,
    );
    expect(isAiApprovalQueueEventType("client_report_ready_to_send")).toBe(true);
    expect(isAiApprovalQueueEventType("outlook_email_requires_response")).toBe(
      true,
    );
    expect(isAiApprovalQueueEventType("custom_review_needed")).toBe(true);
  });

  it("rejects routine notification decisions", () => {
    expect(isAiApprovalQueueEventType("ai_memory_updated")).toBe(false);
    expect(isAiApprovalQueueEventType("rfi_assigned")).toBe(false);
    expect(isAiApprovalQueueEventType("routine_sync_completed")).toBe(false);
    expect(isAiApprovalQueueEventType(null)).toBe(false);
  });

  it("normalizes metadata and drops invalid values", () => {
    expect(
      getAiApprovalQueueMetadata({
        eventType: " client_report_ready_to_send ",
        requiredAction: " Review before sending. ",
        reason: " Client-facing delivery needs approval. ",
        failureLoudBehavior: " Preserve failed delivery state. ",
        source: " ai_notification_routing ",
        tier: " interrupt ",
        ignored: "value",
      }),
    ).toEqual({
      eventType: "client_report_ready_to_send",
      requiredAction: "Review before sending.",
      reason: "Client-facing delivery needs approval.",
      failureLoudBehavior: "Preserve failed delivery state.",
      source: "ai_notification_routing",
      tier: "interrupt",
    });

    expect(getAiApprovalQueueMetadata(null)).toEqual({});
    expect(getAiApprovalQueueMetadata(["bad", "metadata"])).toEqual({});
    expect(
      getAiApprovalQueueMetadata({
        eventType: 42,
        requiredAction: "",
      }),
    ).toEqual({});
  });

  it("matches only AI notification decisions with approval metadata", () => {
    expect(
      isAiApprovalQueueNotification({
        kind: "ai_notification_decision",
        metadata: { eventType: "ai_change_event_awaiting_approval" },
      }),
    ).toBe(true);

    expect(
      isAiApprovalQueueNotification({
        kind: "ai_notification_decision",
        metadata: { eventType: "ai_memory_updated" },
      }),
    ).toBe(false);

    expect(
      isAiApprovalQueueNotification({
        kind: "comment",
        metadata: { eventType: "client_report_ready_to_send" },
      }),
    ).toBe(false);
  });

  it("formats event labels for operational display", () => {
    expect(
      formatAiApprovalQueueEventLabel("ai_change_event_awaiting_approval"),
    ).toBe("Change Event Awaiting Approval");
    expect(formatAiApprovalQueueEventLabel(null)).toBe("AI review");
  });

  it("builds related record links from notification context", () => {
    expect(
      getAiApprovalQueueRelatedHref({
        projectId: 25125,
        entityType: "change_events",
        entityId: "ce-1",
      }),
    ).toBe("/25125/change-events/ce-1");

    expect(
      getAiApprovalQueueRelatedHref({
        projectId: 25125,
        entityType: "progress-reports",
        entityId: "report-1",
      }),
    ).toBe("/25125/progress-reports/report-1");

    expect(
      getAiApprovalQueueRelatedHref({
        projectId: 25125,
        entityType: "custom_records",
        entityId: null,
      }),
    ).toBe("/25125/custom-records");

    expect(
      getAiApprovalQueueRelatedHref({
        projectId: null,
        entityType: "change_events",
        entityId: "ce-1",
      }),
    ).toBeNull();
  });
});
