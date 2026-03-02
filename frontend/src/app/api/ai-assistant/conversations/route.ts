import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/ai-assistant/conversations
 * List all non-archived conversations for the current user.
 */
export async function GET() {
  const user = await getApiRouteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("session_id, title, last_message_at, created_at, metadata")
    .eq("user_id", user.id)
    .or("is_archived.is.null,is_archived.eq.false")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch conversations", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ conversations: data ?? [] });
}

/**
 * POST /api/ai-assistant/conversations
 * Create a new conversation.
 * Body: { title?: string }
 */
export async function POST(request: NextRequest) {
  const user = await getApiRouteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json(
      { error: "Failed to create conversation", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ conversation: data }, { status: 201 });
}
