/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AssistantWidgetRenderer } from "../assistant-widget-renderer";
import { apiFetch } from "@/lib/api-client";
import type {
  OutlookEmailDraftWidgetPayload,
  OutlookInboxSummaryWidgetPayload,
} from "@/lib/ai/assistant-widgets";

jest.mock("@/lib/api-client", () => ({
  apiFetch: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const apiFetchMock = apiFetch as jest.MockedFunction<typeof apiFetch>;

function createdOutlookDraftWidget(
  overrides: Partial<OutlookEmailDraftWidgetPayload> = {},
): OutlookEmailDraftWidgetPayload {
  return {
    type: "outlook_email_draft",
    id: "draft-message-id",
    title: "Outlook email draft",
    status: "created",
    mailboxUserId: "bclymer@alleatogroup.com",
    mode: "reply",
    subject: "RE: Brookville Road Goodwill",
    body: "Thanks. Let's make sure we understand the actual scope change.",
    toRecipients: [{ email: "jdawson@alleatogroup.com" }],
    ccRecipients: [{ email: "kgreen@alleatogroup.com" }],
    bccRecipients: [],
    replyToGraphMessageId: "source-message-id",
    outlookDraftId: "draft-message-id",
    outlookWebLink: "https://outlook.office.com/mail/deeplink/compose/draft-message-id",
    voiceProfile: {
      path: "docs/ai-plan/brandon-email-voice-profile.md",
      version: "2026-05-13",
    },
    adaptiveCard: {},
    confirmPrompt: "Open it in Outlook to review and send.",
    ...overrides,
  };
}

describe("AssistantWidgetRenderer Outlook draft feedback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiFetchMock.mockResolvedValue({ success: true });
  });

  it("records good-tone feedback for a created Outlook draft", async () => {
    render(
      <AssistantWidgetRenderer
        widget={createdOutlookDraftWidget()}
        onSubmit={jest.fn()}
        onEditDraft={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /good tone/i }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/api/ai-assistant/email-draft-feedback",
        expect.objectContaining({
          method: "POST",
          body: expect.any(String),
        }),
      );
    });

    const payload = JSON.parse(
      String(apiFetchMock.mock.calls[0]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(payload).toMatchObject({
      mailboxUserId: "bclymer@alleatogroup.com",
      graphDraftMessageId: "draft-message-id",
      graphSourceMessageId: "source-message-id",
      subject: "RE: Brookville Road Goodwill",
      signal: "good",
      reasonCategory: "good_tone",
      voiceProfilePath: "docs/ai-plan/brandon-email-voice-profile.md",
      voiceProfileVersion: "2026-05-13",
    });
    expect(screen.getByText("Draft feedback recorded")).toBeInTheDocument();
  });

  it("does not show draft feedback controls before the Outlook draft exists", () => {
    render(
      <AssistantWidgetRenderer
        widget={createdOutlookDraftWidget({
          id: "outlook-email-draft-preview",
          status: "draft",
          outlookDraftId: null,
          outlookWebLink: null,
        })}
        onSubmit={jest.fn()}
        onEditDraft={jest.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /good tone/i })).not.toBeInTheDocument();
  });
});

describe("AssistantWidgetRenderer Outlook inbox summary", () => {
  function inboxWidget(): OutlookInboxSummaryWidgetPayload {
    return {
      type: "outlook_inbox_summary",
      id: "recent-email-inbox",
      title: "Important Outlook emails",
      subtitle: "Ranked by likely action needed, with the actual message text shown in readable cards.",
      dateLabel: "Today",
      summary: "Found 46 emails in 26 threads received today.",
      dataCutoffNote: "Outlook email sync last completed May 14, 1:12 PM ET.",
      mailbox: "bclymer@alleatogroup.com",
      totalCount: 46,
      threadCount: 26,
      actionSummary: "1 thread looks actionable.",
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
          bodyText: [
            "Ok yes please get me final bill today.",
            "",
            "From: Kebba Mass <kmass@alleatogroup.com>",
            "Subject: RE: Closeout MTV 2 Project",
          ].join("\n"),
          webLink: "https://outlook.office.com/mail/inbox/id/thread-1",
          projectIds: [1009],
          recommendedAction: "Reply with the billing/payment next step.",
          replyPrompt: [
            "OUTLOOK_INBOX_CARD_ACTION",
            "Mode: reply",
            "Draft a short Outlook reply to this email thread.",
            "Subject: RE: Closeout MTV 2 Project",
            "Graph message ID: message-1",
          ].join("\n"),
          draftPrompt: [
            "OUTLOOK_INBOX_CARD_ACTION",
            "Mode: new",
            "Draft a short Outlook email about this inbox item.",
            "Subject: RE: Closeout MTV 2 Project",
          ].join("\n"),
        },
      ],
    };
  }

  it("renders Outlook inbox results as readable expandable email cards", () => {
    const onSubmit = jest.fn();
    render(
      <AssistantWidgetRenderer
        widget={inboxWidget()}
        onSubmit={onSubmit}
        onEditDraft={jest.fn()}
      />,
    );

    expect(screen.getByLabelText("Important Outlook emails")).toBeInTheDocument();
    expect(screen.getByText("RE: Closeout MTV 2 Project")).toBeInTheDocument();
    expect(screen.getByText(/Next step:/)).toBeInTheDocument();
    expect(screen.getByText("Ok yes please get me final bill today.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^reply$/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.stringContaining("OUTLOOK_INBOX_CARD_ACTION"));
    expect(onSubmit).toHaveBeenCalledWith(expect.stringContaining("Graph message ID: message-1"));
    expect(screen.getByRole("link", { name: /outlook/i })).toHaveAttribute(
      "href",
      "https://outlook.office.com/mail/inbox/id/thread-1",
    );
  });
});
