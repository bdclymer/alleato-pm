/**
 * RFI API Route (Collection-Level)
 *
 * GET /api/rfis?projectId=X - List RFIs with filters
 * POST /api/rfis - Create new RFI
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { rfiDraftSchema, rfiOpenSchema } from "@/lib/schemas/rfi-schema";
import { ZodError } from "zod";

/**
 * GET /api/rfis
 * List RFIs with filtering, pagination, and search
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "200");

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing required parameter: projectId" },
        { status: 400 },
      );
    }

    const numericProjectId = Number(projectId);
    if (isNaN(numericProjectId)) {
      return NextResponse.json(
        { error: "Invalid projectId" },
        { status: 400 },
      );
    }

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
      console.error("RFI list error:", error);
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
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * POST /api/rfis
 * Create a new RFI
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate projectId
    if (!body.project_id) {
      return NextResponse.json(
        { error: "Missing required field: project_id" },
        { status: 400 },
      );
    }

    const numericProjectId = Number(body.project_id);
    if (isNaN(numericProjectId)) {
      return NextResponse.json(
        { error: "Invalid project_id" },
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
      console.error("RFI create error:", error);
      return apiErrorResponse(error);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.issues },
        { status: 400 },
      );
    }
    return apiErrorResponse(error);
  }
}
