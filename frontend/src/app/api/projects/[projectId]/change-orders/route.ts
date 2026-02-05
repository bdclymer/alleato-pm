import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { changeOrderSchema } from "@/lib/schemas/financial-schemas";
import type { PaginatedResponse, ZodError } from "@/app/api/types";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const numericProjectId = Number(projectId);

    if (isNaN(numericProjectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const contractId = searchParams.get("contractId");
    const contractType = searchParams.get("contractType");
    const isPrivate = searchParams.get("isPrivate");
    const reviewerId = searchParams.get("reviewerId");

    // Build query with contract relations
    let query = supabase
      .from("change_orders")
      .select(
        `
        *,
        contracts:contract_id (
          id,
          contract_number,
          contract_name,
          contract_type
        )
      `,
        { count: "exact" }
      )
      .eq("project_id", numericProjectId)
      .order("created_at", { ascending: false });

    if (contractId) {
      query = query.eq("contract_id", Number(contractId));
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (isPrivate !== null && isPrivate !== undefined) {
      query = query.eq("is_private", isPrivate === "true");
    }

    if (reviewerId) {
      query = query.eq("designated_reviewer_id", reviewerId);
    }

    if (contractType && contractId === null) {
      // Filter by contract type via join
      query = query.eq("contracts.contract_type", contractType);
    }

    if (search) {
      query = query.or(
        `co_number.ilike.%${search}%,title.ilike.%${search}%,description.ilike.%${search}%`,
      );
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return apiErrorResponse(error);
    }

    const response: PaginatedResponse<(typeof data)[number]> = {
      data: data || [],
      meta: {
        page,
        limit,
        total: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    };
    return NextResponse.json(response);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const numericProjectId = Number(projectId);

    if (isNaN(numericProjectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const body = await request.json();

    const validatedData = changeOrderSchema.parse(body);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("change_orders")
      .insert({
        project_id: numericProjectId,
        ...validatedData,
        submitted_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as ZodError;
      return NextResponse.json(
        { error: "Validation error", issues: zodError.errors },
        { status: 400 },
      );
    }

    return apiErrorResponse(error);
  }
}
