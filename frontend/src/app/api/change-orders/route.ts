import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { changeOrderSchema } from "@/lib/schemas/financial-schemas";
import type { PaginatedResponse, ChangeOrder, ZodError } from "@/app/api/types";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const commitmentId = searchParams.get("commitmentId");
    const projectId = searchParams.get("projectId");

    let query = supabase
      .from("change_orders")
      .select(
        `
        *,
        commitment:commitments!commitment_id(id, number, title),
        change_event:change_events!change_event_id(id, number, title)
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    // Filter by project if projectId is provided (via commitment)
    if (projectId) {
      query = query.eq("commitments.project_id", projectId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (commitmentId) {
      query = query.eq("commitment_id", commitmentId);
    }

    if (search) {
      query = query.or(`number.ilike.%${search}%,title.ilike.%${search}%`);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return apiErrorResponse(error);
    }

    const response: PaginatedResponse<ChangeOrder> = {
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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validate request body
    const validatedData = changeOrderSchema.parse(body);

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the commitment exists
    const { data: commitment, error: commitmentError } = await supabase
      .from("commitments")
      .select("id")
      .eq("id", validatedData.commitment_id)
      .single();

    if (commitmentError || !commitment) {
      return NextResponse.json(
        { error: "Commitment not found" },
        { status: 404 },
      );
    }

    // Verify the change event exists
    const { data: changeEvent, error: changeEventError } = await supabase
      .from("change_events")
      .select("id")
      .eq("id", validatedData.change_event_id)
      .single();

    if (changeEventError || !changeEvent) {
      return NextResponse.json(
        { error: "Change event not found" },
        { status: 404 },
      );
    }

    // Create change order
    const changeOrder = {
      ...validatedData,
      created_by: user.id,
    };

    const { data, error } = await supabase
      .from("change_orders")
      .insert(changeOrder)
      .select(
        `
        *,
        commitment:commitments!commitment_id(id, number, title),
        change_event:change_events!change_event_id(id, number, title)
      `,
      )
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
