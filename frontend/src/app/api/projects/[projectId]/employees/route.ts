import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/projects/[projectId]/employees
 * Returns project employees for use in form dropdowns (e.g., Direct Costs).
 * Queries project_directory_memberships joined with people table.
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

    // Get people who are members of this project
    const { data, error } = await supabase
      .from("project_directory_memberships")
      .select("person_id, people ( id, first_name, last_name )")
      .eq("project_id", projectIdNum)
      .eq("status", "active");

    if (error) {
      console.error("Error fetching employees:", error);
      return NextResponse.json(
        { error: "Failed to fetch employees", details: error.message },
        { status: 500 },
      );
    }

    // Map to the shape the DirectCostForm expects:
    // { id: string, first_name: string, last_name: string }
    const employees = (data || [])
      .map((row: Record<string, unknown>) => {
        const people = row.people as
          | { id: string; first_name: string; last_name: string }
          | { id: string; first_name: string; last_name: string }[]
          | null;
        const person = Array.isArray(people) ? people[0] : people;

        if (!person) return null;

        return {
          id: person.id,
          first_name: person.first_name,
          last_name: person.last_name,
        };
      })
      .filter(Boolean);

    return NextResponse.json(employees);
  } catch (error) {
    console.error("Error in employees API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
