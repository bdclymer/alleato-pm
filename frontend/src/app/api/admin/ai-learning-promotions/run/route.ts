import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJsonBody, withApiGuardrails } from "@/lib/guardrails/api";
import {
  generateEmailVoicePromotionCandidates,
  generateRetrievalPromotionCandidates,
  generateTaskPromotionCandidates,
} from "@/lib/ai/services/feedback-event-service";

import { requireAdmin } from "../../intelligence-compiler/_shared";

const RunLearningPromotionsSchema = z.object({
  scope: z.enum(["all", "retrieval", "tasks", "email_voice"]).default("all"),
  windowDays: z.number().int().min(1).max(90).default(30),
  minHelpfulSignals: z.number().int().min(2).max(25).default(3),
  minProblemSignals: z.number().int().min(2).max(25).default(2),
  minEmailVoiceSignals: z.number().int().min(2).max(25).default(2),
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

    const retrieval =
      body.scope === "all" || body.scope === "retrieval"
        ? await generateRetrievalPromotionCandidates(body)
        : null;
    const tasks =
      body.scope === "all" || body.scope === "tasks"
        ? await generateTaskPromotionCandidates(body)
        : null;
    const emailVoice =
      body.scope === "all" || body.scope === "email_voice"
        ? await generateEmailVoicePromotionCandidates({
            windowDays: body.windowDays,
            minSignals: body.minEmailVoiceSignals,
            limit: body.limit,
            dryRun: body.dryRun,
          })
        : null;

    return NextResponse.json({
      inspectedRows:
        (retrieval?.inspectedRows ?? 0) +
        (tasks?.inspectedRows ?? 0) +
        (emailVoice?.inspectedRows ?? 0),
      candidatesFound:
        (retrieval?.candidatesFound ?? 0) +
        (tasks?.candidatesFound ?? 0) +
        (emailVoice?.candidatesFound ?? 0),
      candidatesCreated:
        (retrieval?.candidatesCreated ?? 0) +
        (tasks?.candidatesCreated ?? 0) +
        (emailVoice?.candidatesCreated ?? 0),
      candidatesSkipped:
        (retrieval?.candidatesSkipped ?? 0) +
        (tasks?.candidatesSkipped ?? 0) +
        (emailVoice?.candidatesSkipped ?? 0),
      dryRun: body.dryRun,
      retrieval,
      tasks,
      emailVoice,
      candidates: [
        ...(retrieval?.candidates ?? []),
        ...(tasks?.candidates ?? []),
        ...(emailVoice?.candidates ?? []),
      ],
    });
  },
);
