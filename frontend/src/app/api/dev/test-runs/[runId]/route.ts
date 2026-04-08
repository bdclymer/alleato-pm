/**
 * /api/dev/test-runs/[runId]
 * GET — return a run with its results joined to test_cases.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: run, error: runError } = await supabase
      .from("test_runs")
      .select("id, suite_id, tester, environment, branch, notes, run_date")
      .eq("id", runId)
      .single();
    if (runError) throw runError;

    const { data: results, error: resultsError } = await supabase
      .from("test_results")
      .select("id, case_id, status, notes, test_cases(test_number, test_name, category, steps, expected_result, priority)")
      .eq("run_id", runId);
    if (resultsError) throw resultsError;

    return NextResponse.json({ run, results: results ?? [] });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
