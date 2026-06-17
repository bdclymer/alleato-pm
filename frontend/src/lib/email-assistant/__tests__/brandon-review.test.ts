import { BrandonAssistantReviewPayloadSchema } from "../brandon-review";

describe("BrandonAssistantReviewPayloadSchema", () => {
  const basePayload = {
    assistantAction: "reply",
    assistantPriority: "high",
    assistantScore: 72,
    assistantReason: "External sender is asking Brandon for a response.",
    assistantOwner: "Brandon",
    assistantRisk: "Relationship follow-up.",
    assistantEvidence: "Can you confirm tomorrow?",
  } as const;

  it("accepts a copied draft review with draft body", () => {
    const parsed = BrandonAssistantReviewPayloadSchema.safeParse({
      ...basePayload,
      reviewOutcome: "draft_copied",
      draftBody: "That works. Thank You\nBrandon Clymer",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects draft outcomes without draft body", () => {
    const parsed = BrandonAssistantReviewPayloadSchema.safeParse({
      ...basePayload,
      reviewOutcome: "draft_edited",
      draftBody: "   ",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.path).toEqual(["draftBody"]);
  });

  it("accepts non-draft outcomes without draft body", () => {
    const parsed = BrandonAssistantReviewPayloadSchema.safeParse({
      ...basePayload,
      assistantAction: "delegate",
      reviewOutcome: "delegated",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects unknown outcomes", () => {
    const parsed = BrandonAssistantReviewPayloadSchema.safeParse({
      ...basePayload,
      reviewOutcome: "auto_sent",
    });

    expect(parsed.success).toBe(false);
  });
});
