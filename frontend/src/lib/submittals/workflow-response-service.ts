import { z } from "zod";

import { GuardrailError } from "@/lib/guardrails/errors";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const SUBMITTAL_WORKFLOW_RESPONSE_STATUSES = [
  "Approved",
  "Approved as Noted",
  "Revise and Resubmit",
  "Rejected",
  "Reviewed - No Exception",
] as const;

export const submittalWorkflowResponseStatusSchema = z.enum(
  SUBMITTAL_WORKFLOW_RESPONSE_STATUSES,
);

export type SubmittalWorkflowResponseStatus = z.infer<
  typeof submittalWorkflowResponseStatusSchema
>;

type WorkflowSupabaseClient = SupabaseClient<Database>;
type JsonValue = Database["public"]["Tables"]["submittal_history"]["Insert"]["metadata"];

interface RecordWorkflowResponseInput {
  supabase: WorkflowSupabaseClient;
  projectId: number;
  submittalId: string;
  stepId: string;
  userId: string;
  responseStatus: SubmittalWorkflowResponseStatus;
  comments: string | null;
  where: string;
}

function assertProjectId(projectId: number, where: string) {
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new GuardrailError({
      code: "INVALID_INPUT",
      where,
      message: "Project id must be a positive integer.",
    });
  }
}

function historySource(where: string) {
  return where.includes("ai-review") ? "ai_review" : "workflow";
}

async function insertWorkflowResponseHistory({
  supabase,
  submittalId,
  projectId,
  userId,
  previousStatus,
  newStatus,
  responseId,
  stepId,
  responseStatus,
  comments,
  where,
}: {
  supabase: WorkflowSupabaseClient;
  submittalId: string;
  projectId: number;
  userId: string;
  previousStatus: string | null;
  newStatus: string | null;
  responseId: string;
  stepId: string;
  responseStatus: SubmittalWorkflowResponseStatus;
  comments: string | null;
  where: string;
}) {
  const { error } = await supabase.from("submittal_history").insert({
    submittal_id: submittalId,
    action: "workflow_response_recorded",
    actor_id: userId,
    actor_type: "user",
    previous_status: previousStatus,
    new_status: newStatus,
    description: `Workflow response recorded: ${responseStatus}`,
    changes: {
      response_status: responseStatus,
      comments_present: Boolean(comments?.trim()),
    } as JsonValue,
    metadata: {
      project_id: projectId,
      workflow_step_id: stepId,
      response_id: responseId,
      source: historySource(where),
    } as JsonValue,
    occurred_at: new Date().toISOString(),
  });

  if (error) {
    throw new GuardrailError({
      code: "DB_ERROR",
      where,
      message: `Could not write submittal workflow response history: ${error.message}`,
    });
  }
}

export async function recordSubmittalWorkflowResponse({
  supabase,
  projectId,
  submittalId,
  stepId,
  userId,
  responseStatus,
  comments,
  where,
}: RecordWorkflowResponseInput) {
  assertProjectId(projectId, where);

  const { data: submittal, error: submittalError } = await supabase
    .from("submittals")
    .select("id, project_id, status")
    .eq("id", submittalId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (submittalError) {
    throw new GuardrailError({
      code: "DB_ERROR",
      where,
      message: `Could not load submittal before recording response: ${submittalError.message}`,
    });
  }

  if (!submittal) {
    throw new GuardrailError({
      code: "NOT_FOUND",
      where,
      message: "Submittal not found for this project.",
    });
  }

  const { data: workflowStep, error: workflowStepError } = await supabase
    .from("submittal_workflow_steps")
    .select("id")
    .eq("id", stepId)
    .eq("submittal_id", submittalId)
    .maybeSingle();

  if (workflowStepError) {
    throw new GuardrailError({
      code: "DB_ERROR",
      where,
      message: `Could not load workflow step: ${workflowStepError.message}`,
    });
  }

  if (!workflowStep) {
    throw new GuardrailError({
      code: "NOT_FOUND",
      where,
      message: "Workflow step not found for this submittal.",
    });
  }

  const { data: assignedResponse, error: assignedResponseError } =
    await supabase
      .from("submittal_responses")
      .select("id")
      .eq("submittal_id", submittalId)
      .eq("workflow_step_id", stepId)
      .eq("responder_id", userId)
      .eq("response_status", "Pending")
      .maybeSingle();

  if (assignedResponseError) {
    throw new GuardrailError({
      code: "DB_ERROR",
      where,
      message: `Could not load assigned workflow response: ${assignedResponseError.message}`,
    });
  }

  if (!assignedResponse) {
    throw new GuardrailError({
      code: "SUBMITTAL_WORKFLOW_NOT_ASSIGNED",
      where,
      status: 403,
      message: "You are not assigned to a pending response on this workflow step.",
    });
  }

  const now = new Date().toISOString();
  const { data: response, error: responseError } = await supabase
    .from("submittal_responses")
    .update({
      response_status: responseStatus,
      comments,
      responded_at: now,
      updated_at: now,
    })
    .eq("id", assignedResponse.id)
    .select("id, response_status")
    .single();

  if (responseError) {
    throw new GuardrailError({
      code: "DB_ERROR",
      where,
      message: `Could not record workflow response: ${responseError.message}`,
    });
  }

  const { data: steps, error: stepsError } = await supabase
    .from("submittal_workflow_steps")
    .select(
      "id, step_order, step_type, submittal_responses(responder_id, response_status)",
    )
    .eq("submittal_id", submittalId)
    .order("step_order", { ascending: true });

  if (stepsError) {
    throw new GuardrailError({
      code: "DB_ERROR",
      where,
      message: `Could not advance submittal workflow: ${stepsError.message}`,
    });
  }

  const currentStep = steps?.find((step) => step.id === stepId);
  const currentResponses = currentStep?.submittal_responses ?? [];
  const allCurrentResolved =
    currentResponses.length > 0 &&
    currentResponses.every((item) => item.response_status !== "Pending");

  let nextSubmittalStatus: string | null = submittal.status ?? null;

  if (currentStep && allCurrentResolved) {
    const nextStep = steps?.find(
      (step) => step.step_order > currentStep.step_order,
    );
    const pendingResponder = nextStep?.submittal_responses?.find(
      (item) => item.response_status === "Pending",
    );

    const submittalPatch = pendingResponder
      ? {
          ball_in_court: pendingResponder.responder_id,
          updated_at: now,
        }
      : {
          status: "Closed",
          ball_in_court: null,
          updated_at: now,
        };
    nextSubmittalStatus = "status" in submittalPatch ? "Closed" : submittal.status;

    const { error: updateSubmittalError } = await supabase
      .from("submittals")
      .update(submittalPatch)
      .eq("id", submittalId)
      .eq("project_id", projectId);

    if (updateSubmittalError) {
      throw new GuardrailError({
        code: "DB_ERROR",
        where,
        message: `Could not update submittal workflow state: ${updateSubmittalError.message}`,
      });
    }
  }

  await insertWorkflowResponseHistory({
    supabase,
    submittalId,
    projectId,
    userId,
    previousStatus: submittal.status ?? null,
    newStatus: nextSubmittalStatus,
    responseId: response.id,
    stepId,
    responseStatus,
    comments,
    where,
  });

  return response;
}
