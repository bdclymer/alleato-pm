import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import { PunchItemService } from "@/services/PunchItemService";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/projects/[projectId]/punch-items/[punchItemId]
 * Get a single punch item
 */
export const GET = withApiGuardrails<{ projectId: string; punchItemId: string }>(
  "projects/[projectId]/punch-items/[punchItemId]#GET",
  async ({ request, params }) => {
  const { projectId, punchItemId } = await params;
  const numericProjectId = parseInt(projectId, 10);
  const supabase = await createClient();

  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/punch-items/[punchItemId]#GET", message: "Authentication required." });
  }

  const service = new PunchItemService(supabase);
  const result = await service.getById(numericProjectId, punchItemId);

  if (result.error) {
    return apiErrorResponse(result.error);
  }

  return NextResponse.json(result.data);
  },
);

/**
 * PATCH /api/projects/[projectId]/punch-items/[punchItemId]
 * Update a punch item
 */
export const PATCH = withApiGuardrails<{ projectId: string; punchItemId: string }>(
  "projects/[projectId]/punch-items/[punchItemId]#PATCH",
  async ({ request, params }) => {
  const { projectId, punchItemId } = await params;
  const numericProjectId = parseInt(projectId, 10);
  const supabase = await createClient();

  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/punch-items/[punchItemId]#PATCH", message: "Authentication required." });
  }

  try {
    const body = await request.json();

    // Normalize empty strings for nullable date/string fields
    const sanitized = { ...body };
    if (sanitized.due_date === "") sanitized.due_date = null;
    if (sanitized.description === "") sanitized.description = null;
    if (sanitized.assignee_company === "") sanitized.assignee_company = null;
    if (sanitized.ball_in_court === "") sanitized.ball_in_court = null;
    if (sanitized.location === "") sanitized.location = null;
    if (sanitized.trade === "") sanitized.trade = null;
    if (sanitized.type === "") sanitized.type = null;
    if (sanitized.reference === "") sanitized.reference = null;

    const service = new PunchItemService(supabase);
    const result = await service.update(
      numericProjectId,
      punchItemId,
      sanitized,
      user.id,
    );

    if (result.error) {
      return apiErrorResponse(result.error);
    }

    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json(
      { error: "Failed to update punch item" },
      { status: 500 },
    );
  }
  },
);

/**
 * DELETE /api/projects/[projectId]/punch-items/[punchItemId]
 * Soft delete a punch item (moves to recycle bin)
 */
export const DELETE = withApiGuardrails<{ projectId: string; punchItemId: string }>(
  "projects/[projectId]/punch-items/[punchItemId]#DELETE",
  async ({ request, params }) => {
  const { projectId, punchItemId } = await params;
  const numericProjectId = parseInt(projectId, 10);
  const supabase = await createClient();

  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/punch-items/[punchItemId]#DELETE", message: "Authentication required." });
  }

  const service = new PunchItemService(supabase);
  const result = await service.softDelete(
    numericProjectId,
    punchItemId,
    user.id,
  );

  if (result.error) {
    return apiErrorResponse(result.error);
  }

  return NextResponse.json({ success: true });
  },
);
