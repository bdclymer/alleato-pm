import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { ingestAdminFeedbackLearning } from "@/lib/ai/services/agent-learning-service";

type AgentationAnnotation = {
  id?: string;
  annotationId?: string;
  comment?: string;
  intent?: string;
  severity?: string;
  element?: string;
  elementPath?: string;
  reactComponents?: string;
  sessionId?: string;
  pageUrl?: string;
  pagePath?: string;
  url?: string;
};

type AgentationWebhookBody = {
  event?: string;
  url?: string;
  annotation?: AgentationAnnotation;
  annotations?: AgentationAnnotation[];
  item?: AgentationAnnotation;
  items?: AgentationAnnotation[];
};

function normalizeIncomingAnnotations(body: unknown): AgentationAnnotation[] {
  if (Array.isArray(body)) {
    return body as AgentationAnnotation[];
  }

  if (!body || typeof body !== "object") {
    return [];
  }

  const typed = body as AgentationWebhookBody & AgentationAnnotation;
  const collected: AgentationAnnotation[] = [];

  if (Array.isArray(typed.annotations)) {
    collected.push(...typed.annotations);
  }
  if (Array.isArray(typed.items)) {
    collected.push(...typed.items);
  }
  if (typed.annotation && typeof typed.annotation === "object") {
    collected.push(typed.annotation);
  }
  if (typed.item && typeof typed.item === "object") {
    collected.push(typed.item);
  }

  // Fallback for single annotation-shaped payloads.
  if (collected.length === 0 && (typed.id || typed.annotationId || typed.comment || typed.elementPath)) {
    collected.push(typed);
  }

  return collected;
}

function derivePagePath(pageUrl?: string, pagePath?: string) {
  if (pagePath && pagePath.trim().length > 0) {
    return pagePath;
  }

  if (pageUrl && pageUrl.trim().length > 0) {
    try {
      return new URL(pageUrl).pathname || "/";
    } catch {
      return "/";
    }
  }

  return "/";
}

function resolveAnnotationId(annotation: AgentationAnnotation) {
  return annotation.id || annotation.annotationId || null;
}

function mapIntentToRequestType(intent?: string) {
  const value = (intent || "").toLowerCase();
  if (value === "fix") return "bug";
  if (value === "question") return "question";
  if (value === "change") return "change_request";
  return "change_request";
}

function mapSeverityToFeedbackSeverity(severity?: string) {
  const value = (severity || "").toLowerCase();
  if (value === "blocking") return "high";
  if (value === "important") return "medium";
  if (value === "suggestion") return "low";
  return "medium";
}

/**
 * Agentation webhook receiver + bidirectional status sync.
 *
 * POST — Receives annotation events from the Agentation toolbar.
 *        Each annotation becomes an admin_feedback_items row for triage + threading.
 *
 * PATCH — Syncs MCP status changes back to admin_feedback_items.
 *         Called by the agentation-watch skill when resolving/dismissing annotations.
 *
 * Uses service role client since webhooks arrive without user auth session.
 */

// ---------------------------------------------------------------------------
// POST — Create admin feedback rows from annotations
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const body = (await req.json()) as AgentationWebhookBody | AgentationAnnotation[] | AgentationAnnotation;

  // Ignore purely delete/clear events for ingestion.
  const eventName = !Array.isArray(body) && body && typeof body === "object" ? body.event : undefined;
  if (eventName === "annotation.delete" || eventName === "annotations.clear") {
    return NextResponse.json({ ignored: true, reason: eventName }, { status: 200 });
  }

  // Support both single annotations and batches
  const annotations = normalizeIncomingAnnotations(body).map((annotation) => {
    const inheritedUrl =
      !Array.isArray(body) && body && typeof body === "object" ? body.url : undefined;
    return {
      ...annotation,
      url: annotation.url || inheritedUrl,
      pageUrl: annotation.pageUrl || annotation.url || inheritedUrl,
    };
  });

  if (annotations.length === 0) {
    return NextResponse.json(
      { ignored: true, reason: "No annotations in payload", event: eventName || null },
      { status: 200 },
    );
  }

  const supabase = createServiceClient();

  // Resolve a system creator for feedback rows (admin preferred).
  const { data: adminProfile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("is_admin", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: anyProfile } = adminProfile
    ? { data: null }
    : await supabase
        .from("user_profiles")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

  const feedbackCreatorId = adminProfile?.id ?? anyProfile?.id ?? null;
  if (!feedbackCreatorId) {
    return NextResponse.json(
      { error: "No user_profiles rows available for feedback ingestion" },
      { status: 500 },
    );
  }

  let createdFeedback = 0;
  let skippedFeedback = 0;

  for (const ann of annotations) {
    const annotationId = resolveAnnotationId(ann);
    const pageUrl = ann.pageUrl || ann.url || "";
    const pagePath = derivePagePath(pageUrl, ann.pagePath);

    // Mirror into admin feedback so the annotation can have threaded comments.
    // This intentionally uses metadata.agentationId to support MCP status sync.
    if (annotationId) {
      const { data: existingFeedback } = await supabase
        .from("admin_feedback_items")
        .select("id")
        .contains("metadata", { agentationId: annotationId })
        .limit(1)
        .maybeSingle();

      if (existingFeedback) {
        // If this is an update event, keep comment in sync.
        if (eventName === "annotation.update" && ann.comment?.trim()) {
          await supabase
            .from("admin_feedback_items")
            .update({
              comment: ann.comment,
              title: ann.comment.slice(0, 100),
            })
            .eq("id", existingFeedback.id);
        }
        skippedFeedback += 1;
      } else {
        const { data: feedbackItem, error: feedbackError } = await supabase
          .from("admin_feedback_items")
          .insert({
            created_by: feedbackCreatorId,
            project_id: null,
            page_url: pageUrl,
            page_path: pagePath,
            page_title: null,
            target_id: null,
            target_selector: ann.elementPath || ann.element || "body",
            target_text: ann.element || null,
            target_tag: null,
            dom_path: ann.elementPath || null,
            target_rect: null,
            title: ann.comment?.slice(0, 100) || "Agentation annotation",
            comment: ann.comment || "No description",
            request_type: mapIntentToRequestType(ann.intent),
            severity: mapSeverityToFeedbackSeverity(ann.severity),
            status: "open",
            metadata: {
              agentationId: annotationId,
              sessionId: ann.sessionId || null,
              intent: ann.intent || null,
              severity: ann.severity || null,
              reactComponents: ann.reactComponents || null,
              element: ann.element || null,
              elementPath: ann.elementPath || null,
              ingestEvent: eventName || "unknown",
            },
          })
          .select("id, title, comment, page_path, tool_id, project_id")
          .single();

        if (feedbackError) {
          return apiErrorResponse(feedbackError);
        }
        createdFeedback += 1;
        if (feedbackItem) {
          try {
            await ingestAdminFeedbackLearning({
              feedbackItemId: feedbackItem.id,
              title: feedbackItem.title,
              comment: feedbackItem.comment,
              pagePath: feedbackItem.page_path,
              toolId:
                typeof feedbackItem.tool_id === "number"
                  ? feedbackItem.tool_id
                  : null,
              projectId:
                typeof feedbackItem.project_id === "number"
                  ? feedbackItem.project_id
                  : null,
              status: "candidate",
            });
          } catch (learningError) {
            console.error("[Agentation] Candidate learning ingestion failed", learningError);
          }
        }
      }
    }
  }

  return NextResponse.json(
    {
      created: createdFeedback,
      skipped: skippedFeedback,
    },
    { status: 201 },
  );
}

// ---------------------------------------------------------------------------
// PATCH — Bidirectional status sync (MCP resolve/dismiss → admin_feedback_items)
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const {
    agentationId,
    status,
    summary,
  }: {
    agentationId?: string;
    status?: "resolved" | "dismissed" | "in_progress";
    summary?: string;
  } = body;

  if (!agentationId) {
    return NextResponse.json(
      { error: "agentationId is required" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // Map MCP status → admin feedback status
  const statusMap: Record<string, string> = {
    resolved: "resolved",
    dismissed: "closed",
    in_progress: "in_progress",
  };

  const feedbackStatus = status ? statusMap[status] || "in_progress" : "in_progress";

  // Find the feedback item by agentationId stored in metadata
  const { data: items, error: findError } = await supabase
    .from("admin_feedback_items")
    .select("id, status, metadata")
    .contains("metadata", { agentationId })
    .limit(1);

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }

  if (!items || items.length === 0) {
    // No matching feedback item — that's fine, not all annotations go through
    // the admin feedback pipeline (non-admin users, for example)
    return NextResponse.json({ matched: false, message: "No matching feedback item found" });
  }

  const feedbackItem = items[0];
  const existingMetadata =
    typeof feedbackItem.metadata === "object" &&
    feedbackItem.metadata !== null &&
    !Array.isArray(feedbackItem.metadata)
      ? (feedbackItem.metadata as Record<string, unknown>)
      : {};

  // Update the feedback item status
  const { error: updateError } = await supabase
    .from("admin_feedback_items")
    .update({
      status: feedbackStatus,
      ...(summary
        ? {
            metadata: {
              ...existingMetadata,
              agentationId,
              resolution_summary: summary,
            },
          }
        : {}),
    })
    .eq("id", feedbackItem.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (status === "resolved") {
    try {
      const { data: fullItem } = await supabase
        .from("admin_feedback_items")
        .select("id, title, comment, page_path, tool_id, project_id, metadata")
        .eq("id", feedbackItem.id)
        .maybeSingle();

      if (fullItem) {
        const metadata =
          typeof fullItem.metadata === "object" &&
          fullItem.metadata !== null &&
          !Array.isArray(fullItem.metadata)
            ? (fullItem.metadata as Record<string, unknown>)
            : null;
        const resolutionSummary =
          metadata && "resolution_summary" in metadata
            ? String(metadata.resolution_summary ?? "")
            : summary ?? null;

        await ingestAdminFeedbackLearning({
          feedbackItemId: fullItem.id,
          title: fullItem.title,
          comment: fullItem.comment,
          pagePath: fullItem.page_path,
          toolId: typeof fullItem.tool_id === "number" ? fullItem.tool_id : null,
          projectId:
            typeof fullItem.project_id === "number" ? fullItem.project_id : null,
          status: "active",
          resolutionSummary,
        });
      }
    } catch (learningError) {
      console.error("[Agentation] Resolved learning ingestion failed", learningError);
    }
  }

  return NextResponse.json({
    matched: true,
    feedbackItemId: feedbackItem.id,
    newStatus: feedbackStatus,
  });
}
