import { NextRequest, NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiErrorResponse } from "@/lib/api-error";

type RouteParams = { params: Promise<{ sessionId: string }> };

/**
 * GET /api/ai-assistant/messages/[sessionId]
 * Load all messages for a conversation.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
) {
  const user = await getApiRouteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  const supabase = createServiceClient();

  // Verify the conversation belongs to this user
  const { data: convo } = await supabase
    .from("conversations")
    .select("session_id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!convo) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("chat_history")
    .select("id, role, content, sources, metadata, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    return apiErrorResponse(error);
  }

  return NextResponse.json({ messages: data ?? [] });
}
