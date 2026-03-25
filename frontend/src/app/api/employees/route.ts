import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
