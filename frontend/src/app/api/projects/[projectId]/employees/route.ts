import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/projects/[projectId]/employees
 * Returns people with person_type='employee' for use in form dropdowns.
 * Queries the people table directly, case-insensitive on person_type.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const projectIdNum = Number.parseInt(projectId, 10);

    if (Number.isNaN(projectIdNum)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("people")
      .select("id, first_name, last_name")
      .ilike("person_type", "employee")
      .order("last_name", { ascending: true });

    if (error) {
      console.error("Error fetching employees:", error);
      return apiErrorResponse(error);
    }

    return NextResponse.json(data || []);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
