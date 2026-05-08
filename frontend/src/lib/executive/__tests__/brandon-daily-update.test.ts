import {
  getHitDateAnchor,
  getRecencyAnchor,
  loadLiveBrandonSourceCoverage,
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

  it("uses created_at for teams rows when available", () => {
    const anchor = getRecencyAnchor({
      category: "teams_message",
      created_at: "2026-05-08T12:00:00.000Z",
      date: "2026-05-08T00:00:00.000Z",
      captured_at: "2026-05-07T23:50:00.000Z",
    });

    expect(anchor).toBe("2026-05-08T12:00:00.000Z");
  });

  it("falls back to captured_at/date for teams rows when created_at is missing", () => {
    const anchor = getRecencyAnchor({
      category: "teams_message",
      date: "2026-05-07T00:00:00.000Z",
      captured_at: "2026-05-08T11:00:00.000Z",
    });

    expect(anchor).toBe("2026-05-08T11:00:00.000Z");
  });

  it("uses doc_created_at before doc_date for ranked Teams hits", () => {
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
        doc_date: "2026-05-05T00:00:00.000Z",
        doc_created_at: "2026-05-08T09:00:00.000Z",
      },
    } as const);

    expect(anchor).toBe("2026-05-08T09:00:00.000Z");
  });

  it("counts recent Teams source coverage from created_at before day-stamped date", async () => {
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
                    date: "2026-05-06T00:00:00.000Z",
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
      count: 1,
      status: "loaded",
    });
    expect(coverageFilters).toContain(
      "date.gte.2026-05-06T00:00:00.000Z,created_at.gte.2026-05-06T00:00:00.000Z,captured_at.gte.2026-05-06T00:00:00.000Z",
    );
  });
});
