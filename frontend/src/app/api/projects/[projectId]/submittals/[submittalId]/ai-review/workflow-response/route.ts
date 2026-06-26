import { z } from "zod";

import { parseJsonBody, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import {
  recordSubmittalWorkflowResponse,
  submittalWorkflowResponseStatusSchema,
} from "@/lib/submittals/workflow-response-service";
import { createClient } from "@/lib/supabase/server";

const WHERE =
  "projects/[projectId]/submittals/[submittalId]/ai-review/workflow-response";

const postBodySchema = z.object({
  stepId: z.string().uuid(),
  responseStatus: submittalWorkflowResponseStatusSchema,
  comments: z.string().trim().max(4000).nullable().optional(),
});

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new GuardrailError({
      code: "UNAUTHORIZED",
      where: WHERE,
      message: "You must be signed in to record an AI review response.",
    });
  }

  return { supabase, user };
}

export const POST = withApiGuardrails<{
  projectId: string;
  submittalId: string;
}>(`${WHERE}#POST`, async ({ request, params }) => {
  const { projectId, submittalId } = await params;
  const { supabase, user } = await requireUser();
  const body = await parseJsonBody(request, postBodySchema, `${WHERE}#POST`);
  const projectIdNumber = Number.parseInt(projectId, 10);

  const response = await recordSubmittalWorkflowResponse({
    supabase,
    projectId: projectIdNumber,
    submittalId,
    stepId: body.stepId,
    userId: user.id,
    responseStatus: body.responseStatus,
    comments: body.comments ?? null,
    where: `${WHERE}#POST`,
  });

  return Response.json(response);
});
