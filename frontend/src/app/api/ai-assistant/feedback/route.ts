import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/ai-assistant/feedback
 *
 * Persists user feedback (thumbs up/down) on AI assistant responses.
 * Stored in chat_history.metadata alongside tool traces and model info.
 */
export async function POST(request: Request) {
  const user = await getApiRouteUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { sessionId, messageId, feedback, messageContent } = body as {
    sessionId: string;
    messageId?: string;
    feedback: "up" | "down";
    messageContent?: string;
  };

  if (!sessionId || !feedback) {
    return new Response("sessionId and feedback are required", { status: 400 });
  }

  const supabase = createServiceClient();

  // Store feedback as a dedicated row in chat_history
  const { error } = await supabase.from("chat_history").insert({
    session_id: sessionId,
    user_id: user.id,
    role: "system",
    content: `[feedback:${feedback}]`,
    metadata: {
      type: "feedback",
      feedback,
      messageId: messageId ?? null,
      messageContent: messageContent?.slice(0, 500) ?? null,
      timestamp: new Date().toISOString(),
    },
  });

  if (error) {
    console.error("[Feedback] Failed to persist:", error);
    return new Response("Failed to save feedback", { status: 500 });
  }

  return Response.json({ success: true });
}
