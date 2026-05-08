const mockCreateServiceClient = jest.fn();
const mockSendProactiveMessage = jest.fn();
const mockGetExecutiveBriefingDashboard = jest.fn();

jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => mockCreateServiceClient(),
}));

jest.mock("@/lib/bot/teams-chat", () => ({
  sendProactiveMessage: (...args: unknown[]) =>
    mockSendProactiveMessage(...args),
}));

jest.mock("@/lib/executive/executive-briefing-workflow", () => ({
  CEO_EXECUTIVE_BRIEFING_RECAP_KIND: "executive_briefing",
  getExecutiveBriefingDashboard: (...args: unknown[]) =>
    mockGetExecutiveBriefingDashboard(...args),
}));

jest.mock("../brandon-daily-update", () => ({
  DEFAULT_EXECUTIVE_WINDOW_DAYS: 3,
}));

import {
  formatExecutiveBriefingTeamsMessage,
  sendApprovedExecutiveBriefingToTeams,
} from "../executive-briefing-teams-delivery";
import type { BrandonDailyUpdatePacket } from "../brandon-daily-update";

const packet: BrandonDailyUpdatePacket = {
  generatedAt: "2026-05-06T12:00:00.000Z",
  windowDays: 3,
  retrievalOrder: [],
  sections: {
    needsBrandon: [
      {
        title: "Signed owner approval is needed",
        summary: "The owner approval is ready but not signed.",
        bullets: [],
        recommendedAction: "Confirm the approver and deadline.",
        source: "Email",
        sourceDetail: "Owner approval email",
        sourceId: "source-1",
        evidence: "The owner approval is ready but not signed.",
        date: "May 6, 2026",
        citations: [
          {
            source: "Email",
            sourceDetail: "Owner approval email",
            sourceId: "source-1",
            evidence: "The owner approval is ready but not signed.",
            date: "May 6, 2026",
          },
        ],
        project: "983 Test Project",
      },
    ],
    waitingOnOthers: [],
    importantUpdates: [],
  },
  sourceCoverage: [],
  retrievalNotes: [],
};

function createQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: jest.fn(() => query),
    order: jest.fn(() => query),
    limit: jest.fn(() => query),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    eq: jest.fn(() => query),
    update: jest.fn(() => query),
    then: jest.fn((resolve: (value: typeof result) => void) => resolve(result)),
  };
  return query;
}

describe("executive briefing Teams delivery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServiceClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === "bot_user_mappings") {
          return createQuery({
            data: { display_name: "Brandon Harrison" },
            error: null,
          });
        }
        if (table === "daily_recaps") {
          return createQuery({ data: null, error: null });
        }
        return createQuery({ data: null, error: null });
      }),
    });
  });

  it("does not send draft briefings to Teams", async () => {
    mockGetExecutiveBriefingDashboard.mockResolvedValue({
      draft: {
        id: "draft-1",
        workflowStatus: "draft",
        packet,
      },
    });

    const result = await sendApprovedExecutiveBriefingToTeams({
      userId: "user-1",
    });

    expect(result).toEqual({
      ok: false,
      status: "skipped",
      reason: "Executive briefing draft is not approved.",
      draftId: "draft-1",
      workflowStatus: "draft",
      userId: "user-1",
    });
    expect(mockSendProactiveMessage).not.toHaveBeenCalled();
  });

  it("sends approved briefings and records the sent flag", async () => {
    mockGetExecutiveBriefingDashboard.mockResolvedValue({
      draft: {
        id: "draft-1",
        workflowStatus: "approved",
        packet,
      },
    });

    const result = await sendApprovedExecutiveBriefingToTeams({
      userId: "user-1",
    });

    expect(result).toMatchObject({
      ok: true,
      status: "sent",
      draftId: "draft-1",
      userId: "user-1",
      recipientName: "Brandon",
      itemCount: 1,
    });
    expect(mockSendProactiveMessage).toHaveBeenCalledWith(
      "user-1",
      expect.stringContaining("approved daily operating brief"),
    );
  });

  it("uses a neutral greeting when no real recipient name exists", () => {
    const message = formatExecutiveBriefingTeamsMessage(packet, null);

    expect(message).toContain(
      "Good morning. Here's your approved daily operating brief",
    );
    expect(message).not.toContain("there");
  });
});
