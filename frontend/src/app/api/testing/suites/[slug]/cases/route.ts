/**
 * /api/testing/suites/[slug]/cases
 * GET ?type=scenario|feature&depth=broad|detailed|all
 *   — returns all active (non-inactive) test cases for a tool, grouped by category.
 *     The depth param is accepted for backward compatibility but not applied.
 */
import { NextResponse } from "next/server";

import { withApiGuardrails } from "@/lib/guardrails/api";
import { createClient } from "@/lib/supabase/server";

export const GET = withApiGuardrails<{ slug: string }>(
  "testing/suites/[slug]/cases#GET",
  async ({ request, params }) => {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type") ?? "all";

    const supabase = await createClient();

    const { data: suite, error: suiteErr } = await supabase
      .from("test_suites")
      .select("id, tool_name, display_name")
      .eq("tool_name", slug)
      .single();

    if (suiteErr || !suite) {
      return NextResponse.json({ error: "Suite not found" }, { status: 404 });
    }

    // Use "or" so that cases with status=null (not yet explicitly set) are included,
    // and only rows explicitly marked status='inactive' are excluded.
    let query = supabase
      .from("test_cases")
      .select(
        "id, test_number, category, subcategory, test_name, context_note, setup_steps, steps, expected_result, priority, start_url, test_type, scenario_depth"
      )
      .eq("suite_id", suite.id)
      .or("status.is.null,status.neq.inactive");

    if (typeFilter !== "all") {
      query = query.eq("test_type", typeFilter);
    }

    const { data: cases, error: casesErr } = await query;

    if (casesErr) {
      return NextResponse.json({ error: casesErr.message }, { status: 500 });
    }

    // Keep scenario ordering stable for execution by sorting mixed test numbers naturally.
    const testNumberCollator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: "base",
    });
    const sortedCases = [...(cases ?? [])].sort((a, b) => {
      return testNumberCollator.compare(a.test_number ?? "", b.test_number ?? "");
    });

    // Group by category, preserving natural order of first appearance
    const categoryOrder: string[] = [];
    const grouped: Record<string, typeof cases> = {};
    for (const c of sortedCases) {
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
