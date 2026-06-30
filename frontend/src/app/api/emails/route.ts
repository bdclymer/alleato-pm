import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import {
  createOutlookIntakeServiceClient,
  createServiceClient,
} from "@/lib/supabase/service";
import { deriveBrandonEmailAssistantDecision } from "@/lib/email-assistant/brandon-triage";
import { NextResponse } from "next/server";

/**
 * Global Emails feed.
 *
 * Reads the LIVE inbox (`outlook_email_intake`, AI Database) — current to today.
 * The old PM-APP `project_emails` projection this used to read was abandoned
 * when the Outlook sync moved to the AI DB (it silently stopped ~2026-06-16),
 * leaving the page stale. The Triage inbox already reads this same live source.
 * App-composed drafts (a handful) are not surfaced in this list; they're
 * authored from the project email composer.
 *
 * The response shape mirrors the previous project_emails contract so the Emails
 * UI is unchanged.
 */

const MAX_EMAILS = 1000;

interface IntakeRow {
  id: number;
  project_id: number | null;
  subject: string | null;
  body: string | null;
  body_html: string | null;
  body_text: string | null;
  from_name: string | null;
  from_email: string | null;
  to_list: string[] | null;
  cc_list: string[] | null;
  received_at: string | null;
  has_attachments: boolean | null;
  graph_message_id: string | null;
  mailbox_user_id: string | null;
  conversation_id: string | null;
  created_at: string | null;
}

interface AssistantReviewRow {
  id: string;
  intake_email_id: number;
  assistant_action: "reply" | "delegate" | "watch" | "ignore" | null;
  assistant_priority: "urgent" | "high" | "normal" | "low" | null;
  assistant_score: number | null;
  assistant_reason: string | null;
  assistant_owner: string | null;
  assistant_risk: string | null;
  assistant_evidence: string | null;
  review_outcome: "draft_copied" | "draft_edited" | "skipped" | "delegated" | "watched" | "marked_no_action";
  reviewer_note: string | null;
  draft_body: string | null;
  source_metadata: unknown;
  created_at: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseProjectAssignmentFeedback(value: unknown): {
  status: "correct" | "incorrect" | "unreviewed";
  correctedProjectId: number | null;
} {
  if (!isRecord(value)) {
    return { status: "unreviewed", correctedProjectId: null };
  }

  const status =
    value.status === "correct" || value.status === "incorrect"
      ? value.status
      : "unreviewed";
  const correctedProjectId =
    typeof value.correctedProjectId === "number" &&
    Number.isInteger(value.correctedProjectId)
      ? value.correctedProjectId
      : null;

  return { status, correctedProjectId };
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseFieldFeedback(value: unknown) {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const parseVerdict = (field: string) =>
    record[field] === "correct" || record[field] === "incorrect"
      ? record[field]
      : "unreviewed";

  return {
    action: parseVerdict("action"),
    priority: parseVerdict("priority"),
    category: parseVerdict("category"),
    project: parseVerdict("project"),
    owner: parseVerdict("owner"),
    reason: parseVerdict("reason"),
    score: parseVerdict("score"),
  };
}

function defaultAssistantCategory(action: string | null | undefined): string | null {
  switch (action) {
    case "reply":
      return "Reply Needed";
    case "delegate":
      return "To Delegate";
    case "watch":
      return "Watching";
    case "ignore":
      return "No Action";
    default:
      return null;
  }
}

export const GET = withApiGuardrails("emails#GET", async ({ request }) => {
  const supabase = await createClient();
  const user = await getApiRouteUser();

  if (!user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "emails#GET",
      message: "Authentication required.",
    });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.is_admin === true;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const mailboxUserId = searchParams.get("mailboxUserId")?.trim().toLowerCase() || null;

  const intake = createOutlookIntakeServiceClient();
  let query = intake
    .from("outlook_email_intake")
    .select(
      "id,project_id,subject,body,body_html,body_text,from_name,from_email,to_list,cc_list,received_at,has_attachments,graph_message_id,mailbox_user_id,conversation_id,created_at",
    )
    .order("received_at", { ascending: false, nullsFirst: false })
    .limit(MAX_EMAILS);

  if (mailboxUserId) {
    if (!isAdmin && user.email?.toLowerCase() !== mailboxUserId) {
      throw new GuardrailError({
        code: "FORBIDDEN",
        where: "emails#GET",
        message: "Not authorized to read this mailbox.",
        status: 403,
      });
    }
    query = query.eq("mailbox_user_id", mailboxUserId);
  } else if (!isAdmin && user.email) {
    // Non-admins only see mail they sent or received.
    query = query.or(`from_email.eq.${user.email},to_list.cs.{${user.email}}`);
  } else if (!isAdmin) {
    return NextResponse.json([]);
  }

  const { data, error } = await query;
  if (error) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "emails#GET",
      message: error.message,
    });
  }

  const rows = (data ?? []) as unknown as IntakeRow[];
  const appService = createServiceClient();

  // Real (non-inline) attachments only. Outlook/Graph's has_attachments flag is
  // true for inline images (signature logos), which falsely shows a paperclip on
  // emails with no actual file. Drive the icon off real attachment rows instead.
  const emailIds = rows.map((r) => r.id);
  const emailsWithRealAttachments = new Set<number>();
  if (emailIds.length > 0) {
    const { data: attachmentRows } = await intake
      .from("outlook_email_intake_attachments")
      .select("intake_email_id")
      .in("intake_email_id", emailIds)
      .or("is_inline.is.null,is_inline.eq.false");
    for (const a of attachmentRows ?? []) {
      if (typeof a.intake_email_id === "number") emailsWithRealAttachments.add(a.intake_email_id);
    }
  }

  const latestReviewByEmailId = new Map<number, AssistantReviewRow>();
  if (emailIds.length > 0) {
    const { data: reviewRows, error: reviewError } = await appService
      .from("outlook_email_assistant_reviews")
      .select(
        "id,intake_email_id,assistant_action,assistant_priority,assistant_score,assistant_reason,assistant_owner,assistant_risk,assistant_evidence,review_outcome,reviewer_note,draft_body,source_metadata,created_at",
      )
      .in("intake_email_id", emailIds)
      .order("created_at", { ascending: false });

    if (reviewError) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "emails#GET",
        message: reviewError.message,
      });
    }

    for (const review of (reviewRows ?? []) as AssistantReviewRow[]) {
      if (!latestReviewByEmailId.has(review.intake_email_id)) {
        latestReviewByEmailId.set(review.intake_email_id, review);
      }
    }
  }

  // Resolve project names from the PM APP in one batch.
  const projectIds = Array.from(
    new Set(rows.map((r) => r.project_id).filter((id): id is number => typeof id === "number")),
  );
  const projects = new Map<number, { id: number; name: string | null; project_number: string | null }>();
  if (projectIds.length > 0) {
    const { data: projectRows } = await appService
      .from("projects")
      .select("id,name,project_number")
      .in("id", projectIds);
    for (const p of projectRows ?? []) {
      projects.set(p.id as number, {
        id: p.id as number,
        name: (p.name as string | null) ?? null,
        project_number: (p.project_number as string | null) ?? null,
      });
    }
  }

  const emails = rows
    .filter((r) => (status ? "Received" === status : true))
    .map((r) => {
      const latestReview = latestReviewByEmailId.get(r.id) ?? null;
      const derivedDecision = deriveBrandonEmailAssistantDecision({
        subject: r.subject,
        bodyText: r.body_text ?? r.body,
        fromEmail: r.from_email,
        fromName: r.from_name,
        toList: r.to_list,
        ccList: r.cc_list,
        mailboxUserId: r.mailbox_user_id,
        hasAttachments: emailsWithRealAttachments.has(r.id),
        receivedAt: r.received_at,
      });
      const reviewMetadata = isRecord(latestReview?.source_metadata)
        ? latestReview.source_metadata
        : {};
      const assistantAction = latestReview?.assistant_action ?? derivedDecision.action;
      const assistantPriority = latestReview?.assistant_priority ?? derivedDecision.priority;
      const assistantCategory =
        nullableString(reviewMetadata.sandboxCategory) ??
        defaultAssistantCategory(assistantAction);

      return {
        id: r.id,
        project_id: r.project_id,
        subject: r.subject || "(no subject)",
        body: r.body_text || r.body,
        body_html: r.body_html,
        from_name: r.from_name,
        from_email: r.from_email,
        to_list: r.to_list,
        cc_list: r.cc_list,
        bcc_list: null,
        status: "Received" as const,
        sent_at: null,
        received_at: r.received_at,
        is_private: null,
        is_starred: null,
        has_attachments: emailsWithRealAttachments.has(r.id),
        related_tool: null,
        related_id: null,
        distribution_group: null,
        thread_id: r.conversation_id,
        graph_message_id: r.graph_message_id,
        mailbox_user_id: r.mailbox_user_id,
        conversation_id: r.conversation_id,
        assistant_action: assistantAction,
        assistant_priority: assistantPriority,
        assistant_category: assistantCategory,
        assistant_score: latestReview?.assistant_score ?? derivedDecision.score,
        assistant_reason: latestReview?.assistant_reason ?? derivedDecision.reason,
        assistant_owner: latestReview?.assistant_owner ?? derivedDecision.owner,
        assistant_risk: latestReview?.assistant_risk ?? derivedDecision.risk,
        assistant_evidence: latestReview?.assistant_evidence ?? derivedDecision.evidence,
        assistant_rules_applied: derivedDecision.rulesApplied,
        assistant_review: latestReview
          ? {
              reviewId: latestReview.id,
              reviewOutcome: latestReview.review_outcome,
              reviewerNote: latestReview.reviewer_note ?? null,
              draftBody: latestReview.draft_body ?? null,
              assistantCategory,
              feedbackProvidedAt:
                typeof reviewMetadata.feedbackProvidedAt === "string"
                  ? reviewMetadata.feedbackProvidedAt
                  : null,
              fieldFeedback: parseFieldFeedback(reviewMetadata.fieldFeedback),
              projectAssignmentFeedback: parseProjectAssignmentFeedback(
                reviewMetadata.projectAssignmentFeedback,
              ),
            }
          : null,
        created_by: null,
        created_at: r.created_at ?? r.received_at,
        updated_at: r.created_at ?? r.received_at,
        deleted_at: null,
        project: typeof r.project_id === "number" ? (projects.get(r.project_id) ?? null) : null,
      };
    });

  return NextResponse.json(emails);
});
