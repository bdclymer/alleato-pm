import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: taskIds.length });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
