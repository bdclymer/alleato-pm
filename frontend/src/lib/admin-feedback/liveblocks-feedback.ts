import {
  addGitHubIssueComment,
  addGitHubIssueLabels,
  createGitHubIssue,
} from "@/lib/admin-feedback/github";
import { buildAdminFeedbackTitle } from "@/lib/admin-feedback/title";
import { matchFeedbackToTool } from "@/lib/admin-feedback/tool-matcher";
import {
  resolveToolContext,
  contextToAgentPayload,
} from "@/lib/admin-feedback/context-resolver";
import { ingestAdminFeedbackLearning } from "@/lib/ai/services/agent-learning-service";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";

type JsonValue = Database["public"]["Tables"]["admin_feedback_items"]["Row"]["metadata"];
type FeedbackInsert = Database["public"]["Tables"]["admin_feedback_items"]["Insert"];

type RequestType = "bug" | "change_request" | "question";
type Severity = "low" | "medium" | "high";

export type LiveblocksFeedbackInput = {
  roomId: string;
  threadId: string;
  commentId: string;
  commentText: string;
  authorId: string | null;
  authorName: string | null;
  authorEmail: string | null;
  pageUrl: string;
  pagePath: string;
  pageTitle: string | null;
  projectId: number | null;
};

export type LiveblocksFeedbackResult = {
  status: "created" | "existing";
  feedbackId: string;
  githubIssueNumber: number | null;
  githubIssueUrl: string | null;
  dispatched: boolean;
  target: "codex" | "claude_code" | null;
};

function toJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => toJsonValue(item));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toJsonValue(item)]),
    );
  }
  return String(value);
}

function classifyRequestType(text: string): RequestType {
  const lower = text.toLowerCase();
  if (
    /(what is|what are|where is|where are|why is|why are|who is|who are|\?$)/.test(lower) &&
    !/(should|failed|won't|wont|not working|isn't|doesn't|aren't|wouldn't)/.test(lower)
  ) {
    return "question";
  }
  if (
    /(failed|won't|wont|wouldn't|not working|isn't|doesn't|aren't|routes me|wrong|not under|not lining up|can't|cannot|broken|error)/.test(
      lower,
    )
  ) {
    return "bug";
  }
  return "change_request";
}

function classifySeverity(requestType: RequestType, text: string): Severity {
  const lower = text.toLowerCase();
  if (
    /(failed|won't let|wont let|not working|routes me|wrong|can't|cannot|broken|crash|urgent|blocker)/.test(
      lower,
    )
  ) {
    return "high";
  }
  if (requestType === "question") return "low";
  return "medium";
}

// Resolves the auto-dispatch config. Auto-dispatch is OFF unless explicitly
// enabled, so turning it on is a deliberate choice (it opens GitHub issues and
// triggers a coding agent for every new client comment thread).
function resolveDispatchConfig(): { enabled: boolean; target: "codex" | "claude_code" } {
  const enabled = process.env.LIVEBLOCKS_FEEDBACK_AUTODISPATCH === "on";
  const target = process.env.LIVEBLOCKS_FEEDBACK_AGENT === "codex" ? "codex" : "claude_code";
  return { enabled, target };
}

function buildAgentPrompt(input: {
  title: string;
  comment: string;
  severity: Severity;
  pageUrl: string;
  pagePath: string;
}): string {
  return [
    "A client left this feedback as a page comment. Resolve it.",
    "",
    `Title: ${input.title}`,
    `Severity: ${input.severity}`,
    `Page: ${input.pageUrl || input.pagePath}`,
    "",
    "Client comment:",
    input.comment,
    "",
    "Output requirements:",
    "1. Root cause",
    "2. Exact code changes",
    "3. Verification evidence",
  ].join("\n");
}

async function findExisting(threadId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("admin_feedback_items")
    .select("id, status, github_issue_number, github_issue_url")
    .contains("metadata", { sourceSystem: "liveblocks", liveblocksThreadId: threadId })
    .maybeSingle();
  return data ?? null;
}

/**
 * Turn a Liveblocks client comment thread into an admin_feedback_items row (so
 * it lands in the Feedback Inbox), then optionally auto-dispatch it to a coding
 * agent by opening a GitHub issue and applying the engine label
 * (`codex:fix` / `claude:fix`) that triggers the Autofix Issue workflow. The
 * thread pointer is stored in metadata so status updates can be posted back
 * into the same thread the client sees. Idempotent per threadId.
 */
export async function mirrorLiveblocksCommentToFeedback(
  input: LiveblocksFeedbackInput,
): Promise<LiveblocksFeedbackResult> {
  const supabase = createServiceClient();

  const existing = await findExisting(input.threadId);
  if (existing) {
    return {
      status: "existing",
      feedbackId: existing.id,
      githubIssueNumber: existing.github_issue_number,
      githubIssueUrl: existing.github_issue_url,
      dispatched: false,
      target: null,
    };
  }

  const comment = input.commentText.trim() || "Client comment";
  const requestType = classifyRequestType(comment);
  const severity = classifySeverity(requestType, comment);
  const title = buildAdminFeedbackTitle({
    requestType,
    comment,
    targetText: comment,
    pageTitle: input.pageTitle,
  });

  const matchedTool = await matchFeedbackToTool(
    title,
    comment,
    input.pagePath,
    input.pageUrl,
  );
  const toolContext = matchedTool ? resolveToolContext(matchedTool) : null;
  const agentContext = toolContext ? toJsonValue(contextToAgentPayload(toolContext)) : null;

  const metadata = {
    sourceSystem: "liveblocks",
    source: "liveblocks_page_comment",
    liveblocksThread: {
      roomId: input.roomId,
      threadId: input.threadId,
      commentId: input.commentId,
    },
    liveblocksThreadId: input.threadId,
    submitterName: input.authorName,
    submitterEmail: input.authorEmail,
    rawCommentText: comment,
  };

  const insertPayload: FeedbackInsert = {
    created_by: input.authorId ?? "unknown",
    project_id: input.projectId,
    page_url: input.pageUrl,
    page_path: input.pagePath,
    page_title: input.pageTitle,
    target_id: input.threadId,
    target_selector: `liveblocks-thread:${input.threadId}`,
    target_text: comment,
    target_tag: "liveblocks-comment",
    dom_path: null,
    title,
    comment,
    request_type: requestType,
    severity,
    status: "open",
    screenshot_url: null,
    screenshot_path: null,
    metadata: toJsonValue(metadata),
    ...(matchedTool ? { tool_id: matchedTool.id } : {}),
    ...(agentContext ? { agent_context: agentContext } : {}),
  };

  const { data: inserted, error: insertError } = await supabase
    .from("admin_feedback_items")
    .insert(insertPayload)
    .select("id, title, status")
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? "Failed to insert Liveblocks feedback item");
  }

  try {
    await ingestAdminFeedbackLearning({
      feedbackItemId: inserted.id,
      title,
      comment,
      pagePath: input.pagePath,
      toolId: matchedTool?.id ?? null,
      projectId: input.projectId,
      status: "candidate",
    });
  } catch (learningError) {
    logger.error({
      msg: "[LiveblocksFeedback] Candidate learning ingestion failed",
      data: learningError,
      feedbackId: inserted.id,
    });
  }

  let githubIssue: Awaited<ReturnType<typeof createGitHubIssue>> = null;
  try {
    githubIssue = await createGitHubIssue({
      title,
      comment,
      pageUrl: input.pageUrl,
      pagePath: input.pagePath,
      pageTitle: input.pageTitle,
      requestType,
      severity,
      targetId: input.threadId,
      targetSelector: `liveblocks-thread:${input.threadId}`,
      targetTag: "liveblocks-comment",
      targetText: comment,
      domPath: null,
      screenshotUrl: null,
      projectId: input.projectId,
      metadata,
      toolContext,
    });
  } catch (error) {
    logger.warn({
      msg: "[LiveblocksFeedback] GitHub issue creation failed",
      feedbackId: inserted.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const dispatch = resolveDispatchConfig();
  let dispatched = false;

  if (githubIssue && dispatch.enabled) {
    const engineLabel = dispatch.target === "codex" ? "codex:fix" : "claude:fix";
    const prompt = buildAgentPrompt({
      title,
      comment,
      severity,
      pageUrl: input.pageUrl,
      pagePath: input.pagePath,
    });
    const commented = await addGitHubIssueComment(
      githubIssue.number,
      [
        `Dispatched from a client page comment to the ${dispatch.target === "codex" ? "Codex" : "Claude Code"} autofix lane.`,
        "",
        "```text",
        prompt,
        "```",
      ].join("\n"),
    );
    const labeled = await addGitHubIssueLabels(githubIssue.number, [engineLabel]);
    dispatched = Boolean(commented && labeled);
  }

  await supabase
    .from("admin_feedback_items")
    .update(
      githubIssue
        ? {
            github_issue_number: githubIssue.number,
            github_issue_url: githubIssue.url,
            github_issue_state: githubIssue.state,
            status: dispatched ? "in_progress" : "submitted",
            ...(dispatched
              ? {
                  metadata: toJsonValue({
                    ...metadata,
                    assignedAgent: dispatch.target,
                    dispatchStatus: "dispatched",
                    dispatchedAt: new Date().toISOString(),
                  }),
                }
              : {}),
          }
        : { status: "github_failed" },
    )
    .eq("id", inserted.id);

  return {
    status: "created",
    feedbackId: inserted.id,
    githubIssueNumber: githubIssue?.number ?? null,
    githubIssueUrl: githubIssue?.url ?? null,
    dispatched,
    target: dispatched ? dispatch.target : null,
  };
}
