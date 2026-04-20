import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_ACTIONS = ["publish", "unpublish", "obsolete", "restore"] as const;
type BulkStatusAction = typeof VALID_ACTIONS[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const projectIdNum = Number(projectId);
  if (isNaN(projectIdNum)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { drawingIds: string[]; action: BulkStatusAction };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { drawingIds, action } = body;
  if (!Array.isArray(drawingIds) || drawingIds.length === 0) {
    return NextResponse.json({ error: "drawingIds array is required" }, { status: 400 });
  }
  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `action must be one of: ${VALID_ACTIONS.join(", ")}` },
      { status: 400 }
    );
  }

  const updateData: { is_published?: boolean; is_obsolete?: boolean } = {};
  if (action === "publish") updateData.is_published = true;
  else if (action === "unpublish") updateData.is_published = false;
  else if (action === "obsolete") updateData.is_obsolete = true;
  else if (action === "restore") updateData.is_obsolete = false;

  const { data, error } = await supabase
    .from("drawings")
    .update(updateData)
    .in("id", drawingIds)
    .eq("project_id", projectIdNum)
    .is("deleted_at", null)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    succeeded: data?.length ?? 0,
    failed: drawingIds.length - (data?.length ?? 0),
  });
}
