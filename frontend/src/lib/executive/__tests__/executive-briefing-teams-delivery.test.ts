const mockCreateServiceClient = jest.fn();
const mockSendProactiveMessage = jest.fn();

jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => mockCreateServiceClient(),
}));

jest.mock("@/lib/bot/teams-chat", () => ({
  sendProactiveMessage: (...args: unknown[]) =>
    mockSendProactiveMessage(...args),
}));

jest.mock("@/lib/executive/executive-briefing-workflow", () => ({
  CEO_EXECUTIVE_BRIEFING_RECAP_KIND: "executive_briefing",
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
        bullets: [
          "Owner approval is ready but still needs signature.",
          "Deadline pressure is now visible in the source thread.",
        ],
        recommendedAction: "Confirm the approver and deadline.",
        whyItMatters: "The project cannot move cleanly until the owner approval is signed.",
        source: "Email",
        sourceDetail: "Owner approval email",
        sourceUrl: "https://example.com/source",
        sourceId: "source-1",
        evidence: "The owner approval is ready but not signed.",
        date: "May 6, 2026",
        citations: [
          {
            source: "Email",
            sourceDetail: "Owner approval email",
            sourceUrl: "https://example.com/source",
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
  operatingBrief: {
    startHere: ["Confirm the owner approval path first."],
    hasUnusualExecutiveLoad: false,
    topExecutiveFocus: [],
    additionalMaterialItems: {
      cashMargin: [],
      scheduleField: [],
      customerOwner: [],
      subcontractorVendor: [],
      designPreconstruction: [],
      internalAccountability: [],
    },
    projectRiskRadar: [],
    cashAndMarginWatch: [],
    waitingOn: {
      brandonWaitingOn: [],
      othersWaitingOnBrandon: [],
    },
    peopleAndAccountability: [],
    importantBusinessSignals: [],
    recommendedMoves: ["Confirm the approval owner before end of day."],
    lowerPriorityMomentum: [],
  },
  sourceCoverage: [],
  retrievalNotes: [],
};

function createQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: jest.fn(() => query),
    not: jest.fn(() => query),
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
          return createQuery({
            data: {
              id: "draft-1",
              workflow_status: "approved",
              briefing_packet: packet,
            },
            error: null,
          });
        }
        return createQuery({ data: null, error: null });
      }),
    });
  });

  it("sends the latest approved stored brief to Teams", async () => {
    const result = await sendApprovedExecutiveBriefingToTeams({
      userId: "user-1",
    });

    expect(result).toMatchObject({
      ok: true,
      status: "sent",
      draftId: "draft-1",
      itemCount: 1,
    });
    expect(mockSendProactiveMessage).toHaveBeenCalledTimes(1);
  });

  it("records the sent flag after Teams delivery", async () => {
    const result = await sendApprovedExecutiveBriefingToTeams({
      userId: "user-1",
    });

    expect(result).toMatchObject({
      ok: true,
      status: "sent",
      draftId: "draft-1",
      itemCount: 1,
    });
    expect(mockSendProactiveMessage).toHaveBeenCalledWith(
      "user-1",
      expect.stringContaining("**Daily Brief -"),
    );
    expect(mockSendProactiveMessage).toHaveBeenCalledWith(
      "user-1",
      expect.stringContaining("**Needs Your Decision** (1)"),
    );
  });

  it("uses a morning greeting before noon Eastern", () => {
    const message = formatExecutiveBriefingTeamsMessage(packet, null, {
      now: new Date("2026-05-08T13:00:00.000Z"),
    });

    expect(message).toContain(
      "Good morning. **Daily Brief - Friday, May 8**",
    );
    expect(message).toContain("**Start Here**");
    expect(message).toContain("Next: Confirm the approver and deadline.");
    expect(message).toContain("Value: The project cannot move cleanly");
    expect(message).toContain("[Email - Owner approval email - May 6, 2026]");
    expect(message).not.toContain("there");
  });

  it("uses an evening greeting for the 6pm Eastern send", () => {
    const message = formatExecutiveBriefingTeamsMessage(packet, "Brandon", {
      now: new Date("2026-05-08T22:00:00.000Z"),
    });

    expect(message).toContain(
      "Good evening, Brandon! **Daily Brief - Friday, May 8**",
    );
    expect(message).not.toContain("Good morning");
  });
});
