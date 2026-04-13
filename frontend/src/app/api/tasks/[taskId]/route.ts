import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

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
