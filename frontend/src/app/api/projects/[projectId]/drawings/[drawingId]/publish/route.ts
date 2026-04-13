import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DrawingService } from "@/services/DrawingService";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * PATCH /api/projects/[projectId]/drawings/[drawingId]/publish
 * Publish a drawing (is_published = true)
 */
export const PATCH = withApiGuardrails<{ projectId: string; drawingId: string }>(
  "projects/[projectId]/drawings/[drawingId]/publish#PATCH",
  async ({ request, params }) => {
  const { projectId, drawingId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/drawings/[drawingId]/publish#PATCH", message: "Authentication required." });
  }

  const service = new DrawingService(createServiceClient());
  const result = await service.publish(projectId, drawingId);

  if (result.error) {
    return apiErrorResponse(result.error);
  }

  return NextResponse.json(result.data);
  },
);

/**
 * DELETE /api/projects/[projectId]/drawings/[drawingId]/publish
 * Unpublish a drawing (is_published = false)
 */
export const DELETE = withApiGuardrails<{ projectId: string; drawingId: string }>(
  "projects/[projectId]/drawings/[drawingId]/publish#DELETE",
  async ({ request, params }) => {
  const { projectId, drawingId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/drawings/[drawingId]/publish#DELETE", message: "Authentication required." });
  }

  const service = new DrawingService(createServiceClient());
  const result = await service.unpublish(projectId, drawingId);

  if (result.error) {
    return apiErrorResponse(result.error);
  }

  return NextResponse.json(result.data);
  },
);
