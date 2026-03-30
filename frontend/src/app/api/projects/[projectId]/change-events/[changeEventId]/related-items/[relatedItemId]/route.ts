import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{
    projectId: string;
    changeEventId: string;
    relatedItemId: string;
  }>;
}

export async function DELETE(_: Request, { params }: RouteParams) {
  try {
    const { projectId, changeEventId, relatedItemId } = await params;
    const parsedProjectId = Number.parseInt(projectId, 10);
    if (Number.isNaN(parsedProjectId)) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("change_event_related_items")
      .delete()
      .eq("id", relatedItemId)
      .eq("project_id", parsedProjectId)
      .eq("change_event_id", changeEventId);

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json(
          { error: "Related items are unavailable until migrations are applied" },
          { status: 503 },
        );
      }

      return NextResponse.json(
        { error: "Failed to remove related item", details: error.message },
        { status: 400 },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
