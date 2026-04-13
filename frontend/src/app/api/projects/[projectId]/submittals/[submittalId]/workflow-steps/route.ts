import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string; submittalId: string }>;
}

const addStepSchema = z.object({
  user_id: z.string().uuid(),
  step_type: z.string().min(1),
  required: z.boolean().optional().default(true),
});

/**
 * GET /api/projects/[projectId]/submittals/[submittalId]/workflow-steps
 * Returns all workflow steps for a submittal, with their responses.
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/submittals/[submittalId]/workflow-steps#GET",
  async ({ params }) => {
    const { submittalId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("submittal_workflow_steps")
      .select(`*, submittal_responses(*)`)
      .eq("submittal_id", submittalId)
      .order("step_order", { ascending: true });

    if (error) return apiErrorResponse(error);
    return NextResponse.json(data ?? []);
  },
);

/**
 * POST /api/projects/[projectId]/submittals/[submittalId]/workflow-steps
 * Adds a new workflow step and creates a Pending response row for the user.
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/submittals/[submittalId]/workflow-steps#POST",
  async ({ request, params }) => {
  
    const { projectId: _projectId, submittalId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/submittals/[submittalId]/workflow-steps#POST", message: "Authentication required." });
    }

    const body = await request.json();
    const { user_id, step_type } = addStepSchema.parse(body);

    // Determine next step_order
    const { data: existingSteps } = await supabase
      .from("submittal_workflow_steps")
      .select("step_order")
      .eq("submittal_id", submittalId)
      .order("step_order", { ascending: false })
      .limit(1);

    const maxOrder = existingSteps?.[0]?.step_order ?? 0;
    const nextOrder = maxOrder + 1;

    // Insert the step
    const { data: step, error: stepError } = await supabase
      .from("submittal_workflow_steps")
      .insert({
        submittal_id: submittalId,
        step_order: nextOrder,
        step_type,
      })
      .select()
      .single();

    if (stepError) {
      return apiErrorResponse(stepError);
    }

    // Insert a Pending response for the user
    const { error: responseError } = await supabase
      .from("submittal_responses")
      .insert({
        submittal_id: submittalId,
        workflow_step_id: step.id,
        responder_id: user_id,
        response_status: "Pending",
      });

    if (responseError) {
      return apiErrorResponse(responseError);
    }

    return NextResponse.json(step, { status: 201 });
    },
);
