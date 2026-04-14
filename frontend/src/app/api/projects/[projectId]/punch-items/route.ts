import { withApiGuardrails, parseJsonBody } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import { PunchItemService } from "@/services/PunchItemService";
import type { PunchItemFilters } from "@/services/PunchItemService";
import { apiErrorResponse } from "@/lib/api-error";

const PUNCH_ITEM_STATUSES = ["draft", "work_required", "initiated", "closed"] as const;

const createPunchItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  status: z.enum(PUNCH_ITEM_STATUSES).default("draft"),
  priority: z.enum(["low", "medium", "high"]).optional().nullable(),
  assignee_id: z.string().uuid().optional().nullable(),
  assignee_company: z.string().optional().nullable(),
  ball_in_court: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  trade: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  drawing_reference: z.string().optional().nullable(),
});

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

  const user = await getApiRouteUser();
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

  const user = await getApiRouteUser();
  if (!user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/punch-items#POST", message: "Authentication required." });
  }

  // Zod validates all fields including status enum — rejects "open", "complete", etc.
  const body = await parseJsonBody(request, createPunchItemSchema, "projects/[projectId]/punch-items#POST");

  const service = new PunchItemService(supabase);
  const result = await service.create(numericProjectId, body, user.id);

  if (result.error) {
    return apiErrorResponse(result.error);
  }

  return NextResponse.json(result.data, { status: 201 });
  },
);
