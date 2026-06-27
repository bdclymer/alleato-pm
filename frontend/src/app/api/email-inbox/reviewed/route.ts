export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import {
  createOutlookIntakeServiceClient,
  createServiceClient,
} from "@/lib/supabase/service";

interface ProjectRow {
  id: number;
  name: string | null;
  project_number: string | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

export const GET = withApiGuardrails("email-inbox/reviewed#GET", async () => {
  const supabase = await createClient();
  const appService = createServiceClient();
  const intakeService = createOutlookIntakeServiceClient();
  const user = await getApiRouteUser();

  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "email-inbox/reviewed#GET",
      message: "Authentication required.",
    });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    throw new GuardrailError({
      code: "FORBIDDEN",
      where: "email-inbox/reviewed#GET",
      message: "Admin access required.",
      status: 403,
    });
  }

  // Fetch reviews from PM APP, most recent first
  const { data: reviews, error: reviewError } = await appService
    .from("outlook_email_assistant_reviews")
    .select(
      "id, intake_email_id, review_outcome, reviewer_note, assistant_reason, created_at, graph_message_id",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (reviewError) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "email-inbox/reviewed#GET",
      message: reviewError.message,
    });
  }

  if (!reviews || reviews.length === 0) {
    return NextResponse.json([]);
  }

  // Fetch corresponding intake emails from AI DB
  const intakeIds = [...new Set(reviews.map((r) => r.intake_email_id))];

  const { data: intakeEmails, error: intakeError } = await intakeService
    .from("outlook_email_intake")
    .select(
      "id, subject, from_name, from_email, received_at, project_id, source_metadata, body_html, body_text, body, web_link",
    )
    .in("id", intakeIds);

  if (intakeError) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "email-inbox/reviewed#GET",
      message: intakeError.message,
    });
  }

  const emailById = new Map(
    (intakeEmails ?? []).map((e) => [e.id, e]),
  );

  // Fetch projects
  const projectIds = [
    ...new Set(
      (intakeEmails ?? [])
        .map((e) => e.project_id)
        .filter((id): id is number => Number.isInteger(id)),
    ),
  ];

  const projectsById = new Map<number, ProjectRow>();
  if (projectIds.length > 0) {
    const { data: projectRows } = await appService
      .from("projects")
      .select("id, name, project_number")
      .in("id", projectIds);
    for (const p of (projectRows ?? []) as ProjectRow[]) {
      projectsById.set(p.id, p);
    }
  }

  const enriched = reviews.map((review) => {
    const email = emailById.get(review.intake_email_id);
    const sourceMeta = isRecord(email?.source_metadata)
      ? email.source_metadata
      : {};
    const inbox = isRecord(sourceMeta._inbox) ? sourceMeta._inbox : {};

    const project = email?.project_id
      ? projectsById.get(email.project_id) ?? null
      : null;

    return {
      reviewId: review.id,
      id: review.intake_email_id,
      subject: email?.subject ?? "(no subject)",
      fromName: email?.from_name ?? null,
      fromEmail: email?.from_email ?? null,
      receivedAt: email?.received_at ?? null,
      bodyHtml: email?.body_html ?? null,
      bodyText: email?.body_text ?? null,
      body: email?.body ?? null,
      webLink: email?.web_link ?? null,
      reviewOutcome: review.review_outcome,
      reviewerNote: review.reviewer_note ?? null,
      assistantReason: review.assistant_reason ?? null,
      reviewedAt: review.created_at,
      starred: (inbox.starred as boolean) ?? false,
      tags: (inbox.tags as string[]) ?? [],
      project: project
        ? {
            id: project.id,
            name: project.name,
            projectNumber: project.project_number,
          }
        : null,
    };
  });

  return NextResponse.json(enriched);
});
