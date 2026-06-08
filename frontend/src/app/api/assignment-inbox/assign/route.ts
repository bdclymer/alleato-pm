export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJsonBody, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  extractTitleKeywords,
  recordAttributionAssignmentFeedback,
} from "@/lib/ai/services/feedback-event-service";

const WHERE = "api.assignment-inbox.assign.POST";

const AssignSchema = z.object({
  sourceTable: z.enum(["document_metadata", "outlook_email_intake"]),
  itemId: z.string().trim().min(1),
  projectId: z.number().int().positive(),
  suggestedProjectId: z.number().int().positive().nullable().optional(),
});

export const POST = withApiGuardrails(WHERE, async ({ request }) => {
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: WHERE,
      message: "Sign in before assigning items to a project.",
      status: 401,
    });
  }

  const body = await parseJsonBody(request, AssignSchema, WHERE);
  const supabase = createServiceClient();

  // Resolve + validate the destination project.
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", body.projectId)
    .single();

  if (projectError || !project) {
    throw new GuardrailError({
      code: "VALIDATION_ERROR",
      where: WHERE,
      message: "Selected project does not exist.",
      status: 400,
      details: projectError?.message,
    });
  }

  let contentType = "document";
  let fromEmail: string | null = null;
  let title: string | null = null;

  if (body.sourceTable === "document_metadata") {
    const { data: doc, error: docError } = await supabase
      .from("document_metadata")
      .select("id, title, file_name, type, category, host_email, organizer_email")
      .eq("id", body.itemId)
      .maybeSingle();

    if (docError || !doc) {
      throw new GuardrailError({
        code: "NOT_FOUND",
        where: WHERE,
        message: "Item not found.",
        status: 404,
        details: docError?.message,
      });
    }

    contentType = deriveContentType(doc.type, doc.category);
    fromEmail = doc.host_email ?? doc.organizer_email ?? null;
    title = doc.title ?? doc.file_name ?? null;

    const { error: updateError } = await supabase
      .from("document_metadata")
      .update({ project_id: project.id, project: project.name })
      .eq("id", body.itemId);

    if (updateError) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: WHERE,
        message: "Failed to assign the item to the project.",
        details: updateError.message,
      });
    }
  } else {
    const emailId = Number(body.itemId);
    if (!Number.isInteger(emailId) || emailId <= 0) {
      throw new GuardrailError({
        code: "VALIDATION_ERROR",
        where: WHERE,
        message: "Invalid email id.",
        status: 400,
      });
    }

    const { data: email, error: emailError } = await supabase
      .from("outlook_email_intake")
      .select("id, subject, from_email")
      .eq("id", emailId)
      .is("deleted_at", null)
      .maybeSingle();

    if (emailError || !email) {
      throw new GuardrailError({
        code: "NOT_FOUND",
        where: WHERE,
        message: "Item not found.",
        status: 404,
        details: emailError?.message,
      });
    }

    contentType = "email";
    fromEmail = email.from_email ?? null;
    title = email.subject ?? null;

    const { error: updateError } = await supabase
      .from("outlook_email_intake")
      .update({
        project_id: project.id,
        match_status: "matched",
        assignment_method: "manual",
        assignment_confidence: 1.0,
      })
      .eq("id", emailId);

    if (updateError) {
      throw new GuardrailError({
        code: "UPSTREAM_FAILURE",
        where: WHERE,
        message: "Failed to assign the email to the project.",
        details: updateError.message,
      });
    }
  }

  // Record the manual assignment so the learning loop can mine it for patterns.
  // Feedback recording must never block the assignment itself.
  try {
    await recordAttributionAssignmentFeedback({
      userId: user.id,
      projectId: project.id,
      projectName: project.name,
      sourceTable: body.sourceTable,
      sourceRecordId: String(body.itemId),
      contentType,
      fromEmail,
      titleKeywords: extractTitleKeywords(title),
      suggestedProjectId: body.suggestedProjectId ?? null,
      matchedSuggestion:
        body.suggestedProjectId != null &&
        body.suggestedProjectId === project.id,
    });
  } catch (feedbackError) {
    console.error(`[${WHERE}] feedback recording failed`, feedbackError);
  }

  return NextResponse.json({
    success: true,
    project: { id: project.id, name: project.name },
  });
});

function deriveContentType(
  type: string | null,
  category: string | null,
): "meeting" | "teams" | "document" {
  const t = (type ?? "").toLowerCase();
  const c = (category ?? "").toLowerCase();
  if (t === "meeting" || t.includes("meeting")) return "meeting";
  if (t.startsWith("teams") || c === "teams_message" || c.includes("teams")) {
    return "teams";
  }
  return "document";
}
