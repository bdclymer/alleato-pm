/**
 * /api/testing/runs
 * GET  ?suite=photos  — list all runs for a suite (with pass/fail counts)
 * POST               — create a new test run and seed test_results rows
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const toolName = searchParams.get("suite");

  if (!toolName) {
    return NextResponse.json({ error: "suite param required" }, { status: 400 });
  }

  // Look up suite
  const { data: suite, error: suiteErr } = await supabase
    .from("test_suites")
    .select("id, tool_name, display_name, total_cases, source_doc_count, last_generated_at")
    .eq("tool_name", toolName)
    .single();

  if (suiteErr || !suite) {
    return NextResponse.json({ error: "Suite not found" }, { status: 404 });
  }

  // Runs with result counts
  const { data: runs, error: runsErr } = await supabase
    .from("test_runs")
    .select(`
      id, run_date, tester, environment, branch, notes,
      test_results (status)
    `)
    .eq("suite_id", suite.id)
    .order("run_date", { ascending: false })
    .limit(20);

  if (runsErr) {
    return NextResponse.json({ error: runsErr.message }, { status: 500 });
  }

  const enriched = (runs ?? []).map((r) => {
    const results = (r.test_results as { status: string }[]) ?? [];
    return {
      id: r.id,
      run_date: r.run_date,
      tester: r.tester,
      environment: r.environment,
      branch: r.branch,
      notes: r.notes,
      total: results.length,
      pass: results.filter((x) => x.status === "pass").length,
      fail: results.filter((x) => x.status === "fail").length,
      skip: results.filter((x) => x.status === "skip").length,
      not_tested: results.filter((x) => x.status === "not_tested").length,
    };
  });

  return NextResponse.json({ suite, runs: enriched });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();
  const { suite, tester, environment, branch, notes } = body as {
    suite: string;
    tester?: string;
    environment?: string;
    branch?: string;
    notes?: string;
  };

  if (!suite) {
    return NextResponse.json({ error: "suite required" }, { status: 400 });
  }

  // Look up suite and its cases
  const { data: suiteRow, error: suiteErr } = await supabase
    .from("test_suites")
    .select("id")
    .eq("tool_name", suite)
    .single();

  if (suiteErr || !suiteRow) {
    return NextResponse.json({ error: "Suite not found" }, { status: 404 });
  }

  const { data: cases, error: casesErr } = await supabase
    .from("test_cases")
    .select("id")
    .eq("suite_id", suiteRow.id);

  if (casesErr) {
    return NextResponse.json({ error: casesErr.message }, { status: 500 });
  }

  // Create the run
  const { data: run, error: runErr } = await supabase
    .from("test_runs")
    .insert({
      suite_id: suiteRow.id,
      tester: tester ?? null,
      environment: environment ?? "localhost:3000",
      branch: branch ?? null,
      notes: notes ?? null,
    })
    .select("id, run_date")
    .single();

  if (runErr || !run) {
    return NextResponse.json({ error: runErr?.message ?? "Failed to create run" }, { status: 500 });
  }

  // Seed test_results for every case (status=not_tested)
  const resultRows = (cases ?? []).map((c) => ({
    run_id: run.id,
    case_id: c.id,
    status: "not_tested",
  }));

  if (resultRows.length > 0) {
    const { error: seedErr } = await supabase.from("test_results").insert(resultRows);
    if (seedErr) {
      return NextResponse.json({ error: seedErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ run_id: run.id, run_date: run.run_date, case_count: resultRows.length });
}
