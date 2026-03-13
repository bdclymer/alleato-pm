import { getApiRouteUser } from "@/lib/supabase/server";
import {
  deleteMemory,
  updateMemoryContent,
} from "@/lib/ai/services/ai-memory-service";

/** PATCH /api/ai-assistant/memories/[id] — edit content or importance */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiRouteUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { content, importance } = body as {
    content?: string;
    importance?: number;
  };

  if (!content?.trim() && importance === undefined) {
    return new Response("content or importance is required", { status: 400 });
  }

  const result = await updateMemoryContent(
    user.id,
    id,
    content?.trim() ?? "",
    importance,
  );

  if (!result.success) {
    return new Response(result.error ?? "Update failed", { status: 500 });
  }

  return Response.json({ success: true });
}

/** DELETE /api/ai-assistant/memories/[id] — soft-delete (is_active = false) */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiRouteUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const result = await deleteMemory(user.id, id);

  if (!result.success) {
    return new Response(result.error ?? "Delete failed", { status: 500 });
  }

  return Response.json({ success: true });
}
