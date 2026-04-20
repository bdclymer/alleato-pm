/**
 * RFI API Route (Collection-Level)
 *
 * GET /api/projects/[projectId]/rfis - List RFIs with filters
 * POST /api/projects/[projectId]/rfis - Create new RFI
 */

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { rfiDraftSchema, rfiOpenSchema } from "@/lib/schemas/rfi-schema";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";

type RouteParams = {
  params: Promise<{ projectId: string }>;
};

/**
 * GET /api/projects/[projectId]/rfis
 * List RFIs with filtering, pagination, and search
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/rfis#GET",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const numericProjectId = Number(projectId);
    if (isNaN(numericProjectId)) {
      return NextResponse.json(
        { error: "Invalid projectId" },
        { status: 400 },
      );
    }

    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "200");

    let query = supabase
      .from("rfis")
      .select("*", { count: "exact" })
      .eq("project_id", numericProjectId)
      .order("number", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        `subject.ilike.%${search}%,question.ilike.%${search}%`,
      );
    }

    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error({ msg: "RFI list error:", error: error instanceof Error ? error.message : String(error) });
      return apiErrorResponse(error);
    }

    return NextResponse.json({
      data: data || [],
      meta: {
        page,
        limit,
        total: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    });
    },
);

/**
 * POST /api/projects/[projectId]/rfis
 * Create a new RFI
 */
export const POST = withApiGuardrails(
  "projects/[projectId]/rfis#POST",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/rfis#POST", message: "Authentication required." });
    }

    const numericProjectId = Number(projectId);
    if (isNaN(numericProjectId)) {
      return NextResponse.json(
        { error: "Invalid projectId" },
        { status: 400 },
      );
    }

    // Use appropriate schema based on status
    const targetStatus = body.status || "draft";
    const schema = targetStatus === "draft" ? rfiDraftSchema : rfiOpenSchema;

    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation error", issues: result.error.flatten() },
        { status: 400 },
      );
    }

    // Get next RFI number for this project
    const { data: lastRfi } = await supabase
      .from("rfis")
      .select("number")
      .eq("project_id", numericProjectId)
      .order("number", { ascending: false })
      .limit(1)
      .single();

    const nextNumber = (lastRfi?.number ?? 0) + 1;

    // Prepare insert data
    const insertData = {
      project_id: numericProjectId,
      number: nextNumber,
      subject: result.data.subject,
      question: result.data.question || "",
      status: targetStatus,
      due_date: result.data.due_date || null,
      assignees: result.data.assignees || [],
      rfi_manager: result.data.rfi_manager || null,
      received_from: result.data.received_from || null,
      responsible_contractor: result.data.responsible_contractor || null,
      distribution_list: result.data.distribution_list || [],
      location: result.data.location || null,
      specification: result.data.specification || null,
      cost_code: result.data.cost_code || null,
      schedule_impact: result.data.schedule_impact || null,
      cost_impact: result.data.cost_impact || null,
      reference: result.data.reference || null,
      is_private: result.data.is_private || false,
      rfi_stage: result.data.rfi_stage || null,
      drawing_number: result.data.drawing_number || null,
      created_by: user.email || user.id,
      date_initiated: new Date().toISOString().split("T")[0],
      ball_in_court:
        targetStatus === "open" && result.data.assignees?.length
          ? result.data.assignees.join(", ")
          : null,
    };

    const { data, error } = await supabase
      .from("rfis")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error({ msg: "RFI create error:", error: error instanceof Error ? error.message : String(error) });
      return apiErrorResponse(error);
    }

    return NextResponse.json(data, { status: 201 });
    },
);
