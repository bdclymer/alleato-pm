import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import {
  deleteMemory,
  updateMemoryContent,
} from "@/lib/ai/services/ai-memory-service";

/** PATCH /api/ai-assistant/memories/[id] — edit content or importance */
export const PATCH = withApiGuardrails(
  "ai-assistant/memories/[id]#PATCH",
  async ({ request, params }) => {
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "ai-assistant/memories/[id]#PATCH",
        message: "Authentication required.",
      });
    }

    const { id } = params as { id: string };
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
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "ai-assistant/memories/[id]#PATCH",
        message: result.error ?? "Update failed",
      });
    }

    return Response.json({ success: true });
  },
);

/** DELETE /api/ai-assistant/memories/[id] — soft-delete (is_active = false) */
export const DELETE = withApiGuardrails(
  "ai-assistant/memories/[id]#DELETE",
  async ({ params }) => {
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "ai-assistant/memories/[id]#DELETE",
        message: "Authentication required.",
      });
    }

    const { id } = params as { id: string };
    const result = await deleteMemory(user.id, id);

    if (!result.success) {
      throw new GuardrailError({
        code: "INTERNAL_ERROR",
        where: "ai-assistant/memories/[id]#DELETE",
        message: result.error ?? "Delete failed",
      });
    }

    return Response.json({ success: true });
  },
);
