import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ingestThumbsFeedbackLearning } from "@/lib/ai/services/agent-learning-service";
import { logger } from "@/lib/logger";

/**
 * POST /api/ai-assistant/feedback
 *
 * Persists user feedback (thumbs up/down) on AI assistant responses.
 * Stored in chat_history.metadata alongside tool traces and model info.
 */
export const POST = withApiGuardrails("/api/ai-assistant/feedback#POST", async ({ request }) => {
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "/api/ai-assistant/feedback#POST", message: "Authentication required.", status: 401 });
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
    throw new GuardrailError({ code: "INTERNAL_ERROR", where: "/api/ai-assistant/feedback#POST", message: error.message });
  }

  try {
    await ingestThumbsFeedbackLearning({ sessionId, feedback, messageContent });
  } catch (learningError) {
    logger.error({ msg: "[Feedback] Learning ingestion failed:", data: learningError });
  }

  return Response.json({ success: true });
});
