import {
  Liveblocks,
  markdownToCommentBody,
  stringifyCommentBody,
} from "@liveblocks/node";

// Reserved bot "users" that post into Liveblocks comment threads on behalf of a
// coding agent. Their ids are resolved to display names in /api/liveblocks/users
// so their comments render with a name (and are visually distinct from clients).
export const AGENT_USERS = {
  "agent:claude-code": { name: "Claude Code" },
  "agent:codex": { name: "Codex" },
} as const;

export type AgentUserId = keyof typeof AGENT_USERS;

export function isAgentUserId(id: string): id is AgentUserId {
  return id in AGENT_USERS;
}

let cachedClient: Liveblocks | null = null;

function getLiveblocks(): Liveblocks | null {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) return null;
  if (!cachedClient) cachedClient = new Liveblocks({ secret });
  return cachedClient;
}

/**
 * Post a reply into an existing Liveblocks comment thread as an agent bot user.
 * The client viewing that thread sees it live. `markdown` is converted to a
 * CommentBody (paragraphs/links/mentions only — lossy for richer markdown).
 * Never throws — returns false on failure so callers (webhooks, crons) don't
 * break their main path.
 */
export async function postAgentThreadReply(input: {
  roomId: string;
  threadId: string;
  markdown: string;
  agentId?: AgentUserId;
}): Promise<boolean> {
  const liveblocks = getLiveblocks();
  if (!liveblocks) return false;

  try {
    await liveblocks.createComment({
      roomId: input.roomId,
      threadId: input.threadId,
      data: {
        userId: input.agentId ?? "agent:claude-code",
        body: markdownToCommentBody(input.markdown),
      },
    });
    return true;
  } catch (error) {
    console.error("[agent-comments] failed to post reply", {
      roomId: input.roomId,
      threadId: input.threadId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Read the first comment of a thread as plain text plus its author id. Used by
 * the webhook to turn a freshly-created client comment into feedback. Returns
 * null if the thread/comment can't be read.
 */
export async function getFirstCommentText(input: {
  roomId: string;
  threadId: string;
}): Promise<{ text: string; authorId: string } | null> {
  const liveblocks = getLiveblocks();
  if (!liveblocks) return null;

  try {
    const thread = await liveblocks.getThread({
      roomId: input.roomId,
      threadId: input.threadId,
    });
    const first = thread.comments?.[0];
    if (!first?.body) return null;
    const text = (await stringifyCommentBody(first.body)).trim();
    return { text, authorId: first.userId };
  } catch (error) {
    console.error("[agent-comments] failed to read thread", {
      roomId: input.roomId,
      threadId: input.threadId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
