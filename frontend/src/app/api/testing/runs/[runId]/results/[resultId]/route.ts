/**
 * /api/testing/runs/[runId]/results/[resultId]
 * PATCH — update status and/or notes for a single test result.
 *         When status transitions to "fail" and no GitHub issue exists yet,
 *         a GitHub issue is automatically created (mirrors admin_feedback_items pattern).
 */
import { withApiGuardrails } from "@/lib/guardrails/api";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTestFailureGitHubIssue } from "@/lib/testing/github";

export const PATCH = withApiGuardrails<{ runId: string; resultId: string }>(
  "testing/runs/[runId]/results/[resultId]#PATCH",
  async ({ request, params }) => {
    const { runId, resultId } = await params;
    const supabase = await createClient();

    const body = await request.json();
    const { status, notes, severity, video_url } = body as {
      status?: string;
      notes?: string;
      severity?: string | null;
      video_url?: string | null;
    };

    const validStatuses = ["pass", "fail", "skip", "not_tested"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const validSeverities = ["critical", "major", "minor", "cosmetic"];
    if (severity && !validSeverities.includes(severity)) {
      return NextResponse.json({ error: "Invalid severity" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (severity !== undefined) updates.severity = severity ?? null;
    if (video_url !== undefined) updates.video_url = video_url ?? null;

    // Auto-create a GitHub issue when marking a result as failed (first time only).
    if (status === "fail") {
      // Fetch the existing result to check if an issue was already created,
      // and load the test case + run context needed to build the issue body.
      type ExistingResult = {
        github_issue_number: number | null;
        test_cases: {
          test_number: string;
          test_name: string;
          category: string;
          subcategory: string | null;
          steps: string | null;
          expected_result: string | null;
          start_url: string | null;
        } | null;
        test_runs: {
          slug: string | null;
          test_suites: { tool_name: string; display_name: string } | null;
        } | null;
      };

      const { data: existing } = await supabase
        .from("test_results")
        .select(
          "github_issue_number, case_id, run_id, " +
          "test_cases(test_number, test_name, category, subcategory, steps, expected_result, start_url), " +
          "test_runs(slug, test_suites(tool_name, display_name))"
        )
        .eq("id", resultId)
        .single() as { data: ExistingResult | null; error: unknown };

      if (existing && !existing.github_issue_number) {
        const tc = existing.test_cases;
        const run = existing.test_runs;

        if (tc) {
          try {
            const issue = await createTestFailureGitHubIssue({
              testNumber: tc.test_number,
              testName: tc.test_name,
              category: tc.category,
              subcategory: tc.subcategory,
              notes: (notes ?? null) as string | null,
              severity: (severity ?? null) as string | null,
              startUrl: tc.start_url,
              expectedResult: tc.expected_result,
              steps: tc.steps,
              runId,
              runSlug: run?.slug ?? null,
              toolName: run?.test_suites?.display_name ?? null,
            });

            if (issue) {
              updates.github_issue_number = issue.number;
              updates.github_issue_url = issue.url;
              updates.github_issue_state = issue.state;
            }
          } catch {
            // Non-fatal — result is still saved even if GitHub issue creation fails
          }
        }
      }
    }

    const { data, error } = await supabase
      .from("test_results")
      .update(updates)
      .eq("id", resultId)
      .select("id, status, notes, severity, video_url, github_issue_number, github_issue_url, github_issue_state, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ result: data });
  },
);
