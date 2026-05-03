export const dynamic = "force-dynamic";

/**
 * POST /api/bot/teams
 *
 * Receives Bot Framework activities from Microsoft Teams and dispatches them
 * to the AI assistant via the shared bot-core.
 *
 * Auth flow: Azure registers this URL as the bot's Messaging Endpoint.
 * The @chat-adapter/teams package validates the incoming JWT automatically.
 *
 * User linking:
 *   1. First tries to find a bot_user_mappings row for the Teams AAD Object ID.
 *   2. Falls back to auto-linking by matching the Teams user's email to a Supabase user.
 *   3. If still unlinked, prompts the user to run "link <code>" with a code from Settings.
 */

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

// ---------------------------------------------------------------------------
// Lazy singleton — reused across requests in the same Fluid Compute instance
// ---------------------------------------------------------------------------

let _chat: Chat | null = null;

function getChatInstance(): Chat {
  if (_chat) return _chat;

  const appId = process.env.TEAMS_APP_ID;
  if (!appId) throw new Error("TEAMS_APP_ID is not set");
  const appPassword = process.env.TEAMS_APP_PASSWORD;
  if (!appPassword) throw new Error("TEAMS_APP_PASSWORD is not set");

  const teamsAdapter = createTeamsAdapter({
    appId,
    appPassword,
    // If TEAMS_APP_TENANT_ID is set, use SingleTenant mode — tighter security.
    // Leave unset for multi-tenant (allows any Microsoft tenant).
    appTenantId: process.env.TEAMS_APP_TENANT_ID,
    appType: process.env.TEAMS_APP_TENANT_ID ? "SingleTenant" : "MultiTenant",
  });

  const state = new MemoryStateAdapter();

  const chat = new Chat({
    adapters: { teams: teamsAdapter },
    state,
  });

  // Handle channel @mentions
  chat.onMention(async (thread, message) => {
    await handleMessage(thread, message, "mention");
  });

  // Handle direct messages (1:1 with the bot)
  chat.onDirectMessage(async (thread, message) => {
    await handleMessage(thread, message, "dm");
  });

  _chat = chat;
  return chat;
}

// ---------------------------------------------------------------------------
// Core message handler
// ---------------------------------------------------------------------------

async function handleMessage(
  thread: Thread,
  message: Message,
  _source: "mention" | "dm",
): Promise<void> {
  const teamsUserId = message.author.userId;
  const displayName = message.author.fullName;
  const messageText = message.text.trim();

  const supabase = createServiceClient();

  // --- Resolve Supabase user from Teams identity ---
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
    // Auto-link attempt: try matching by email (Teams puts email as userName)
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
        await supabase.from("bot_user_mappings").insert({
          platform: "teams",
          platform_user_id: teamsUserId,
          supabase_user_id: supabaseUserId,
          display_name: displayName || null,
        });
      }
    }
  }

  // --- Handle "link <code>" command for manual account linking ---
  const linkMatch = messageText.match(/^link\s+([A-Za-z0-9_-]{6,12})$/i);
  if (linkMatch) {
    await handleLinkCommand(thread, teamsUserId, displayName, linkMatch[1]);
    return;
  }

  // --- Prompt to link if still unresolved ---
  if (!supabaseUserId) {
    await thread.post(
      "👋 I don't recognize your account yet. To link your Alleato account:\n\n" +
        "1. Open **Settings → Integrations → Microsoft Teams** in Alleato\n" +
        "2. Copy your link code\n" +
        "3. Send me: `link <your-code>`",
    );
    return;
  }

  // --- Show typing indicator ---
  await thread.startTyping().catch(() => undefined);

  // Session is scoped to the user, not the thread — multiple people in the same
  // Teams channel each get their own isolated memory context.
  const sessionId = `teams:${supabaseUserId}`;

  // Persist user message
  await persistChatMessage({
    sessionId,
    userId: supabaseUserId,
    role: "user",
    content: messageText,
    metadata: { platform: "teams", teamsUserId, threadId: thread.id },
  });

  // Generate AI response
  const result = await generateBotResponse({
    userId: supabaseUserId,
    messageText,
    sessionId,
  });

  // Persist assistant response
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

  // Post response back to Teams thread
  await thread.post(result.text);

  // Fire-and-forget memory tasks
  after(async () => {
    await runPostResponseTasks(sessionId, supabaseUserId!);
  });
}

// ---------------------------------------------------------------------------
// /link <code> command handler
// ---------------------------------------------------------------------------

async function handleLinkCommand(
  thread: Thread,
  teamsUserId: string,
  displayName: string,
  code: string,
): Promise<void> {
  const supabase = createServiceClient();

  const { data: linkCode } = await supabase
    .from("teams_link_codes")
    .select("user_id, expires_at, used_at")
    .eq("code", code)
    .maybeSingle();

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

  // Mark code used
  await supabase
    .from("teams_link_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("code", code);

  // Create or update mapping
  await supabase.from("bot_user_mappings").upsert(
    {
      platform: "teams",
      platform_user_id: teamsUserId,
      supabase_user_id: linkCode.user_id,
      display_name: displayName || null,
    },
    { onConflict: "platform,platform_user_id" },
  );

  await thread.post("✅ Your Alleato account is now linked! You can ask me anything about your projects.");
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  try {
    const chat = getChatInstance();
    return await chat.webhooks.teams(request);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[teams-bot] webhook error", { error: msg });

    // Return 200 to prevent Teams from retrying non-recoverable errors
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
