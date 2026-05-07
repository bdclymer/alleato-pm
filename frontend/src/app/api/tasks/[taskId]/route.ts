import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

const PatchBodySchema = z.object({
  status: z.string().min(1).optional(),
  due_date: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null()])
    .optional(),
  project_id: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
}).refine(
  (body) =>
    body.status !== undefined ||
    body.due_date !== undefined ||
    body.project_id !== undefined,
  { message: "At least one task field is required." },
);

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

    const updates: {
      status?: string;
      due_date?: string | null;
      project_id?: number | null;
      project_ids?: number[];
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.status !== undefined) {
      updates.status = parsed.data.status;
    }

    if (parsed.data.due_date !== undefined) {
      updates.due_date = parsed.data.due_date === "" ? null : parsed.data.due_date;
    }

    if (parsed.data.project_id !== undefined) {
      updates.project_id = parsed.data.project_id;
      updates.project_ids = parsed.data.project_id === null ? [] : [parsed.data.project_id];
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
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
