import {
  buildExecutiveOperatingBrief,
  type BrandonBriefItem,
  getHitDateAnchor,
  getRecencyAnchor,
  loadLiveBrandonSourceCoverage,
  shouldSuppressDailyBriefAccountingItem,
} from "../brandon-daily-update";

const mockCreateServiceClient = jest.fn();

jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => mockCreateServiceClient(),
}));

jest.mock("@/lib/ai/providers", () => ({
  getLanguageModel: jest.fn(),
}));

jest.mock("@/lib/ai/tools/tool-utils", () => ({
  EMBEDDING: "mock-embedding",
  generateEmbedding: jest.fn(),
  getOpenAI: jest.fn(),
}));

describe("teams recency anchoring", () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("uses the source date for teams rows even when ingestion happened later", () => {
    const anchor = getRecencyAnchor({
      category: "teams_message",
      created_at: "2026-05-08T12:00:00.000Z",
      date: "2026-03-23T00:00:00.000Z",
      captured_at: "2026-05-07T23:50:00.000Z",
    });

    expect(anchor).toBe("2026-03-23T00:00:00.000Z");
  });

  it("falls back to captured_at and created_at only when the source date is missing", () => {
    const anchor = getRecencyAnchor({
      category: "teams_message",
      captured_at: "2026-05-08T11:00:00.000Z",
      created_at: "2026-05-08T12:00:00.000Z",
    });

    expect(anchor).toBe("2026-05-08T11:00:00.000Z");
  });

  it("uses doc_date before doc_created_at for ranked Teams hits", () => {
    const anchor = getHitDateAnchor({
      id: "hit-1",
      spec: {
        section: "needsBrandon",
        title: "Finance thread",
        query: "teams finance",
      },
      sourceGroup: {
        label: "Teams",
        sourceTypes: ["teams_dm", "teams_channel"],
        detail: "Team channels + DMs",
      },
      row: {
        doc_category: "teams_message",
        doc_date: "2026-03-23T00:00:00.000Z",
        doc_created_at: "2026-05-08T09:00:00.000Z",
      },
    } as const);

    expect(anchor).toBe("2026-03-23T00:00:00.000Z");
  });

  it("does not count stale Teams source coverage just because it was ingested recently", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-05-08T16:00:00.000Z"));
    const coverageFilters: string[] = [];

    mockCreateServiceClient.mockReturnValue({
      from: jest.fn(() => {
        let category: string | null = null;
        let type: string | null = null;
        const query = {
          select: jest.fn(() => query),
          or: jest.fn((filter: string) => {
            coverageFilters.push(filter);
            return query;
          }),
          eq: jest.fn((column: string, value: string) => {
            if (column === "category") category = value;
            if (column === "type") type = value;
            return query;
          }),
          limit: jest.fn(() => {
            if (category === "teams_message") {
              return Promise.resolve({
                data: [
                  {
                    category: "teams_message",
                    type: "teams_dm_conversation",
                    date: "2026-03-23T00:00:00.000Z",
                    created_at: "2026-05-06T21:21:31.964Z",
                    captured_at: null,
                  },
                ],
                error: null,
              });
            }

            return Promise.resolve({
              data: [],
              error: null,
            });
          }),
        };
        return query;
      }),
    });

    const coverage = await loadLiveBrandonSourceCoverage(3);
    const teams = coverage.find((source) => source.label === "Teams");

    expect(teams).toMatchObject({
      count: 0,
      status: "empty",
    });
    expect(coverageFilters).toContain(
      "date.gte.2026-05-06T00:00:00.000Z,created_at.gte.2026-05-06T00:00:00.000Z,captured_at.gte.2026-05-06T00:00:00.000Z",
    );
  });
});

function briefItem(
  title: string,
  overrides: Partial<BrandonBriefItem> = {},
): BrandonBriefItem {
  return {
    title,
    summary: `${title} summary`,
    evidenceFacts: [],
    bullets: [],
    recommendedAction: `Confirm next move for ${title}`,
    whyItMatters: `${title} affects execution.`,
    source: "Email",
    sourceDetail: `${title} source`,
    sourceId: `${title}-source`,
    evidence: `${title} evidence`,
    date: "May 11, 2026",
    citations: [
      {
        source: "Email",
        sourceDetail: `${title} source`,
        sourceId: `${title}-source`,
        evidence: `${title} evidence`,
        date: "May 11, 2026",
      },
    ],
    project: "100 Test Project",
    owner: "PM",
    status: "Open",
    tone: "watch",
    ...overrides,
  };
}

describe("executive operating brief priority lanes", () => {
  it("suppresses Acumatica money-due items from the Daily Brief", () => {
    const suppressed = shouldSuppressDailyBriefAccountingItem(
      briefItem("Overdue AR collections", {
        summary: "$490K AR with $413K overdue and 74 days past due.",
        sourceDetail: "Acumatica ERP - AR Aging Report",
        retrieval: "Financial pulse: acumatica_ar_invoices",
      }),
    );

    const allowed = shouldSuppressDailyBriefAccountingItem(
      briefItem("Permit deadline follow-up", {
        summary: "Permit package is still waiting on city review comments.",
        sourceDetail: "Weekly design coordination Exol PA",
        retrieval: "semantic search",
      }),
    );

    expect(suppressed).toBe(true);
    expect(allowed).toBe(false);
  });

  it("keeps more than three owner decisions instead of suppressing them", () => {
    const brief = buildExecutiveOperatingBrief({
      needsBrandon: Array.from({ length: 4 }, (_, index) =>
        briefItem(`Owner decision ${index + 1}`, {
          summary: `$${(index + 1) * 10000} approval decision is due today.`,
          recommendedAction: `Approve or reject owner decision ${index + 1} today.`,
          tone: "risk",
        }),
      ),
      waitingOnOthers: [],
      importantUpdates: [],
    });

    expect(brief.waitingOn.othersWaitingOnBrandon).toHaveLength(4);
    expect(brief.recommendedMoves).toHaveLength(4);
  });

  it("keeps more than five risks on the project risk radar", () => {
    const brief = buildExecutiveOperatingBrief({
      needsBrandon: [],
      waitingOnOthers: [],
      importantUpdates: Array.from({ length: 6 }, (_, index) =>
        briefItem(`Schedule risk ${index + 1}`, {
          summary: `Schedule delay risk ${index + 1} is blocked by material shortage.`,
          recommendedAction: `Escalate recovery plan ${index + 1}.`,
          tone: "risk",
        }),
      ),
    });

    expect(brief.projectRiskRadar).toHaveLength(6);
  });

  it("flows material overflow into additional material items", () => {
    const brief = buildExecutiveOperatingBrief({
      needsBrandon: [
        briefItem("Critical cash approval", {
          summary: "$250,000 invoice approval is due today.",
          recommendedAction: "Approve the invoice path today.",
          tone: "risk",
        }),
        briefItem("Schedule recovery decision", {
          summary: "Schedule recovery is blocked and needs a decision today.",
          recommendedAction: "Decide the recovery path today.",
          tone: "risk",
        }),
        briefItem("Customer escalation", {
          summary: "Owner relationship risk needs executive escalation today.",
          recommendedAction: "Call the customer today.",
          tone: "risk",
        }),
      ],
      waitingOnOthers: [],
      importantUpdates: [
        briefItem("Customer approval schedule risk", {
          summary: "Schedule delay is tied to client input.",
          recommendedAction: "Assign PM to secure the client input.",
          tone: "watch",
        }),
      ],
    });

    expect(brief.topExecutiveFocus.map((entry) => entry.item.title)).toContain(
      "Critical cash approval",
    );
    expect(
      brief.additionalMaterialItems.scheduleField.map((entry) => entry.item.title),
    ).toContain("Customer approval schedule risk");
  });

  it("ranks top executive focus by materiality", () => {
    const low = briefItem("Routine project update", {
      summary: "Routine update was completed.",
      recommendedAction: "No executive action unless it stalls.",
      tone: "neutral",
    });
    const high = briefItem("Cash collection blocker", {
      summary:
        "$500,000 payment is blocked, schedule recovery depends on approval today.",
      recommendedAction: "Call the owner and approve the recovery path today.",
      tone: "risk",
    });

    const brief = buildExecutiveOperatingBrief({
      needsBrandon: [low, high],
      waitingOnOthers: [],
      importantUpdates: [],
    });

    expect(brief.topExecutiveFocus[0]?.item.title).toBe(
      "Cash collection blocker",
    );
  });

  it("always generates recommended moves for surfaced items", () => {
    const brief = buildExecutiveOperatingBrief({
      needsBrandon: [
        briefItem("Decision without explicit action", {
          recommendedAction: undefined,
        }),
      ],
      waitingOnOthers: [],
      importantUpdates: [],
    });

    expect(brief.recommendedMoves.length).toBeGreaterThan(0);
    expect(brief.recommendedMoves[0]).toMatch(/Confirm the owner/);
  });
});
