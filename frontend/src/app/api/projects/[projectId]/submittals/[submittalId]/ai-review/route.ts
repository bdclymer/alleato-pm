import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { createDocumentIntelligenceTools } from "@/lib/ai/tools/document-intelligence";
import { z } from "zod";

const PostBody = z.object({
  focusArea: z.string().optional(),
});

/**
 * POST /api/projects/[projectId]/submittals/[submittalId]/ai-review
 *
 * Invokes the `reviewSubmittalAgainstDrawings` AI tool directly (server-side)
 * and returns the full structured result as JSON.
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

    const result = await reviewTool.execute!(
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

    return Response.json(result);
  },
);
