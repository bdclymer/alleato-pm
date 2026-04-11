import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

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
 * Upserts a response for the current user on a workflow step.
 * Also advances ball_in_court to the next step's first pending user.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { submittalId, stepId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { response_status, comments } = respondSchema.parse(body);

    // Upsert response for this user on this step
    const { data: response, error: responseError } = await supabase
      .from("submittal_responses")
      .upsert(
        {
          submittal_id: submittalId,
          workflow_step_id: stepId,
          responder_id: user.id,
          response_status,
          comments: comments ?? null,
          responded_at: new Date().toISOString(),
        },
        { onConflict: "workflow_step_id,responder_id" },
      )
      .select()
      .single();

    if (responseError) {
      return apiErrorResponse(responseError);
    }

    // Advance ball_in_court: only advance when ALL responses on current step are non-Pending
    const { data: steps } = await supabase
      .from("submittal_workflow_steps")
      .select(
        `id, step_order, step_type, submittal_responses(responder_id, response_status)`,
      )
      .eq("submittal_id", submittalId)
      .order("step_order", { ascending: true });

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
            await supabase
              .from("submittals")
              .update({
                ball_in_court: pendingResponder.responder_id,
                updated_at: new Date().toISOString(),
              })
              .eq("id", submittalId);
          } else {
            // No more pending steps — auto-close the submittal
            await supabase
              .from("submittals")
              .update({
                status: "Closed",
                ball_in_court: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", submittalId);
          }
        }
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      );
    }
    return apiErrorResponse(error);
  }
}
