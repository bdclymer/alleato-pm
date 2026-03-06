/**
 * Conversation Memory Service
 *
 * After each AI chat response, this service:
 * 1. Fetches the conversation messages from `chat_history`
 * 2. Summarizes them with gpt-4.1-nano (cheapest model, ~$0.0001)
 * 3. Embeds the summary with text-embedding-3-small
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
import { openai } from "@ai-sdk/openai";
import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase/service";

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
// Lazy OpenAI client for embeddings (same pattern as operational.ts)
// ---------------------------------------------------------------------------

let _openai: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");
    _openai = new OpenAI({ apiKey });
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
    model: openai("gpt-4.1-nano"),
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
 * Uses text-embedding-3-small (same model as the RAG pipeline).
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
    model: "text-embedding-3-small",
    input: summary.substring(0, 8000), // Same truncation as backend pipeline
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
    await supabase
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
  } else {
    // Insert new memory
    await supabase.from("memories").insert({
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

  // Fetch conversation messages
  const { data: messages, error } = await supabase
    .from("chat_history")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(MAX_MESSAGES_FOR_SUMMARY);

  if (error || !messages) {
    console.error("[conversation-memory] Failed to fetch messages:", error);
    return;
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
