import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/employees
 * Returns people with person_type = 'employee' or 'user' and status = 'active'.
 * Used by the Command Center assignee dropdown.
 */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("people")
    .select("id, first_name, last_name, email, job_title, person_type")
    .in("person_type", ["employee", "user"])
    .eq("status", "active")
    .order("first_name", { ascending: true });

  if (error) {
    return apiErrorResponse(error);
  }

  return NextResponse.json(data);
}
