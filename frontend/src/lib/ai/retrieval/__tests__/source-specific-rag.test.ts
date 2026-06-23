import { buildSourceSpecificRagAnswer } from "../source-specific-rag";

jest.mock("@/lib/microsoft-graph/recent-teams-messages", () => ({
  fetchRecentTeamsMessagesFromGraph: jest.fn(async () => ({
    status: "checked",
    checkedMailboxes: [],
    rows: [],
  })),
}));

jest.mock("@/lib/microsoft-graph/mail", () => ({
  listOutlookInboxMessages: jest.fn(async () => ({
    ok: true,
    source: "mock",
    mailboxUserId: "mock",
    messages: [],
    fetchedAt: "2026-06-22T00:00:00.000Z",
    truncated: false,
  })),
}));

function makeDocumentMetadataClient(rows: unknown[]) {
  const chain: Record<string, jest.Mock> = {};
  for (const method of ["select", "eq", "gte", "lte", "order", "limit"]) {
    chain[method] = jest.fn(() => chain);
  }
  chain.limit = jest.fn(async () => ({ data: rows, error: null }));

  return {
    from: jest.fn((table: string) => {
      expect(table).toBe("document_metadata");
      return chain;
    }),
  };
}

function makeRagMetadataClient(rows: unknown[]) {
  const chain: Record<string, jest.Mock> = {};
  chain.select = jest.fn(() => chain);
  chain.in = jest.fn(async () => ({ data: rows, error: null }));

  return {
    from: jest.fn((table: string) => {
      expect(table).toBe("rag_document_metadata");
      return chain;
    }),
  };
}

describe("buildSourceSpecificRagAnswer Teams hydration", () => {
  it("hydrates empty stored Teams rows from RAG metadata content", async () => {
    const answer = await buildSourceSpecificRagAnswer({
      supabase: makeDocumentMetadataClient([
        {
          id: "teamsdm_today",
          title: "Teams DM Conversation: Operations",
          source: "microsoft_graph",
          category: "teams_message",
          type: "teams_dm_conversation",
          date: "2026-06-22T00:00:00+00:00",
          created_at: "2026-06-22T15:43:55+00:00",
          content: null,
          summary: null,
          overview: null,
          project_id: null,
        },
      ]) as never,
      ragSupabase: makeRagMetadataClient([
        {
          id: "teamsdm_today",
          content: "Jesse Dawson: Please make sure all subcontractor billings are entered and approved.",
          raw_text: null,
          summary: null,
          overview: null,
        },
      ]) as never,
      request: {
        kind: "recent_teams_discussions",
        label: "Teams messages",
        query: "look through teams",
        startDate: "2026-06-22",
        endDate: "2026-06-22",
        limit: 12,
      },
      scope: {
        userId: "user",
        personId: null,
        isAdmin: true,
        allowedProjectIds: [],
        allowedCompanyIds: [],
        pinnedProjectId: null,
      },
    });

    expect(answer.content).toContain(
      "Jesse Dawson: Please make sure all subcontractor billings are entered and approved.",
    );
    expect(answer.content).not.toContain("No text excerpt stored");
    expect(answer.rows[0]?.content).toContain("subcontractor billings");
  });
});
