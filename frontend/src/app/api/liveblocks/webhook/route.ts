import { WebhookHandler } from "@liveblocks/node";

import {
  getCommentText,
  getFirstCommentText,
  isAgentUserId,
  postAgentThreadReply,
  type AgentUserId,
} from "@/lib/collaboration/agent-comments";
import {
  appendReplyToFeedbackThread,
  mirrorLiveblocksCommentToFeedback,
} from "@/lib/admin-feedback/liveblocks-feedback";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const ROOM_PREFIX = "alleato:";

// Derive page context from a Liveblocks room id. Page-comment rooms are
// `alleato:page:<colon-delimited-path>` (see page-comments-overlay pageRoomId);
// entity rooms are `alleato:<entityType>:<entityId>` (see rooms.getRoomId).
function deriveContextFromRoom(roomId: string): {
  pagePath: string;
  pageUrl: string;
  projectId: number | null;
} {
  const body = roomId.startsWith(ROOM_PREFIX)
    ? roomId.slice(ROOM_PREFIX.length)
    : roomId;

  let pagePath: string;
  if (body.startsWith("page:")) {
    const rest = body.slice("page:".length);
    pagePath = rest === "root" ? "/" : `/${rest.replace(/:/g, "/")}`;
  } else {
    // entity room -> synthetic path (best-effort; exact URL isn't required)
    pagePath = `/${body.replace(/:/g, "/")}`;
  }

  const projectMatch = pagePath.match(/^\/(\d+)(?:\/|$)/);
  const projectId = projectMatch ? Number.parseInt(projectMatch[1], 10) : null;

  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const pageUrl = appBase ? `${appBase.replace(/\/$/, "")}${pagePath}` : pagePath;

  return { pagePath, pageUrl, projectId: Number.isFinite(projectId) ? projectId : null };
}

async function resolveAuthor(authorId: string | null) {
  if (!authorId) return { name: null, email: null };
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("user_profiles")
      .select("full_name, email")
      .eq("id", authorId)
      .maybeSingle();
    return { name: data?.full_name ?? null, email: data?.email ?? null };
  } catch {
    return { name: null, email: null };
  }
}

// Liveblocks webhook. Register the endpoint URL + `threadCreated` event in the
// Liveblocks dashboard (Webhooks). Verified by signature — NOT app-auth-gated.
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.LIVEBLOCKS_WEBHOOK_SECRET_KEY;
  if (!secret) {
    return new Response("Liveblocks webhook not configured", { status: 500 });
  }

  const rawBody = await request.text();
  const handler = new WebhookHandler(secret);

  let event;
  try {
    event = handler.verifyRequest({ headers: request.headers, rawBody });
  } catch (error) {
    logger.warn({
      msg: "[liveblocks/webhook] signature verification failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response("Invalid signature", { status: 400 });
  }

  // A follow-up reply on an existing thread: append it to the EXISTING feedback
  // item's GitHub issue (context for the agent) — never open a new issue, never
  // re-dispatch. The first comment of a thread is owned by the threadCreated
  // handler below, and the agent's own replies are skipped so it doesn't echo.
  if (event.type === "commentCreated") {
    const { roomId, threadId, commentId, createdBy } = event.data;
    if (isAgentUserId(createdBy)) {
      return Response.json({ ok: true, ignored: "agent_comment" });
    }
    const comment = await getCommentText({ roomId, threadId, commentId });
    if (!comment || !comment.text || comment.isFirstComment) {
      return Response.json({ ok: true, skipped: "not_a_reply" });
    }
    const replyAuthor = await resolveAuthor(comment.authorId);
    const replyResult = await appendReplyToFeedbackThread({
      threadId,
      authorId: comment.authorId,
      authorName: replyAuthor.name,
      text: comment.text,
    });
    if (replyResult.reEngaged) {
      await postAgentThreadReply({
        roomId,
        threadId,
        markdown:
          "🔄 **Reopened.** Thanks for flagging — the previous fix didn't fully resolve it, so this is being looked at again. Updates will show up here.",
      });
    }
    return Response.json({ ok: true, reply: replyResult });
  }

  if (event.type !== "threadCreated") {
    return Response.json({ ok: true, ignored: event.type });
  }

  const { roomId, threadId } = event.data;

  const firstComment = await getFirstCommentText({ roomId, threadId });
  if (!firstComment || !firstComment.text) {
    return Response.json({ ok: true, skipped: "no comment text" });
  }

  const author = await resolveAuthor(firstComment.authorId);
  const context = deriveContextFromRoom(roomId);

  try {
    const result = await mirrorLiveblocksCommentToFeedback({
      roomId,
      threadId,
      commentId: `${threadId}:first`,
      commentText: firstComment.text,
      authorId: firstComment.authorId,
      authorName: author.name,
      authorEmail: author.email,
      pageUrl: context.pageUrl,
      pagePath: context.pagePath,
      pageTitle: null,
      projectId: context.projectId,
    });

    // Acknowledge in the same thread so the client sees it was picked up.
    if (result.status === "created") {
      const agentId: AgentUserId =
        result.target === "codex" ? "agent:codex" : "agent:claude-code";
      const ack = result.dispatched
        ? [
            "**Logged as feedback.**",
            "",
            `Thanks — this has been captured and assigned to ${
              result.target === "codex" ? "Codex" : "Claude Code"
            } to work on${
              result.githubIssueNumber ? ` (tracking #${result.githubIssueNumber})` : ""
            }. Progress will show up here.`,
          ].join("\n")
        : [
            "**Logged as feedback.**",
            "",
            "Thanks — this has been captured and the team will review it. Updates will appear here.",
          ].join("\n");

      await postAgentThreadReply({ roomId, threadId, markdown: ack, agentId });
    }

    return Response.json({ ok: true, ...result });
  } catch (error) {
    logger.error({
      msg: "[liveblocks/webhook] failed to process threadCreated",
      roomId,
      threadId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Return 200 so Liveblocks doesn't hammer retries for a persistent app error;
    // the failure is logged for follow-up.
    return Response.json({ ok: false, error: "processing_failed" });
  }
}
