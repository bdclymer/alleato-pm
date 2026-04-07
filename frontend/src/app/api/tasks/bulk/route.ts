import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

interface BulkDeleteRequest {
  task_ids: string[];
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch (error) {
    return apiErrorResponse(error);
  }
}
