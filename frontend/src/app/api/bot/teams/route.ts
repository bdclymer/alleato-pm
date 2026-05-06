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
    userName: "Alleato AI",
  });

  // Handle channel @mentions
  chat.onNewMention(async (thread, message) => {
    await handleMessage(thread, message, "mention");
  });

  // Handle direct messages (1:1 with the bot)
  chat.onDirectMessage(async (thread, message) => {
    await handleMessage(thread, message, "dm");
  });

  // Handle follow-up replies in subscribed threads
  chat.onSubscribedMessage(async (thread, message) => {
    await handleMessage(thread, message, "mention");
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
  source: "mention" | "dm",
): Promise<void> {
  const teamsUserId = message.author.userId;
  const displayName = message.author.fullName;
  const messageText = message.text.trim();

  try {
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
    // Catch any "link ..." attempt up front so a malformed code (e.g. "link foo"
    // — too short) doesn't fall through to the AI handler. Falling through is
    // a silent UX failure: user types "link" expecting linking, gets a chatbot
    // reply instead of a clear error.
    if (/^link(\s|$)/i.test(messageText)) {
      const linkMatch = messageText.match(/^link\s+([A-Za-z0-9_-]{6,12})$/i);
      if (linkMatch) {
        await handleLinkCommand(thread, teamsUserId, displayName, linkMatch[1]);
      } else {
        await thread.post(
          "❌ Invalid or expired code. Generate a new one in **Settings → Profile → Microsoft Teams**.",
        );
      }
      return;
    }

    // --- Prompt to link if still unresolved ---
    if (!supabaseUserId) {
      await thread.post(
        "👋 I don't recognize your account yet. To link your Alleato account:\n\n" +
          "1. Open **Settings → Profile → Microsoft Teams** in Alleato\n" +
          "2. Click **Generate code**\n" +
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
    const finalUserId = supabaseUserId;
    after(async () => {
      try {
        await runPostResponseTasks(sessionId, finalUserId);
      } catch (err) {
        console.error("[teams-bot] runPostResponseTasks failed", {
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          sessionId,
          supabaseUserId: finalUserId,
        });
      }
    });
  } catch (err) {
    console.error("[teams-bot] handleMessage failed", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      source,
      teamsUserId,
      threadId: thread.id,
      messagePreview: messageText.slice(0, 200),
    });
    // Surface a user-visible message so the failure isn't silent on Teams.
    await thread
      .post("⚠️ Something went wrong on my side. The error has been logged — please try again.")
      .catch((postErr) => {
        console.error("[teams-bot] failed to post fallback error message", {
          error: postErr instanceof Error ? postErr.message : String(postErr),
        });
      });
  }
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
  try {
    const supabase = createServiceClient();

    const { data: linkCode, error: lookupError } = await supabase
      .from("teams_link_codes")
      .select("user_id, expires_at, used_at")
      .eq("code", code)
      .maybeSingle();

    if (lookupError) {
      console.error("[teams-bot] link code lookup failed", {
        error: lookupError.message,
        code,
        teamsUserId,
      });
      await thread.post(
        "⚠️ Something went wrong looking up that code. Please try again in a moment.",
      );
      return;
    }

    if (!linkCode) {
      await thread.post(
        "❌ That code is invalid. Please generate a new one in **Settings → Profile → Microsoft Teams**.",
      );
      return;
    }

    if (linkCode.used_at) {
      await thread.post("❌ That code has already been used. Please generate a new one.");
      return;
    }

    if (new Date(linkCode.expires_at) < new Date()) {
      await thread.post(
        "❌ That code has expired (codes are valid for 10 minutes). Please generate a new one.",
      );
      return;
    }

    // Mark code used
    const { error: markUsedError } = await supabase
      .from("teams_link_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("code", code);
    if (markUsedError) {
      console.error("[teams-bot] failed to mark link code used", {
        error: markUsedError.message,
        code,
        teamsUserId,
      });
    }

    // Create or update mapping
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
        supabaseUserId: linkCode.user_id,
      });
      await thread.post("❌ Something went wrong linking your account. Please try again or contact support.");
      return;
    }

    await thread.post("✅ Your Alleato account is now linked! You can ask me anything about your projects.");
  } catch (err) {
    console.error("[teams-bot] handleLinkCommand failed", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      code,
      teamsUserId,
    });
    await thread
      .post("⚠️ Something went wrong linking your account. The error has been logged — please try again.")
      .catch((postErr) => {
        console.error("[teams-bot] failed to post link fallback error", {
          error: postErr instanceof Error ? postErr.message : String(postErr),
        });
      });
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  try {
    const chat = getTeamsChat();
    const pendingTasks: Array<Promise<unknown>> = [];
    const response = await chat.webhooks.teams(request, {
      waitUntil: (task) => {
        console.log("[teams-bot] waitUntil called");
        pendingTasks.push(task);
      },
    });
    console.log("[teams-bot] tasks after webhook:", pendingTasks.length);
    // Await tasks directly so they complete within the request lifecycle.
    // Teams bot responses are sent as outbound proactive messages (not as
    // the HTTP reply), so blocking here doesn't delay the 200 ACK to Teams
    // for simple responses. For long AI queries Teams may timeout the webhook
    // but the bot will still send the reply proactively.
    await Promise.allSettled(pendingTasks);
    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[teams-bot] webhook error", { error: msg });
    // Reset singleton so Teams' automatic retry gets a fresh initialization
    // attempt. Without this, a failed pg pool connect caches a rejected
    // initPromise and every subsequent request fails until cold restart.
    resetTeamsChat();
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
