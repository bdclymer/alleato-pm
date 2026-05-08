export const dynamic = "force-dynamic";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { getApiRouteUser } from "@/lib/supabase/server";
import {
  createArtifact,
  listArtifacts,
  type ArtifactType,
  type ArtifactStatus,
} from "@/lib/ai/services/workspace-artifact-service";

/** GET /api/ai-assistant/workspace — list current user's artifacts */
export const GET = withApiGuardrails(
  "ai-assistant/workspace#GET",
  async ({ request }) => {
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "ai-assistant/workspace#GET",
        message: "Authentication required.",
      });
    }

    const { searchParams } = new URL(request.url);
    const projectIdParam = searchParams.get("projectId");
    const projectId = projectIdParam ? parseInt(projectIdParam, 10) : undefined;
    const artifactType = searchParams.get("type") as ArtifactType | null;
    const status = searchParams.get("status") as ArtifactStatus | null;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 20;

    const artifacts = await listArtifacts({
      userId: user.id,
      projectId: projectId ?? undefined,
      artifactType: artifactType ?? undefined,
      status: status ?? undefined,
      limit,
    });

    return Response.json({ artifacts });
  },
);

/** POST /api/ai-assistant/workspace — create a new artifact */
export const POST = withApiGuardrails(
  "ai-assistant/workspace#POST",
  async ({ request }) => {
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "ai-assistant/workspace#POST",
        message: "Authentication required.",
      });
    }

    const body = await request.json();
    const {
      artifactType,
      title,
      content,
      projectId,
      contextSnapshot,
      sessionId,
      tags,
    } = body as {
      artifactType: ArtifactType;
      title: string;
      content: Record<string, unknown>;
      projectId?: number;
      contextSnapshot?: Record<string, unknown>;
      sessionId?: string;
      tags?: string[];
    };

    if (!artifactType || !title || !content) {
      throw new GuardrailError({
        code: "VALIDATION_ERROR",
        where: "ai-assistant/workspace#POST",
        message: "artifactType, title, and content are required.",
      });
    }

    const result = await createArtifact({
      userId: user.id,
      artifactType,
      title,
      content,
      projectId,
      contextSnapshot,
      sessionId,
      tags,
    });

    if ("error" in result) {
      throw new GuardrailError({
        code: "DB_ERROR",
        where: "ai-assistant/workspace#POST",
        message: result.error,
      });
    }

    return Response.json({ id: result.id }, { status: 201 });
  },
);
