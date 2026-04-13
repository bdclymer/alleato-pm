/**
 * /api/testing/cases/[caseId]
 * PATCH — update editable fields of a test case (steps, setup_steps, context_note, expected_result, start_url)
 */
import { withApiGuardrails } from "@/lib/guardrails/api";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  steps: z.string().optional(),
  setup_steps: z.string().nullable().optional(),
  context_note: z.string().nullable().optional(),
  expected_result: z.string().nullable().optional(),
  start_url: z.string().nullable().optional(),
});

export const PATCH = withApiGuardrails<{ caseId: string }>(
  "testing/cases/[caseId]#PATCH",
  async ({ request, params }) => {
    const { caseId } = params;
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message, code: "VALIDATION_FAILED", where: "testing/cases PATCH" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("test_cases")
      .update(parsed.data)
      .eq("id", caseId)
      .select("id, steps, setup_steps, context_note, expected_result, start_url")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message, code: "DB_ERROR", where: "testing/cases PATCH" },
        { status: 500 }
      );
    }

    return NextResponse.json({ case: data });
  }
);
