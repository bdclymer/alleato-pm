/**
 * /api/dev/test-results/[resultId]
 * PATCH - update status and notes for a dev-tool test result.
 */
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const validStatuses = ["pass", "fail", "skip", "not_tested", "fixed"];

export const PATCH = withApiGuardrails<{ resultId: string }>(
  "dev/test-results/[resultId]#PATCH",
  async ({ request, params }) => {
    const { resultId } = params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "dev/test-results/[resultId]#PATCH",
        message: "Authentication required.",
      });
    }

    const body = await request.json();
    const { status, notes } = body as {
      status?: string;
      notes?: string;
    };

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("test_results")
      .update(updates)
      .eq("id", resultId)
      .select("id, status, notes, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ result: data });
  },
);
