/**
 * /api/testing/cases/[caseId]
 * PATCH — update editable fields of a test case
 * DELETE — remove a test case
 */
import { withApiGuardrails } from "@/lib/guardrails/api";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  test_number: z.string().trim().min(1).max(20).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  subcategory: z.string().trim().max(100).nullable().optional(),
  test_name: z.string().trim().min(1).max(300).optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  scenario_depth: z.enum(["broad", "detailed"]).optional(),
  steps: z.string().nullable().optional(),
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
    const parsed = patchSchema.safeParse(body);
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
      .select(
        "id, test_number, category, subcategory, test_name, context_note, setup_steps, steps, expected_result, priority, start_url, test_type, scenario_depth"
      )
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

export const DELETE = withApiGuardrails<{ caseId: string }>(
  "testing/cases/[caseId]#DELETE",
  async ({ params }) => {
    const { caseId } = params;
    const supabase = await createClient();
    const { error } = await supabase
      .from("test_cases")
      .delete()
      .eq("id", caseId);

    if (error) {
      return NextResponse.json(
        { error: error.message, code: "DB_ERROR", where: "testing/cases DELETE" },
        { status: 500 }
      );
    }

    return NextResponse.json({ deleted: true });
  }
);
