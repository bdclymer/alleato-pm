import { WebhookHandler } from "@liveblocks/node";

import {
  getCommentText,
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

  // Everything is driven off `commentCreated` — Liveblocks fires it for EVERY
  // comment, including the first one in a thread. (We do NOT rely on
  // `threadCreated`; subscribing to both would double-create.)
  //   - first comment in a thread -> new client feedback (create item + dispatch + ack)
  //   - later comment (reply)      -> append to the existing issue (+ re-engage if resolved)
  //   - agent bot comment          -> ignored (no echo loop)
  if (event.type === "commentCreated") {
    const { roomId, threadId, commentId, createdBy } = event.data;
    if (isAgentUserId(createdBy)) {
      return Response.json({ ok: true, ignored: "agent_comment" });
    }

    const comment = await getCommentText({ roomId, threadId, commentId });
    if (!comment || !comment.text) {
      return Response.json({ ok: true, skipped: "no_comment_text" });
    }

    // Follow-up reply -> append to the existing feedback issue.
    if (!comment.isFirstComment) {
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

    // First comment -> new feedback (create item, dispatch to the agent, ack).
    const author = await resolveAuthor(comment.authorId);
    const context = deriveContextFromRoom(roomId);
    try {
      const result = await mirrorLiveblocksCommentToFeedback({
        roomId,
        threadId,
        commentId,
        commentText: comment.text,
        authorId: comment.authorId,
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
        msg: "[liveblocks/webhook] failed to process new feedback comment",
        roomId,
        threadId,
        error: error instanceof Error ? error.message : String(error),
      });
      // 200 so Liveblocks doesn't hammer retries for a persistent app error.
      return Response.json({ ok: false, error: "processing_failed" });
    }
  }

  // threadCreated (and any other event) is intentionally ignored — commentCreated
  // owns new-feedback creation.
  return Response.json({ ok: true, ignored: event.type });
}
