import {
  ASSISTANT_WIDGET_TYPES,
  isAssistantWidgetPayload,
  type AssistantWidgetDataPart,
  type MeetingInsightsWidgetPayload,
  type OutlookInboxSummaryWidgetPayload,
} from "../assistant-widgets";
import { ASSISTANT_WIDGET_RENDERER_TYPES } from "@/components/ai-assistant/assistant-widget-renderer";

describe("assistant widget registry", () => {
  it("accepts every registered generative UI widget type", () => {
    for (const type of ASSISTANT_WIDGET_TYPES) {
      expect(isAssistantWidgetPayload({ type })).toBe(true);
    }
  });

  it("rejects malformed or unsupported widget payloads", () => {
    expect(isAssistantWidgetPayload(null)).toBe(false);
    expect(isAssistantWidgetPayload({})).toBe(false);
    expect(isAssistantWidgetPayload({ type: "openai_widget_builder_json" })).toBe(false);
  });

  it("keeps the payload registry and renderer registry in lockstep", () => {
    expect([...ASSISTANT_WIDGET_RENDERER_TYPES].sort()).toEqual(
      [...ASSISTANT_WIDGET_TYPES].sort(),
    );
  });

  it("accepts the source-specific meeting insights widget data part", () => {
    const widget: MeetingInsightsWidgetPayload = {
      type: "meeting_insights",
      id: "meeting-insights",
      title: "Recent meeting insights",
      subtitle: "Decisions, promises, risks, questions, and suggested follow-ups from meeting retrieval.",
      dateLabel: "Last 60 days",
      projectId: 983,
      projectName: null,
      metrics: {
        meetingCount: 1,
        decisionCount: 1,
        actionItemCount: 1,
        riskCount: 1,
        unresolvedQuestionCount: 1,
      },
      decisions: [
        {
          id: "meeting-1-decision",
          title: "Team confirmed the revised owner decision.",
          sourceTitle: "Owner coordination meeting",
          sourceHref: "/983/meetings/meeting-1",
          confidence: "medium",
        },
      ],
      promises: [
        {
          id: "meeting-1-promise",
          title: "Project Manager needs to follow up by Friday.",
          sourceTitle: "Owner coordination meeting",
          sourceHref: "/983/meetings/meeting-1",
          confidence: "medium",
        },
      ],
      risks: [
        {
          id: "meeting-1-risk",
          title: "Late response could delay procurement.",
          sourceTitle: "Owner coordination meeting",
          sourceHref: "/983/meetings/meeting-1",
          confidence: "medium",
        },
      ],
      unresolvedQuestions: [
        {
          id: "meeting-1-question",
          title: "Confirm final approval path.",
          sourceTitle: "Owner coordination meeting",
          sourceHref: "/983/meetings/meeting-1",
          confidence: "medium",
        },
      ],
      suggestedTasks: [
        {
          id: "meeting-task-1",
          title: "Project Manager needs to follow up by Friday.",
          projectId: 983,
          projectName: null,
          ownerName: "Project Manager",
          priority: "high",
          sourceType: "meeting",
          sourceTitle: "Owner coordination meeting",
          href: "/983/meetings/meeting-1",
          recommendedAction: "create_task",
          confidence: "medium",
        },
      ],
      sources: [
        {
          id: "meeting-source-1",
          title: "Owner coordination meeting",
          sourceType: "meeting",
          date: "2026-05-13T12:00:00.000Z",
          snippet: "Team confirmed the revised owner decision.",
          href: "/983/meetings/meeting-1",
          confidence: "medium",
        },
      ],
    };
    const dataPart: AssistantWidgetDataPart = {
      type: "data-assistant-widget",
      id: "assistant-widget-meeting-insights",
      data: { widget },
    };

    expect(isAssistantWidgetPayload(dataPart.data.widget)).toBe(true);
    expect(dataPart.data.widget.type).toBe("meeting_insights");
  });

  it("accepts the Outlook inbox summary generative UI widget data part", () => {
    const widget: OutlookInboxSummaryWidgetPayload = {
      type: "outlook_inbox_summary",
      id: "recent-email-inbox",
      title: "Important Outlook emails",
      subtitle: "Ranked by likely action needed, with the actual message text shown in readable cards.",
      dateLabel: "Today",
      summary: "Found 46 emails in 26 threads received today.",
      dataCutoffNote: "Data is current as of May 14, 12:12 PM CT.",
      mailbox: "bclymer@alleatogroup.com",
      totalCount: 46,
      threadCount: 26,
      actionSummary: "1 thread looks actionable. Start with RE: Closeout MTV 2 Project.",
      items: [
        {
          id: "thread-1",
          graphMessageId: "message-1",
          conversationId: "conversation-1",
          subject: "RE: Closeout MTV 2 Project",
          fromName: "Kennedy, JP",
          fromEmail: "jpkennedy@radial.com",
          senders: ["jpkennedy@radial.com", "kmass@alleatogroup.com"],
          recipients: ["kmass@alleatogroup.com", "jdawson@alleatogroup.com"],
          receivedAt: "2026-05-14T16:00:42Z",
          messageCount: 3,
          hasAttachments: true,
          attentionScore: 6,
          preview: "Ok yes please get me final bill today.",
          bodyText: "Ok yes please get me final bill today.",
          webLink: "https://outlook.office.com/mail/inbox/id/thread-1",
          projectIds: [],
          recommendedAction: "Reply with the billing/payment next step.",
          replyPrompt: "Draft a short Outlook reply to this email thread.",
          draftPrompt: "Draft a short Outlook email about this inbox item.",
        },
      ],
    };
    const dataPart: AssistantWidgetDataPart = {
      type: "data-assistant-widget",
      id: "assistant-widget-recent-email-inbox",
      data: { widget },
    };

    expect(isAssistantWidgetPayload(dataPart.data.widget)).toBe(true);
    expect(dataPart.data.widget.type).toBe("outlook_inbox_summary");
  });
});
