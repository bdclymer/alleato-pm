import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PunchItemService } from "@/services/PunchItemService";
import type { PunchItemFilters } from "@/services/PunchItemService";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/projects/[projectId]/punch-items
 * List punch items with optional filters
 */
export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/punch-items#GET",
  async ({ request, params }) => {
  const { projectId } = await params;
  const numericProjectId = parseInt(projectId, 10);
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/punch-items#GET", message: "Authentication required." });
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const filters: PunchItemFilters = {
    search: searchParams.get("search") || undefined,
    status: searchParams.get("status") || undefined,
    priority: searchParams.get("priority") || undefined,
    assignee_id: searchParams.get("assignee_id") || undefined,
    is_deleted: searchParams.get("is_deleted") === "true",
    page: searchParams.get("page")
      ? Number(searchParams.get("page"))
      : undefined,
    page_size: searchParams.get("page_size")
      ? Number(searchParams.get("page_size"))
      : undefined,
  };

  const service = new PunchItemService(supabase);
  const result = await service.list(numericProjectId, filters);

  if (result.error) {
    return apiErrorResponse(result.error);
  }

  return NextResponse.json(result.data);
  },
);

/**
 * POST /api/projects/[projectId]/punch-items
 * Create a new punch item
 */
export const POST = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/punch-items#POST",
  async ({ request, params }) => {
  const { projectId } = await params;
  const numericProjectId = parseInt(projectId, 10);
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/punch-items#POST", message: "Authentication required." });
  }

  try {
    const body = await request.json();

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 },
      );
    }

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
    const result = await service.create(numericProjectId, sanitized, user.id);

    if (result.error) {
      return apiErrorResponse(result.error);
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create punch item" },
      { status: 500 },
    );
  }
  },
);
