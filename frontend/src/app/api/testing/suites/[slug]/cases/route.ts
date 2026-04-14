/**
 * /api/testing/suites/[slug]/cases
 * GET ?type=scenario|feature&depth=broad|detailed|all
 *   — returns all test cases for a tool, grouped by category
 */
import { NextResponse } from "next/server";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { createClient } from "@/lib/supabase/server";

export const GET = withApiGuardrails<{ slug: string }>(
  "testing/suites/[slug]/cases#GET",
  async ({ request, params }) => {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type") ?? "scenario";
    const depthFilter = searchParams.get("depth") ?? "broad";

    const supabase = await createClient();

    const { data: suite, error: suiteErr } = await supabase
      .from("test_suites")
      .select("id, tool_name, display_name")
      .eq("tool_name", slug)
      .single();

    if (suiteErr || !suite) {
      return NextResponse.json({ error: "Suite not found" }, { status: 404 });
    }

    let query = supabase
      .from("test_cases")
      .select(
        "id, test_number, category, subcategory, test_name, context_note, setup_steps, steps, expected_result, priority, start_url, test_type, scenario_depth"
      )
      .eq("suite_id", suite.id)
      .order("test_number");

    if (typeFilter !== "all") {
      query = query.eq("test_type", typeFilter);
    }
    if (depthFilter !== "all" && typeFilter === "scenario") {
      query = query.eq("scenario_depth", depthFilter);
    }

    const { data: cases, error: casesErr } = await query;

    if (casesErr) {
      return NextResponse.json({ error: casesErr.message }, { status: 500 });
    }

    // Group by category, preserving natural order of first appearance
    const categoryOrder: string[] = [];
    const grouped: Record<string, typeof cases> = {};
    for (const c of cases ?? []) {
      if (!grouped[c.category]) {
        grouped[c.category] = [];
        categoryOrder.push(c.category);
      }
      grouped[c.category].push(c);
    }

    return NextResponse.json({
      suite: { tool_name: suite.tool_name, display_name: suite.display_name },
      total: cases?.length ?? 0,
      categories: categoryOrder,
      grouped,
    });
  }
);
