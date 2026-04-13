/**
 * /api/testing/runs
 * GET  ?suite=photos  — list all runs for a suite (with pass/fail counts)
 * POST               — create a new test run and seed test_results rows
 */
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const GET = withApiGuardrails(
  "testing/runs#GET",
  async ({ request }) => {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
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
  const withDepthRuns = await supabase
    .from("test_runs")
    .select(`
      id, run_date, tester, environment, branch, notes, scenario_depth,
      test_results (status)
    `)
    .eq("suite_id", suite.id)
    .order("run_date", { ascending: false })
    .limit(20);

  let runs = withDepthRuns.data;
  let depthAvailable = !withDepthRuns.error;

  if (withDepthRuns.error) {
    const fallbackRuns = await supabase
      .from("test_runs")
      .select(`
        id, run_date, tester, environment, branch, notes,
        test_results (status)
      `)
      .eq("suite_id", suite.id)
      .order("run_date", { ascending: false })
      .limit(20);
    if (fallbackRuns.error) {
      return NextResponse.json({ error: fallbackRuns.error.message }, { status: 500 });
    }
    runs = fallbackRuns.data as unknown as typeof withDepthRuns.data;
    depthAvailable = false;
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
      scenario_depth: depthAvailable ? r.scenario_depth : "all",
      total: results.length,
      pass: results.filter((x) => x.status === "pass").length,
      fail: results.filter((x) => x.status === "fail").length,
      skip: results.filter((x) => x.status === "skip").length,
      not_tested: results.filter((x) => x.status === "not_tested").length,
    };
  });

  return NextResponse.json({ suite, runs: enriched });
  },
);

export const POST = withApiGuardrails(
  "testing/runs#POST",
  async ({ request }) => {
  const supabase = await createClient();
  const body = await request.json();
  const { suite, tester, environment, branch, notes, scenarioDepth, testType } = body as {
    suite: string;
    tester?: string;
    environment?: string;
    branch?: string;
    notes?: string;
    scenarioDepth?: "broad" | "detailed" | "all";
    testType?: "scenario" | "feature" | "all";
  };

  if (!suite) {
    return NextResponse.json({ error: "suite required" }, { status: 400 });
  }

  const allowedDepths = ["broad", "detailed", "all"] as const;
  const normalizedDepth = allowedDepths.includes((scenarioDepth ?? "broad") as (typeof allowedDepths)[number])
    ? (scenarioDepth ?? "broad")
    : "broad";
  const requestedType = testType ?? "all";

  // Look up suite and its cases
  const { data: suiteRow, error: suiteErr } = await supabase
    .from("test_suites")
    .select("id")
    .eq("tool_name", suite)
    .single();

  if (suiteErr || !suiteRow) {
    return NextResponse.json({ error: "Suite not found" }, { status: 404 });
  }

  const withDepthCases = await supabase
    .from("test_cases")
    .select("id, test_type, scenario_depth")
    .eq("suite_id", suiteRow.id);

  let cases = withDepthCases.data;
  let caseDepthAvailable = !withDepthCases.error;

  if (withDepthCases.error) {
    const fallbackCases = await supabase
      .from("test_cases")
      .select("id, test_type")
      .eq("suite_id", suiteRow.id);
    if (fallbackCases.error) {
      return NextResponse.json({ error: fallbackCases.error.message }, { status: 500 });
    }
    cases = fallbackCases.data as unknown as typeof withDepthCases.data;
    caseDepthAvailable = false;
  }

  let selectedCases = (cases ?? []).filter((c) => {
    if (requestedType === "feature") return c.test_type === "feature";
    if (requestedType === "scenario") {
      if (c.test_type !== "scenario") return false;
      if (normalizedDepth === "all") return true;
      if (!caseDepthAvailable) return true;
      return (c.scenario_depth ?? "detailed") === normalizedDepth;
    }
    return true;
  });

  let effectiveDepth: "broad" | "detailed" | "all" = normalizedDepth;
  if (
    requestedType === "scenario" &&
    normalizedDepth === "broad" &&
    selectedCases.length === 0
  ) {
    selectedCases = (cases ?? []).filter(
      (c) => c.test_type === "scenario" && (c.scenario_depth ?? "detailed") === "detailed"
    );
    effectiveDepth = "detailed";
  }

  // Create the run
  const baseRunPayload = {
    suite_id: suiteRow.id,
    tester: tester ?? null,
    environment: environment ?? "localhost:3000",
    branch: branch ?? null,
    notes: notes ?? null,
  };
  const runInsertPayload = caseDepthAvailable
    ? { ...baseRunPayload, scenario_depth: effectiveDepth }
    : baseRunPayload;

  const { data: run, error: runErr } = await supabase
    .from("test_runs")
    .insert(runInsertPayload)
    .select("id, run_date")
    .single();

  if (runErr || !run) {
    return NextResponse.json({ error: runErr?.message ?? "Failed to create run" }, { status: 500 });
  }

  // Seed test_results for every case (status=not_tested)
  const resultRows = selectedCases.map((c) => ({
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

  return NextResponse.json({
    run_id: run.id,
    run_date: run.run_date,
    case_count: resultRows.length,
    effective_depth: effectiveDepth,
    requested_depth: normalizedDepth,
  });
  },
);
