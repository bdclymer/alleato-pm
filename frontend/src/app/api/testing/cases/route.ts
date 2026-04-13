/**
 * /api/testing/cases
 * POST — create a new test case in a suite
 */
import { withApiGuardrails } from "@/lib/guardrails/api";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  suite_id: z.string().uuid(),
  test_number: z.string().trim().min(1).max(20),
  category: z.string().trim().min(1).max(100),
  subcategory: z.string().trim().max(100).nullable().optional(),
  test_name: z.string().trim().min(1).max(300),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  test_type: z.enum(["scenario", "feature"]).default("scenario"),
  scenario_depth: z.enum(["broad", "detailed"]).default("broad"),
  steps: z.string().nullable().optional(),
  setup_steps: z.string().nullable().optional(),
  context_note: z.string().nullable().optional(),
  expected_result: z.string().nullable().optional(),
  start_url: z.string().nullable().optional(),
});

export const POST = withApiGuardrails(
  "testing/cases#POST",
  async ({ request }) => {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message, code: "VALIDATION_FAILED" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("test_cases")
      .insert(parsed.data)
      .select(
        "id, test_number, category, subcategory, test_name, context_note, setup_steps, steps, expected_result, priority, start_url, test_type, scenario_depth"
      )
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message, code: "DB_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({ case: data }, { status: 201 });
  }
);
