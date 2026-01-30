import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const authSupabase = await createClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Use service role client to bypass RLS for public project listing
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    // Pagination params
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = (page - 1) * limit;

    // Filter params
    const search = searchParams.get("search");
    const state = searchParams.get("state");
    const excludeState = searchParams.get("excludeState");
    const archived = searchParams.get("archived");

    let query = supabase
      .from("projects")
      .select("*", { count: "exact" })
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);

    // Add state filter if provided (case-insensitive)
    if (state) {
      query = query.ilike("state", state);
    }

    // Exclude specific state if provided (case-insensitive)
    if (excludeState) {
      query = query.not("state", "ilike", excludeState);
    }

    // Add search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,"job number".ilike.%${search}%`);
    }

    // Add archived filter if provided
    if (archived !== null) {
      query = query.eq("archived", archived === "true");
    }

    const { data, error, count } = await query;

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({
      data,
      meta: {
        page,
        limit,
        total: count,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Use service role client to bypass RLS for project creation
    const supabase = createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("projects")
      .insert(body)
      .select()
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
