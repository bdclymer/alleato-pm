/**
 * /api/dev/test-suites/[tool]
 * GET — return the test suite + cases for a given tool slug (e.g. "budget").
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tool: string }> },
) {
  try {
    const { tool } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch (error) {
    return apiErrorResponse(error);
  }
}
