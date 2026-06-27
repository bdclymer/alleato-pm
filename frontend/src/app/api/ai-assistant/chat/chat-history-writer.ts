/**
 * ChatHistoryWriter — one seam for persisting chat_history rows.
 *
 * runChatV2 writes to `chat_history` in ~22 places, each repeating the same
 * row shape (`session_id`, `user_id`, `role`, `content`, `metadata`) and its own
 * ad-hoc error handling — some throw, some silently ignore the error. That drift
 * is exactly where a persisted message can go missing without a trace.
 *
 * This module concentrates the row shape and the failure contract behind a small
 * interface bound once per request to `(supabase, sessionId, userId)`. It accepts
 * the Supabase client (the data seam) rather than constructing one, so it is
 * testable with a fake client and no import-boundary mocks.
 *
 * Failure contract: `persist` returns `{ error }` for callers that want to decide;
 * `persistOrThrow` raises loudly (never silently drops a row) — the default for
 * the user/assistant turn records that the feedback + eval tooling depends on.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";

export type ChatRole = "user" | "assistant";

export interface ChatHistoryWriterContext {
  sessionId: string;
  userId: string;
}

export interface ChatHistoryWriter {
  persist(
    role: ChatRole,
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<{ error: string | null }>;
  persistOrThrow(
    role: ChatRole,
    content: string,
    metadata?: Record<string, unknown>,
    label?: string,
  ): Promise<void>;
}

export function createChatHistoryWriter(
  supabase: SupabaseClient<Database>,
  ctx: ChatHistoryWriterContext,
): ChatHistoryWriter {
  async function persist(
    role: ChatRole,
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<{ error: string | null }> {
    const { error } = await supabase.from("chat_history").insert({
      session_id: ctx.sessionId,
      user_id: ctx.userId,
      role,
      content,
      ...(metadata ? { metadata: metadata as Json } : {}),
    });
    return { error: error ? error.message : null };
  }

  async function persistOrThrow(
    role: ChatRole,
    content: string,
    metadata?: Record<string, unknown>,
    label = "message",
  ): Promise<void> {
    const { error } = await persist(role, content, metadata);
    if (error) {
      throw new Error(`Persisting the ${label} failed: ${error}`);
    }
  }

  return { persist, persistOrThrow };
}
