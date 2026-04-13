import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/ai-assistant/conversations
 * List all non-archived conversations for the current user.
 */
export const GET = withApiGuardrails(
  "ai-assistant/conversations#GET",
  async () => {
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "ai-assistant/conversations#GET", message: "Authentication required." });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("session_id, title, last_message_at, created_at, metadata")
    .eq("user_id", user.id)
    .or("is_archived.is.null,is_archived.eq.false")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    return apiErrorResponse(error);
  }

  return NextResponse.json({ conversations: data ?? [] });
  },
);

/**
 * POST /api/ai-assistant/conversations
 * Create a new conversation.
 * Body: { title?: string }
 */
export const POST = withApiGuardrails(
  "ai-assistant/conversations#POST",
  async ({ request }) => {
  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "ai-assistant/conversations#POST", message: "Authentication required." });
  }

  const body = await request.json();
  const sessionId = randomUUID();
  const now = new Date().toISOString();

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      session_id: sessionId,
      user_id: user.id,
      title: body.title || "New conversation",
      last_message_at: now,
    })
    .select("session_id, title, last_message_at, created_at")
    .single();

  if (error) {
    return apiErrorResponse(error);
  }

  return NextResponse.json({ conversation: data }, { status: 201 });
  },
);
