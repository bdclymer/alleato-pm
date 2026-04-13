import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiErrorResponse } from "@/lib/api-error";

type RouteParams = { params: Promise<{ sessionId: string }> };

/**
 * PATCH /api/ai-assistant/conversations/[sessionId]
 * Rename a conversation.
 * Body: { title: string }
 */
export const PATCH = withApiGuardrails(
  "ai-assistant/conversations/[sessionId]#PATCH",
  async ({ request, params }) => {
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "ai-assistant/conversations/[sessionId]#PATCH", message: "Authentication required." });
  }

  const { sessionId } = await params;
  const body = await request.json();

  if (!body.title?.trim()) {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("conversations")
    .update({ title: body.title.trim() })
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    return apiErrorResponse(error);
  }

  return NextResponse.json({ success: true });
  },
);

/**
 * DELETE /api/ai-assistant/conversations/[sessionId]
 * Archive a conversation (soft delete).
 */
export const DELETE = withApiGuardrails(
  "ai-assistant/conversations/[sessionId]#DELETE",
  async ({ request, params }) => {
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "ai-assistant/conversations/[sessionId]#DELETE", message: "Authentication required." });
  }

  const { sessionId } = await params;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("conversations")
    .update({ is_archived: true })
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    return apiErrorResponse(error);
  }

  return NextResponse.json({ success: true });
  },
);
