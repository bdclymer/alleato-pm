import { NextRequest, NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type RouteParams = { params: Promise<{ sessionId: string }> };

/**
 * PATCH /api/ai-assistant/conversations/[sessionId]
 * Rename a conversation.
 * Body: { title: string }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getApiRouteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json(
      { error: "Failed to update conversation", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/ai-assistant/conversations/[sessionId]
 * Archive a conversation (soft delete).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
) {
  const user = await getApiRouteUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("conversations")
    .update({ is_archived: true })
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete conversation", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
