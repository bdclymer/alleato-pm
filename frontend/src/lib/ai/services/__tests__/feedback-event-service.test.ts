import { generateRetrievalPromotionCandidates } from "../feedback-event-service";
import { createServiceClient } from "@/lib/supabase/service";

jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: jest.fn(),
}));

type RetrievalFeedbackFixture = {
  id: string;
  created_at: string;
  user_id: string | null;
  project_id: number | null;
  target_id: string | null;
  session_id: string | null;
  tool_name: string;
  query_text: string;
  source_document_id: string | null;
  source_chunk_id: string | null;
  rank: number | null;
  score: number | null;
  cited: boolean;
  user_referenced: boolean;
  used_in_answer: boolean;
  outcome: string;
  metadata: Record<string, unknown>;
};

const createServiceClientMock = createServiceClient as jest.Mock;

function retrievalFeedback(
  overrides: Partial<RetrievalFeedbackFixture>,
): RetrievalFeedbackFixture {
  return {
    id: crypto.randomUUID(),
    created_at: "2026-05-07T14:00:00.000Z",
    user_id: null,
    project_id: 983,
    target_id: null,
    session_id: null,
    tool_name: "semanticSearch",
    query_text: "What is the sprinkler delay risk?",
    source_document_id: "doc-1",
    source_chunk_id: "chunk-1",
    rank: 1,
    score: 0.82,
    cited: true,
    user_referenced: false,
    used_in_answer: true,
    outcome: "helpful",
    metadata: {
      title: "Sprinkler Delay Meeting",
    },
    ...overrides,
  };
}

function mockSupabase(params: {
  retrievalRows: RetrievalFeedbackFixture[];
  existingPromotions?: Array<{ proposed_learning: Record<string, unknown> }>;
}) {
  const retrievalQuery = {
    select: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({
      data: params.retrievalRows,
      error: null,
    }),
  };
  const promotionsQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockResolvedValue({
      data: params.existingPromotions ?? [],
      error: null,
    }),
  };

  createServiceClientMock.mockReturnValue({
    from: jest.fn((table: string) => {
      if (table === "ai_retrieval_feedback") return retrievalQuery;
      if (table === "ai_learning_promotions") return promotionsQuery;
      throw new Error(`Unexpected table: ${table}`);
    }),
  });
}

describe("feedback event service retrieval promotions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a boost candidate from repeated helpful cited retrieval feedback", async () => {
    mockSupabase({
      retrievalRows: [
        retrievalFeedback({ id: "11111111-1111-4111-8111-111111111111" }),
        retrievalFeedback({ id: "22222222-2222-4222-8222-222222222222" }),
        retrievalFeedback({ id: "33333333-3333-4333-8333-333333333333" }),
      ],
    });

    const result = await generateRetrievalPromotionCandidates({
      dryRun: true,
      minHelpfulSignals: 3,
    });

    expect(result.candidatesFound).toBe(1);
    expect(result.candidatesCreated).toBe(0);
    expect(result.candidates[0]?.promotionType).toBe("retrieval_weight");
    expect(result.candidates[0]?.projectId).toBe(983);
    expect(result.candidates[0]?.sourceEventIds).toHaveLength(3);
    expect(result.candidates[0]?.proposedLearning).toMatchObject({
      action: "boost",
      toolName: "semanticSearch",
      sourceDocumentId: "doc-1",
      sourceChunkId: "chunk-1",
      querySignature: "what the sprinkler delay risk",
      signalCounts: {
        helpful: 3,
        problem: 0,
        total: 3,
      },
    });
  });

  it("does not create a candidate from a single weak signal", async () => {
    mockSupabase({
      retrievalRows: [
        retrievalFeedback({
          cited: false,
          used_in_answer: false,
        }),
      ],
    });

    const result = await generateRetrievalPromotionCandidates({
      dryRun: true,
      minHelpfulSignals: 3,
      minProblemSignals: 2,
    });

    expect(result.candidatesFound).toBe(0);
    expect(result.groupsInspected).toBe(1);
  });

  it("creates a down-rank review candidate from repeated problem outcomes", async () => {
    mockSupabase({
      retrievalRows: [
        retrievalFeedback({
          id: "44444444-4444-4444-8444-444444444444",
          outcome: "unsupported",
          cited: false,
          used_in_answer: false,
        }),
        retrievalFeedback({
          id: "55555555-5555-4555-8555-555555555555",
          outcome: "wrong_project",
          cited: false,
          used_in_answer: false,
        }),
      ],
    });

    const result = await generateRetrievalPromotionCandidates({
      dryRun: true,
      minProblemSignals: 2,
    });

    expect(result.candidatesFound).toBe(1);
    expect(result.candidates[0]?.riskLevel).toBe("medium");
    expect(result.candidates[0]?.proposedLearning).toMatchObject({
      action: "downrank_review",
      signalCounts: {
        helpful: 0,
        problem: 2,
        total: 2,
      },
    });
  });
});
