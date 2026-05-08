export type RetrievalWeightScoringRow = {
  id: string;
  project_id: number | null;
  tool_name: string;
  source_document_id: string | null;
  source_chunk_id: string | null;
  query_signature: string;
  action: "boost" | "downrank_review";
  weight_multiplier: number;
  confidence: number;
};

export function normalizeRetrievalWeightQuerySignature(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((word) => word.length > 2)
    .slice(0, 10)
    .join(" ");
}

export function retrievalWeightMultiplierForItem(
  item: {
    sourceDocumentId: string | null;
    sourceChunkId: string | null;
  },
  weights: RetrievalWeightScoringRow[],
): { multiplier: number; weightIds: string[] } {
  const matching = weights.filter((weight) => {
    if (weight.source_chunk_id && item.sourceChunkId) {
      return weight.source_chunk_id === item.sourceChunkId;
    }
    if (weight.source_document_id && item.sourceDocumentId) {
      return weight.source_document_id === item.sourceDocumentId;
    }
    return false;
  });

  if (matching.length === 0) {
    return { multiplier: 1, weightIds: [] };
  }

  const multiplier = matching.reduce((current, weight) => {
    const bounded = Math.min(1.5, Math.max(0.65, Number(weight.weight_multiplier) || 1));
    return current * bounded;
  }, 1);

  return {
    multiplier: Math.min(1.5, Math.max(0.65, multiplier)),
    weightIds: matching.map((weight) => weight.id),
  };
}
