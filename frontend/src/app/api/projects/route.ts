import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiErrorResponse } from "@/lib/api-error";

function normalizeOptionalDate(value: unknown): string | null | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === "string") {
    return value.trim() === "" ? null : value;
  }
  return String(value);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getApiRouteUser();
    if (!user) {
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
        isAdmin,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiRouteUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const supabase = createServiceClient();
    const body = (await request.json()) as Record<string, unknown>;

    // Set default phase to "Current" if not provided
    const projectData: Record<string, unknown> = {
      phase: "Current",
      ...body,
    };
    const normalizedStartDate = normalizeOptionalDate(body["start date"]);
    if (typeof normalizedStartDate !== "undefined") {
      projectData["start date"] = normalizedStartDate;
    }
    const normalizedEstCompletion = normalizeOptionalDate(body["est completion"]);
    if (typeof normalizedEstCompletion !== "undefined") {
      projectData["est completion"] = normalizedEstCompletion;
    }

    const { data, error } = await supabase
      .from("projects")
      .insert(projectData)
      .select()
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    // Auto-add the creator as a project member with admin permissions
    const { data: authLink } = await supabase
      .from("users_auth")
      .select("person_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (authLink?.person_id) {
      // Find the "Project Admin" permission template (or any admin-level system template)
      const { data: adminTemplate } = await supabase
        .from("permission_templates")
        .select("id")
        .eq("is_system", true)
        .ilike("name", "%admin%")
        .maybeSingle();

      await supabase
        .from("project_directory_memberships")
        .insert({
          person_id: authLink.person_id,
          project_id: data.id,
          user_type: "internal",
          status: "active",
          role: "Project Admin",
          permission_template_id: adminTemplate?.id ?? null,
        });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
