import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/ai-assistant/usage-stats
 *
 * Returns aggregated AI usage statistics for the admin observability page.
 * Includes token counts, estimated costs, feedback tallies, and recent conversations.
 */
export async function GET() {
  const user = await getApiRouteUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();

  // Fetch all assistant messages with metadata (contains usage data)
  const { data: assistantMessages } = await supabase
    .from("chat_history")
    .select("id, session_id, metadata, created_at")
    .eq("role", "assistant")
    .order("created_at", { ascending: false })
    .limit(500);

  // Fetch feedback entries
  const { data: feedbackEntries } = await supabase
    .from("chat_history")
    .select("metadata")
    .eq("role", "system")
    .limit(500);

  // Fetch conversations for titles
  const { data: conversations } = await supabase
    .from("conversations")
    .select("session_id, title, last_message_at")
    .order("last_message_at", { ascending: false })
    .limit(20);

  // Count total conversations
  const { count: totalConversations } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true });

  // Count total messages
  const { count: totalMessages } = await supabase
    .from("chat_history")
    .select("id", { count: "exact", head: true })
    .in("role", ["user", "assistant"]);

  // Aggregate token usage from metadata
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let messagesWithUsage = 0;

  // Track per-session token usage
  const sessionTokens: Record<string, number> = {};
  const sessionMessageCounts: Record<string, number> = {};

  if (assistantMessages) {
    for (const msg of assistantMessages) {
      const meta = msg.metadata as Record<string, unknown> | null;
      const usage = meta?.usage as {
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
      } | null;

      if (usage) {
        totalInputTokens += usage.inputTokens ?? 0;
        totalOutputTokens += usage.outputTokens ?? 0;
        messagesWithUsage++;
      }

      // Track per-session
      const sid = msg.session_id as string;
      sessionMessageCounts[sid] = (sessionMessageCounts[sid] ?? 0) + 1;
      if (usage?.totalTokens) {
        sessionTokens[sid] = (sessionTokens[sid] ?? 0) + usage.totalTokens;
      }
    }
  }

  const totalTokens = totalInputTokens + totalOutputTokens;

  // Estimate cost (Claude Sonnet 4.5 pricing)
  const estimatedCost =
    (totalInputTokens / 1_000_000) * 3.0 +
    (totalOutputTokens / 1_000_000) * 15.0;

  // Tally feedback
  let feedbackUp = 0;
  let feedbackDown = 0;

  if (feedbackEntries) {
    for (const entry of feedbackEntries) {
      const meta = entry.metadata as Record<string, unknown> | null;
      if (meta?.type === "feedback") {
        if (meta.feedback === "up") feedbackUp++;
        if (meta.feedback === "down") feedbackDown++;
      }
    }
  }

  // Build recent conversations list
  const recentConversations = (conversations ?? []).slice(0, 10).map((conv) => ({
    session_id: conv.session_id,
    title: conv.title ?? "Untitled",
    messageCount: sessionMessageCounts[conv.session_id] ?? 0,
    totalTokens: sessionTokens[conv.session_id] ?? 0,
    lastMessageAt: conv.last_message_at ?? "",
  }));

  return Response.json({
    totalConversations: totalConversations ?? 0,
    totalMessages: totalMessages ?? 0,
    totalTokens,
    estimatedCost: Math.round(estimatedCost * 100) / 100,
    feedbackUp,
    feedbackDown,
    avgTokensPerMessage:
      messagesWithUsage > 0 ? Math.round(totalTokens / messagesWithUsage) : 0,
    recentConversations,
  });
}
