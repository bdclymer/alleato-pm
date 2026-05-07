import {
  normalizeRetrievalWeightQuerySignature,
  retrievalWeightMultiplierForItem,
  type RetrievalWeightScoringRow,
} from "../retrieval-weight-scoring";

function weight(
  overrides: Partial<RetrievalWeightScoringRow>,
): RetrievalWeightScoringRow {
  return {
    id: "weight-1",
    project_id: 983,
    tool_name: "semanticSearch",
    source_document_id: "doc-1",
    source_chunk_id: null,
    query_signature: "sprinkler delay risk",
    action: "boost",
    weight_multiplier: 1.25,
    confidence: 0.8,
    ...overrides,
  };
}

describe("retrieval weight scoring", () => {
  it("normalizes noisy retrieval queries into stable signatures", () => {
    expect(
      normalizeRetrievalWeightQuerySignature(
        "What is the latest SPRINKLER-delay risk for Project A?",
      ),
    ).toBe("what the latest sprinkler delay risk for project");
  });

  it("matches chunk weights before document weights", () => {
    const result = retrievalWeightMultiplierForItem(
      {
        sourceDocumentId: "doc-1",
        sourceChunkId: "chunk-7",
      },
      [
        weight({ id: "document-weight", weight_multiplier: 1.1 }),
        weight({
          id: "chunk-weight",
          source_chunk_id: "chunk-7",
          weight_multiplier: 1.2,
        }),
      ],
    );

    expect(result).toEqual({
      multiplier: 1.32,
      weightIds: ["document-weight", "chunk-weight"],
    });
  });

  it("bounds combined multipliers so learning cannot dominate retrieval", () => {
    const boosted = retrievalWeightMultiplierForItem(
      {
        sourceDocumentId: "doc-1",
        sourceChunkId: null,
      },
      [
        weight({ id: "boost-1", weight_multiplier: 2 }),
        weight({ id: "boost-2", weight_multiplier: 2 }),
      ],
    );

    const downranked = retrievalWeightMultiplierForItem(
      {
        sourceDocumentId: "doc-1",
        sourceChunkId: null,
      },
      [
        weight({ id: "downrank-1", weight_multiplier: 0.1 }),
        weight({ id: "downrank-2", weight_multiplier: 0.1 }),
      ],
    );

    expect(boosted.multiplier).toBe(1.5);
    expect(downranked.multiplier).toBe(0.65);
  });
});
