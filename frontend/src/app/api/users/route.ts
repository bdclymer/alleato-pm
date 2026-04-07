import { NextResponse } from "next/server";
import { getApiRouteUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/users
 *
 * Returns all user profiles. Requires authenticated user.
 */
export async function GET() {
  try {
    const requestUser = await getApiRouteUser();
    if (!requestUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, email, full_name")
      .order("full_name", { ascending: true });

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({ users: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch users", details: message },
      { status: 500 },
    );
  }
}
