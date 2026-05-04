import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

const PatchBodySchema = z.object({
  status: z.string().min(1),
});

export const PATCH = withApiGuardrails(
  "tasks/[taskId]#PATCH",
  async ({ request, params }) => {
    const { taskId } = await params;
    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = PatchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "tasks/[taskId]#PATCH", message: "Authentication required." });
    }

    const { data, error } = await supabase
      .from("tasks")
      .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
      .eq("id", taskId)
      .select()
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({ task: data });
  },
);

export const DELETE = withApiGuardrails(
  "tasks/[taskId]#DELETE",
  async ({ request, params }) => {
    const { taskId } = await params;
    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "tasks/[taskId]#DELETE", message: "Authentication required." });
    }

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({ success: true });
  },
);
