export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withApiGuardrails, parseJsonBody } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import { createOutlookIntakeServiceClient } from "@/lib/supabase/service";
import { BrandonAssistantReviewPayloadSchema } from "@/lib/email-assistant/brandon-review";
import type { Database, Json } from "@/types/database.types";

type AssistantReviewInsert =
  Database["public"]["Tables"]["outlook_email_assistant_reviews"]["Insert"];

export const POST = withApiGuardrails<{ emailId: string }>(
  "email-inbox/[emailId]/assistant-review#POST",
  async ({ request, params }) => {
    const supabase = await createClient();
    const intakeService = createOutlookIntakeServiceClient();
    const user = await getApiRouteUser();

    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "email-inbox/[emailId]/assistant-review#POST",
        message: "Authentication required.",
      });
    }

    const { emailId: rawId } = await params;
    const emailId = Number.parseInt(rawId, 10);

    if (!Number.isFinite(emailId) || emailId <= 0) {
      throw new GuardrailError({
        code: "VALIDATION_ERROR",
        where: "email-inbox/[emailId]/assistant-review#POST",
        message: "Invalid email ID.",
        status: 400,
      });
    }

    const parsed = await parseJsonBody(
      request,
      BrandonAssistantReviewPayloadSchema,
      "email-inbox/[emailId]/assistant-review#POST",
    );

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.is_admin === true;

    const { data: email, error: fetchError } = await intakeService
      .from("outlook_email_intake")
      .select("id, graph_message_id, mailbox_user_id")
      .eq("id", emailId)
      .is("deleted_at", null)
      .maybeSingle();

    if (fetchError || !email) {
      throw new GuardrailError({
        code: "NOT_FOUND",
        where: "email-inbox/[emailId]/assistant-review#POST",
        message: "Email not found.",
        status: 404,
      });
    }

    if (!isAdmin && email.mailbox_user_id !== user.email) {
      throw new GuardrailError({
        code: "FORBIDDEN",
        where: "email-inbox/[emailId]/assistant-review#POST",
        message: "Not authorized to review this email.",
        status: 403,
      });
    }

    const insert: AssistantReviewInsert = {
      intake_email_id: email.id,
      graph_message_id: email.graph_message_id,
      mailbox_user_id: email.mailbox_user_id,
      reviewer_id: user.id,
      reviewer_email: user.email ?? null,
      assistant_action: parsed.assistantAction,
      assistant_priority: parsed.assistantPriority,
      assistant_score: parsed.assistantScore ?? null,
      review_outcome: parsed.reviewOutcome,
      draft_body: parsed.draftBody ?? null,
      reviewer_note: parsed.reviewerNote ?? null,
      assistant_reason: parsed.assistantReason ?? null,
      assistant_owner: parsed.assistantOwner ?? null,
      assistant_risk: parsed.assistantRisk ?? null,
      assistant_evidence: parsed.assistantEvidence ?? null,
      source_metadata: (parsed.sourceMetadata ?? {}) as Json,
    };

    const { data: review, error: insertError } = await supabase
      .from("outlook_email_assistant_reviews")
      .insert(insert)
      .select("id, intake_email_id, review_outcome, created_at")
      .single();

    if (insertError) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "email-inbox/[emailId]/assistant-review#POST",
        message: insertError.message,
      });
    }

    return NextResponse.json(review, { status: 201 });
  },
);
