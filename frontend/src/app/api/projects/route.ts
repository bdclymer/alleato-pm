import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Get the user's person_id to filter projects by membership
    const { data: authLink } = await supabase
      .from("users_auth")
      .select("person_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    // Check if user is an app admin (can see all projects)
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.is_admin === true;

    const { searchParams } = new URL(request.url);

    // Pagination params
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = (page - 1) * limit;

    // Get project IDs the user has active membership in (unless admin)
    let allowedProjectIds: number[] | null = null;
    if (!isAdmin && authLink?.person_id) {
      const { data: memberships } = await supabase
        .from("project_directory_memberships")
        .select("project_id")
        .eq("person_id", authLink.person_id)
        .eq("status", "active");

      allowedProjectIds = memberships?.map((m) => m.project_id) ?? [];
    } else if (!isAdmin && !authLink) {
      // User has no person record — return empty
      return NextResponse.json({
        data: [],
        meta: { page, limit, total: 0, totalPages: 0 },
      });
    }

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

    // Filter to only projects the user has membership in (unless admin)
    if (allowedProjectIds !== null) {
      if (allowedProjectIds.length === 0) {
        return NextResponse.json({
          data: [],
          meta: { page, limit, total: 0, totalPages: 0 },
        });
      }
      query = query.in("id", allowedProjectIds);
    }

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
