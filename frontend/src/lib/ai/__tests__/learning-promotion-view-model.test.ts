import {
  isMemoryReviewPromotion,
  promotionMatchesKind,
  readLearning,
  type AiLearningPromotionRow,
} from "../learning-promotion-view-model";

function promotion(
  overrides: Partial<AiLearningPromotionRow>,
): AiLearningPromotionRow {
  return {
    confidence: 0.85,
    created_at: "2026-06-18T12:00:00.000Z",
    destination_record_id: null,
    destination_table: null,
    expires_at: null,
    id: "00000000-0000-4000-8000-000000000001",
    project_id: null,
    promotion_type: "workflow_rule",
    proposed_learning: {},
    review_notes: null,
    reviewed_at: null,
    reviewed_by: null,
    risk_level: "low",
    source_event_ids: [],
    status: "candidate",
    superseded_by: null,
    target_id: null,
    updated_at: "2026-06-18T12:00:00.000Z",
    ...overrides,
  };
}

describe("learning promotion view model", () => {
  it("parses memory review correction fields", () => {
    const learning = readLearning({
      action: "review_memory",
      title: "Review memory marked wrong",
      content: "Old memory text",
      memoryId: "memory-1",
      memoryType: "preference",
      visibility: "private",
      reasonCategory: "incorrect",
      reason: "This is no longer true.",
      sourceSurface: "assistant_answer_memory_trace",
      sourceRoute: "/ai-assistant",
      recommendedResolution: "Edit or expire the memory.",
    });

    expect(learning.action).toBe("review_memory");
    expect(learning.content).toBe("Old memory text");
    expect(learning.reason).toBe("This is no longer true.");
    expect(learning.sourceRoute).toBe("/ai-assistant");
  });

  it("routes review_memory workflow candidates into the Memory tab", () => {
    const candidate = promotion({
      promotion_type: "workflow_rule",
      destination_table: "ai_memories",
      proposed_learning: {
        action: "review_memory",
        content: "Incorrect remembered preference",
      },
    });

    expect(isMemoryReviewPromotion(candidate)).toBe(true);
    expect(promotionMatchesKind(candidate, "memory")).toBe(true);
    expect(promotionMatchesKind(candidate, "workflow")).toBe(false);
  });

  it("keeps non-memory workflow rules out of the Memory tab", () => {
    const candidate = promotion({
      promotion_type: "workflow_rule",
      proposed_learning: {
        action: "review_workflow",
        title: "Review workflow learning",
      },
    });

    expect(isMemoryReviewPromotion(candidate)).toBe(false);
    expect(promotionMatchesKind(candidate, "memory")).toBe(false);
    expect(promotionMatchesKind(candidate, "workflow")).toBe(true);
  });
});
