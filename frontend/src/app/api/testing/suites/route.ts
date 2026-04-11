/**
 * /api/testing/suites
 * GET — list all test suites with case counts broken down by type
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const withDepth = await supabase
    .from("test_suites")
    .select(`
      id, tool_name, display_name, total_cases, source_doc_count, last_generated_at,
      test_cases (id, test_type, priority, scenario_depth)
    `)
    .order("display_name");

  let data = withDepth.data;
  let depthAvailable = !withDepth.error;

  if (withDepth.error) {
    const fallback = await supabase
      .from("test_suites")
      .select(`
        id, tool_name, display_name, total_cases, source_doc_count, last_generated_at,
        test_cases (id, test_type, priority)
      `)
      .order("display_name");
    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }
    data = fallback.data;
    depthAvailable = false;
  }

  const suites = (data ?? []).map((s) => {
    const cases = (s.test_cases as {
      id: string;
      test_type: string;
      priority: string;
      scenario_depth: "broad" | "detailed" | null;
    }[]) ?? [];
    const scenarioCases = cases.filter((c) => c.test_type === "scenario");
    const broadCount = depthAvailable ? scenarioCases.filter((c) => c.scenario_depth === "broad").length : 0;
    const detailedCount = depthAvailable ? scenarioCases.filter((c) => c.scenario_depth !== "broad").length : scenarioCases.length;
    return {
      id: s.id,
      tool_name: s.tool_name,
      display_name: s.display_name,
      last_generated_at: s.last_generated_at,
      feature_count: cases.filter((c) => c.test_type === "feature").length,
      scenario_count: scenarioCases.length,
      broad_scenario_count: broadCount,
      detailed_scenario_count: detailedCount,
      high_count: cases.filter((c) => c.priority === "HIGH").length,
    };
  });

  return NextResponse.json({ suites });
}
