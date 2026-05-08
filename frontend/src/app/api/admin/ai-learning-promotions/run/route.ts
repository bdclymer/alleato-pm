import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJsonBody, withApiGuardrails } from "@/lib/guardrails/api";
import { generateRetrievalPromotionCandidates } from "@/lib/ai/services/feedback-event-service";

import { requireAdmin } from "../../intelligence-compiler/_shared";

const RunLearningPromotionsSchema = z.object({
  windowDays: z.number().int().min(1).max(90).default(30),
  minHelpfulSignals: z.number().int().min(2).max(25).default(3),
  minProblemSignals: z.number().int().min(2).max(25).default(2),
  limit: z.number().int().min(1).max(100).default(25),
  dryRun: z.boolean().default(true),
});

export const POST = withApiGuardrails(
  "api.admin.ai-learning-promotions.run.POST",
  async ({ request }) => {
    await requireAdmin("api.admin.ai-learning-promotions.run.POST");
    const body = await parseJsonBody(
      request,
      RunLearningPromotionsSchema,
      "api.admin.ai-learning-promotions.run.POST",
    );

    const result = await generateRetrievalPromotionCandidates(body);
    return NextResponse.json(result);
  },
);
