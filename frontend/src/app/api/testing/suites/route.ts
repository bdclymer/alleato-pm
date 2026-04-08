/**
 * /api/testing/suites
 * GET — list all test suites with case counts broken down by type
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("test_suites")
    .select(`
      id, tool_name, display_name, total_cases, source_doc_count, last_generated_at,
      test_cases (id, test_type, priority)
    `)
    .order("display_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const suites = (data ?? []).map((s) => {
    const cases = (s.test_cases as { id: string; test_type: string; priority: string }[]) ?? [];
    return {
      id: s.id,
      tool_name: s.tool_name,
      display_name: s.display_name,
      last_generated_at: s.last_generated_at,
      feature_count: cases.filter((c) => c.test_type === "feature").length,
      scenario_count: cases.filter((c) => c.test_type === "scenario").length,
      high_count: cases.filter((c) => c.priority === "HIGH").length,
    };
  });

  return NextResponse.json({ suites });
}
