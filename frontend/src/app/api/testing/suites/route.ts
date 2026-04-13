/**
 * /api/testing/suites
 * GET — list all test suites with case counts broken down by type
 */
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const GET = withApiGuardrails(
  "testing/suites#GET",
  async () => {
  const supabase = await createClient();

  // Fetch suites and cases in two separate queries to avoid relying on
  // PostgREST schema cache for recently-added columns (e.g. scenario_depth).
  const [suitesRes, casesRes] = await Promise.all([
    supabase
      .from("test_suites")
      .select("id, tool_name, display_name, total_cases, source_doc_count, last_generated_at")
      .order("display_name"),
    supabase
      .from("test_cases")
      .select("id, suite_id, test_type, priority, scenario_depth"),
  ]);

  if (suitesRes.error) {
    return NextResponse.json({ error: suitesRes.error.message }, { status: 500 });
  }
  if (casesRes.error) {
    return NextResponse.json({ error: casesRes.error.message }, { status: 500 });
  }

  const allCases = (casesRes.data ?? []) as {
    id: string;
    suite_id: string;
    test_type: string;
    priority: string;
    scenario_depth: "broad" | "detailed" | null;
  }[];

  const suites = (suitesRes.data ?? []).map((s) => {
    const cases = allCases.filter((c) => c.suite_id === s.id);
    const scenarioCases = cases.filter((c) => c.test_type === "scenario");
    const broadCount = scenarioCases.filter((c) => c.scenario_depth === "broad").length;
    const detailedCount = scenarioCases.filter((c) => c.scenario_depth !== "broad").length;
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
  },
);
