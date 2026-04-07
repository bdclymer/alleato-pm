/**
 * /api/testing/runs/[runId]/results
 * GET  — all results for a run, with case details, grouped by category
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("test_results")
    .select(`
      id, status, notes, updated_at,
      test_cases (
        id, test_number, category, subcategory, test_name,
        steps, expected_result, priority
      ),
      test_screenshots (id, public_url, label, created_at)
    `)
    .eq("run_id", runId)
    .order("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sort by test_number (e.g. "1.1.2" < "1.1.10")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sorted = (data ?? []).sort((a: any, b: any) => {
    const numA: string = (a.test_cases as { test_number: string } | null)?.test_number ?? "";
    const numB: string = (b.test_cases as { test_number: string } | null)?.test_number ?? "";
    const partsA = numA.split(".").map(Number);
    const partsB = numB.split(".").map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });

  return NextResponse.json({ results: sorted });
}
