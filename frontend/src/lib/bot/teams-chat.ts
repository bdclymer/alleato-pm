import { Chat, ThreadImpl, type SerializedThread } from "chat";
import type { Json } from "@/types/database.types";
import { createTeamsAdapter } from "@chat-adapter/teams";
import { createPostgresState } from "@chat-adapter/state-pg";
import { createMemoryState } from "@chat-adapter/state-memory";
import pg from "pg";
import { createServiceClient } from "@/lib/supabase/service";
import {
  generateBotResponse,
  persistChatMessage,
  runPostResponseTasks,
} from "@/lib/ai/bot-core";
import type { Thread, Message } from "chat";

// ---------------------------------------------------------------------------
// Lazy singleton
// ---------------------------------------------------------------------------

let _chat: Chat | null = null;

export function resetTeamsChat(): void {
  _chat = null;
}

export function getTeamsChat(): Chat {
  if (_chat) return _chat;

  const appId = process.env.TEAMS_APP_ID;
  if (!appId) throw new Error("TEAMS_APP_ID is not set");
  const appPassword = process.env.TEAMS_APP_PASSWORD;
  if (!appPassword) throw new Error("TEAMS_APP_PASSWORD is not set");

  const teamsAdapter = createTeamsAdapter({
    appId,
    appPassword,
    appTenantId: process.env.TEAMS_APP_TENANT_ID,
    appType: process.env.TEAMS_APP_TENANT_ID ? "SingleTenant" : "MultiTenant",
  });

  // Use Postgres state if BOT_STATE_DATABASE_URL is configured, otherwise fall
  // back to in-memory state. Memory state works for DM bots (no subscription
  // features needed) and avoids Supabase pooler connection issues in Vercel.
  const stateUrl = process.env.BOT_STATE_DATABASE_URL;
  const state = stateUrl
    ? createPostgresState({
        client: new pg.Pool({ connectionString: stateUrl, ssl: { rejectUnauthorized: false } }),
        keyPrefix: "alleato-bot",
      })
    : createMemoryState();

  const chat = new Chat({
    adapters: { teams: teamsAdapter },
    state,
    userName: "Alleato AI",
  });

  chat.onNewMention(async (thread, message) => {
    await handleMessage(thread, message, "mention");
  });

  chat.onDirectMessage(async (thread, message) => {
    await handleMessage(thread, message, "dm");
  });

  chat.onSubscribedMessage(async (thread, message) => {
    await handleMessage(thread, message, "mention");
  });

  // Register as singleton so ThreadImpl.fromJSON can use lazy adapter resolution
  chat.registerSingleton();

  _chat = chat;
  return chat;
}

// ---------------------------------------------------------------------------
// Proactive messaging — post to a user's DM or last channel thread
// ---------------------------------------------------------------------------

export async function sendProactiveMessage(
  supabaseUserId: string,
  text: string,
  preferDm = true,
): Promise<void> {
  // Ensure singleton is registered for lazy ThreadImpl resolution
  getTeamsChat();

  const supabase = createServiceClient();

  const { data: ref } = await supabase
    .from("teams_conversation_refs")
    .select("thread_json")
    .eq("supabase_user_id", supabaseUserId)
    .eq("is_dm", preferDm)
    .maybeSingle();

  const threadJson = ref?.thread_json ?? (
    // Fall back to whichever ref exists (DM vs channel)
    (await supabase
      .from("teams_conversation_refs")
      .select("thread_json")
      .eq("supabase_user_id", supabaseUserId)
      .maybeSingle()
    ).data?.thread_json
  );

  if (!threadJson) {
    throw new Error(`No Teams conversation ref found for user ${supabaseUserId}`);
  }

  // Lazy resolution: uses Chat.getSingleton() to find the adapter
  const thread = ThreadImpl.fromJSON(threadJson as unknown as SerializedThread);
  await thread.post(text);
}

// ---------------------------------------------------------------------------
// Core message handler
// ---------------------------------------------------------------------------

const TEAMS_MAX_CHARS = 25_000;

function chunkText(text: string): string[] {
  if (text.length <= TEAMS_MAX_CHARS) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    // Break at last newline within the limit to avoid mid-sentence splits
    const slice = remaining.slice(0, TEAMS_MAX_CHARS);
    const breakAt = slice.lastIndexOf("\n");
    const end = breakAt > TEAMS_MAX_CHARS * 0.5 ? breakAt : TEAMS_MAX_CHARS;
    chunks.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }
  return chunks;
}

async function storeConversationRef(
  supabaseUserId: string,
  thread: Thread,
  isDm: boolean,
): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("teams_conversation_refs").upsert(
      {
        supabase_user_id: supabaseUserId,
        thread_json: thread.toJSON() as unknown as Json,
        is_dm: isDm,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "supabase_user_id,is_dm" },
    );
  } catch (err) {
    console.error("[teams-bot] failed to store conversation ref", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handleMessage(
  thread: Thread,
  message: Message,
  source: "mention" | "dm",
): Promise<void> {
  console.log("[teams-bot] handleMessage called", {
    source,
    threadId: thread.id,
    userId: message.author.userId,
    textPreview: message.text.trim().slice(0, 80),
  });
  try {
    const teamsUserId = message.author.userId;
    const displayName = message.author.fullName;
    const messageText = message.text.trim();
    const isDm = source === "dm";

    // Ping test — bypasses all DB/AI to confirm basic Teams messaging works
    if (messageText.toLowerCase() === "ping") {
      console.log("[teams-bot] ping received, sending pong");
      await thread.post("pong 🏓");
      return;
    }

    const supabase = createServiceClient();

    let supabaseUserId: string | null = null;

    const { data: mapping } = await supabase
      .from("bot_user_mappings")
      .select("supabase_user_id")
      .eq("platform", "teams")
      .eq("platform_user_id", teamsUserId)
      .maybeSingle();

    if (mapping) {
      supabaseUserId = mapping.supabase_user_id;
    } else {
      const email = message.author.userName?.includes("@")
        ? message.author.userName
        : null;

      if (email) {
        const { data: userRecord } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (userRecord) {
          supabaseUserId = userRecord.id;
          const { error: insertErr } = await supabase.from("bot_user_mappings").insert({
            platform: "teams",
            platform_user_id: teamsUserId,
            supabase_user_id: supabaseUserId,
            display_name: displayName || null,
          });
          if (insertErr) {
            console.error("[teams-bot] auto-link insert failed", { error: insertErr.message });
          }
        }
      }
    }

    const linkMatch = messageText.match(/^link\s+([A-Za-z0-9_-]{6,12})$/i);
    if (linkMatch) {
      await handleLinkCommand(thread, teamsUserId, displayName, linkMatch[1]);
      return;
    }

    if (!supabaseUserId) {
      await thread.post(
        "👋 I don't recognize your account yet. To link your Alleato account:\n\n" +
          "1. Open **Settings → Profile → Microsoft Teams** in Alleato\n" +
          "2. Copy your link code\n" +
          "3. Send me: `link <your-code>`",
      );
      return;
    }

    // Capture as const — supabaseUserId is non-null past the guard above
    const userId = supabaseUserId;

    // Store conversation ref for proactive messaging (fire-and-forget)
    after(async () => {
      await storeConversationRef(userId, thread, isDm);
    });

    await thread.startTyping().catch(() => undefined);

    // Scope session to user+thread so channel convos and DMs stay isolated
    const sessionId = `teams:${supabaseUserId}:${thread.id}`;

    await persistChatMessage({
      sessionId,
      userId: supabaseUserId,
      role: "user",
      content: messageText,
      metadata: { platform: "teams", teamsUserId, threadId: thread.id },
    });

    const result = await generateBotResponse({
      userId: supabaseUserId,
      messageText,
      sessionId,
    });

    await persistChatMessage({
      sessionId,
      userId: supabaseUserId,
      role: "assistant",
      content: result.text,
      metadata: {
        platform: "teams",
        model: "strategist",
        toolCallCount: result.toolTrace.length,
        usage: result.usage,
      },
    });

    // Send response, chunking if needed
    const chunks = chunkText(result.text);
    for (const chunk of chunks) {
      await thread.post(chunk);
    }

    after(async () => {
      await runPostResponseTasks(sessionId, userId);
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[teams-bot] unhandled error in handleMessage", {
      error: msg,
      threadId: thread.id,
    });
    await thread
      .post("❌ Something went wrong. Please try again in a moment.")
      .catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// /link <code> command
// ---------------------------------------------------------------------------

async function handleLinkCommand(
  thread: Thread,
  teamsUserId: string,
  displayName: string,
  code: string,
): Promise<void> {
  const supabase = createServiceClient();

  const { data: linkCode, error: lookupError } = await supabase
    .from("teams_link_codes")
    .select("user_id, expires_at, used_at")
    .eq("code", code)
    .maybeSingle();

  if (lookupError) {
    console.error("[teams-bot] failed to look up link code", { code, error: lookupError.message });
    await thread.post("❌ Something went wrong verifying your code. Please try again.");
    return;
  }

  if (!linkCode) {
    await thread.post("❌ That code is invalid. Please generate a new one in **Settings → Profile → Microsoft Teams**.");
    return;
  }

  if (linkCode.used_at) {
    await thread.post("❌ That code has already been used. Please generate a new one.");
    return;
  }

  if (new Date(linkCode.expires_at) < new Date()) {
    await thread.post("❌ That code has expired (codes are valid for 10 minutes). Please generate a new one.");
    return;
  }

  const { error: markUsedError } = await supabase
    .from("teams_link_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("code", code);

  if (markUsedError) {
    console.error("[teams-bot] failed to mark link code used", { code, error: markUsedError.message });
    await thread.post("❌ Something went wrong linking your account. Please try again.");
    return;
  }

  const { error: upsertError } = await supabase.from("bot_user_mappings").upsert(
    {
      platform: "teams",
      platform_user_id: teamsUserId,
      supabase_user_id: linkCode.user_id,
      display_name: displayName || null,
    },
    { onConflict: "platform,platform_user_id" },
  );

  if (upsertError) {
    console.error("[teams-bot] failed to create bot_user_mappings", {
      error: upsertError.message,
      teamsUserId,
    });
    await thread.post("❌ Something went wrong linking your account. Please try again or contact support.");
    return;
  }

  await thread.post("✅ Your Alleato account is now linked! You can ask me anything about your projects.");
}
