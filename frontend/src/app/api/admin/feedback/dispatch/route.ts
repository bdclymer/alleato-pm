import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const schema = z.object({
  id: z.string().uuid(),
  target: z.enum(["codex", "claude_code"]),
  markInProgress: z.boolean().default(true),
});

type FeedbackCommentRow = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
};

type DispatchHistoryEntry = {
  target: "codex" | "claude_code";
  at: string;
  by: string;
  status: string;
  annotationId: string | null;
};

function jsonError(status: number, payload: { error: string; details?: string }) {
  return NextResponse.json(payload, { status });
}

async function requireAdminUser() {
  const requestUser = await getApiRouteUser();
  if (!requestUser) return null;

  const supabase = createServiceClient();
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("id, is_admin")
    .eq("id", requestUser.id)
    .maybeSingle();

  if (error || !profile?.is_admin) return null;
  return requestUser;
}

function escapeDoubleQuotes(text: string) {
  return text.replace(/"/g, '\\"');
}

function buildPrompt(input: {
  annotationId: string | null;
  title: string;
  comment: string;
  status: string;
  severity: string | null;
  pageUrl: string;
  pagePath: string;
  comments: { author: string; body: string }[];
}) {
  const thread =
    input.comments.length > 0
      ? input.comments.map((c) => `- ${c.author}: ${c.body}`).join("\n")
      : "- No replies yet";

  return [
    "Please resolve this Agentation annotation:",
    "",
    `Annotation ID: ${input.annotationId || "N/A"}`,
    `Title: ${input.title}`,
    `Status: ${input.status}`,
    `Severity: ${input.severity || "medium"}`,
    `Page: ${input.pageUrl || input.pagePath}`,
    "",
    "Original annotation:",
    input.comment,
    "",
    "Reply thread:",
    thread,
    "",
    "Output requirements:",
    "1. Root cause",
    "2. Exact code changes",
    "3. Verification evidence",
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const user = await requireAdminUser();
    if (!user) return jsonError(403, { error: "Admin access required" });

    const raw = await request.json();
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { id, target, markInProgress } = parsed.data;
    const supabase = createServiceClient();

    const { data: item, error: itemError } = await supabase
      .from("admin_feedback_items")
      .select("id, title, comment, status, severity, page_url, page_path, metadata")
      .eq("id", id)
      .maybeSingle();

    if (itemError || !item) {
      return jsonError(404, { error: "Feedback item not found" });
    }

    const { data: commentRows } = await supabase
      .from("admin_feedback_comments")
      .select("id, author_id, body, created_at")
      .eq("feedback_item_id", id)
      .order("created_at", { ascending: true });

    const comments = (commentRows ?? []) as FeedbackCommentRow[];
    const authorIds = [...new Set(comments.map((c) => c.author_id))];

    let profilesById: Record<string, { full_name: string | null; email: string | null }> = {};
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, full_name, email")
        .in("id", authorIds);

      profilesById = Object.fromEntries(
        (profiles ?? []).map((profile) => [
          profile.id,
          {
            full_name: profile.full_name,
            email: profile.email,
          },
        ]),
      );
    }

    const annotationId =
      item.metadata && typeof item.metadata === "object" && "agentationId" in item.metadata
        ? String((item.metadata as Record<string, unknown>).agentationId ?? "")
        : null;

    const prompt = buildPrompt({
      annotationId,
      title: item.title,
      comment: item.comment,
      status: item.status,
      severity: item.severity,
      pageUrl: item.page_url,
      pagePath: item.page_path,
      comments: comments.map((comment) => {
        const profile = profilesById[comment.author_id];
        return {
          author: profile?.full_name || profile?.email || comment.author_id,
          body: comment.body,
        };
      }),
    });

    const cliCommand =
      target === "codex"
        ? `codex --print "${escapeDoubleQuotes(prompt)}"`
        : `claude --print "${escapeDoubleQuotes(prompt)}"`;

    const currentMetadata =
      item.metadata && typeof item.metadata === "object"
        ? (item.metadata as Record<string, unknown>)
        : {};

    const existingHistoryRaw = currentMetadata.dispatchHistory;
    const existingHistory: DispatchHistoryEntry[] = Array.isArray(existingHistoryRaw)
      ? (existingHistoryRaw
          .filter((entry) => typeof entry === "object" && entry !== null)
          .map((entry) => {
            const record = entry as Record<string, unknown>;
            return {
              target: record.target === "claude_code" ? "claude_code" : "codex",
              at: typeof record.at === "string" ? record.at : new Date().toISOString(),
              by: typeof record.by === "string" ? record.by : user.id,
              status: typeof record.status === "string" ? record.status : item.status,
              annotationId:
                typeof record.annotationId === "string" ? record.annotationId : null,
            } as DispatchHistoryEntry;
          }) as DispatchHistoryEntry[])
      : [];

    const dispatchEvent: DispatchHistoryEntry = {
      target,
      at: new Date().toISOString(),
      by: user.id,
      status: markInProgress ? "in_progress" : item.status,
      annotationId,
    };

    const nextMetadata = {
      ...currentMetadata,
      assignedAgent: target,
      assignedAt: new Date().toISOString(),
      assignedBy: user.id,
      dispatchStatus: "dispatched",
      dispatchedAt: new Date().toISOString(),
      dispatchedBy: user.id,
      lastDispatchTarget: target,
      dispatchCount: existingHistory.length + 1,
      dispatchHistory: [dispatchEvent, ...existingHistory].slice(0, 30),
    };

    const nextStatus = markInProgress ? "in_progress" : item.status;

    const { error: updateError } = await supabase
      .from("admin_feedback_items")
      .update({
        metadata: nextMetadata,
        status: nextStatus,
      })
      .eq("id", id);

    if (updateError) {
      return jsonError(500, { error: "Failed to update feedback item", details: updateError.message });
    }

    return NextResponse.json({
      success: true,
      id,
      target,
      prompt,
      cliCommand,
      status: nextStatus,
      dispatchEvent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonError(500, { error: "Dispatch failed", details: message });
  }
}
