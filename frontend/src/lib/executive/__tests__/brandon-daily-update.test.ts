import {
  getHitDateAnchor,
  getRecencyAnchor,
} from "../brandon-daily-update";

jest.mock("@/lib/ai/providers", () => ({
  getLanguageModel: jest.fn(),
}));

jest.mock("@/lib/ai/tools/tool-utils", () => ({
  EMBEDDING: "mock-embedding",
  generateEmbedding: jest.fn(),
  getOpenAI: jest.fn(),
}));

describe("teams recency anchoring", () => {
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
});
