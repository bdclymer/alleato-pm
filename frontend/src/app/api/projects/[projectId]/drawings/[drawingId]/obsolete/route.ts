import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DrawingService } from "@/services/DrawingService";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * PATCH /api/projects/[projectId]/drawings/[drawingId]/obsolete
 * Mark a drawing as obsolete (is_obsolete = true)
 */
export const PATCH = withApiGuardrails<{ projectId: string; drawingId: string }>(
  "projects/[projectId]/drawings/[drawingId]/obsolete#PATCH",
  async ({ request, params }) => {
  const { projectId, drawingId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/drawings/[drawingId]/obsolete#PATCH", message: "Authentication required." });
  }

  const service = new DrawingService(createServiceClient());
  const result = await service.markObsolete(projectId, drawingId);

  if (result.error) {
    return apiErrorResponse(result.error);
  }

  return NextResponse.json(result.data);
  },
);

/**
 * DELETE /api/projects/[projectId]/drawings/[drawingId]/obsolete
 * Restore a drawing from obsolete (is_obsolete = false)
 */
export const DELETE = withApiGuardrails<{ projectId: string; drawingId: string }>(
  "projects/[projectId]/drawings/[drawingId]/obsolete#DELETE",
  async ({ request, params }) => {
  const { projectId, drawingId } = await params;
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/drawings/[drawingId]/obsolete#DELETE", message: "Authentication required." });
  }

  const service = new DrawingService(createServiceClient());
  const result = await service.restoreObsolete(projectId, drawingId);

  if (result.error) {
    return apiErrorResponse(result.error);
  }

  return NextResponse.json(result.data);
  },
);
