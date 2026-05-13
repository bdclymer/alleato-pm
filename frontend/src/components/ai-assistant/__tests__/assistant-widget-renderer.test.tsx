/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AssistantWidgetRenderer } from "../assistant-widget-renderer";
import { apiFetch } from "@/lib/api-client";
import type { OutlookEmailDraftWidgetPayload } from "@/lib/ai/assistant-widgets";

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
