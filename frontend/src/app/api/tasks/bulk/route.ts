import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

interface BulkDeleteRequest {
  task_ids: string[];
}

export const DELETE = withApiGuardrails(
  "tasks/bulk#DELETE",
  async ({ request }) => {
  
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "tasks/bulk#DELETE", message: "Authentication required." });
    }

    const body = (await request.json()) as BulkDeleteRequest;
    const taskIds = Array.isArray(body.task_ids)
      ? body.task_ids.filter((id): id is string => Boolean(id && id.trim()))
      : [];

    if (taskIds.length === 0) {
      return NextResponse.json(
        { error: "task_ids must be a non-empty array" },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("tasks").delete().in("id", taskIds);

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({ success: true, deleted: taskIds.length });
    },
);
