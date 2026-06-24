import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { createDocumentIntelligenceTools } from "@/lib/ai/tools/document-intelligence";
import { getOpenAI } from "@/lib/ai/tools/tool-utils";
import { z } from "zod";

/**
 * GET /api/projects/[projectId]/submittals/[submittalId]/ai-review
 *
 * Returns the last saved AI review result from the database, or null if never run.
 */
export const GET = withApiGuardrails<{
  projectId: string;
  submittalId: string;
}>(
  "projects/[projectId]/submittals/[submittalId]/ai-review#GET",
  async ({ params }) => {
    const { submittalId } = params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new GuardrailError({
        code: "UNAUTHORIZED",
        where: "projects/[projectId]/submittals/[submittalId]/ai-review#GET",
        message: "Not authenticated",
      });
    }

    const { data } = await supabase
      .from("submittals")
      .select("ai_review_result, ai_review_ran_at")
      .eq("id", submittalId)
      .single();

    if (!data?.ai_review_result) {
      return Response.json(null);
    }

    return Response.json({
      ...(data.ai_review_result as Record<string, unknown>),
      _ranAt: data.ai_review_ran_at,
    });
  },
);

const PostBody = z.object({
  focusArea: z.string().optional(),
});

const ANALYSIS_PROMPT = `You are a construction submittal reviewer. Given the submittal content and relevant drawing content below, produce a structured compliance review.

Return ONLY a valid JSON object with this exact shape:
{
  "summary": "2-3 sentence overall assessment",
  "compliant": [
    { "item": "what is confirmed compliant", "drawingRef": "M111 or null", "detail": "brief explanation" }
  ],
  "conflicts": [
    { "item": "what conflicts or mismatches", "drawingRef": "M411 or null", "detail": "what the submittal says vs what the drawing requires" }
  ],
  "missing": [
    { "item": "what is required by drawings but not addressed in submittal", "drawingRef": "M501 or null", "detail": "brief explanation" }
  ],
  "recommendation": "Approve / Approve with Comments / Revise and Resubmit"
}

Keep each finding concise (1-2 sentences). Focus on technical requirements, dimensions, materials, equipment specs, and installation requirements. If you cannot determine a finding, omit it.`;

/**
 * POST /api/projects/[projectId]/submittals/[submittalId]/ai-review
 *
 * Runs the full AI submittal review:
 * 1. Assembles context via reviewSubmittalAgainstDrawings tool
 * 2. If context is ready, runs GPT-4o analysis to produce structured findings
 *
 * Body: { focusArea?: string }
 */
export const POST = withApiGuardrails<{
  projectId: string;
  submittalId: string;
}>(
  "projects/[projectId]/submittals/[submittalId]/ai-review#POST",
  async ({ request, params }) => {
    const { projectId, submittalId } = params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new GuardrailError({
        code: "UNAUTHORIZED",
        where: "projects/[projectId]/submittals/[submittalId]/ai-review#POST",
        message: "Not authenticated",
      });
    }

    let body: z.infer<typeof PostBody> = {};
    try {
      body = PostBody.parse(await request.json().catch(() => ({})));
    } catch {
      throw new GuardrailError({
        code: "BAD_REQUEST",
        where: "projects/[projectId]/submittals/[submittalId]/ai-review#POST",
        message: "Request body must be valid JSON",
      });
    }

    const tools = createDocumentIntelligenceTools(user.id, {
      pinnedProjectId: parseInt(projectId, 10),
    });

    const reviewTool = tools.reviewSubmittalAgainstDrawings;
    if (!reviewTool) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "projects/[projectId]/submittals/[submittalId]/ai-review#POST",
        message: "reviewSubmittalAgainstDrawings tool not available",
      });
    }

    const context = await reviewTool.execute!(
      {
        submittalId,
        projectId: parseInt(projectId, 10),
        focusArea: body.focusArea,
      },
      {
        toolCallId: "direct",
        messages: [],
        abortSignal: undefined,
      },
    );

    // If context isn't ready (no submittal text or drawing text), return early
    if (!context.readiness?.canCompare) {
      return Response.json({ ...context, findings: null });
    }

    // Run GPT-4o analysis on the assembled context
    let findings: {
      summary: string;
      compliant: Array<{ item: string; drawingRef: string | null; detail: string }>;
      conflicts: Array<{ item: string; drawingRef: string | null; detail: string }>;
      missing: Array<{ item: string; drawingRef: string | null; detail: string }>;
      recommendation: string;
    } | null = null;

    try {
      const openai = getOpenAI();
      const userContent = [
        `SUBMITTAL: ${context.submittal?.title ?? ""}`,
        `SUBMITTAL CONTENT:\n${context.comparisonContext.submittalText ?? ""}`,
        ``,
        `DRAWING CONTENT:\n${context.comparisonContext.drawingText ?? ""}`,
        body.focusArea ? `\nFOCUS AREA: ${body.focusArea}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: ANALYSIS_PROMPT },
          { role: "user", content: userContent },
        ],
        max_tokens: 2000,
        temperature: 0,
      });

      const raw = (response.choices[0]?.message?.content ?? "{}").trim();
      const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      findings = JSON.parse(cleaned);
    } catch (err) {
      // Analysis failure is non-fatal — return context without findings
      console.error("[ai-review] GPT-4o analysis failed:", err);
    }

    const result = { ...context, findings };

    // Persist so results survive page refresh
    await supabase
      .from("submittals")
      .update({
        ai_review_result: result as unknown as Record<string, unknown>,
        ai_review_ran_at: new Date().toISOString(),
      })
      .eq("id", submittalId);

    return Response.json(result);
  },
);
