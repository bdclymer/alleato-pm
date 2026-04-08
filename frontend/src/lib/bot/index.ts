/**
 * Chat SDK bot instance — single codebase for Slack, Teams, and Telegram.
 *
 * Wires incoming platform messages to the C-Suite AI orchestrator via bot-core.
 * Each platform auto-detects credentials from environment variables.
 *
 * Required env vars:
 *   SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET
 *   TEAMS_APP_ID, TEAMS_APP_PASSWORD
 *   TELEGRAM_BOT_TOKEN
 *   DATABASE_URL (for state-pg) or POSTGRES_URL
 */

import { Chat, toAiMessages } from "chat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createTeamsAdapter } from "@chat-adapter/teams";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { createMemoryState } from "@chat-adapter/state-memory";
import {
  streamBotResponse,
  persistChatMessage,
  runPostResponseTasks,
} from "@/lib/ai/bot-core";
import type { BotLearningUsageSummary } from "@/lib/ai/bot-core";
import { recordAgentLearningUsages } from "@/lib/ai/services/agent-learning-service";
import { createServiceClient } from "@/lib/supabase/service";
import { nanoid } from "nanoid";

// ---------------------------------------------------------------------------
// Adapter setup — only register adapters whose credentials are present
// ---------------------------------------------------------------------------

const adapters: Record<string, ReturnType<typeof createSlackAdapter | typeof createTeamsAdapter | typeof createTelegramAdapter>> = {};

if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_SIGNING_SECRET) {
  adapters.slack = createSlackAdapter();
}

if (process.env.TEAMS_APP_ID && process.env.TEAMS_APP_PASSWORD) {
  adapters.teams = createTeamsAdapter();
}

if (process.env.TELEGRAM_BOT_TOKEN) {
  adapters.telegram = createTelegramAdapter();
}

// ---------------------------------------------------------------------------
// State adapter — memory state for serverless (thread state is ephemeral;
// we persist conversation history in our own Supabase chat_messages table)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Bot instance
// ---------------------------------------------------------------------------

export const bot = new Chat({
  userName: "alleato",
  adapters,
  state: createMemoryState(),
  // Force-release locks so new messages interrupt long-running AI responses
  onLockConflict: "force",
  // Streaming update interval for post+edit fallback (Teams, Telegram)
  streamingUpdateIntervalMs: 600,
  fallbackStreamingPlaceholderText: "Thinking...",
  logger: "warn",
});

// ---------------------------------------------------------------------------
// User mapping — resolve platform user to Supabase user ID
// ---------------------------------------------------------------------------

async function resolveUserId(platformUserId: string): Promise<string> {
  const supabase = createServiceClient();

  // Check bot_user_mappings table
  const { data: mapping } = await supabase
    .from("bot_user_mappings")
    .select("supabase_user_id")
    .eq("platform_user_id", platformUserId)
    .single();

  if (mapping?.supabase_user_id) {
    return mapping.supabase_user_id;
  }

  // Fallback: use a service account or the first admin user
  const { data: admin } = await (supabase as any)
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .single();

  return (admin as any)?.id ?? "system";
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

/**
 * New @mention — first message in a thread.
 * Subscribe to the thread and respond with the AI agent.
 */
bot.onNewMention(async (thread, message) => {
  await thread.subscribe();
  await thread.startTyping();

  const platformUserId = `${thread.adapter.name}:${message.author?.userId ?? "unknown"}`;
  const userId = await resolveUserId(platformUserId);
  const sessionId = `bot-${nanoid(12)}`;

  // Persist the user message for memory continuity
  await persistChatMessage({
    sessionId,
    userId,
    role: "user",
    content: message.text,
  });

  // Store session ID in thread state for follow-up messages
  await thread.setState({ sessionId, userId });

  // Stream the AI response
  let learningUsage: BotLearningUsageSummary | undefined;
  const { result, toolTrace } = await streamBotResponse({
    userId,
    messageText: message.text,
    sessionId,
    onLearningUsage: (usage) => {
      learningUsage = usage;
    },
  });

  // Post the streaming response — Chat SDK handles post+edit fallback
  await thread.post(result.fullStream);

  // Persist the assistant response
  const fullText = await result.text;
  await persistChatMessage({
    sessionId,
    userId,
    role: "assistant",
    content: fullText,
    metadata: {
      tool_trace: toolTrace,
      model: "openai/gpt-5.4",
      architecture: "csuite",
      channel: thread.adapter.name,
    },
  });

  if (learningUsage?.learnings.length) {
    await recordAgentLearningUsages({
      sessionId,
      userId,
      messageText: message.text,
      learnings: learningUsage.learnings,
    });
  }

  // Background memory tasks
  await runPostResponseTasks(sessionId, userId);
});

/**
 * Direct messages — same as mention but for DM threads.
 */
bot.onDirectMessage(async (thread, message) => {
  await thread.subscribe();
  await thread.startTyping();

  const platformUserId = `${thread.adapter.name}:${message.author?.userId ?? "unknown"}`;
  const userId = await resolveUserId(platformUserId);
  const sessionId = `bot-${nanoid(12)}`;

  await persistChatMessage({
    sessionId,
    userId,
    role: "user",
    content: message.text,
  });

  await thread.setState({ sessionId, userId });

  let learningUsage: BotLearningUsageSummary | undefined;
  const { result, toolTrace } = await streamBotResponse({
    userId,
    messageText: message.text,
    sessionId,
    onLearningUsage: (usage) => {
      learningUsage = usage;
    },
  });

  await thread.post(result.fullStream);

  const fullText = await result.text;
  await persistChatMessage({
    sessionId,
    userId,
    role: "assistant",
    content: fullText,
    metadata: {
      tool_trace: toolTrace,
      model: "openai/gpt-5.4",
      architecture: "csuite",
      channel: thread.adapter.name,
    },
  });

  if (learningUsage?.learnings.length) {
    await recordAgentLearningUsages({
      sessionId,
      userId,
      messageText: message.text,
      learnings: learningUsage.learnings,
    });
  }

  await runPostResponseTasks(sessionId, userId);
});

/**
 * Follow-up messages in subscribed threads — multi-turn conversation.
 */
bot.onSubscribedMessage(async (thread, message) => {
  await thread.startTyping();

  // Recover session state
  const state = (await thread.state) as {
    sessionId?: string;
    userId?: string;
  } | null;
  const platformUserId = `${thread.adapter.name}:${message.author?.userId ?? "unknown"}`;
  const userId = state?.userId ?? (await resolveUserId(platformUserId));
  const sessionId = state?.sessionId ?? `bot-${nanoid(12)}`;

  // Persist user message
  await persistChatMessage({
    sessionId,
    userId,
    role: "user",
    content: message.text,
  });

  // Build conversation history from thread messages
  const threadMessages = [];
  for await (const msg of thread.allMessages) {
    threadMessages.push(msg);
  }
  const conversationHistory = await toAiMessages(threadMessages);

  // Stream the AI response with full conversation context
  let learningUsage: BotLearningUsageSummary | undefined;
  const { result, toolTrace } = await streamBotResponse({
    userId,
    messageText: message.text,
    sessionId,
    conversationHistory,
    onLearningUsage: (usage) => {
      learningUsage = usage;
    },
  });

  await thread.post(result.fullStream);

  const fullText = await result.text;
  await persistChatMessage({
    sessionId,
    userId,
    role: "assistant",
    content: fullText,
    metadata: {
      tool_trace: toolTrace,
      model: "openai/gpt-5.4",
      architecture: "csuite",
      channel: thread.adapter.name,
    },
  });

  if (learningUsage?.learnings.length) {
    await recordAgentLearningUsages({
      sessionId,
      userId,
      messageText: message.text,
      learnings: learningUsage.learnings,
    });
  }

  await runPostResponseTasks(sessionId, userId);
});
