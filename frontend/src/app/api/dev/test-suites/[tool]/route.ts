/**
 * /api/dev/test-suites/[tool]
 * GET — return the test suite + cases for a given tool slug (e.g. "budget").
 */
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

export const GET = withApiGuardrails<{ tool: string }>(
  "dev/test-suites/[tool]#GET",
  async ({ request, params }) => {
  
    const { tool } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "dev/test-suites/[tool]#GET", message: "Authentication required." });
    }

    const { data: suite, error: suiteError } = await supabase
      .from("test_suites")
      .select("id, tool_name, display_name, total_cases")
      .eq("tool_name", tool)
      .maybeSingle();

    if (suiteError) throw suiteError;
    if (!suite) return NextResponse.json({ suite: null, cases: [] });

    const { data: cases, error: casesError } = await supabase
      .from("test_cases")
      .select("id, test_number, category, subcategory, test_name, steps, expected_result, priority")
      .eq("suite_id", suite.id)
      .order("test_number", { ascending: true });

    if (casesError) throw casesError;

    return NextResponse.json({ suite, cases: cases ?? [] });
    },
);
