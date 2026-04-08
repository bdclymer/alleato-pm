/**
 * /api/dev/test-runs
 * POST — start a new test run for a suite. Pre-creates one not_tested
 *        result row per case so the UI can PATCH them as the tester goes.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { suite_id, tester, environment, branch, notes } = body ?? {};
    if (!suite_id) {
      return NextResponse.json({ error: "suite_id required" }, { status: 400 });
    }

    const { data: run, error: runError } = await supabase
      .from("test_runs")
      .insert({
        suite_id,
        tester: tester ?? user.email ?? null,
        environment: environment ?? "localhost:3000",
        branch: branch ?? null,
        notes: notes ?? null,
      })
      .select("id, suite_id, tester, environment, branch, notes, run_date")
      .single();
    if (runError) throw runError;

    const { data: cases, error: casesError } = await supabase
      .from("test_cases")
      .select("id")
      .eq("suite_id", suite_id);
    if (casesError) throw casesError;

    if (cases && cases.length > 0) {
      const rows = cases.map((c) => ({
        run_id: run.id,
        case_id: c.id,
        status: "not_tested" as const,
      }));
      const { error: insertError } = await supabase.from("test_results").insert(rows);
      if (insertError) throw insertError;
    }

    return NextResponse.json({ run });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
