/**
 * Memory Extraction Service
 *
 * Post-conversation: uses gpt-4.1-nano to analyze the conversation and
 * extract durable memories worth storing across sessions. Runs in the
 * chat route's after() hook alongside generateConversationMemory().
 *
 * Extracts typed memories (fact, preference, lesson, commitment, context)
 * and stores them via writeMemory() with embeddings.
 */

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createServiceClient } from "@/lib/supabase/service";
import { writeMemory, type MemoryType } from "./ai-memory-service";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_MESSAGES = 40;
const MAX_CHARS_PER_MESSAGE = 1500;
const MIN_MESSAGES_TO_EXTRACT = 4;
const MIN_IMPORTANCE_TO_STORE = 0.3;

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

interface ExtractedMemory {
  type: MemoryType;
  content: string;
  importance: number;
  confidence: number;
}

async function extractMemoriesFromTranscript(
  transcript: string,
): Promise<ExtractedMemory[]> {
  const result = await generateText({
    model: openai("gpt-4.1-nano"),
    system: `You extract durable memories from AI assistant conversations in a construction project management platform.

Return a JSON array of memory objects. Each has:
- type: "fact" | "preference" | "lesson" | "commitment" | "context"
- content: 1-2 sentence memory (specific, include names/numbers/dates when available)
- importance: 0.1–1.0 (how valuable is this across future sessions?)
- confidence: 0.1–1.0 (how certain are you this is accurate?)

Type definitions:
- fact: Objective facts about projects, people, or the company
  Examples: "Brandon Clymer is the PM on Vermillion Rise Warehouse"
            "The Westfield Collection project is at 85% complete with a $8.2M GMP"
- preference: How this user likes information presented or how they work
  Examples: "User prefers bullet-point financial summaries over prose paragraphs"
            "User wants to see action items grouped by project, not by date"
- lesson: A pattern or institutional knowledge worth remembering
  Examples: "Westfield change events consistently get priced late — check proactively before OAC meetings"
            "This team has recurring subcontractor procurement delays on drywall trades"
- commitment: A specific commitment that needs future tracking
  Examples: "Brandon committed to sending ROM estimates for Vermillion Rise by March 15, 2026"
            "Owner decision on Westfield Phase 2 scope pending — due end of Q1 2026"
- context: Situational context worth carrying into next session
  Examples: "User is under pressure on the Westfield GMP negotiation — prioritize financial data"
            "User preparing for investor presentation next week — portfolio health is top priority"

Rules:
- Only extract things worth remembering ACROSS future sessions
- Skip transient operational queries ("show me the budget" is not a memory)
- Preferences are gold — always capture them with high importance
- Be specific: include project names, dollar amounts, dates, people's names
- Commitments need a clear owner and deadline to be worth storing
- Return [] if nothing meaningful to store
- Max 5 memories per conversation

Return ONLY a valid JSON array, no markdown fences, no other text.`,
    prompt: `Extract durable memories from this construction PM conversation:\n\n${transcript}`,
  });

  try {
    const text = result.text.trim();
    const cleaned = text.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is ExtractedMemory =>
        typeof m === "object" &&
        m !== null &&
        typeof m.type === "string" &&
        ["fact", "preference", "lesson", "commitment", "context"].includes(m.type) &&
        typeof m.content === "string" &&
        m.content.trim().length > 10,
    );
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Orchestrator (called from chat route's after() hook)
// ---------------------------------------------------------------------------

/**
 * Extract and store durable memories from a completed conversation.
 * Runs post-response — zero user-facing latency.
 *
 * @param sessionId - The conversation session ID
 * @param userId - The authenticated user's ID
 */
export async function extractAndStoreMemories(
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
    .limit(MAX_MESSAGES);

  if (error || !messages) return;

  const valid = messages.filter((m) => m.content?.trim());
  if (valid.length < MIN_MESSAGES_TO_EXTRACT) return;

  const transcript = valid
    .map(
      (m) =>
        `${m.role === "user" ? "User" : "AI"}: ${m.content!.substring(0, MAX_CHARS_PER_MESSAGE)}`,
    )
    .join("\n\n");

  const extracted = await extractMemoriesFromTranscript(transcript);
  if (extracted.length === 0) return;

  // Store each memory that meets the importance threshold
  await Promise.allSettled(
    extracted
      .filter((m) => m.importance >= MIN_IMPORTANCE_TO_STORE)
      .map((m) =>
        writeMemory({
          userId,
          type: m.type,
          content: m.content.trim(),
          confidence: Math.min(1, Math.max(0, m.confidence ?? 0.8)),
          importance: Math.min(1, Math.max(0, m.importance ?? 0.5)),
          source: "extraction",
          // Facts and lessons about projects benefit the whole team
          visibility:
            m.type === "fact" || m.type === "lesson" ? "team" : "private",
        }),
      ),
  );
}
