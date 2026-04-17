import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { z } from "zod";

import { apiErrorResponse } from "@/lib/api-error";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ projectId: string; submittalId: string; stepId: string }>;
}

const respondSchema = z.object({
  response_status: z.enum([
    "Approved",
    "Approved as Noted",
    "Revise and Resubmit",
    "Rejected",
    "Reviewed - No Exception",
  ]),
  comments: z.string().nullable().optional(),
});

/**
 * POST /api/projects/[projectId]/submittals/[submittalId]/workflow-steps/[stepId]/respond
 * Records a response for the current assigned user on a workflow step.
 * Also advances ball_in_court to the next step's first pending user.
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/submittals/[submittalId]/workflow-steps/[stepId]/respond#POST",
  async ({ request, params }) => {
  
    const { submittalId, stepId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/submittals/[submittalId]/workflow-steps/[stepId]/respond#POST", message: "Authentication required." });
    }

    const body = await request.json();
    const { response_status, comments } = respondSchema.parse(body);

    // Ensure the workflow step exists on this submittal before writing a response.
    const { data: workflowStep, error: workflowStepError } = await supabase
      .from("submittal_workflow_steps")
      .select("id")
      .eq("id", stepId)
      .eq("submittal_id", submittalId)
      .maybeSingle();

    if (workflowStepError) {
      return apiErrorResponse(workflowStepError);
    }

    if (!workflowStep) {
      return NextResponse.json(
        { error: "Workflow step not found for this submittal." },
        { status: 404 },
      );
    }

    // Enforce reviewer ownership: only the assigned responder can submit.
    const { data: existingResponse, error: existingResponseError } = await supabase
      .from("submittal_responses")
      .select("id")
      .eq("submittal_id", submittalId)
      .eq("workflow_step_id", stepId)
      .eq("responder_id", user.id)
      .maybeSingle();

    if (existingResponseError) {
      return apiErrorResponse(existingResponseError);
    }

    if (!existingResponse) {
      return NextResponse.json(
        { error: "You are not assigned to review this workflow step." },
        { status: 403 },
      );
    }

    const { data: response, error: responseError } = await supabase
      .from("submittal_responses")
      .update({
        response_status,
        comments: comments ?? null,
        responded_at: new Date().toISOString(),
      })
      .eq("id", existingResponse.id)
      .select()
      .single();

    if (responseError) {
      return apiErrorResponse(responseError);
    }

    // Advance ball_in_court: only advance when ALL responses on current step are non-Pending
    const { data: steps, error: stepsError } = await supabase
      .from("submittal_workflow_steps")
      .select(
        `id, step_order, step_type, submittal_responses(responder_id, response_status)`,
      )
      .eq("submittal_id", submittalId)
      .order("step_order", { ascending: true });

    if (stepsError) {
      return apiErrorResponse(stepsError);
    }

    if (steps) {
      const currentStep = steps.find((s) => s.id === stepId);

      if (currentStep) {
        // Check if ALL responses on current step are non-Pending
        const currentResponses = currentStep.submittal_responses ?? [];
        const allCurrentResolved =
          currentResponses.length > 0 &&
          currentResponses.every((r) => r.response_status !== "Pending");

        if (allCurrentResolved) {
          // Find next step with pending responses
          const nextStep = steps.find(
            (s) => s.step_order > currentStep.step_order,
          );

          const pendingResponder = nextStep?.submittal_responses?.find(
            (r) => r.response_status === "Pending",
          );

          if (pendingResponder) {
            // Advance BIC to next step's first pending responder
            const { error: updateBicError } = await supabase
              .from("submittals")
              .update({
                ball_in_court: pendingResponder.responder_id,
                updated_at: new Date().toISOString(),
              })
              .eq("id", submittalId);

            if (updateBicError) {
              return apiErrorResponse(updateBicError);
            }
          } else {
            // No more pending steps — auto-close the submittal
            const { error: closeSubmittalError } = await supabase
              .from("submittals")
              .update({
                status: "Closed",
                ball_in_court: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", submittalId);

            if (closeSubmittalError) {
              return apiErrorResponse(closeSubmittalError);
            }
          }
        }
      }
    }

    return NextResponse.json(response);
    },
);
