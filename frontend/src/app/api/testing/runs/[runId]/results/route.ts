/**
 * /api/testing/runs/[runId]/results
 * GET  — all results for a run, with case details, grouped by category
 */
import { withApiGuardrails } from "@/lib/guardrails/api";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ResultRow = {
  test_cases: {
    test_number: string | null;
    test_type: string | null;
  }[] | {
    test_number: string | null;
    test_type: string | null;
  } | null;
};

function normalizeTestCase(
  value: ResultRow["test_cases"],
): { test_number: string | null; test_type: string | null } | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export const GET = withApiGuardrails<{ runId: string }>(
  "testing/runs/[runId]/results#GET",
  async ({ request, params }) => {
  const { runId } = await params;
  const { searchParams } = new URL(request.url);
  const typeFilter = searchParams.get("type"); // "scenario" | "feature" | null (all)
  const supabase = await createClient();

  const withDepth = await supabase
    .from("test_results")
    .select(`
      id, status, notes, updated_at,
      test_cases (
        id, test_number, category, subcategory, test_name,
        steps, setup_steps, context_note, expected_result, priority,
        test_type, start_url, scenario_depth
      ),
      test_screenshots (id, public_url, label, created_at)
    `)
    .eq("run_id", runId)
    .order("id");

  let data: ResultRow[] | null = withDepth.data as unknown as ResultRow[] | null;
  if (withDepth.error) {
    const fallback = await supabase
      .from("test_results")
      .select(`
        id, status, notes, updated_at,
        test_cases (
          id, test_number, category, subcategory, test_name,
          steps, setup_steps, context_note, expected_result, priority,
          test_type, start_url
        ),
        test_screenshots (id, public_url, label, created_at)
      `)
      .eq("run_id", runId)
      .order("id");
    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }
    data = fallback.data as unknown as ResultRow[] | null;
  }

  // Filter by test_type in JS (PostgREST .eq on embedded resources filters embedded rows, not parents)
  const filtered = typeFilter
    ? (data ?? []).filter(
        (row) => normalizeTestCase(row.test_cases)?.test_type === typeFilter,
      )
    : (data ?? []);

  // Sort by test_number (e.g. "1.1.2" < "1.1.10")
  const sorted = filtered.sort((a: ResultRow, b: ResultRow) => {
    const numA = normalizeTestCase(a.test_cases)?.test_number ?? "";
    const numB = normalizeTestCase(b.test_cases)?.test_number ?? "";
    const partsA = numA.split(".").map(Number);
    const partsB = numB.split(".").map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });

  return NextResponse.json({ results: sorted });
  },
);
