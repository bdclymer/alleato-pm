import { Chat } from "chat";
import { createTeamsAdapter } from "@chat-adapter/teams";
import { MemoryStateAdapter } from "@chat-adapter/state-memory";
import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  generateBotResponse,
  persistChatMessage,
  runPostResponseTasks,
} from "@/lib/ai/bot-core";
import type { Thread, Message } from "chat";

let _chat: Chat | null = null;

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

  const state = new MemoryStateAdapter();

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

  _chat = chat;
  return chat;
}

async function handleMessage(
  thread: Thread,
  message: Message,
  _source: "mention" | "dm",
): Promise<void> {
  try {
    const teamsUserId = message.author.userId;
    const displayName = message.author.fullName;
    const messageText = message.text.trim();

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
          const { error: insertMappingError } = await supabase.from("bot_user_mappings").insert({
            platform: "teams",
            platform_user_id: teamsUserId,
            supabase_user_id: supabaseUserId,
            display_name: displayName || null,
          });
          if (insertMappingError) {
            console.error("[teams-bot] failed to auto-create bot_user_mappings", {
              error: insertMappingError.message, teamsUserId,
            });
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
          "1. Open **Settings → Integrations → Microsoft Teams** in Alleato\n" +
          "2. Copy your link code\n" +
          "3. Send me: `link <your-code>`",
      );
      return;
    }

    await thread.startTyping().catch(() => undefined);

    const sessionId = `teams:${supabaseUserId}`;

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

    await thread.post(result.text);

    after(async () => {
      if (supabaseUserId) await runPostResponseTasks(sessionId, supabaseUserId);
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[teams-bot] unhandled error in handleMessage", {
      error: msg,
      threadId: thread.id,
    });
    await thread.post("❌ Something went wrong. Please try again in a moment.").catch(() => undefined);
  }
}

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
    await thread.post("❌ That code is invalid. Please generate a new one in **Settings → Integrations → Microsoft Teams**.");
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
    console.error("[teams-bot] failed to create bot_user_mappings", { error: upsertError.message, teamsUserId });
    await thread.post("❌ Something went wrong linking your account. Please try again or contact support.");
    return;
  }

  await thread.post("✅ Your Alleato account is now linked! You can ask me anything about your projects.");
}
