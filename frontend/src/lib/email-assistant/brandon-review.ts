import { z } from "zod";

export const BrandonReviewOutcomeSchema = z.enum([
  "draft_copied",
  "draft_edited",
  "skipped",
  "delegated",
  "watched",
  "marked_no_action",
]);

export type BrandonReviewOutcome = z.infer<typeof BrandonReviewOutcomeSchema>;

export const BrandonAssistantReviewPayloadSchema = z
  .object({
    assistantAction: z.enum(["reply", "delegate", "watch", "ignore"]),
    assistantPriority: z.enum(["urgent", "high", "normal", "low"]),
    assistantScore: z.number().finite().min(0).max(200).nullable().optional(),
    reviewOutcome: BrandonReviewOutcomeSchema,
    draftBody: z.string().trim().max(20_000).nullable().optional(),
    reviewerNote: z.string().trim().max(1_000).nullable().optional(),
    assistantReason: z.string().trim().max(1_000).nullable().optional(),
    assistantOwner: z.string().trim().max(200).nullable().optional(),
    assistantRisk: z.string().trim().max(1_000).nullable().optional(),
    assistantEvidence: z.string().trim().max(1_000).nullable().optional(),
    sourceMetadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    const draftRequired =
      value.reviewOutcome === "draft_copied" ||
      value.reviewOutcome === "draft_edited";

    if (draftRequired && !value.draftBody?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["draftBody"],
        message: "Draft body is required when recording a draft review outcome.",
      });
    }
  });

export type BrandonAssistantReviewPayload = z.infer<
  typeof BrandonAssistantReviewPayloadSchema
>;
