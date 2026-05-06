/**
 * Conversation Memory Service
 *
 * After each AI chat response, this service:
 * 1. Fetches the conversation messages from `chat_history`
 * 2. Summarizes them with gpt-4.1-nano (cheapest model, ~$0.0001)
 * 3. Embeds the summary with text-embedding-3-large (3072 dims)
 * 4. Upserts into the `memories` table (keyed by session_id)
 *
 * The `recallPastConversations` tool in operational.ts then searches
 * these memories via the `search_conversation_memories` RPC, giving
 * the AI assistant continuity across sessions.
 *
 * This runs in the `after()` hook of the chat route — zero user-facing
 * latency since it executes post-response.
 */

import { generateText } from "ai";
import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase/service";
import { getLanguageModel } from "../providers";
import { toSessionUuid } from "@/lib/ai/session-id";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum messages before generating a memory (skip trivial exchanges). */
const MIN_MESSAGES_FOR_MEMORY = 4;

/** Max messages to include in the summary (most recent). */
const MAX_MESSAGES_FOR_SUMMARY = 40;

/** Max characters per message when building the summarization input. */
const MAX_CHARS_PER_MESSAGE = 1500;

// ---------------------------------------------------------------------------
// Lazy OpenAI client for embeddings (routed through AI Gateway when available)
// ---------------------------------------------------------------------------

let _openai: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!_openai) {
    const gatewayKey = process.env.AI_GATEWAY_API_KEY;
    if (gatewayKey) {
      _openai = new OpenAI({
        apiKey: gatewayKey,
        baseURL: "https://ai-gateway.vercel.sh/v1",
      });
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("AI_GATEWAY_API_KEY or OPENAI_API_KEY not set");
      _openai = new OpenAI({ apiKey });
    }
  }
  return _openai;
}

// ---------------------------------------------------------------------------
// Summarize
// ---------------------------------------------------------------------------

/**
 * Summarize a conversation into a concise memory snippet.
 * Uses gpt-4.1-nano — the cheapest, fastest model available.
 */
async function summarizeConversation(
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  const transcript = messages
    .map(
      (m) =>
        `${m.role === "user" ? "User" : "Assistant"}: ${m.content.substring(0, MAX_CHARS_PER_MESSAGE)}`,
    )
    .join("\n\n");

  const result = await generateText({
    model: getLanguageModel("openai/gpt-4.1-nano"),
    system: `You are a conversation summarizer for a construction project management AI assistant.
Produce a concise 2-4 sentence summary that captures:
- The main topics discussed (e.g., "budget for Cedar Park project", "cash flow concerns")
- Any decisions made or action items identified
- Key data points or numbers mentioned (e.g., "$2.3M budget variance")
- The user's intent or concerns

Be factual and specific. Use project names, dollar amounts, and dates when they appear.
Write in past tense. Do NOT include greetings or pleasantries.`,
    prompt: `Summarize this conversation:\n\n${transcript}`,
  });

  return result.text.trim();
}

// ---------------------------------------------------------------------------
// Embed & Store
// ---------------------------------------------------------------------------

/**
 * Embed a summary and upsert into the memories table.
 * Uses text-embedding-3-large (3072 dims) to match `memories.embedding` (vector(3072)).
 * Upserts by session_id — if the conversation continues, the memory is updated.
 */
async function embedAndStoreMemory(
  summary: string,
  userId: string,
  sessionId: string,
): Promise<void> {
  const client = getOpenAIClient();
  const supabase = createServiceClient();

  // Generate embedding
  const embeddingResponse = await client.embeddings.create({
    model: "text-embedding-3-large",
    dimensions: 3072,
    input: summary.substring(0, 8000),
  });

  const embedding = embeddingResponse.data[0].embedding;

  // Check if a memory for this session already exists
  const { data: existing } = await supabase
    .from("memories")
    .select("id")
    .eq("session_id", sessionId)
    .eq("memory_type", "conversation_summary")
    .limit(1);

  if (existing && existing.length > 0) {
    // Update existing memory
    const { error: updateError } = await supabase
      .from("memories")
      .update({
        content: summary,
        embedding: JSON.stringify(embedding),
        metadata: {
          updated_at: new Date().toISOString(),
          session_id: sessionId,
        },
      })
      .eq("id", existing[0].id);
    if (updateError) {
      throw new Error(`Failed to update conversation memory: ${updateError.message}`);
    }
  } else {
    // Insert new memory
    const { error: insertError } = await supabase.from("memories").insert({
      content: summary,
      embedding: JSON.stringify(embedding),
      user_id: userId,
      session_id: sessionId,
      memory_type: "conversation_summary",
      metadata: {
        created_at: new Date().toISOString(),
        session_id: sessionId,
      },
    });
    if (insertError) {
      throw new Error(`Failed to insert conversation memory: ${insertError.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Orchestrator (called from the chat route's after() hook)
// ---------------------------------------------------------------------------

/**
 * Generate a conversation memory for a given session.
 *
 * This is the main entry point, called from the chat route's `after()` block.
 * It fetches messages, checks the threshold, summarizes, embeds, and stores.
 *
 * @param sessionId - The conversation session ID
 * @param userId - The authenticated user's ID
 */
export async function generateConversationMemory(
  sessionId: string,
  userId: string,
): Promise<void> {
  const supabase = createServiceClient();

  const sessionUuid = toSessionUuid(sessionId);

  // Fetch conversation messages
  const { data: messages, error } = await supabase
    .from("chat_history")
    .select("role, content")
    .eq("session_id", sessionUuid)
    .order("created_at", { ascending: true })
    .limit(MAX_MESSAGES_FOR_SUMMARY);

  if (error || !messages) {
    throw new Error(
      `Failed to fetch messages for conversation memory: ${error?.message ?? "no messages returned"}`,
    );
  }

  // Skip trivial conversations
  if (messages.length < MIN_MESSAGES_FOR_MEMORY) {
    return;
  }

  // Filter out empty messages
  const validMessages = messages.filter(
    (m) => m.content && m.content.trim().length > 0,
  );

  if (validMessages.length < MIN_MESSAGES_FOR_MEMORY) {
    return;
  }

  // Summarize and store
  const summary = await summarizeConversation(
    validMessages as Array<{ role: string; content: string }>,
  );

  if (!summary || summary.length < 10) {
    console.warn("[conversation-memory] Summary too short, skipping");
    return;
  }

  await embedAndStoreMemory(summary, userId, sessionId);
}

// ---------------------------------------------------------------------------
// Recent Conversation Injection (fixes the "blank stare" problem)
// ---------------------------------------------------------------------------

/**
 * Fetch the N most recent conversation summaries for a user, excluding the
 * current session. Used to inject prior-session context at the start of a
 * new conversation so the AI already knows what was discussed recently.
 *
 * @param userId - The authenticated user's ID
 * @param currentSessionId - The current session to exclude
 * @param limit - How many recent summaries to include (default: 3)
 */
export async function getRecentConversationSummaries(
  userId: string,
  currentSessionId: string,
  limit = 3,
): Promise<Array<{ content: string; createdAt: string; sessionId: string }>> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("memories")
    .select("content, created_at, session_id")
    .eq("user_id", userId)
    .eq("memory_type", "conversation_summary")
    .neq("session_id", currentSessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    throw new Error(
      `Failed to fetch recent conversation summaries: ${error?.message ?? "No data returned"}`,
    );
  }

  return data.map((row) => ({
    content: row.content as string,
    createdAt: row.created_at as string,
    sessionId: row.session_id as string,
  }));
}

/**
 * Build a formatted context block from recent conversation summaries.
 * Returns null if there are no recent summaries to inject.
 */
export function buildRecentConversationsBlock(
  summaries: Array<{ content: string; createdAt: string }>,
): string | null {
  if (summaries.length === 0) return null;

  const lines = summaries.map((s, i) => {
    const date = new Date(s.createdAt);
    const label = formatRelativeDate(date);
    return `**${i + 1}. ${label}:** ${s.content}`;
  });

  return [
    "## What You've Discussed Recently",
    "",
    "Use this to provide continuity — reference these naturally when relevant, not robotically.",
    "",
    ...lines,
    "",
    "---",
  ].join("\n");
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Earlier today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "Last week";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
